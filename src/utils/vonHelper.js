import sql from 'mssql'
import xlsx from 'xlsx'
import { getPool1, getPool2 } from '../db/db.js'

const partBrandCheck = async (dealerid, locationid, partid) => {
  try {
    const pool = await getPool2()
    const partCheck = `
        use z_scope
        SELECT 
        CASE 
        WHEN EXISTS (
        SELECT 1 
        FROM Stockable_Nonstockable_TD001_${dealerid} 
        WHERE locationid = ${locationid} 
        AND partid = ${partid} 
        AND addedby <> 7
        AND stockdate = (SELECT MAX(stockdate) FROM Stockable_Nonstockable_TD001_${dealerid} where locationid = ${locationid} and addedby <> 7)
        ) 
        THEN 'YES' 
        ELSE 'NO' 
        END AS Result`

    const result = await pool.request().query(partCheck)
    if (result.recordset[0].Result === 'YES') {
      return true
    }
    else {
      return false
    }
  } catch (error) {
    // console.log(error.message);
    throw new Error(`partBrandCheck failed : ${error.message}`);


  }
}
const statusCheck = async (locationid, partid, table) => {
  const pool = await getPool2()
  // console.log(locationid,partid,table);
  const query = `select top 1 status from ${table} where locationid = ${locationid} and partid = ${partid} order by feedbackid desc`
  const result = await pool.request().query(query)
  const resultarray = result.recordset
  const isArrayEmpty = (arr) => !arr || arr.length === 0;
  if (isArrayEmpty(resultarray)) {
    return true
  }
  const status = result.recordset[0].status
  // console.log(result.recordset[0]);
  // console.log(`status`,status);

  if (status == undefined) {
    return true
  }
  if (status === 'Pending') {
    return false
  }
  return true
}
// const readExcel = async (filePath)=>{
//       let data
//       //  filePath = req.file.path;
//       const workbook = xlsx.readFile(filePath);
//       const sheetName = workbook.SheetNames[0]; // Read the first sheet
//       return data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
// }
const readExcel = async (filePath) => {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Get data as array of rows
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

  const headers = rows[0]; // First row
  const data = xlsx.utils.sheet_to_json(sheet); // Normal JSON data using headers

  return { headers, data };
};


//----------ROW BY ROW INSERTION -----------

// const insertData = async (formattedData,tableName)=>{
//   const pool = await getPool1()
//   const transaction = pool.transaction() 

//   await transaction.begin();
//    console.log(`Inserting Data...`);

//   for (const row of formattedData) {
//     const columns = Object.keys(row).join(", ");
//     const values = Object.keys(row)
//       .map((_, idx) => `@val${idx}`)
//       .join(", ");

//     const query = `INSERT INTO ${tableName} (${columns}) VALUES (${values})`;

//     const request = transaction.request();

//     // Bind parameters dynamically
//     Object.values(row).forEach((val, idx) => {
//       request.input(`val${idx}`, val);
//     });

//     await request.query(query);
//   }
//   console.log(`DATA INSERTED `);

//   await transaction.commit(); // Commit transaction
// }

// -----------BULK INSERTION ---------------------------
const insertData = async (formattedData, tableName) => {
  const pool = await getPool2();
  const transaction = pool.transaction();
  // console.log(`tablename`,tableName);

  try {
    await transaction.begin();
    // ✅ Explicitly specify database and schema
    const name = tableName.split("..").pop()
    const databaseName = "UAD_VON";
    const schemaName = "dbo"; // Replace with your schema if different
    const fullTableName = `${databaseName}.${schemaName}.${name}`;

    // const fullTableName = `${databaseName}.${schemaName}.UAD_VON_SPMFeedback_9`;
    // console.log(fullTableName);

    const table = new sql.Table(fullTableName); // Use fully qualified name
    table.create = false;


    // 2) Define the 11 non-default columns, in exact ordinal order & types:
    table.columns.add('Brandid', sql.TinyInt, { nullable: false });   // tinyint
    table.columns.add('Dealerid', sql.Int, { nullable: false });  // int
    table.columns.add('Locationid', sql.Int, { nullable: false });  // int
    table.columns.add('PartID', sql.Int, { nullable: false });  // int
    table.columns.add('LatestPartID', sql.VarChar(100), { nullable: true });  // varchar(100)
    table.columns.add('MaxValue', sql.Decimal(10, 2), { nullable: false });  // decimal(10,2)
    table.columns.add('UserID', sql.Int, { nullable: false });  // int
    table.columns.add('UserFBRemarkID', sql.Int, { nullable: true });  // int
    table.columns.add('CustomRem', sql.NVarChar(500), { nullable: true });  // nvarchar(500)
    table.columns.add('ProposedQty', sql.Decimal(10, 2), { nullable: true });  // decimal(10,2)  ← fixed!
    table.columns.add('PreviousFBID', sql.BigInt, { nullable: true });  // bigint

    // 3) When adding rows, make sure you parse ProposedQty as a float:
    formattedData.forEach(r => {
      table.rows.add(
        parseInt(r.brandid, 10),
        parseInt(r.dealerid, 10),
        parseInt(r.locationid, 10),
        parseInt(r.partid, 10),
        r.latestpartid != null ? String(r.latestpartid) : null,
        parseFloat(r.maxvalue),
        parseInt(r.UserID, 10),
        r.UserFBRemarkID != null ? parseInt(r.UserFBRemarkID, 10) : null,
        r.CustomRem || null,
        r.ProposedQty != null ? parseFloat(r.ProposedQty) : null, // decimal(10,2)
        r.PreviousFBID != null ? parseInt(r.PreviousFBID, 10) : null
      );
    });
    // console.log(`inside`,formattedData[0]);

    // 3. PROPER TRANSACTION HANDLING
    // ------------------------------
    const request = new sql.Request(transaction); // Use transaction, not pool
    await request.bulk(table);
    await transaction.commit();
    // console.log('Bulk insert successful');
    return

  } catch (err) {
    console.error('Error during bulk insert Dealer Feedback VON:', err, tableName);
    await transaction.rollback();
    throw err; // Re-throw for upstream handling
  }
};

