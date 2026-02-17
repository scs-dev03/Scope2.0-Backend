import { getPool } from "../db/db.js";
import sql from 'mssql'
import { ApiError } from "./ApiError.js";

// normalize helpers
// export const normStr = (v, max = 30) =>
//   v == null ? null : String(v).trim().slice(0, max);

// export const isBlank = (v) =>
//   v == null ||
//   (typeof v === "string" && v.trim() === "") ||
//   (typeof v === "number" && Number.isNaN(v));

// // header check
// export function validateHeaders(headers, requiredHeaders) {
//   const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
//   return { ok: missingHeaders.length === 0, missingHeaders };
// }

// // row completeness (per required keys)
// export function findRowIssues(data, requiredKeys) {
//   const missingRows = data.filter(row => requiredKeys.some(k => isBlank(row[k])));
//   const issues = data
//     .map((row, i) => ({ index: i, missing: requiredKeys.filter(k => isBlank(row[k])), row }))
//     .filter(x => x.missing.length);
//   return { missingRows, issues, ok: issues.length === 0 };
// }

// // generic duplicate finder (returns ALL duplicate rows)
// export function getDuplicatesByKey(arr, keyFn) {
//   const counts = new Map();
//   for (const item of arr) {
//     const k = keyFn(item);
//     counts.set(k, (counts.get(k) || 0) + 1);
//   }
//   return arr.filter(item => counts.get(keyFn(item)) > 1);
// }

// // grouped duplicate summary (one representative per dup key)
// export function getDuplicateGroups(arr, keyFn) {
//   const map = new Map();
//   for (const item of arr) {
//     const k = keyFn(item);
//     const entry = map.get(k) || { sample: item, count: 0 };
//     entry.count += 1;
//     map.set(k, entry);
//   }
//   return [...map.entries()]
//     .filter(([, e]) => e.count > 1)
//     .map(([k, e]) => ({ key: k, count: e.count, sample: e.sample }));
// }

// // specific to Party data (case-insensitive, trimmed)
// export const partyKey = (o) =>
//   `${(normStr(o.PartyCode) ?? "").toLowerCase()}|${(normStr(o.PartyName) ?? "").toLowerCase()}`;

// // normalize Party rows (trim + cap length)
// export function normalizePartyRows(rows) {
//   return rows.map(r => ({
//     ...r,
//     PartyCode: normStr(r.PartyCode, 30),
//     PartyName: normStr(r.PartyName, 30),
//   }));
// }



// =========================
// Common / Party utilities
// =========================

// normalize helpers
export const normStr = (v, max = 30) =>
  v == null ? null : String(v).trim().slice(0, max);

export const isBlank = (v) =>
  v == null ||
  (typeof v === "string" && v.trim() === "") ||
  (typeof v === "number" && Number.isNaN(v));

// header check (exact match)
export function validateHeaders(headers, requiredHeaders) {
  const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
  return { ok: missingHeaders.length === 0, missingHeaders };
}

// (optional) header check - case-insensitive/trimmed
export function validateHeadersCI(headers, requiredHeaders) {
  const set = new Set((headers || []).map(h => String(h).trim().toLowerCase()));
  const missingHeaders = (requiredHeaders || [])
    .filter(h => !set.has(String(h).trim().toLowerCase()));
  return { ok: missingHeaders.length === 0, missingHeaders };
}

// row completeness (per required keys)
export function findRowIssues(data, requiredKeys) {
  const missingRows = data.filter(row => requiredKeys.some(k => isBlank(row[k])));
  const issues = data
    .map((row, i) => ({ index: i, missing: requiredKeys.filter(k => isBlank(row[k])), row }))
    .filter(x => x.missing.length);
  return { missingRows, issues, ok: issues.length === 0 };
}

