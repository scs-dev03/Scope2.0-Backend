import sql from 'mssql'
import xlsx from 'xlsx'
import { getPool1 } from '../db/db.js'

const partBrandCheck = async(dealerid,locationid,partid)=>{
    try {
        const pool = await getPool1()
        const partCheck = `use [z_scope]  SELECT CASE 
                          WHEN EXISTS (SELECT 1 FROM locationinfo WHERE brandid = (SELECT brandid FROM Part_Master WHERE partid = ${partid})
                          AND dealerid = ${dealerid} 
                          AND locationid = ${locationid}
                          ) THEN 'YES' ELSE 'NO' END AS PartCheck;`

        const result = await pool.request().query(partCheck)                        
        if(result.recordset[0].PartCheck === 'NO' ){
             return false
        }
        else{
            return true
        }
        } catch (error) {
          res.status(500).json({Error:error.message})
        }
}

const readExcel = async (filePath)=>{
      let data
      //  filePath = req.file.path;
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0]; // Read the first sheet
      return data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
}

//----------ROW BY ROW INSERTION -----------

const insertData = async (formattedData,tableName)=>{
  const pool = await getPool1()
  const transaction = pool.transaction()

  await transaction.begin();
   console.log(`Inserting Data...`);
   
  for (const row of formattedData) {
    const columns = Object.keys(row).join(", ");
    const values = Object.keys(row)
      .map((_, idx) => `@val${idx}`)
      .join(", ");

    const query = `INSERT INTO ${tableName} (${columns}) VALUES (${values})`;

    const request = transaction.request();

    // Bind parameters dynamically
    Object.values(row).forEach((val, idx) => {
      request.input(`val${idx}`, val);
    });

    await request.query(query);
  }
  console.log(`DATA INSERTED `);
  
  await transaction.commit(); // Commit transaction
}


// -----------BULK INSERTION ---------------------------
// const insertData = async (formattedData, tableName) => {
//   console.log(tableName);
  
//   const pool = await getPool1();
//   const transaction = pool.transaction();
//   await transaction.begin();

//   try {
//       await pool.request().query('use UAD_VON')
//       const table = new sql.Table('UAD_VON_SPMFeedback_9'); // Using 'sql' from 'mssql' package
//       table.create=false;
//        // Define only the columns present in the formatted data
//     table.columns.add("Brandid", sql.Int);
//     table.columns.add("Dealerid", sql.Int);
//     table.columns.add("Locationid", sql.Int);
//     table.columns.add("PartID", sql.Int);
//     table.columns.add("LatestPartID", sql.VarChar(100));
//     table.columns.add("MaxValue", sql.Decimal(10, 2));
//     table.columns.add("UserID", sql.Int);
//     table.columns.add("UserFBRemarkID", sql.Int);
//     table.columns.add("CustomRem", sql.VarChar(50));
//     table.columns.add("ProposedQty", sql.Int);
//     table.columns.add("PreviousFBID", sql.Int, { nullable: true });

//     console.log(table);

//      // Convert and add rows
//     // 
//     const values1 = formattedData.map((row) => {
//       return [
//         Number(row.brandid),                      // ✅ Ensure Integer
//         Number(row.dealerid),                     // ✅ Convert to Integer
//         Number(row.locationid),                   // ✅ Convert to Integer
//         parseFloat(row.maxvalue).toFixed(2),                 // ✅ Ensure Decimal (if required)
//         Number(row.partid),                        // ✅ Ensure Integer
//         row.latestpartid ? String(row.latestpartid) : "", // ✅ Convert to String
//         Number(row.UserID),                        // ✅ Ensure Integer
//         Number(row.UserFBRemarkID),                // ✅ Ensure Integer
//         String(row.CustomRem),                     // ✅ Convert to String
//         Number(row.ProposedQty),                   // ✅ Ensure Integer
//         row.PreviousFBID ? Number(row.PreviousFBID) : null // ✅ Convert to Integer or Null
//       ];
//     });

// console.log(values1);

//       await pool.request().bulk(table)
//       await transaction.commit();
//   } catch (error) {
//       await transaction.rollback();
//       throw error;
//   }
// };
// const insertData = async (formattedData, tableName) => {
//   console.log("Inserting into table:", tableName);

//   const pool = await getPool1();
//   const transaction = pool.transaction();
//   await transaction.begin();

//   try {
//     await transaction.request().query('USE UAD_VON'); // Use the correct transaction context

