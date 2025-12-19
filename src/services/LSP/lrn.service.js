// services/LSP/lrn.service.js
import { normalizeLrnPayload } from "../../utils/LSP/normalizeLrnPayload.js";
import { mapToLrnModel } from "../../utils/LSP/mapToLrnModel.js";
import { getPool1 } from "../../db/db.js";

export const createLrnService = async (payload) => {
  // alias → canonical
  const normalizedPayload = normalizeLrnPayload(payload);
  console.log("Normalized Paylaod", normalizedPayload);

  // canonical → DB-safe object
  const lrnData = mapToLrnModel(normalizedPayload);
  console.log("DB Safe Object", lrnData);

  // checks
  if (!lrnData.DispatchOrderNo || !lrnData.LRNumber) {
    throw new Error("DispatchOrderNo and LRNumber are mandatory");
  }

  // insert to DB
  const pool = await getPool1();
  const request = pool.request();

  Object.entries(lrnData).forEach(([key, value]) => {
    request.input(key, value);
  });

  console.log(pool.config.database);

  await request.query(`
    INSERT INTO dbo.lsp_lrn (
      DispatchOrderNo, OrderNo, CourierName, LSPName,
      LRNumber, LRDate, BoxCount,
      PickupTimeStamp, PromisedDate, EstimatedDate,
      Status, ChargedWt, PackageAmount,
      NoOfDelAttempts, LastDelAttemptDate,
      LastDelAttemptRemarks, DeliveryDate,
      LastStatusTimeStamp, LastStatusLocation,
      LastStatusRemarks, RTO
    ) VALUES (
      @DispatchOrderNo, @OrderNo, @CourierName, @LSPName,
      @LRNumber, @LRDate, @BoxCount,
      @PickupTimeStamp, @PromisedDate, @EstimatedDate,
      @Status, @ChargedWt, @PackageAmount,
      @NoOfDelAttempts, @LastDelAttemptDate,
      @LastDelAttemptRemarks, @DeliveryDate,
      @LastStatusTimeStamp, @LastStatusLocation,
      @LastStatusRemarks, @RTO
    )
  `);

  return lrnData;
};

export const getAllLrnsService = async () => {
  const pool = await getPool1();
  const result = await pool.request().query(`
    SELECT *
    FROM dbo.lsp_lrn
    ORDER BY CreatedAt DESC
  `);

  return result.recordset;
};

export const getLrnsByLspService = async (lspName) => {
  const pool = await getPool1();
  const request = pool.request();

  request.input("LSPName", lspName);

  const result = await request.query(`
    SELECT *
    FROM dbo.lsp_lrn
    WHERE LSPName = @LSPName
    ORDER BY CreatedAt DESC
  `);

  return result.recordset;
};