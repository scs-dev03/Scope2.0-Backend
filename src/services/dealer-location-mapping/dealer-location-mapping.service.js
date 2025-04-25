import { getPool1 } from "../../db/db.js"
import {readExcelFile} from '../utilities/utilities.service.js'
import sql from 'mssql';
const addDealerLocationMappingInService=async (req,res)=>{
    try{
        let brandId=req.body.brand_id;
        let fileData;
        let rowData;
        let rowCount;
        let headers;
        let userId=parseInt(req.body.added_by,10);
        let filePath=req.file.path;
       let  isDealerAndLocationExist=true;        
        fileData=await readExcelFile(filePath)
        const pool=await getPool1();
        const dealerLocationNotInMaster = [];
        headers=fileData.headers;
        rowData=fileData.data;
        rowCount=rowData.length;
        let isDealerAndLocationNull;
        // console.log("brand Id ",brandId,rowCount,headers);
        if(headers?.length==0 || headers==undefined){
            isDealerAndLocationNull=true;
             return {isDealerAndLocationNull:isDealerAndLocationNull}
           }
     
        const  lowerCaseHeaders=headers.map((header)=> header.trim().toLowerCase());
        // console.log("lowe case ",!(lowerCaseHeaders.includes('dealer') && lowerCaseHeaders.includes('location') && lowerCaseHeaders.includes('inventory location')))
        if(!(lowerCaseHeaders.includes('dealer') && lowerCaseHeaders.includes('location') && lowerCaseHeaders.includes('inventory location'))){
            isDealerAndLocationExist=false
            //console.log("is dealer location exist in file ",isDealerAndLocationExist)
            return {isDealerAndLocationPresent:isDealerAndLocationExist};
        }

        // console.log("pahuch gya yha tak")
         isDealerAndLocationNull=await checkFields(rowData);
        //   console.log("is dealer location null in file ",isDealerAndLocationNull)

         if(isDealerAndLocationNull){
            return {isDealerAndLocationNull:isDealerAndLocationNull}
         }

         let getDealerAndLocationQuery='use z_scope Select dealer,location,dealerId,locationId from locationInfo where status=1 and dealerStatus=1 and brandId=@brandId';
         const res=await pool.request().input('brandId',brandId).query(getDealerAndLocationQuery);
         let dealerAndLocationResult=res.recordset;
        //  console.log("dealer location result",dealerAndLocationResult)
        //  let dealerLocationNotInMaster=[];
         rowData = Array.from(new Set(rowData.map(item => JSON.stringify(item))))
        .map(item => JSON.parse(item));
         rowData.forEach((row,index)=>{

            const normalizedItem=Object.keys(row).reduce((acc,key)=>{
                acc[key.trim().toLowerCase()]=row[key];
                return acc


            },{});
        
            rowData[index]=normalizedItem;
            // console.log(normalizedItem)
            // console.log("dealer location ",dealerAndLocationResult)
           
            const exists = dealerAndLocationResult.some(obj2 => obj2.dealer.trim().toLowerCase() === normalizedItem.dealer.trim().toLowerCase() && normalizedItem.location.trim().toLowerCase() === obj2.location.trim().toLowerCase());
    
            // console.log("exists ",exists)
    // If it does not exist, push the object into array2
            if (!exists) {
                dealerLocationNotInMaster.push(normalizedItem);
            }else{
                const matchingItem = dealerAndLocationResult.find(obj2 => {

                    return  obj2.dealer.trim().toLowerCase() == normalizedItem.dealer.toLowerCase() &&
                      normalizedItem.location.trim().toLowerCase() == obj2.location.toLowerCase()
                    
                });
            //   console.log("matching item ",matchingItem)

                  if (matchingItem) {
                    // Add `dealerId` and `locationId` to the normalized item
                    normalizedItem.dealerId = matchingItem.dealerId;
                    normalizedItem.locationId = matchingItem.locationId;
                  }
            }

           
        })
        //  console.log("dealer location not in master ",dealerLocationNotInMaster)

        if(dealerLocationNotInMaster.length!=0){
            return {dealerLocationNotInMasterPresent:true,dealerLocationNotInMaster:dealerLocationNotInMaster}
        }
            // console.log("rowData ",rowData)

            //validation- single inventory location is associated to the single location
       let rowData1= await validateInventoryLocations(rowData);
        //  console.log("rowdata 1",rowData1);
          if(rowData1.data.length!=0){
            return {multipleInventoryLocationsData:rowData1.data,multipleInventoryLocations:true}
          }
      let currentDateTime =await getCurrentDateTimeInIST();
      let operation= "create dealer location mapping"
            const values = rowData.map(item => {
               
                return [
                    parseInt(brandId, 10),  // Ensure brandId is an integer
                    parseInt(item["dealerId"], 10), // Ensure dealerId is an integer
                    item["inventory location"].toString(),  // Ensure inventory_location is a string
                    parseInt(item["locationId"], 10), // Ensure locationId is an integer
                    parseInt(userId, 10), // Ensure userId is an integer
                   operation,
                   item["dealer"],
                   item["location"]

            ]
            })

            // console.log("values ",values);
        
            try {
                await pool.request().query('use [StockUpload]')
            const table = new sql.Table('Dealer_Location_Mapping'); // Updated table name
            table.create = false;
        
            table.columns.add('brandId', sql.Int, { nullable: true }); 
            table.columns.add('dealerId', sql.Int, { nullable: true }); 
            table.columns.add('inventory_location', sql.VarChar(100), { nullable: true }); 
            table.columns.add('locationID', sql.Int, { nullable: true });
            table.columns.add('added_by', sql.Int, { nullable: true }); 
            //  table.columns.add('added_on', sql.DateTime, { nullable: true, default: sql`GETDATE()` }); 
            table.columns.add('operation', sql.VarChar(100), { nullable: true }); 
            table.columns.add('dealer', sql.VarChar(200), { nullable: true }); 
            table.columns.add('location', sql.VarChar(200), { nullable: true }); 
        
            // Add rows to the table
            values.forEach((row) => {
                table.rows.add(
                    row[0],  // brandid
                    row[1],  // dealerid
                    row[2],  // inventory_location
                    row[3],  // locationid
                    row[4],  // added_by
                    row[5],
                    row[6],   // operation
                    row[7],
                                   
                );
            });
            await pool.request().bulk(table);
            
           
        } catch (error) {
            console.error('Error during bulk insert:', error);
            return error; // Rethrow the error for further handling if necessary
        }

        let logQuery=` use [StockUpload] Insert into Stock_Upload_Logs(brand_id,added_by,operation_type,dealerLocationMappingRowCount) 
        values(@brandId,@userId,'create dealer location mapping',@rowCount)`;

        await pool.request().input('brandId',brandId)
        .input('userId',userId)
        .input('rowCount',rowCount).query(logQuery)

        return {insertedSuccessfully:true}
    }
    catch(error){
        console.log("error",error.message)
        return error;
    }
}

