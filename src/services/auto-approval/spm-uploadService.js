import { readExcel } from "../../utils/vonHelper.js";
import fs from 'fs'
import { getPool1 } from "../../db/db.js";
import { ApiError } from "../../utils/ApiError.js";
import sql from 'mssql'

const spmBulkCSUpload = async (LocationId, OrderType, file, userId) => {
  let { headers, data } = await readExcel(file);
  fs.unlinkSync(file); // Delete uploaded file after processing

  const REQUIRED_HEADERS = ["PartNumber", "Qty", "Remarks", "PartyName"];
  const missingHeaders = REQUIRED_HEADERS.filter(header => !headers.includes(header));

  if (missingHeaders.length > 0) {
    throw new ApiError(400, "Missing headers or data", [missingHeaders], '');
  }

  const isBlank = v =>
    v == null || (typeof v === "string" && v.trim() === "") || (typeof v === "number" && Number.isNaN(v));

  // objects where any required key is missing/blank
  const missingRows = data.filter(row => REQUIRED_HEADERS.some(k => isBlank(row[k])));

  //  include which keys are missing
  const issues = data
    .map((row, i) => ({ index: i, missing: REQUIRED_HEADERS.filter(k => isBlank(row[k])), row }))
    .filter(x => x.missing.length);

  if (missingRows.length != 0 || issues.length != 0) {
    throw new ApiError(400, `Data Incomplete`, { missingRows, issues }, '')
  }
  const formattedData = data.map((row) => ({
    ...row,
    LocationId: LocationId,
    OrderType: OrderType,
    Type: "S",
    UploadedBy: userId
  }))


  const partyMappingData = await partyNameCodeMapping(LocationId)
  if (!Array.isArray(partyMappingData) || partyMappingData.length == 0) {
    throw new ApiError(400, `No Matching Party found for Your Location `)
  }

  const norm = s => String(s ?? "").trim().toLowerCase();
  const idByName = new Map(
    partyMappingData.map(({ PartyName, Id }) => [norm(PartyName), Id])
  );

  const output = formattedData
    .map(({ PartNumber, Qty, PartyName, LocationId, OrderType, Type, Remarks, UploadedBy }) => {
      const PartyId = idByName.get(norm(PartyName));
      return PartyId != null ? { PartNumber, Qty, PartyId, LocationId, OrderType, Type, Remarks, UploadedBy } : null;
    })
    .filter(Boolean);

  return output
}

const spmMultiCSUpload = async (LocationId, OrderType, PartyName, file, userId) => {
  let { headers, data } = await readExcel(file);
  fs.unlinkSync(file); // Delete uploaded file after processing

  const REQUIRED_HEADERS = ["PartNumber", "Qty", "Remarks"];
  const missingHeaders = REQUIRED_HEADERS.filter(header => !headers.includes(header));
  if (missingHeaders.length > 0) {
    throw new ApiError(400, "Missing headers or data", missingHeaders, '');
  }
  const isBlank = v =>
    v == null || (typeof v === "string" && v.trim() === "") || (typeof v === "number" && Number.isNaN(v));

  // objects where any required key is missing/blank
  const missingRows = data.filter(row => REQUIRED_HEADERS.some(k => isBlank(row[k])));

  //  include which keys are missing
  const issues = data
    .map((row, i) => ({ index: i, missing: REQUIRED_HEADERS.filter(k => isBlank(row[k])), row }))
    .filter(x => x.missing.length);

  if (missingRows.length != 0 || issues.length != 0) {
    throw new ApiError(400, `Data Incomplete`, { missingRows, issues }, '')
  }
  const formattedData = data.map((row) => ({
    ...row,
    LocationId: LocationId,
    OrderType: OrderType,
    PartyName: PartyName,
    Type: "S",
    UploadedBy: userId
  }))


  const partyMappingData = await partyNameCodeMapping(LocationId)
  if (!Array.isArray(partyMappingData) || partyMappingData.length == 0) {
    throw new ApiError(400, `No Matching Party found for Your Location `)
  }

  const norm = s => String(s ?? "").trim().toLowerCase();
  const idByName = new Map(
    partyMappingData.map(({ PartyName, Id }) => [norm(PartyName), Id])
  );

  const output = formattedData
    .map(({ PartNumber, Qty, PartyName, LocationId, OrderType, Type, Remarks, UploadedBy }) => {
      const PartyId = idByName.get(norm(PartyName));
      return PartyId != null ? { PartNumber, Qty, PartyId, LocationId, OrderType, Type, Remarks, UploadedBy } : null;
    })
    .filter(Boolean);

  return output
}

