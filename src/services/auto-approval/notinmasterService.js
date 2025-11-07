import { getPool1 } from "../../db/db.js"
import sql from 'mssql'
import { ApiError } from "../../utils/ApiError.js";

// const insertPartNumbers = async(BrandId,data)=>{
//     const pool = await getPool1()
// //     console.log(data);
// //     const partnumbers = data.forEach(row => {
// //         row.PartNumber,
// //         BrandId
// //     });
// // console.log(partnumbers);
// const partnumbers = [...new Set(
//     (data || [])
//       .map(r => String(r?.PartNumber || '').trim())
//       .filter(pn => pn.length > 0)
//   )];

//   if (partnumbers.length === 0) return { inserted: 0 };

//   const table = new sql.Table('dbo.NotInMaster');
//   table.create = false;                          // table already exists
//   table.columns.add('PartNumber', sql.VarChar(30), { nullable: false });
//   table.columns.add('BrandId', sql.Int, { nullable: false });

//   partnumbers.forEach(pn => table.data.add(pn,BrandId));

//   await pool.request().bulk(table);              // throws on dupes unless you handle upstream
//   return { inserted: partnumbers.length };
// }

const insertPartNumbers = async (BrandId, DealerId, userId, data) => {

  const brandId = Number(BrandId);
  const dealerId = Number(DealerId);
  if (!Number.isInteger(brandId)) throw new Error('brandId must be an integer');
  if (!Number.isInteger(dealerId)) throw new Error('dealerId must be an integer');

  // Build distinct tuples: (BrandId, DealerId, LocationId, PartNumber)
  const tuples = [];
  const seen = new Set();

  for (const r of (data || [])) {
    const pn = String(r?.PartNumber || '').trim();
    const locId = Number(r?.LocationId);
    if (!pn || !Number.isInteger(locId)) continue;

    const key = `${brandId}|${dealerId}|${userId}|${locId}|${pn}`;
    if (seen.has(key)) continue;
    seen.add(key);
    tuples.push([brandId, dealerId, userId, locId, pn]);
  }

  if (tuples.length === 0) return { inserted: 0 };

  const pool = await getPool1();

  // Column order must match rows.add(...)
  const table = new sql.Table('dbo.NotInMaster');
  table.create = false;
  table.columns.add('BrandId', sql.Int, { nullable: false });
  table.columns.add('DealerId', sql.Int, { nullable: false });
  table.columns.add('Addedby', sql.Int, { nullable: true });
  table.columns.add('LocationId', sql.Int, { nullable: false });
  table.columns.add('PartNumber', sql.VarChar(30), { nullable: false });

  for (const t of tuples) table.rows.add(...t);

  await pool.request().bulk(table); // will error on dupes if you add a UNIQUE index (recommended)
  return { inserted: tuples.length };
};

const viewNotInMasterService = async (BrandId, DealerId, LocationId, PartNumber, PartTypeId, Addedby, From, To, Status) => {
  try {
    const pool = await getPool1()
    const query = `
    use z_scope
    select nim.id , li.Brand , nim.BrandId, li.Dealer ,nim.DealerId, li.Location,nim.LocationId , nim.PartNumber ,nim.LatestPartNumber, nim.PartDesc , nim.MRP , nim.LandedCost , nim.MOQ , pt.Description PartType ,nim.PartTypeId, nim.Model , nim.GSTPer , nim.QtyPerVehicle , hsn.Description HSNCode ,nim.HSNID, CONCAT(amg.vcFirstName , ' ' , amg.vcLastName) Name ,nim.Addedby  , nim.DaetailsAddedby , nim.DaetailsAddedon , nim.Remarks , nim.SCSRemarks , Image
	  from NotInMaster nim
	  JOIN LocationInfo li on li.LocationID = nim.LocationId
	  left JOIN parttypemaster pt on pt.PartTypeID = nim.PartTypeId
	  left JOIN HSNMaster hsn on hsn.tCode = nim.HSNID
	  JOIN AdminMaster_GEN amg on amg.bintId_Pk  = nim.Addedby
    WHERE (@BrandId IS NULL OR nim.BrandId = @BrandId)
    AND (@PartNumber is NUll or PartNumber = @PartNumber)
    AND (@LocationId IS NULL OR nim.LocationId = @LocationId)
    AND (@DealerId IS NULL OR nim.DealerId = @DealerId)
    AND (@PartTypeId IS NULL OR nim.PartTypeId = @PartTypeId)
    AND (@AddedBy IS NULL OR nim.Addedby = @AddedBy)
    AND (nim.Status = @Status)
	  AND (@From is NULL OR Addedon >= @From)
	  AND (@To is NULL OR Addedon <=@To)
    `
    const result = await pool.request()
      .input('BrandId', sql.Int, BrandId ?? null)
      .input('DealerId', sql.Int, DealerId ?? null)
      .input('LocationId', sql.Int, LocationId ?? null)
      .input('PartNumber', sql.Int, PartNumber ?? null)
      .input('PartTypeId', sql.Int, PartTypeId ?? null)
      .input('Addedby', sql.Int, Addedby ?? null)
      .input('From', sql.Int, From ?? null)
      .input('To', sql.Int, To ?? null)
      .input('Status', sql.Int, Status)
      .query(query)

    return result.recordset
  } catch (error) {
    throw new ApiError(500, error.message);
  }
}

