import { getPool1, getPool2 } from "../../db/db.js"
import {
  readExcelFile,
  readExcelFileWithSubColumns,
  readExcelFileWithSubColumnsForBulk,
} from "../utilities/utilities.service.js";
import sql from "mssql";
import yazl from 'yazl';
import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';

const stockUploadSingleLocation = async (req, res) => {
  const pool = await getPool2();
  const { location_id: locationId, user_id: addedBy } = req.body;

  // 1. Fetch dealer and brandId
  const { recordset: [locationInfo] } = await pool.request()
    .input("locationId", locationId)
    .query(`USE [z_scope]; SELECT dealerId, brandId FROM locationInfo WHERE locationId = @locationId`);

  const { brandId, dealerId } = locationInfo;

  // 2. Fetch Excel column mapping for the brand
  const { recordset: mapping } = await pool.request()
    .input("brandId", brandId)
    .query(`USE [z_scope]; SELECT part_number, stock_qty, loc,calculativeField, stock_type FROM stock_upload_mapping WHERE brand_id=@brandId AND stock_type='current'`);

   // console.log("mapping ",mapping)
  if (!mapping.length) return { mappingNotPresent: true };
  const mappedData = mapping[0];

  // 3. Read Excel data
  const fileData = [11, 33].includes(brandId)
    ? await readExcelFileWithSubColumns(req.file.path)
    : await readExcelFile(req.file.path);
 if(!fileData.headers){
        return {isEmptyFile:true}
      }
  const headers = fileData.headers.map(h => h.trim().toLowerCase());
  const rowDataArray = fileData.data.slice([11, 33].includes(brandId) ? 1 : 0);

   const requiredBrandIds = [17, 28];
  //console.log("headers ",headers)
  
  const normalizedHeaders = headers.map(header => header.trim().toLowerCase());
 // console.log("mapped datda ",mappedData)
  const isValid = Object.entries(mappedData)
      .filter(([key]) => key != 'stock_type' && key != 'loc' && key!='calculativeField' && key!='stock_qty') // Exclude stock_type and loc
      .every(([, value]) => normalizedHeaders.includes(value.trim().toLowerCase())); // Check if all values exist in headers
 // console.log("mapped data ",mappedData,headers,isValid)
  // If brandId is 17, 28, check for "availability" and "status" in headers
  if (requiredBrandIds.includes(brandId)) {
      const requiredFields = ["availability", "status"];
      const hasRequiredFields = requiredFields.every(field => normalizedHeaders.includes(field));
  
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
  
  //console.log("missing fields ",missingFields)
  // Step 4: If missing, throw clear error
  if (missingFields.length > 0) {
   return {headerNotPresent:true,missingFields:missingFields}
  }

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
        //  console.log("Evaluating:", formulaWithValues);
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

  // 6. Filter data by brand-specific rules
  // const filteredData = normalizedData.filter(row => {
  //   const hasPart = !!row.part_number;
  //   const hasQty = row.qty > 0;
  //   const avail = row.availability.toLowerCase();
  //   const status = row.status.toLowerCase();

  //   if ([17, 28].includes(brandId)) return hasPart && hasQty && avail === "on hand" && status === "good";
  //   if (brandId === 22) return hasPart && hasQty && avail === "on hand";
  //   return hasPart && hasQty;
  // });
  let filteredData = normalizedData.filter((row) => {
    const stockQty = parseFloat(row.qty);
    const hasPartNumber = row.part_number && row.part_number.trim() !== "";
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
    .query(`USE [z_scope]; SELECT partNo as partnumber1, partID FROM VW_PartMaster WHERE brandId = @brandId`);
  const partMap = new Map(partMaster.recordset.map(p => [p.partnumber1.toLowerCase(), p.partID]));

  // 8. Get previous unrecognized parts
  let existingUnmatchedParts = [];
  let resultNotExist=
    (await pool.request()
      .input("brandId", brandId)
      .query(`USE [z_scope]; SELECT partnumber FROM part_not_in_master WHERE brand_id = @brandId`)
    )
    existingUnmatchedParts=resultNotExist.recordset;


  // 9. Map partIds and identify unknowns
  const knownParts = [];
  const unknownParts = [];

  // for (const item of filteredData) {
  //   const id = partMap.get(item.part_number.toLowerCase());
  //   if (id) {
  //     knownParts.push({ ...item, partId: id });
  //   } else if (!existingUnmatchedParts.has(item.part_number)) {
  //     unknownParts.push({ partnumber: item.part_number });
  //   }
  // }
 // console.log("filter data ",filteredData)

// !unknownParts.some(p => p.partnumber.toLowerCase() == partNumber)
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

// const allPartsNotInMaster = 
//   filteredData.every(item => item.isPartNotInMaster == true)
 const notInMasterFalseItems = filteredData.filter(item => item.isPartNotInMaster == false);


  // 10. Merge duplicates by part_number
  const merged = new Map();
  for (const item of knownParts) {

    const key = item.part_number;
   // console.log("key ",key,item)
    if (!merged.has(key)) {
      merged.set(key, { ...item });
    } else {
      merged.get(key).qty += item.qty;
    }
  }
  //  console.log("known parts ",typeof knownParts)
  const deduped = Array.from(merged.values());
  //console.log("depued ",deduped)
  // 11. Check for previous stock for location
  const prevStock = await pool.request()
    .input("locationId", locationId)
    .query(`USE [z_scope]; SELECT tcode FROM currentStock1 WHERE locationId=@locationId`);
  let oldTcode ;

  let prevQtySum = 0;
  let prevRecordCount = 0;
  // console.log("old tcode ",oldTcode)
  for(let i=0;i<prevStock.recordset?.length;i++){
      oldTcode = prevStock.recordset[i]?.tcode ||0;
  
    //console.log("excuted1")
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
  //console.log("date ",locationId,addedBy)
  const now = new Date().toISOString().split("T")[0];
  const { recordset: [insertedStock] } = await pool.request()
    .input("locationID", locationId)
    .input("formattedDate", now)
    .input("addedBy", addedBy)
    .query(`USE [z_scope]; INSERT INTO currentStock1(locationID, stockdate, addedby,AddedDate) OUTPUT inserted.tcode VALUES(@locationID, @formattedDate, @addedBy,CAST(getdate() as smalldatetime))`);

  const newTcode = insertedStock.tcode;

 //console.log("unknown paerts ",newTcode)
  // 13. Bulk insert unknown parts
  // if(!existingUnmatchedParts &&existingUnmatchedParts.length!=0 && unknownParts.length==0){
  //  // console.log("exsited ",unknownParts.length,existingUnmatchedParts.length)
  //    const table = new sql.Table("part_not_in_master");
  //   table.columns.add("brand_id", sql.Int);
  //   table.columns.add("partnumber", sql.VarChar(100));
  //   existingUnmatchedParts.forEach(p => table.rows.add(brandId, p));
  //   await pool.request().bulk(table);
  // }
  // else
  existingUnmatchedParts=Array.from(existingUnmatchedParts)
  //console.log("exsited2 ",existingUnmatchedParts,existingUnmatchedParts.length)
  if (existingUnmatchedParts.length) {
      // Clear old unmatched records
  await pool.request().input("brandId", brandId).query(`USE [z_scope]; DELETE FROM part_not_in_master WHERE brand_id = @brandId`);
    const table = new sql.Table("part_not_in_master");
    table.columns.add("brand_id", sql.Int);
    table.columns.add("partnumber", sql.VarChar(100));
    existingUnmatchedParts.forEach(p => table.rows.add(brandId, p.partnumber));
    await pool.request().bulk(table);
  }
  
 //console.log("unknown paerts-- ",deduped)
  // 14. Bulk insert to currentStock2
  if(deduped.length){

   const validTcode = Number(newTcode); 
   try{
 const stockTable = new sql.Table("currentStock2");
  
  stockTable.columns.add("StockCode",sql.BigInt,{nullable: false});
  stockTable.columns.add("PartNumber", sql.VarChar(35),{nullable: false});
  stockTable.columns.add("Qty", sql.Decimal(18, 2),{nullable: false});
  stockTable.columns.add("FreeStockQty", sql.Decimal(9, 2),{nullable: true});  // DECIMAL(9, 2) for FreeStockQty
  stockTable.columns.add("PartID", sql.Int,{nullable: true});
 

  deduped.forEach((row,i) => {
 try {
    const validQty = parseFloat(row.qty);
    const validFreeStockQty = row.FreeStockQty ? parseFloat(row.FreeStockQty) : 0.0;
    const validPartID = row.partId && !isNaN(row.partId) ? parseInt(row.partId) : 0;
    const partNumber = (row.part_number || '').toString().substring(0, 35); // enforce string and length
 // console.log("partNumber ",partNumber,typeof partNumber)
    stockTable.rows.add(
      BigInt(newTcode),  // or `newTcode` if you're using that
      String(partNumber),
      parseFloat(validQty),
      parseFloat(validFreeStockQty),
      parseInt(validPartID)
    );
  } catch (e) {
    console.error(`🚨 Failed on row ${i}:`, row,e);
   // console.error("❌ Error while adding row:", e);
  }
  // stockTable.rows.add(BigInt(newTcode), String(row.part_number), validQty, validFreeStockQty, validPartID);
  });
  await pool.request().bulk(stockTable);
   }
  
   catch(err){
    console.log("error in ",err);
    return {error:err };
   }
  

 
  }
  // 15. Log the upload
  const totalQty = (await pool.request()
    .input("StockCode", newTcode)
    .query(`USE [z_scope]; SELECT SUM(qty) AS currentQuantSum FROM currentStock2 WHERE stockCode = @StockCode`)
  ).recordset[0].currentQuantSum;

   let updateWorkshopMasterQuery=`use [z_scope] update dealer_workshop_master set LATESTSTOCKDATE =CAST(getdate() as smalldatetime) where dealerid=@dealerId and bigid=@locationId`;

    await pool.request().input('dealerId',dealerId).input('locationId',locationId).query(updateWorkshopMasterQuery)


//console.log("-----",totalQty)
  await pool.request()
    .input("locationId", locationId)
    .input("StockCode", newTcode)
    .input("addedBy", addedBy)
    .input("brandId", brandId)
    .input("rowCount", deduped.length)
    .input("currentQuantSum", totalQty)
    .input("countPrevRecords", prevRecordCount)
    .input("quantitySumPrev", prevQtySum)
    .query(`USE [z_scope]; INSERT INTO Stock_Upload_Logs(location_id, stockCode, added_by, brand_id, StockUploadCount, operation_type, quantitySum, prevStockUploadCount, prevQuantitySum)
            VALUES(@locationId, @StockCode, @addedBy, @brandId, @rowCount, 'single-location upload stock', @currentQuantSum, @countPrevRecords, @quantitySumPrev)`);

            //console.log("oldtc code ",oldTcode)
 

  return {
    currentSumQuantity: totalQty,
    prevSumQuantity: prevQtySum,
    currentRecords: deduped.length,
    prevRecords: prevRecordCount,
    allPartsNotInMaster:notInMasterFalseItems.length==0?0:-1
  };
};

const getPartNotInMasterSingleLocationInService = async (req, res) => {
  try {
    const pool = await getPool2();
 
    let locationId = req.location_id;
   
    let getBrandQuery = `use [z_scope] Select brandId from locationInfo where locationId=@locationId`;
    const result = await pool
      .request()
      .input("locationId", locationId)
      .query(getBrandQuery);
    //  console.log("brandid",result.recordset,locationId,req);
    let brandId = result.recordset[0].brandId;

    let getQuery = `use [z_scope] Select partnumber from part_not_in_master where brand_id=@brandId`;
    const result1 = await pool
      .request()
      .input("brandId", brandId)
      .query(getQuery);
    // console.log(result1.recordset)
    return result1.recordset;
  } catch (error) {
    console.log("error in service ", error.message);
    return {error:error};
  }
};

const getAllRecordsSingleLocation = async (req, res) => {
  try {
    const pool = await getPool2();
    let locationId = req.location_id;
   // let userId=req.added_by;
    let getQuery = `use [z_scope] select added_on,added_by,stockUploadCount,quantitySum,prevQuantitySum,prevStockUploadCount from stock_upload_logs
     where location_id=@locationId order by added_on desc`;

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
    return {error:error};
  }
};


const getUploadedDataSingleLocationInService = async (req, res) => {
  try {
    const pool = await getPool2();
    let locationId = req.location_id;
    let brand,dealer;
    let location;
    let date=req?.date;
    let userType=req?.userType;
    // let getQuery = `use [z_scope] select ck2.partnumber,ck2.qty from currentStock2 ck2 join 
    //     currentStock1 ck1 on ck1.tcode=ck2.StockCode where locationId=@locationId`;
let getNameQuery=`use [z_scope] SELECT location,brand,dealer,dealerId,brandId FROM locationInfo WHERE locationId = @locationId`;
    const result1=await pool.request().input('locationId',locationId).query(getNameQuery);
    brand=result1.recordset[0].brand;
    dealer=result1.recordset[0].dealer;
    location=result1.recordset[0].location;
    let brandId=result1.recordset[0].brandId
    let dealerId=result1.recordset[0].dealerId
   let result;
// if partno belongs in part master and substituionmaster then take subpartnumber
//  else partno of partmaster is considered as latest part number
 const date1 = new Date(date);
  const formattedDate = date1.toLocaleDateString('en-CA');
   const today = new Date();
  const formattedToday = today.toLocaleDateString('en-CA');
   if(userType=='admin'){

    if(formattedDate==formattedToday){
       let getQuery=`use [z_scope] select c1.stockDate, c.partNumber, c.qty as Quantity, vw.partDesc,vw.PartType,vw.LandedCost,vw.mrp,vw.moq,
vw.partNature,
case when vw.partNo=s.partnumber then s.subpartnumber else vw.partNo end as LatestPartNumber from [z_scope].dbo.currentStock2 c 
join [z_scope].dbo.currentStock1 c1 on c1.tcode=c.StockCode and c1.LocationID=@locationId
left join  [z_scope].dbo.VW_PartMaster vw on c.PartNumber=vw.partNo and vw.BrandID=@brandId
left join  [z_scope].dbo.Substitution_Master s on s.brandid=vw.BrandID and vw.PartNo=s.partnumber `;
  result = await pool
      .request()
      .input("locationId", locationId)
      .input("brandId", brandId)
      .query(getQuery);
    }
    else{
     let  getQuery=`select c1.stockDate,c1.partnumber as partNumber, c1.qty as Quantity, vw.partDesc,vw.PartType,vw.LandedCost as rate,vw.mrp,vw.moq,
vw.partNature,
case when vw.partNo=s.partnumber then s.subpartnumber else vw.partNo end as LatestPartNumber from 
 [z_scope].dbo.stock_upload_spm_td001_${dealerId} c1 
left join  [z_scope].dbo.VW_PartMaster vw on c1.PartNumber=vw.partNo and vw.BrandID=@brandId
left join  [z_scope].dbo.Substitution_Master s on s.brandid=vw.BrandID and vw.PartNo=s.partnumber where  c1.stockDate=cast(@stockDate as date) and c1.LocationID=@locationId
 `;
 result = await pool
            .request()
            .input("stockDate",formattedDate)
            .input('locationId',locationId)
            .input('brandId',brandId)
            .input('dealerId',dealerId)
            .query(getQuery);
    }
   }else{

    let getQuery=`use [z_scope] select c1.stockDate, c.partNumber, c.qty as Quantity, vw.partDesc,vw.PartType,vw.LandedCost,vw.mrp,vw.moq,
vw.partNature,
case when vw.partNo=s.partnumber then s.subpartnumber else vw.partNo end as LatestPartNumber from [z_scope].dbo.currentStock2 c 
join [z_scope].dbo.currentStock1 c1 on c1.tcode=c.StockCode and c1.LocationID=@locationId
left join  [z_scope].dbo.VW_PartMaster vw on c.PartNumber=vw.partNo and vw.BrandID=@brandId
left join  [z_scope].dbo.Substitution_Master s on s.brandid=vw.BrandID and vw.PartNo=s.partnumber `;
  result = await pool
      .request()
      .input("locationId", locationId)
      .input("brandId", brandId)
      .query(getQuery);
   }
      const enrichedData = result.recordset.map(record => ({
  ...record,
  brand,
  dealer,
  location
}));

return enrichedData
  
  } catch (error) {
    console.log(
      "error in  stock upload service get upload data single location",
      error.message
    );
    return {error:error};
  }
};


const stockUploadMultiLocation = async (req, res) => {
  // console.log("req ",req.body.location_id,req.files);
  const errorLogs=[];
  let logs=[];
  try {
    let location=(req.body.location_id)
    let locations = (req.body.location_id);
    let quantitySumPrev = 0;
    // console.log(typeof location)
    if(typeof location=='string'){
        locations=[location];
    }
      //console.log("location ",locations)

    let dealerId = parseInt(req.body.dealer_id);
    let files = req.files;
    // console.log(files,files[0].path)
    const pool=await getPool2();
    let addedBy = parseInt(req.body.user_id);

    // let brandQuery = `use [z_scope] select brandId,brand from locationInfo where dealerID=@dealerId`;
    // let brandRes = await pool
    //   .request()
    //   .input("dealerId", dealerId)
    //   .query(brandQuery);
    // let brandId = parseInt(brandRes.recordset[0].brandId,10);
    // //  console.log("brandid in stock upload multi location ",brandId)
    // let getMappingQuery = `use [z_scope] select part_number,stock_qty,loc,stock_type from stock_upload_mapping where brand_id=@brandId and stock_type='current'`;

    // const mappingResult = await pool
    //   .request()
    //   .input("brandId", brandId)
    //   .query(getMappingQuery);

    // if (mappingResult.recordset.length == 0) {
    //   return { mappingNotPresent: true };       
    // }
    
    // console.log("mapped data in stock upload multi location ",mappedData);
    // let partMasterQuery = `use [z_scope] select partnumber1 ,partID from part_master where brandId=@brandId`;

    // const result = await pool
    //   .request()
    //   .input("brandId", brandId)
    //   .query(partMasterQuery);
    // let partMasterResult = result.recordset;
    // // console.log(" part master result in stock upload multi location ",partMasterResult)
    // let partNotInMasterArray = [];
    // const getPartNumberQuery = `use [z_scope] select partnumber as partnumber from part_not_in_master where brand_id=@brandId`;
    // let res123 = await pool
    //   .request()
    //   .input("brandId", brandId)
    //   .query(getPartNumberQuery);
    // partNotInMasterArray = res123.recordset;
//    console.log("part not in master in stock upload multi loc ",partNotInMasterArray)

// Get brandId first
const brandQuery = `
  USE [z_scope] 
  SELECT brandId, brand 
  FROM locationInfo 
  WHERE dealerID = @dealerId
`;

const brandRes = await pool
  .request()
  .input("dealerId", dealerId)
  .query(brandQuery);

const brandId = parseInt(brandRes.recordset[0].brandId, 10);

// Define queries
const getMappingQuery = `
  USE [z_scope] 
  SELECT part_number, stock_qty, loc, stock_type ,calculativeField
  FROM stock_upload_mapping 
  WHERE brand_id = @brandId AND stock_type = 'current'
`;

const partMasterQuery = `
  USE [z_scope] 
  SELECT partNo as partnumber1, partID 
  FROM VW_PartMaster 
  WHERE brandId = @brandId
`;

const getPartNumberQuery = `
  USE [z_scope] 
  SELECT partnumber AS partnumber 
  FROM part_not_in_master 
  WHERE brand_id = @brandId
`;

// Run remaining queries in parallel
const [
  mappingResult,
  partMasterRecords,
  partNotInMasterResult
] = await Promise.all([
  pool.request().input("brandId", brandId).query(getMappingQuery),
  pool.request().input("brandId", brandId).query(partMasterQuery),
  pool.request().input("brandId", brandId).query(getPartNumberQuery)
]);

// Handle mappingResult
if (mappingResult.recordset.length === 0) {
  return { mappingNotPresent: true };
}

let partMasterResult = []=partMasterRecords.recordset;
let partNotInMasterArray =[]= partNotInMasterResult.recordset;
let partNotInMasterSet=new Set()
let partMasterMap=new Map();
    
   
    for (let i = 0; i < locations.length; i++) {
       //  console.log("exexuted ")
      let locationId = locations[i];
      let updatedFilteredRowData = [];
      let rowData;
      let fileData;
      let headers;
      let rowDataArray=[];
      if (brandId == 11 || brandId == 33) {
        fileData = await readExcelFileWithSubColumns(files[i].path);
        // rowData=fileData.data.splice(2);
        rowDataArray = fileData.data.splice(1);
      } else {
        fileData = await readExcelFile(files[i].path);
        // rowData=fileData.data.splice(1);
        rowDataArray = fileData.data;
      }
      headers = fileData.headers;
      // console.log("rowdata ",headers);
      let mappedData = mappingResult.recordset[0];
     
      const requiredBrandIds = [17, 28];
  //  console.log("headers ",headers,fileData.headers)
      if(!headers){
        return {isEmptyFile:true}
      }
      const normalizedHeaders = headers.map(header => header.trim().toLowerCase());
      const isValid = Object.entries(mappedData)
          .filter(([key]) => key != 'stock_type' && key != 'loc' && key!='calculativeField' && key!='stock_qty') // Exclude stock_type and loc
          .every(([, value]) => normalizedHeaders.includes(value.trim().toLowerCase())); // Check if all values exist in headers
     // console.log("mapped data ",mappedData)
      // If brandId is 17, 28, check for "availability" and "status" in headers
      if (requiredBrandIds.includes(brandId)) {
          const requiredFields = ["availability","status"];
          const hasRequiredFields = requiredFields.every(field => normalizedHeaders.includes(field));
       // console.log("has required fields ",requiredFields)
          if (!hasRequiredFields) {
            //  return { headerNotPresent: true };
            errorLogs.push({
              locationId:locationId,
              status:true,
              log:'Required Headers are not present in the uploaded file!.'
             })
             continue;
            
          }
      }
      if ([22].includes(brandId)) {
        const requiredFields = ["availability"];
        const hasRequiredFields = requiredFields.every(field => normalizedHeaders.includes(field));
        
        if (!hasRequiredFields) {
           // return { headerNotPresent: true };
           errorLogs.push({
            locationId:locationId,
            status:true,
            log:'Required Headers are not present in the uploaded file!'
           })
           continue;
        }
      }
      
      
      // Return false if general validation fails
      if (!isValid) {
        //  return { headerNotPresent: true };
        errorLogs.push({
          locationId:locationId,
          status:true,
          log:'Required Headers are not present in the uploaded file!'
         })
        continue;
      }
    
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
          //  console.log("Evaluating:", formulaWithValues);
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

 //   console.log("normalized data ",normalizedData)
 
  let query12=`use [z_scope] Select tcode from currentStock1 where locationId=@locationId`;
  let res45=await pool.request().input('locationId',locationId).query(query12);
  let StockCode;
   let countPrevRecords=0;
  let insertedDataResult=[];
  for(let i=0;i<res45?.recordset?.length;i++){
  StockCode=res45?.recordset[i]?.tcode;
 
//console.log("tcode ",StockCode,locationId)
  if(res45.recordset.length>0){

    const combinedQuery = `
    USE [z_scope];
    SELECT 
      SUM(qty) OVER () AS prevQuantSum,
      partNumber,
      partID,
      qty
    FROM currentStock2 
    WHERE StockCode = @StockCode;
  `;

  const result = await pool
    .request()
    .input("StockCode", StockCode)
    .query(combinedQuery);

   insertedDataResult = result.recordset;
   quantitySumPrev = insertedDataResult.length > 0 ? insertedDataResult[0].prevQuantSum : 0;
   countPrevRecords = insertedDataResult.length;
 //  console.log("prev inserted data ",insertedDataResult)
  await pool.request().input("StockCode", StockCode).query(`USE [z_scope]; DELETE FROM currentStock2 WHERE StockCode=@StockCode`);
    await pool.request().input("StockCode", StockCode).query(`USE [z_scope]; DELETE FROM currentStock1 WHERE tcode=@StockCode`);
          
     
  }
}

    let filteredRowData = normalizedData.filter((row) => {
      const stockQty = parseFloat(row.qty);
      const hasPartNumber = row.part_number && row.part_number.trim() !== "";
      const availability = row["availability"]?.toLowerCase();
      const status = row["status"]?.toLowerCase();
    
      if ((brandId == 17 || brandId == 28)) {
        return hasPartNumber && stockQty > 0 && availability === "on hand" && status === "good";
      }
    
      if (brandId == 22) {
        return hasPartNumber && stockQty > 0 && availability === "on hand";
      }
    
      return hasPartNumber && stockQty > 0;
    });

      // Step 1: Create a lookup Map for partMasterResult
partMasterMap = new Map(
  partMasterResult.map(pm => [pm.partnumber1.trim().toLowerCase(), pm.partID]))

// Step 2: Use a Set for quick lookup of already added part numbers
 partNotInMasterSet = new Set(partNotInMasterArray.map(p => p.partnumber))

for (const item of filteredRowData) {
  const partNumberKey = item.part_number.trim().toLowerCase();

  if (partMasterMap.has(partNumberKey)) {
    item.partId = partMasterMap.get(partNumberKey); // attach partID
    updatedFilteredRowData.push(item);
    item.isPartNotInMaster=false;
  } else {
    if (!partNotInMasterSet.has(item.part_number)) {
   //   partNotInMasterArray.push({ partnumber: item.part_number });
      partNotInMasterSet.add(item.part_number);
       item.isPartNotInMaster=true;
    }
  }
}
//console.log("------",filteredRowData)
// After the loop

 let notInMasterFalseItems = updatedFilteredRowData.length==0?0:-1;
 //console.log("updated filtered data ",updatedFilteredRowData)
partNotInMasterArray = Array.from(partNotInMasterSet).map(partnumber => ({ partnumber }));

    // console.log("partr not in master ",updatedFilteredRowData)
    // console.log("inserted data ",insertedDataResult)

  
    const partCountMap = new Map();
    //    console.log("combined data wiht location id ",locationId,combinedData)
      // First, count the occurrences and accumulate stock_qty for each part_number
    //  console.log("updated filtered data ",updatedFilteredRowData)
      for (const element of updatedFilteredRowData) {
        // Assuming partMasterResult contains part_number and stock_qty
        if (partCountMap.has(element.part_number)) {
        //    console.log("part ",element);
          partCountMap.set(element.part_number, {
            partId: element.partId,
            count: partCountMap.get(element.part_number).count + 1,
            stockQty:
              parseFloat(partCountMap.get(element.part_number).stockQty) +
              parseFloat(element.qty),
          });
        } else {
          partCountMap.set(element.part_number, {
            count: 1,
            stockQty: parseFloat(element.qty),
            partId: element.partId,
          });
        }
      }
        // console.log("part count ",partCountMap)
    //    console.log("updated filtered data ",)
    let updatedFilteredRowData1=[];
      updatedFilteredRowData1 = Array.from(
        partCountMap,
        ([partNumber, { stockQty, partId }]) => ({
          partNumber,
          qty: stockQty,
          partId: partId,
        })
      );


 //  console.log("location id combine data ",locationId,combinedData)
   // Create a map to track the occurrences of part_number and total stock_qty
   let updatedFilteredRowData2=[];
  //  updatedFilteredRowData2 =combinedData;
  updatedFilteredRowData2=updatedFilteredRowData1;
      // console.log("updated ",updatedFilteredRowData2)
      let rowCount = updatedFilteredRowData2?.length;
      let currentDate = new Date();
      const formattedDate = currentDate.toISOString().split("T")[0]; // Outputs: '2025-03-08'
      // console.log(formattedDate);
     
      if(updatedFilteredRowData2.length>0){
      let insertQueryForCurrentStock1 = `use [z_scope] insert into currentStock1(locationID,stockdate,addedby,AddedDate) output inserted.tcode values(@locationID,@formattedDate,@addedBy,CAST(getdate() as smalldatetime))`;

      const result1 = await pool
        .request()
        .input("locationID", locationId)
        .input("formattedDate", formattedDate)
        .input("addedBy", addedBy)
        .query(insertQueryForCurrentStock1);
      let tCode = result1.recordset[0].tcode;
     
      if(updatedFilteredRowData2.length){
        const values1 = updatedFilteredRowData2.map((item) => {
           const rawPartId = item.partId;
      const safePartId = rawPartId && !isNaN(rawPartId) ? parseInt(rawPartId, 10) : 0;
          return [
            BigInt(tCode),
            String(item["partNumber"]),
            parseFloat(item["qty"]),
          safePartId
          ];
        });
        try {
          await pool.request().query('use z_scope')
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
         
        }
        catch (error) {
          console.error("Error during bulk insert:", error);
        //  return {error:error}; // Rethrow the error for further handling if necessary
        errorLogs.push({
          locationId:locationId,
          status:true,
          log:'Error in Uploading File.Please Contact Admin!.'
         })
        continue;
        }
      }
     
      let currentCountQuery = `use [z_scope] select sum(qty) as currentQuantSum from currentStock2 where stockCode=@tCode`;
      let result678 = await pool
        .request()
        .input("tCode", tCode)
        .query(currentCountQuery);
      let currentQuantSum = 0;
      if (result678.recordset.length != 0) {
        currentQuantSum = result678.recordset[0].currentQuantSum;
      }
      let updateWorkshopMasterQuery=`use [z_scope] update dealer_workshop_master set LATESTSTOCKDATE =CAST(getdate() as smalldatetime) where dealerid=@dealerId and bigid=@locationId`;

    await pool.request().input('dealerId',dealerId).input('locationId',locationId).query(updateWorkshopMasterQuery)


      let logQuery = `use [z_scope] insert into Stock_Upload_Logs(location_id,stockCode,added_by,brand_id, StockUploadCount,operation_type,quantitySum,
prevStockUploadCount,prevQuantitySum) values(@locationId,@tCode,@addedBy,@brandId,@rowCount,'multi-location upload stock',@currentQuantSum,@countPrevRecords,@quantitySumPrev)`;
      await pool
        .request()
        .input("tCode", tCode)
        .input("addedBy", addedBy)
        .input("currentQuantSum", currentQuantSum)
        .input("brandId", brandId)
        .input("locationId", locationId)
        .input("rowCount", rowCount)
        .input("quantitySumPrev", quantitySumPrev)
        .input("countPrevRecords", countPrevRecords)
        .query(logQuery);

        
    }

    if(updatedFilteredRowData2.length==0){
      let logQuery = `use [z_scope] insert into Stock_Upload_Logs(location_id,stockCode,added_by,brand_id, StockUploadCount,operation_type,quantitySum,
prevStockUploadCount,prevQuantitySum) values(@locationId,@tCode,@addedBy,@brandId,@rowCount,'multi-location upload stock',@currentQuantSum,@countPrevRecords,@quantitySumPrev)`;
      await pool
        .request()
        .input("tCode", 0)
        .input("addedBy", addedBy)
        .input("currentQuantSum", 0)
        .input("brandId", brandId)
        .input("locationId", locationId)
        .input("rowCount", 0)
        .input("quantitySumPrev", quantitySumPrev)
        .input("countPrevRecords", countPrevRecords)
        .query(logQuery);
    }

    

    errorLogs.push({
 log:notInMasterFalseItems==0?'The file you are uploading contains parts that are not present in the part master. Please recheck the parts or get them updated by the admin.!':'✅ Data uploaded Successfully!',
 locationId:locationId,
  status:false,
    })
    
    
  }
   
    if(partNotInMasterArray.length!=0){
       let deletePartMasterQuery = `use [z_scope] delete from part_not_in_master where brand_id=@brandId`;
    await pool.request().input("brandId", brandId).query(deletePartMasterQuery);

      const values = partNotInMasterArray.map((item) => {
        return [
          parseInt(brandId, 10), // Ensure brandId is an integer
          item["partnumber"],
        ];
      });
      try {
        await pool.request().query('use z_scope')
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
       // return {error:error}; // Rethrow the error for further handling if necessary
       errorLogs.push({
        locationId:locationId,
        status:true,
        log:'Error in uploading file.Please Contact Admin!.'
       })
       
      }
    }


   
  } catch (error) {
    console.log("error ", error.message);
   // return {error:error};
   errorLogs.push({
    locationId:locationId,
    status:true,
    
    log:'Error in Uploading File.Please Contact Admin!.'
   })
  }

  return errorLogs;
};

const getAllRecordsMultiLocation=async (req,res)=>{

    try {
        const pool = await getPool2();
        let locations=req.locations;
        let data=[];
     //   let userId=req.added_by;
        for(let i=0;i<locations.length;i++){
            let locationId =locations[i].location;
            let getQuery = `use [z_scope] select location_id,added_on,added_by,stockUploadCount,quantitySum,prevQuantitySum,prevStockUploadCount
             from stock_upload_logs where location_id=@locationId order by added_on desc`;
    
            let result = await pool
              .request()
              .input("locationId", locationId)
              .query(getQuery);
              // .input("userId", userId)
        
            data.push(result.recordset);
        }
        return data;
      } catch (error) {
        console.log(
          "error in stock upload service in getAll records multi loc",
          error.message
        );
        return {error:error};
      }
}

const getUploadedDataMultiLocationInService = async (req, res) => {
  const pool = await getPool2();
  const locations = req.locations; 
  const archive = new yazl.ZipFile();
  const brandId=req.brand_id;
  const dealerId=req.dealer_id;
  let firstLocationId=locations[0].location
   let brand,dealer;
  try {

    let getNameQuery=`use [z_scope] SELECT location,brand,dealer,brandId FROM locationInfo WHERE locationId = @locationId`;
    const result1=await pool.request().input('locationId',firstLocationId).query(getNameQuery);
    brand=result1.recordset[0].brand;
    dealer=result1.recordset[0].dealer;
    let brandId=result1.recordset[0]?.brandId
      for (let i = 0; i < locations.length; i++) {
          let locationId = locations[i].location;
        //  console.log("locationId ",locationId)
          try {
              const getBrandQuery = `use [z_scope] SELECT location FROM locationInfo WHERE locationId = @locationId`;
              const result = await pool.request().input('locationId', locationId).query(getBrandQuery);
              let locationName = result.recordset[0]?.location; 
              
              // let getQuery = `use [z_scope] select ck2.partnumber,ck2.qty from currentStock2 ck2 join 
              //     currentStock1 ck1 on ck1.tcode=ck2.StockCode where locationId=@locationId`;

                 let getQuery=`use [z_scope] select c1.stockDate, c.partNumber, c.qty as Quantity, vw.partDesc,vw.PartType,vw.LandedCost as rate,vw.mrp,vw.moq,
vw.partNature,
case when vw.partNo=s.partnumber then s.subpartnumber else vw.partNo end as LatestPartNumber from [z_scope].dbo.currentStock2 c 
join [z_scope].dbo.currentStock1 c1 on c1.tcode=c.StockCode and c1.LocationID=@locationId
left join  [z_scope].dbo.VW_PartMaster vw on c.PartNumber=vw.partNo and vw.BrandID=@brandId
left join  [z_scope].dbo.Substitution_Master s on s.brandid=vw.BrandID and vw.PartNo=s.partnumber `;
              
              let result1 = await pool.request().input('locationId', locationId).input('brandId',brandId).query(getQuery);   
          //    console.log("result1 in stock upload service 2184",result1.recordset)
              let locationData = result1.recordset.length > 0 ? result1.recordset.map(record => ({
                 Brand:brand,
                 Dealer:dealer,
                Location: locationName,
                  PartNumber: record.partNumber,
                  ['Latest Part Number']:record.LatestPartNumber,
                  Description:record.partDesc,
                  Category:record.PartType,
                  Rate:record.rate,
                  MRP:record.mrp,
                  MOQ:record.moq,
                  ['Part Nature']:record.partNature,
                  Stock: record.Quantity,
                  Date:record.stockDate

              })) : [];

              if (locationData.length > 0) {
                  const ws = xlsx.utils.json_to_sheet(locationData);
                  const wb = xlsx.utils.book_new();
                  xlsx.utils.book_append_sheet(wb, ws, 'Uploaded Data');
                  const tempBuffer = xlsx.write(wb, { bookType: 'xlsx', type: 'buffer' });

                  // Ensure proper buffer writing
                  archive.addBuffer(tempBuffer, `uploadedData_${locationName}.xlsx`);
              }

          } catch (error) {
              console.error('Error processing location:', locationId, error.message);
              return { error: error.message };
          }
      }

      // **Ensure ZIP writing finishes properly**
      return new Promise((resolve, reject) => {
          const chunks = [];
          archive.outputStream.on('data', chunk => chunks.push(chunk));
          archive.outputStream.on('end', () => resolve(Buffer.concat(chunks)));
          archive.outputStream.on('error', reject);
          archive.end(); // End the ZIP archive after all files are added
      });

  } catch (error) {
      console.error('Error in service multilocation:', error.message);
      return { error: error.message };
  }
};


const getPartNotInMasterMultiLocationInService=async(req,res)=>{

    const pool = await getPool2();
    const locations = req.locations; // Assuming locations are passed in the request bod
  
    const tempDir = path.join(process.cwd(), 'temp');
    
    // Ensure the temp directory exists
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }

    const filePath = path.join(tempDir, 'part_not_in_master.xlsx')
  

          const locationId = locations[0].location;
    
          try {
            // Fetch brandId for the location
            const getBrandQuery = `use [z_scope] SELECT brandId,location,brand FROM locationInfo WHERE locationId = @locationId`;
            const result = await pool
              .request()
              .input('locationId', locationId)
              .query(getBrandQuery);
    
            let brandId = result.recordset[0].brandId;
            let locationName=result.recordset[0].location;
            let brandName=result.recordset[0].brand
    
            // Fetch partnumbers based on brandId
            const getQuery = `use [z_scope] SELECT partnumber FROM part_not_in_master WHERE brand_id = @brandId`;
            const result1 = await pool
              .request()
              .input('brandId', brandId)
              .query(getQuery);
    
            // Prepare data to store in the Excel file
            const locationData = result1.recordset.map(record => ({
              Brand: brandName,
              PartNumber: record.partnumber,
            }));
    
            // Create an Excel file for the location
            // if(locationData.length!=0){
            //   const ws = xlsx.utils.json_to_sheet(locationData);
            //   const wb = xlsx.utils.book_new();
            //   xlsx.utils.book_append_sheet(wb, ws, 'Part Not In Master');
      
            //   // // Write the Excel file to a temporary buffer (in-memory)
            //   xlsx.writeFile(wb, filePath);
            //   return filePath;
            // }else{
            //   return false
            // }
           
            // // Add the buffer directly to the ZIP file
            // archive.addBuffer(tempBuffer, `part_not_in_master_${locationName}.xlsx`);

            return locationData;
          } catch (error) {
            console.error('Error in get part not in master:', error.message);
            return {error:error};
          }
        
    
       
}

const getPartNotInMasterBulkInService=async(req,res)=>{

 try {
    const pool = await getPool2();

    let dealerId = req.dealer_id;
    let brandId=parseInt(req.brand_id,10);
    let getBrandQuery = `use [z_scope] Select brand from locationInfo where brandId=@brandId`;
    const result = await pool
      .request()
      .input("brandId", brandId)
      .query(getBrandQuery);
    let brand= result.recordset[0].brand;
   // console.log("brand id ",result)
    //console.log(brandId);
    let getQuery = `use [z_scope] Select partnumber from part_not_in_master where brand_id=@brandId`;
    const result1 = await pool
      .request()
      .input("brandId", brandId)
      .query(getQuery);
    // console.log(result1.recordset)
    let combinedResult=result1.recordset.map((item)=>({
      Brand:brand,
      ['Part Number']:item.partnumber
    }))
    return combinedResult;
  } catch (error) {
    console.log("error in service ", error.message);
    return {error:error};
  }
}

const uploadBulkData=async(req,res)=>{
   try {
    const pool = await getPool2();
    let addedBy = parseInt(req.body.user_id,10);
    let rowData;
    let brandId = parseInt(req.body.brand_id,10);
  //   brandId=24;
    let dealerId = parseInt(req.body.dealer_id,10);
    let StockCodes;
    let wrongDealerLocationInFile = [];
let notInMasterFalseItems;
    let getLocationsQuery = `use [z_scope] select locationId from locationInfo where dealerId=@dealerId`;
    let res56 = await pool
      .request()
      .input("dealerId", dealerId)
      .query(getLocationsQuery);
    //  console.log("locations ",res56)
    let locations = res56.recordset;
    let isOlderUploadForHyundai=false;
    // console.log("locations ", locations);

    const today = new Date();
    const formattedToday = today.toLocaleDateString('en-CA');
        // const formattedDate = date1.toISOString().split("T")[0]; 
       // console.log("formattedToday ",formattedDate,formattedToday)
    let mappingResult;
      
         // 2. Fetch Excel column mapping for the brand
         let getMappingQuery = `use [z_scope] select part_number,stock_qty,loc,stock_type,calculativeField from stock_upload_mapping where brand_id=@brandId and stock_type='current'`;

          mappingResult = await pool
           .request()
           .input("brandId", brandId)
           .query(getMappingQuery);
   // console.log("mapping result ",mappingResult.recordset)
    if (mappingResult.recordset.length == 0) {
      return { mappingNotPresent: true };
    }
  // console.log("mapping result ", mappingResult);

    let checkDealerLocationMappingQuery = `use [z_scope] select inventory_location,locationID as locationId from dealer_location_mapping where dealerId=@dealerId and status='active'`;
    const resDealerAndLoc = await pool
      .request()
      .input("dealerId", dealerId)
      .query(checkDealerLocationMappingQuery);
   //   console.log("res dealer loca ",resDealerAndLoc.recordset,dealerId)
    if (resDealerAndLoc.recordset.length == 0) {
      return { dealerLocationMappingNotPresent: true };
    }
 //console.log("dealer location mapping ",resDealerAndLoc.recordset)
    let dealerLocationMappedData = resDealerAndLoc.recordset;

    let mappedData = mappingResult.recordset[0];
    let fileData;
    let headers;6
    let rowDataArray;
    let filteredRowData;
    let combinedExistedData = [];
  
    
      fileData = [11, 33].includes(brandId)
     ? await readExcelFileWithSubColumnsForBulk(req.file.path)
     : await readExcelFile(req.file.path);
    //  rowDataArray = fileData.data.splice(1);
  
      rowDataArray = fileData.data.slice([11, 33].includes(brandId) ? 1 : 0);
  
    headers = fileData.headers;
    if(!headers){
       return {isEmptyFile:true}
     }
    const requiredBrandIds = [17, 28];
    const normalizedHeaders = headers.map((header) =>
      header.trim().toLowerCase()
    );
  //  console.log("headers ",mappedData,brandId)
    // const isValid = Object.entries(mappedData)
    //   .filter(([key]) => key != 'stock_type'  && key!= 'calculativeField' && key!='stock_qty') // Exclude stock_type and loc
    //   .every(([, value]) => headers.includes(value)); // Check if all values exist in headers
   const unmatchedHeaders = Object.entries(mappedData)
  .filter(([key]) => key !== 'stock_type' && key !== 'calculativeField')
  .map(([, value]) => value.trim().toLowerCase())
  .filter(value => !normalizedHeaders.includes(value));

 // console.log("unmatched ",unmatchedHeaders,mappedData)
const isValid = unmatchedHeaders.length === 0
    // If brandId is 17, 28 check for "availability" and "status" in headers
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
let inventoryLocationNotExist=new Set();
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
 //   console.log("row ",rowDataArray)
    let normalizedData = rowDataArray.map(row => {
      const getVal = (key) => {
        const match = Object.keys(row).find(k => k.trim().toLowerCase() == key.trim().toLowerCase());
        const value = match ? row[match] : "";
        // return value != null ? value.toString().trim() : "";
     //   console.log("value ",value)
        return (value != null && value !== undefined) ? value.toString().trim() : "";

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
            //const regex = new RegExp(escapedKey, 'gi');
            // const val = parseFloat(row[key]);
            // formulaWithValues = formulaWithValues.replace(regex, isNaN(val) ? "0" : val.toString());

            const rawVal = row[key];
      const val = parseFloat(rawVal);
      const safeVal = (rawVal === undefined || rawVal === null || rawVal === "" || isNaN(val)) ? "0" : val.toString();
      formulaWithValues = formulaWithValues.replace(regex, safeVal);
          });
       //  console.log("keys in evalutaing formula ",formulaWithValues)
          try {
       //     console.log("Evaluating:", formulaWithValues,eval(formulaWithValues));
            return eval(formulaWithValues);
          } catch (err) {
       //     console.error("Error evaluating formula: in bulk upload st service", formulaWithValues, err);
            return 0;
          }
        } else {
          // const val = parseFloat(row[mappedData.stock_qty]);
          // return isNaN(val) ? 0 : val;
          const rawVal = row[mappedData.stock_qty];
    const val = parseFloat(rawVal);
    return (rawVal === undefined || rawVal === null || rawVal === "" || isNaN(val)) ? 0 : val;
        }
      };
    

      return {
            part_number: getVal(mappedData.part_number).replace(/[^a-zA-Z0-9]/g, ""),
            qty: computeQty(),
            availability: getVal("availability"),
            status: getVal("status"),
            // location: getVal(mappedData.loc) != null ? getVal(mappedData.loc) : "",
            
            location: getVal(mappedData.loc)?.trim() || "",
          };
    });
  
  /// console.log("normalized data -------------- ",normalizedData)
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
    //  console.log(row.part_number,stockQty,row.location)
    
      return hasPartNumber && stockQty > 0 && hasLocation;
    });
  
   // console.log("filtered data in st service bulk upload ",filteredRowData)
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
      //console.log("stockCodes ",insertedDataResult)
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

    // console.log("combined existed data 716", combinedExistedData);
    }

 
    let partMasterMap = new Map(
  partMasterResult.map(el => [el.partnumber1.trim().toLowerCase(), el.partID])
);

