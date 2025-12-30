import { getPool1 } from "../../db/db.js";
import sql from "mssql";
const database = "UAD_LSPMonitoringSystemDB";


// HELPER FUNCTIONS
const getLRNColumnsFromDB = async () => {
  const pool = getPool1();
  const result = await pool.request().query(`
    SELECT FieldName
    FROM ${database}.dbo.CommanFieldMaster
    WHERE ISNULL(Status, 1) = 1
      AND FieldName NOT IN ('Status', 'LSPCode')
  `);

  return result.recordset.map(r => r.FieldName);
};

const getActiveLSPNames = async () => {
  const pool = getPool1();
  const result = await pool.request().query(`
    SELECT LSPName
    FROM ${database}.dbo.LSPMaster
    WHERE ISNULL(Status, 1) = 1
  `);
  return result.recordset.map(r => r.LSPName);
};

const getLSPFieldMappings = async (lspName) => {
  const pool = getPool1();

  const activeLSPs = await getActiveLSPNames();
  if (!activeLSPs.includes(lspName)) {
    throw new Error("Invalid or inactive LSP");
  }

  const query = `
    SELECT 
      CommanField,
      ${lspName} AS LSPField
    FROM ${database}.dbo.FieldMappingMastertbl
    WHERE ${lspName} IS NOT NULL
      AND ${lspName} <> 'NA'
  `;

  const result = await pool.request().query(query);

  // Convert to lookup map
  const mapping = {};
  result.recordset.forEach(r => {
    mapping[r.LSPField.trim()] = r.CommanField.trim();
  });

  return mapping;
};

const transformToCommonFields = (payload, fieldMap) => {
  const normalized = {};

  Object.keys(payload).forEach(lspField => {
    const commonField = fieldMap[lspField];
    if (commonField) {
      normalized[commonField] = payload[lspField];
    }
  });

  return normalized;
};

const resolveStatusId = async (statusText) => {
  if (!statusText) return 1; // default to pending pickup

  const pool = getPool1();

  // Normalize input: lowercase + remove spaces
  const normalizedInput = statusText.trim().toLowerCase().replace(/\s+/g, '');

  const result = await pool.request()
    .input("NormalizedKey", normalizedInput)
    .query(`
      SELECT StatusID
      FROM ${database}.dbo.Status1Master
      WHERE NormalizedKey = @NormalizedKey
    `);

  // Return the found StatusID or default
  return result.recordset[0]?.StatusID ?? 1;
};

//Get all active LSPs
const getAllLSPsService = async () => {
  const pool = getPool1();

  const query = `
    SELECT 
      ID,
      LSPName
    FROM ${database}.dbo.LSPMaster
    WHERE ISNULL(Status, 1) = 1
    ORDER BY LSPName
  `;

  const result = await pool.request().query(query);
  return result.recordset;
};

//Get common fields (master list)
const getCommonFieldsService = async () => {
  const pool = getPool1();
  const query = `
    SELECT FieldName
    FROM ${database}.dbo.CommanFieldMaster
    WHERE ISNULL(Status, 1) = 1
    ORDER BY ID
  `;
  const result = await pool.request().query(query);
  return result.recordset.map((r) => r.FieldName);
};

// Get field mappings for an LSP
const getFieldMappingService = async (lspCode) => {
  const pool = getPool1();
  // Get LSP column name from master
  const lspResult = await pool.request()
    .input("LSPCode", lspCode)
    .query(`
      SELECT LSPName
      FROM ${database}.dbo.LSPMaster
      WHERE ID = @LSPCode
    `);

  if (lspResult.recordset.length === 0) {
    throw new Error("Invalid LSP ID");
  }

  const lspName = lspResult.recordset[0].LSPName;
  // Whitelist (double safety)
  const activeLSPs = await getActiveLSPNames();
  if (!activeLSPs.includes(lspName)) {
    throw new Error("Invalid or inactive LSP");
  }

  const safeColumn = `[${lspName}]`;

  // Query mapping
  const query = `
    SELECT
      CommanField AS CommonFieldName,
      ${safeColumn} AS LSPFieldName
    FROM ${database}.dbo.FieldMappingMastertbl
    WHERE ${safeColumn} IS NOT NULL
      AND ${safeColumn} <> 'NA'
    ORDER BY ID
  `;

  const result = await pool.request().query(query);
  return result.recordset;
};