// generic duplicate finder (returns ALL duplicate rows)
export function getDuplicatesByKey(arr, keyFn) {
  const counts = new Map();
  for (const item of arr) {
    const k = keyFn(item);
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  return arr.filter(item => counts.get(keyFn(item)) > 1);
}

// grouped duplicate summary (one representative per dup key)
export function getDuplicateGroups(arr, keyFn) {
  const map = new Map();
  for (const item of arr) {
    const k = keyFn(item);
    const entry = map.get(k) || { sample: item, count: 0 };
    entry.count += 1;
    map.set(k, entry);
  }
  return [...map.entries()]
    .filter(([, e]) => e.count > 1)
    .map(([k, e]) => ({ key: k, count: e.count, sample: e.sample }));
}

// specific to Party data (case-insensitive, trimmed)
export const partyKey = (o) =>
  `${(normStr(o.PartyCode) ?? "").toLowerCase()}|${(normStr(o.PartyName) ?? "").toLowerCase()}`;


function cleanPartyField(value, maxLen = 30) {
  const s = String(value ?? '').trim()
    .replace(/[^A-Za-z0-9 \-]/g, ''); // remove everything except space and '-'
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}
// normalize Party rows (trim + cap length)
export function normalizePartyRows(rows) {
  return rows.map(r => ({
    ...r,
    PartyCode: cleanPartyField(r.PartyCode, 30),
    PartyName: cleanPartyField(r.PartyName, 30),
  }));
}

// ==============================
// Advisor & generic extensions
// ==============================

// Lowercase normalizer (null-safe)
export const normLower = (v, max = 100) => (normStr(v, max) ?? "").toLowerCase();

// Phone & Email normalizers
export const normPhone = (v, max = 20) => {
  if (v == null) return null;
  const digits = String(v).replace(/\D+/g, "").trim();
  return digits ? digits.slice(0, max) : null;
};

export const normEmail = (v, max = 320) => {
  if (v == null) return null;
  const s = String(v).trim().toLowerCase();
  return s ? s.slice(0, max) : null;
};

// Normalize Advisor rows (trim/cap + phone/email cleanup)
export function normalizeAdvisorRows(rows) {
  return (Array.isArray(rows) ? rows : []).map(r => ({
    ...r,
    Advisor: normStr(r?.Advisor, 100),
    PhoneNo: normPhone(r?.PhoneNo, 20),
    Email: normEmail(r?.Email, 320),
  }));
}

// Duplicate key: (LocationId | advisorLower)
// Use when all rows already carry LocationId (recommended before DB insert)
export const advisorKeyByLoc = (o) =>
  `${Number(o.LocationId) || 0}|${normLower(o.Advisor, 100)}`;

// Optional: global duplicate keys for Phone or Email (useful for quick in-file checks)
export const advisorPhoneKey = (o) => (normPhone(o.PhoneNo, 20) ?? "");
export const advisorEmailKey = (o) => (normEmail(o.Email, 320) ?? "");

// Small helpers for building error payloads
export const pick = (obj, keys) =>
  Object.fromEntries(keys.filter(k => k in obj).map(k => [k, obj[k]]));

// Excel row calculator (header on row 1 by default)
export const excelRowOf = (dataIndex, headerRow = 1) => headerRow + 1 + dataIndex;

// ------------------------------------
// Advisor-specific in-file validations
// ------------------------------------

export function validateExcelRows(rows) {
  const issues = {
    // Row-only arrays (existing)
    missingAdvisor: [],          // [row]
    advisorTooLong: [],          // [row]
    invalidPhoneLength: [],      // [row]

    // New: row + value details
    missingAdvisorValues: [],    // [{ row, value }]
    advisorTooLongValues: [],    // [{ row, value }]
    invalidPhoneValues: [],      // [{ row, value }]

    duplicateAdvisors: [],       // { advisor, rows:[...] }
    duplicatePhones: [],         // { phone, rows:[...] }
    duplicateEmails: [],         // { email, rows:[...] }

    duplicateRows: [],           // { key, rows:[...] }  (JSON key)
    duplicateRowDetails: []      // { advisor, phone, email, rows:[...] }
  };

  // --- helpers ---
  const excelRowOf = (i) => i + 2; // header row = 1; first data row = 2

  const normStr = (v) => (v == null ? '' : String(v).trim());
  const normLower = (v) => normStr(v).toLowerCase();

  const normEmail = (v) => {
    const e = normLower(v);
    return e || ''; // empty if missing
  };

  // --- trackers ---
  const seenAdvisorToRows = new Map();  // advisorLower -> [rowNums]
  const seenRowKeyToRows = new Map();   // rowKey(JSON) -> [rowNums]
  const seenRowKeyToObj  = new Map();   // rowKey(JSON) -> { advisor, phone, email }

  const seenPhoneToRows  = new Map();   // phone (10-digit string) -> [rowNums]
  const seenEmailToRows  = new Map();   // lower -> [rowNums]

  (rows || []).forEach((raw, i) => {
    const rowNum = excelRowOf(i);

    const advisorRaw = normStr(raw?.Advisor);
    const advisorKey = normLower(raw?.Advisor);

    const phoneRaw = raw?.PhoneNo;
    const phoneStr = normStr(phoneRaw);

    const emailRaw = raw?.Email;
    const emailKey = normEmail(emailRaw);

    // --- Advisor checks ---

    // Missing advisor
    if (!advisorRaw) {
      issues.missingAdvisor.push(rowNum);
      issues.missingAdvisorValues.push({ row: rowNum, value: advisorRaw }); // will be ''
    }

    // Advisor length > 30
    if (advisorRaw && advisorRaw.length > 30) {
      issues.advisorTooLong.push(rowNum);
      issues.advisorTooLongValues.push({ row: rowNum, value: advisorRaw });
    }

    // Track duplicate advisors (ignore blank)
    if (advisorKey) {
      if (!seenAdvisorToRows.has(advisorKey)) seenAdvisorToRows.set(advisorKey, []);
      seenAdvisorToRows.get(advisorKey).push(rowNum);
    }

    // --- Phone checks ---

    // Phone present must be numeric and exactly 10 digits
    if (phoneStr) {
      const isTenDigitNumeric = /^\d{10}$/.test(phoneStr);
      if (!isTenDigitNumeric) {
        issues.invalidPhoneLength.push(rowNum);
        issues.invalidPhoneValues.push({
          row: rowNum,
          value: phoneRaw // original value from Excel
        });
      }
    }

    // Track duplicate phones (only if non-empty and valid 10-digit numeric)
    if (phoneStr && /^\d{10}$/.test(phoneStr)) {
      const phoneKey = phoneStr;
      if (!seenPhoneToRows.has(phoneKey)) seenPhoneToRows.set(phoneKey, []);
      seenPhoneToRows.get(phoneKey).push(rowNum);
    }

    // --- Email duplicates (no format validation here, only dupes) ---

    if (emailKey) {
      if (!seenEmailToRows.has(emailKey)) seenEmailToRows.set(emailKey, []);
      seenEmailToRows.get(emailKey).push(rowNum);
    }

    // --- Exact duplicate rows: Advisor + Phone + Email normalized ---

    const rowKeyObj = {
      advisor: advisorKey,
      phone: phoneStr ? phoneStr : '',
      email: emailKey
    };
    const rowKey = JSON.stringify(rowKeyObj);

    if (!seenRowKeyToRows.has(rowKey)) {
      seenRowKeyToRows.set(rowKey, []);
      seenRowKeyToObj.set(rowKey, rowKeyObj);
    }
    seenRowKeyToRows.get(rowKey).push(rowNum);
  });

  // --- Summaries (duplicates) ---

  for (const [adv, rowsArr] of seenAdvisorToRows.entries()) {
    if (rowsArr.length > 1) {
      issues.duplicateAdvisors.push({ advisor: adv, rows: rowsArr });
    }
  }

  for (const [ph, rowsArr] of seenPhoneToRows.entries()) {
    if (rowsArr.length > 1) {
      issues.duplicatePhones.push({ phone: ph, rows: rowsArr });
    }
  }

  for (const [em, rowsArr] of seenEmailToRows.entries()) {
    if (rowsArr.length > 1) {
      issues.duplicateEmails.push({ email: em, rows: rowsArr });
    }
  }

  for (const [key, rowsArr] of seenRowKeyToRows.entries()) {
    if (rowsArr.length > 1) {
      const obj = seenRowKeyToObj.get(key) || {};
      issues.duplicateRows.push({ key, rows: rowsArr });
      issues.duplicateRowDetails.push({
        advisor: obj.advisor,
        phone: obj.phone,
        email: obj.email,
        rows: rowsArr
      });
    }
  }

  const isValid =
    issues.missingAdvisor.length === 0 &&
    issues.advisorTooLong.length === 0 &&
    issues.invalidPhoneLength.length === 0 &&
    issues.duplicateAdvisors.length === 0 &&
    issues.duplicateRows.length === 0 &&
    issues.duplicatePhones.length === 0 &&
    issues.duplicateEmails.length === 0;

  return { isValid, issues };
}


// ---- Keys for single-column duplicate checks (case/trim insensitive)
export const partyCodeKeyOnly = (o) =>
  (normStr(o?.PartyCode, 30) ?? "").toLowerCase();

export const partyNameKeyOnly = (o) =>
  (normStr(o?.PartyName, 30) ?? "").toLowerCase();

// ---- Collect duplicate groups with Excel row numbers
export function findDupRowGroups(rows, keyFn, headerRow = 1) {
  const map = new Map(); // key -> [excelRowNums]
  (rows || []).forEach((r, i) => {
    const key = keyFn(r);
    if (!key) return; // ignore blanks
    const rowNum = headerRow + 1 + i; // header is row 1
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(rowNum);
  });
  return [...map.entries()]
    .filter(([, list]) => list.length > 1)
    .map(([key, rows]) => ({ key, rows }));
}

/**
 * Validate Party rows:
 *  - Missing PartyCode / PartyName
 *  - Duplicate PartyCode (column-wise)
 *  - Duplicate PartyName (column-wise)
 * (All checks are case/trim insensitive)
 */
export function validatePartyExcelRows(rows) {
  const rowsBothBlank = [];

  (rows || []).forEach((r, i) => {
    const rowNum = 1 + 1 + i; // header row = 1
    const codeBlank = isBlank(r?.PartyCode);
    const nameBlank = isBlank(r?.PartyName);
    if (codeBlank && nameBlank) rowsBothBlank.push(rowNum); // at least one required
  });

  // Duplicates per column (case/trim-insensitive). Blank values are ignored.
  const duplicatePartyCodes = findDupRowGroups(rows, partyCodeKeyOnly);
  const duplicatePartyNames = findDupRowGroups(rows, partyNameKeyOnly);

  const isValid =
    rowsBothBlank.length === 0 &&
    duplicatePartyCodes.length === 0 &&
    duplicatePartyNames.length === 0;

  return {
    isValid,
    issues: {
      rowsBothBlank,
      duplicatePartyCodes,   // [{ key:'vishu123', rows:[2,3,4] }, ...]
      duplicatePartyNames,   // [{ key:'testing', rows:[...]}]
    },
  };
}

// export function validateCommonRows(data, { allowDuplicates = false } = {}) {
//   const isBlank = v =>
//     v == null ||
//     (typeof v === "string" && v.trim() === "") ||
//     (typeof v === "number" && Number.isNaN(v));

//   const norm = s => String(s ?? "").trim().toLowerCase();
//   const partRegex = /^[A-Za-z0-9]+$/;

//   const missingCells = [];
//   const invalidPartChars = [];
//   const duplicateParts = [];

//   // Only track duplicates when disallowed
//   const partSeen = allowDuplicates ? null : new Map();
//   const partRows = allowDuplicates ? null : new Map();

//   const cleaned = data.map((row, i) => {
//     const PartNumber = row.PartNumber;
//     const Qty = row.Qty;

//     // Missing fields
//     const details = [];
//     if (isBlank(PartNumber)) details.push({ field: "PartNumber", message: "PartNumber is required" });
//     if (isBlank(Qty)) details.push({ field: "Qty", message: "Qty is required" });
//     if (details.length) missingCells.push({ index: i, conflictBy: "MissingCell", details, row });

//     // Char rule
//     if (!isBlank(PartNumber) && !partRegex.test(String(PartNumber))) {
//       invalidPartChars.push({
//         index: i,
//         conflictBy: "InvalidPartNumber",
//         field: "PartNumber",
//         value: PartNumber,
//         message: "PartNumber must be alphanumeric only (no spaces or special characters)",
//         row
//       });
//     }

//     // Track for duplicates only if not allowed
//     if (!allowDuplicates && !isBlank(PartNumber)) {
//       const key = norm(PartNumber);
//       partSeen.set(key, (partSeen.get(key) || 0) + 1);
//       if (!partRows.has(key)) partRows.set(key, []);
//       partRows.get(key).push(i);
//     }

//     return {
//       ...row,
//       PartNumber: isBlank(PartNumber) ? PartNumber : String(PartNumber).trim(),
//       Qty: isBlank(Qty) ? Qty : Number(Qty)
//     };
//   });

//   // Expand duplicate errors if disallowed
//   if (!allowDuplicates) {
//     for (const [key, count] of partSeen.entries()) {
//       if (count > 1) {
//         const idxs = partRows.get(key) || [];
//         for (const i of idxs) {
//           const value = cleaned[i].PartNumber;
//           duplicateParts.push({
//             index: i,
//             conflictBy: "DuplicatePartNumber",
//             field: "PartNumber",
//             value,
//             message: "Duplicate PartNumber",
//             row: data[i]
//           });
//         }
//       }
//     }
//   }

//   const errors = [];
//   if (missingCells.length) errors.push({ conflictBy: "MissingCell", items: missingCells });
//   if (invalidPartChars.length) errors.push({ conflictBy: "InvalidPartNumber", items: invalidPartChars });
//   if (duplicateParts.length) errors.push({ conflictBy: "DuplicatePartNumber", items: duplicateParts });

//   return { cleaned, errors };
// }
// export function validateCommonRows(data, { allowDuplicates = false } = {}) {
//   const isBlank = v =>
//     v == null ||
//     (typeof v === "string" && v.trim() === "") ||
//     (typeof v === "number" && Number.isNaN(v));

//   const norm = s => String(s ?? "").trim().toLowerCase();
//   const partRegex = /^[A-Za-z0-9]+$/;

//   const missingCells = [];
//   const invalidPartChars = [];
//   const invalidQty = [];              // <-- NEW
//   const duplicateParts = [];

//   // Only track duplicates when disallowed
//   const partSeen = allowDuplicates ? null : new Map();
//   const partRows = allowDuplicates ? null : new Map();

//   const cleaned = data.map((row, i) => {
//     const PartNumber = row.PartNumber;
//     const Qty = row.Qty;

//     // Missing fields
//     const details = [];
//     if (isBlank(PartNumber)) details.push({ field: "PartNumber", message: "PartNumber is required" });
//     if (isBlank(Qty)) details.push({ field: "Qty", message: "Qty is required" });
//     if (details.length) missingCells.push({ index: i, conflictBy: "MissingCell", details, row });

//     // Char rule
//     if (!isBlank(PartNumber) && !partRegex.test(String(PartNumber))) {
//       invalidPartChars.push({
//         index: i,
//         conflictBy: "InvalidPartNumber",
//         field: "PartNumber",
//         value: PartNumber,
//         message: "PartNumber must be alphanumeric only (no spaces or special characters)",
//         row
//       });
//     }

//     // Qty must be > 0 (only when Qty is present; NaN/blank handled above)
//     const qtyNum = Number(Qty);
//     if (!isBlank(Qty) && (Number.isNaN(qtyNum) || qtyNum <= 0)) {
//       invalidQty.push({
//         index: i,
//         conflictBy: "InvalidQty",
//         field: "Qty",
//         value: Qty,
//         message: "Qty must be greater than 0",
//         row
//       });
//     }

//     // Track for duplicates only if not allowed
//     if (!allowDuplicates && !isBlank(PartNumber)) {
//       const key = norm(PartNumber);
//       partSeen.set(key, (partSeen.get(key) || 0) + 1);
//       if (!partRows.has(key)) partRows.set(key, []);
//       partRows.get(key).push(i);
//     }

//     return {
//       ...row,
//       PartNumber: isBlank(PartNumber) ? PartNumber : String(PartNumber).trim(),
//       Qty: isBlank(Qty) ? Qty : qtyNum
//     };
//   });

//   // Expand duplicate errors if disallowed
//   if (!allowDuplicates) {
//     for (const [key, count] of partSeen.entries()) {
//       if (count > 1) {
//         const idxs = partRows.get(key) || [];
//         for (const i of idxs) {
//           const value = cleaned[i].PartNumber;
//           duplicateParts.push({
//             index: i,
//             conflictBy: "DuplicatePartNumber",
//             field: "PartNumber",
//             value,
//             message: "Duplicate PartNumber",
//             row: data[i]
//           });
//         }
//       }
//     }
//   }

//   const errors = [];
//   if (missingCells.length) errors.push({ conflictBy: "MissingCell", items: missingCells });
//   if (invalidPartChars.length) errors.push({ conflictBy: "InvalidPartNumber", items: invalidPartChars });
//   if (invalidQty.length) errors.push({ conflictBy: "InvalidQty", items: invalidQty }); // <-- NEW
//   if (duplicateParts.length) errors.push({ conflictBy: "DuplicatePartNumber", items: duplicateParts });

//   return { cleaned, errors };
// }

export function validateCommonRows(data, { allowDuplicates = false } = {}) {
  const isBlank = v =>
    v == null ||
    (typeof v === "string" && v.trim() === "") ||
    (typeof v === "number" && Number.isNaN(v));

  const norm = s => String(s ?? "").trim().toLowerCase();
  const partRegex = /^[A-Za-z0-9]+$/;

  // For duplicates (only if not allowed)
  const partSeen = allowDuplicates ? null : new Map();
  const partRows = allowDuplicates ? null : new Map();

  const flatErrors = []; // <-- single flat array

  const cleaned = data.map((row, i) => {
    const PartNumber = row.PartNumber;
    const QtyRaw = row.Qty;
    const qtyNum = Number(QtyRaw);

    // --- Missing checks
    if (isBlank(PartNumber)) {
      flatErrors.push({
        index: i,
        PartNumber: PartNumber ?? null,
        row,
        field: "PartNumber",
        type: "MissingCell",
        message: "PartNumber is required"
      });
    }
    if (isBlank(QtyRaw)) {
      flatErrors.push({
        index: i,
        PartNumber: PartNumber ?? null,
        row,
        field: "Qty",
        type: "MissingCell",
        message: "Qty is required"
      });
    }

    // --- Character rule for PartNumber
    if (!isBlank(PartNumber) && !partRegex.test(String(PartNumber))) {
      flatErrors.push({
        index: i,
        PartNumber: String(PartNumber).trim(),
        row,
        field: "PartNumber",
        type: "InvalidPartNumber",
        message: "Parts contain special characters"
      });
    }

    // --- Qty > 0 rule
    if (!isBlank(QtyRaw) && (Number.isNaN(qtyNum) || qtyNum <= 0)) {
      flatErrors.push({
        index: i,
        PartNumber: !isBlank(PartNumber) ? String(PartNumber).trim() : null,
        row,
        field: "Qty",
        type: "InvalidQty",
        message: "Qty should be greater than 0"
      });
    }

    // --- Prepare duplicate tracking
    if (!allowDuplicates && !isBlank(PartNumber)) {
      const key = norm(PartNumber);
      partSeen.set(key, (partSeen.get(key) || 0) + 1);
      if (!partRows.has(key)) partRows.set(key, []);
      partRows.get(key).push(i);
    }

    return {
      ...row,
      PartNumber: isBlank(PartNumber) ? PartNumber : String(PartNumber).trim(),
      Qty: isBlank(QtyRaw) ? QtyRaw : qtyNum
    };
  });

  // --- Emit duplicate rows as flat errors
  if (!allowDuplicates) {
    for (const [key, count] of partSeen.entries()) {
      if (count > 1) {
        const idxs = partRows.get(key) || [];
        for (const i of idxs) {
          flatErrors.push({
            index: i,
            PartNumber: cleaned[i].PartNumber ?? null,
            row: data[i],
            field: "PartNumber",
            type: "DuplicatePartNumber",
            message: "Duplicate part found"
          });
        }
      }
    }
  }
  // console.log(flatErrors);

  return { cleaned, errors: flatErrors };
}

export const partBrandMappingCheck = async (BrandId, Data) => {
  try {
    const pool = await getPool();
    const query = `
      SELECT brandid, partnumber1 PartNumber
      FROM z_scope.dbo.Part_Master
      WHERE brandid = @BrandId
    `;
    const result = await pool.request()
      .input("BrandId", sql.Int, BrandId)
      .query(query);

    const mapped = new Set(
      (result.recordset || []).map(r => String(r.PartNumber ?? "").trim().toLowerCase())
    );
    const unmatched = [];
    Data.forEach((item, index) => {
      const pn = String(item.PartNumber ?? "").trim().toLowerCase();
      if (pn && !mapped.has(pn)) {
        unmatched.push({ PartNumber: item.PartNumber });
      }
    });

    return unmatched;
  } catch (error) {
    console.error(`Error in partBrandMappingCheck: ${error.message}`);
    throw new ApiError(500, error.message);
  }
};

export function orderTypeCheck(ordertype) {
  const REQUIRED_OrderType = ["Normal", "Co-Dealer", "Urgent", "Transfer"]
  if (!REQUIRED_OrderType.includes(ordertype)) {
    return false;
  }
  return true
}

// strict string normalizer: stringify → replace unicode spaces → trim → collapse → lowercase
const S = (v) =>
  (v === null || v === undefined ? "" : String(v))
    .replace(/[\u00A0\u1680\u180E\u2000-\u200B\u202F\u205F\u3000]/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

/**
 * Return unique invalid names/codes for the SAME LocationId.
 * Everything is compared as strings.
 */
// export function findInvalidPartiesByLocation(data, mapping) {
//   // loc -> { names:Set<string>, codes:Set<string> }
//   const validByLoc = new Map();

//   for (const m of Array.isArray(mapping) ? mapping : []) {
//     const loc = S(m.LocationId ?? m.locationid ?? m.LOCATIONID);
//     if (!loc) continue;
//     const name = S(m.PartyName ?? m.partyname ?? m.Party_Name);
//     const code = S(m.PartyCode ?? m.partycode ?? m.Party_Code);

//     if (!validByLoc.has(loc)) validByLoc.set(loc, { names: new Set(), codes: new Set() });
//     if (name) validByLoc.get(loc).names.add(name);
//     if (code) validByLoc.get(loc).codes.add(code);
//   }

//   const seenName = new Set();
//   const seenCode = new Set();
//   const invalidPartyNames = [];
//   const invalidPartyCodes = [];

//   for (const row of Array.isArray(data) ? data : []) {
//     const loc = S(row.LocationId ?? row.locationid);
//     const valids = validByLoc.get(loc);
//     if (!valids) continue; // no mapping for this location → don't flag

//     const nameRaw = row.PartyName;
//     const codeRaw = row.PartyCode;
//     const nameKey = S(nameRaw);
//     const codeKey = S(codeRaw);

//     if (nameKey && !valids.names.has(nameKey) && !seenName.has(nameKey)) {
//       seenName.add(nameKey);
//       invalidPartyNames.push(nameRaw); // preserve original
//     }
//     if (codeKey && !valids.codes.has(codeKey) && !seenCode.has(codeKey)) {
//       seenCode.add(codeKey);
//       invalidPartyCodes.push(codeRaw);
//     }
//   }

//   return { invalidPartyNames, invalidPartyCodes };
// }


// strict string normalizer
// const S = (v) =>
//   (v == null ? "" : String(v))
//     .replace(/[\u00A0\u1680\u180E\u2000-\u200B\u202F\u205F\u3000]/g, " ")
//     .trim()
//     .replace(/\s+/g, " ")
//     .toLowerCase();

/**
 * First collect errors; if any → return them.
 * If none → return mapped rows with PartyId (PartyName/PartyCode removed).
 *
 * mapping: [{ Id, PartyName, PartyCode?, LocationId }, ...]
 * data:    [{ PartyName?, PartyCode?, LocationId, ... }, ...]
 *
 * Return shape:
 *  - { ok:false, invalidPartyNames:[], invalidPartyCodes:[], mismatches:[] }
 *  - { ok:true,  mapped:[...] }
 */
export function mapPartiesOrCollectInvalidFirst(data, mapping) {
  // Build per-location lookups (string keys)
  const byLocName = new Map(); // loc -> Map<nameKey, PartyId>
  const byLocCode = new Map(); // loc -> Map<codeKey, PartyId>

  for (const m of Array.isArray(mapping) ? mapping : []) {
    const loc = S(m.LocationId ?? m.locationid ?? m.LOCATIONID);
    if (!loc) continue;
    const id = m.PartyId ?? m.PartyID ?? m.Id ?? m.id;
    const nameKey = S(m.PartyName ?? m.partyname ?? m.Party_Name);
    const codeKey = S(m.PartyCode ?? m.partycode ?? m.Party_Code);

    if (!byLocName.has(loc)) byLocName.set(loc, new Map());
    if (!byLocCode.has(loc)) byLocCode.set(loc, new Map());
    if (nameKey) byLocName.get(loc).set(nameKey, id);
    if (codeKey) byLocCode.get(loc).set(codeKey, id);
  }

  const invalidPartyNames = new Set();
  const invalidPartyCodes = new Set();
  const mismatches = [];

  // 1) Validate
  for (const r of Array.isArray(data) ? data : []) {
    const loc = S(r.LocationId ?? r.locationid);
    const nameKey = S(r.PartyName);
    const codeKey = S(r.PartyCode);

    const nameId = byLocName.get(loc)?.get(nameKey) ?? null;
    const codeId = byLocCode.get(loc)?.get(codeKey) ?? null;

    if (nameKey && codeKey && nameId && codeId && nameId !== codeId) {
      mismatches.push({ PartyName: r.PartyName, PartyCode: r.PartyCode, LocationId: r.LocationId });
      continue;
    }
    if (!nameId && !codeId) {
      if (codeKey) invalidPartyCodes.add(String(r.PartyCode));
      else if (nameKey) invalidPartyNames.add(String(r.PartyName));
    }
  }

  if (mismatches.length || invalidPartyNames.size || invalidPartyCodes.size) {
    return {
      ok: false,
      invalidPartyNames: [...invalidPartyNames],
      invalidPartyCodes: [...invalidPartyCodes],
      mismatches
    };
  }

  // 2) Map
  const mapped = [];
  for (const r of data) {
    const loc = S(r.LocationId ?? r.locationid);
    const codeId = byLocCode.get(loc)?.get(S(r.PartyCode)) ?? null;
    const nameId = byLocName.get(loc)?.get(S(r.PartyName)) ?? null;
    const partyId = codeId ?? nameId; // prefer code if present
    const out = { ...r, PartyId: partyId };
    delete out.PartyName;
    delete out.PartyCode;
    mapped.push(out);
  }

  return { ok: true, mapped };
}

/**
 * Returns { cleanData, errors }
 * - Errors are ONLY:
 *   { message: "Cell Empty", data: [...] }
 *   { message: "Qty is Zero", data: [...] }
 * - PartNumber is sanitized (special chars removed) in cleanData.
 *
 * @param {Array<object>} data
 * @param {object} cfg
 * @param {string[]} cfg.required - fields that must be non-blank
 * @param {string[]} [cfg.qtyFields=["Qty"]] - fields that must be > 0 numeric
 * @param {boolean} [cfg.coerceQty=true] - coerce qty fields to Number in cleanData
 * @param {string} [cfg.partField="PartNumber"] - field to sanitize by removing specials
 */
// export function validateAndClean(data, {
//   required,
//   qtyFields = ["Qty"],
//   coerceQty = true,
//   partField = "PartNumber",
// } = {}) {

//   const isBlank = v =>
//     v == null ||
//     (typeof v === "string" && v.trim() === "") ||
//     (typeof v === "number" && Number.isNaN(v));

//   const stripSpecials = s => String(s ?? "").replace(/[^A-Za-z0-9]/g, "").trim();

//   const cellEmptyRows = [];
//   const qtyZeroRows = [];

//   const cleanData = data.map(row => {
//     const r = { ...row };

//     // sanitize PartNumber (no error, just clean)
//     if (partField in r && !isBlank(r[partField])) {
//       r[partField] = stripSpecials(r[partField]);
//     }

//     // collect "Cell Empty" if ANY required is blank (after sanitization for PartNumber)
//     if (Array.isArray(required) && required.some(f => isBlank(r[f]))) {
//       cellEmptyRows.push(row); // push original row as requested
//     }

//     // check qty fields
//     if (Array.isArray(qtyFields) && qtyFields.length) {
//       let anyBadQty = false;
//       for (const f of qtyFields) {
//         const val = r[f];
//         if (!isBlank(val)) {
//           const num = Number(val);
//           if (coerceQty) r[f] = num; // reflect numeric in cleanData
//           if (!Number.isFinite(num) || num <= 0) {
//             anyBadQty = true;
//           }
//         } else {
//           // blank qty counts as zero/bad
//           anyBadQty = true;
//         }
//       }
//       if (anyBadQty) qtyZeroRows.push(row); // original row
//     }

//     return r;
//   });

//   const errors = [];
//   if (cellEmptyRows.length) errors.push({ message: "Cell Empty", data: cellEmptyRows });
//   if (qtyZeroRows.length) errors.push({ message: "Qty is Zero or More than 1000", data: qtyZeroRows });

//   return { cleanData, errors };
// }

export function validateAndClean(
  data,
  {
    required,
    qtyFields = ["Qty"],
    coerceQty = true,
    partField = "PartNumber",

    // NEW: party requirement config
    partyEitherRequired = false,                 // enable/disable this rule
    partyFields = { name: "PartyName", code: "PartyCode" }, // which fields
    sanitizePartyFields = true                   // apply stripSpecials to party fields
  } = {}
) {
  const isBlank = v =>
    v == null ||
    (typeof v === "string" && v.trim() === "") ||
    (typeof v === "number" && Number.isNaN(v));

  const stripSpecials = s => String(s ?? "").replace(/[^A-Za-z0-9]/g, "").trim();

  const cellEmptyRows = [];
  const qtyZeroRows = [];
  const partyEitherMissingRows = []; // NEW

  const cleanData = data.map(row => {
    const r = { ...row };

    // sanitize PartNumber (no error, just clean)
    if (partField in r && !isBlank(r[partField])) {
      r[partField] = stripSpecials(r[partField]);
    }

    // --- NEW: sanitize party fields (optional) ---
    const nameField = partyFields?.name ?? "PartyName";
    const codeField = partyFields?.code ?? "PartyCode";

    if (sanitizePartyFields) {
      if (nameField in r && !isBlank(r[nameField])) {
        r[nameField] = stripSpecials(r[nameField]);
      }
      if (codeField in r && !isBlank(r[codeField])) {
        r[codeField] = stripSpecials(r[codeField]);
      }
    } else {
      // still trim if not sanitizing specials
      if (nameField in r && !isBlank(r[nameField])) {
        r[nameField] = String(r[nameField]).trim();
      }
      if (codeField in r && !isBlank(r[codeField])) {
        r[codeField] = String(r[codeField]).trim();
      }
    }

    // collect "Cell Empty" if ANY required is blank (after sanitization for PartNumber)
    if (Array.isArray(required) && required.some(f => isBlank(r[f]))) {
      cellEmptyRows.push(row); // push original row as requested
    }

    // --- NEW: either PartyName or PartyCode must be present (if enabled) ---
    if (partyEitherRequired) {
      const partyNameBlank = isBlank(r[nameField]);
      const partyCodeBlank = isBlank(r[codeField]);
      if (partyNameBlank && partyCodeBlank) {
        partyEitherMissingRows.push(row); // push original row
      }
    }

    // check qty fields
    if (Array.isArray(qtyFields) && qtyFields.length) {
      let anyBadQty = false;
      for (const f of qtyFields) {
        const val = r[f];
        if (!isBlank(val)) {
          const num = Number(val);
          if (coerceQty) r[f] = num; // reflect numeric in cleanData
          if (!Number.isFinite(num) || num <= 0) {
            anyBadQty = true;
          }
        } else {
          // blank qty counts as zero/bad
          anyBadQty = true;
        }
      }
      if (anyBadQty) qtyZeroRows.push(row); // original row
    }

    return r;
  });

  const errors = [];
  if (cellEmptyRows.length) {
    errors.push({ message: "Cell Empty", data: cellEmptyRows });
  }
  if (qtyZeroRows.length) {
    errors.push({ message: "Qty is Zero or More than 1000", data: qtyZeroRows });
  }
  // NEW: error for party requirement violation
  if (partyEitherMissingRows.length) {
    errors.push({
      message: `Either ${partyFields?.name ?? "PartyName"} or ${partyFields?.code ?? "PartyCode"} is required`,
      data: partyEitherMissingRows
    });
  }

  return { cleanData, errors };
}

export function consolidateLines(rows, { groupByParty = true } = {}) {
  const keyOf = r => {
    const pn = String(r.PartNumber).trim();
    return groupByParty ? `${String(r.PartyId)}|${pn}` : pn;
  };

  const out = [];
  const pos = new Map(); // key -> index in out

  for (const r of rows) {
    const key = keyOf(r);
    const qty = Number(r.Qty);
    if (!Number.isFinite(qty)) continue; // or throw

    const remark = (r.Remarks ?? "").toString().trim();

    if (pos.has(key)) {
      const idx = pos.get(key);
      out[idx].Qty += qty;

      if (remark) {
        if (!out[idx].__remarks) out[idx].__remarks = new Set();
        out[idx].__remarks.add(remark);
      }
    } else {
      const clone = {
        ...r,
        PartNumber: String(r.PartNumber).trim(),
        Qty: qty
      };
      if (remark) clone.__remarks = new Set([remark]);
      out.push(clone);
      pos.set(key, out.length - 1);
    }
  }

  // finalize remarks
  for (const o of out) {
    if (o.__remarks && o.__remarks.size) {
      o.Remarks = Array.from(o.__remarks).join(", ");
    }
    delete o.__remarks;
  }

  // validate max per group
  const offenders = out
    .filter(g => Number.isFinite(g.Qty) && g.Qty > 1000)
    .map(g => ({
      // return minimal info in error payload
      PartyId: groupByParty ? g.PartyId : undefined,
      PartNumber: g.PartNumber,
      Qty: g.Qty
    }));

  const errors = offenders.length
    ? [{ message: `Qty exceeds 1000`, data: offenders }]
    : [];

  return { grouped: out, errors };

  // return out;
}

// helper: split formattedData into valid vs invalid using a key (default PartNumber)
export function splitByInvalid(formattedData, invalidParts, key = 'PartNumber') {
  const norm = v => (v === null || v === undefined) ? '' : String(v).trim().toUpperCase();

  // Build a set of invalid keys (supports [{PartNumber: 'x'}] or ['x', 123, ...])
  const invalidKeySet = new Set(
    (invalidParts || []).map(p => {
      if (p && typeof p === 'object' && key in p) return norm(p[key]);
      return norm(p);
    })
  );

  // Separate lists and also keep a normalized lookup to echo exact invalid rows we skipped
  const validData = [];
  const skipped = [];

  for (const row of formattedData || []) {
    const k = norm(row?.[key]);
    if (invalidKeySet.has(k)) skipped.push(row);
    else validData.push(row);
  }
  return { validData, skipped };
};

const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj ?? {}, key);
export function payloadValidator(body, { requirePartyId = false } = {}) {
  const errors = [];

  // --- Top-level keys
  const missingTop = [];
  if (!hasOwn(body, "BrandId")) missingTop.push("BrandId");
  if (!hasOwn(body, "payload")) missingTop.push("payload");

  if (missingTop.length) {
    errors.push({ message: "Missing Values", data: missingTop });
    return { ok: false, errors };
  }

  // payload must be an array key-wise; if not array, treat "payload" as missing structure
  const rows = Array.isArray(body.payload) ? body.payload : [];
  if (!rows.length) {
    // "payload" key exists but is empty/invalid: choose to flag the rows' required keys as missing
    errors.push({ message: "Missing Values", data: ["payload[] items"] });
    return { ok: false, errors };
  }

  // --- Row-level required keys
  const baseRequired = ["LocationId", "OrderType", "PartNumber", "userId", "Qty"];
  const required = requirePartyId ? [...baseRequired, "PartyId"] : baseRequired;

  // collect union of missing keys across all rows
  const missingRowKeys = new Set();
  for (const r of rows) {
    for (const k of required) {
      if (!hasOwn(r, k)) missingRowKeys.add(k);
    }
  }

  if (missingRowKeys.size) {
    errors.push({ message: "Missing Values", data: Array.from(missingRowKeys) });
    return { ok: false, errors };
  }


  return { ok: true, errors: [] };
}


export function mapPartyIds(rows, master) {
  const norm = v => (v == null ? '' : String(v).trim().toLowerCase());

  // Build lookups per LocationId
  const byLoc = new Map(); // key: loc -> {code->Id, name->Id}
  for (const p of master) {
    const loc = String(p.LocationId);
    const code = norm(p.PartyCode);
    const name = norm(p.PartyName);
    if (!byLoc.has(loc)) byLoc.set(loc, { code: new Map(), name: new Map() });

    if (code) byLoc.get(loc).code.set(code, p.Id);
    if (name) byLoc.get(loc).name.set(name, p.Id);
  }

  const mapped = [];
  const unmatched = [];
  const conflicts = [];

  for (const r of rows) {
    const loc = String(r.LocationId);
    const look = byLoc.get(loc);
    const codeKey = norm(r.PartyCode);
    const nameKey = norm(r.PartyName);

    let idByCode = null, idByName = null;

    if (look) {
      if (codeKey) idByCode = look.code.get(codeKey) ?? null;
      if (nameKey) idByName = look.name.get(nameKey) ?? null;
    }

    // prefer code; fall back to name
    const chosenId = idByCode ?? idByName ?? null;

    // conflict if both exist but different
    if (idByCode && idByName && idByCode !== idByName) {
      conflicts.push({
        message: 'PartyCode and PartyName map to different PartyIds for this Location',
        row: r,
        idByCode,
        idByName
      });
    }

    const out = { ...r, PartyId: chosenId };
    mapped.push(out);

    if (!chosenId) {
      unmatched.push({
        reason: 'No match in master for this LocationId',
        row: r,
      });
    }
  }

  return { mapped, unmatched, conflicts };
}

export function validateAndCleanVehicle(
  data,
  {
    required,
    qtyFields = ["Qty"],
    coerceQty = true,
    partField = "PartNumber",

    // NEW: columns where we should allow spaces and '-' (hyphen) when sanitizing
    allowSpacesDashIn = [], // e.g. ["Remarks", "PartyName"]
  } = {}
) {
  const isBlank = v =>
    v == null ||
    (typeof v === "string" && v.trim() === "") ||
    (typeof v === "number" && Number.isNaN(v));

  // remove EVERYTHING except letters & digits
  const stripAlnumOnly = s => String(s ?? "").replace(/[^A-Za-z0-9]/g, "");

  // remove everything except letters, digits, space, hyphen
  const stripAlnumSpaceDash = s =>
    String(s ?? "").replace(/[^A-Za-z0-9 \-]/g, "");

  const cellEmptyRows = [];
  const qtyZeroRows = [];

  const cleanData = data.map(row => {
    const r = { ...row };

    // --- 1) TRIM all string columns (left & right) ---
    for (const k of Object.keys(r)) {
      if (typeof r[k] === "string") {
        r[k] = r[k].trim();
      }
    }

    // --- 2) SANITIZE selective columns ---
    // PartNumber: keep only A–Z, a–z, 0–9 (original behavior)
    if (partField in r && !isBlank(r[partField])) {
      r[partField] = stripAlnumOnly(r[partField]);
    }

    // For any configured columns: allow spaces and hyphen, strip other specials
    for (const col of allowSpacesDashIn) {
      if (col in r && !isBlank(r[col]) && typeof r[col] === "string") {
        r[col] = stripAlnumSpaceDash(r[col]).trim(); // trim again after stripping
      }
    }

    // --- Required fields check (using trimmed values) ---
    if (Array.isArray(required) && required.some(f => isBlank(r[f]))) {
      cellEmptyRows.push(row); // push ORIGINAL row for reporting
    }

    // --- Qty validation ---
    if (Array.isArray(qtyFields) && qtyFields.length) {
      let anyBadQty = false;
      for (const f of qtyFields) {
        const val = r[f];
        if (!isBlank(val)) {
          // ensure we convert from trimmed string if needed
          const num = Number(
            typeof val === "string" ? val.trim() : val
          );

          if (coerceQty) r[f] = num;

          if (!Number.isFinite(num) || num <= 0) {
            anyBadQty = true;
          }
        } else {
          anyBadQty = true; // blank qty => bad
        }
      }
      if (anyBadQty) qtyZeroRows.push(row); // ORIGINAL row
    }

    return r;
  });

  const errors = [];
  if (cellEmptyRows.length)
    errors.push({ message: "Cell Empty", data: cellEmptyRows });
  if (qtyZeroRows.length)
    errors.push({ message: "Qty is Zero or More than 1000", data: qtyZeroRows }); // message kept same as your version

  return { cleanData, errors };
}

export function consolidateByVehicle(rows, {
  jobcardField = "JobCardNumber",  // non-mandatory
  maxQtyPerGroup = 1000,           // cap to validate after grouping
} = {}) {

  const keyOf = (r) => {
    const veh = String(r.VehicleNumber ?? "").trim();
    const jc = String(r[jobcardField] ?? "").trim(); // allowed to be blank
    const pn = String(r.PartNumber ?? "").trim();
    return `${veh}|${jc}|${pn}`;
  };

  const out = [];
  const pos = new Map(); // key -> index in out

  for (const _r of rows) {
    // shallow clone & trim all string fields
    const r = { ..._r };
    for (const k of Object.keys(r)) {
      if (typeof r[k] === "string") r[k] = r[k].trim();
    }

    // normalize basic fields used in grouping / math
    const key = keyOf(r);
    const qty = Number(r.Qty);
    if (!Number.isFinite(qty)) continue; // or throw new Error("Invalid Qty")

    const remark = (r.Remarks ?? "").toString().trim();

    if (pos.has(key)) {
      const idx = pos.get(key);
      out[idx].Qty += qty;

      if (remark) {
        if (!out[idx].__remarks) out[idx].__remarks = new Set();
        out[idx].__remarks.add(remark);
      }
    } else {
      // keep the first row's other fields (Advisor, Model, etc.)
      const clone = {
        ...r,
        VehicleNumber: String(r.VehicleNumber ?? "").trim(),
        [jobcardField]: String(r[jobcardField] ?? "").trim(), // may be ""
        PartNumber: String(r.PartNumber ?? "").trim(),
        Qty: qty
      };
      if (remark) clone.__remarks = new Set([remark]);

      out.push(clone);
      pos.set(key, out.length - 1);
    }
  }

  // finalize remarks (unique + comma-joined) and clean temp
  for (const o of out) {
    if (o.__remarks && o.__remarks.size) {
      o.Remarks = Array.from(o.__remarks).join(", ");
    }
    delete o.__remarks;
  }

  // validate max per group
  const offenders = out
    .filter(g => Number.isFinite(g.Qty) && g.Qty > maxQtyPerGroup)
    .map(g => ({
      VehicleNumber: g.VehicleNumber,
      [jobcardField]: g[jobcardField], // may be ""
      PartNumber: g.PartNumber,
      Qty: g.Qty
    }));

  const errors = offenders.length
    ? [{ message: `Qty exceeds ${maxQtyPerGroup}`, data: offenders }]
    : [];

  return { grouped: out, errors };
}