let dealerLocationMap = new Map(
  dealerLocationMappedData.map(el => [el.inventory_location.trim().toLowerCase(), el.locationId])
);
//console.log("dealerLocation mapped Data ",dealerLocationMappedData,dealerLocationMap)

let seenPartNumbers = new Set(); // For tracking duplicates in partNotInMasterArray

//console.log("partnot in masrter ",filteredRowData[0])
for (let item of filteredRowData) {
  let normalizedPartNumber = item.part_number.trim().toLowerCase();
  let partId = partMasterMap.get(normalizedPartNumber);

 let isAlreadyExist=partNotInMasterArray.some(p=>p.partnumber?.toLowerCase()==normalizedPartNumber)
  if (partId) {
    item.partId = partId;

    let normalizedLocation = item.location?.replace(/[^a-zA-Z0-9-_ ]/g, '').trim().toLowerCase();
    let locationId = dealerLocationMap.get(normalizedLocation);
   // console.log(dealerLocationMap.get('new test2'));
    if(dealerLocationMap.get(normalizedLocation)==undefined){
    //  console.log(item.location);
      if(!inventoryLocationNotExist.has(item.location)){
        inventoryLocationNotExist.add(item.location)
      }
    }
   // console.log("locationid ",inventoryLocationNotExist)
    if (locationId) {
      item.locationId = locationId;
      updatedFilteredRowData.push(item);
    } else {
      wrongDealerLocationInFile.push(item.location);
    }

  } 
   else if(!isAlreadyExist){
        partNotInMasterArray.push({ partnumber: item.part_number });
    }
}

