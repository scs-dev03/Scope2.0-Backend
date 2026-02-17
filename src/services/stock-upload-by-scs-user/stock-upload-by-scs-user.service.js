import { getPool } from "../../db/db.js";
import {
  readExcelFile,
  readExcelFileWithSubColumns,
  readExcelFileWithSubColumnsForBulk
} from "../utilities/utilities.service.js";
import sql from "mssql";
import yazl from "yazl";
import xlsx from "xlsx";



const singleUploadStockInService = async (req, res) => {

  const pool = await getPool();
    let locationId = parseInt(req.body.location_id,10);
    let addedBy = parseInt(req.body.user_id,10);
    let rowData;
    let brandId = parseInt(req.body.brand_id,10);
    let dealerId = parseInt(req.body.dealer_id,10);
    let date = req.body.date;
    const date1 = new Date(date);
    const formattedDate = date1.toLocaleDateString('en-CA');

    const today = new Date();
const formattedToday = today.toLocaleDateString('en-CA');
    // const formattedDate = date1.toISOString().split("T")[0]; 
   // console.log("formattedToday ",formattedDate,formattedToday)
let mapping;
let isOlderUploadForHyundai=false;
    if (formattedDate == formattedToday) {
     // 2. Fetch Excel column mapping for the brand
  let result = await pool.request()
  .input("brandId", brandId)
  .query(`USE [z_scope]; SELECT part_number, stock_qty, loc,calculativeField, stock_type FROM stock_upload_mapping WHERE brand_id=@brandId AND stock_type='current'`);
  mapping=result.recordset;

    } else if (formattedDate < formattedToday) {
     // console.log("exccuted ")
      isOlderUploadForHyundai=true;
      // Mapping logic for older date
      // 2. Fetch Excel column mapping for the brand
   let result = await pool.request()
  .input("brandId", brandId)
  .query(`USE [z_scope]; SELECT part_number, stock_qty, loc,calculativeField, stock_type FROM stock_upload_mapping WHERE brand_id=@brandId AND stock_type='older'`);
    mapping=result.recordset;
   // console.log("mapping result ",mapping)
    } 
 
  if (!mapping.length) return { mappingNotPresent: true };
  const mappedData = mapping[0];

  // 3. Read Excel data
  let fileData;
  if(!isOlderUploadForHyundai){  //for current
     fileData = [11, 33].includes(brandId)
    ? await readExcelFileWithSubColumns(req.file.path)
    : await readExcelFile(req.file.path);
  }
  else{
    // fileData = [33].includes(brandId)
    // ? await readExcelFileWithSubColumns(req.file.path)
    // : await readExcelFile(req.file.path); 

    fileData=await readExcelFile(req.file.path);
  }
  

  if(!fileData.headers){
       return {isEmptyFile:true}
     }
  const headers = fileData.headers.map(h => h.trim().toLowerCase());
  let rowDataArray;
  if(!isOlderUploadForHyundai){
     rowDataArray = fileData.data.slice([11, 33].includes(brandId) ? 1 : 0);
  }
  else{
    rowDataArray = fileData.data.slice([33].includes(brandId) ? 1 : 0);
  }
 // console.log("headers ",headers,mappedData)
   const requiredBrandIds = [17, 28];
  // console.log("headers ",headers)
  console.log("mapped data ",rowDataArray)
  const normalizedHeaders = headers.map(header => header.trim().toLowerCase());
  const isValid = Object.entries(mappedData)
      .filter(([key]) => key != 'stock_type' && key != 'loc' && key!= 'calculativeField' && key!='stock_qty') // Exclude stock_type and loc
      .every(([, value]) => normalizedHeaders.includes(value.trim().toLowerCase())); // Check if all values exist in headers
 // console.log("mapped data ",mappedData,headers,isValid)
  // If brandId is 17, 28, check for "availability" and "status" in headers

  
  if (requiredBrandIds.includes(brandId)) {
      const requiredFields = ["availability", "status"];
     // console.log("normalized header ",normalizedHeaders,requiredFields)
      const hasRequiredFields = requiredFields.every(field => normalizedHeaders.includes(field));
     // console.log("has required fields ",hasRequiredFields)
      if (!hasRequiredFields) {
          return { headerNotPresent: true };
      }
  }

  if ([22].includes(brandId)) {
    const requiredFields = ["availability"];
    const hasRequiredFields = requiredFields.every(field => normalizedHeaders.includes(field));
    
    if (!hasRequiredFields) {
        return { headerNotPresent: true };
    }
  }

  // Return false if general validation fails
  if (!isValid) {
      return { headerNotPresent: true };
  }

 // console.log("mapping ",mappedData)


 // console.log("headers not present",headerNotPresent);

 // Step 1: Get headers from uploaded file (from the first row)
let headers1 = Object.keys(rowDataArray[0] || {}).map(h => h.toLowerCase());

// Step 2: Get column names from stock_qty field
const stockQtyColumns = mappedData.stock_qty
  .split(",")
  .map(col => col.trim())
  .filter(Boolean);

// Step 3: Check for missing fields
const missingFields = stockQtyColumns.filter(
  col => !headers1.includes(col.toLowerCase())
);

// Step 4: If missing, throw clear error
if (missingFields.length > 0) {
 return {headerNotPresent:true,missingFields:missingFields}
}
 // console.log("missing field ",missingFields)
  const normalizedData = rowDataArray.map(row => {
    const getVal = (key) => {
      const match = Object.keys(row).find(k => k.toLowerCase() == key.toLowerCase());
      // console.log("key",key,match )
      const value = match ? row[match] : "";
     // console.log("match key",key,"value",value);
      return value != null ? value.toString().trim() : "";
    };
  
    const computeQty = () => {
      const formula = mappedData.calculativeField;
    
      if (typeof formula === "string" && /[\+\-\*\/]/.test(formula)) {
        let formulaWithValues = formula;
    
        // Sort keys by length (to replace longer keys first and avoid partial overlaps)
        const keys = Object.keys(row).sort((a, b) => b.length - a.length);
    
        keys.forEach(key => {
          // Escape special characters in key (like dash)
          const escapedKey = key.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&');
          const regex = new RegExp(`\\b${escapedKey}\\b`, 'gi');
          const val = parseFloat(row[key]);
          formulaWithValues = formulaWithValues.replace(regex, isNaN(val) ? "0" : val.toString());
        });
    
        try {
        //  console.log("Evaluating:", formulaWithValues);
          return eval(formulaWithValues);
        } catch (err) {
          console.error("Error evaluating formula:", formulaWithValues, err);
          return 0;
        }
      } else {
        const val = parseFloat(row[mappedData.stock_qty]);
        console.log("val ",val,row[mappedData.stock_qty],mappedData.stock_qty);
        return isNaN(val) ? 0 : val;
      }
    };
    
  
    return {
      part_number: getVal(mappedData.part_number).replace(/[^a-zA-Z0-9]/g, ""),
      qty: computeQty(),
      availability: getVal("availability"),
      status: getVal("status")
    };
  });
  
  
  
 // console.log("normalized data ",normalizedData,mappedData)
  let filteredData = normalizedData.filter((row) => {
    const stockQty = parseFloat(row.qty);
   // console.log("qty ",row.qty)
    const hasPartNumber = row.part_number && row.part_number.trim() !== "" && row.part_number!=0;
    const availability = row["availability"]?.toLowerCase();
    const status = row["status"]?.toLowerCase();
  
    if ((brandId == 17 || brandId == 28)) {
      return hasPartNumber && stockQty > 0 && availability == "on hand" && status == "good";
    }
  
    if (brandId == 22) {
      return hasPartNumber && stockQty > 0 && availability == "on hand";
    }
  
    return hasPartNumber && stockQty > 0;
  });
  

  // 7. Get part master data
  const partMaster = await pool.request()
    .input("brandId", brandId)
    .query(`USE [z_scope]; SELECT partno as partnumber1, partID FROM VW_PartMaster WHERE brandId = @brandId`);
  const partMap = new Map(partMaster.recordset.map(p => [p.partnumber1.toLowerCase(), p.partID]));

  // 8. Get previous unrecognized parts
  let existingUnmatchedParts =[]
    let resultPartNot=await pool.request()
      .input("brandId", brandId)
      .query(`USE [z_scope]; SELECT partnumber FROM part_not_in_master WHERE brand_id = @brandId`)
    

existingUnmatchedParts=resultPartNot.recordset

  // 9. Map partIds and identify unknowns
  const knownParts = [];
  const unknownParts = [];


//console.log("filtered data ",filteredData)
  for (const item of filteredData) {
  const partNumber = item.part_number.toLowerCase();
  const id = partMap.get(partNumber);
  //console.log("existing unmatched  parts ",existingUnmatchedParts)

  const alreadyExists = existingUnmatchedParts.some(
    (p) => p.partnumber?.toLowerCase() === partNumber
  );
  if (id) {
    knownParts.push({ ...item, partId: id });
    item.isPartNotInMaster = false;
  } else if (
   !alreadyExists
  ) {
    existingUnmatchedParts.push({ partnumber: item.part_number });
    item.isPartNotInMaster = true;
   // console.log("unknown parts ",item.part_number)
  }
 
} 
//console.log("existed ",existingUnmatchedParts)
 const notInMasterFalseItems = filteredData.filter(item => item.isPartNotInMaster == false);
  // 10. Merge duplicates by part_number
  const merged = new Map();
  for (const item of knownParts) {
    const key = item.part_number;
    if (!merged.has(key)) {
      merged.set(key, { ...item });
    } else {
      merged.get(key).qty += item.qty;
    }
  }
//console.log("merged ",merged)
  const deduped = Array.from(merged.values());
let newTcode;
let prevRecordCount = 0;
let prevQtySum=0;
let totalQty=0;
let operation='';
  if(formattedDate==formattedToday){
 operation='Single Upload for Current Days'
  // 11. Check for previous stock for location
  const prevStock = await pool.request()
    .input("locationId", locationId)
    .query(`USE [z_scope]; SELECT tcode,stockDate FROM currentStock1 WHERE locationId=@locationId`);
    
    let oldTcode;
    let previousStockDate;
    for(let i=0;i<prevStock.recordset?.length;i++){
  oldTcode = prevStock.recordset[i]?.tcode || 0;
   previousStockDate=prevStock.recordset[i]?.stockDate;
  
    const { recordset: prevItems } = await pool.request()
      .input("StockCode", oldTcode)
      .query(`USE [z_scope]; SELECT partNumber, qty, partID FROM currentStock2 WHERE StockCode=@StockCode`);
    prevRecordCount = prevItems.length;

    prevQtySum = (await pool.request()
      .input("StockCode", oldTcode)
      .query(`USE [z_scope]; SELECT SUM(qty) AS QuantSum FROM currentStock2 WHERE StockCode=@StockCode`)
    ).recordset[i]?.QuantSum || 0;

  
    await pool.request().input("stockCode", oldTcode).query(`USE [z_scope]; DELETE FROM currentStock2 WHERE stockCode=@stockCode`);
    await pool.request().input("stockCode", oldTcode).query(`USE [z_scope]; DELETE FROM currentStock1 WHERE tcode=@stockCode`);
  }
  // 12. Insert into currentStock1 and get new tcode
  const now = new Date().toISOString().split("T")[0];
  const { recordset: [insertedStock] } = await pool.request()
    .input("locationID", locationId)
    .input("formattedDate", formattedDate)
    .input("addedBy", addedBy)
    .query(`USE [z_scope]; INSERT INTO currentStock1(locationID, stockdate, addedby,addedDate) OUTPUT inserted.tcode VALUES(@locationID, @formattedDate, @addedBy,cast(getDate() as smalldatetime))`);

  newTcode = insertedStock.tcode;
  
  // 14. Bulk insert to currentStock2
  if(deduped.length){

   await pool.request().query('use z_scope')
  const stockTable = new sql.Table("currentStock2");
  stockTable.columns.add("StockCode", sql.BigInt,{nullable:false});
  stockTable.columns.add("PartNumber", sql.VarChar(35),{nullable:false});
  stockTable.columns.add("Qty", sql.Decimal(18, 2),{nullable:false});
  stockTable.columns.add("PartID", sql.Int,{nullable:true});
  deduped.forEach(row => {
    const rawPartId = row.partId;
      const safePartId = rawPartId && !isNaN(rawPartId) ? parseInt(rawPartId, 10) : 0;
      stockTable.rows.add(BigInt(newTcode), String(row.part_number), parseFloat(row.qty), safePartId)
  
  } )
  await pool.request().bulk(stockTable);

   // 15. Log the upload
   totalQty = (await pool.request()
    .input("StockCode", newTcode)
    .query(`USE [z_scope]; SELECT SUM(qty) AS currentQuantSum FROM currentStock2 WHERE stockCode = @StockCode`)
  ).recordset[0].currentQuantSum;


  }
  //Bulk Inser in stock_upload_spm_td001_{dealerid}

 

   if(existingUnmatchedParts.length){
    console.log("exsited ",unknownParts.length)

    // Clear old unmatched records
  await pool.request().input("brandId", brandId).query(`USE [z_scope]; DELETE FROM part_not_in_master WHERE brand_id = @brandId`);

     const table = new sql.Table("part_not_in_master");
    table.columns.add("brand_id", sql.Int);
    table.columns.add("partnumber", sql.VarChar(100));
    existingUnmatchedParts.forEach(p => table.rows.add(brandId, p.partnumber));
    await pool.request().bulk(table);
  }
  }

  // console.log(" formatted data e",formattedDate,formattedToday)
 if (formattedDate < formattedToday){
   operation='Single Upload for Older Days'
   console.log("depued ",deduped)
 let olderdaysResult= await upsertSPMTable(dealerId,formattedDate,deduped,brandId,locationId,addedBy)
 prevRecordCount=olderdaysResult?.prevCountRecords;
 prevQtySum=olderdaysResult?.prevQtySum;
 totalQty=olderdaysResult?.currentSumQty;
  // await updateMaxCountDaysStockZero(dealerId,previousStockDate,formattedDate,locationId)
  }

   
 
  //console.log("formatted date ",formattedDate,formattedToday)
   if (formattedDate == formattedToday) {
     let updateWorkshopMasterQuery=`use [z_scope] update dealer_workshop_master set LATESTSTOCKDATE =getdate()
     where dealerid=@dealerId and bigid=@locationId`;
    
        await pool.request().input('dealerId',dealerId).input('locationId',locationId).query(updateWorkshopMasterQuery)
   }


  await pool.request()
    .input("locationId", locationId)
    .input("StockCode", newTcode)
    .input("addedBy", addedBy)
    .input("brandId", brandId)
    .input("rowCount", deduped.length)
    .input("currentQuantSum", totalQty)
    .input("countPrevRecords", prevRecordCount)
    .input("quantitySumPrev", prevQtySum)
    .input('operation',operation)
    .input('date',formattedDate)
    .query(`USE [z_scope]; INSERT INTO Stock_Upload_Logs(location_id, stockCode, added_by, brand_id, StockUploadCount, operation_type, quantitySum, prevStockUploadCount, prevQuantitySum,stockDate)
            VALUES(@locationId, @StockCode, @addedBy, @brandId, @rowCount, @operation, @currentQuantSum, @countPrevRecords, @quantitySumPrev,cast(@date as date))`);
  return {
    currentSumQuantity: totalQty,
    prevSumQuantity: prevQtySum,
    currentRecords: deduped.length,
    prevRecords: prevRecordCount,
     allPartsNotInMaster:notInMasterFalseItems.length==0?0:-1
  };
};