const insertAdminFeedback = async (formattedData, brandid) => {
  const pool = await getPool2();
  const transaction = pool.transaction();

  try {
    await transaction.begin();
    // ✅ Explicitly specify database and schema
    const databaseName = "UAD_VON";
    const schemaName = "dbo"; // Replace with your schema if different
    // const fullTableName = `${databaseName}.${schemaName}.${tableName}`;
    const fullTableName = `${databaseName}.${schemaName}.UAD_VON_AdminFeedback_${brandid}`;

    // console.log(fullTableName);

    const table = new sql.Table(fullTableName);
    table.create = false;

    // Define columns to match your schema
    table.columns.add('Brandid', sql.TinyInt, { nullable: false });
    table.columns.add('Dealerid', sql.Int, { nullable: false });
    table.columns.add('Locationid', sql.Int, { nullable: false });
    table.columns.add('FeedbackID', sql.BigInt, { nullable: false });
    table.columns.add('AdminID', sql.Int, { nullable: false });
    table.columns.add('AdminRemark', sql.NVarChar(sql.MAX), { nullable: true });
    table.columns.add('ApprovedQty', sql.Decimal(18, 2), { nullable: true });
    // table.columns.add('AdminFBDate', sql.DateTime, { nullable: true });
    table.columns.add('PreviousAdminFBID', sql.BigInt, { nullable: true });
    table.columns.add('CustomRem', sql.NVarChar(255), { nullable: true });

    // Process each feedback item    
    formattedData.forEach(item => {
      const convertedRow = {
        Brandid: parseInt(item.brandid, 10),
        Dealerid: parseInt(item.dealerid, 10),
        Locationid: parseInt(item.locationid, 10),
        FeedbackID: BigInt(item.feedbackid),
        AdminID: parseInt(item.AdminID, 10),
        AdminRemark: item.AdminRemarkID ? String(item.AdminRemarkID) : null,
        ApprovedQty: item.ApprovedQty ? parseFloat(item.ApprovedQty) : null,
        // AdminFBDate: new Date(),  // Current timestamp
        PreviousAdminFBID: item.PreviousAdminFBID ? BigInt(item.PreviousAdminFBID) : null,
        CustomRem: item.CustomRem ? String(item.CustomRem) : null
      };

      // Validate required fields
      // if (isNaN(convertedRow.Brandid) || convertedRow.Brandid < 0 || convertedRow.Brandid > 255) {
      //   throw new Error(`Invalid Brandid: ${item.brandid}`);
      // }

      table.rows.add(
        convertedRow.Brandid,
        convertedRow.Dealerid,
        convertedRow.Locationid,
        convertedRow.FeedbackID,
        convertedRow.AdminID,
        convertedRow.AdminRemark,
        convertedRow.ApprovedQty,
        // convertedRow.AdminFBDate,
        convertedRow.PreviousAdminFBID,
        convertedRow.CustomRem
      );
    });
    // console.log(table);
    
    const request = new sql.Request(transaction);
    await request.bulk(table);

    // // After bulk insert, retrieve the inserted AdminFBID values
    // const feedbackIds = formattedData.map(item => item.feedbackid); // or another unique identifier for feedback
    // const query = `
    //   SELECT FeedbackID, AdminFBID 
    //   FROM ${fullTableName} 
    //   WHERE FeedbackID IN (${feedbackIds.join(', ')})
    // `;
    // const result = await request.query(query);

    // // You can now associate AdminFBID with each row
    // const insertedIds = result.recordset.map(row => ({
    //   FeedbackID: row.FeedbackID,
    //   AdminFBID: row.AdminFBID
    // }));

    // // Extract AdminFBID values and join them into a string
    // const FeedbackIDs = insertedIds.map(item => item.FeedbackID).join(',');

    await transaction.commit();
    // console.log('Admin feedback inserted successfully');
    return { success: true, insertedCount: formattedData.length };

  } catch (err) {
    console.error('Error during admin feedback insert:', err);
    await transaction.rollback();
    throw err;
  }
};