//console.log(inventoryLocationNotExist)
// partNotInMasterArray = Array.from(seenPartNumbers).map(partnumber => ({ partnumber }));
   // console.log("part not in master ",partNotInMasterArray)
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

    const uniqueLocationIds = [
      ...new Set(updatedFilteredRowData.map((item) => item.locationId)),
    ];

   //  console.log("updatedFiltered row ",updatedFilteredRowData)
    //  console.log("unique location ids ", uniqueLocationIds);
    let rowCount;

    rowCount = updatedFilteredRowData?.length;
    let combinedLogsLocationWise = [];
    let currentStockCode;
    //  console.log("unique ids ",uniqueLocationIds,updatedFilteredRowData[0])
    for (let i = 0; i < uniqueLocationIds.length; i++) {
      let locId = uniqueLocationIds[i];
      
     // console.log("locationId ",locId);
      let prevCountRecords=0;
      let quantitySumPrev = 0;
    //   console.log("unique ids  ",uniqueLocationIds)
      let filteredData = updatedFilteredRowData.filter(
        (item) => item.locationId == locId
      );
     
     // console.log("filtered data ",filteredData);
      if (insertedDataResult.length != 0) {
        // console.log("countRecords inserted ",countPrevRecords)
        // StockCode = insertedDataResult[0].StockCode;
        let tcodeQuery = `
        USE [z_scope]; 
        SELECT tcode
        FROM currentStock1
        WHERE locationId =@locId
    `;

        let request = await pool.request().input('locId',locId);

        let resultTcode= await request.query(tcodeQuery);
        // console.log("quantity sum 642", resultTcode.recordset);
     //  console.log("result tcode ",resultTcode)
     for(let i=0;i<resultTcode?.recordset?.length;i++){

        if(resultTcode?.recordset[i]?.tcode){
          let resTcode=parseInt(resultTcode?.recordset[i]?.tcode,10);
        //  console.log("tcode at 1069 ",resTcode);

      let quantitySumQuery=`Select sum(qty) as QuantSum,count(*) as countRecords  from currentstock2 where stockcode=@resTcode`;
       result567=await pool.request().input('resTcode',resTcode).query(quantitySumQuery)  
      // console.log("quantity sum query 1072 ",result567?.recordset[0]?.QuantSum ) 
         
         // console.log(result567);
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
      let insertQueryForCurrentStock1 = `use [z_scope] insert into currentStock1(locationID,stockdate,addedby,addedDate) output inserted.tcode values(@locId,getDate(),@addedBy,cast(getDate() as smalldatetime))`;

      const result1 = await pool
        .request()
        .input("locId", locId)
        .input("addedBy", addedBy)
        .query(insertQueryForCurrentStock1);
      currentStockCode = result1?.recordset[0]?.tcode;

      //  console.log(filteredData)
      if(filteredData.length){

      const values1 = filteredData.map((item) => {
         const rawPartId = item.partId;
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
        return { error: error }; // Rethrow the error for further handling if necessary
      }
    }
      let currentQuantSum = 0;
      let currentCountQuery = `use [z_scope] select sum(qty) as currentQuantSum from currentStock2 where stockCode=@currentStockCode`;
      let result678 = await pool
        .request()
        .input("currentStockCode", currentStockCode)
        .query(currentCountQuery);
      //  console.log("currentQuant ",currentQuantSum)
      if (result678?.recordset?.length != 0) {
        currentQuantSum = result678?.recordset[0]?.currentQuantSum;
      }
       let updateWorkshopMasterQuery=`use [z_scope] update dealer_workshop_master set LATESTSTOCKDATE =CAST(getdate() as smalldatetime) where dealerid=@dealerId and bigid=@locationId`;

    await pool.request().input('dealerId',dealerId).input('locationId',locId).query(updateWorkshopMasterQuery)


      //  console.log("currentquant ",currentQuantSum)
      let logQuery = `use [z_scope] insert into Stock_Upload_Logs(Stockcode,location_id,dealer_id,added_by,brand_id, StockUploadCount,operation_type,quantitySum,
     prevStockUploadCount,prevQuantitySum) values(@currentStockCode,@locId,@dealerId,@addedBy,@brandId,@rowCount,'bulk stock upload ',@currentQuantSum,@countPrevRecords,@quantitySumPrev)`;
      await pool
        .request()
        .input("currentStockCode", currentStockCode)
        .input("locId", locId)
        .input("addedBy", addedBy)
        .input("currentQuantSum", result678?.recordset[0]?.currentQuantSum)
        .input("brandId", brandId)
        .input("dealerId", dealerId)
        .input("rowCount", filteredData?.length)
        .input("quantitySumPrev", quantitySumPrev)
        .input("countPrevRecords", prevCountRecords)
        .query(logQuery);

     // console.log(inventoryLocationNotExist)
      combinedLogsLocationWise.push({
        currentSumQuantity: result678?.recordset[0]?.currentQuantSum||0,
        prevSumQuantity: quantitySumPrev ||0,
        currentRecords: filteredData?.length||0,
        prevRecords: prevCountRecords ||0,
         locationId:locId,
         inventoryLocationNotExist:[...inventoryLocationNotExist]
      });

    
    }

    if (partNotInMasterArray.length != 0) {
      //  console.log("part not in master ",partNotInMasterArray)
      // Prepare both requests
const deletePartMasterQuery = `
  USE [z_scope]; 
  DELETE FROM part_not_in_master WHERE brand_id = @brandId
`;
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
      "error in bulk stock upload method in by spm service ",
      error.message
    );
    return { error: error };
  }
}

export {  
  stockUploadSingleLocation,
  getPartNotInMasterSingleLocationInService,
  getAllRecordsSingleLocation,
  getUploadedDataSingleLocationInService,
  stockUploadMultiLocation,
  getUploadedDataMultiLocationInService,
  getPartNotInMasterMultiLocationInService,
  getAllRecordsMultiLocation,
  getPartNotInMasterBulkInService,
  uploadBulkData
};