// map to common fileds according to lspCode and add to DB and Mapping table
const ingestLSPPayloadService = async ({
  lspCode,
  lspName,
  dispatchOrderNo,
  data
}) => {
  // 1. Mapping
  const fieldMap = await getLSPFieldMappings(lspName);

  // 2. Transform LSP → global fields
  const normalizedData = transformToCommonFields(data, fieldMap);

  // 3. Mandatory validation
  if (!normalizedData.LRNumber) {
    throw new Error("LRNumber is mandatory");
  }

  let statusValue = normalizedData.Status;

  // Case 1: numeric StatusID provided → use it directly
  if (typeof statusValue === "number" && statusValue > 0) {
    normalizedData.Status = statusValue;
  } else {
    // Case 2: text provided → resolve via NormalizedKey
    normalizedData.Status = await resolveStatusId(statusValue);
  }

  // 4. System-controlled enrichment
  normalizedData.LSPCode = lspCode;

  // 5. Persist
  await upsertLRNDetailsService(normalizedData);

  // 6. Dispatch ↔ LRN mapping
  if (dispatchOrderNo) {
    await addOrSwitchLRNService(
      dispatchOrderNo,
      normalizedData.LRNumber,
      lspCode
    );
  }

  return {
    message: "LSP data ingested successfully",
    normalizedData
  };
};

// map the DispatchOrderNumber to that LRN in table LRNTracking 
const addOrSwitchLRNService = async (dispatchOrderNo, lrNumber, LSPCode) => {
  const pool = getPool1();
  const transaction = await pool.transaction();

  try {
    await transaction.begin();

    const request = transaction.request();
    request.input("DispatchOrderNo", dispatchOrderNo);
    request.input("LRNumber", lrNumber);
    request.input("LSPCode", LSPCode);

    // Deactivate existing active LRN
    await request.query(`
      UPDATE ${database}.dbo.DispatchLRNTracking
      SET Status = 0
      WHERE DispatchOrderNo = @DispatchOrderNo AND Status = 1
    `);

    // Get next version number
    const versionResult = await request.query(`
      SELECT MAX(Version) AS MaxVersion
      FROM ${database}.dbo.DispatchLRNTracking
      WHERE DispatchOrderNo = @DispatchOrderNo
    `);

    const nextVersion = (versionResult.recordset[0].MaxVersion || 0) + 1;

    // Insert new LRN
    const insertResult = await request.query(`
      INSERT INTO ${database}.dbo.DispatchLRNTracking
        (DispatchOrderNo, LRNumber, Version, LSPCode, Status, InsertedOn)
      VALUES
        (@DispatchOrderNo, @LRNumber, ${nextVersion}, @LSPCode, 1, GETDATE());
    `);

    await transaction.commit();

    return {
      message: `LRN ${lrNumber} added as version ${nextVersion} and set active, results ${insertResult}`,
    };
  } catch (err) {
    await transaction.rollback();
    console.error("Transaction failed:", err);
    throw new Error("Failed to add/switch LRN");
  }
};