//     const table = new sql.Table('UAD_VON_SPMFeedback_9'); // Dynamic table name
//     table.create = false;
//     table.columns.add("brandid", sql.TinyInt);
//     table.columns.add("dealerid", sql.Int);
//     table.columns.add("locationid", sql.Int);
//     table.columns.add("maxvalue", sql.Decimal(10, 2));
//     table.columns.add("partid", sql.Int);
//     table.columns.add("latestpartid", sql.VarChar);
//     table.columns.add("UserID", sql.Int);
//     table.columns.add("UserFBRemarkID", sql.Int);
//     table.columns.add("CustomRem", sql.NVarChar(sql.MAX));
//     table.columns.add("ProposedQty", sql.Int);
//     table.columns.add("PreviousFBID", sql.BigInt, { nullable: true });

//     // Validate and add rows
//     formattedData.forEach((row, index) => {
//       const errors = [];

//       // Validate numeric fields
//       if (isNaN(row.brandid) || row.brandid === null) errors.push(`Invalid brandid: ${row.brandid}`);
//       if (isNaN(parseInt(row.dealerid, 10))) errors.push(`Invalid dealerid: ${row.dealerid}`);
//       if (isNaN(parseInt(row.locationid, 10))) errors.push(`Invalid locationid: ${row.locationid}`);
//       if (isNaN(parseFloat(row.maxvalue))) errors.push(`Invalid maxvalue: ${row.maxvalue}`);
//       if (isNaN(row.partid)) errors.push(`Invalid partid: ${row.partid}`);
//       if (row.PreviousFBID && isNaN(parseInt(row.PreviousFBID, 10))) errors.push(`Invalid PreviousFBID: ${row.PreviousFBID}`);

//       // If any errors exist, log them and skip the row
//       if (errors.length > 0) {
//         console.error(`Row ${index + 1} has errors:`, errors);
//       } else {
//         // Add only valid rows
//         table.rows.add(
//           row.brandid,
//           parseInt(row.dealerid, 10),
//           parseInt(row.locationid, 10),
//           parseFloat(row.maxvalue),
//           row.partid,
//           row.latestpartid || "", // Handle null values for strings
//           row.UserID,
//           row.UserFBRemarkID,
//           row.CustomRem,
//           row.ProposedQty,
//           row.PreviousFBID ? BigInt(row.PreviousFBID) : null // Use BigInt for large IDs
//         );
//       }
//     });

//     // Insert data in bulk
//     await transaction.request().bulk(table);

//     await transaction.commit();
//     console.log("Data inserted successfully!");
//   } catch (error) {
//     await transaction.rollback();
//     console.error("Error inserting data:", error);
//     throw error;
//   }
// };
// const insertData = async (formattedData, tableName) => {
//   console.log("Table Name:", tableName);

//   const pool = await getPool1();
//   const transaction = pool.transaction();
//   await transaction.begin();

//   try {
//     await pool.request().query("USE UAD_VON");

//     const table = new sql.Table('UAD_VON_SPMFeedback_9');
//     table.create = false;

//     table.create = false;
//         table.columns.add('Brandid', sql.Int, { nullable: false });
//         table.columns.add('Dealerid', sql.Int, { nullable: false });
//         table.columns.add('Locationid', sql.Int, { nullable: false });
//         table.columns.add('MaxValue', sql.Decimal(10, 2), { nullable: false });
//         table.columns.add('PartID', sql.Int, { nullable: false });
//         table.columns.add('LatestPartID', sql.VarChar(100), { nullable: true });
//         table.columns.add('UserID', sql.Int, { nullable: false });
//         table.columns.add('UserFBRemarkID', sql.Int, { nullable: false });
//         table.columns.add('CustomRem', sql.VarChar(50), { nullable: true });
//         table.columns.add('ProposedQty', sql.Int, { nullable: false });
//         table.columns.add('PreviousFBID', sql.Int, { nullable: true });


//         formattedData.forEach(row => {
//             table.rows.add(
//                 row.brandid,
//                 parseInt(row.dealerid),
//                 parseInt(row.locationid),
//                 row.maxvalue,
//                 row.partid,
//                 row.latestpartid || null,
//                 row.UserID,
//                 row.UserFBRemarkID,
//                 row.CustomRem || null,
//                 row.ProposedQty,
//                 row.PreviousFBID ? parseInt(row.PreviousFBID) : null,

//             );
//         });

//     await pool.request().bulk(table);
//     await transaction.commit();
//     console.log("✅ Data Inserted Successfully!");

//   } catch (error) {
//     await transaction.rollback();
//     console.error("❌ Error in dealerUpload:", error);
//   }
// };






export {partBrandCheck,readExcel,insertData}