const addNotinMasterService = async (data) => {
  const pool = await getPool1()
  // Check existence of Id first
  const chk = await pool.request()
    .input('Id', sql.Int, Number(data.Id))
    .query('SELECT 1 FROM dbo.NotInMaster WHERE Id = @Id');

  if (chk.recordset.length === 0) {
    return { notFound: true };
  }

  // Perform update (bind everything)
  const q = `
    UPDATE dbo.NotInMaster
    SET
      BrandId          = @BrandId,
      DealerId         = @DealerId,
      LocationId       = @LocationId,
      PartNumber       = @PartNumber,
      PartDesc         = @PartDesc,
      MRP              = @MRP,
      LandedCost       = @LandedCost,
      MOQ              = @MOQ,
      PartTypeId       = @PartTypeId,
      Model            = @Model,
      GSTPer           = @GSTPer,
      QtyPerVehicle    = @QtyPerVehicle,
      HSNID            = @HSNID,
      Status           = @Status,
      DaetailsAddedby  = @Detailsby,
      Remarks          = @Remarks,
      LatestPartNumber = @LatestPartNumber,
      Image            = @url
    WHERE Id = @Id
  `;

  const req = pool.request()
    .input('Id', sql.Int, Number(data.Id))
    .input('BrandId', sql.Int, Number(data.BrandId))
    .input('DealerId', sql.Int, Number(data.DealerId))
    .input('LocationId', sql.Int, Number(data.LocationId))
    .input('PartNumber', sql.VarChar(30), String(data.PartNumber).trim())
    .input('PartDesc', sql.VarChar(200), String(data.PartDesc).trim())
    .input('MRP', sql.Decimal(18, 2), data.MRP == null ? null : Number(data.MRP))
    .input('LandedCost', sql.Decimal(18, 2), data.LandedCost == null ? null : Number(data.LandedCost))
    .input('MOQ', sql.Int, data.MOQ == null ? null : Number(data.MOQ))
    .input('PartTypeId', sql.Int, Number(data.PartTypeId))
    .input('Model', sql.VarChar(100), String(data.Model).trim())
    .input('GSTPer', sql.Decimal(9, 2), data.GSTPer == null ? null : Number(data.GSTPer))
    .input('QtyPerVehicle', sql.Int, data.QtyPerVehicle == null ? null : Number(data.QtyPerVehicle))
    .input('HSNID', sql.Int, data.HSNID == null ? null : Number(data.HSNID))
    .input('Status', sql.VarChar(50), String(data.Status).trim())
    .input('Detailsby', sql.Int, data.Detailsby == null ? null : Number(data.Detailsby))
    .input('Remarks', sql.VarChar(500), data.Remarks == null ? null : String(data.Remarks).trim())
    .input('LatestPartNumber', sql.VarChar(30), data.LatestPartNumber == null ? null : String(data.LatestPartNumber).trim())
    .input('url', sql.NVarChar(sql.MAX), data.url == null ? null : String(data.url).trim());

  const { rowsAffected } = await req.query(q);
  return { rowsAffected };
}
export { insertPartNumbers, viewNotInMasterService, addNotinMasterService }