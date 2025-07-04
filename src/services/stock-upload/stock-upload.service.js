import { getPool2 } from "../../db/db.js"
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

  const headers = fileData.headers.map(h => h.trim().toLowerCase());
  const rowDataArray = fileData.data.slice([11, 33].includes(brandId) ? 1 : 0);

   const requiredBrandIds = [17, 28];
  // console.log("headers ",headers)
  const normalizedHeaders = headers.map(header => header.trim().toLowerCase());
  //console.log("mapped datda ",mappedData)
  const isValid = Object.entries(mappedData)
      .filter(([key]) => key != 'stock_type' && key != 'loc' && key!='calculativeField' && key!='stock_qty') // Exclude stock_type and loc
      .every(([, value]) => headers.includes(value.trim().toLowerCase())); // Check if all values exist in headers
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
  // 5. Format data
  // const normalizedData = rowDataArray.map(row => {
  //   const getVal = (key) => {
  //     const match = Object.keys(row).find(k => k.toLowerCase() == key.toLowerCase());
  //     return match ? row[match]?.toString().trim() : "";
  //   };

  //   return {
  //     part_number: getVal(mappedData.part_number).replace(/[^a-zA-Z0-9]/g, ""),
  //     qty: parseFloat(getVal(mappedData.stock_qty)) || 0,
  //     availability: getVal("availability"),
  //     status: getVal("status")
  //   };
  // });

  let normalizedData = rowDataArray.map(row => {
    const getVal = (key) => {
      const match = Object.keys(row).find(k => k.toLowerCase() === key.toLowerCase());
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
  const existingUnmatchedParts = new Set(
    (await pool.request()
      .input("brandId", brandId)
      .query(`USE [z_scope]; SELECT partnumber FROM part_not_in_master WHERE brand_id = @brandId`)
    ).recordset.map(p => p.partnumber)
  );

  // Clear old unmatched records
  await pool.request().input("brandId", brandId).query(`USE [z_scope]; DELETE FROM part_not_in_master WHERE brand_id = @brandId`);

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

  for (const item of filteredData) {
  const partNumber = item.part_number.toLowerCase();
  const id = partMap.get(partNumber);

  if (id) {
    knownParts.push({ ...item, partId: id });
  } else if (
    !existingUnmatchedParts.has(item.part_number) &&
    !unknownParts.some(p => p.partnumber.toLowerCase() === partNumber)
  ) {
    unknownParts.push({ partnumber: item.part_number });
  }
}

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

  const deduped = Array.from(merged.values());

  // 11. Check for previous stock for location
  const prevStock = await pool.request()
    .input("locationId", locationId)
    .query(`USE [z_scope]; SELECT tcode FROM currentStock1 WHERE locationId=@locationId`);
  const oldTcode = prevStock.recordset[0]?.tcode || null;

  let prevQtySum = 0;
  let prevRecordCount = 0;

  if (oldTcode) {
    const { recordset: prevItems } = await pool.request()
      .input("StockCode", oldTcode)
      .query(`USE [z_scope]; SELECT partNumber, qty, partID FROM currentStock2 WHERE StockCode=@StockCode`);
    prevRecordCount = prevItems.length;

    prevQtySum = (await pool.request()
      .input("StockCode", oldTcode)
      .query(`USE [z_scope]; SELECT SUM(qty) AS QuantSum FROM currentStock2 WHERE StockCode=@StockCode`)
    ).recordset[0]?.QuantSum || 0;

    // Merge existing items into deduped list
    const existingMap = new Map(deduped.map(i => [i.partId, i]));
    for (const item of prevItems) {
      if (!existingMap.has(item.partID)) {
        deduped.push({ part_number: item.partNumber, qty: item.qty, partId: item.partID });
      } else {
        existingMap.get(item.partID).qty += item.qty;
      }
    }
  }

  // 12. Insert into currentStock1 and get new tcode
  const now = new Date().toISOString().split("T")[0];
  const { recordset: [insertedStock] } = await pool.request()
    .input("locationID", locationId)
    .input("formattedDate", now)
    .input("addedBy", addedBy)
    .query(`USE [z_scope]; INSERT INTO currentStock1(locationID, stockdate, addedby) OUTPUT inserted.tcode VALUES(@locationID, @formattedDate, @addedBy)`);

  const newTcode = insertedStock.tcode;

 // console.log("unknown paerts ",unknownParts)
  // 13. Bulk insert unknown parts
  if (unknownParts.length) {
    const table = new sql.Table("part_not_in_master");
    table.columns.add("brand_id", sql.Int);
    table.columns.add("partnumber", sql.VarChar(100));
    unknownParts.forEach(p => table.rows.add(brandId, p.partnumber));
    await pool.request().bulk(table);
  }

  // 14. Bulk insert to currentStock2
  if(deduped.length){
  const stockTable = new sql.Table("currentStock2");
  stockTable.columns.add("StockCode", sql.BigInt);
  stockTable.columns.add("PartNumber", sql.VarChar(35));
  stockTable.columns.add("Qty", sql.Decimal(18, 2));
  stockTable.columns.add("PartID", sql.Int);
  deduped.forEach(row => stockTable.rows.add(newTcode, row.part_number, row.qty, row.partId));
  await pool.request().bulk(stockTable);
  }
  // 15. Log the upload
  const totalQty = (await pool.request()
    .input("StockCode", newTcode)
    .query(`USE [z_scope]; SELECT SUM(qty) AS currentQuantSum FROM currentStock2 WHERE stockCode = @StockCode`)
  ).recordset[0].currentQuantSum;

  await pool.request()
    .input("locationId", locationId)
    .input("StockCode", newTcode)
    .input("addedBy", addedBy)
    .input("brandId", brandId)
    .input("rowCount", deduped.length)
    .input("currentQuantSum", totalQty)
    .input("countPrevRecords", prevRecordCount)
    .input("quantitySumPrev", prevQtySum)
    .query(`USE [z_scope]; INSERT INTO Stock_Upload_Logs(location_id, stockCode, added_by, brand_id, z_scopeCount, operation_type, quantitySum, prevz_scopeCount, prevQuantitySum)
            VALUES(@locationId, @StockCode, @addedBy, @brandId, @rowCount, 'single-location upload stock', @currentQuantSum, @countPrevRecords, @quantitySumPrev)`);

  // 16. Delete old stock entries
  if (oldTcode) {
    await pool.request().input("stockCode", oldTcode).query(`USE [z_scope]; DELETE FROM currentStock2 WHERE stockCode=@stockCode`);
    await pool.request().input("stockCode", oldTcode).query(`USE [z_scope]; DELETE FROM currentStock1 WHERE tcode=@stockCode`);
  }

  return {
    currentSumQuantity: totalQty,
    prevSumQuantity: prevQtySum,
    currentRecords: deduped.length,
    prevRecords: prevRecordCount,
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
    let brandId = result.recordset[0].brandId;
    // console.log(brandId);
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
    let getQuery = `use [z_scope] select added_on,added_by,z_scopeCount,quantitySum,prevQuantitySum,prevz_scopeCount from stock_upload_logs where location_id=@locationId`;

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
    // let getQuery = `use [z_scope] select ck2.partnumber,ck2.qty from currentStock2 ck2 join 
    //     currentStock1 ck1 on ck1.tcode=ck2.StockCode where locationId=@locationId`;
let getNameQuery=`use [z_scope] SELECT location,brand,dealer,brandId FROM locationInfo WHERE locationId = @locationId`;
    const result1=await pool.request().input('locationId',locationId).query(getNameQuery);
    brand=result1.recordset[0].brand;
    dealer=result1.recordset[0].dealer;
    location=result1.recordset[0].location;
    let brandId=result1.recordset[0].brandId
   
// if partno belongs in part master and substituionmaster then take subpartnumber
//  else partno of partmaster is considered as latest part number
    let getQuery=`use [z_scope] select c1.stockDate, c.partNumber, c.qty as Quantity, vw.partDesc,vw.PartType,vw.LandedCost,vw.mrp,vw.moq,
vw.partNature,
case when vw.partNo=s.partnumber then s.subpartnumber else vw.partNo end as LatestPartNumber from [z_scope].dbo.currentStock2 c 
join [z_scope].dbo.currentStock1 c1 on c1.tcode=c.StockCode and c1.LocationID=@locationId
left join  [z_scope].dbo.VW_PartMaster vw on c.PartNumber=vw.partNo and vw.BrandID=@brandId
left join  [z_scope].dbo.Substitution_Master s on s.brandid=vw.BrandID and vw.PartNo=s.partnumber `;
 const result = await pool
      .request()
      .input("locationId", locationId)
      .input("brandId", brandId)
      .query(getQuery);

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
  try {
    let location=req.body.location_id
    let locations = req.body.location_id;
    let quantitySumPrev = 0;
    // console.log(typeof location)
    if(typeof location=='string'){
        locations=[location];
    }
    //  console.log("location ",locations)

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
    let deletePartMasterQuery = `use [z_scope] delete from part_not_in_master where brand_id=@brandId`;
    await pool.request().input("brandId", brandId).query(deletePartMasterQuery);
   
    for (let i = 0; i < locations.length; i++) {
        // console.log("exexuted ")
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
      const normalizedHeaders = headers.map(header => header.trim().toLowerCase());
      const isValid = Object.entries(mappedData)
          .filter(([key]) => key != 'stock_type' && key != 'loc' && key!='calculativeField' && key!='stock_qty') // Exclude stock_type and loc
          .every(([, value]) => headers.includes(value)); // Check if all values exist in headers
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
              log:'headerNotPresent'
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
            log:'headerNotPresent'
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
          log:'headerNotPresent'
         })
        continue;
      }
    
      
    //   rowData = rowDataArray.map((rowData1) => {
    //     // Find the correct keys dynamically (case insensitive)
    //     const availabilityKey = Object.keys(rowData1).find(
    //         (key) => key.toLowerCase() === "availability"
    //     );
        
    //     const statusKey = Object.keys(rowData1).find(
    //         (key) => key.toLowerCase() === "status"
    //     );
    
    //     return {
    //         part_number: rowData1[mappedData.part_number] != null 
    //             ? rowData1[mappedData.part_number].toString().replace(/[^a-zA-Z0-9]/g, "") 
    //             : "", 
            
    //         qty: rowData1[mappedData.stock_qty] != null 
    //             ? parseFloat(rowData1[mappedData.stock_qty]) || 0 
    //             : 0, 
            
    //         availability: availabilityKey && rowData1[availabilityKey] != null 
    //             ? rowData1[availabilityKey].toString().trim() 
    //             : "", 
            
    //         status: statusKey && rowData1[statusKey] != null 
    //             ? rowData1[statusKey].toString().trim() 
    //             : "",
    //     };
    // });
    // const normalizedData = rowDataArray.map(row => {
    //   const getVal = (key) => {
    //     const match = Object.keys(row).find(k => k.toLowerCase() == key.toLowerCase());
    //     return match ? row[match]?.toString().trim() : "";
    //   };
  
    //   return {
    //     part_number: getVal(mappedData.part_number).replace(/[^a-zA-Z0-9]/g, ""),
    //     qty: parseFloat(getVal(mappedData.stock_qty)) || 0,
    //     availability: getVal("availability"),
    //     status: getVal("status")
    //   };
    // });

    let normalizedData = rowDataArray.map(row => {
      const getVal = (key) => {
        const match = Object.keys(row).find(k => k.toLowerCase() === key.toLowerCase());
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
 
  let query12=`use [z_scope] Select tcode from currentStock1 where locationId=@locationId`;
  let res45=await pool.request().input('locationId',locationId).query(query12);
 let  StockCode=res45?.recordset[0]?.tcode;
  let countPrevRecords=0;
  let insertedDataResult=[];
//console.log("tcode ",StockCode,locationId)
  if(res45.recordset.length>0){
    //  let quantityPrevQuery=`use [z_scope] select sum(qty) as prevQuantSum from currentStock2 where StockCode=@StockCode`;
    //  let res456=await pool.request().input('StockCode',StockCode).query(quantityPrevQuery);
    //  quantitySumPrev=res456.recordset[0].prevQuantSum

    //   let insertedDataQuery = `use [z_scope] Select partNumber,partID,qty from currentStock2 where Stockcode=@StockCode`;
    
    //   let result56 = await pool
    //     .request()
    //     .input("StockCode", StockCode)
    //     .query(insertedDataQuery);
    //    insertedDataResult = result56.recordset;
    //   countPrevRecords = insertedDataResult.length;
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
     
  }

      //  console.log("mapped data ",mappedResult)
    //   let filteredRowData = rowData.filter((row) => {
    //     // Convert qty to a number safely (handle undefined/null cases)
    //    // console.log("row ",row)
    //     const stockQty = parseFloat(row.qty) ;
    //     // console.log("parse int ",stockQty)
    //     // Check if part_number exists and is not empty
    //     const hasPartNumber = row.part_number && row.part_number.trim() !== "";
      
    //     // Normalize headers
    //     const availabilityHeader = Object.keys(headers).find(
    //       (header) => {
    //        // console.log("header to lowercase ",header,header.toLowerCase())
    //         header.toLowerCase() == "availability"
    
    //       }
    //     );
    //     const statusHeader = Object.keys(headers).find(
    //       (header) => header.toLowerCase() == "status"
    //     );
      
    //    // console.log("avaiablitiy headers ",availabilityHeader)
    //     // Get availability and status values
    //     const availability = row["availability"]?.toLowerCase().trim();
    //     const status = row["status"]?.toLowerCase().trim();
      
    //     // Remove rows where part_number is null/empty and qty > 0
    //     // if (hasPartNumber && stockQty > 0) {
    //     //   return true;
    //     // }
      
    //     // For brandId 17, 28 remove if availability is "on-hand" and status is not "good"
    //     if ((brandId == 17 || brandId == 28) && availability == "on hand" && status == "good" && hasPartNumber && stockQty > 0) {
    //       return true;
    //   }
    // else
    //   if (brandId == 22 && availability == "on hand" && hasPartNumber && stockQty > 0) {
        
    //       return true;
    //   }
    
    //   if (![17, 22, 28].includes(brandId)) {
    //     if (hasPartNumber && stockQty > 0) {
    //       return true;
    //     }
    //   }
    
    // return false;
    //     // return true; // Keep the row if it passed all filters
    //   });

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
  } else {
    if (!partNotInMasterSet.has(item.part_number)) {
   //   partNotInMasterArray.push({ partnumber: item.part_number });
      partNotInMasterSet.add(item.part_number);
    }
  }
}
// After the loop
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
        //  console.log("part count ",partCountMap)
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
//console.log("updated filtered data ",updatedFilteredRowData1);
const combinedData = updatedFilteredRowData1.map(item => {
    // Check if part_number exists
    if (!item.partNumber) {
      // console.error(`Missing part_number in item:`, item);
      return item; // Skip or handle the missing data
    }
  
  //  console.log("inserted result ",insertedDataResult)
    const match = insertedDataResult.find(additional => additional.partNumber == item.partNumber);
  
    if (match) {
      item.qty = (parseFloat(item.qty) + match.qty).toString();  // Ensure qty is a string
    }
  
    return item;
  });
 // console.log("combined data ",combinedData)
  if(combinedData.length<=insertedDataResult.length){
    const updatedMap = new Map(combinedData.map(item => [item.partId, item]));

   // console.log("updatedMap",insertedDataResult)
    // Check for missing records in insertedDataResult
    const missingRecords = insertedDataResult
    .filter(item => !updatedMap.has(item.partID))
    .map(item => ({
      partNumber: item.partNumber,
            partId: item.partID,
      qty: parseFloat(item.qty) // Convert qty to an integer
    }));
  
    
  // console.log("Missing Records:", missingRecords);
    
    combinedData.forEach(item => {
      if (updatedMap.has(item.partId)) {
          const existing = insertedDataResult.find(el => el.partID == item.partId);
          // if (existing) {
          //     item.qty = parseInt(existing.qty, 10);
          // }

          item.qty=parseFloat(item.qty)
      }
  });
 // console.log("combined data 1826",combinedData)
    
    // Add missing records to updatedFilteredRowData
    for(let j=0;j<missingRecords.length;j++){
      combinedData.push(missingRecords[j]);

    }
  }
 // console.log("inserted data .length ",insertedDataResult.length,insertedDataResult,combinedData.length,combinedData[0])
  if (insertedDataResult.length < combinedData.length) {
            const missingRecords = [];
          
            insertedDataResult.forEach((item) => {
              let partID = item.partID;
              let qty = parseFloat(item.qty);
          
              const match = combinedData.find(
                (el) => el.partId == partID
              );
          
              if (match) {
               // console.log("Matched element:", match);
                item.qty = qty + parseFloat(match.qty);
              } else {
                // Only push missing record if not already in missingRecords
            //     const potentialMissing = combinedData.find(
            //       (el) => el.partId != partID
            //     );
            //  console.log("potential missing 1819 ",potentialMissing)
                if (
                  !missingRecords.some(
                    (rec) =>
                      rec.partId == partID 
                  )
                ) {
            //     console.log("Missing item:",item );
                  missingRecords.push({
                    partNumber:item.partNumber,
                    partId:item.partID,
                    qty:item.qty
                  });
                }
              }
            });
        //   console.log("missing records in 1832",missingRecords)
            // Only push missingRecords if they're truly missing
            combinedData.push(
              ...missingRecords.filter(
                (missingItem) =>
                  !combinedData.some(
                    (item) =>
                      item.partId == missingItem.partId
                  )
              )
            );
          }

 //  console.log("location id combine data ",locationId,combinedData)
   // Create a map to track the occurrences of part_number and total stock_qty
   let updatedFilteredRowData2=[];
   updatedFilteredRowData2 =combinedData;
      // console.log("updated ",updatedFilteredRowData2)
      let rowCount = updatedFilteredRowData2?.length;
      let currentDate = new Date();
      const formattedDate = currentDate.toISOString().split("T")[0]; // Outputs: '2025-03-08'
      // console.log(formattedDate);
      if(updatedFilteredRowData2.length>0){
      let insertQueryForCurrentStock1 = `use [z_scope] insert into currentStock1(locationID,stockdate,addedby) output inserted.tcode values(@locationID,@formattedDate,@addedBy)`;

      const result1 = await pool
        .request()
        .input("locationID", locationId)
        .input("formattedDate", formattedDate)
        .input("addedBy", addedBy)
        .query(insertQueryForCurrentStock1);
      let tCode = result1.recordset[0].tcode;
     
      if(updatedFilteredRowData2.length){
        const values1 = updatedFilteredRowData2.map((item) => {
          return [
            parseInt(tCode, 10),
            item["partNumber"],
            parseFloat(item["qty"]),
            parseInt(item["partId"],10),
          ];
        });
        try {
          await pool.request().query('use z_scope')
          const table1 = new sql.Table("currentStock2"); // Updated table name
          table1.create = false;
  
          table1.columns.add("StockCode", sql.BigInt, { nullable: true });
          table1.columns.add("PartNumber", sql.VarChar(35), { nullable: true });
          table1.columns.add("Qty", sql.Decimal(18, 2), { nullable: true });
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
          log:error
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

      let logQuery = `use [z_scope] insert into Stock_Upload_Logs(location_id,stockCode,added_by,brand_id, z_scopeCount,operation_type,quantitySum,
prevz_scopeCount,prevQuantitySum) values(@locationId,@tCode,@addedBy,@brandId,@rowCount,'multi-location upload stock',@currentQuantSum,@countPrevRecords,@quantitySumPrev)`;
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

        if (res45.recordset.length > 0) {
          // const deleteQuery = `
          //   USE [z_scope];
          //   DELETE FROM currentStock1 WHERE tcode = @StockCode;
          //   DELETE FROM currentStock2 WHERE stockcode = @StockCode;
          // `;
        
          // await pool
          //   .request()
          //   .input("StockCode", StockCode)
          //   .query(deleteQuery);
        }
        await pool.request().input("StockCode", StockCode).query(`USE [z_scope]; DELETE FROM currentStock2 WHERE StockCode=@StockCode`);
        await pool.request().input("StockCode", StockCode).query(`USE [z_scope]; DELETE FROM currentStock1 WHERE tcode=@StockCode`);
        
    }
    
  }

    // console.log("part not in master in multi stock upload ",partNotInMasterArray)
    if(partNotInMasterArray.length!=0){
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
       // console.error("Error during bulk insert: part not in master", error);
       // return {error:error}; // Rethrow the error for further handling if necessary
       errorLogs.push({
        locationId:locationId,
        status:true,
        log:error
       })
       
      }
    }
   
  } catch (error) {
    console.log("error ", error.message);
   // return {error:error};
   errorLogs.push({
    locationId:locationId,
    status:true,
    log:error
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
            let getQuery = `use [z_scope] select location_id,added_on,added_by,z_scopeCount,quantitySum,prevQuantitySum,prevz_scopeCount from stock_upload_logs where location_id=@locationId`;
    
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
    let brandId=req.brand_id;
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
    let dealerId = parseInt(req.body.dealer_id,10);
    let StockCodes;
    let wrongDealerLocationInFile = [];
  //  console.log("brandid ",brandId,dealerId,req.body)
    // const date1= new Date(currentDate);
    // let date = req.body.date;
    // const date1 = new Date(date);
    // let formattedDate = date1.toLocaleDateString('en-CA');
    // const formattedDate = date1.toISOString().split("T")[0]; // Extract the date portion of the ISO string
    // console.log(typeof formattedDate,formattedDate);
    //   console.log("date ",date)
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
  //  console.log("mapping result ", mappingResult);

    let checkDealerLocationMappingQuery = `use [z_scope] select inventory_location,locationID as locationId from dealer_location_mapping where dealerId=@dealerId and status='active'`;
    const resDealerAndLoc = await pool
      .request()
      .input("dealerId", dealerId)
      .query(checkDealerLocationMappingQuery);
    if (resDealerAndLoc.recordset.length == 0) {
      return { dealerLocationMappingNotPresent: true };
    }
 //console.log("dealer location mapping ",resDealerAndLoc.recordset)
    let dealerLocationMappedData = resDealerAndLoc.recordset;

    let mappedData = mappingResult.recordset[0];
    let fileData;
    let headers;
    let rowDataArray;
    let filteredRowData;
    let combinedExistedData = [];
  
    
      fileData = [11, 33].includes(brandId)
     ? await readExcelFileWithSubColumnsForBulk(req.file.path)
     : await readExcelFile(req.file.path);
    //  rowDataArray = fileData.data.splice(1);
  
      rowDataArray = fileData.data.slice([11, 33].includes(brandId) ? 1 : 0);
  
    headers = fileData.headers;
    const requiredBrandIds = [17, 28];
    const normalizedHeaders = headers.map((header) =>
      header.trim().toLowerCase()
    );
  //  console.log("headers ",headers,mappedData)
    const isValid = Object.entries(mappedData)
      .filter(([key]) => key != 'stock_type'  && key!= 'calculativeField' && key!='stock_qty') // Exclude stock_type and loc
      .every(([, value]) => headers.includes(value)); // Check if all values exist in headers
    
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
        const match = Object.keys(row).find(k => k.toLowerCase() === key.toLowerCase());
        const value = match ? row[match] : "";
        // return value != null ? value.toString().trim() : "";
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
  
 //  console.log("normalized data ",normalizedData)
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

const deletePartMasterQuery = `
  USE [z_scope]; 
  DELETE FROM part_not_in_master WHERE brand_id = @brandId
`;

const locationIds = locations.map((location) => parseInt(location.locationId, 10));

const query12 = `
  USE [z_scope]; 
  SELECT tcode, locationId 
  FROM currentStock1 
  WHERE locationId IN (${locationIds.map((_, i) => `@loc${i}`).join(", ")})
`;

// Prepare both requests
const deleteRequest = pool.request().input("brandId", brandId).query(deletePartMasterQuery);

const stockRequest = (() => {
  const req = pool.request();
  locationIds.forEach((id, i) => {
    req.input(`loc${i}`, sql.Int, id);
  });
  return req.query(query12);
})();

// Run them in parallel
let [deleteResult, res45] = await Promise.all([deleteRequest, stockRequest]);

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

   //  console.log("combined existed data 716", combinedExistedData);
    }

 
    let partMasterMap = new Map(
  partMasterResult.map(el => [el.partnumber1.trim().toLowerCase(), el.partID])
);

let dealerLocationMap = new Map(
  dealerLocationMappedData.map(el => [el.inventory_location.trim().toLowerCase(), el.locationId])
);

let seenPartNumbers = new Set(); // For tracking duplicates in partNotInMasterArray

for (let item of filteredRowData) {
  let normalizedPartNumber = item.part_number.trim().toLowerCase();
  let partId = partMasterMap.get(normalizedPartNumber);

  if (partId) {
    item.partId = partId;

    let normalizedLocation = item.location?.replace(/[^a-zA-Z0-9-_ ]/g, '').trim().toLowerCase();
    let locationId = dealerLocationMap.get(normalizedLocation);

    if (locationId) {
      item.locationId = locationId;
      updatedFilteredRowData.push(item);
    } else {
      wrongDealerLocationInFile.push(item.location);
    }

  } else {
    // Only push to partNotInMasterArray if not already added
    if (!seenPartNumbers.has(item.part_number)) {
      seenPartNumbers.add(item.part_number);
     // partNotInMasterArray.push({ partnumber: item.part_number });
    }
  }
}
partNotInMasterArray = Array.from(seenPartNumbers).map(partnumber => ({ partnumber }));
   // console.log("part not in master ",partNotInMasterArray)
    //  updatedFilteredRowData = Array.from(partCountMap.values());

    let partCountMap = new Map();

for (let item of updatedFilteredRowData) {
  let key = `${item.part_number}-${item.locationId}`;
  let existing = partCountMap.get(key);

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

    
  //  console.log("filtered 974 ",filteredRowData)

    //console.log("updated filtered row 918 ",partCountMap);
 //console.log("updated filtered data 922 ",updatedFilteredRowData)
  
    if (insertedDataResult.length != 0) {
   //   console.log("updated filtered ",updatedFilteredRowData);
  //    console.log("combined filtered ",combinedExistedData)
      if (updatedFilteredRowData.length > combinedExistedData.length) {
        let missingRecords = [];
      
        updatedFilteredRowData.forEach((item) => {
          let partID = item.partId;
          let qty = parseFloat(item.qty);
      
          let match = combinedExistedData.find(
            (el) => el.partId == partID && el.locationId == item.locationId
          );
      
          if (match) {
          //  console.log("Matched element:", match);
            item.qty = qty + parseFloat(match.qty);
          } else {
            // Only push missing record if not already in missingRecords
            const potentialMissing = combinedExistedData.find(
              (el) => el.locationId == item.locationId && el.partId != partID
            );
      
            if (
              potentialMissing &&
              !missingRecords.some(
                (rec) =>
                  rec.partId == potentialMissing.partId &&
                  rec.locationId == potentialMissing.locationId
              )
            ) {
           //   console.log("Missing item:", potentialMissing);
              missingRecords.push(potentialMissing);
            }
          }
        });
    //   console.log("missing records ",missingRecords)
        // Only push missingRecords if they're truly missing
        updatedFilteredRowData.push(
          ...missingRecords.filter(
            (missingItem) =>
              !updatedFilteredRowData.some(
                (item) =>
                  item.partId == missingItem.partId &&
                  item.locationId == missingItem.locationId
              )
          )
        );
      }

      //console.log("updated filtered 974 ",updatedFilteredRowData)
      
      if (updatedFilteredRowData.length <= combinedExistedData.length) {
        // Create a combined key map like "partId-locationId"
        let updatedMap = new Map(
          updatedFilteredRowData.map((item) => [`${item.partId}-${item.locationId}`, item])
        );
      
      //  console.log("combined ", combinedExistedData);
      
        // Find missing records in updatedFilteredRowData
        let missingRecords = combinedExistedData
          .filter(
            (item) => !updatedMap.has(`${item.partId}-${item.locationId}`)
          )
          .map((item) => ({
            part_number: item.part_number,
            partId: parseInt(item.partId, 10),
            qty: parseFloat(item.qty),
            locationId: parseInt(item.locationId, 10),
          }));
      
       // console.log("updated map ", updatedMap);
      
        updatedFilteredRowData.forEach((item) => {
          let key = `${item.partId}-${item.locationId}`;
          if (updatedMap.has(key)) {
            let existing = combinedExistedData.find(
              (el) => el.partId == item.partId && el.locationId == item.locationId
            );
      
            if (existing) {
              item.qty = parseFloat(item.qty) + parseFloat(existing.qty);
            } 
          }
        });
      
        // Add missing records
        updatedFilteredRowData.push(...missingRecords);
      }
      
    }

  //  console.log("updated filtered row ",updatedFilteredRowData,updatedFilteredRowData.length);
   // console.log("previous data ",combinedExistedData,combinedExistedData.length)
  
   // console.log("filtered 982 ",updatedFilteredRowData)
   //  console.log("updatedFiltered 828 ",updatedFilteredRowData)
    const uniqueLocationIds = [
      ...new Set(updatedFilteredRowData.map((item) => item.locationId)),
    ];

    // console.log("updatedFiltered row ",updatedFilteredRowData)
    //  console.log("unique location ids ", uniqueLocationIds);
    let rowCount;

    rowCount = updatedFilteredRowData?.length;
    let combinedLogsLocationWise = [];
    let currentStockCode;
    //  console.log("unique ids ",uniqueLocationIds,updatedFilteredRowData[0])
   
    for (let i = 0; i < uniqueLocationIds.length; i++) {
      let locId = uniqueLocationIds[i];
      
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
        // console.log("quantity sum 642", result567.recordset);
     //  console.log("result tcode ",resultTcode)
        if(resultTcode?.recordset[0]?.tcode){
          let resTcode=parseInt(resultTcode?.recordset[0]?.tcode,10);
        //  console.log("tcode at 1069 ",resTcode);

      let quantitySumQuery=`Select sum(qty) as QuantSum,count(*) as countRecords  from currentstock2 where stockcode=@resTcode`;
       result567=await pool.request().input('resTcode',resTcode).query(quantitySumQuery)  
      // console.log("quantity sum query 1072 ",result567?.recordset[0]?.QuantSum ) 
         
         // console.log(result567);
      if (result567?.recordset?.length != 0) {
          quantitySumPrev = result567?.recordset[0]?.QuantSum || 0;
          prevCountRecords=result567?.recordset[0]?.countRecords ||0 ;
          //console.log("prevCount ",prevCountRecords)
        }

        let deleteQuery=`use [z_scope] Delete from currentstock1 where tcode=@resTcode`;

        let res34=await pool.request().input('resTcode',resTcode).query(deleteQuery);

        let deleteQuery1=`use [z_scope] delete from currentstock2 where stockcode=@resTcode`;
        await pool.request().input('resTcode',resTcode).query(deleteQuery1)
        }
       
      }
      // console.log("updated filtered row after getting unique location id ",updatedFilteredRowData)
      // console.log("current stock1 ",locId,formattedDate,addedBy)
      let insertQueryForCurrentStock1 = `use [z_scope] insert into currentStock1(locationID,stockdate,addedby) output inserted.tcode values(@locId,getDate(),@addedBy)`;

      const result1 = await pool
        .request()
        .input("locId", locId)
        .input("addedBy", addedBy)
        .query(insertQueryForCurrentStock1);
      currentStockCode = result1?.recordset[0]?.tcode;

      //  console.log(filteredData)
      if(filteredData.length){

      const values1 = filteredData.map((item) => {
        return [
          parseInt(currentStockCode, 10),
          item["part_number"],
          parseFloat(item["qty"]),
          item["partId"],
        ];
      });
      //  console.log("values ",values1);
      try {
        await pool.request();
        await pool.request().query("use [z_scope]");
        const table1 = new sql.Table("currentStock2"); // Updated table name
        table1.create = false;

        table1.columns.add("StockCode", sql.BigInt, { nullable: true });
        table1.columns.add("PartNumber", sql.VarChar(35), { nullable: true });
        table1.columns.add("Qty", sql.Decimal(18, 2), { nullable: true });
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
      //  console.log("currentquant ",currentQuantSum)
      let logQuery = `use [z_scope] insert into Stock_Upload_Logs(Stockcode,location_id,dealer_id,added_by,brand_id, z_scopeCount,operation_type,quantitySum,
     prevz_scopeCount,prevQuantitySum) values(@currentStockCode,@locId,@dealerId,@addedBy,@brandId,@rowCount,'bulk stock upload ',@currentQuantSum,@countPrevRecords,@quantitySumPrev)`;
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

      combinedLogsLocationWise.push({
        currentSumQuantity: result678?.recordset[0]?.currentQuantSum||0,
        prevSumQuantity: quantitySumPrev ||0,
        currentRecords: filteredData?.length||0,
        prevRecords: prevCountRecords ||0,
      });

    
    }

    if (partNotInMasterArray.length != 0) {
      //  console.log("part not in master ",partNotInMasterArray)
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
