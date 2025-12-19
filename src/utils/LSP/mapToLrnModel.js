// utils/mapToLrnModel.js
import { LRN_FIELDS } from "../../constants/lrnFields.js";

export function mapToLrnModel(payload) {
  const mapped = {};

  for (const field of LRN_FIELDS) {
    mapped[field] =
      payload[field] !== undefined && payload[field] !== ""
        ? payload[field]
        : null;
  }

  return mapped;
}
