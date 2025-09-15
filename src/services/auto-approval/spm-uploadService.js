import { readExcel } from "../../utils/vonHelper.js";
import fs from 'fs'
import { getPool1 } from "../../db/db.js";
import { ApiError } from "../../utils/ApiError.js";

const spmBulkCSUpload = async(LocationId,OrderType , file , userId)=>{
        let {headers,data} = await readExcel(file); 
        fs.unlinkSync(file); // Delete uploaded file after processing
  
        const REQUIRED_HEADERS = ["PartNumber", "Qty", "Remarks" , "PartyName"];
        const missingHeaders = REQUIRED_HEADERS.filter(header => !headers.includes(header));
            
        if (missingHeaders.length > 0) {
            throw new ApiError(400,"Missing headers or data",[missingHeaders],'');
        }
        
        const isBlank = v =>
          v == null || (typeof v === "string" && v.trim() === "") || (typeof v === "number" && Number.isNaN(v));

        // objects where any required key is missing/blank
        const missingRows = data.filter(row => REQUIRED_HEADERS.some(k => isBlank(row[k])));

        //  include which keys are missing
        const issues = data
          .map((row, i) => ({ index: i, missing: REQUIRED_HEADERS.filter(k => isBlank(row[k])), row }))
          .filter(x => x.missing.length);

          if(missingRows.length != 0 || issues.length != 0){
            throw new ApiError(400,`Data Incomplete`,{ missingRows, issues },'')
          }
        const formattedData = data.map((row)=>({
            ...row,
            LocationId:LocationId,
            OrderType:OrderType,
            Type:"S",
            UploadedBy:userId
        }))
  

        const partyMappingData = await partyNameCodeMapping(LocationId)
        if(!Array.isArray(partyMappingData) || partyMappingData.length == 0){
          throw new ApiError(400,`No Matching Party found for Your Location `)
        }
        
        const norm = s => String(s ?? "").trim().toLowerCase();
        const idByName = new Map(
          partyMappingData.map(({ PartyName, Id }) => [norm(PartyName), Id])
        );

        const output = formattedData
          .map(({ PartNumber, Qty, PartyName, LocationId, OrderType, Type , Remarks , UploadedBy}) => {
            const PartyId = idByName.get(norm(PartyName));
            return PartyId != null ? { PartNumber, Qty, PartyId, LocationId, OrderType, Type , Remarks , UploadedBy} : null;
          })
          .filter(Boolean);

    return output
}

const spmMultiCSUpload = async(LocationId,OrderType , PartyName , file , userId)=>{
    let {headers,data} = await readExcel(file); 
    fs.unlinkSync(file); // Delete uploaded file after processing
  
    const REQUIRED_HEADERS = [ "PartNumber", "Qty", "Remarks" ];
    const missingHeaders = REQUIRED_HEADERS.filter(header => !headers.includes(header));
        if (missingHeaders.length > 0) {
            throw new ApiError(400,"Missing headers or data", missingHeaders,'');
        }
        const isBlank = v =>
          v == null || (typeof v === "string" && v.trim() === "") || (typeof v === "number" && Number.isNaN(v));

        // objects where any required key is missing/blank
        const missingRows = data.filter(row => REQUIRED_HEADERS.some(k => isBlank(row[k])));

        //  include which keys are missing
        const issues = data
          .map((row, i) => ({ index: i, missing: REQUIRED_HEADERS.filter(k => isBlank(row[k])), row }))
          .filter(x => x.missing.length);

          if(missingRows.length != 0 || issues.length != 0){
            throw new ApiError(400,`Data Incomplete`,{ missingRows, issues },'')
          }
        const formattedData = data.map((row)=>({
            ...row,
            LocationId:LocationId,
            OrderType:OrderType,
            PartyName:PartyName,
            Type:"S",
            UploadedBy:userId
        }))

        
        const partyMappingData = await partyNameCodeMapping(LocationId)
                if(!Array.isArray(partyMappingData) || partyMappingData.length == 0){
          throw new ApiError(400,`No Matching Party found for Your Location `)
        }

        const norm = s => String(s ?? "").trim().toLowerCase();
        const idByName = new Map(
          partyMappingData.map(({ PartyName, Id }) => [norm(PartyName), Id])
        );

        const output = formattedData
          .map(({ PartNumber, Qty, PartyName, LocationId, OrderType, Type , Remarks , UploadedBy }) => {
            const PartyId = idByName.get(norm(PartyName));
            return PartyId != null ? { PartNumber, Qty, PartyId, LocationId, OrderType, Type  , Remarks , UploadedBy} : null;
          })
          .filter(Boolean);

        return output
}

