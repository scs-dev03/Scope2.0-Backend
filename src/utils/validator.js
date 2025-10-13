// // normalize helpers
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

// normalize Party rows (trim + cap length)
export function normalizePartyRows(rows) {
  return rows.map(r => ({
    ...r,
    PartyCode: normStr(r.PartyCode, 30),
    PartyName: normStr(r.PartyName, 30),
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
    Email:   normEmail(r?.Email, 320),
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
    missingAdvisor: [],    // row numbers with missing Advisor
    duplicateAdvisors: [], // { advisor, rows:[...] }
    duplicateRows: []      // { key, rows:[...] }
  };

  const seenAdvisorToRows = new Map(); // advisorLower -> [rowNums]
  const seenRowKeyToRows = new Map();  // JSON key -> [rowNums]

  (rows || []).forEach((raw, i) => {
    // Row numbers as in Excel: header = row 1, first data row = 2
    const rowNum = excelRowOf(i);

    const advisor    = normStr(raw?.Advisor, 100);
    const advisorKey = normLower(raw?.Advisor, 100);
    const phone      = (normPhone(raw?.PhoneNo, 20) ?? "");  // use "" for map keys
    const email      = normLower(normEmail(raw?.Email, 320) ?? "", 320);

    if (!advisor) issues.missingAdvisor.push(rowNum);

    // Track duplicate advisors
    if (advisorKey) {
      if (!seenAdvisorToRows.has(advisorKey)) seenAdvisorToRows.set(advisorKey, []);
      seenAdvisorToRows.get(advisorKey).push(rowNum);
    }

    // Track exact duplicate rows (Advisor+PhoneNo+Email)
    const rowKey = JSON.stringify({ advisor: advisorKey, phone, email });
    if (!seenRowKeyToRows.has(rowKey)) seenRowKeyToRows.set(rowKey, []);
    seenRowKeyToRows.get(rowKey).push(rowNum);
  });

  // Populate duplicates (Advisor)
  for (const [advKey, rowsArr] of seenAdvisorToRows.entries()) {
    if (rowsArr.length > 1) {
      issues.duplicateAdvisors.push({ advisor: advKey, rows: rowsArr });
    }
  }
  // Populate duplicates (exact row)
  for (const [key, rowsArr] of seenRowKeyToRows.entries()) {
    if (rowsArr.length > 1) {
      issues.duplicateRows.push({ key, rows: rowsArr });
    }
  }

  const isValid =
    issues.missingAdvisor.length === 0 &&
    issues.duplicateAdvisors.length === 0 &&
    issues.duplicateRows.length === 0;

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

