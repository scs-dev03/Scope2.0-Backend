import { getPool1 } from "../../db/db.js";
import sql from "mssql";

const database = "UAD_LSPMonitoringSystemDB";

/* =========================
   HELPER FUNCTIONS
========================= */

const getLRNColumnsFromDB = async () => {
  const pool = getPool1();
  const result = await pool.request().query(`
    SELECT FieldName
    FROM ${database}.dbo.CommanFieldMaster
    WHERE ISNULL(Status, 1) = 1
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
    SELECT CommanField, ${lspName} AS LSPField
    FROM ${database}.dbo.FieldMappingMastertbl
    WHERE ${lspName} IS NOT NULL AND ${lspName} <> 'NA'
  `;

  const result = await pool.request().query(query);

  const mapping = {};
  result.recordset.forEach(r => {
    mapping[r.LSPField.trim()] = r.CommanField.trim();
  });

  return mapping;
};

const transformToCommonFields = (payload, fieldMap) => {
  const normalized = {};

  // Map LSP fields to common fields
  Object.keys(payload).forEach(lspField => {
    const commonField = fieldMap[lspField];
    if (commonField) {
      normalized[commonField] = payload[lspField];
    } else {
      // Keep unmapped fields for special handling (RTO, LastStatusRemarks, etc.)
      normalized[lspField] = payload[lspField];
    }
  });

  return normalized;
};

const resolveStatusId = async (statusText) => {
  if (!statusText) return 1;

  const pool = getPool1();
  const normalizedInput = statusText.trim().toLowerCase().replace(/\s+/g, "");

  const result = await pool.request()
    .input("NormalizedKey", normalizedInput)
    .query(`
      SELECT StatusID
      FROM ${database}.dbo.Status1Master
      WHERE NormalizedKey = @NormalizedKey
    `);

  return result.recordset[0]?.StatusID ?? 1;
};

// 1 = Normal, 2 = Exception, 3 = RTO
const resolveFlowType = (value) => {
  if (!value) return 1;
  const v = String(value).toLowerCase();
  if (v.includes("rto")) return 3;
  if (v.includes("exception")) return 2;
  return 1;
};

/* =========================
   CORE INGESTION
========================= */

const ingestLSPPayloadService = async ({ lspCode, lspName, dispatchOrderNo, data }) => {
  const fieldMap = await getLSPFieldMappings(lspName);
  const normalizedData = transformToCommonFields(data, fieldMap);

  if (!normalizedData.LRNumber) {
    throw new Error("LRNumber is mandatory");
  }

  // Resolve status
  const statusValue = normalizedData.Status || normalizedData.StatusID;
  if (typeof statusValue === "number" && statusValue > 0) {
    normalizedData.Status = statusValue;
  } else {
    normalizedData.Status = await resolveStatusId(statusValue);
  }

  normalizedData.LSPCode = lspCode;

  // Flow + Critical
  normalizedData.NormalExceptionRTO = resolveFlowType(
    normalizedData.RTO || normalizedData.LastStatusRemarks || ""
  );

  normalizedData.IsCritical = normalizedData.NormalExceptionRTO !== 1 ? 1 : 0;

  // Ensure mandatory NOT NULL fields
  normalizedData.Status = normalizedData.Status ?? 1;
  normalizedData.NormalExceptionRTO = normalizedData.NormalExceptionRTO ?? 1;
  normalizedData.IsCritical = normalizedData.IsCritical ?? 0;

  // Insert versioned LRN
  await insertLRNDetailsVersionService(normalizedData);

  // Dispatch ↔ LRN mapping
  if (dispatchOrderNo) {
    await addOrSwitchLRNService(dispatchOrderNo, normalizedData.LRNumber, lspCode);
  }

  return {
    message: "LSP payload ingested successfully",
    normalizedData
  };
};

/* =========================
   VERSIONED LRN INSERT
========================= */

const insertLRNDetailsVersionService = async (data) => {
  const pool = getPool1();
  const transaction = await pool.transaction();

  try {
    await transaction.begin();
    const request = transaction.request();

    // Mandatory inputs
    request.input("LRNumber", data.LRNumber);
    request.input("LSPCode", data.LSPCode);
    request.input("Status", data.Status);
    request.input("NormalExceptionRTO", data.NormalExceptionRTO);
    request.input("IsCritical", data.IsCritical);

    // Get next version
    const versionResult = await request.query(`
      SELECT ISNULL(MAX(Version), 0) + 1 AS NextVersion
      FROM ${database}.dbo.LRNDetails
      WHERE LRNumber = @LRNumber
    `);

    const nextVersion = versionResult.recordset[0].NextVersion;
    request.input("Version", nextVersion);

    // Dynamic fields
    const skipCols = ["LRNumber", "Version", "Status", "LSPCode", "NormalExceptionRTO", "IsCritical"];
    const lrnColumns = await getLRNColumnsFromDB();

    lrnColumns.forEach(col => {
      if (skipCols.includes(col)) return;
      request.input(col, data[col] ?? null);
    });

    // Final insert
    const query = `
      INSERT INTO ${database}.dbo.LRNDetails
      (LRNumber, Version, LSPCode, Status,
       NormalExceptionRTO, IsCritical,
       LRDate, PickupTimeStamp, OrderNo,
       PromisedDate, EstimatedDate, ChargedWt,
       PackageAmount, BoxCount, NoOfDelAttempts,
       LastDelAttemptDate, LastDelAttemptRemarks,
       DeliveryDate, LastStatusTimeStamp,
       LastStatusLocation, LastStatusRemarks,
       RTO, CourierName, InsertedOn)
      VALUES
      (@LRNumber, @Version, @LSPCode, @Status,
       @NormalExceptionRTO, @IsCritical,
       @LRDate, @PickupTimeStamp, @OrderNo,
       @PromisedDate, @EstimatedDate, @ChargedWt,
       @PackageAmount, @BoxCount, @NoOfDelAttempts,
       @LastDelAttemptDate, @LastDelAttemptRemarks,
       @DeliveryDate, @LastStatusTimeStamp,
       @LastStatusLocation, @LastStatusRemarks,
       @RTO, @CourierName, GETDATE())
    `;

    await request.query(query);
    await transaction.commit();

    return { message: "LRN version inserted", version: nextVersion };
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
};

/* =========================
   DISPATCH ↔ LRN
========================= */

const addOrSwitchLRNService = async (dispatchOrderNo, lrNumber, LSPCode) => {
  const pool = getPool1();
  const transaction = await pool.transaction();

  try {
    await transaction.begin();
    const request = transaction.request();

    request.input("DispatchOrderNo", dispatchOrderNo);
    request.input("LRNumber", lrNumber);
    request.input("LSPCode", LSPCode);

    // Disable old mapping
    await request.query(`
      UPDATE ${database}.dbo.DispatchLRNTracking
      SET Status = 0
      WHERE DispatchOrderNo = @DispatchOrderNo AND Status = 1
    `);

    const versionResult = await request.query(`
      SELECT ISNULL(MAX(Version), 0) + 1 AS NextVersion
      FROM ${database}.dbo.DispatchLRNTracking
      WHERE DispatchOrderNo = @DispatchOrderNo
    `);

    const nextVersion = versionResult.recordset[0].NextVersion;

    await request.query(`
      INSERT INTO ${database}.dbo.DispatchLRNTracking
      (DispatchOrderNo, LRNumber, Version, LSPCode, Status, InsertedOn)
      VALUES
      (@DispatchOrderNo, @LRNumber, ${nextVersion}, @LSPCode, 1, GETDATE())
    `);

    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
};

/* =========================
   READ APIS
========================= */

const getAllLSPsService = async () => {
  const pool = getPool1();
  const result = await pool.request().query(`
    SELECT ID, LSPName
    FROM ${database}.dbo.LSPMaster
    WHERE ISNULL(Status,1)=1
    ORDER BY LSPName
  `);
  return result.recordset;
};

const getCommonFieldsService = async () => {
  const pool = getPool1();
  const result = await pool.request().query(`
    SELECT FieldName
    FROM ${database}.dbo.CommanFieldMaster
    WHERE ISNULL(Status,1)=1
    ORDER BY ID
  `);
  return result.recordset.map(r => r.FieldName);
};

const getFieldMappingService = async (lspCode) => {
  const pool = getPool1();
  const lspResult = await pool.request()
    .input("ID", lspCode)
    .query(`SELECT LSPName FROM ${database}.dbo.LSPMaster WHERE ID = @ID`);

  if (!lspResult.recordset.length) throw new Error("Invalid LSP");

  return getLSPFieldMappings(lspResult.recordset[0].LSPName);
};

const getLRNsByDispatchService = async (dispatchOrderNo) => {
  const pool = getPool1();
  const request = pool.request();
  request.input("DispatchOrderNo", dispatchOrderNo);

  const result = await request.query(`
    SELECT *
    FROM ${database}.dbo.DispatchLRNTracking
    WHERE DispatchOrderNo = @DispatchOrderNo
    ORDER BY Version DESC
  `);

  return result.recordset;
};

const getLRNDetailsService = async (lrNumber) => {
  const pool = getPool1();
  const request = pool.request();
  request.input("LRNumber", lrNumber);

  const query = `
    SELECT ld.*, lsp.LSPName, st.StatusName
    FROM ${database}.dbo.LRNDetails ld
    JOIN ${database}.dbo.LSPMaster lsp ON ld.LSPCode = lsp.ID
    JOIN ${database}.dbo.Status1Master st ON ld.Status = st.StatusID
    WHERE ld.LRNumber = @LRNumber
      AND ld.Version = (
        SELECT MAX(Version)
        FROM ${database}.dbo.LRNDetails
        WHERE LRNumber = @LRNumber
      )
  `;

  const result = await request.query(query);
  return result.recordset[0] || null;
};

const getLRNsByStatusService = async (statusId) => {
  const pool = getPool1();
  const request = pool.request();
  request.input("Status", statusId);

  const query = `
    WITH Latest AS (
      SELECT *, ROW_NUMBER() OVER (PARTITION BY LRNumber ORDER BY Version DESC) rn
      FROM ${database}.dbo.LRNDetails
    )
    SELECT ld.*, lsp.LSPName, st.StatusName
    FROM Latest ld
    JOIN ${database}.dbo.LSPMaster lsp ON ld.LSPCode = lsp.ID
    JOIN ${database}.dbo.Status1Master st ON ld.Status = st.StatusID
    WHERE ld.rn = 1 AND ld.Status = @Status
    ORDER BY ld.InsertedOn DESC
  `;

  const result = await request.query(query);
  return result.recordset;
};

const getLRNHistoryService = async (lrNumber) => {
  const pool = getPool1();
  const request = pool.request();
  request.input("LRNumber", lrNumber);

  const query = `
    SELECT ld.*, lsp.LSPName, st.StatusName
    FROM ${database}.dbo.LRNDetails ld
    JOIN ${database}.dbo.LSPMaster lsp ON ld.LSPCode = lsp.ID
    JOIN ${database}.dbo.Status1Master st ON ld.Status = st.StatusID
    WHERE ld.LRNumber = @LRNumber
    ORDER BY ld.Version DESC
  `;

  const result = await request.query(query);
  return result.recordset;
};

/* =========================
   Actions
========================= */

const addActionService = async ({
  LRNumber,
  Version,
  Message,
  Photos,
  UserID
}
) => {
  
  const pool = getPool1();
  const transaction = await pool.transaction();
  
  try {
    await transaction.begin();
    const request = transaction.request();

    const insertResult = await request
      .input("LRNumber", LRNumber)
      .input("Version", Version)
      .input("Message", Message)
      .input("Photos", Photos || null)
      .input("UserID", UserID)
      .query(`
        INSERT INTO ${database}.dbo.Actions
        (LRNumber, Version, Message, Photos, UserID)
        OUTPUT INSERTED.ActionID
        VALUES
        (@LRNumber, @Version, @Message, @Photos, @UserID)
      `);

    const actionId = insertResult.recordset[0].ActionID;

    // 2️⃣ Append ActionID to LRNDetails
    await request
      .input("ActionID", actionId.toString())
      .query(`
        UPDATE ${database}.dbo.LRNDetails
        SET ActionIDs =
          CASE
            WHEN ActionIDs IS NULL OR ActionIDs = ''
            THEN @ActionID
            ELSE ActionIDs + ',' + @ActionID
          END
        WHERE LRNumber = @LRNumber
          AND Version = @Version
      `);

    await transaction.commit();

    return { message: "Action added", actionId };
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
};

const getLRNActionsService = async (lrNumber, version) => {
  const pool = getPool1();

  // 1️⃣ Get ActionIDs
  const lrnResult = await pool.request()
    .input("LRNumber", lrNumber)
    .input("Version", version)
    .query(`
      SELECT ActionIDs
      FROM ${database}.dbo.LRNDetails
      WHERE LRNumber = @LRNumber
        AND Version = @Version
    `);

  const actionIdsStr = lrnResult.recordset[0]?.ActionIDs;
  if (!actionIdsStr) return [];

  const actionIds = actionIdsStr.split(",").map(Number);

  // 2️⃣ Fetch actions
  const actionsResult = await pool.request().query(`
    SELECT *
    FROM ${database}.dbo.Actions
    WHERE ActionID IN (${actionIds.join(",")})
    ORDER BY ActionTime DESC
  `);

  return actionsResult.recordset;
};


/* =========================
   EXPORTS
========================= */

export {
  ingestLSPPayloadService,
  insertLRNDetailsVersionService,
  addOrSwitchLRNService,
  getLRNDetailsService,
  getLRNsByStatusService,
  getAllLSPsService,
  getCommonFieldsService,
  getFieldMappingService,
  getLRNsByDispatchService,
  getLRNHistoryService,
  addActionService,
  getLRNActionsService
};