async function upsertSPMTable(dealerId, stockDate, data, brandId, locationId, addedBy) {
  try {

    const formatDateOnly = (date) => {
  return new Date(date).toISOString().split('T')[0]; // '2025-07-21'
};
    const pool = await getPool();
    await pool.request().query('USE z_scope');
    const tableName = `stock_upload_spm_td001_${dealerId}`;

    // Get previous rows and qty
    const [existingRowsRes, qtySumRes] = await Promise.all([
      pool.request()
        .input('locationId', locationId)
        .input('stockDate', stockDate)
        .query(`SELECT PartNumber, StockDate FROM ${tableName} WHERE LocationId = @locationId AND StockDate = @stockDate`),

      pool.request()
        .input('locationId', locationId)
        .input('stockDate', stockDate)
        .query(`SELECT SUM(Qty) AS currentSumQty FROM ${tableName} WHERE LocationId = @locationId AND StockDate = @stockDate`)
    ]);

    const existingRows = existingRowsRes.recordset;
    const prevCountRecords = existingRows.length || 0;
    const prevQtySum = qtySumRes.recordset[0]?.currentSumQty || 0;

    // Delete previous data for same location + date
    if (prevCountRecords > 0) {
      await pool.request()
        .input('locationId', locationId)
        .input('stockDate', stockDate)
        .query(`DELETE FROM ${tableName} WHERE LocationId = @locationId AND CAST(StockDate AS date) = CAST(@stockDate AS date)`);
    }
    console.log(existingRows,data)
    // Build TVP
    const table = new sql.Table(tableName); // no table name required for bulk insert
    table.columns.add('DealerId', sql.Int, { nullable: false });
    table.columns.add('BrandId', sql.Int, { nullable: false });
    table.columns.add('LocationId', sql.Int, { nullable: false });
    table.columns.add('UserId', sql.Int, { nullable: false });
    table.columns.add('PartNumber', sql.NVarChar(50), { nullable: true });
    table.columns.add('PartNumber1', sql.NVarChar(50), { nullable: true });
    table.columns.add('Qty', sql.Decimal(18, 2), { nullable: false });
    table.columns.add('StockDate', sql.DateTime, { nullable: false });
    table.columns.add('DateAdded', sql.DateTime, { nullable: false });
    table.columns.add('PartId', sql.Int, { nullable: true });

    const partsWithChangedDate = [];
    const partsWithSameDate = [];

    const existingPartMap = new Map();
    existingRows.forEach(row => {
      existingPartMap.set(row.PartNumber.toLowerCase(), row.StockDate);
    });

    const now = new Date();

    for (const row of data) {
      const partNumberRaw = String(row.part_number);
      const partNumber = partNumberRaw.toLowerCase();
      const qty = parseFloat(row.qty);
      const partId = row.partId && !isNaN(row.partId) ? parseInt(row.partId, 10) : null;

      const prevDate = existingPartMap.get(partNumber);
      const isSameDate = prevDate
        ? formatDateOnly(prevDate)==stockDate
        : false;

        // console.log("---",,,prevDate==new Date(stockDate).toDateString())
      if (isSameDate) partsWithSameDate.push(partNumber);
      else partsWithChangedDate.push(partNumber);

      table.rows.add(
        parseInt(dealerId),
        parseInt(brandId),
        parseInt(locationId),
        parseInt(addedBy),
        partNumberRaw,
        partNumberRaw,
        qty,
        stockDate,
        now,
        partId
      );
    }

    // Do the bulk insert
    const request = pool.request();
    await request.bulk(table);

    // Get current sum
    const currentSumQtyRes = await pool.request()
      .input('locationId', locationId)
      .input('stockDate', stockDate)
      .query(`SELECT SUM(Qty) AS currentSumQty FROM ${tableName} WHERE LocationId = @locationId AND StockDate = @stockDate`);
    const currentSumQty = currentSumQtyRes.recordset[0]?.currentSumQty || 0;

    // Update tracking
    await updateMaxCountDaysStockZero(
      dealerId,
      stockDate,
      locationId,
      partsWithChangedDate,
      partsWithSameDate
    );

    return {
      prevQtySum,
      prevCountRecords,
      currentSumQty
    };

  } catch (error) {
    console.error("❌ Error in upsertSPMTable:", error);
    return error;
  }
}

