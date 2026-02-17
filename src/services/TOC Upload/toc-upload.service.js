import { getPool } from "../../db/db.js";
import { readExcelFile } from "../utilities/utilities.service.js";
import sql from "mssql";


const singleTOCInService = async (req, res) => {
  try {
    const getPool = await getPool();
    const pool = await getPool();
    let locations = req.body.location_id;
    let location=req.body.location_id;
    let updatedBy=req.body.updatedBy;
    let logs=[];
     if(typeof location=='string'){
        locations=[location];
    }
  //  console.log("locations ",locations)
    // let addedBy = parseInt(req.body.user_id, 10);
    // let rowData;
    let brandId = parseInt(req.body.brand_id, 10);
    let dealerId = parseInt(req.body.dealer_id, 10);
    let date,date1;
    let formattedDate;
    if(req.body?.date){
     date = req.body.date;
    date1 = new Date(date);
      formattedDate = date1.toLocaleDateString("en-CA");
    }else{
     const today = new Date();
      formattedDate = today.toLocaleDateString("en-CA");
    }
   
    let uploadType=req?.uploadType;
    let mapping;

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
    const [mappingResult, partMasterRecords, partNotInMasterResult] =
      await Promise.all([
        pool.request().input("brandId", brandId).query(getMappingQuery),
        pool.request().input("brandId", brandId).query(partMasterQuery),
        pool.request().input("brandId", brandId).query(getPartNumberQuery),
      ]);

    mapping = mappingResult.recordset;

    if (!mapping.length) {
      // logs.push({log:'Brand Mapping not Available',status:true,locationId:-1})
      return { mappingNotPresent: true };
      
    }
    const mappedData = mapping[0];
   let files = req.files;
  //console.log("locations ",mappedData)
    for (let i = 0; i < locations.length; i++) {

     //   console.log(files[i].path)
      let locationId = parseInt(locations[i], 10);
      let fileData;
      fileData = await readExcelFile(files[i].path);

      if (!fileData.headers) {
        // return { isEmptyFile: true };
         logs.push({
          locationId:locationId,
          status:true,
          log:'File cannot Be Blank!.'
        })
      }

      const headers = fileData.headers.map((h) => h.trim()?.toLowerCase());
      let rowDataArray;

      rowDataArray = fileData.data.slice([33].includes(brandId) ? 1 : 0);

      const normalizedHeaders = headers.map((header) =>
        header.trim()?.toLowerCase()
      );
     // console.log("normalized headedrs ",normalizedHeaders)
      const isValid = Object.entries(mappedData)
        .filter(
          ([key]) =>
            key != "stock_type" &&
            key != "loc" &&
            key != "calculativeField" &&
            key != "stock_qty"
        ) // Exclude stock_type and loc
        .every(([, value]) =>
          normalizedHeaders.includes(value.trim().toLowerCase())
        ); // Check if all values exist in headers
    //  console.log("mapped data ", mappedData, headers, isValid);

      // Return false if general validation fails
      if (!isValid) {
        logs.push({
          locationId:locationId,
          status:true,
          log:'Required Headers are not present in the uploaded file!.'
        })
        // return { headerNotPresent: true };
      }

    //  console.log("row data ",mappedData)
      const normalizedData = rowDataArray.map((row) => {
        const getVal = (key) => {
          
          const match = Object.keys(row).find(
            (k) => k.toLowerCase() == key.toLowerCase()
          );
          const value = match ? row[match] : "";
          // console.log("match key",key,"value",value);
          return value != null ? value.toString().trim() : "";
        };

        return {
          part_number: getVal(mappedData.part_number).replace(
            /[^a-zA-Z0-9]/g,
            ""
          ),
          qty: getVal(mappedData.stock_qty)
        };
      });

    //  console.log("normalized data ",normalizedData)
      let filteredData = normalizedData.filter((row) => {
        let stockQty;
        if (brandId == 9) {
          stockQty = 1;
        } else {
          stockQty = parseFloat(row.qty);
        }
        const hasPartNumber =
          row.part_number &&
          row.part_number.trim() !== "" &&
          row.part_number != 0;

        if (brandId == 9) {
          return hasPartNumber && stockQty > 0;
        }

        return hasPartNumber && stockQty > 0;
      });

      const partMap = new Map(
        partMasterRecords.recordset.map((p) => [
          p.partnumber1.toLowerCase(),
          p.partID,
        ])
      );

      // 8. Get previous unrecognized parts
      let existingUnmatchedParts = [];
      existingUnmatchedParts = partNotInMasterResult.recordset;

      // 9. Map partIds and identify unknowns
      const knownParts = [];
    //  console.log("filteres d", filteredData)
      for (const item of filteredData) {
        const partNumber = item.part_number.toLowerCase();
        const id = partMap.get(partNumber);
        //console.log("existing unmatched  parts ",existingUnmatchedParts)

        const alreadyExists = existingUnmatchedParts.some(
          (p) => p.partnumber?.toLowerCase() == partNumber?.toLowerCase()
        );
        if (id) {
          knownParts.push({ ...item, partId: id });
          item.isPartNotInMaster = false;
        } else if (!alreadyExists) {
          existingUnmatchedParts.push({ partnumber: item.part_number });
          item.isPartNotInMaster = true;
          // console.log("unknown parts ",item.part_number)
        }
      }
      //console.log("existed ",existingUnmatchedParts)
      const notInMasterFalseItems = filteredData.filter(
        (item) => item.isPartNotInMaster == false
      );

     await syncPartNotInMaster(pool,filteredData,brandId,'sl');
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

    //  console.log("filtered data ", merged);
      const deduped = Array.from(merged.values());

      // 11. Check for previous stock for location
      // 14. Bulk insert to currentStock2

    //  console.log("depued ",deduped,formattedDate)
      if (deduped.length) {
        const deleteQuery = `delete from Temp_OGS_TOC where locationId=@locationId `;
        await getPool
          .request()
          .input("locationId", locationId)
          .query(deleteQuery);

        await getPool.request().query("use z_scope");
        const stockTable = new sql.Table("Temp_OGS_TOC");

        stockTable.columns.add("PartNumber", sql.VarChar(35), {
          nullable: false,
        });
        stockTable.columns.add("Qty", sql.Decimal(18, 2), { nullable: false });
        stockTable.columns.add("LocationID", sql.BigInt, { nullable: false });
        deduped.forEach((row) => {
          stockTable.rows.add(String(row.part_number), parseFloat(row.qty), locationId);
        });
        await getPool.request().bulk(stockTable);
        console.log("----",brandId,dealerId,locationId,formattedDate,updatedBy)
        const request = getPool.request();
        await request
          .input("brandId", brandId)
          .input("dealerId", dealerId)
          .input("locationId", locationId)
          .input("Date", formattedDate)
          .input("uploadedBy", updatedBy)
          .output("OUT", sql.VarChar(100));

        const result = await request.execute("USP_OGS_TOCUpload");
     //   console.log("result ", result,result?.output?.OUT);
        logs.push({status:result?.output?.OUT=='ERROR'?true:false,locationId:locationId
          ,allPartsNotInMaster:notInMasterFalseItems.length==0?0:-1,
          log:result?.output?.OUT=='ERROR'?'Internal Server Error':''
        })
        
      }
   
    }
    return logs
  } catch (error) {
    console.log("error in toc upload ", error);
  }
};


