import { readExcel } from "../../utils/vonHelper.js";
import fs from 'fs'
import { getPool1 } from "../../db/db.js";
import { ApiError } from "../../utils/ApiError.js";
import sql from 'mssql'
import { resourceLimits } from "worker_threads";

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
  const locs = [...new Set(rows.map(r => r.LocationId))];
  const names = [...new Set(rows.map(r => r.PartyName).filter(v => v !== null))];
  const codes = [...new Set(rows.map(r => r.PartyCode).filter(v => v !== null))];

  // nothing to check
  if (names.length === 0 && codes.length === 0) return [];

  // build parameterized IN lists
  const req = pool.request();

  const locParams = locs.map((_, i) => `@loc${i}`);
  const nameParams = names.map((_, i) => `@pn${i}`);
  const codeParams = codes.map((_, i) => `@pc${i}`);

  locs.forEach((v, i) => req.input(`loc${i}`, sql.Int, v));
  names.forEach((v, i) => req.input(`pn${i}`, sql.VarChar(30), v));
  codes.forEach((v, i) => req.input(`pc${i}`, sql.VarChar(30), v));

  // build WHERE parts safely (avoid empty IN())
  const whereLoc = `LocationId IN (${locParams.join(',')})`;
  const whereName = names.length ? `PartyName IN (${nameParams.join(',')})` : '1=0';
  const whereCode = codes.length ? `PartyCode IN (${codeParams.join(',')})` : '1=0';

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
        conflictBy: nameHit && codeHit ? 'Both Duplicates' : (nameHit ? 'PartyName' : 'PartyCode')
      });
    }
  }
  return alreadyExists;
};