async function updateMaxCountDaysStockZero(dealerId, stockDate, locationId, partNumbersToUpdate, sameDateParts) {
  try {
    const pool = await getPool();
   // console.log(sameDateParts);
    const stockUploadTable = `stock_upload_spm_td001_${dealerId}`;
    const maxCountTable = `max_CountDayStockZero_td001_${dealerId}`;

    const current = new Date(stockDate);
    const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    const currentMonthCol = `${monthNames[current.getMonth()]}_${current.getFullYear()}`;

    // Step 1: Insert new parts into max count
    const insertQuery = `
      USE z_scope;
      INSERT INTO ${maxCountTable} (PartNumber, [${currentMonthCol}], LocationId, PartId, DealerId)
      SELECT DISTINCT  su.PartNumber, 1, su.LocationId, su.PartId, su.DealerId
      FROM ${stockUploadTable} su
      LEFT JOIN ${maxCountTable} mc 
        ON LOWER(su.PartNumber) = LOWER(mc.PartNumber) AND su.LocationId = mc.LocationId
      WHERE mc.PartNumber IS NULL AND su.LocationId = @locationId;
    `;
    await pool.request()
      .input('locationId', sql.Int, locationId)
      .query(insertQuery);

    // Step 2: Increment for changed-date parts only
    for (const partNumber of partNumbersToUpdate) {
      const updateQuery = `
        USE z_scope;
        UPDATE mc
        SET mc.[${currentMonthCol}] = ISNULL(mc.[${currentMonthCol}], 0) + 1
        FROM ${maxCountTable} mc
        INNER JOIN ${stockUploadTable} su 
          ON LOWER(su.PartNumber) = LOWER(mc.PartNumber) AND su.LocationId = mc.LocationId
        WHERE LOWER(su.PartNumber) = @partNumber AND su.LocationId = @locationId;
      `;
      await pool.request()
        .input('partNumber', sql.NVarChar(50), partNumber)
        .input('locationId', sql.Int, locationId)
        .query(updateQuery);
    }


//     const decrementQuery = `
//   USE z_scope;

//   UPDATE mc
//   SET mc.[${currentMonthCol}] = 
//     CASE 
//       WHEN ISNULL(mc.[${currentMonthCol}], 0) > 0 
//       THEN mc.[${currentMonthCol}] - 1 
//       ELSE 0 
//     END
//   FROM ${maxCountTable} mc
//   INNER JOIN ${stockUploadTable} su_all
//     ON LOWER(mc.PartNumber) = LOWER(su_all.PartNumber)
//     AND mc.LocationId = su_all.LocationId
//   LEFT JOIN ${stockUploadTable} su_date
//     ON LOWER(mc.PartNumber) = LOWER(su_date.PartNumber)
//     AND mc.LocationId = su_date.LocationId
//     AND CAST(su_date.StockDate AS date) = CAST(@stockDate AS date)
//   WHERE su_date.PartNumber IS NULL
//     AND mc.LocationId = @locationId;
// `;


 const decrementQuery = `
  USE z_scope;

  UPDATE mc
  SET mc.[${currentMonthCol}] = 
    CASE 
      WHEN ISNULL(mc.[${currentMonthCol}], 0) > 0 
      THEN mc.[${currentMonthCol}] - 1 
      ELSE 0 
    END
  FROM ${maxCountTable} mc
  LEFT JOIN ${stockUploadTable} su_date
    ON LOWER(mc.PartNumber) = LOWER(su_date.PartNumber)
    AND mc.LocationId = su_date.LocationId
    AND CAST(su_date.StockDate AS date) = CAST(@stockDate AS date)
  WHERE su_date.PartNumber IS NULL
    AND mc.LocationId = @locationId;
`;
     
         await pool.request()
           .input('locationId', locationId)
           .input('stockDate', stockDate)
          
           .query(decrementQuery);
      // }

   // }

  } catch (err) {
    console.error('❌ Error in updateMaxCountDaysStockZero:', err);
  }
}

 //async function updateMaxCountDaysStockZero(dealerId,previousStockDate,stockDate,locationId) {
//   try {
//     const pool = await getPool();

//     // Get the current month column, e.g., "jul_2025"
//     const now = new Date();
//     const current = new Date(stockDate);
//     const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];;
//     let currentMonthCol ;
//     currentMonthCol=`${monthNames[current.getMonth()]}_${current.getFullYear()}`;
//     console.log("current month ",currentMonthCol,locationId)
//     // Use table names with dealerId
//     const stockUploadTable = `stock_upload_spm_td001_${dealerId}`;
//     const maxCountTable = `max_CountDayStockZero_td001_${dealerId}`;    
//     console.log("previous date ",previousStockDate,stockDate)
//     // const isSameDate = previousStockDate.toDateString()==stockDate?1:0;

//     // console.log("previous ",isSameDate)
   
//    let isSameDate;
//    if(previousStockDate){
//      const prev = new Date(previousStockDate);
//      isSameDate =
//        prev.getFullYear() == current.getFullYear() &&
//        prev.getMonth() == current.getMonth() &&
//        prev.getDate() == current.getDate() ? true : false;
//    }
// else{
//   isSameDate=false;
// }
// console.log("isSameDate =", isSameDate);
//     // Dynamic SQL parts
//     let sqlStatements = [];

//     // (b) Insert new parts in stock_upload_spm (if not exist in maxcount)
//     sqlStatements.push(`use z_scope
//       INSERT INTO ${maxCountTable} (PartNumber, [${currentMonthCol}],locationId,partId,dealerid)
//       SELECT su.PartNumber, 1,su.locationid,su.partId,su.dealerid
//       FROM ${stockUploadTable} su
//       LEFT JOIN ${maxCountTable} mc ON su.PartNumber = mc.PartNumber and su.locationId=mc.locationid
//       WHERE mc.PartNumber IS NULL  and su.locationid=@locationId;
//     `);
//   //  }
//     if (isSameDate) {

//      // console.log("location Id",locationId)
//       sqlStatements.push(`use z_scope
//         UPDATE mc
//         SET mc.[${currentMonthCol}] =  mc.[${currentMonthCol}] - 1
//         FROM ${maxCountTable} mc
//         LEFT JOIN ${stockUploadTable} su ON su.PartNumber = mc.PartNumber
//         and su.locationid=mc.locationId
//         WHERE su.PartNumber IS NULL and mc.locationid=@locationId;
//       `);

//       sqlStatements.push(`use z_scope  UPDATE mc
//       SET mc.[${currentMonthCol}] = 
//           mc.[${currentMonthCol}]
//       FROM ${maxCountTable} mc
//       Inner JOIN ${stockUploadTable} su ON su.PartNumber = mc.PartNumber 
//       and mc.locationid=su.locationid`)
//     }
//     else{
//     //    sqlStatements.push(`use z_scope;
//     //   UPDATE mc
//     //   SET mc.[${currentMonthCol}] =  mc.[${currentMonthCol}] + 1
//     //   FROM ${maxCountTable} mc
//     //   Inner JOIN ${stockUploadTable} su ON su.PartNumber = mc.PartNumber and su.locationId = mc.locationId
//     //   where mc.locationid=@locationId;
//     // `);

//  const query = `
//   USE z_scope;
//   UPDATE mc
//   SET mc.[${currentMonthCol}] = ISNULL(mc.[${currentMonthCol}], 0) + 1
//   FROM ${maxCountTable} mc
//   INNER JOIN ${stockUploadTable} su 
//     ON su.PartNumber = mc.PartNumber AND su.locationId = mc.locationId
//   WHERE mc.locationid = @locationId;
// `;

// //console.log("🟡 Executing SQL query:\n", query);

// const result = await pool.request()
//   .input('locationId', locationId)
//   .query(query);

// // console.log("Matched rows to update:", result);
//     }

//     // Execute combined SQL
//     await pool.request().input('locationId',locationId).batch(sqlStatements.join('\n'));

//    // console.log('Stock count update completed successfully.');
//   } catch (err) {
//     console.error('Error updating stock count:', err);
//   }
// }





const getPartNotInMasterSingleUploadInService = async (req, res) => {
  try {
    const pool = await getPool();
    let brandId = req.brand_id;
    let getQuery = `use [z_scope] Select partnumber from part_not_in_master where brand_id=@brandId`;
    const result1 = await pool
      .request()
      .input("brandId", brandId)
      .query(getQuery);
    // console.log(result1.recordset)
    return result1.recordset;
  } catch (error) {
    console.log("error ", error.message);
    return error;
  }
};

const uploadStock = async (req, res) => {
  try {
    const pool = await getPool();
  } catch (error) {
    return error;
  }
};

const getAllRecords = async (req, res) => {
  try {
    const pool = await getPool();
    let locationId = req.location_id;
   // let userId = req.added_by;
    let getQuery = `use [z_scope] select added_on,added_by,stockUploadCount,quantitySum,prevQuantitySum,operation_type,
    prevStockUploadCount,cast(stockDate as date) as stockDate from stock_upload_logs where location_id=@locationId order by added_on desc`;

    const result = await pool
      .request()
      .input("locationId", locationId)
      .query(getQuery);
      // .input("userId", userId)

    return result.recordset;
  } catch (error) {
    console.log(
      "error in stock upload service in getAll records single loc",
      error.message
    );
    return error;
  }
};

// const uploadBulkStock = async (req, res) => {
//   try {
//     const pool = await getPool();
//     let addedBy = req.body.user_id;
//     let rowData;
//     let brandId = parseInt(req.body.brand_id,10);
//     let dealerId = req.body.dealer_id;
//     let currentDate = new Date();
//     let StockCodes;
//     let wrongDealerLocationInFile = [];
//     // const date1= new Date(currentDate);
//     let date = req.body.date;
//     const date1 = new Date(date);
//     const formattedDate = date1.toLocaleDateString('en-CA');
//     // const formattedDate = date1.toISOString().split("T")[0]; // Extract the date portion of the ISO string
//     // console.log(typeof formattedDate,formattedDate);
//     //   console.log("date ",date)
//     let getLocationsQuery = `use [z_scope] select locationId from locationInfo where dealerId=@dealerId`;
//     let res56 = await pool
//       .request()
//       .input("dealerId", dealerId)
//       .query(getLocationsQuery);
//     let locations = res56.recordset;

//     // console.log("locations ", locations);
//     let getMappingQuery = `use [z_scope] select part_number,stock_qty,loc,stock_type from stock_upload_mapping where brand_id=@brandId and stock_type='current'`;

//     const mappingResult = await pool
//       .request()
//       .input("brandId", brandId)
//       .query(getMappingQuery);

//     if (mappingResult.recordset.length == 0) {
//       return { mappingNotPresent: true };
//     }
//     //console.log("mapping result ", mappingResult);

//     let checkDealerLocationMappingQuery = `use [z_scope] select inventory_location,locationID as locationId from dealer_location_mapping where dealerId=@dealerId and status='active'`;
//     const resDealerAndLoc = await pool
//       .request()
//       .input("dealerId", dealerId)
//       .query(checkDealerLocationMappingQuery);
//     if (resDealerAndLoc.recordset.length == 0) {
//       return { dealerLocationMappingNotPresent: true };
//     }

//     let dealerLocationMappedData = resDealerAndLoc.recordset;

//     let mappedData = mappingResult.recordset[0];
//     let fileData;
//     let headers;
//     let rowDataArray;
//     let filteredRowData;
//     let combinedExistedData = [];
//     if (brandId == 11 || brandId == 33) {
//       fileData = await readExcelFileWithSubColumnsForBulk(req.file.path);
//       // rowData=fileData.data.splice(2);
//       rowDataArray = fileData.data.splice(1);
//     } else {
//       fileData = await readExcelFile(req.file.path);
//       // rowData=fileData.data.splice(1);
//       rowDataArray = fileData.data;
//     }

//     headers = fileData.headers;
//     const requiredBrandIds = [17, 28];
//     const normalizedHeaders = headers.map((header) =>
//       header.trim().toLowerCase()
//     );
//     const isValid = Object.entries(mappedData)
//       .filter(([key]) => key !== "stock_type") // Exclude stock_type and loc
//       .every(([, value]) => headers.includes(value)); // Check if all values exist in headers

//     // If brandId is 17, 28 check for "availability" and "status" in headers
//     if (requiredBrandIds.includes(brandId)) {
//       const requiredFields = ["availability", "status"];
//       const hasRequiredFields = requiredFields.every((field) =>
//         normalizedHeaders.includes(field)
//       );