function findLocationPartidDuplicates(data) {
  const seen = new Map();
  const duplicates = [];

  data.forEach(item => {
    const key = `${item.Location}-${item.Partid}`;
    // console.log(key);

    if (seen.has(key)) {
      // Add duplicate entry if not already tracked
      if (seen.get(key) === 1) { // Only add once per duplicate group
        duplicates.push({ Location: item.Location, Partid: item.Partid });
      }
      seen.set(key, seen.get(key) + 1);
    } else {
      seen.set(key, 1);
    }
  });
  // console.log(duplicates);

  return duplicates;
}
function findLocationPartidDuplicatesAdmin(data) {
  const seen = new Map();
  const duplicates = [];

  data.forEach(item => {
    const key = `${item.location}-${item.feedbackid}`;

    if (seen.has(key)) {
      // Add duplicate entry if not already tracked
      if (seen.get(key) === 1) { // Only add once per duplicate group
        duplicates.push({ Location: item.location, feedbackid: item.feedbackid });
      }
      seen.set(key, seen.get(key) + 1);
    } else {
      seen.set(key, 1);
    }
  });
  // console.log(duplicates);

  return duplicates;
}

const checkPendingFeedbackAndStatus = async (dealerid, tableName, formattedData, res) => {
  try {
    // Get database connection
    const pool = await getPool2();

    // Fetch pending feedback records for the given dealer
    const query = `SELECT partid, locationid FROM ${tableName} WHERE dealerid = ${dealerid} and status = 'Pending'`;
    // console.log(query);

    const result = await pool.request().query(query);
    const pendingStatusData = result.recordset;

    // Create a Set for quick lookup
    const pendingSet = new Set(pendingStatusData.map(item => `${item.partid}-${item.locationid}`));

    // Find the records in formattedData that exist in pendingStatusData
    const pendingRecords = formattedData.filter(item =>
      pendingSet.has(`${item.partid}-${item.locationid}`)
    );

    return pendingRecords.length > 0 ? pendingRecords : [];


    // Proceed with further processing if no pending records
    // console.log("No pending records found.");
    // return { message: "Success", pending: false };

  } catch (error) {
    // console.error("Error checking pending feedback:", error);
    // return res.status(500).json({ message: "Internal Server Error", error });
    throw new Error(`checkPendingFeedbackAndStatus failed : ${error.message}`);

  }
};

const checkReviewedFeedbackByBrand = async (brandid, formattedData) => {
  try {
    // console.log(brandid, formattedData);

    // Get database connection
    const pool = await getPool2();

    // SQL query with parameterized Brandid
    const query = `
      SELECT af.feedbackid, af.locationid, af.dealerid
      FROM UAD_VON..UAD_VON_AdminFeedback_${brandid} af
      JOIN UAD_VON..UAD_VON_SPMFeedback_${brandid} sf ON sf.FeedbackID = af.FeedbackID
      --WHERE sf.Brandid = ${brandid} AND sf.status = 'Pending'
    `;
    
    const result = await pool
      .request()
      .input('brandid', brandid) // Parameterized query
      .query(query);

    const reviewedStatusData = result.recordset;
    // console.log(reviewedStatusData);

    // Create a Set for quick lookup
    const reviewedSet = new Set(reviewedStatusData.map(item =>
      `${item.feedbackid}-${item.locationid}-${item.dealerid}`
    ));

    // Find the records in formattedData that exist in reviewedStatusData
    const reviewedRecords = formattedData.filter(item =>
      reviewedSet.has(`${item.feedbackid}-${item.locationid}-${item.dealerid}`)
    );
    // console.log( reviewedRecords.length > 0 ? reviewedRecords : []);

    return reviewedRecords.length > 0 ? reviewedRecords : [];



//     const query = ` use UAD_VON select CASE WHEN  count(*) > 0 then 1 else 0 end as [Check] from (select status
//                 from UAD_VON_SPMFeedback_${brandid} 
//                 where FeedbackID in (${ids}) 
//                 )a where Status = 'Reviewed'`
//                 console.log(query);

//     const result = await pool
//       .request()
//       // .input('brandid', brandid) // Parameterized query
//       .query(query);

// return result.recordset

  } catch (error) {
    console.error("Error checking reviewed feedback by brand:", error);
    // return res.status(500).json({ message: "Internal Server Error", error });
  }
};



export { partBrandCheck, readExcel, insertData, insertAdminFeedback, findLocationPartidDuplicates, checkPendingFeedbackAndStatus, findLocationPartidDuplicatesAdmin, checkReviewedFeedbackByBrand, statusCheck }
