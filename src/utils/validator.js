// ---- validators.js (or top of your file) ----

// normalize helpers
export const normStr = (v, max = 30) =>
  v == null ? null : String(v).trim().slice(0, max);

export const isBlank = (v) =>
  v == null ||
  (typeof v === "string" && v.trim() === "") ||
  (typeof v === "number" && Number.isNaN(v));

// header check
export function validateHeaders(headers, requiredHeaders) {
  const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
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