const bulkTOCInService=async (req,res)=>{


  try {
    const pool = await getPool();
    const getPool=await getPool();
    let addedBy = parseInt(req.body.user_id,10);
    let rowData;
    let brandId = parseInt(req.body.brand_id,10);
   // brandId=17
    let dealerId = parseInt(req.body.dealer_id,10);
    let currentDate = new Date();
    let updatedBy=req.body?.updatedBy;
    let wrongDealerLocationInFile = [];
    let date,date1;
    let formattedDate;
    if(req.body?.date){
     date = req.body.date;
    date1 = new Date(date);
      formattedDate = date1.toLocaleDateString("en-CA");
    }else{
     const today = new Date();
      formattedDate = today.toLocaleDateString("en-CA");
    }
   
    let getLocationsQuery = `use [z_scope] select locationId from locationInfo where dealerId=@dealerId`;
    let res56 = await pool
      .request()
      .input("dealerId", dealerId)
      .query(getLocationsQuery);

    let mappingResult;
      
         // 2. Fetch Excel column mapping for the brand
         let getMappingQuery = `use [z_scope] select part_number,stock_qty,loc,stock_type,calculativeField from stock_upload_mapping where brand_id=@brandId and stock_type='current'`;

          mappingResult = await pool
           .request()
           .input("brandId", brandId)
           .query(getMappingQuery);
    //console.log("mapping ",mappingResult.recordset)
    
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


   fileData= await readExcelFile(req.file.path);
   
     rowDataArray = fileData.data.slice([33].includes(brandId) ? 1 : 0);

    headers = fileData.headers;
     if(!headers){
        return {isEmptyFile:true}
      }
   
    const normalizedHeaders = headers.map((header) =>
      header.trim().toLowerCase()
    );
  // console.log(normalizedHeaders,mappedData)
    const isValid = Object.entries(mappedData)
      .filter(([key]) => key != 'stock_type'  && key!= 'calculativeField' && key!='stock_qty') // Exclude stock_type and loc
      .every(([, value]) => normalizedHeaders.includes(value.trim().toLowerCase())); // Check if all values exist in headers
      
    // Return false if general validation fails
    if (!isValid) {
      return { headerNotPresent: true };
    }

     // Step 1: Get headers from uploaded file (from the first row)
let headers1 = Object.keys(rowDataArray[0] || {}).map(h => h.toLowerCase());
    let result567;

    let normalizedData = rowDataArray.map(row => {
      const getVal = (key) => {
        const match = Object.keys(row).find(k => k.trim().toLowerCase() == key.trim().toLowerCase());
        const value = match ? row[match] : "";
        return value != null ? value.toString().trim() : "";
      };
    
      return {
            part_number: getVal(mappedData.part_number).replace(/[^a-zA-Z0-9]/g, ""),
            qty: getVal(mappedData.stock_qty) != null ? getVal(mappedData.stock_qty) : 0,
           
            location: getVal(mappedData.loc) != null ? getVal(mappedData.loc) : "",
          };
    });
  
    filteredRowData = normalizedData.filter((row) => {

        let stockQty;
        if(brandId==9){
            stockQty=1;
        }
        else{
            stockQty = parseFloat(row.qty);
        }
      
      let hasPartNumber = row.part_number && row.part_number.trim() !== "";
       let hasLocation=row.location && row.location.trim() !==''

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

    let updatedFilteredRowData = [];
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
 // console.log("partnot in master ",partNotInMasterArray)
  let isAlreadyExist=partNotInMasterArray.some(p=>p.partnumber.toLowerCase()==normalizedPartNumber)
 
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
        item.isPartNotInMaster=false;
    }
    if(isAlreadyExist){
       
          item.isPartNotInMaster=true;
    
    }
   
  } 
}

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
  } else {
    partCountMap.set(key, {
      part_number: item.part_number,
      qty: item.qty,
      partId: item.partId,
      locationId: item.locationId,
      count: 1,
      location: item.location || '',
    });
  }
}
// console.log("updated ",filteredRowData)
 const notInMasterFalseItems = updatedFilteredRowData.filter(item => item.isPartNotInMaster == false);
  await syncPartNotInMaster(pool,filteredRowData,brandId,'bl')

