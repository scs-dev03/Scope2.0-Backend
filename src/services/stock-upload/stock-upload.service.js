import { getPool1 } from "../../db/db.js"
import {
  readExcelFile,
  readExcelFileWithSubColumns,
} from "../utilities/utilities.service.js";
import sql from "mssql";
import yazl from 'yazl';
import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';
// const stockUploadSingleLocation = async (req, res) => {
//   const pool = await getPool1();

//   // let brandId=req.body.brand_id;

//   let locationId = req.body.location_id;
//   let addedBy = req.body.user_id;
//   let rowData;
//   // console.log("locationId ",locationId)
//   let getDealerAndLocationQuery = `use [z_scope] select dealerId,brandId from locationInfo where locationId=@locationId`;

//   const result23 = await pool
//     .request()
//     .input("locationId", locationId)
//     .query(getDealerAndLocationQuery);
//   // console.log("get dealer and loc id ",result23)
//   let brandId = parseInt(result23.recordset[0].brandId,10);
//   let dealerId = result23.recordset[0].dealerId;

//   let getMappingQuery = `use [StockUpload] select part_number,stock_qty,loc,stock_type from stock_upload_mapping where brand_id=@brandId and stock_type='current'`;

//   const mappingResult = await pool
//     .request()
//     .input("brandId", brandId)
//     .query(getMappingQuery);

//   if (mappingResult.recordset.length == 0) {
//     return { mappingNotPresent: true };
//   }

//   let mappedData = mappingResult.recordset[0];
//   let fileData;
//   let headers;
//   let rowDataArray;
//  // console.log("mapped data ",mappedData)
//   if (brandId == 11 || brandId == 33) {
//     fileData = await readExcelFileWithSubColumns(req.file.path);
//     // rowData=fileData.data.splice(2);
//     rowDataArray = fileData.data.splice(1);
//   } else {
//     fileData = await readExcelFile(req.file.path);
//     // rowData=fileData.data.splice(1);
//     rowDataArray = fileData.data;
//   }
//   headers = fileData.headers;
//  // console.log("headers ",headers)
//  // console.log("headers ",headers)
// const requiredBrandIds = [17, 28];
// // console.log("headers ",headers)
// const normalizedHeaders = headers.map(header => header.trim().toLowerCase());
// const isValid = Object.entries(mappedData)
//     .filter(([key]) => key !== 'stock_type' && key !== 'loc') // Exclude stock_type and loc
//     .every(([, value]) => headers.includes(value)); // Check if all values exist in headers

// // If brandId is 17, 28, check for "availability" and "status" in headers
// if (requiredBrandIds.includes(brandId)) {
//     const requiredFields = ["availability", "status"];
//     const hasRequiredFields = requiredFields.every(field => normalizedHeaders.includes(field));

//     if (!hasRequiredFields) {
//         return { headerNotPresent: true };
//     }
// }
// if ([22].includes(brandId)) {
//   const requiredFields = ["availability"];
//   const hasRequiredFields = requiredFields.every(field => normalizedHeaders.includes(field));
  
//   if (!hasRequiredFields) {
//       return { headerNotPresent: true };
//   }
// }

// // Return false if general validation fails
// if (!isValid) {
//     return { headerNotPresent: true };
// }
//       rowData = rowDataArray.map((rowData1) => {
//         // Find the correct keys dynamically (case insensitive)
//         const availabilityKey = Object.keys(rowData1).find(
//             (key) => key.toLowerCase() === "availability"
//         );
        
//         const statusKey = Object.keys(rowData1).find(
//             (key) => key.toLowerCase() === "status"
//         );
    
//         return {
//             part_number: rowData1[mappedData.part_number] != null 
//                 ? rowData1[mappedData.part_number].toString().replace(/[^a-zA-Z0-9]/g, "") 
//                 : "", 
            
//             qty: rowData1[mappedData.stock_qty] != null 
//                 ? parseFloat(rowData1[mappedData.stock_qty]) || 0 
//                 : 0, 
            
//             availability: availabilityKey && rowData1[availabilityKey] != null 
//                 ? rowData1[availabilityKey].toString().trim() 
//                 : "", 
            
//             status: statusKey && rowData1[statusKey] != null 
//                 ? rowData1[statusKey].toString().trim() 
//                 : "",
//         };
//     });
    
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
  
  
// //console.log("filtered row data ",filteredRowData)
//       // console.log("filtered data without null",filteredRowData)

//   let partMasterQuery = `use [z_scope] select partnumber1 ,partID from part_master where brandId=@brandId`;

//   const result = await pool
//     .request()
//     .input("brandId", brandId)
//     .query(partMasterQuery);
//   let partMasterResult = result.recordset;

//   let partNotInMasterArray = [];
//   //   console.log(partMasterResult)
//   const getPartNumberQuery = `use [StockUpload] select partnumber from part_not_in_master where brand_id=@brandId`;
//   let res123 = await pool
//     .request()
//     .input("brandId", brandId)
//     .query(getPartNumberQuery);
//   partNotInMasterArray = res123.recordset;

//   let deletePartMasterQuery = `use [StockUpload] delete from part_not_in_master where brand_id=@brandId`;
//   await pool.request().input("brandId", brandId).query(deletePartMasterQuery);

//   let updatedFilteredRowData = [];

//   let query12=`use [StockUpload] Select tcode from currentStock1 where locationId=@locationId`;
//   const res45=await pool.request().input('locationId',locationId).query(query12);
//  let  StockCode=res45?.recordset[0]?.tcode;
//   let countPrevRecords=0;
//   let insertedDataResult=[];
// //  console.log("current stock1 length ",res45.recordset.length)
//   let quantitySumPrev = 0;
//   let result567 ;
//   if(res45.recordset.length>0){

//       let insertedDataQuery = `use [StockUpload] Select partNumber,partID,qty from currentStock2 where Stockcode=@StockCode`;
    