const spmBulkWSUpload = async(LocationId,OrderType , file , userId)=>{
    let {headers,data} = await readExcel(file); 
      fs.unlinkSync(file); // Delete uploaded file after processing
  
        const REQUIRED_HEADERS = ["PartNumber", "Qty", "Remarks" ];
        const missingHeaders = REQUIRED_HEADERS.filter(header => !headers.includes(header));
            
        if (missingHeaders.length > 0) {
            throw new ApiError(400,"Missing headers or data", missingHeaders,'');
        }
        const isBlank = v =>
          v == null || (typeof v === "string" && v.trim() === "") || (typeof v === "number" && Number.isNaN(v));

        // objects where any required key is missing/blank
        const missingRows = data.filter(row => REQUIRED_HEADERS.some(k => isBlank(row[k])));

        //  include which keys are missing
        const issues = data
          .map((row, i) => ({ index: i, missing: REQUIRED_HEADERS.filter(k => isBlank(row[k])), row }))
          .filter(x => x.missing.length);

        if(missingRows.length != 0 || issues.length != 0){
          throw new ApiError(400,`Data Incomplete`,{ missingRows, issues },'')
        }
        const formattedData = data.map((row)=>({
            ...row,
            LocationId:LocationId,
            OrderType:OrderType,
            Type:"S",
            UploadedBy:userId
        })) 
        return formattedData
}

// const spmBulkVehicleUpload = async(file, LocationId , userId)=>{
//   let {headers,data} = await readExcel(file); 
//     fs.unlinkSync(file); // Delete uploaded file after processing
    
//         // const REQUIRED_HEADERS = ["VehicleNumber","VehicleModel","JobCardNumber","JobType","Advisor","OrderType","PartNumber","Qty","Remarks","AdvanceValue","Estimate"];
//         // const missingHeaders = REQUIRED_HEADERS.filter(header => !headers.includes(header));
//         const H = headers.map(h => String(h).trim());


//         const REQUIRED_ALWAYS = [
//           "VehicleNumber","VehicleModel","JobCardNumber","JobType",
//           "Advisor","OrderType","PartNumber","Qty","Remarks"
//         ];

//         // At least one from each group must be present
//         const OR_HEADERS = [
//           ["AdvanceValue","Estimate"]
//         ];

//         const missingHeaders = [
//           // missing strict-required headers
//           ...REQUIRED_ALWAYS.filter(h => !H.includes(h)),
//           // missing any OR-group (if none of the group members exists)
//           ...OR_HEADERS.flatMap(group =>
//             group.some(h => H.includes(h)) ? [] : [`${group.join(" or ")}`]
//           ),
//         ];

//         // If you want to fail on header issues:
//         if (missingHeaders.length) {
//           throw new ApiError(400, "Missing headers", { missingHeaders });
//         }
            
//         // if (missingHeaders.length > 0) {
//         //   return res.status(400).json({
//         //     message: "Missing headers or data",
//         //     missingHeaders
//         //   });
//         // }
//         const isBlank = v =>
//           v == null || (typeof v === "string" && v.trim() === "") || (typeof v === "number" && Number.isNaN(v));

//         // objects where any required key is missing/blank
//         const missingRows = data.filter(row => REQUIRED_HEADERS.some(k => isBlank(row[k])));

//         //  include which keys are missing
//         const issues = data
//           .map((row, i) => ({ index: i, missing: REQUIRED_HEADERS.filter(k => isBlank(row[k])), row }))
//           .filter(x => x.missing.length);

//         if(missingRows.length != 0 || issues.length != 0){
//           throw new ApiError(400,`Data Incomplete`,{ missingRows, issues },'')
//         }
        
//         const formattedData = data.map((row)=>({
//             ...row,
//             LocationId:LocationId,
//             Type:"V",
//             UploadedBy:userId
//         }))
//         // console.log(`formattedData`,formattedData[0]);
        