updatedFilteredRowData = Array.from(partCountMap.values());

    const uniqueLocationIds = [
      ...new Set(updatedFilteredRowData.map((item) => item.locationId)),
    ];

    let rowCount;

    rowCount = updatedFilteredRowData?.length;
    let combinedLogsLocationWise = [];
   
    for (let i = 0; i < uniqueLocationIds.length; i++) {
      let locationId = uniqueLocationIds[i];
     //  console.log("loctd ",locationId)
   
    //   console.log("unique ids  ",uniqueLocationIds)
      let filteredData = updatedFilteredRowData.filter(
        (item) => item.locationId == locationId
      );
    
  // console.log(updatedFilteredRowData)
      if(filteredData.length){
      // console.log("values ",values1);
      try {
        
    
      if (filteredData.length) {
        const deleteQuery = `delete from Temp_OGS_TOC where locationId=@locationId `;
        await getPool
          .request()
          .input("locationId", locationId)
          .query(deleteQuery);

        await getPool.request().query("use z_scope");
        const stockTable = new sql.Table("Temp_OGS_TOC");

        stockTable.columns.add("PartNumber", sql.VarChar(35), {
          nullable: false,
        });
        stockTable.columns.add("Qty", sql.Decimal(18, 2), { nullable: false });
        stockTable.columns.add("LocationID", sql.BigInt, { nullable: false });
        filteredData.forEach((row) => {
          stockTable.rows.add(String(row.part_number), parseFloat(row.qty), row.locationId);
        });
       // console.log("filtered data ",stockTable)
            await getPool.request().bulk(stockTable);
       
        const request = getPool.request();
        await request
          .input("brandId", brandId)
          .input("dealerId", dealerId)
          .input("locationId", locationId)
          .input("Date", formattedDate)
          .input("uploadedBy", updatedBy)
          .output("OUT", sql.VarChar(100));

        const result = await request.execute("USP_OGS_TOCUpload");
        //  console.log("result ", result);
    }
   
      } catch (error) {
        console.error("Error during bulk insert in single upload: ", error);
        return { error: error }; // Rethrow the error for further handling if necessary
      }
    }
      
  combinedLogsLocationWise.push({
         allPartsNotInMaster:notInMasterFalseItems.length==0?-1:0,
         locationId:locationId,
          inventoryLocationNotExist:[...inventoryLocationNotExist]
      });
  }
 

      

          