const checkFields=async(arr)=>{

   arr= await convertKeysToLowercase(arr);
  // console.log("arr ",arr)
   if(arr.length==0){
    return true;
   }
    return arr.some(item => (item.dealer === null || item.dealer==undefined || item.dealer=="") || item.location === null|| item.location==undefined || item.location=="" || item["inventory location"] ==null || item["inventory location"] ==undefined || item["inventory location"] =="" );
}
const convertKeysToLowercase = (arr) => {
    return arr.map(item => {
      const newItem = {};
      for (let key in item) {
        if (item.hasOwnProperty(key)) {
          newItem[key.trim().toLowerCase()] = item[key];
        }
      }
      return newItem;
    });
  };

//   async function validateInventoryLocations(data) {
//     const inventoryMap = {};
//     const multipleInventoryLocations = [];
//     const seenDuplicates = new Set(); // To avoid duplicate entries
  
//     for (const entry of data) {
//       const inventoryLoc = entry['inventory location'].replace(/[^a-zA-Z0-9-_ ]/g, '').trim().toLowerCase();
//       const location = entry.location.trim().toLowerCase();
//       const dealer = entry.dealer.trim().toLowerCase();
  
      
//       if (inventoryMap[inventoryLoc]) {
//         if (inventoryMap[inventoryLoc] !== location) {
//           const duplicateKey = `${inventoryLoc}::${location}::${dealer}`;
          
//           if (!seenDuplicates.has(duplicateKey)) {
//             multipleInventoryLocations.push({
//               Dealer: dealer,
//               Location: location,
//               ['Inventory Location']: inventoryLoc
//             });
//             seenDuplicates.add(duplicateKey);
  
//            // console.log(`❌ Inventory location "${inventoryLoc}" is assigned to multiple locations: "${inventoryMap[inventoryLoc]}" and "${location}".`);
//           }
//         }
//       } else {
//         inventoryMap[inventoryLoc] = location;
//       }
//     }
  
//     if (multipleInventoryLocations.length > 0) {
//       return {
//         status: false,
//         message: "Duplicate inventory locations found.",
//         data: multipleInventoryLocations
//       };
//     }
  
//     return {
//       status: true,
//       message: "✅ Validation passed. Each inventory location is unique to a location.",
//       data: []
//     };
//   }
async function validateInventoryLocations(data) {
    const dealerInventoryMap = {};
    const multipleInventoryLocations = [];
    const seenDuplicates = new Set();
  
    for (const entry of data) {
      const inventoryLoc = entry['inventory location'].replace(/[^a-zA-Z0-9-_ ]/g, '').trim().toLowerCase();
      const location = entry.location.trim().toLowerCase();
      const dealer = entry.dealer.trim().toLowerCase();
  
      const dealerKey = `${dealer}::${inventoryLoc}`;
  
      if (dealerInventoryMap[dealerKey]) {
        if (dealerInventoryMap[dealerKey] !== location) {
          const duplicateKey = `${dealer}::${inventoryLoc}::${location}`;
          if (!seenDuplicates.has(duplicateKey)) {
            multipleInventoryLocations.push({
              Dealer: dealer,
              Location: location,
              ['Inventory Location']: inventoryLoc
            });
            seenDuplicates.add(duplicateKey);
          }
        }
      } else {
        dealerInventoryMap[dealerKey] = location;
      }
    }
  
    if (multipleInventoryLocations.length > 0) {
      return {
        status: false,
        message: "Duplicate inventory locations found for the same dealer with different locations.",
        data: multipleInventoryLocations
      };
    }
  
    return {
      status: true,
      message: "✅ Validation passed. Each inventory location is uniquely assigned per dealer and location.",
      data: []
    };
  }
  
  


// const editDealerLocationMappingInService=async(req,res)=>{