//         return formattedData
// }
const spmBulkVehicleUpload = async (file, LocationId, userId) => {
  let { headers, data } = await readExcel(file); // make sure readExcel uses defval:null
  fs.unlinkSync(file);
  
  // --- Header-level checks ---
  const H = headers.map(h => String(h).trim()); // normalize headers

  const REQUIRED_ALWAYS = [
    "VehicleNumber","VehicleModel","JobType",
    "Advisor","OrderType","PartNumber","Qty","Remarks"
  ];
  const OR_HEADERS = [["AdvanceValue","Estimate","JobCardNumber"]]; // at least one must exist

  const missingHeaders = [
    ...REQUIRED_ALWAYS.filter(h => !H.includes(h)),
    ...OR_HEADERS.flatMap(group => group.some(h => H.includes(h)) ? [] : [`${group.join(" or ")}`]),
  ];

  if (missingHeaders.length) {
    throw new ApiError(400, "Missing headers", { missingHeaders });
  }

  // --- Row-level checks ---
  const isBlank = v =>
    v == null || (typeof v === "string" && v.trim() === "") || (typeof v === "number" && Number.isNaN(v));

  const rowIssues = [];
  data.forEach((row, i) => {
    const idx = i + 2; // if row 1 is header
    const missing = REQUIRED_ALWAYS.filter(k => isBlank(row[k]));
    // Enforce: at least one of AdvanceValue or Estimate must be present
    const bothMissing = isBlank(row.AdvanceValue) && isBlank(row.Estimate);
    if (missing.length || bothMissing) {
      const issues = [];
      if (missing.length) issues.push(...missing.map(f => ({ field: f, message: "Required" })));
      if (bothMissing) issues.push({ field: "AdvanceValue/Estimate", message: "At least one required" });
      rowIssues.push({ row: idx, issues, rowData: row });
    }
  });

  if (rowIssues.length) {
    throw new ApiError(400, "Data Incomplete", { rowIssues });
  }
  
// const ALLOWED = ["Normal","Urgent","Co-Dealer","Transfer"];
// const norm = v => String(v ?? "").trim(); // add .toLowerCase() if case-insensitive

// // distinct invalid values found in the sheet
// const distinctInvalid = [...new Set(
//   data.map(r => norm(r.OrderType)).filter(v => v && !ALLOWED.includes(v))
// )];

// // (optional) row-wise issues with row numbers
// const invalidRows = data
//   .map((r, i) => ({ row: i + 2, value: r.OrderType }))
//   .filter(x => !x.norm || !ALLOWED.includes(x.norm));

// // throw if any invalids
// if (invalidRows.length) {
//   throw new ApiError(400, "Invalid OrderType", { allowed: ALLOWED, invalidRows });
// }
  
const ALLOWED = ["Normal","Urgent","Co-Dealer","Transfer"];

const norm = v =>
  String(v ?? "")
    .normalize("NFKC")        // unify unicode
    .replace(/\s+/g, " ")     // collapse internal spaces
    .trim()
    .toLowerCase();

const allowedSet = new Set(ALLOWED.map(norm));

const invalidRows = data
  .map((r, i) => ({ row: i + 2, raw: r.OrderType, norm: norm(r.OrderType) }))
  .filter(x => !x.norm || !allowedSet.has(x.norm));

if (invalidRows.length) {
  throw new ApiError(400, "Invalid OrderType", {
    allowed: ALLOWED,
    invalidRows
  });
}

  // --- Format output ---
  const formattedData = data.map(row => ({
    ...row,
    LocationId,
    Type: "V",
    UploadedBy: userId
  }));

  return formattedData;
};

const partyNameCodeMapping = async(LocationId)=>{
try {
        const pool = await getPool1()
        const query = `
        use z_scope
        select Id , PartyName , PartyCode from AAP_SPMPartyMaster
        where LocationId = ${LocationId}`
      
        const result = await pool.request().query(query)
        return result.recordset

} catch (error) {
    throw new ApiError(500,`PartyMapping Error`,[error,error.message],'Error in PartyNameCodeMapping');
}
}

export {spmBulkCSUpload , spmMultiCSUpload , spmBulkWSUpload , spmBulkVehicleUpload}