//       if (!hasRequiredFields) {
//         return { headerNotPresent: true };
//       }
//     }

//     if ([22].includes(brandId)) {
//       const requiredFields = ["availability"];
//       const hasRequiredFields = requiredFields.every((field) =>
//         normalizedHeaders.includes(field)
//       );

//       if (!hasRequiredFields) {
//         return { headerNotPresent: true };
//       }
//     }
//     // Return false if general validation fails
//     if (!isValid) {
//       return { headerNotPresent: true };
//     }

//     let result567;

//     rowData = rowDataArray.map((rowData1) => {
//       // Find the correct keys dynamically (case insensitive)
//       const availabilityKey = Object.keys(rowData1).find(
//           (key) => key.toLowerCase() === "availability"
//       );
      
//       const statusKey = Object.keys(rowData1).find(
//           (key) => key.toLowerCase() === "status"
//       );
  
//       return {
//           part_number: rowData1[mappedData.part_number] != null 
//               ? rowData1[mappedData.part_number].toString().replace(/[^a-zA-Z0-9]/g, "").trim()
//               : "", 
          
//           qty: rowData1[mappedData.stock_qty] != null 
//               ? parseFloat(rowData1[mappedData.stock_qty]) || 0 
//               : 0, 
//           location: rowData1[mappedData.loc] != null ? rowData1[mappedData.loc] : "",

//           availability: availabilityKey && rowData1[availabilityKey] != null 
//               ? rowData1[availabilityKey].toString().trim() 
//               : "", 
          
//           status: statusKey && rowData1[statusKey] != null 
//               ? rowData1[statusKey].toString().trim() 
//               : "",
//       };
//   });

  
  
// filteredRowData = rowData.filter((row) => {
//   // Convert qty to a number safely (handle undefined/null cases)
//   //console.log("row ",row)
//   const stockQty = parseFloat(row.qty) ;
//   // console.log("parse int ",stockQty)
//   // Check if part_number exists and is not empty
//   const hasPartNumber = row.part_number && row.part_number.trim() !== "";
//  const hasLocation=row.location && row.location.trim() !==''
//   // Normalize headers
//   const availabilityHeader = Object.keys(headers).find(
//     (header) => {
//      // console.log("header to lowercase ",header,header.toLowerCase())
//       header.toLowerCase() == "availability"

//     }
//   );
//   //console.log
//   const statusHeader = Object.keys(headers).find(
//     (header) => header.toLowerCase() == "status"
//   );

//  // console.log("avaiablitiy headers ",availabilityHeader)
//   // Get availability and status values
//   const availability = row["availability"]?.toLowerCase().trim();
//   const status = row["status"]?.toLowerCase().trim();

//   // Remove rows where part_number is null/empty and qty > 0
//   // if (hasPartNumber && stockQty > 0) {
//   //   return true;
//   // }

//   // For brandId 17, 28 remove if availability is "on-hand" and status is not "good"
//   if ((brandId == 17 || brandId == 28) && availability == "on hand" && status == "good" && hasPartNumber && stockQty > 0 && hasLocation) {
//     return true;
// }
// else
// if (brandId == 22 && availability == "on hand" && hasPartNumber && stockQty > 0 && hasLocation) {
//   //  if(row.part_number=='05321KEMP01'){
//   //   console.log("qty ",stockQty,hasPartNumber)
//   //  }
//     return true;
// }

// if (![17, 22, 28].includes(brandId)) {
//   if (hasPartNumber && stockQty > 0 && hasLocation) {
//         return true;
//       }
//   // if (hasPartNumber && stockQty > 0) {
//   //   return true;
//   // }
// }

// return false;
//   // return true; // Keep the row if it passed all filters
// });
//     let partMasterQuery = `use z_scope select partnumber1 ,partID from part_master where brandId=@brandId`;

//     const result = await pool
//       .request()
//       .input("brandId", brandId)
//       .query(partMasterQuery);
//     let partMasterResult = result.recordset;

//     let partNotInMasterArray = [];
//     //   console.log(partMasterResult)
//     const getPartNumberQuery = `use [z_scope] select partnumber from part_not_in_master where brand_id=@brandId`;
//     let res123 = await pool
//       .request()
//       .input("brandId", brandId)
//       .query(getPartNumberQuery);
//     partNotInMasterArray = res123?.recordset;

//     let deletePartMasterQuery = `use [z_scope] delete from part_not_in_master where brand_id=@brandId`;
//     await pool.request().input("brandId", brandId).query(deletePartMasterQuery);

//     let updatedFilteredRowData = [];
//     let locationIds = locations.map((location) =>
//       parseInt(location.locationId, 10)
//     );
//     //  console.log("locationIds ", locationIds);

//     let query12 = `
//    USE [z_scope]; 
//    SELECT tcode, locationId 
//    FROM currentStock1 
//    WHERE locationId IN (${locationIds.map((_, i) => `@loc${i}`).join(", ")})
// `;

//     let request = pool.request();
//     locationIds.forEach((id, i) => {
//       request.input(`loc${i}`, sql.Int, id); // Assuming locationId is an integer
//     });
//     const res45 = await request.query(query12);

//     let tCodeFromStock1 = res45?.recordset;
//     // console.log("tcode from stock 1 598", tCodeFromStock1);
//     let stockCodes = res45?.recordset;
//     StockCodes = stockCodes.map((code) => parseInt(code.tcode, 10));
//   //  console.log("stockcodes 606 line", StockCodes);
//     let countPrevRecords = 0;
//     let insertedDataResult = [];
  
//     if (res45?.recordset?.length > 0) {
//       let insertedDataQuery = `
//       USE [z_scope]; 
//       SELECT c2.stockcode, c2.partNumber, c2.partID, c2.qty, c1.locationId
//       FROM currentStock2 c2
//       JOIN currentStock1 c1
//       ON c2.Stockcode = c1.tcode
//       WHERE c2.Stockcode IN (${StockCodes.map((_, i) => `@code${i}`).join(
//         ", "
//       )});
//   `;

//       let request = pool.request();
//       StockCodes.forEach((code, i) => {
//         request.input(`code${i}`, sql.Int, code); // Assuming Stockcode is a string
//       });

//       let result56 = await request.query(insertedDataQuery);

//       insertedDataResult = result56.recordset;
//       //console.log("stockCodes ",insertedDataResult)
//       countPrevRecords = insertedDataResult.length;
//       //console.log("count prev recorcds ",countPrevRecords)
//       // console.log("stock code ",StockCode)
//       combinedExistedData = insertedDataResult.flatMap((a1) =>
//         tCodeFromStock1
//           .filter((a2) => parseInt(a1.stockcode, 10) == parseInt(a2.tcode, 10))
//           .map(({ partNumber, qty, partId }) => ({
//             locationId: parseInt(a1.locationId, 10),
//             part_number: a1.partNumber,
//             qty: a1.qty,
//             partId: a1.partID,
//           }))
//       );

//    //  console.log("combined existed data 716", combinedExistedData);
//     }

//     //console.log("filtered row 713 ",filteredRowData)
//     for (const item of filteredRowData) {
//       let deleteItem = false; // Flag to determine if the item should be deleted

//       // Loop over the partMasterResult to find a match
//       for (const element of partMasterResult) {
//         // console.log("element ",element)
//         if (
//           item.part_number.trim().toLowerCase() ===
//           element.partnumber1.trim().toLowerCase()
//         ) {
//           // Add the partid to the item if a match is found
//           item.partId = element.partID; // Directly mutate the original item
//           // updatedFilteredRowData.push(item);
//           // Reset deleteItem flag as match was found
//           deleteItem = false;
//           break; // Exit the loop after finding the match
//         } else {
//           deleteItem = true;
//         }
//       }

//       if (!deleteItem) {
//         for (const element of dealerLocationMappedData) {
//         //  console.log("element ",item.location,item.location.replace(/[^a-zA-Z0-9-_ ]/g, ''))
//           if (
//             item.location &&
//             item.location.replace(/[^a-zA-Z0-9-_ ]/g, '').trim().toLowerCase() ===
//               element.inventory_location.trim().toLowerCase()
//           ) {
//             // Add the partid to the item if a match is found
//             item.locationId = element.locationId; // Directly mutate the original item
//             updatedFilteredRowData.push(item);
//             break; // Exit the loop after finding the match
            
//           } else {
//             wrongDealerLocationInFile.push(item.location);
//           }
//         }
//       }

//       // If no match was found, flag for deletion and add to partNotInMasterArray
//       if (deleteItem) {
//         const partnumber = item.part_number;
//         //    console.log("partnumber ",item)
//         const exists = partNotInMasterArray.some(
//           (item1) => item1.partnumber == partnumber
//         );
//         if (!exists) {
//           // console.log("exists ",partnumber)
//           partNotInMasterArray.push({ partnumber: partnumber });
//         }
//       }
//     }

//     // console.log("filtered row data 868", updatedFilteredRowData);

//     const partCountMap = new Map();

//     // console.log("updated filteredd data 771 ",updatedFilteredRowData)
//     // Group and accumulate stockQty for each partNumber + locationId

//     for (const element of updatedFilteredRowData) {
//       const key = `${element.part_number}-${element.locationId}`;
    
//       if (partCountMap.has(key)) {
//         const existing = partCountMap.get(key);
//         partCountMap.set(key, {
//           part_number: element.part_number,
//           qty: existing.qty + element.qty,
//           partId: element.partId,
//           locationId: element.locationId,
//           count: existing.count + 1,
//           location: element.location || existing.location || '',
//           availability: element.availability || existing.availability || '',
//           status: element.status || existing.status || '',
//         });
//       } else {
//         partCountMap.set(key, {
//           part_number: element.part_number,
//           qty: element.qty,
//           partId: element.partId,
//           locationId: element.locationId,
//           count: 1,
//           location: element.location || '',
//           availability: element.availability || '',
//           status: element.status || '',
//         });
//       }
//     }
    
//      updatedFilteredRowData = Array.from(partCountMap.values());
    
//   //  console.log("filtered 974 ",filteredRowData)

//     //console.log("updated filtered row 918 ",partCountMap);
//  //console.log("updated filtered data 922 ",updatedFilteredRowData)
  
//     if (insertedDataResult.length != 0) {
//    //   console.log("updated filtered ",updatedFilteredRowData);
//   //    console.log("combined filtered ",combinedExistedData)
//       if (updatedFilteredRowData.length > combinedExistedData.length) {
//         const missingRecords = [];
      
//         updatedFilteredRowData.forEach((item) => {
//           let partID = item.partId;
//           let qty = parseFloat(item.qty);
      
//           const match = combinedExistedData.find(
//             (el) => el.partId == partID && el.locationId == item.locationId
//           );
      