// Add Data in LRN Details
const upsertLRNDetailsService = async (data) => {
  const pool = getPool1();
  const transaction = await pool.transaction();

  try {
    await transaction.begin();
    const request = transaction.request();

    // 1️⃣ Explicit system fields
    request.input("LRNumber", data.LRNumber);
    request.input("LSPCode", data.LSPCode);
    request.input("Status", data.Status ?? 1);

    // 2️⃣ Bind all fields defined by CommanFieldMaster
    const lrnColumns = await getLRNColumnsFromDB();

    lrnColumns.forEach(col => {
      if (col === "LRNumber") return;
      if (["LRNumber", "Status"].includes(col)) return;
      request.input(col, data[col] ?? null);
    });

    // 3️⃣ Correct SQL (Status, NOT StatusID)
    const query = `
      IF EXISTS (SELECT 1 FROM ${database}.dbo.LRNDetails WHERE LRNumber = @LRNumber)
      BEGIN
        UPDATE ${database}.dbo.LRNDetails
        SET
          LSPCode = @LSPCode,
          LRDate = @LRDate,
          PickupTimeStamp = @PickupTimeStamp,
          OrderNo = @OrderNo,
          PromisedDate = @PromisedDate,
          EstimatedDate = @EstimatedDate,
          ChargedWt = @ChargedWt,
          PackageAmount = @PackageAmount,
          BoxCount = @BoxCount,
          NoOfDelAttempts = @NoOfDelAttempts,
          LastDelAttemptDate = @LastDelAttemptDate,
          LastDelAttemptRemarks = @LastDelAttemptRemarks,
          DeliveryDate = @DeliveryDate,
          LastStatusTimeStamp = @LastStatusTimeStamp,
          LastStatusLocation = @LastStatusLocation,
          LastStatusRemarks = @LastStatusRemarks,
          RTO = @RTO,
          CourierName = @CourierName,
          Status = @Status
        WHERE LRNumber = @LRNumber
      END
      ELSE
      BEGIN
        INSERT INTO ${database}.dbo.LRNDetails
        (LRNumber, LSPCode, LRDate, PickupTimeStamp, OrderNo,
         PromisedDate, EstimatedDate, ChargedWt, PackageAmount,
         BoxCount, NoOfDelAttempts, LastDelAttemptDate,
         LastDelAttemptRemarks, DeliveryDate, LastStatusTimeStamp,
         LastStatusLocation, LastStatusRemarks, RTO,
         CourierName, Status)
        VALUES
        (@LRNumber, @LSPCode, @LRDate, @PickupTimeStamp, @OrderNo,
         @PromisedDate, @EstimatedDate, @ChargedWt, @PackageAmount,
         @BoxCount, @NoOfDelAttempts, @LastDelAttemptDate,
         @LastDelAttemptRemarks, @DeliveryDate, @LastStatusTimeStamp,
         @LastStatusLocation, @LastStatusRemarks, @RTO,
         @CourierName, @Status)
      END
    `;

    await request.query(query);
    await transaction.commit();

    return { message: `LRN ${data.LRNumber} upserted successfully` };
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
};

// get LRNs according to dispatch order number
const getLRNsByDispatchService = async (dispatchOrderNo) => {
  const pool = getPool1();
  const request = pool.request();
  request.input("DispatchOrderNo", dispatchOrderNo);

  const query = `
    SELECT *
    FROM ${database}.dbo.DispatchLRNTracking
    WHERE DispatchOrderNo = @DispatchOrderNo
    ORDER BY Version DESC
  `;

  const result = await request.query(query);
  return result.recordset;
};

// get LRN according to LRNumber
const getLRNDetailsService = async (lrNumber) => {
  const pool = getPool1();
  const request = pool.request();
  request.input("LRNumber", lrNumber);

  const query = `
    SELECT 
      ld.*, 
      lsp.LSPName, 
      st.StatusName
    FROM ${database}.dbo.LRNDetails ld
    JOIN ${database}.dbo.LSPMaster lsp ON ld.LSPCode = lsp.ID
    JOIN ${database}.dbo.Status1Master st ON ld.Status = st.StatusID
    WHERE ld.LRNumber = @LRNumber
  `;
  const result = await request.query(query);
  return result.recordset[0] || null;
};

// Filter LRNS according to there status
const getLRNsByStatusService = async (statusId) => {
  const pool = getPool1();
  const request = pool.request();
  request.input("Status", statusId);

  const query = `
    SELECT 
      ld.*, 
      lsp.LSPName,
      st.StatusName
    FROM ${database}.dbo.LRNDetails ld
    JOIN ${database}.dbo.LSPMaster lsp ON ld.LSPCode = lsp.ID
    JOIN ${database}.dbo.Status1Master st ON ld.Status = st.StatusID
    WHERE ld.Status = @Status
    ORDER BY ld.InsertedOn DESC
  `;

  const result = await request.query(query);
  return result.recordset;
};

export {
  getAllLSPsService,
  getCommonFieldsService,
  getFieldMappingService,
  addOrSwitchLRNService,
  upsertLRNDetailsService,
  getLRNsByDispatchService,
  getLRNDetailsService,
  getLRNsByStatusService,
  ingestLSPPayloadService
};