//       let result56 = await pool
//         .request()
//         .input("StockCode", StockCode)
//         .query(insertedDataQuery);
//        insertedDataResult = result56.recordset;
//       countPrevRecords = insertedDataResult.length;
//       // console.log("previous records ",insertedDataResult)
//       // console.log("stock code ",StockCode)
//       if (insertedDataResult.length != 0) {
//         // console.log("countRecords inserted ",countPrevRecords)
//         // StockCode = insertedDataResult[0].StockCode;
//         let quanitySumQuery = `use [StockUpload] Select sum(qty) as QuantSum from currentStock2 where StockCode=@StockCode`;
    
//          result567 = await pool
//           .request()
//           .input("StockCode", StockCode)
//           .query(quanitySumQuery);
//         // console.log("quantity sum ",result567.recordset)
//         if (result567.recordset.length != 0) {
//           quantitySumPrev = result567.recordset[0].QuantSum;
         
//         }
    
       
//       }
    
//   }
// //  console.log("filtered row data ",filteredRowData.length,insertedDataResult.length)

// //   console.log("filtered row data ",combinedData.length)
//   for (const item of filteredRowData) {
//     let deleteItem = false; // Flag to determine if the item should be deleted

//     // Loop over the partMasterResult to find a match
//     for (const element of partMasterResult) {
//       // if(item.part_number.trim().toLowerCase()=='06h906433d'){console.log("executed ",item,element)}
//       if (item.part_number.trim().toLowerCase() === element.partnumber1.trim().toLowerCase()) {
//         // Add the partid to the item if a match is found
//         item.partId = element.partID; // Directly mutate the original item
//         updatedFilteredRowData.push(item);
       
//         // Reset deleteItem flag as match was found
//         deleteItem = false;
//         break; // Exit the loop after finding the match
//       } else {
//         deleteItem = true;
//       }
//     }
//     // console.log("element ",item)
//     // console.log("updated filtered row ",updatedFilteredRowData)
//     // If no match was found, flag for deletion and add to partNotInMasterArray
//     if (deleteItem) {
//       const partnumber = item.part_number;
//     //    console.log("partnumber ",item)
//       const exists = partNotInMasterArray.some(
//         (item1) => item1.partnumber == partnumber
//       );
//       if (!exists) {
//         // console.log("exists ",partnumber)
//         partNotInMasterArray.push({ partnumber: partnumber });
//       }
//     }
//   }
//   // console.log("part not in master ",partNotInMasterArray)
//   // Create a map to track the occurrences of part_number and total stock_qty
//   const partCountMap = new Map();

//   // First, count the occurrences and accumulate stock_qty for each part_number
//   for (const element of updatedFilteredRowData) {
//     // Assuming partMasterResult contains part_number and stock_qty
//     // console.log("element ",element)
//     if (partCountMap.has(element.part_number)) {
//       // console.log("part ",element);
//       partCountMap.set(element.part_number, {
//         partId: element.partId,
//         count: partCountMap.get(element.part_number).count + 1,
//         stockQty:
//           parseFloat(partCountMap.get(element.part_number).stockQty) +
//           parseFloat(element.qty),
//       });
//     } else {
//       partCountMap.set(element.part_number, {
//         count: 1,
//         stockQty: parseFloat(element.qty),
//         partId: element.partId,
//       });
//     }

//   }
//  // console.log("part count ",partCountMap)

// //    console.log("updated filtered data ",partCountMap)
//   updatedFilteredRowData = Array.from(
//     partCountMap,
//     ([partNumber, { stockQty, partId }]) => ({
//       partNumber,
//       qty: stockQty,
//       partId: partId,
//     })
//   );
//       // console.log("updated filtered data ",updatedFilteredRowData);

//   let rowCount;
//   let currentDate;
//   let formattedDate;
//   let tCode;
//   currentDate = new Date();
  
//   formattedDate = currentDate.toISOString().split("T")[0]; // Outputs: '2025-03-08'
//   if (insertedDataResult.length != 0) {
    
//       updatedFilteredRowData.forEach((item) => {
//         // console.log(item)
//         let partID = item.partId;
//         let qty = item.qty;
  
//         for (let i = 0; i < insertedDataResult.length; i++) {
//           const element = insertedDataResult[i];
//           // console.log(element,partID)
//           if (element.partID === partID) {
//             // Add the qty to the item.qty
//             item.qty = qty + element.qty;
//              // Exit the loop after the first match
//           }
//         }
//       });

//       if(updatedFilteredRowData.length<insertedDataResult.length){
//         const updatedMap = new Map(updatedFilteredRowData.map(item => [item.partId, item]));

//         // Check for missing records in insertedDataResult
//         const missingRecords = insertedDataResult
//         .filter(item => !updatedMap.has(item.partID))
//         .map(item => ({
//           partNumber: item.partNumber,
//                 partId: item.partID,
//           qty: item.qty // Convert qty to an integer
//         }));
      
        
//         // console.log("Missing Records:", missingRecords);
        
//         updatedFilteredRowData.forEach(item => {
//           if (updatedMap.has(item.partId)) {
//               const existing = insertedDataResult.find(el => el.partID === item.partId);
//               // if (existing) {
//               //     item.qty = parseInt(existing.qty, 10);
//               // }
//               item.qty=parseFloat(item.qty)
//           }
//       });
      
        
//         // Add missing records to updatedFilteredRowData
//         for(let j=0;j<missingRecords.length;j++){
//           updatedFilteredRowData.push(missingRecords[j]);
    
//         }
        
//       } 
//   }
//   // console.log("updated filtered ",updatedFilteredRowData)
  
//     rowCount = updatedFilteredRowData?.length;
//     let insertQueryForCurrentStock1 = `use [StockUpload] insert into currentStock1(locationID,stockdate,addedby) output inserted.tcode values(@locationID,@formattedDate,@addedBy)`;
  
//     const result1 = await pool
//       .request()
//       .input("locationID", locationId)
//       .input("formattedDate", formattedDate)
//       .input("addedBy", addedBy)
//       .query(insertQueryForCurrentStock1);
//     let  StockCode1 = result1.recordset[0].tcode;
  