//     if (partNotInMasterArray.length != 0) {
//       //  console.log("part not in master ",partNotInMasterArray)

//       const deletePartMasterQuery = `
//   USE [z_scope]; 
//   DELETE FROM part_not_in_master WHERE brand_id = @brandId
// `;
// // Prepare both requests
// const deleteRequest = pool.request().input("brandId", brandId).query(deletePartMasterQuery);

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
  
    return combinedLogsLocationWise;
  } catch (error) {
    console.log(
      "error in bulk stock upload method in by user service ",
      error.message
    );
    return { error: error };
  }
};

const getRecordsInService=async (req,res)=>{

    try{

        let pool=await getPool();
        let locations=req.locations;
        let dealerId=req.dealerId;
        let records=[];
        console.log(req.locations)
        if(!req.locations){
            let getlocations=await pool.request().input('dealerId',dealerId)
            .query(`use z_scope select locationId from locationinfo where dealerId=@dealerId and status=1`);
            locations=getlocations.recordset;
           // console.log("locations ",locations,getlocations)
        }
        for(let i=0;i<locations.length;i++)
        {
            let locationId=parseInt(locations[i].locationId,10);
        //  console.log("locationid ",locationId)
            let getRecordsQuery=`use z_scope select prevRecordsCount,currentRecordsCount,prevSumQuantity,currentSumQuantity,addedOn
            ,tocDate,operation,locationId,userId,brandId,dealerId from tocUploadLogs where locationId=@locationId`;
            let result=await pool.request().input('locationId',locationId).query(getRecordsQuery);
            records.push(...result.recordset);
           // console.log(result.recordset)
        }

        return records;
    }
    catch(error){
        return error;
    }
}

async function syncPartNotInMaster(pool, data,brandId,operation) {
  const partNumbers = data.map(d => String(d.part_number).trim().toLowerCase());
  //console.log(data)
//  let notInMasterSet;
//   const masterSet = new Set(partMasterRecords.map(r => r.partnumber1.trim().toLowerCase()));
//   if(partNotInMasterRecords.length){

//       notInMasterSet = new Set(partNotInMasterRecords.map(r => r.partnumber.trim().toLowerCase()));
  //}

  let partNotInMaster;
  if(operation=='sl'){
      partNotInMaster=data.filter(obj=>obj.isPartNotInMaster==true)
  }else{
 partNotInMaster=data.filter(obj=>obj.isPartNotInMaster==false)
  }

  //console.log("partnot ",partNotInMaster)
  // 2. Perform bulk insert
  if (partNotInMaster.length > 0) {

        const table = new sql.Table("part_not_in_master");
        table.columns.add("brand_id", sql.Int);
        table.columns.add("partnumber", sql.VarChar(100));
        partNotInMaster.forEach((p) =>
          table.rows.add(brandId, p.part_number)
        );
        await pool.request().bulk(table);
       // console.log("inserted succesfully")
      }
  
  

  return { inserted: partNotInMaster };
}


export {
  singleTOCInService,
  bulkTOCInService,
  getRecordsInService
};