const spmBulkWSUpload = async (LocationId, OrderType, file, userId) => {
  let { headers, data } = await readExcel(file);
  fs.unlinkSync(file); // Delete uploaded file after processing

  const REQUIRED_HEADERS = ["PartNumber", "Qty", "Remarks"];
  const missingHeaders = REQUIRED_HEADERS.filter(header => !headers.includes(header));

  if (missingHeaders.length > 0) {
    throw new ApiError(400, "Missing headers or data", missingHeaders, '');
  }
  const isBlank = v =>
    v == null || (typeof v === "string" && v.trim() === "") || (typeof v === "number" && Number.isNaN(v));

  // objects where any required key is missing/blank
  const missingRows = data.filter(row => REQUIRED_HEADERS.some(k => isBlank(row[k])));

  //  include which keys are missing
  const issues = data
    .map((row, i) => ({ index: i, missing: REQUIRED_HEADERS.filter(k => isBlank(row[k])), row }))
    .filter(x => x.missing.length);

  if (missingRows.length != 0 || issues.length != 0) {
    throw new ApiError(400, `Data Incomplete`, { missingRows, issues }, '')
  }
  const formattedData = data.map((row) => ({
    ...row,
    LocationId: LocationId,
    OrderType: OrderType,
    Type: "S",
    UploadedBy: userId
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
    "VehicleNumber", "VehicleModel", "JobType",
    "Advisor", "OrderType", "PartNumber", "Qty", "Remarks"
  ];
  const OR_HEADERS = [["AdvanceValue", "Estimate", "JobCardNumber"]]; // at least one must exist

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

  const ALLOWED = ["Normal", "Urgent", "Co-Dealer", "Transfer"];

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

const partyNameCodeMapping = async (LocationId) => {
  try {
    const pool = await getPool1()
    const query = `
        use z_scope
        select Id , PartyName , PartyCode from AAP_SPMPartyMaster
        where LocationId = ${LocationId}`

    const result = await pool.request().query(query)
    return result.recordset

  } catch (error) {
    throw new ApiError(500, `PartyMapping Error`, [error, error.message], 'Error in PartyNameCodeMapping');
  }
}

const stockViewService = async (file, LocationId, OrderType, userId) => {
  const pool = await getPool1()
  let { headers, data } = await readExcel(file);
  fs.unlinkSync(file);

  const formattedData = data.map((row) => ({
    ...row,
    LocationId: LocationId,
    OrderType: OrderType,
  }))

  const jsonPayload = JSON.stringify(formattedData);

  const result = await pool.request()
    .input('Json', sql.NVarChar(sql.MAX), jsonPayload)
    .input('BrandId', sql.Int, 9)           // or make this a function arg
    .execute('dbo.StockView_FromJson');


  return result.recordset


}

const partyAlreadyExistsCheck = async (data) => {
  const pool = await getPool1();

  // normalize helpers
  const toVarchar = (v, max = 30) =>
    v === undefined || v === null || (typeof v === 'string' && v.trim() === '')
      ? null
      : String(v).slice(0, max);

  // normalize input
  const rows = data.map(r => ({
    LocationId: Number(r.LocationId),
    PartyName: toVarchar(r.PartyName, 30),
    PartyCode: toVarchar(r.PartyCode, 30),
    CreatedBy: r.CreatedBy == null ? null : Number(r.CreatedBy)
  }));

  // collect distinct values
  const locs  = [...new Set(rows.map(r => r.LocationId))];
  const names = [...new Set(rows.map(r => r.PartyName).filter(v => v !== null))];
  const codes = [...new Set(rows.map(r => r.PartyCode).filter(v => v !== null))];

  // nothing to check
  if (names.length === 0 && codes.length === 0) return [];

  // build parameterized IN lists
  const req = pool.request();

  const locParams  = locs.map((_, i) => `@loc${i}`);
  const nameParams = names.map((_, i) => `@pn${i}`);
  const codeParams = codes.map((_, i) => `@pc${i}`);

  locs.forEach((v, i)  => req.input(`loc${i}`,  sql.Int,        v));
  names.forEach((v, i) => req.input(`pn${i}`,   sql.VarChar(30), v));
  codes.forEach((v, i) => req.input(`pc${i}`,   sql.VarChar(30), v));

  // build WHERE parts safely (avoid empty IN())
  const whereLoc   = `LocationId IN (${locParams.join(',')})`;
  const whereName  = names.length ? `PartyName IN (${nameParams.join(',')})` : '1=0';
  const whereCode  = codes.length ? `PartyCode IN (${codeParams.join(',')})` : '1=0';

  const query = `
    SELECT LocationId, PartyName, PartyCode
    FROM dbo.AAP_SPMPartyMaster
    WHERE ${whereLoc}
      AND ( ${whereName} OR ${whereCode} );
  `;

  const { recordset } = await req.query(query);

  // Build fast lookup: per-location sets of existing names/codes (case-insensitive)
  const existingByLoc = new Map();
  for (const r of recordset) {
    const key = r.LocationId;
    if (!existingByLoc.has(key)) existingByLoc.set(key, { names: new Set(), codes: new Set() });
    const entry = existingByLoc.get(key);
    if (r.PartyName != null) entry.names.add(String(r.PartyName).toLowerCase());
    if (r.PartyCode != null) entry.codes.add(String(r.PartyCode).toLowerCase());
  }

  // Decide which inputs already exist
  const alreadyExists = [];
  for (const r of rows) {
    const entry = existingByLoc.get(r.LocationId);
    if (!entry) continue;

    const nameHit = r.PartyName && entry.names.has(r.PartyName.toLowerCase());
    const codeHit = r.PartyCode && entry.codes.has(r.PartyCode.toLowerCase());

    if (nameHit || codeHit) {
      alreadyExists.push({
        ...r,
        conflictBy: nameHit && codeHit ? 'Both' : (nameHit ? 'PartyName' : 'PartyCode')
      });
    }
  }
  return alreadyExists;
};

const getduplicatesArray = async(arr)=>{
 const norm = v => (v == null ? "" : String(v).trim().toLowerCase());
  const keyOf = o => `${norm(o.PartyCode)}|${norm(o.PartyName)}`;

  const map = new Map();
  for (const item of arr) {
    const k = keyOf(item);
    const entry = map.get(k) || { sample: item, count: 0 };
    entry.count += 1;
    map.set(k, entry);
  }
  return [...map.entries()]
    .filter(([, e]) => e.count > 1)
    .map(([k, e]) => ({ key: k, count: e.count, sample: e.sample }));
}
export { getduplicatesArray,partyAlreadyExistsCheck, stockViewService, spmBulkCSUpload, spmMultiCSUpload, spmBulkWSUpload, spmBulkVehicleUpload, partyNameCodeMapping }