import { getPool } from "../../db/db.js"
import sql from 'mssql'
import { ApiError } from "../../utils/ApiError.js";

// const insertPartNumbers = async(BrandId,data)=>{
//     const pool = await getPool()
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


// const now = new Date();
// const istOffset = 5.5 * 60 * 60 * 1000; // +05:30 offset
// const istTime = new Date(now.getTime() + istOffset);
// const pad = n => n.toString().padStart(2, '0');
// const y = istTime.getUTCFullYear();
// const m = pad(istTime.getUTCMonth() + 1);
// const d = pad(istTime.getUTCDate());
// const h = pad(istTime.getUTCHours());
// const min = pad(istTime.getUTCMinutes());
// const s = pad(istTime.getUTCSeconds());
// const currentDate = `${y}-${m}-${d} ${h}:${min}:${s}`;

const now = new Date();
const addedTime = new Date(now.getTime() + (5 * 60 + 30) * 60 * 1000); // add 5h 30m


const pad = n => n.toString().padStart(2, '0');
const y = addedTime.getFullYear();
const m = pad(addedTime.getMonth() + 1);
const d = pad(addedTime.getDate());
const h = pad(addedTime.getHours());
const min = pad(addedTime.getMinutes());
const s = pad(addedTime.getSeconds());

const currentDate = `${y}-${m}-${d} ${h}:${min}:${s}.000`;
// console.log(currentDate);

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

  const pool = await getPool();

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
    const pool = await getPool()
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
	  AND (@From is NULL OR CONVERT(date ,Addedon) >=  CONVERT(date,@From))
	  AND (@To is NULL OR CONVERT(date ,Addedon) <= CONVERT(date,@To))
    `
    const result = await pool.request()
      .input('BrandId', sql.Int, BrandId ?? null)
      .input('DealerId', sql.Int, DealerId ?? null)
      .input('LocationId', sql.Int, LocationId ?? null)
      .input('PartNumber', sql.Int, PartNumber ?? null)
      .input('PartTypeId', sql.Int, PartTypeId ?? null)
      .input('Addedby', sql.Int, Addedby ?? null)
      .input('From', sql.Date, From ?? null)
      .input('To', sql.Date, To ?? null)
      .input('Status', sql.Int, Status)
      .query(query)

    return result.recordset
  } catch (error) {
    throw new ApiError(500, error.message);
  }
}

const addNotinMasterService = async (data) => {
  const pool = await getPool()
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
      DaetailsAddedon  = @DetailsAddedOn,
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
    .input('DetailsAddedOn', sql.DateTime, currentDate == null ? null : currentDate)
    .input('Remarks', sql.VarChar(500), data.Remarks == null ? null : String(data.Remarks).trim())
    .input('LatestPartNumber', sql.VarChar(30), data.LatestPartNumber == null ? null : String(data.LatestPartNumber).trim())
    .input('url', sql.NVarChar(sql.MAX), data.url == null ? null : String(data.url).trim());

  const { rowsAffected } = await req.query(q);
  return { rowsAffected };
}

const uploadNotinMasterService = async (BrandId, data, userId) => {
  const pool = await getPool();
  const tx = new sql.Transaction(pool);

  // helpers
  const toStr = v => (v == null ? null : String(v).trim());
  const toInt = v => (v == null || v === '' ? null : Number.parseInt(v, 10));
  const toDec = v => (v == null || v === '' ? null : Number(v));
  const safeBrandId = toInt(BrandId);

  await tx.begin();
  try {
    // 1) Create temp table (shape mirrors columns we want to update)
    const createTemp = `
      CREATE TABLE #U (
        BrandId       INT           NOT NULL,
        PartNumber    VARCHAR(50)   NOT NULL,
        PartDesc      VARCHAR(200)  NULL,
        MRP           DECIMAL(18,2) NULL,
        LandedCost    DECIMAL(18,2) NULL,
        MOQ           INT           NULL,
        Model         VARCHAR(100)  NULL,
        PartTypeId    INT           NULL,
        HSNID         INT           NULL,
        Status        INT           NOT NULL,
        QtyPerVehicle INT           NULL,
        GSTPer        INT           NULL,
        Remarks       VARCHAR(100) NULL,
        DaetailsAddedon Datetime ,
        DaetailsAddedby int,
        LatestPartNumber VARCHAR(30)  NULL       
      );
    `;
    await new sql.Request(tx).query(createTemp);

    // 2) Bulk insert incoming rows into #U
    const tbl = new sql.Table('#U');
    tbl.create = true;
    tbl.columns.add('BrandId', sql.Int, { nullable: false });
    tbl.columns.add('PartNumber', sql.VarChar(50), { nullable: false });
    tbl.columns.add('PartDesc', sql.VarChar(200), { nullable: false });
    tbl.columns.add('MRP', sql.Decimal(18, 2), { nullable: false });
    tbl.columns.add('LandedCost', sql.Decimal(18, 2), { nullable: false });
    tbl.columns.add('MOQ', sql.Int, { nullable: false });
    tbl.columns.add('Model', sql.VarChar(100), { nullable: false });
    tbl.columns.add('PartTypeId', sql.Int, { nullable: true });
    tbl.columns.add('HSNID', sql.Int, { nullable: true });
    tbl.columns.add('Status', sql.Int, { nullable: false });
    tbl.columns.add('QtyPerVehicle', sql.Int, { nullable: true });
    tbl.columns.add('GSTPer', sql.Int, { nullable: true });
    tbl.columns.add('Remarks', sql.VarChar(100), { nullable: true });
    tbl.columns.add('LatestPartNumber', sql.VarChar(30), { nullable: true });
    tbl.columns.add('DaetailsAddedby', sql.Int, { nullable: true });
    tbl.columns.add('DaetailsAddedon', sql.DateTime, { nullable: true });

    for (const r of data || []) {
      tbl.rows.add(
        safeBrandId,
        toStr(r.PartNumber),
        toStr(r.PartDesc),
        toDec(r.MRP),
        toDec(r.LandedCost),
        toInt(r.MOQ),
        toStr(r.Model),
        toInt(r.PartTypeId ?? r.PartTypeID),
        toInt(r.HSNID ?? r.HsnId),
        1,
        toInt(r.QtyPerVehicle),
        toInt(r.GSTPer),
        toStr(r.Remarks),
        toStr(r.LatestPartNumber),
        toInt(userId),
        toStr(currentDate),
      );
    }

    await new sql.Request(tx).bulk(tbl);

    // 3) Update target table by join on BrandId + PartNumber
    const q = `
      DECLARE @Updated INT = 0;

      UPDATE n
      SET
        n.PartDesc    = u.PartDesc,
        n.MRP         = u.MRP,
        n.LandedCost  = u.LandedCost,
        n.MOQ         = u.MOQ,
        n.Model       = u.Model,
        n.PartTypeId  = u.PartTypeId,
        n.HSNID       = u.HSNID,
        n.Status      = u.Status,
        n.QtyPerVehicle      = u.QtyPerVehicle,
        n.GSTPer      = u.GSTPer,
        n.Remarks     = u.Remarks,
        n.DaetailsAddedon = u.DaetailsAddedon,
        n.DaetailsAddedby   = u.DaetailsAddedby,
        n.LatestPartNumber = u.LatestPartNumber
      FROM dbo.NotInMaster AS n
      INNER JOIN #U AS u
        ON n.BrandId = u.BrandId
       AND n.PartNumber = u.PartNumber
      where n.Status = 0;

      SET @Updated = @@ROWCOUNT;

      -- rows in upload that didn't match existing target rows
      SELECT u.PartNumber
      FROM #U AS u
      LEFT JOIN dbo.NotInMaster AS n
        ON n.BrandId = u.BrandId
       AND n.PartNumber = u.PartNumber
      WHERE n.PartNumber IS NULL;

      SELECT @Updated AS updated;
    `;

    const rs = await new sql.Request(tx).query(q);
    // recordsets: [notMatched rows, [{updated: X}]]
    const notMatched = rs.recordsets[0]?.map(r => ({ PartNumber: r.PartNumber })) ?? [];
    const updated = rs.recordsets[1]?.[0]?.updated ?? 0;

    await tx.commit();
    return { updated, notMatched };
  } catch (err) {
    try { await tx.rollback(); } catch { }
    throw err;
  }
};

const mappingParttypeHSNCode = async (data) => {
  try {
    const pool = await getPool()
    const query = `use z_scope
                select * from PartTypeMaster
                select tCode , Description from HSNMaster`

    const result = await pool.request().query(query)
    const partypeData = result.recordsets[0]
    const HSNData = result.recordsets[1]

    const norm = v => (v == null ? "" : String(v).trim().toLowerCase());
    const onlyDigits = s => (String(s).match(/\d+/g) || []).join("");
    const cleanCode = v => {
      const raw = String(v ?? "").replace(/[,\s]/g, "");
      if (/^\d+$/.test(raw)) return raw;
      const digits = onlyDigits(raw);
      return digits || "";
    };

    // treat common placeholders as empty
    const blankish = v => {
      if (v == null) return true;
      const s = String(v).trim();
      if (!s) return true;
      const k = s.toLowerCase();
      return k === 'null' || k === 'n/a' || k === 'na' || k === '#n/a' || k === '-';
    };

    // PartType lookups
    const ptByDesc = new Map(
      partypeData.map(p => [norm(p.Description), Number(p.PartTypeID)]).filter(([k]) => !!k)
    );

    // HSN lookups (by tCode + salvage from Description)
    const hsnByCode = new Map(
      HSNData.map(h => [cleanCode(h.tCode), Number(h.tCode)]).filter(([k]) => !!k)
    );
    for (const h of HSNData) {
      const d = cleanCode(h.Description);
      const code = cleanCode(h.tCode);
      if (d && code && !hsnByCode.has(d)) hsnByCode.set(d, Number(h.tCode));
    }

    const mapped = [];
    const errors = [];

    for (const _r of data) {
      const r = { ..._r };

      // trim strings
      for (const k of Object.keys(r)) {
        if (typeof r[k] === 'string') r[k] = r[k].trim();
      }

      /* ---------- PartType -> PartTypeId (only if meaningful value) ---------- */
      let partTypeId = null;
      const rawPtDesc = r.PartType;

      if (!blankish(rawPtDesc)) {
        const key = norm(rawPtDesc);
        if (ptByDesc.has(key)) {
          partTypeId = ptByDesc.get(key);
        } else {
          errors.push({ message: 'Unknown PartType (description)', data: { value: rawPtDesc, row: r } });
        }
      } // else leave null, no error

      /* ---------- HSNCode -> HSNID (only if meaningful value) ---------- */
      let hsnId = null;
      const rawHsnCode = r.HSNCode;

      if (!blankish(rawHsnCode)) {
        const key = cleanCode(rawHsnCode);
        if (hsnByCode.has(key)) {
          hsnId = hsnByCode.get(key);
        } else {
          errors.push({ message: 'Unknown HSN (by code)', data: { value: rawHsnCode, row: r } });
        }
      } // else leave null, no error

      r.PartTypeId = partTypeId;
      r.HSNID = hsnId;

      mapped.push(r);
    }

    return { mapped, errors };
  } catch (err) {
    return {
      mapped: [],
      errors: [{ message: "mappingParttypeHSNCode failed", data: { error: err.message } }]
    };
  }
}

const adminActionService = async (Id, Status, Approvedby, Remarks) => {
 try {
   const pool = await getPool()
   if (Status == 2) {
     const result = await pool.request()
       .input('Id', sql.Int, Id)
       .input('Status', sql.Int, 2)
       .input('userId', sql.Int, Approvedby)
       .input('Remarks', sql.VarChar(100), Remarks ?? null)
       .execute(`dbo.sp_AdminNotInMaster`)

       return result
   }
   else {
     const query = `  use z_scope  
         UPDATE n
         SET n.Status = @Status,
         n.SCSRemarks = @Remarks,
 		    n.ApprovedBy = @userId
         FROM dbo.NotInMaster AS n
         WHERE partnumber in (select partnumber from NotInMaster where id = @id) and BrandId = (select brandid from NotInMaster where id = @id);`
 
     const result = await pool.request()
       .input('Id', sql.Int, Id)
       .input('Status', sql.Int, 3)
       .input('userId', sql.Int, Approvedby)
       .input('Remarks', sql.VarChar(100), Remarks ?? null)
       .query(query)

       return result
   }
 } catch (error) {
    throw new ApiError(500,error.message)
 }
}

export { insertPartNumbers, viewNotInMasterService, addNotinMasterService, uploadNotinMasterService, mappingParttypeHSNCode, adminActionService }