//     try{
//         let brandId=req.body.brand_id;
//         const pool=await getPool1();
//         let getMappingQuery=`use [StockUpload]  Select dealerId,locationId,inventory_location as 'inventory location',location,id from dealer_location_mapping where brandId=@brandId `;
//         const res1=await pool.request().input('brandId',brandId).query(getMappingQuery);
//         let mappedData=res1.recordset;
//         let fileData;
//         let rowData;
//         let rowCount;
//         let headers;
//         let userId=parseInt(req.body.added_by,10);
//         let filePath=req.file.path;
//        let  isDealerAndLocationExist=true;        
//         fileData=await readExcelFile(filePath)
      
//         const dealerLocationNotInMaster = [];
//         headers=fileData.headers;
//         rowData=fileData.data;
       
//         const  lowerCaseHeaders=headers.map((header)=> header.trim().toLowerCase());
//         // console.log("lowercase headers ",lowerCaseHeaders)
//         if(!(lowerCaseHeaders.includes('dealer') && lowerCaseHeaders.includes('location') && lowerCaseHeaders.includes('inventory location'))){
//             isDealerAndLocationExist=false
//             // console.log("is dealer location exist in file ",isDealerAndLocationExist)
//             return {isDealerAndLocationPresent:isDealerAndLocationExist};
//         }

//          // console.log("headers ",headers,rowData)
        
//          let isDealerAndLocationNull=await checkFields(rowData);
//         //   console.log("is dealer location null in file ",isDealerAndLocationNull)
//       //  console.log("row data ",rowData)
//          if(isDealerAndLocationNull){
//             return {isDealerAndLocationNull:isDealerAndLocationNull}
//          }

//          let getDealerAndLocationQuery='use z_scope Select dealer,location,dealerId,locationId from locationInfo where status=1 and dealerStatus=1 and brandId=@brandId';
//          const res=await pool.request().input('brandId',brandId).query(getDealerAndLocationQuery);
//          let dealerAndLocationResult=res.recordset;
//         //  console.log("dealer location result",dealerAndLocationResult)
//         //  let dealerLocationNotInMaster=[];

//         // console.log("row data ",rowData)
//         // Create a Map for fast lookup
//         rowData = Array.from(new Set(rowData.map(item => JSON.stringify(item))))
//         .map(item => JSON.parse(item));
//        // console.log("row data after removing duplicate",rowData)
//         function normalizeText(value) {
//             return String(value || "") // Ensure it's a string
//                 .trim() // Remove leading/trailing spaces // Replace multiple spaces with a single space
//                 .replace(/\u00A0/g, " ") // Replace non-breaking spaces
//                 .toLowerCase(); // Convert to lowercase
//         }

// // Create a Map for fast lookup
// const dealerLocationMap = new Map();

//         // Normalize and store in the Map
//         dealerAndLocationResult.forEach(obj => {
//             const dealerKey = normalizeText(obj.dealer);
//             const locationKey = normalizeText(obj.location);
//             const key = `${dealerKey}|${locationKey}`;

//             dealerLocationMap.set(key, obj); // Store full object for retrieval
//         });

// //console.log("row data ",rowData)
// rowData.forEach((row, index) => {
//     // Normalize row keys and values
//     const normalizedItem = Object.keys(row).reduce((acc, key) => {
//         acc[key.trim().toLowerCase()] = (row[key]); // Ensure all values are strings
//         return acc;
//     }, {});

//     // Ensure `isMatch` is always a boolean (default `false`)
//     if (normalizedItem.isMatch === undefined) {
//         normalizedItem.isMatch = false; // Initialize `isMatch` if not set
//     }

//     rowData[index] = normalizedItem;

//     // Generate lookup key
//     const dealerKey = normalizeText(normalizedItem.dealer);
//     const locationKey = normalizeText(normalizedItem.location);
//     const lookupKey = `${dealerKey}|${locationKey}`;

//     // console.log(`🔎 Checking Dealer: '${dealerKey}', Location: '${locationKey}'`);

//     if (dealerLocationMap.has(lookupKey)) {
//         // Match found, update dealerId, locationId, and isMatch
//         const matchingItem = dealerLocationMap.get(lookupKey);
//         // console.log(`🔎 Checking Dealer: '${lookupKey}'`);
//         // ✅ Only update `isMatch` if it's still false
//         if (!normalizedItem.isMatch) {
//             normalizedItem.isMatch = true;
//             normalizedItem.dealerId = parseInt(matchingItem.dealerId,10);
//             normalizedItem.locationId = parseInt(matchingItem.locationId,10);
//         }

//         // console.log("✅ Match Found:", { dealerKey, locationKey, matchingItem });
//     } else {
//         // console.log("❌ No Match Found, keeping isMatch as:", normalizedItem.isMatch);
//     }
// });

// //console.log("rowDta",rowData)
// // ✅ After traversal, insert only unmatched rows into dealerLocationNotInMaster
//         rowData.forEach(item => {
//             if (!item.isMatch) {
//                 dealerLocationNotInMaster.push(item);
//                 // console.log("📌 Adding unmatched row to dealerLocationNotInMaster:", item);
//             }
//         });

//         //   console.log("dealer location not in master ",dealerLocationNotInMaster,rowData)
//         //   console.log("rowData ",dealerLocationNotInMaster)
//         if(dealerLocationNotInMaster.length!=0){
//             return {dealerLocationNotInMasterPresent:true,dealerLocationNotInMaster:dealerLocationNotInMaster}
//         }

//        // console.log("row data ",rowData)
//         let rowData1= await validateInventoryLocations(rowData);
//         //  console.log("rowdata 1",rowData1);
//           if(rowData1.data.length!=0){
//             return {multipleInventoryLocationsData:rowData1.data,multipleInventoryLocations:true}
//           }