// //  console.log("part not in master ",partNotInMasterArray)
// if(partNotInMasterArray.length!=0){
//   const values = partNotInMasterArray.map((item) => {
//     return [
//       parseInt(brandId, 10), // Ensure brandId is an integer
//       item["partnumber"],
//     ];
//   });
//   try {
//     await pool.request().query('use stockupload')
//     const table = new sql.Table("part_not_in_master"); // Updated table name
//     table.create = false;

//     table.columns.add("brand_id", sql.Int, { nullable: true });
//     table.columns.add("partnumber", sql.VarChar(100), { nullable: true });
//     // Add rows to the table
//     values.forEach((row) => {
//       table.rows.add(
//         row[0],
//         row[1] // brandid
//       );
//     });
//    // console.log("values ",values)
//     await pool.request().bulk(table);
//   } catch (error) {
//     console.error("Error during bulk insert: part not in master", error);
//     return {error:error};// Rethrow the error for further handling if necessary
//   }
// }
  

//   // console.log(filteredRowData[0])
//   const values1 = updatedFilteredRowData.map((item) => {
//     return [
//       parseInt(StockCode1, 10),
//       item["partNumber"],
//       parseFloat(item["qty"]),
//       item["partId"],
//     ];
//   });

//   // console.log("values ",values1)
//   try {
//     await pool.request().query('use stockupload')
//     const table1 = new sql.Table("currentStock2"); // Updated table name
//     table1.create = false;

//     table1.columns.add("StockCode", sql.BigInt, { nullable: true });
//     table1.columns.add("PartNumber", sql.VarChar(35), { nullable: true });
//     table1.columns.add("Qty", sql.Decimal(18, 2), { nullable: true });
//     table1.columns.add("PartID", sql.Int, { nullable: true });
//     // Add rows to the table
//     values1.forEach((row) => {
//       table1.rows.add(
//         row[0],
//         row[1], // brandid
//         row[2],
//         row[3]
//       );
//     });
//     await pool.request().bulk(table1);
//   } catch (error) {
//     console.error("Error during bulk insert in single upload: ", error);
//     return {error:error};// Rethrow the error for further handling if necessary
//   }
//   let currentCountQuery = `use [StockUpload] select sum(qty) as currentQuantSum from currentStock2 where stockCode=@StockCode`;
//   let result678 = await pool
//     .request()
//     .input("StockCode", StockCode1)
//     .query(currentCountQuery);
//   let currentQuantSum = 0;
//   if (result678.recordset.length != 0) {
//     currentQuantSum = result678.recordset[0].currentQuantSum;
//   }

//   let logQuery = `use [StockUpload] insert into Stock_Upload_Logs(location_id,stockCode,added_by,brand_id, stockUploadCount,operation_type,quantitySum,
//       prevStockUploadCount,prevQuantitySum) values(@locationId,@StockCode,@addedBy,@brandId,@rowCount,'single-location upload stock',@currentQuantSum,@countPrevRecords,@quantitySumPrev)`;
//   await pool
//     .request()
//     .input("StockCode", StockCode1)
//     .input("addedBy", addedBy)
//     .input("currentQuantSum", currentQuantSum)
//     .input("brandId", brandId)
//     .input("locationId", locationId)
//     .input("rowCount", rowCount)
//     .input("quantitySumPrev", quantitySumPrev)
//     .input("countPrevRecords", countPrevRecords)
//     .query(logQuery);
    
//     if (insertedDataResult.length != 0) {
      
//       // console.log("quantity sum ",result567.recordset)
//       if (result567.recordset.length != 0) {
//         // console.log("quant sum prev ",quantitySumPrev);
//         let deleteQuery = `use [StockUpload] delete from currentStock2  where StockCode=@stockCode`;
//         await pool
//           .request()
//           .input("stockCode", insertedDataResult[0].StockCode)
//           .query(deleteQuery);
  
//         let deleteQuery1 = `use [StockUpload] delete from currentStock1  where tcode=@stockCode`;
//         await pool
//           .request()
//           .input("stockCode", insertedDataResult[0].StockCode)
//           .query(deleteQuery1);
//       }
  
     
//     }
//     let deleteCodeQuery=`use [StockUpload] delete from currentStock1 where tcode=@stockCode`;
//     await pool
//       .request()
//       .input("StockCode", StockCode)
//       .query(deleteCodeQuery);
//     let deleteStockQuery=`use [StockUpload] delete from currentStock2 where stockcode=@stockCode`;
//     let result569 = await pool
//       .request()
//       .input("StockCode", StockCode)
//       .query(deleteStockQuery);
//   return {
//     currentSumQuantity: currentQuantSum,
//     prevSumQuantity: quantitySumPrev,
//     currentRecords: rowCount,
//     prevRecords: countPrevRecords,
//   };
// };