//           if (match) {
//           //  console.log("Matched element:", match);
//             item.qty = qty + parseFloat(match.qty);
//           } else {
//             // Only push missing record if not already in missingRecords
//             const potentialMissing = combinedExistedData.find(
//               (el) => el.locationId == item.locationId && el.partId != partID
//             );
      
//             if (
//               potentialMissing &&
//               !missingRecords.some(
//                 (rec) =>
//                   rec.partId == potentialMissing.partId &&
//                   rec.locationId == potentialMissing.locationId
//               )
//             ) {
//            //   console.log("Missing item:", potentialMissing);
//               missingRecords.push(potentialMissing);
//             }
//           }
//         });
//     //   console.log("missing records ",missingRecords)
//         // Only push missingRecords if they're truly missing
//         updatedFilteredRowData.push(
//           ...missingRecords.filter(
//             (missingItem) =>
//               !updatedFilteredRowData.some(
//                 (item) =>
//                   item.partId == missingItem.partId &&
//                   item.locationId == missingItem.locationId
//               )
//           )
//         );
//       }

//       //console.log("updated filtered 974 ",updatedFilteredRowData)
      
//       if (updatedFilteredRowData.length <= combinedExistedData.length) {
//         // Create a combined key map like "partId-locationId"
//         const updatedMap = new Map(
//           updatedFilteredRowData.map((item) => [`${item.partId}-${item.locationId}`, item])
//         );
      
//       //  console.log("combined ", combinedExistedData);
      
//         // Find missing records in updatedFilteredRowData
//         const missingRecords = combinedExistedData
//           .filter(
//             (item) => !updatedMap.has(`${item.partId}-${item.locationId}`)
//           )
//           .map((item) => ({
//             part_number: item.part_number,
//             partId: parseInt(item.partId, 10),
//             qty: parseFloat(item.qty),
//             locationId: parseInt(item.locationId, 10),
//           }));
      
//        // console.log("updated map ", updatedMap);
      
//         updatedFilteredRowData.forEach((item) => {
//           const key = `${item.partId}-${item.locationId}`;
//           if (updatedMap.has(key)) {
//             const existing = combinedExistedData.find(
//               (el) => el.partId == item.partId && el.locationId == item.locationId
//             );
      
//             if (existing) {
//               item.qty = parseFloat(item.qty) + parseFloat(existing.qty);
//             } 
//           }
//         });
      
//         // Add missing records
//         updatedFilteredRowData.push(...missingRecords);
//       }
      
//     }

//   //  console.log("updated filtered row ",updatedFilteredRowData,updatedFilteredRowData.length);
//    // console.log("previous data ",combinedExistedData,combinedExistedData.length)
  
//    // console.log("filtered 982 ",updatedFilteredRowData)
//    //  console.log("updatedFiltered 828 ",updatedFilteredRowData)
//     const uniqueLocationIds = [
//       ...new Set(updatedFilteredRowData.map((item) => item.locationId)),
//     ];

//     // console.log("updatedFiltered row ",updatedFilteredRowData)
//     //  console.log("unique location ids ", uniqueLocationIds);
//     let rowCount;

//     rowCount = updatedFilteredRowData?.length;
//     let combinedLogsLocationWise = [];
//     let currentStockCode;
//     // console.log("unique ids ",uniqueLocationIds)
   
//     for (let i = 0; i < uniqueLocationIds.length; i++) {
//       let locId = uniqueLocationIds[i];
//       let prevCountRecords=0;
//       let quantitySumPrev = 0;
//     //   console.log("unique ids  ",uniqueLocationIds)
//       let filteredData = updatedFilteredRowData.filter(
//         (item) => item.locationId === locId
//       );

//       //console.log("filtered data ",filteredData,locId,StockCodes);
//       if (insertedDataResult.length != 0) {
//         // console.log("countRecords inserted ",countPrevRecords)
//         // StockCode = insertedDataResult[0].StockCode;
//         let tcodeQuery = `
//         USE [z_scope]; 
//         SELECT tcode
//         FROM currentStock1
//         WHERE locationId =@locId
//     `;

//         let request = await pool.request().input('locId',locId);

//         let resultTcode= await request.query(tcodeQuery);
//         // console.log("quantity sum 642", result567.recordset);
//      //  console.log("result tcode ",resultTcode)
//         if(resultTcode?.recordset[0]?.tcode){
//           let resTcode=parseInt(resultTcode?.recordset[0]?.tcode,10);
//         //  console.log("tcode at 1069 ",resTcode);

//       let quantitySumQuery=`Select sum(qty) as QuantSum,count(*) as countRecords  from currentstock2 where stockcode=@resTcode`;
//        result567=await pool.request().input('resTcode',resTcode).query(quantitySumQuery)  
//       // console.log("quantity sum query 1072 ",result567?.recordset[0]?.QuantSum ) 
         
//          // console.log(result567);
//       if (result567?.recordset?.length != 0) {
//           quantitySumPrev = result567?.recordset[0]?.QuantSum || 0;
//           prevCountRecords=result567?.recordset[0]?.countRecords ||0 ;
//           //console.log("prevCount ",prevCountRecords)
//         }

//         let deleteQuery=`use [z_scope] Delete from currentstock1 where tcode=@resTcode`;

//         let res34=await pool.request().input('resTcode',resTcode).query(deleteQuery);

//         let deleteQuery1=`use [z_scope] delete from currentstock2 where stockcode=@resTcode`;
//         await pool.request().input('resTcode',resTcode).query(deleteQuery1)
//         }
       
//       }
//       // console.log("updated filtered row after getting unique location id ",updatedFilteredRowData)
//       // console.log("current stock1 ",locId,formattedDate,addedBy)
//       let insertQueryForCurrentStock1 = `use [z_scope] insert into currentStock1(locationID,stockdate,addedby) output inserted.tcode values(@locId,@formattedDate,@addedBy)`;

//       const result1 = await pool
//         .request()
//         .input("locId", locId)
//         .input("formattedDate", formattedDate)
//         .input("addedBy", addedBy)
//         .query(insertQueryForCurrentStock1);
//       currentStockCode = result1?.recordset[0]?.tcode;

//       //  console.log(currentStockCode)
//       const values1 = filteredData.map((item) => {
//         return [
//           parseInt(currentStockCode, 10),
//           item["part_number"],
//           parseFloat(item["qty"]),
//           item["partId"],
//         ];
//       });
//       //  console.log("values ",values1);
//       try {
//         await pool.request();
//         await pool.request().query("use [z_scope]");
//         const table1 = new sql.Table("currentStock2"); // Updated table name
//         table1.create = false;

//         table1.columns.add("StockCode", sql.BigInt, { nullable: true });
//         table1.columns.add("PartNumber", sql.VarChar(35), { nullable: true });
//         table1.columns.add("Qty", sql.Decimal(18, 2), { nullable: true });
//         table1.columns.add("PartID", sql.Int, { nullable: true });
//         // Add rows to the table
//         values1.forEach((row) => {
//           table1.rows.add(
//             row[0],
//             row[1], // brandid
//             row[2],
//             row[3]
//           );
//         });
//         await pool.request().bulk(table1);
//       } catch (error) {
//         console.error("Error during bulk insert in single upload: ", error);
//         return { error: error }; // Rethrow the error for further handling if necessary
//       }

//       let currentQuantSum = 0;
//       let currentCountQuery = `use [z_scope] select sum(qty) as currentQuantSum from currentStock2 where stockCode=@currentStockCode`;
//       let result678 = await pool
//         .request()
//         .input("currentStockCode", currentStockCode)
//         .query(currentCountQuery);
//       //  console.log("currentQuant ",currentQuantSum)
//       if (result678?.recordset?.length != 0) {
//         currentQuantSum = result678?.recordset[0]?.currentQuantSum;
//       }
//       //  console.log("currentquant ",currentQuantSum)
//       let logQuery = `use [z_scope] insert into Stock_Upload_Logs(Stockcode,location_id,dealer_id,added_by,brand_id, StockUploadCount,operation_type,quantitySum,
//      prevStockUploadCount,prevQuantitySum) values(@currentStockCode,@locId,@dealerId,@addedBy,@brandId,@rowCount,'bulk stock upload ',@currentQuantSum,@countPrevRecords,@quantitySumPrev)`;
//       await pool
//         .request()
//         .input("currentStockCode", currentStockCode)
//         .input("locId", locId)
//         .input("addedBy", addedBy)
//         .input("currentQuantSum", result678?.recordset[0]?.currentQuantSum)
//         .input("brandId", brandId)
//         .input("dealerId", dealerId)
//         .input("rowCount", filteredData?.length)
//         .input("quantitySumPrev", quantitySumPrev)
//         .input("countPrevRecords", prevCountRecords)
//         .query(logQuery);

//       combinedLogsLocationWise.push({
//         currentSumQuantity: result678?.recordset[0]?.currentQuantSum||0,
//         prevSumQuantity: quantitySumPrev ||0,
//         currentRecords: filteredData?.length||0,
//         prevRecords: prevCountRecords ||0,
//       });

//       // console.log("partNotInMaster ", {
//       //   currentSumQuantity: currentQuantSum,
//       //   prevSumQuantity: quantitySumPrev,
//       //   currentRecords: rowCount,
//       //   prevRecords: countPrevRecords,
//       // })
//     }

//     if (partNotInMasterArray.length != 0) {
//       //  console.log("part not in master ",partNotInMasterArray)
//       const values = partNotInMasterArray.map((item) => {
//         return [
//           parseInt(brandId, 10), // Ensure brandId is an integer
//           item["partnumber"],
//         ];
//       });
//       try {
//         await pool.request().query("use [z_scope]");
//         const table = new sql.Table("part_not_in_master"); // Updated table name
//         table.create = false;

//         table.columns.add("brand_id", sql.Int, { nullable: true });
//         table.columns.add("partnumber", sql.VarChar(100), { nullable: true });
//         // Add rows to the table
//         values.forEach((row) => {
//           table.rows.add(
//             row[0],
//             row[1] // brandid
//           );
//         });
//         await pool.request().bulk(table);
//       } catch (error) {
//         console.error("Error during bulk insert: part not in master", error);
//         return error; // Rethrow the error for further handling if necessary
//       }
//     }
  
//     // if (result567?.recordset?.length != 0) {
//     //   // console.log("quant sum prev ",quantitySumPrev);
//     //   // console.log("stock codes ",stockCodes)
//     //   if (stockCodes.length != 0) {
//     //     let deleteQuery = `
//     //   USE [z_scope]; 
//     //   DELETE FROM currentStock2 
//     //   WHERE StockCode IN (${StockCodes.map((_, i) => `@code${i}`).join(", ")})
//     //   `;
//     //     // console.log("stock codes ",stockCodes)