//         await pool.request().query('use [StockUpload]') 
//         let operation="update dealer location mapping";
//          let normalizedRowData=[];
//        let updatedMappedData= mappedData.map((item)=>({
//             ...item,
//             isTraversed:false
//         }))

//         let mappedData1 = [...updatedMappedData];
//      //    console.log("updated mapped data ",mappedData1)
//         // rowData.forEach((item,index)=>{
//         //      //  console.log(item)

//         //     const isExist=mappedData1.some((element)=>{
//         //        // console.log("element ",element)
//         //         element.dealerId==parseInt(item.dealerId) && element.locationId==parseInt(item.locationId)});

//         //   //  console.log("isExist ",isExist,item)
//         //     if(!isExist){
//         //         normalizedRowData.push({
//         //             dealerId:parseInt(item?.dealerId),
//         //             locationId:parseInt(item?.locationId),
//         //             dealer:item?.dealer,
//         //             location:item?.location,
//         //             ["inventory location"]:item["inventory location"]
//         //         })  
//         //       //  console.log("normalidex data ",normalizedRowData)
//         //     }
//         //     else{
               
//         //         mappedData1 = mappedData1.map((element) => {
//         //             if (element.dealerId == parseInt(item.dealerId,10) && element.locationId == parseInt(item.locationId,10)) {
//         //                // console.log("element",element,item)
//         //                 return {
//         //                     id:element.id,
//         //                     dealerId:parseInt(item?.dealerId),
//         //                     locationId:parseInt(item?.locationId),
//         //                     dealer:item?.dealer,
//         //                     location:item?.location,
//         //                     ["inventory location"]:item["inventory location"],
//         //                     isTraversed: true
//         //                 };
//         //             }
//         //         //    return element;
//         //         });
//         //     }
            
//         // })
//       //  console.log("row data ",rowData)
      

//       const inventoryLocationMismatch = [];

// rowData.forEach((item) => {
//     const dealerId = parseInt(item.dealerId, 10);
//     const locationId = parseInt(item.locationId, 10);
//     const rowInventory=item["inventory location"].trim().toLowerCase()
//     const matchedEntry = mappedData1.find(
//         (element) =>
//             parseInt(element.dealerId, 10) == dealerId
//     );

//     if (matchedEntry) {
          
//         if(matchedEntry.dealerId==item.dealerId && matchedEntry.locationId==item.locationId && matchedEntry["inventory location"]==item["inventory location"]){
//             mappedData1 = mappedData1.map((element) => {
//                 if (matchedEntry.id==element.id) {
//                     return {
//                         ...element,
//                         dealerId,
//                         locationId,
//                         dealer: item.dealer,
//                         location: item.location,
//                         ["inventory location"]: item["inventory location"],
//                         isTraversed: true
//                     };
//                 }
//                 return element;
//             });

//         }
          
//         }
//      else {
       
//     }
// });

// if (inventoryLocationMismatch.length !== 0) {
//     return {
//         multipleInventoryLocationsData: inventoryLocationMismatch,
//         multipleInventoryLocations: true
//     };
// }

    
//         // console.log("mapped data",rowData,mappedData1)
//      // console.log("normalidex data ",normalizedRowData)
//      let  filteredNormalizedData=0;
//   //   console.log("filtered data ",normalizedRowData,mappedData1)
//      if(normalizedRowData.length >0){
//          filteredNormalizedData = normalizedRowData.filter(normItem => {
//            // console.log("nrom item ",normItem)
//             return !mappedData1.some(mappedItem =>

//             // console.log("mappeditem ",mappedItem)
//               mappedItem.dealerId == normItem.dealerId &&
//               mappedItem.locationId == normItem.locationId && mappedItem["inventory location"].trim().toLowerCase()==normItem["inventory location"].trim().toLowerCase()
        
//             );
//           });
//      }
//      else{
//         filteredNormalizedData=normalizedRowData
//      }
   
//     //  console.log("filtered normalized data ",filteredNormalizedData)
//         if(filteredNormalizedData.length!=0){
//             operation="create dealer location mapping"
//             const values = filteredNormalizedData.map(item => {
               
//                 return [
//                     parseInt(brandId, 10),  // Ensure brandId is an integer
//                     parseInt(item["dealerId"], 10), // Ensure dealerId is an integer
//                     item["inventory location"].toString(),  // Ensure inventory_location is a string
//                     parseInt(item["locationId"], 10), // Ensure locationId is an integer
//                     parseInt(userId, 10), // Ensure userId is an integer
//                    operation,
//                    item["dealer"],
//                    item["location"]
    
//             ]
//             })
//             try {
//                 const table = new sql.Table('Dealer_Location_Mapping'); // Updated table name
//                 table.create = false;
            
//                 table.columns.add('brandId', sql.Int, { nullable: true }); 
//                 table.columns.add('dealerId', sql.Int, { nullable: true }); 
//                 table.columns.add('inventory_location', sql.VarChar(100), { nullable: true }); 
//                 table.columns.add('locationID', sql.Int, { nullable: true });
//                 table.columns.add('added_by', sql.Int, { nullable: true }); 
//                 //  table.columns.add('added_on', sql.DateTime, { nullable: true, default: sql`GETDATE()` }); 
//                 table.columns.add('operation', sql.VarChar(100), { nullable: true }); 
//                 table.columns.add('dealer', sql.VarChar(200), { nullable: true }); 
//                 table.columns.add('location', sql.VarChar(200), { nullable: true }); 
            
