import { getPool1 } from "../../db/db.js";
import sql from "mssql";
const database = "UAD_LSPMonitoringSystemDB";

/**
 * Get all active LSPs
 */
const getAllLSPsService = async () => {
  const pool = getPool1();

  const query = `
    SELECT 
      ID,
      LSPName
    FROM dbo.LSPMaster
    WHERE ISNULL(Status, 1) = 1
    ORDER BY LSPName
  `;

  const result = await pool.request().query(query);
  return result.recordset;
};

/**
 * Get common fields (master list)
 */
const getCommonFieldsService = async () => {
  const pool = getPool1();
  const query = `
    SELECT FieldName
    FROM dbo.CommanFieldMaster
    WHERE ISNULL(Status, 1) = 1
    ORDER BY ID
  `;
  const result = await pool.request().query(query);
  return result.recordset.map((r) => r.FieldName);
};

/**
 * Get field mappings for an LSP
 */
const getFieldMappingService = async (lspCode) => {
  const pool = getPool1();
  // Get LSP column name from master
  const lspResult = await pool.request()
    .input("LSPCode", lspCode)
    .query(`
      SELECT LSPName
      FROM dbo.LSPMaster
      WHERE ID = @LSPCode
    `);

  if (lspResult.recordset.length === 0) {
    throw new Error("Invalid LSP ID");
  }

  const lspName = lspResult.recordset[0].LSPName;
  // Whitelist (double safety)
  const allowedLSPs = [
    "DelhiverySurface",
    "Express",
    "Smartr",
    "Trackon",
    "Rocketbox",
    "SimplyLogistics",
    "Ecom"
  ];

  if (!allowedLSPs.includes(lspName)) {
    throw new Error("Unsupported LSP");
  }

  const safeColumn = `[${lspName}]`;

  // Query mapping
  const query = `
    SELECT
      CommanField AS CommonFieldName,
      ${safeColumn} AS LSPFieldName
    FROM dbo.FieldMappingMastertbl
    WHERE ${safeColumn} IS NOT NULL
      AND ${safeColumn} <> 'NA'
    ORDER BY ID
  `;

  const result = await pool.request().query(query);
  return result.recordset;
};

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
      UPDATE dbo.DispatchLRNTracking
      SET Status = 0
      WHERE DispatchOrderNo = @DispatchOrderNo AND Status = 1
    `);

    // Get next version number
    const versionResult = await request.query(`
      SELECT MAX(Version) AS MaxVersion
      FROM dbo.DispatchLRNTracking
      WHERE DispatchOrderNo = @DispatchOrderNo
    `);

    const nextVersion = (versionResult.recordset[0].MaxVersion || 0) + 1;

    // Insert new LRN
    const insertResult = await request.query(`
      INSERT INTO dbo.DispatchLRNTracking
        (DispatchOrderNo, LRNumber, Version, LSPCode, Status, InsertedOn)
      VALUES
        (@DispatchOrderNo, @LRNumber, ${nextVersion}, @LSPCode, 1, GETDATE());
    `);

    await transaction.commit();

    return {
      message: `LRN ${lrNumber} added as version ${nextVersion} and set active`,
    };
  } catch (err) {
    await transaction.rollback();
    console.error("Transaction failed:", err);
    throw new Error("Failed to add/switch LRN");
  }
};

const upsertLRNDetailsService = async (data) => {
  const pool = getPool1();
  const transaction = await pool.transaction();

  try {
    await transaction.begin();
    const request = transaction.request();

    // Add all inputs dynamically
    Object.keys(data).forEach((key) => {
      request.input(key, data[key]);
    });

    // Upsert query
    const query = `
      IF EXISTS (SELECT 1 FROM dbo.LRNDetails WHERE LRNumber = @LRNumber)
      BEGIN
        UPDATE dbo.LRNDetails
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
          StatusID = @StatusID
        WHERE LRNumber = @LRNumber
      END
      ELSE
      BEGIN
        INSERT INTO dbo.LRNDetails
        (LRNumber, LSPCode, LRDate, PickupTimeStamp, OrderNo, PromisedDate, EstimatedDate,
         ChargedWt, PackageAmount, BoxCount, NoOfDelAttempts, LastDelAttemptDate, LastDelAttemptRemarks,
         DeliveryDate, LastStatusTimeStamp, LastStatusLocation, LastStatusRemarks, RTO, CourierName, StatusID)
        VALUES
        (@LRNumber, @LSPCode, @LRDate, @PickupTimeStamp, @OrderNo, @PromisedDate, @EstimatedDate,
         @ChargedWt, @PackageAmount, @BoxCount, @NoOfDelAttempts, @LastDelAttemptDate, @LastDelAttemptRemarks,
         @DeliveryDate, @LastStatusTimeStamp, @LastStatusLocation, @LastStatusRemarks, @RTO, @CourierName, @StatusID)
      END
    `;

    await request.query(query);
    await transaction.commit();

    return { message: `LRN ${data.LRNumber} upserted successfully` };
  } catch (err) {
    await transaction.rollback();
    console.error("Transaction failed:", err);
    throw new Error("Failed to upsert LRNDetails");
  }
};

const getLRNsByDispatchService = async (dispatchOrderNo) => {
  const pool = getPool1();
  const request = pool.request();
  request.input("DispatchOrderNo", dispatchOrderNo);

  const query = `
    SELECT *
    FROM dbo.DispatchLRNTracking
    WHERE DispatchOrderNo = @DispatchOrderNo
    ORDER BY Version DESC
  `;

  const result = await request.query(query);
  return result.recordset;
};

const getLRNDetailsService = async (lrNumber) => {
  const pool = getPool1();
  const request = pool.request();
  request.input("LRNumber", lrNumber);

  const query = `
    SELECT ld.*, lsp.LSPName, st.StatusName AS StatusName
    FROM dbo.LRNDetails ld
    JOIN dbo.LSPMaster lsp ON ld.LSPCode = lsp.ID
    JOIN dbo.Status1Master st ON ld.StatusID = st.StatusID
    WHERE ld.LRNumber = @LRNumber
  `;
  const result = await request.query(query);
  return result.recordset[0] || null;
};

const getLRNsByStatusService = async (statusId) => {
  const pool = getPool1();
  const request = pool.request();
  request.input("StatusID", statusId);

  const query = `
    SELECT 
    ld.*, 
    lsp.LSPName, 
    st.StatusName
    FROM dbo.LRNDetails ld
    JOIN dbo.LSPMaster lsp ON ld.LSPCode = lsp.ID
    JOIN dbo.Status1Master st ON ld.StatusID = st.StatusID
    WHERE ld.StatusID = @StatusID
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
};