//     //     let deleteQuery1 = `
//     //   USE [z_scope]; 
//     //   DELETE FROM currentStock1 
//     //   WHERE tcode IN (${StockCodes.map((_, i) => `@code${i}`).join(", ")})
//     //   `;
//     //     //  console.log("stock codes ",stockCodes)
//     //     let request = await pool.request();
//     //     StockCodes.forEach((code, i) => {
//     //       //console.log(" code ",code)
//     //       request.input(`code${i}`, sql.Int, code); // Assuming StockCode and tcode are strings
//     //     });

//     //     // Execute the queries
//     //     await request.query(deleteQuery);
//     //     await request.query(deleteQuery1);
//     //  }
    

//     //  console.log("locationIWs e",combinedLogsLocationWise)
//     return combinedLogsLocationWise;
//   } catch (error) {
//     console.log(
//       "error in bulk stock upload method in by user service ",
//       error.message
//     );
//     return { error: error };
//   }
// };


const uploadBulkStock = async (req, res) => {
  try {
    const pool = await getPool();
    let addedBy = parseInt(req.body.user_id,10);
    let rowData;
    let brandId = parseInt(req.body.brand_id,10);
   // brandId=17
    let dealerId = parseInt(req.body.dealer_id,10);
    let currentDate = new Date();
    let StockCodes;
    let wrongDealerLocationInFile = [];
    // const date1= new Date(currentDate);
    let date = req.body.date;
    const date1 = new Date(date);
    let formattedDate = date1.toLocaleDateString('en-CA');
    // const formattedDate = date1.toISOString().split("T")[0]; // Extract the date portion of the ISO string
    // console.log(typeof formattedDate,formattedDate);
    //   console.log("date ",date)
    let getLocationsQuery = `use [z_scope] select locationId from locationInfo where dealerId=@dealerId`;
    let res56 = await pool
      .request()
      .input("dealerId", dealerId)
      .query(getLocationsQuery);
    let locations = res56.recordset;
    let isOlderUploadForHyundai=false;
    // console.log("locations ", locations);

    const today = new Date();
    const formattedToday = today.toLocaleDateString('en-CA');
        // const formattedDate = date1.toISOString().split("T")[0]; 
       // console.log("formattedToday ",formattedDate,formattedToday)
    let mappingResult;
        if (formattedDate == formattedToday) {
         // 2. Fetch Excel column mapping for the brand
         let getMappingQuery = `use [z_scope] select part_number,stock_qty,loc,stock_type,calculativeField from stock_upload_mapping where brand_id=@brandId and stock_type='current'`;

          mappingResult = await pool
           .request()
           .input("brandId", brandId)
           .query(getMappingQuery);
    
        } else if (formattedDate < formattedToday) {
       //   console.log("exccuted ")
          isOlderUploadForHyundai=true;
          // Mapping logic for older date
          // 2. Fetch Excel column mapping for the brand
          let getMappingQuery = `use [z_scope] select part_number,stock_qty,loc,stock_type,calculativeField from stock_upload_mapping where brand_id=@brandId and stock_type='older'`;

          mappingResult = await pool
           .request()
           .input("brandId", brandId)
           .query(getMappingQuery);
        } 
    

    if (mappingResult.recordset.length == 0) {
      return { mappingNotPresent: true };
    }
    //console.log("mapping result ", mappingResult);

    let checkDealerLocationMappingQuery = `use [z_scope] select inventory_location,locationID as locationId from dealer_location_mapping where dealerId=@dealerId and status='active'`;
    const resDealerAndLoc = await pool
      .request()
      .input("dealerId", dealerId)
      .query(checkDealerLocationMappingQuery);
    if (resDealerAndLoc.recordset.length == 0) {
      return { dealerLocationMappingNotPresent: true };
    }

    let dealerLocationMappedData = resDealerAndLoc.recordset;

    let mappedData = mappingResult.recordset[0];
    let fileData;
    let headers;
    let rowDataArray;
    let filteredRowData;
    let combinedExistedData = [];
   let inventoryLocationNotExist=new Set();

    if(!isOlderUploadForHyundai){  //for current
      fileData = [11, 33].includes(brandId)
     ? await readExcelFileWithSubColumnsForBulk(req.file.path)
     : await readExcelFile(req.file.path);
    //  rowDataArray = fileData.data.splice(1);
   }
   else{
    //  fileData = [33].includes(brandId)
    //  ? await readExcelFileWithSubColumns(req.file.path)
    //  : await readExcelFile(req.file.path); 
   fileData= await readExcelFile(req.file.path);
    //  rowDataArray = fileData.data;
   }

   if(!isOlderUploadForHyundai){
      rowDataArray = fileData.data.slice([11, 33].includes(brandId) ? 1 : 0);
   }
   else{
     rowDataArray = fileData.data.slice([33].includes(brandId) ? 1 : 0);
   }
    headers = fileData.headers;
     if(!headers){
        return {isEmptyFile:true}
      }
    const requiredBrandIds = [17, 28];
    const normalizedHeaders = headers.map((header) =>
      header.trim().toLowerCase()
    );
  // console.log(normalizedHeaders,mappedData)
    const isValid = Object.entries(mappedData)
      .filter(([key]) => key != 'stock_type'  && key!= 'calculativeField' && key!='stock_qty') // Exclude stock_type and loc
      .every(([, value]) => normalizedHeaders.includes(value.trim().toLowerCase())); // Check if all values exist in headers
    
    //  console.log("is valid ",isValid,Object.entries(mappedData)
     // .filter(([key]) => key != 'stock_type'  && key!= 'calculativeField' && key!='stock_qty'))
    // If brandId is 17, 28 check for "availability" and "status" in headers
 // console.log("brandid ",brandId,mappedData)
    if (requiredBrandIds.includes(brandId)) {
      const requiredFields = ["availability", "status"];
      const hasRequiredFields = requiredFields.every((field) =>
        normalizedHeaders.includes(field)
      );

      if (!hasRequiredFields) {
        return { headerNotPresent: true };
      }
    }

    if ([22].includes(brandId)) {
      let requiredFields = ["availability"];
      let hasRequiredFields = requiredFields.every((field) =>
        normalizedHeaders.includes(field)
      );

      if (!hasRequiredFields) {
        return { headerNotPresent: true };
      }
    }
   
    // Return false if general validation fails
    if (!isValid) {
      return { headerNotPresent: true };
    }

     // Step 1: Get headers from uploaded file (from the first row)
let headers1 = Object.keys(rowDataArray[0] || {}).map(h => h.toLowerCase());

// Step 2: Get column names from stock_qty field
const stockQtyColumns = mappedData.stock_qty
  .split(",")
  .map(col => col.trim())
  .filter(Boolean);

// Step 3: Check for missing fields
const missingFields = stockQtyColumns.filter(
  col => !headers1.includes(col.toLowerCase())
);

// Step 4: If missing, throw clear error
if (missingFields.length > 0) {
 return {headerNotPresent:true,missingFields:missingFields}
}
    let result567;

    let normalizedData = rowDataArray.map(row => {
      const getVal = (key) => {
        const match = Object.keys(row).find(k => k.trim().toLowerCase() == key.trim().toLowerCase());
        const value = match ? row[match] : "";
        return value != null ? value.toString().trim() : "";
      };
    
      const computeQty = () => {
        const formula = mappedData.calculativeField;
      
        if (typeof formula === "string" && /[\+\-\*\/]/.test(formula)) {
          let formulaWithValues = formula;
      
          // Sort keys by length (to replace longer keys first and avoid partial overlaps)
          const keys = Object.keys(row).sort((a, b) => b.length - a.length);
      
          keys.forEach(key => {
            // Escape special characters in key (like dash)
            const escapedKey = key.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&');
            const regex = new RegExp(`\\b${escapedKey}\\b`, 'gi');
            const val = parseFloat(row[key]);
            formulaWithValues = formulaWithValues.replace(regex, isNaN(val) ? "0" : val.toString());
          });
      
          try {
           // console.log("Evaluating:", formulaWithValues);
            return eval(formulaWithValues);
          } catch (err) {
            console.error("Error evaluating formula:", formulaWithValues, err);
            return 0;
          }
        } else {
          const val = parseFloat(row[mappedData.stock_qty]);
          return isNaN(val) ? 0 : val;
        }
      };
    
      return {
            part_number: getVal(mappedData.part_number).replace(/[^a-zA-Z0-9]/g, ""),
            qty: computeQty(),
            availability: getVal("availability"),
            status: getVal("status"),
            location: getVal(mappedData.loc) != null ? getVal(mappedData.loc) : "",
          };
    });
  
    filteredRowData = normalizedData.filter((row) => {
      let stockQty = parseFloat(row.qty);
      let hasPartNumber = row.part_number && row.part_number.trim() !== "";
      let availability = row["availability"]?.toLowerCase();
      let status = row["status"]?.toLowerCase();
       let hasLocation=row.location && row.location.trim() !==''
    
      if ((brandId == 17 || brandId == 28)) {
        return hasPartNumber && stockQty > 0 && availability == "on hand" && status == "good" && hasLocation;
      }
    
      if (brandId == 22) {
        return hasPartNumber && stockQty > 0 && availability == "on hand" && hasLocation;
      }
    
      return hasPartNumber && stockQty > 0 && hasLocation;
    });


const partMasterQuery = `
  USE z_scope;
  SELECT partNo as partnumber1, partID FROM VW_PartMaster WHERE brandId = @brandId
`;

const getPartNumberQuery = `
  USE [z_scope];
  SELECT partnumber FROM part_not_in_master WHERE brand_id = @brandId
`;

const partMasterRequest = pool
  .request()
  .input("brandId", brandId)
  .query(partMasterQuery);

const partNotInMasterRequest = pool
  .request()
  .input("brandId", brandId)
  .query(getPartNumberQuery);

const [partMasterRecords, partNotInMasterResult] = await Promise.all([
  partMasterRequest,
  partNotInMasterRequest,
]);

let partMasterResult = partMasterRecords.recordset;
let partNotInMasterArray = partNotInMasterResult?.recordset || [];



const locationIds = locations.map((location) => parseInt(location.locationId, 10));

const query12 = `
  USE [z_scope]; 
  SELECT tcode, locationId 
  FROM currentStock1 
  WHERE locationId IN (${locationIds.map((_, i) => `@loc${i}`).join(", ")})
`;

const stockRequest = (() => {
  const req = pool.request();
  locationIds.forEach((id, i) => {
    req.input(`loc${i}`, sql.Int, id);
  });
  return req.query(query12);
})();

// Run them in parallel
let [ res45] = await Promise.all([ stockRequest]);

let tCodeFromStock1 = res45?.recordset || [];
let stockCodes = tCodeFromStock1;

    let updatedFilteredRowData = [];
    StockCodes = stockCodes.map((code) => parseInt(code.tcode, 10));
  //  console.log("stockcodes 606 line", StockCodes);
    let countPrevRecords = 0;
    let insertedDataResult = [];
  
    if (res45?.recordset?.length > 0) {
      let insertedDataQuery = `
      USE [z_scope]; 
      SELECT c2.stockcode, c2.partNumber, c2.partID, c2.qty, c1.locationId
      FROM currentStock2 c2
      JOIN currentStock1 c1
      ON c2.Stockcode = c1.tcode
      WHERE c2.Stockcode IN (${StockCodes.map((_, i) => `@code${i}`).join(
        ", "
      )});
  `;

      let request = pool.request();
      StockCodes.forEach((code, i) => {
        request.input(`code${i}`, sql.Int, code); // Assuming Stockcode is a string
      });

      let result56 = await request.query(insertedDataQuery);

      insertedDataResult = result56.recordset;
     // console.log("stockCodes ",insertedDataResult)
      countPrevRecords = insertedDataResult.length;
      //console.log("count prev recorcds ",countPrevRecords)
      // console.log("stock code ",StockCode)
      combinedExistedData = insertedDataResult.flatMap((a1) =>
        tCodeFromStock1
          .filter((a2) => parseInt(a1.stockcode, 10) == parseInt(a2.tcode, 10))
          .map(({ partNumber, qty, partId }) => ({
            locationId: parseInt(a1.locationId, 10),
            part_number: a1.partNumber,
            qty: a1.qty,
            partId: a1.partID,
          }))
      );

   //  console.log("combined existed data 716", combinedExistedData);
    }

    let partMasterMap = new Map(
  partMasterResult.map(el => [el.partnumber1.trim().toLowerCase(), el.partID])
);

let dealerLocationMap = new Map(
  dealerLocationMappedData.map(el => [el.inventory_location.trim().toLowerCase(), el.locationId])
);

let seenPartNumbers = new Set(); // For tracking duplicates in partNotInMasterArray
//console.log("partnot in master ",partNotInMasterArray)
for (let item of filteredRowData) {
  let normalizedPartNumber = item.part_number.trim().toLowerCase();
  let partId = partMasterMap.get(normalizedPartNumber);
 // console.log("partnot in master ",partNotInMasterArray)
  let isAlreadyExist=partNotInMasterArray.some(p=>p.partnumber?.toLowerCase()==normalizedPartNumber.toLowerCase())
 
 
  if (partId) {
    item.partId = partId;

    let normalizedLocation = item.location?.replace(/[^a-zA-Z0-9-_ ]/g, '').trim().toLowerCase();
    let locationId = dealerLocationMap.get(normalizedLocation);
     if(dealerLocationMap.get(normalizedLocation)==undefined){
    //  console.log(item.location);
      if(!inventoryLocationNotExist.has(item.location)){
        inventoryLocationNotExist.add(item.location)
      }
    }
    if (locationId) {
      item.locationId = locationId;
      updatedFilteredRowData.push(item);
    } else {
      wrongDealerLocationInFile.push(item.location);
    }

  } else {
    // Only push to partNotInMasterArray if not already added
    if(!isAlreadyExist){
        partNotInMasterArray.push({ partnumber: item.part_number });
    }
    // if (!seenPartNumbers.has(item.part_number)) {
    //   seenPartNumbers.add(item.part_number);
    //  // partNotInMasterArray.push({ partnumber: item.part_number });
    // }
  } 
}
// partNotInMasterArray = Array.from(seenPartNumbers).map(partnumber => ({ partnumber }));
   // console.log("part not in master ",partNotInMasterArray,partNotInMasterArray.length)
    //  updatedFilteredRowData = Array.from(partCountMap.values());

    let partCountMap = new Map();

for (let item of updatedFilteredRowData) {
  let key = `${item.part_number}-${item.locationId}`;
  let existing = partCountMap.get(key);

   if (existing) {
    item.isPartNotInMaster = false;
  } else {
    item.isPartNotInMaster = true;
  }
  if (existing) {
    existing.qty += item.qty;
    existing.count += 1;
  
    // Prefer non-empty values from the new item if existing is empty
    existing.location = existing.location || item.location || '';
    existing.availability = existing.availability || item.availability || '';
    existing.status = existing.status || item.status || '';
  } else {
    partCountMap.set(key, {
      part_number: item.part_number,
      qty: item.qty,
      partId: item.partId,
      locationId: item.locationId,
      count: 1,
      location: item.location || '',
      availability: item.availability || '',
      status: item.status || '',
    });
  }
}

updatedFilteredRowData = Array.from(partCountMap.values());
const notInMasterFalseItems = updatedFilteredRowData.filter(item => item.isPartNotInMaster == false);
    

    const uniqueLocationIds = [
      ...new Set(updatedFilteredRowData.map((item) => item.locationId)),
    ];

    // console.log("updatedFiltered row ",updatedFilteredRowData)
    //  console.log("unique location ids ", uniqueLocationIds);
    let rowCount;

    rowCount = updatedFilteredRowData?.length;
    let combinedLogsLocationWise = [];
    let currentStockCode;
   //  console.log("unique ids ",uniqueLocationIds)
   let previousStockDate;
   let operation='';
    for (let i = 0; i < uniqueLocationIds.length; i++) {
      let locId = uniqueLocationIds[i];
      // console.log("loctd ",locId)
      let prevCountRecords=0;
      let quantitySumPrev = 0;
      let currentQuantSum = 0;
    //   console.log("unique ids  ",uniqueLocationIds)
      let filteredData = updatedFilteredRowData.filter(
        (item) => item.locationId == locId
      );

    //  console.log("filtered data ",filteredData);
    if(formattedDate==formattedToday){

      operation='Bulk Upload for current days';
      if (insertedDataResult.length != 0) {
        // console.log("countRecords inserted ",countPrevRecords)
        // StockCode = insertedDataResult[0].StockCode;
        let tcodeQuery = `
        USE [z_scope]; 
        SELECT tcode,stockDate
        FROM currentStock1
        WHERE locationId =@locId
    `;

        let request = await pool.request().input('locId',locId);

        let resultTcode= await request.query(tcodeQuery);
          previousStockDate=resultTcode.recordset[0]?.stockDate;
        // console.log("quantity sum 642", result567.recordset);
     //  console.log("result tcode ",resultTcode)
       for(let i=0;i<resultTcode?.recordset.length;i++){

         if(resultTcode?.recordset[i]?.tcode){
          let resTcode=parseInt(resultTcode?.recordset[i]?.tcode,10);
        //  console.log("tcode at 1069 ",resTcode);

      let quantitySumQuery=`Select sum(qty) as QuantSum,count(*) as countRecords  from currentstock2 where stockcode=@resTcode`;
       result567=await pool.request().input('resTcode',resTcode).query(quantitySumQuery)  
 
      if (result567?.recordset?.length != 0) {
          quantitySumPrev = result567?.recordset[i]?.QuantSum || 0;
          prevCountRecords=result567?.recordset[i]?.countRecords ||0 ;
          //console.log("prevCount ",prevCountRecords)
        }

        let deleteQuery=`use [z_scope] Delete from currentstock1 where tcode=@resTcode`;

        let res34=await pool.request().input('resTcode',resTcode).query(deleteQuery);

        let deleteQuery1=`use [z_scope] delete from currentstock2 where stockcode=@resTcode`;
        await pool.request().input('resTcode',resTcode).query(deleteQuery1)
        }

       }
       
       
      }
      // console.log("updated filtered row after getting unique location id ",updatedFilteredRowData)
      // console.log("current stock1 ",locId,formattedDate,addedBy)
      let insertQueryForCurrentStock1 = `use [z_scope] insert into currentStock1(locationID,stockdate,addedby,addedDate) output inserted.tcode values(@locId,@formattedDate,@addedBy,cast(getDate() as smalldatetime))`;

      const result1 = await pool
        .request()
        .input("locId", locId)
        .input("formattedDate", formattedDate)
        .input("addedBy", addedBy)
        .query(insertQueryForCurrentStock1);
      currentStockCode = result1?.recordset[0]?.tcode;

      //  console.log(filteredData)
      if(filteredData.length){

      const values1 = filteredData.map((item) => {
         const rawPartId = item["partId"];
  const safePartId = rawPartId && !isNaN(rawPartId) ? parseInt(rawPartId, 10) : 0;
        return [
          BigInt(currentStockCode),
          String(item["part_number"]),
          parseFloat(item["qty"]),
         safePartId
        ];
      });
      //  console.log("values ",values1);
      try {
        await pool.request();
        await pool.request().query("use [z_scope]");
        const table1 = new sql.Table("currentStock2"); // Updated table name
        table1.create = false;

        table1.columns.add("StockCode", sql.BigInt, { nullable: false });
        table1.columns.add("PartNumber", sql.VarChar(35), { nullable: false });
        table1.columns.add("Qty", sql.Decimal(18, 2), { nullable: false });
        table1.columns.add("PartID", sql.Int, { nullable: true });
        // Add rows to the table
        values1.forEach((row) => {
          table1.rows.add(
            row[0],
            row[1], // brandid
            row[2],
            row[3]
          );
        });
        await pool.request().bulk(table1);
      } catch (error) {
        console.error("Error during bulk insert in single upload: ", error);
        //return { error: error }; // Rethrow the error for further handling if necessary
      }
    }
      
      let currentCountQuery = `use [z_scope] select sum(qty) as currentQuantSum from currentStock2 where stockCode=@currentStockCode`;
      let result678 = await pool
        .request()
        .input("currentStockCode", currentStockCode)
        .query(currentCountQuery);
      //  console.log("currentQuant ",currentQuantSum)
      if (result678?.recordset?.length != 0) {
        currentQuantSum = result678?.recordset[0]?.currentQuantSum;
      }
      //  console.log("currentquant ",currentQuantSum)
    
     let updateWorkshopMasterQuery=`use [z_scope] update dealer_workshop_master set LATESTSTOCKDATE =CAST(getdate() as smalldatetime) 
     where dealerid=@dealerId and bigid=@locationId`;
    
        await pool.request().input('dealerId',dealerId).input('locationId',locId).query(updateWorkshopMasterQuery)
  
  }
   else{
operation='Bulk Upload for Older Days';
    if(filteredData.length>0){

      let olderdaysResult= await upsertSPMTable(dealerId,formattedDate,filteredData,brandId,locId,addedBy)
 prevCountRecords=olderdaysResult?.prevCountRecords;
 quantitySumPrev=olderdaysResult?.prevQtySum;
 currentQuantSum=olderdaysResult?.currentSumQty;
    
      // await updateMaxCountDaysStockZero(dealerId,previousStockDate,formattedDate,locId)
    }
   }

      let logQuery = `use [z_scope] insert into Stock_Upload_Logs(Stockcode,location_id,dealer_id,added_by,brand_id, StockUploadCount,operation_type,quantitySum,
     prevStockUploadCount,prevQuantitySum,stockDate) values(@currentStockCode,@locId,@dealerId,@addedBy,@brandId,@rowCount,@operation,@currentQuantSum,@countPrevRecords,@quantitySumPrev,@stockDate)`;
      await pool
        .request()
        .input("currentStockCode", currentStockCode)
        .input("locId", locId)
        .input("addedBy", addedBy)
        .input('operation',operation)
        .input("currentQuantSum", currentQuantSum)
        .input("brandId", brandId)
        .input("dealerId", dealerId)
        .input("rowCount", filteredData?.length)
        .input("quantitySumPrev", quantitySumPrev)
        .input("countPrevRecords", prevCountRecords)
        .input('stockDate',formattedDate)
        .query(logQuery);

      combinedLogsLocationWise.push({
        currentSumQuantity: currentQuantSum||0,
        prevSumQuantity: quantitySumPrev ||0,
        currentRecords: filteredData?.length||0,
        prevRecords: prevCountRecords ||0,
         allPartsNotInMaster:notInMasterFalseItems.length==0?0:-1,
         locationId:locId,
          inventoryLocationNotExist:[...inventoryLocationNotExist]
      });

    
    }

    if (partNotInMasterArray.length != 0) {
      //  console.log("part not in master ",partNotInMasterArray)

      const deletePartMasterQuery = `
  USE [z_scope]; 
  DELETE FROM part_not_in_master WHERE brand_id = @brandId
`;
// Prepare both requests
const deleteRequest = pool.request().input("brandId", brandId).query(deletePartMasterQuery);

      const values = partNotInMasterArray.map((item) => {
        return [
          parseInt(brandId, 10), // Ensure brandId is an integer
          item["partnumber"],
        ];
      });
      try {
        await pool.request().query("use [z_scope]");
        const table = new sql.Table("part_not_in_master"); // Updated table name
        table.create = false;

        table.columns.add("brand_id", sql.Int, { nullable: true });
        table.columns.add("partnumber", sql.VarChar(100), { nullable: true });
        // Add rows to the table
        values.forEach((row) => {
          table.rows.add(
            row[0],
            row[1] // brandid
          );
        });
        await pool.request().bulk(table);
      } catch (error) {
        console.error("Error during bulk insert: part not in master", error);
        return error; // Rethrow the error for further handling if necessary
      }
    }
  
    return combinedLogsLocationWise;
  } catch (error) {
    console.log(
      "error in bulk stock upload method in by user service ",
      error.message
    );
    return { error: error };
  }
};