//                 // Add rows to the table
//                 values.forEach((row) => {
//                     table.rows.add(
//                         row[0],  // brandid
//                         row[1],  // dealerid
//                         row[2],  // inventory_location
//                         row[3],  // locationid
//                         row[4],  // added_by
//                         row[5],
//                         row[6],   // operation
//                         row[7],                     
//                     );
//                 });
//                 await pool.request().bulk(table);
                
               
//             } catch (error) {
//                 console.error('Error during bulk insert:', error);
//                 return error; // Rethrow the error for further handling if necessary
//             }

           
//         }
        
//            //  console.log(mappedData1)
//             mappedData1.map(async (item)=>{
//               //  console.log(item)
//               if(item!==undefined){
//                 if(item?.isTraversed){
//                     operation="update dealer location mapping"
//                     let updateQuery=`use [stockUpload]  Update dealer_location_mapping set added_on=Getdate(),operation=@operation,inventory_location=@inventoryLocation,location=@location,locationId=@locationId,dealer=@dealer,dealerId=@dealerId where id=@id`;
//                     await pool.request().input('id',item.id)
//                     .input('inventoryLocation',item["inventory location"])
//                     .input('dealer',item.dealer)
//                     .input('operation',operation)
//                     .input('location',item.location)
//                     .input('locationId',item.locationId).input('dealerId',item.dealerId).query(updateQuery);
//                    // console.log("updatd succesfully")
//                 }
//               }
               
//             })
//             rowCount=rowData.length;

//             let logQuery=`use [stockUpload] Insert into Stock_Upload_Logs(brand_id,added_by,operation_type,dealerLocationMappingRowCount) 
//             values(@brandId,@userId,'update dealer location mapping',@rowCount)`;
    
//             await pool.request().input('brandId',brandId)
//             .input('userId',userId)
//             .input('rowCount',rowCount).query(logQuery)
    
//             return {insertedSuccessfully:true}
        