const getduplicatesArray = async (arr) => {
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

// Checks if PhoneNo / Email already exist anywhere in the Advisor table.
// Input: array of { LocationId, Advisor, PhoneNo, Email, userId }
// Output: array of conflicted rows with conflictBy: 'PhoneNo' | 'Email' | 'Both'
const advisorAlreadyExistsCheck = async (data, tableName ) => {
  const pool = await getPool1();

  // --- helpers ---
  const normPhone = (v) => {
    if (v == null) return null;
    const s = String(v).replace(/\D+/g, '').trim();   // keep digits only
    return s.length ? s.slice(0, 10) : null;          // cap length defensively
  };
  const normEmail = (v) => {
    if (v == null) return null;
    const s = String(v).trim().toLowerCase();
    return s.length ? s.slice(0, 320) : null;         // RFC-ish max
  };
  const toIntOrNull = (v) => (v == null ? null : Number(v));

  // --- normalize incoming rows ---
  const rows = data.map(r => ({
    LocationId: toIntOrNull(r.LocationId),
    Advisor: r.Advisor == null ? null : String(r.Advisor).trim(),
    PhoneNo: normPhone(r.PhoneNo),
    Email: normEmail(r.Email),
    userId: toIntOrNull(r.userId)
  }));

  // --- collect distinct phones/emails (non-null) ---
  const phones = [...new Set(rows.map(r => r.PhoneNo).filter(Boolean))];
  const emails = [...new Set(rows.map(r => r.Email).filter(Boolean))];

  // nothing to check
  if (phones.length === 0 && emails.length === 0) return [];

  // --- whitelist table to avoid injection ---
  const ALLOWED_TABLES = new Set([
    'dbo.AAP_SPMAdvisorMaster',
    // add other valid advisor tables if any
  ]);
  if (!ALLOWED_TABLES.has(tableName)) {
    throw new ApiError(400, `Invalid table name: ${tableName}`, []);
  }

  // --- build parameterized IN lists ---
  const req = pool.request();

  const phoneParams = phones.map((_, i) => `@ph${i}`);
  const emailParams = emails.map((_, i) => `@em${i}`);

  phones.forEach((v, i) => req.input(`ph${i}`, sql.VarChar(20), v));
  emails.forEach((v, i) => req.input(`em${i}`, sql.VarChar(320), v));

  // Avoid empty IN() by guarding with 1=0 when list empty
  const wherePhone = phones.length ? `PhoneNo IN (${phoneParams.join(',')})` : '1=0';
  // Force case-insensitive compare regardless of DB collation
  const whereEmail = emails.length
    ? `LOWER(Email) IN (${emailParams.map(p => `LOWER(${p})`).join(',')})`
    : '1=0';

  const query = `
    SELECT PhoneNo, Email
    FROM ${tableName} WITH (NOLOCK)
    WHERE ${wherePhone} OR ${whereEmail};
  `;

  const { recordset } = await req.query(query);

  // --- build fast lookup sets ---
  const existingPhones = new Set(
    recordset.map(r => normPhone(r.PhoneNo)).filter(Boolean)
  );
  const existingEmails = new Set(
    recordset.map(r => normEmail(r.Email)).filter(Boolean)
  );

  // --- decide conflicts for each input row ---
  const conflicts = [];
  for (const r of rows) {
    const phoneHit = r.PhoneNo ? existingPhones.has(r.PhoneNo) : false;
    const emailHit = r.Email ? existingEmails.has(r.Email) : false;

    if (phoneHit || emailHit) {
      conflicts.push({
        ...r,
        conflictBy: phoneHit && emailHit ? 'Both' : (phoneHit ? 'PhoneNo' : 'Email')
      });
    }
  }
  return conflicts;
};

// Check if (LocationId, Advisor) already exists in the advisor table (case-insensitive, trimmed).
// Input: [{ LocationId, Advisor, PhoneNo?, Email?, userId? }, ...]
// Output: array of rows that clash, each with conflictBy: 'Advisor' and echo of the original row.
const findAdvisorOnLocation = async (
  data,
  tableName = 'dbo.AAP_SPMAdvisorMaster'  // change if your table differs
) => {
  const pool = await getPool1();

  // --- helpers ---
  const toIntOrNull = v => (v == null ? null : Number(v));
  const normAdvisor = v => {
    if (v == null) return null;
    // trim, collapse multiple spaces to single, lowercase, cap length
    const s = String(v).trim().replace(/\s+/g, ' ').toLowerCase();
    return s ? s.slice(0, 100) : null;
  };

  // --- normalize incoming rows ---
  const rows = data.map(r => ({
    LocationId: toIntOrNull(r.LocationId),
    AdvisorRaw: r.Advisor == null ? null : String(r.Advisor).trim(),
    AdvisorKey: normAdvisor(r.Advisor),
    PhoneNo: r.PhoneNo ?? null,
    Email: r.Email ?? null,
    userId: toIntOrNull(r.userId)
  }));

  // collect distinct locations and advisor names (normalized)
  const locs = [...new Set(rows.map(r => r.LocationId).filter(v => v != null))];
  const advisorKeys = [
    ...new Set(rows.map(r => r.AdvisorKey).filter(Boolean))
  ];

  // nothing to check
  if (locs.length === 0 || advisorKeys.length === 0) return [];

  // --- whitelist table to avoid injection ---
  const ALLOWED_TABLES = new Set([
    'dbo.AAP_SPMAdvisorMaster',
    // add other allowed advisor tables if needed
  ]);
  if (!ALLOWED_TABLES.has(tableName)) {
    throw new ApiError(400, `Invalid table name: ${tableName}`, []);
  }

  // --- build parameterized IN lists ---
  const req = pool.request();
  const locParams = locs.map((_, i) => `@loc${i}`);
  const advParams = advisorKeys.map((_, i) => `@adv${i}`);

  locs.forEach((v, i) => req.input(`loc${i}`, sql.Int, v));
  advisorKeys.forEach((v, i) => req.input(`adv${i}`, sql.VarChar(100), v)); // normalized key

  // SQL: fetch existing advisors for those locations with any of those normalized names
  // We normalize in SQL similarly: LOWER(TRIM(...)) and collapse spaces to one via REPLACE trick.
  // (SQL Server has no regex; the below approximates JS normalization enough for matching.)
  const normSql = `
    LOWER(
      LTRIM(RTRIM(
        REPLACE(REPLACE(REPLACE(Advisor, CHAR(13), ' '), CHAR(10), ' '), CHAR(9), ' ')
      ))
    )
  `;

  const query = `
    SELECT LocationId,
           Advisor,
           ${normSql} AS AdvisorKey
    FROM ${tableName} WITH (NOLOCK)
    WHERE LocationId IN (${locParams.join(',')})
      AND ${normSql} IN (${advParams.join(',')});
  `;

  const { recordset } = await req.query(query);

  // Build lookup: map of LocationId -> Set(normalized advisor names)
  const byLoc = new Map();
  for (const r of recordset) {
    const key = r.LocationId;
    if (!byLoc.has(key)) byLoc.set(key, new Set());
    if (r.AdvisorKey) byLoc.get(key).add(String(r.AdvisorKey));
  }

  // Decide conflicts
  const conflicts = [];
  for (const r of rows) {
    const set = byLoc.get(r.LocationId);
    const hit = !!(set && r.AdvisorKey && set.has(r.AdvisorKey));
    if (hit) {
      conflicts.push({
        ...r,
        conflictBy: 'Advisor'
      });
    }
  }

  return conflicts;
};

// const isPhoneEmailExists = async (phoneno, email, tableName) => {
//   try {
//     const pool = await getPool1()
//     const query = `use [z_scope] select * from ${tableName} where PhoneNo = @PhoneNo OR Email = @Email`

//     const result = await pool.request()
//       .input('PhoneNo', sql.VarChar(10), phoneno)
//       .input('Email', sql.VarChar, email)
//       .query(query)
//     return result.rowsAffected
//   } catch (error) {
//     throw new ApiError(500, `Unable to find existing PhoneNo and Email`, [error.message])
//   }
// }

export { findAdvisorOnLocation,advisorAlreadyExistsCheck, getduplicatesArray, partyAlreadyExistsCheck, stockViewService, spmBulkCSUpload, spmMultiCSUpload, spmBulkWSUpload, spmBulkVehicleUpload, partyNameCodeMapping }