const getBulkRecordsInService = async (req, res) => {
  try {
    const pool = await getPool();
    let dealerId = parseInt(req.dealer_id, 10);
   // let userId = req.added_by;
   
    let getQuery = ` use [z_scope]
  SELECT added_on, added_by, stockUploadCount, location_id,quantitySum, prevQuantitySum, prevStockUploadCount ,operation_type,cast(stockDate as date) as stockDate
  FROM stock_upload_logs
  WHERE dealer_id =@dealerId order by added_on desc
`;

    const request = await pool.request();

    // Bind each locationId separately
    // locationIds.forEach((id, index) => { 
    //   request.input(`loc${index}`, id);
    // });
    request.input("dealerId", dealerId);
    // request.input("userId", userId);

    const result = await request.query(getQuery);
    //console.log("result.recordset ",result.recordset)
    return result.recordset;
  } catch (error) {
    console.log(
      "error in stock upload service in getAll records bulk loc",
      error.message
    );
    return { error: error };
  }
};

const getBulkDataInService = async (req, res) => {
  try {
    const archive = new yazl.ZipFile();
    const pool = await getPool();
    let dealerId = req.dealer_id;
    let userId = req.added_by;
    let brand;
     let date=req?.date;
     let date1;
     let  formattedDate
     if(date){
date1 = new Date(date);
 formattedDate = date1.toLocaleDateString('en-CA');
     }
    
   const today = new Date();
  const formattedToday = today.toLocaleDateString('en-CA');
  let getDataQuery='';
  let getLocationQuery = `use [z_scope] Select locationId,dealer,brand,brandId from locationInfo where status=1 and dealerId=@dealerId`;
    const result13 = await pool
      .request()
      .input("dealerId", dealerId)
      .query(getLocationQuery);
    const locations = result13.recordset;
  //  console.log("result ",result13.recordset)
    let dealerName = result13.recordset[0].dealer;
    brand=result13.recordset[0].brand;
    let brandId=result13.recordset[0]?.brandId;
    let bulkUploadedData = [];
    let tcode;
    let locationIds = locations.map((row) => row.locationId); // Extract locationIds from locations

    if (locationIds.length === 0) {
      return []; // Return an empty array if no locationIds are provided
    }
  if(formattedDate==formattedToday ||formattedDate==undefined){
// console.log("locationIds ",locationIds)
    for (let i = 0; i < locationIds.length; i++) {
      let locationId = parseInt(locationIds[i],10);
    //  console.log("locationId ",locationId)
      let getTcodeQuery = `use [z_scope] Select tcode from currentStock1 where locationId=@locationId`;
      const res = await pool
        .request()
        .input("locationId", locationId)
        .query(getTcodeQuery);
      tcode = res.recordset[0]?.tcode;

     //  console.log("tcode in bulk data service ", tcode);
      if (tcode != undefined || tcode != null) {
        try {
           
            getDataQuery=`use [z_scope] select c1.stockDate, c.partNumber, c.qty as Quantity, vw.partDesc,vw.PartType,vw.LandedCost as rate,vw.mrp,vw.moq,
vw.partNature,
case when vw.partNo=s.partnumber then s.subpartnumber else vw.partNo end as LatestPartNumber from [z_scope].dbo.currentStock2 c 
join [z_scope].dbo.currentStock1 c1 on c1.tcode=c.StockCode and c1.LocationID=@locationId
left join  [z_scope].dbo.VW_PartMaster vw on c.PartNumber=vw.partNo and vw.BrandID=@brandId
left join  [z_scope].dbo.Substitution_Master s on s.brandid=vw.BrandID and vw.PartNo=s.partnumber `;
const res78 = await pool
            .request()
            .input("tcode", tcode)
            .input('locationId',locationId)
            .input('brandId',brandId)
            .query(getDataQuery);
            let locationName='';

            let getLocationQuery=`use [z_scope] select location from locationinfo where locationid=@locationId `;
            let result1=await pool.request().input('locationId',locationId).query(getLocationQuery)
            locationName=result1.recordset[0]?.location;
            const recordsWithLocation = res78.recordset.map(record => ({
              Brand:brand,
              Dealer:dealerName,
              Location: locationName,
               ['Part Number']: record.partNumber , 
               ['Latest Part Number']:record.LatestPartNumber,
               Description:record.partDesc,
               Category:record.PartType,
               Rate:record.rate,
               MRP:record.mrp,
               MOQ:record.moq,
               ['Part Nature']:record.partNature,
                Stock:record.Quantity,
                  Date:(record.stockDate)
             
            }));
          
            bulkUploadedData.push(...recordsWithLocation);
          // bulkUploadedData.push(...res78.recordset);
         //  console.log(bulkUploadedData)
        } catch (error) {
          console.log(
            "error in get bulk data in service inside ",
            error.message
          );
        }
      } 
      
    }
  }else{

      for (let i = 0; i < locationIds.length; i++) {
      let locationId = parseInt(locationIds[i],10);

       let locationName='';

            let getLocationQuery2=`use [z_scope] select location from locationinfo where locationid=@locationId `;
            let result12=await pool.request().input('locationId',locationId).query(getLocationQuery2)
            locationName=result12.recordset[0]?.location;
      getDataQuery=`select c1.stockDate,c1.partnumber as partNumber, c1.qty as Quantity, vw.partDesc,vw.PartType,vw.LandedCost as rate,vw.mrp,vw.moq,
vw.partNature,
case when vw.partNo=s.partnumber then s.subpartnumber else vw.partNo end as LatestPartNumber from 
 [z_scope].dbo.stock_upload_spm_td001_${dealerId} c1 
left join  [z_scope].dbo.VW_PartMaster vw on c1.PartNumber=vw.partNo and vw.BrandID=@brandId
left join  [z_scope].dbo.Substitution_Master s on s.brandid=vw.BrandID and vw.PartNo=s.partnumber where  c1.stockDate=cast(@stockDate as date) and c1.LocationID=@locationId
 `;
const res78 = await pool
            .request()
            .input("stockDate",formattedDate)
            .input('locationId',locationId)
            .input('brandId',brandId)
            .input('dealerId',dealerId)
            .query(getDataQuery);

             let getLocationQuery=`use [z_scope] select location from locationinfo where locationid=@locationId `;
            let result1=await pool.request().input('locationId',locationId).query(getLocationQuery)
            locationName=result1.recordset[0]?.location;
            const recordsWithLocation = res78.recordset.map(record => ({
              Brand:brand,
              Dealer:dealerName,
              Location: locationName,
               ['Part Number']: record.partNumber , 
               ['Latest Part Number']:record.LatestPartNumber,
               Description:record.partDesc,
               Category:record.PartType,
               Rate:record.rate,
               MRP:record.mrp,
               MOQ:record.moq,
               ['Part Nature']:record.partNature,
                Stock:record.Quantity,
                  Date:(record.stockDate)
             
            }));
          
            bulkUploadedData.push(...recordsWithLocation);
  }
}
    

   

    // Create an Excel file for the location
    if (bulkUploadedData.length > 0) {
      const ws = xlsx.utils.json_to_sheet(bulkUploadedData);
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, "Bulk Data");

      // Write the Excel file to a temporary buffer (in-memory)
      const tempBuffer = xlsx.write(wb, { bookType: "xlsx", type: "buffer" });

      // Add the buffer directly to the ZIP file
      archive.addBuffer(tempBuffer, `Uploaded Data ${dealerName}.xlsx`);
    }

  //  console.log("bulk data ",bulkUploadedData)
    const zipBuffer = await new Promise((resolve, reject) => {
      const chunks = [];
      archive.outputStream.on("data", (chunk) => chunks.push(chunk));
      archive.outputStream.on("end", () => resolve(Buffer.concat(chunks)));
      archive.outputStream.on("error", reject);
      archive.end();
    });

    // Return the zipBuffer to be sent in the controller
    return zipBuffer;

    // console.log("bulk uploaded data ", bulkUploadedData);
    // return bulkUploadedData;
  
}catch (error) {
    console.log("error in get bulk data in service ", error.message);
    return error;
  }
};

export {
  singleUploadStockInService,
  getPartNotInMasterSingleUploadInService,
  uploadStock,
  getAllRecords,
  uploadBulkStock,
  getBulkDataInService,
  getBulkRecordsInService,
};