//     }
//     catch(error){
//         console.log("error in edit dealer location mapping in service ",error.message);
//         return error;
//     }
// }
const editDealerLocationMappingInService=async(req,res)=>{

    try{
        let brandId=req.body.brand_id;
        const pool=await getPool1();
        let getMappingQuery=`use [StockUpload]  Select dealerId,locationId,inventory_location as 'inventory location',location,id from dealer_location_mapping where brandId=@brandId `;
        const res1=await pool.request().input('brandId',brandId).query(getMappingQuery);
        let mappedData=res1.recordset;
        let fileData;
        let rowData;
        let rowCount;
        let headers;
        let isDealerAndLocationNull;
        let userId=parseInt(req.body.added_by,10);
        let filePath=req.file.path;
       let  isDealerAndLocationExist=true;        
        fileData=await readExcelFile(filePath)
      
        const dealerLocationNotInMaster = [];
        headers=fileData.headers;
        rowData=fileData.data;
        console.log("headers ",headers)
       if(headers?.length==0 || headers==undefined){
        isDealerAndLocationNull=true;
         return {isDealerAndLocationNull:isDealerAndLocationNull}
       }
        const  lowerCaseHeaders=headers?.map((header)=> header.trim().toLowerCase());
        // console.log("lowercase headers ",lowerCaseHeaders)
        if(!(lowerCaseHeaders.includes('dealer') && lowerCaseHeaders.includes('location') && lowerCaseHeaders.includes('inventory location'))){
            isDealerAndLocationExist=false
            // console.log("is dealer location exist in file ",isDealerAndLocationExist)
            return {isDealerAndLocationPresent:isDealerAndLocationExist};
        }

         // console.log("headers ",headers,rowData)
        
         isDealerAndLocationNull=await checkFields(rowData);
           console.log("is dealer location null in file ",isDealerAndLocationNull)
      //  console.log("row data ",rowData)
         if(isDealerAndLocationNull){
            return {isDealerAndLocationNull:isDealerAndLocationNull}
         }

         let getDealerAndLocationQuery='use z_scope Select dealer,location,dealerId,locationId from locationInfo where status=1 and dealerStatus=1 and brandId=@brandId';
         const res=await pool.request().input('brandId',brandId).query(getDealerAndLocationQuery);
         let dealerAndLocationResult=res.recordset;
        //  console.log("dealer location result",dealerAndLocationResult)
        //  let dealerLocationNotInMaster=[];

        // console.log("row data ",rowData)
        // Create a Map for fast lookup
        rowData = Array.from(new Set(rowData.map(item => JSON.stringify(item))))
        .map(item => JSON.parse(item));
       // console.log("row data after removing duplicate",rowData)
function normalizeText(value) {
    return String(value || "") // Ensure it's a string
        .trim() // Remove leading/trailing spaces // Replace multiple spaces with a single space
        .replace(/\u00A0/g, " ") // Replace non-breaking spaces
        .toLowerCase(); // Convert to lowercase
}

// Create a Map for fast lookup
const dealerLocationMap = new Map();

        // Normalize and store in the Map
        dealerAndLocationResult.forEach(obj => {
            const dealerKey = normalizeText(obj.dealer);
            const locationKey = normalizeText(obj.location);
            const key = `${dealerKey}|${locationKey}`;

            dealerLocationMap.set(key, obj); // Store full object for retrieval
        });

//console.log("row data ",rowData)
rowData.forEach((row, index) => {
    // Normalize row keys and values
    const normalizedItem = Object.keys(row).reduce((acc, key) => {
        acc[key.trim().toLowerCase()] = (row[key]); // Ensure all values are strings
        return acc;
    }, {});

    // Ensure `isMatch` is always a boolean (default `false`)
    if (normalizedItem.isMatch === undefined) {
        normalizedItem.isMatch = false; // Initialize `isMatch` if not set
    }

    rowData[index] = normalizedItem;

    // Generate lookup key
    const dealerKey = normalizeText(normalizedItem.dealer);
    const locationKey = normalizeText(normalizedItem.location);
    const lookupKey = `${dealerKey}|${locationKey}`;

    // console.log(`🔎 Checking Dealer: '${dealerKey}', Location: '${locationKey}'`);

    if (dealerLocationMap.has(lookupKey)) {
        // Match found, update dealerId, locationId, and isMatch
        const matchingItem = dealerLocationMap.get(lookupKey);
        // console.log(`🔎 Checking Dealer: '${lookupKey}'`);
        // ✅ Only update `isMatch` if it's still false
        if (!normalizedItem.isMatch) {
            normalizedItem.isMatch = true;
            normalizedItem.dealerId = parseInt(matchingItem.dealerId,10);
            normalizedItem.locationId = parseInt(matchingItem.locationId,10);
        }

        // console.log("✅ Match Found:", { dealerKey, locationKey, matchingItem });
    } else {
        // console.log("❌ No Match Found, keeping isMatch as:", normalizedItem.isMatch);
    }
});

//console.log("rowDta",rowData)
// ✅ After traversal, insert only unmatched rows into dealerLocationNotInMaster
        rowData.forEach(item => {
            if (!item.isMatch) {
                dealerLocationNotInMaster.push(item);
                // console.log("📌 Adding unmatched row to dealerLocationNotInMaster:", item);
            }
        });

        //   console.log("dealer location not in master ",dealerLocationNotInMaster,rowData)
        //   console.log("rowData ",dealerLocationNotInMaster)
        if(dealerLocationNotInMaster.length!=0){
            return {dealerLocationNotInMasterPresent:true,dealerLocationNotInMaster:dealerLocationNotInMaster}
        }

       // console.log("row data ",rowData)
        let rowData1= await validateInventoryLocations(rowData);
        //  console.log("rowdata 1",rowData1);
          if(rowData1.data.length!=0){
            return {multipleInventoryLocationsData:rowData1.data,multipleInventoryLocations:true}
          }

        await pool.request().query('use [StockUpload]') 
        let operation="update dealer location mapping";
         let normalizedRowData=[];
       let updatedMappedData= mappedData.map((item)=>({
            ...item,
            isTraversed:false
        }))

        let mappedData1 = [...updatedMappedData];
     //    console.log("updated mapped data ",mappedData1)
        // rowData.forEach((item,index)=>{
        //      //  console.log(item)

        //     const isExist=mappedData1.some((element)=>{
        //        // console.log("element ",element)
        //         element.dealerId==parseInt(item.dealerId) && element.locationId==parseInt(item.locationId)});

        //   //  console.log("isExist ",isExist,item)
        //     if(!isExist){
        //         normalizedRowData.push({
        //             dealerId:parseInt(item?.dealerId),
        //             locationId:parseInt(item?.locationId),
        //             dealer:item?.dealer,
        //             location:item?.location,
        //             ["inventory location"]:item["inventory location"]
        //         })  
        //       //  console.log("normalidex data ",normalizedRowData)
        //     }
        //     else{
               
        //         mappedData1 = mappedData1.map((element) => {
        //             if (element.dealerId == parseInt(item.dealerId,10) && element.locationId == parseInt(item.locationId,10)) {
        //                // console.log("element",element,item)
        //                 return {
        //                     id:element.id,
        //                     dealerId:parseInt(item?.dealerId),
        //                     locationId:parseInt(item?.locationId),
        //                     dealer:item?.dealer,
        //                     location:item?.location,
        //                     ["inventory location"]:item["inventory location"],
        //                     isTraversed: true
        //                 };
        //             }
        //         //    return element;
        //         });
        //     }
            
        // })
      //  console.log("row data ",rowData)
        const inventoryLocationMismatch = [];
        // console.log("row data ",mappedData1)
        rowData.forEach((item) => {
            console.log("row item ",item)
            let dealerId = parseInt(item.dealerId, 10);
            let locationId = parseInt(item.locationId, 10);
        //   console.log("dealerId  ",dealerId)
            // const matchedEntry = mappedData1.find(
            //     (element) =>{
            //       //  console.log("element in mapped data 1",element)
            //       return  element.dealerId == dealerId
            //     }
                   
            // );
          //  console.log("mapped data ",mappedData1)
            for(let row of mappedData1){
             //   console.log("row in mappeddata ",row)
                if(row.dealerId==dealerId){
                   
                    let matchedEntry=row;
                    const rowInventory = (item["inventory location"]).trim().toLowerCase();
                    const dbInventory = (matchedEntry["inventory location"]).trim().toLowerCase();
                   //   console.log("row inventory ",rowInventory,dbInventory)
                  const rowLocation=item["location"].trim().toLowerCase();
                  const dbLocation=matchedEntry.location.trim().toLowerCase();
                  if(rowLocation!=dbLocation){
                  
                    if(rowInventory!=dbInventory){
                        console.log("condition 1 executed ")
                        normalizedRowData.push({
                            dealerId:parseInt(item?.dealerId,10),
                            locationId:parseInt(item?.locationId,10),
                            dealer:item?.dealer,
                            location:item?.location,
                            ["inventory location"]:item["inventory location"]
                        })  
                    }
                    else{
                        console.log("condition 2 executed ")
                        const mismatch = {
                            dealer: item.dealer,
                            location: item.location,
                            "inventory location": item["inventory location"],
                            // dbInventory,
                            // dealerId,
                            // locationId,
                        };
    
                            const alreadyExists = inventoryLocationMismatch.some((entry) =>
                                entry.Dealer == mismatch.dealer &&
                                entry.Location == mismatch.location &&
                                entry["inventory location"] == mismatch["inventory location"] 
                                // entry.dbInventory == mismatch.dbInventory
                            );
                        // console.log("isalreaady exist ",alreadyExists,mismatch)
                            if (!alreadyExists) {
                                inventoryLocationMismatch.push(mismatch);
                            }
                        
                    }
                        
                
                  }
                  else{
                    if(rowInventory==dbInventory){
                        console.log("condition 3 executed ")
                        mappedData1 = mappedData1.map((item1) => {
                          //  console.log("ELEMENT ",element,item)
                            if (
                                item1.dealerId==item.dealerId && item1.locationId==item.locationId && item1['inventory location'].trim().toLowerCase()==rowInventory
                            ) {
                                return {
                                    ...item1,
                                    dealerId: parseInt(item?.dealerId, 10),
                                    locationId: parseInt(item?.locationId, 10),
                                    dealer: item?.dealer,
                                    location: rowLocation,
                                    ["inventory location"]: item["inventory location"],
                                    isTraversed: true
                                };
                            }
                            return item1;
                        });
     
                    }else{
                        console.log("condition 4 executed ")
                        const mismatch = {
                            dealer: item.dealer,
                            location: item.location,
                            "inventory location": item["inventory location"],
                            // dbInventory,
                            // dealerId,
                            // locationId,
                        };
                        const isExist= mappedData1.find((item1)=>item1.dealerId==item.dealerId && item1.locationId==item.locationId && item1['inventory location'].trim().toLowerCase()==rowInventory)
                        console.log("is exist ",isExist);
                        if(isExist){
                        
                          mappedData1= mappedData1.map(element=>
                            {
                              //  console.log("element and exist id ",element.id,isExist.id)
                               if( element.id==isExist.id){
                                return {...element,isTraversed:true}
                               }
                               else{
                                return element
                               }
                                
                           }
                        )
                      //  console.log("mapped data in condition ",mappedData1)
                        }
                        else{
                            normalizedRowData.push({
                                dealerId:parseInt(item?.dealerId,10),
                                locationId:parseInt(item?.locationId,10),
                                dealer:item?.dealer,
                                location:item?.location,
                                ["inventory location"]:item["inventory location"]
                            })   
                        }
                    }
                  }
                }  else{
                    normalizedRowData.push({
                        dealerId:parseInt(item?.dealerId),
                        locationId:parseInt(item?.locationId),
                        dealer:item?.dealer,
                        location:item?.location,
                        ["inventory location"]:item["inventory location"]
                    })  
                }
            }
          
          
        });
      //  console.log("normalize data ",normalizedRowData)
        
        
      //  console.log("mismatch ",inventoryLocationMismatch)
        if(inventoryLocationMismatch.length!=0){
            return {multipleInventoryLocationsData:inventoryLocationMismatch,multipleInventoryLocations:true}
        }
    
        // console.log("mapped data",rowData,mappedData1)
     // console.log("normalidex data ",normalizedRowData)
     let  filteredNormalizedData=0;
     if (normalizedRowData.length > 0) {
        // Filter out normalized rows that are already in mappedData1
        filteredNormalizedData = normalizedRowData.filter(normItem => {
          return !mappedData1.some(mappedItem =>
            mappedItem.dealerId === normItem.dealerId &&
            mappedItem.locationId === normItem.locationId &&
            mappedItem["inventory location"].trim().toLowerCase() === normItem["inventory location"].trim().toLowerCase()
          );
        });
      
        // Remove duplicates from the filtered list
        filteredNormalizedData = filteredNormalizedData.filter((item, index, self) =>
          index === self.findIndex(t =>
            t.dealerId === item.dealerId &&
            t.locationId === item.locationId &&
            t["inventory location"].trim().toLowerCase() === item["inventory location"].trim().toLowerCase()
          )
        );
      } else {
        // Just deduplicate normalizedRowData
        filteredNormalizedData = normalizedRowData.filter((item, index, self) =>
          index === self.findIndex(t =>
            t.dealerId === item.dealerId &&
            t.locationId === item.locationId &&
            t["inventory location"].trim().toLowerCase() === item["inventory location"].trim().toLowerCase()
          )
        );
      }
      
   
    //  console.log("filtered normalized data ",filteredNormalizedData)
        if(filteredNormalizedData.length!=0){
            operation="create dealer location mapping"
            const values = filteredNormalizedData.map(item => {
               
                return [
                    parseInt(brandId, 10),  // Ensure brandId is an integer
                    parseInt(item["dealerId"], 10), // Ensure dealerId is an integer
                    item["inventory location"].toString(),  // Ensure inventory_location is a string
                    parseInt(item["locationId"], 10), // Ensure locationId is an integer
                    parseInt(userId, 10), // Ensure userId is an integer
                   operation,
                   item["dealer"],
                   item["location"]
    
            ]
            })
            try {
                const table = new sql.Table('Dealer_Location_Mapping'); // Updated table name
                table.create = false;
            
                table.columns.add('brandId', sql.Int, { nullable: true }); 
                table.columns.add('dealerId', sql.Int, { nullable: true }); 
                table.columns.add('inventory_location', sql.VarChar(100), { nullable: true }); 
                table.columns.add('locationID', sql.Int, { nullable: true });
                table.columns.add('added_by', sql.Int, { nullable: true }); 
                //  table.columns.add('added_on', sql.DateTime, { nullable: true, default: sql`GETDATE()` }); 
                table.columns.add('operation', sql.VarChar(100), { nullable: true }); 
                table.columns.add('dealer', sql.VarChar(200), { nullable: true }); 
                table.columns.add('location', sql.VarChar(200), { nullable: true }); 
            
                // Add rows to the table
                values.forEach((row) => {
                    table.rows.add(
                        row[0],  // brandid
                        row[1],  // dealerid
                        row[2],  // inventory_location
                        row[3],  // locationid
                        row[4],  // added_by
                        row[5],
                        row[6],   // operation
                        row[7],
                      
                          
                       
                    );
                });
                await pool.request().bulk(table);
                
               
            } catch (error) {
                console.error('Error during bulk insert:', error);
                return error; // Rethrow the error for further handling if necessary
            }

           
        }
        
           //  console.log(mappedData1)
            mappedData1.map(async (item)=>{
              //  console.log(item)
              if(item!==undefined){
                if(item?.isTraversed){
                    operation="update dealer location mapping"
                    let updateQuery=`use [stockUpload]  Update dealer_location_mapping set added_on=Getdate(),operation=@operation,inventory_location=@inventoryLocation,location=@location,locationId=@locationId,dealer=@dealer,dealerId=@dealerId where id=@id`;
                    await pool.request().input('id',item.id)
                    .input('inventoryLocation',item["inventory location"])
                    .input('dealer',item.dealer)
                    .input('operation',operation)
                    .input('location',item.location)
                    .input('locationId',item.locationId).input('dealerId',item.dealerId).query(updateQuery);
                   // console.log("updatd succesfully")
                }
              }
               
            })
            rowCount=rowData.length;

            let logQuery=`use [stockUpload] Insert into Stock_Upload_Logs(brand_id,added_by,operation_type,dealerLocationMappingRowCount) 
            values(@brandId,@userId,'update dealer location mapping',@rowCount)`;
    
            await pool.request().input('brandId',brandId)
            .input('userId',userId)
            .input('rowCount',rowCount).query(logQuery)
    
            return {insertedSuccessfully:true}
        

    }
    catch(error){
        console.log("error in edit dealer location mapping in service ",error.message);
        return error;
    }
}