const stockUploadSingleLocation = async (req, res) => {
  const pool = await getPool1();
  const { location_id: locationId, user_id: addedBy } = req.body;

  // 1. Fetch dealer and brandId
  const { recordset: [locationInfo] } = await pool.request()
    .input("locationId", locationId)
    .query(`USE [z_scope]; SELECT dealerId, brandId FROM locationInfo WHERE locationId = @locationId`);

  const { brandId, dealerId } = locationInfo;

  // 2. Fetch Excel column mapping for the brand
  const { recordset: mapping } = await pool.request()
    .input("brandId", brandId)
    .query(`USE [StockUpload]; SELECT part_number, stock_qty, loc,calculativeField, stock_type FROM stock_upload_mapping WHERE brand_id=@brandId AND stock_type='current'`);

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
        const formulaWithValues = formula.replace(/[a-zA-Z_][a-zA-Z0-9_]*/g, (match) => {
          const val = parseFloat(getVal(match));
          return isNaN(val) ? 0 : val;
        });
  
        try {
          return eval(formulaWithValues);
        } catch (err) {
          console.error("Error evaluating formula:", formulaWithValues, err);
          return 0;
        }
      } else {
        const val = parseFloat(getVal(mappedData.stock_qty));
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
    .query(`USE [z_scope]; SELECT partnumber1, partID FROM part_master WHERE brandId = @brandId`);
  const partMap = new Map(partMaster.recordset.map(p => [p.partnumber1.toLowerCase(), p.partID]));

  // 8. Get previous unrecognized parts
  const existingUnmatchedParts = new Set(
    (await pool.request()
      .input("brandId", brandId)
      .query(`USE [StockUpload]; SELECT partnumber FROM part_not_in_master WHERE brand_id = @brandId`)
    ).recordset.map(p => p.partnumber)
  );

  // Clear old unmatched records
  await pool.request().input("brandId", brandId).query(`USE [StockUpload]; DELETE FROM part_not_in_master WHERE brand_id = @brandId`);

  // 9. Map partIds and identify unknowns
  const knownParts = [];
  const unknownParts = [];

  for (const item of filteredData) {
    const id = partMap.get(item.part_number.toLowerCase());
    if (id) {
      knownParts.push({ ...item, partId: id });
    } else if (!existingUnmatchedParts.has(item.part_number)) {
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
    .query(`USE [StockUpload]; SELECT tcode FROM currentStock1 WHERE locationId=@locationId`);
  const oldTcode = prevStock.recordset[0]?.tcode || null;

  let prevQtySum = 0;
  let prevRecordCount = 0;

  if (oldTcode) {
    const { recordset: prevItems } = await pool.request()
      .input("StockCode", oldTcode)
      .query(`USE [StockUpload]; SELECT partNumber, qty, partID FROM currentStock2 WHERE StockCode=@StockCode`);
    prevRecordCount = prevItems.length;

    prevQtySum = (await pool.request()
      .input("StockCode", oldTcode)
      .query(`USE [StockUpload]; SELECT SUM(qty) AS QuantSum FROM currentStock2 WHERE StockCode=@StockCode`)
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
    .query(`USE [StockUpload]; INSERT INTO currentStock1(locationID, stockdate, addedby) OUTPUT inserted.tcode VALUES(@locationID, @formattedDate, @addedBy)`);

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
    .query(`USE [StockUpload]; SELECT SUM(qty) AS currentQuantSum FROM currentStock2 WHERE stockCode = @StockCode`)
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
    .query(`USE [StockUpload]; INSERT INTO Stock_Upload_Logs(location_id, stockCode, added_by, brand_id, stockUploadCount, operation_type, quantitySum, prevStockUploadCount, prevQuantitySum)
            VALUES(@locationId, @StockCode, @addedBy, @brandId, @rowCount, 'single-location upload stock', @currentQuantSum, @countPrevRecords, @quantitySumPrev)`);

  // 16. Delete old stock entries
  if (oldTcode) {
    await pool.request().input("stockCode", oldTcode).query(`USE [StockUpload]; DELETE FROM currentStock2 WHERE stockCode=@stockCode`);
    await pool.request().input("stockCode", oldTcode).query(`USE [StockUpload]; DELETE FROM currentStock1 WHERE tcode=@stockCode`);
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
    const pool = await getPool1();

    let locationId = req.location_id;

    let getBrandQuery = `use [z_scope] Select brandId from locationInfo where locationId=@locationId`;
    const result = await pool
      .request()
      .input("locationId", locationId)
      .query(getBrandQuery);
    let brandId = result.recordset[0].brandId;
    // console.log(brandId);
    let getQuery = `use [StockUpload] Select partnumber from part_not_in_master where brand_id=@brandId`;
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
    const pool = await getPool1();
    let locationId = req.location_id;
    let userId=req.added_by;
    let getQuery = `use [StockUpload] select added_on,added_by,stockUploadCount,quantitySum,prevQuantitySum,prevStockUploadCount from stock_upload_logs where location_id=@locationId and added_by=@userId`;

    const result = await pool
      .request()
      .input("locationId", locationId)
      .input("userId", userId)
      .query(getQuery);

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
    const pool = await getPool1();
    let locationId = req.location_id;
    let getQuery = `use [StockUpload] select ck2.partnumber,ck2.qty from currentStock2 ck2 join 
        currentStock1 ck1 on ck1.tcode=ck2.StockCode where locationId=@locationId`;

    const result = await pool
      .request()
      .input("locationId", locationId)
      .query(getQuery);

    return result.recordset;
  } catch (error) {
    console.log(
      "error in  stock upload service get upload data single location",
      error.message
    );
    return {error:error};
  }
};

// const stockUploadMultiLocation = async (req, res) => {
//   // console.log("req ",req.body.location_id,req.files);
//   const errorLogs=[];
//   try {
//     let location=req.body.location_id
//     let locations = req.body.location_id;
//     let quantitySumPrev = 0;
//     // console.log(typeof location)
//     if(typeof location=='string'){
//         locations=[location];
//     }
//     //  console.log("location ",locations)

//     let dealerId = parseInt(req.body.dealer_id);
//     let files = req.files;
//     // console.log(files,files[0].path)
//     const pool=await getPool1();
//     let addedBy = parseInt(req.body.user_id);

//     let brandQuery = `use [z_scope] select brandId,brand from locationInfo where dealerID=@dealerId`;
//     let brandRes = await pool
//       .request()
//       .input("dealerId", dealerId)
//       .query(brandQuery);
//     let brandId = parseInt(brandRes.recordset[0].brandId,10);
//     //  console.log("brandid in stock upload multi location ",brandId)
//     let getMappingQuery = `use [StockUpload] select part_number,stock_qty,loc,stock_type from stock_upload_mapping where brand_id=@brandId and stock_type='current'`;

//     const mappingResult = await pool
//       .request()
//       .input("brandId", brandId)
//       .query(getMappingQuery);

//     if (mappingResult.recordset.length == 0) {
//       return { mappingNotPresent: true };       
//     }
    
//     // console.log("mapped data in stock upload multi location ",mappedData);
//     let partMasterQuery = `use [z_scope] select partnumber1 ,partID from part_master where brandId=@brandId`;

//     const result = await pool
//       .request()
//       .input("brandId", brandId)
//       .query(partMasterQuery);
//     let partMasterResult = result.recordset;
//     // console.log(" part master result in stock upload multi location ",partMasterResult)
//     let partNotInMasterArray = [];
//     const getPartNumberQuery = `use [StockUpload] select partnumber as partnumber from part_not_in_master where brand_id=@brandId`;
//     let res123 = await pool
//       .request()
//       .input("brandId", brandId)
//       .query(getPartNumberQuery);
//     partNotInMasterArray = res123.recordset;
// //    console.log("part not in master in stock upload multi loc ",partNotInMasterArray)

//     let deletePartMasterQuery = `use [StockUpload] delete from part_not_in_master where brand_id=@brandId`;
//     await pool.request().input("brandId", brandId).query(deletePartMasterQuery);
   
//     for (let i = 0; i < locations.length; i++) {
//         // console.log("exexuted ")
//       let locationId = locations[i];
//       let updatedFilteredRowData = [];
//       let rowData;
//       let fileData;
//       let headers;
//       let rowDataArray=[];
//       if (brandId == 11 || brandId == 33) {
//         fileData = await readExcelFileWithSubColumns(files[i].path);
//         // rowData=fileData.data.splice(2);
//         rowDataArray = fileData.data.splice(1);
//       } else {
//         fileData = await readExcelFile(files[i].path);
//         // rowData=fileData.data.splice(1);
//         rowDataArray = fileData.data;
//       }
//       headers = fileData.headers;
//       // console.log("rowdata ",headers);
//       let mappedData = mappingResult.recordset[0];

//       const requiredBrandIds = [17, 28];
//       const normalizedHeaders = headers.map(header => header.trim().toLowerCase());
//       const isValid = Object.entries(mappedData)
//           .filter(([key]) => key !== 'stock_type' && key !== 'loc') // Exclude stock_type and loc
//           .every(([, value]) => headers.includes(value)); // Check if all values exist in headers
//      // console.log("mapped data ",mappedData)
//       // If brandId is 17, 28, check for "availability" and "status" in headers
//       if (requiredBrandIds.includes(brandId)) {
//           const requiredFields = ["availability","status"];
//           const hasRequiredFields = requiredFields.every(field => normalizedHeaders.includes(field));
//        // console.log("has required fields ",requiredFields)
//           if (!hasRequiredFields) {
//             //  return { headerNotPresent: true };
//             errorLogs.push({
//               locationId:locationId,
//               status:true,
//               log:'headerNotPresent'
//              })
//              continue;
            
//           }
//       }
//       if ([22].includes(brandId)) {
//         const requiredFields = ["availability"];
//         const hasRequiredFields = requiredFields.every(field => normalizedHeaders.includes(field));
        
//         if (!hasRequiredFields) {
//            // return { headerNotPresent: true };
//            errorLogs.push({
//             locationId:locationId,
//             status:true,
//             log:'headerNotPresent'
//            })
//            continue;
//         }
//       }
      
      
//       // Return false if general validation fails
//       if (!isValid) {
//         //  return { headerNotPresent: true };
//         errorLogs.push({
//           locationId:locationId,
//           status:true,
//           log:'headerNotPresent'
//          })
//         continue;
//       }
    
      
//     //   rowData = rowDataArray.map((rowData1) => {
//     //     // Find the correct keys dynamically (case insensitive)
//     //     const availabilityKey = Object.keys(rowData1).find(
//     //         (key) => key.toLowerCase() === "availability"
//     //     );
        
//     //     const statusKey = Object.keys(rowData1).find(
//     //         (key) => key.toLowerCase() === "status"
//     //     );
    
//     //     return {
//     //         part_number: rowData1[mappedData.part_number] != null 
//     //             ? rowData1[mappedData.part_number].toString().replace(/[^a-zA-Z0-9]/g, "") 
//     //             : "", 
            
//     //         qty: rowData1[mappedData.stock_qty] != null 
//     //             ? parseFloat(rowData1[mappedData.stock_qty]) || 0 
//     //             : 0, 
            
//     //         availability: availabilityKey && rowData1[availabilityKey] != null 
//     //             ? rowData1[availabilityKey].toString().trim() 
//     //             : "", 
            
//     //         status: statusKey && rowData1[statusKey] != null 
//     //             ? rowData1[statusKey].toString().trim() 
//     //             : "",
//     //     };
//     // });
//     const normalizedData = rowDataArray.map(row => {
//       const getVal = (key) => {
//         const match = Object.keys(row).find(k => k.toLowerCase() == key.toLowerCase());
//         return match ? row[match]?.toString().trim() : "";
//       };
  
//       return {
//         part_number: getVal(mappedData.part_number).replace(/[^a-zA-Z0-9]/g, ""),
//         qty: parseFloat(getVal(mappedData.stock_qty)) || 0,
//         availability: getVal("availability"),
//         status: getVal("status")
//       };
//     });
 
//       let query12=`use [StockUpload] Select tcode from currentStock1 where locationId=@locationId`;
//   let res45=await pool.request().input('locationId',locationId).query(query12);
//  let  StockCode=res45?.recordset[0]?.tcode;
//   let countPrevRecords=0;
//   let insertedDataResult=[];
// // console.log("tcode ",StockCode,locationId)
//   if(res45.recordset.length>0){
//      let quantityPrevQuery=`use [StockUpload] select sum(qty) as prevQuantSum from currentStock2 where StockCode=@StockCode`;
//      let res456=await pool.request().input('StockCode',StockCode).query(quantityPrevQuery);
//      quantitySumPrev=res456.recordset[0].prevQuantSum

//       let insertedDataQuery = `use [StockUpload] Select partNumber,partID,qty from currentStock2 where Stockcode=@StockCode`;
    
//       let result56 = await pool
//         .request()
//         .input("StockCode", StockCode)
//         .query(insertedDataQuery);
//        insertedDataResult = result56.recordset;
//       countPrevRecords = insertedDataResult.length;
     
//   }

//       //  console.log("mapped data ",mappedResult)
//     //   let filteredRowData = rowData.filter((row) => {
//     //     // Convert qty to a number safely (handle undefined/null cases)
//     //    // console.log("row ",row)
//     //     const stockQty = parseFloat(row.qty) ;
//     //     // console.log("parse int ",stockQty)
//     //     // Check if part_number exists and is not empty
//     //     const hasPartNumber = row.part_number && row.part_number.trim() !== "";
      
//     //     // Normalize headers
//     //     const availabilityHeader = Object.keys(headers).find(
//     //       (header) => {
//     //        // console.log("header to lowercase ",header,header.toLowerCase())
//     //         header.toLowerCase() == "availability"
    
//     //       }
//     //     );
//     //     const statusHeader = Object.keys(headers).find(
//     //       (header) => header.toLowerCase() == "status"
//     //     );
      
//     //    // console.log("avaiablitiy headers ",availabilityHeader)
//     //     // Get availability and status values
//     //     const availability = row["availability"]?.toLowerCase().trim();
//     //     const status = row["status"]?.toLowerCase().trim();
      
//     //     // Remove rows where part_number is null/empty and qty > 0
//     //     // if (hasPartNumber && stockQty > 0) {
//     //     //   return true;
//     //     // }
      
//     //     // For brandId 17, 28 remove if availability is "on-hand" and status is not "good"
//     //     if ((brandId == 17 || brandId == 28) && availability == "on hand" && status == "good" && hasPartNumber && stockQty > 0) {
//     //       return true;
//     //   }
//     // else
//     //   if (brandId == 22 && availability == "on hand" && hasPartNumber && stockQty > 0) {
        
//     //       return true;
//     //   }
    
//     //   if (![17, 22, 28].includes(brandId)) {
//     //     if (hasPartNumber && stockQty > 0) {
//     //       return true;
//     //     }
//     //   }
    
//     // return false;
//     //     // return true; // Keep the row if it passed all filters
//     //   });

//     let filteredRowData = normalizedData.filter((row) => {
//       const stockQty = parseFloat(row.qty);
//       const hasPartNumber = row.part_number && row.part_number.trim() !== "";
//       const availability = row["availability"]?.toLowerCase();
//       const status = row["status"]?.toLowerCase();
    
//       if ((brandId === 17 || brandId === 28)) {
//         return hasPartNumber && stockQty > 0 && availability === "on hand" && status === "good";
//       }
    
//       if (brandId === 22) {
//         return hasPartNumber && stockQty > 0 && availability === "on hand";
//       }
    
//       return hasPartNumber && stockQty > 0;
//     });


//        // console.log("filtered data in multi loc ",filteredRowData)
  
//       for (const item of filteredRowData) {
//         let deleteItem = false; // Flag to determine if the item should be deleted

//         // Loop over the partMasterResult to find a match
//         for (const element of partMasterResult) {
//             // console.log("part number ",element,"item ",item)
//           if (item.part_number.trim().toLowerCase() === element.partnumber1.trim().toLowerCase()) {
//             // Add the partid to the item if a match is found
//             item.partId = element.partID; // Directly mutate the original item
//             updatedFilteredRowData.push(item);
//             // Reset deleteItem flag as match was found
//             deleteItem = false;
//             break; // Exit the loop after finding the match
//           } else {
//             deleteItem = true;
//           }
//         }

//         // If no match was found, flag for deletion and add to partNotInMasterArray
//         if (deleteItem) {
//           const partnumber = item.part_number;
//         //   console.log("item in stock upload multi location ",item,partnumber)
//         //    console.log("partnumber ",partnumber,partNotInMasterArray[0])
//           const exists = partNotInMasterArray.some(
//             (item1) => item1.partnumber === partnumber
//           );
//           if (!exists) {
//             partNotInMasterArray.push({ partnumber: partnumber });
//           }
//         }
//       }
//     // console.log("partr not in master ",updatedFilteredRowData)
//     // console.log("inserted data ",insertedDataResult)

  
//     const partCountMap = new Map();

  
//     //    console.log("combined data wiht location id ",locationId,combinedData)
//       // First, count the occurrences and accumulate stock_qty for each part_number
//       for (const element of updatedFilteredRowData) {
//         // Assuming partMasterResult contains part_number and stock_qty
//         if (partCountMap.has(element.part_number)) {
//         //    console.log("part ",element);
//           partCountMap.set(element.part_number, {
//             partId: element.partId,
//             count: partCountMap.get(element.part_number).count + 1,
//             stockQty:
//               parseFloat(partCountMap.get(element.part_number).stockQty) +
//               parseFloat(element.qty),
//           });
//         } else {
//           partCountMap.set(element.part_number, {
//             count: 1,
//             stockQty: parseFloat(element.qty),
//             partId: element.partId,
//           });
//         }
//       }
//         //  console.log("part count ",partCountMap)
//     //    console.log("updated filtered data ",)
//     let updatedFilteredRowData1=[];
//       updatedFilteredRowData1 = Array.from(
//         partCountMap,
//         ([partNumber, { stockQty, partId }]) => ({
//           partNumber,
//           qty: stockQty,
//           partId: partId,
//         })
//       );
// // console.log("updated filtered data ",updatedFilteredRowData1);
// const combinedData = updatedFilteredRowData1.map(item => {
//     // Check if part_number exists
//     if (!item.partNumber) {
//     //   console.error(`Missing part_number in item:`, item);
//       return item; // Skip or handle the missing data
//     }
  
//     const match = insertedDataResult.find(additional => additional.partNumber === item.partNumber);
  
//     if (match) {
//       item.qty = (parseFloat(item.qty) + match.qty).toString();  // Ensure qty is a string
//     }
  
//     return item;
//   });
//   if(combinedData.length<insertedDataResult.length){
//     const updatedMap = new Map(combinedData.map(item => [item.partId, item]));

//    // console.log("updatedMap",insertedDataResult)
//     // Check for missing records in insertedDataResult
//     const missingRecords = insertedDataResult
//     .filter(item => !updatedMap.has(item.partID))
//     .map(item => ({
//       partNumber: item.partNumber,
//             partId: item.partID,
//       qty: parseFloat(item.qty) // Convert qty to an integer
//     }));
  
    
//   // console.log("Missing Records:", missingRecords);
    
//     combinedData.forEach(item => {
//       if (updatedMap.has(item.partId)) {
//           const existing = insertedDataResult.find(el => el.partID === item.partId);
//           // if (existing) {
//           //     item.qty = parseInt(existing.qty, 10);
//           // }

//           item.qty=parseFloat(item.qty)
//       }
//   });
//   //console.log("combined data 866",combinedData)
    
//     // Add missing records to updatedFilteredRowData
//     for(let j=0;j<missingRecords.length;j++){
//       combinedData.push(missingRecords[j]);

//     }
//   }

//  //  console.log("location id combine data ",locationId,combinedData)
//    // Create a map to track the occurrences of part_number and total stock_qty
//    let updatedFilteredRowData2=[];
//    updatedFilteredRowData2 =combinedData;
//      //  console.log("updated ",updatedFilteredRowData2)
//       let rowCount = updatedFilteredRowData2?.length;
//       let currentDate = new Date();
//       const formattedDate = currentDate.toISOString().split("T")[0]; // Outputs: '2025-03-08'
//       // console.log(formattedDate);
//       let insertQueryForCurrentStock1 = `use [StockUpload] insert into currentStock1(locationID,stockdate,addedby) output inserted.tcode values(@locationID,@formattedDate,@addedBy)`;

//       const result1 = await pool
//         .request()
//         .input("locationID", locationId)
//         .input("formattedDate", formattedDate)
//         .input("addedBy", addedBy)
//         .query(insertQueryForCurrentStock1);
//       let tCode = result1.recordset[0].tcode;
//       if(updatedFilteredRowData2.length>0){
//         const values1 = updatedFilteredRowData2.map((item) => {
//           return [
//             parseInt(tCode, 10),
//             item["partNumber"],
//             parseFloat(item["qty"]),
//             parseInt(item["partId"],10),
//           ];
//         });
//         try {
//           await pool.request().query('use stockupload')
//           const table1 = new sql.Table("currentStock2"); // Updated table name
//           table1.create = false;
  
//           table1.columns.add("StockCode", sql.BigInt, { nullable: true });
//           table1.columns.add("PartNumber", sql.VarChar(35), { nullable: true });
//           table1.columns.add("Qty", sql.Decimal(18, 2), { nullable: true });
//           table1.columns.add("PartID", sql.Int, { nullable: true });
//           // Add rows to the table
//           values1.forEach((row) => {
//             table1.rows.add(
//               row[0],
//               row[1], // brandid
//               row[2],
//               row[3]
//             );
//           });
//           await pool.request().bulk(table1);
          
//         }
//         catch (error) {
//           console.error("Error during bulk insert:", error);
//         //  return {error:error}; // Rethrow the error for further handling if necessary
//         errorLogs.push({
//           locationId:locationId,
//           status:true,
//           log:error
//          })
//         continue;
//         }

     
//       let currentCountQuery = `use [StockUpload] select sum(qty) as currentQuantSum from currentStock2 where stockCode=@tCode`;
//       let result678 = await pool
//         .request()
//         .input("tCode", tCode)
//         .query(currentCountQuery);
//       let currentQuantSum = 0;
//       if (result678.recordset.length != 0) {
//         currentQuantSum = result678.recordset[0].currentQuantSum;
//       }

//       let logQuery = `use [StockUpload] insert into Stock_Upload_Logs(location_id,stockCode,added_by,brand_id, stockUploadCount,operation_type,quantitySum,
// prevStockUploadCount,prevQuantitySum) values(@locationId,@tCode,@addedBy,@brandId,@rowCount,'multi-location upload stock',@currentQuantSum,@countPrevRecords,@quantitySumPrev)`;
//       await pool
//         .request()
//         .input("tCode", tCode)
//         .input("addedBy", addedBy)
//         .input("currentQuantSum", currentQuantSum)
//         .input("brandId", brandId)
//         .input("locationId", locationId)
//         .input("rowCount", rowCount)
//         .input("quantitySumPrev", quantitySumPrev)
//         .input("countPrevRecords", countPrevRecords)
//         .query(logQuery);

//         if(res45.recordset.length>0){
    
//           let deleteCodeQuery=`use [StockUpload] delete from currentStock1 where tcode=@stockCode`;
//           await pool
//             .request()
//             .input("StockCode", StockCode)
//             .query(deleteCodeQuery);
//           let deleteStockQuery1=`use [StockUpload] delete from currentStock2 where stockcode=@stockCode`;
//           let result569 = await pool
//             .request()
//             .input("StockCode", StockCode)
//             .query(deleteStockQuery1);
//         //   filteredRowData=insertedDataResult;
//       }
//     }
    
//   }

//     // console.log("part not in master in multi stock upload ",partNotInMasterArray)
//     if(partNotInMasterArray.length!=0){
//       const values = partNotInMasterArray.map((item) => {
//         return [
//           parseInt(brandId, 10), // Ensure brandId is an integer
//           item["partnumber"],
//         ];
//       });
//       try {
//         await pool.request().query('use stockupload')
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
//        // console.error("Error during bulk insert: part not in master", error);
//        // return {error:error}; // Rethrow the error for further handling if necessary
//        errorLogs.push({
//         locationId:locationId,
//         status:true,
//         log:error
//        })
       
//       }
//     }
   
//   } catch (error) {
//     console.log("error ", error.message);
//    // return {error:error};
//    errorLogs.push({
//     locationId:locationId,
//     status:true,
//     log:error
//    })
//   }

//   return errorLogs;
// };


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
    const pool=await getPool1();
    let addedBy = parseInt(req.body.user_id);

    // let brandQuery = `use [z_scope] select brandId,brand from locationInfo where dealerID=@dealerId`;
    // let brandRes = await pool
    //   .request()
    //   .input("dealerId", dealerId)
    //   .query(brandQuery);
    // let brandId = parseInt(brandRes.recordset[0].brandId,10);
    // //  console.log("brandid in stock upload multi location ",brandId)
    // let getMappingQuery = `use [StockUpload] select part_number,stock_qty,loc,stock_type from stock_upload_mapping where brand_id=@brandId and stock_type='current'`;

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
    // const getPartNumberQuery = `use [StockUpload] select partnumber as partnumber from part_not_in_master where brand_id=@brandId`;
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
  USE [StockUpload] 
  SELECT part_number, stock_qty, loc, stock_type ,calculativeField
  FROM stock_upload_mapping 
  WHERE brand_id = @brandId AND stock_type = 'current'
`;

const partMasterQuery = `
  USE [z_scope] 
  SELECT partnumber1, partID 
  FROM part_master 
  WHERE brandId = @brandId
`;

const getPartNumberQuery = `
  USE [StockUpload] 
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
    let deletePartMasterQuery = `use [StockUpload] delete from part_not_in_master where brand_id=@brandId`;
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
            console.log("Evaluating:", formulaWithValues);
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
 
  let query12=`use [StockUpload] Select tcode from currentStock1 where locationId=@locationId`;
  let res45=await pool.request().input('locationId',locationId).query(query12);
 let  StockCode=res45?.recordset[0]?.tcode;
  let countPrevRecords=0;
  let insertedDataResult=[];
//console.log("tcode ",StockCode,locationId)
  if(res45.recordset.length>0){
    //  let quantityPrevQuery=`use [StockUpload] select sum(qty) as prevQuantSum from currentStock2 where StockCode=@StockCode`;
    //  let res456=await pool.request().input('StockCode',StockCode).query(quantityPrevQuery);
    //  quantitySumPrev=res456.recordset[0].prevQuantSum

    //   let insertedDataQuery = `use [StockUpload] Select partNumber,partID,qty from currentStock2 where Stockcode=@StockCode`;
    
    //   let result56 = await pool
    //     .request()
    //     .input("StockCode", StockCode)
    //     .query(insertedDataQuery);
    //    insertedDataResult = result56.recordset;
    //   countPrevRecords = insertedDataResult.length;
    const combinedQuery = `
    USE [StockUpload];
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
      let insertQueryForCurrentStock1 = `use [StockUpload] insert into currentStock1(locationID,stockdate,addedby) output inserted.tcode values(@locationID,@formattedDate,@addedBy)`;

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
          await pool.request().query('use stockupload')
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
     
      let currentCountQuery = `use [StockUpload] select sum(qty) as currentQuantSum from currentStock2 where stockCode=@tCode`;
      let result678 = await pool
        .request()
        .input("tCode", tCode)
        .query(currentCountQuery);
      let currentQuantSum = 0;
      if (result678.recordset.length != 0) {
        currentQuantSum = result678.recordset[0].currentQuantSum;
      }

      let logQuery = `use [StockUpload] insert into Stock_Upload_Logs(location_id,stockCode,added_by,brand_id, stockUploadCount,operation_type,quantitySum,
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

        if (res45.recordset.length > 0) {
          // const deleteQuery = `
          //   USE [StockUpload];
          //   DELETE FROM currentStock1 WHERE tcode = @StockCode;
          //   DELETE FROM currentStock2 WHERE stockcode = @StockCode;
          // `;
        
          // await pool
          //   .request()
          //   .input("StockCode", StockCode)
          //   .query(deleteQuery);
        }
        await pool.request().input("StockCode", StockCode).query(`USE [StockUpload]; DELETE FROM currentStock2 WHERE StockCode=@StockCode`);
        await pool.request().input("StockCode", StockCode).query(`USE [StockUpload]; DELETE FROM currentStock1 WHERE tcode=@StockCode`);
        
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
        await pool.request().query('use stockupload')
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
        const pool = await getPool1();
        let locations=req.locations;
        let data=[];
        let userId=req.added_by;
        for(let i=0;i<locations.length;i++){
            let locationId =locations[i].location;
            let getQuery = `use [StockUpload] select location_id,added_on,added_by,stockUploadCount,quantitySum,prevQuantitySum,prevStockUploadCount from stock_upload_logs where location_id=@locationId and added_by=@userId`;
    
            let result = await pool
              .request()
              .input("locationId", locationId)
              .input("userId", userId)
              .query(getQuery);
        
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
  const pool = await getPool1();
  const locations = req.locations; 
  const archive = new yazl.ZipFile();

  try {
      for (let i = 0; i < locations.length; i++) {
          const locationId = locations[i].location;
          try {
              const getBrandQuery = `use [z_scope] SELECT location FROM locationInfo WHERE locationId = @locationId`;
              const result = await pool.request().input('locationId', locationId).query(getBrandQuery);
              let locationName = result.recordset[0]?.location; 

              let getQuery = `use [StockUpload] select ck2.partnumber,ck2.qty from currentStock2 ck2 join 
                  currentStock1 ck1 on ck1.tcode=ck2.StockCode where locationId=@locationId`;
              
              let result1 = await pool.request().input('locationId', locationId).query(getQuery);   

              let locationData = result1.recordset.length > 0 ? result1.recordset.map(record => ({
                  Location: locationName,
                  PartNumber: record.partnumber,
                  Quantity: record.qty
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

    const pool = await getPool1();
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
            const getQuery = `use [StockUpload] SELECT partnumber FROM part_not_in_master WHERE brand_id = @brandId`;
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

export {
  stockUploadSingleLocation,
  getPartNotInMasterSingleLocationInService,
  getAllRecordsSingleLocation,
  getUploadedDataSingleLocationInService,
  stockUploadMultiLocation,
  getUploadedDataMultiLocationInService,
  getPartNotInMasterMultiLocationInService,
  getAllRecordsMultiLocation
};
