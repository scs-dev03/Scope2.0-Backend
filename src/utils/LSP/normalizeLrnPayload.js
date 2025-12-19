// utils/normalizeLrnPayload.js
import { LRN_ALIAS_MAP } from "../../constants/lrnAliasMap.js";

export function normalizeLrnPayload(payload) {
  const normalized = {};

  for (const [key, value] of Object.entries(payload)) {
    const canonicalKey = LRN_ALIAS_MAP[key];

    if (canonicalKey) {
      normalized[canonicalKey] = value;
    }
  }

  return normalized;
}