const exportUploadedData=async (req,res)=>{

    try{
        let brandId=req.brand_id;
        const pool=await getPool1();
        // console.log(brandId)
        let query=`use [stockUpload] Select dealer,location ,inventory_location,added_by,added_on,brandId from dealer_location_mapping where brandId=@brandId`;
        const result=await pool.request().input('brandId',brandId).query(query);

        //  console.log(result.recordset);

        return result.recordset;
    }
    catch(error){
        return error;
    }
}

const deleteQuery=async (updatedElement)=>{

    const pool=await getPool1();
    // console.log(updatedElement);
    let id=updatedElement.id;
    
    let deleteQuery=`use [StockUpload] Delete from dealer_location_mapping where id=@id `;

    await pool.request().input('id',id).query(deleteQuery);


}

const  getCurrentDateTimeInIST=async ()=> {
    
        // Get current date in UTC
        const nowUTC = new Date();
    
        // Convert UTC date to IST (Asia/Kolkata)
        const options = {
            timeZone: 'Asia/Kolkata', // IST timezone
        };
    
        // Create a new date object in IST
        const istDate = new Date(
            new Intl.DateTimeFormat('en-IN', options).format(nowUTC)
        );
    
        return istDate;
}

const viewDealerLocationMappingInService=async(req)=>{

    try{
        const pool=await getPool1();
        let brandId=req.brand_id;
        let added_by=req.user_id;
        
        let getDealerQuery=`use [stockUpload] Select dealer,location,added_on,inventory_location,status,id from dealer_location_mapping 
        where brandId=@brandId and added_by=@added_by `;
        const res= await pool.request().input('brandId',brandId)
        .input('added_by',added_by).query(getDealerQuery);

        return {data:res.recordset};

    }
    catch(error){
        console.log("error in view dealer location mapping in service ",error.message)
        return {error:error};
    }
}

const deleteDealerLocationMappingInService=async(req,res)=>{

    try{
        const pool=await getPool1();

        let added_by=req.user_id;
        let brandId=req.brand_id;
        let id=req.id;
        let status=req.status;
        let updateQuery=`Use [stockUpload] update dealer_location_mapping set status=@status ,added_by=@added_by, 
        added_on=getDate(),operation='update status' where  id=@id`;

        // .input('brandId',brandId)
        await pool.request()
        .input('added_by',added_by).input('id',id).input('status',status).query(updateQuery)
    }
    catch(error){
        console.log("error in dealer location in delete method in dl service ",error.message)
        return {error:error};
    }
}

export   {addDealerLocationMappingInService,exportUploadedData,
    editDealerLocationMappingInService,viewDealerLocationMappingInService,deleteDealerLocationMappingInService}
