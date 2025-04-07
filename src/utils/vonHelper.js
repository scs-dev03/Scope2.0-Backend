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
  const pool = await getPool1();
  const transaction = pool.transaction();
  console.log(tableName);
  
  try {
    await transaction.begin();
    // ✅ Explicitly specify database and schema
    const databaseName = "UAD_VON";
    const schemaName = "dbo"; // Replace with your schema if different
    const fullTableName = `${databaseName}.${schemaName}.UAD_VON_SPMFeedback_9`;

    const table = new sql.Table(fullTableName); // Use fully qualified name
    table.create = false;

    // 1. CORRECT COLUMN DEFINITIONS TO MATCH YOUR SCHEMA
    // ------------------------------------------------
    // Original schema from your database:
    // Brandid (int, nullable)
    // Dealerid (int, NOT NULL)
    // Locationid (int, NOT NULL)
    // LatestPartID (varchar(100), nullable)
    // PreviousFBID (int, nullable)
    
    table.columns.add('Brandid', sql.Int, { nullable: true });          // int
    table.columns.add('Dealerid', sql.Int, { nullable: false });        // int (WAS VARCHAR)
    table.columns.add('Locationid', sql.Int, { nullable: false });      // int (WAS VARCHAR)
    table.columns.add('MaxValue', sql.Decimal(18, 2), { nullable: false }); // decimal (WAS INT)
    table.columns.add('PartID', sql.Int, { nullable: false });
    table.columns.add('LatestPartID', sql.VarChar(100), { nullable: true }); // varchar (WAS INT)
    table.columns.add('UserID', sql.Int, { nullable: false });
    table.columns.add('UserFBRemarkID', sql.Int, { nullable: true });
    table.columns.add('CustomRem', sql.VarChar(50), { nullable: true }); // varchar(50)
    table.columns.add('ProposedQty', sql.Int, { nullable: true });
    table.columns.add('PreviousFBID', sql.Int, { nullable: true });     // int (WAS VARCHAR)

    // 2. DATA CONVERSION BEFORE INSERTION
    // -----------------------------------
    formattedData.forEach(row => {
      // Convert string numbers to integers where needed
      const convertedRow = {
        ...row,
        Dealerid: parseInt(row.dealerid, 10),
        Locationid: parseInt(row.locationid, 10),
        PreviousFBID: row.PreviousFBID ? parseInt(row.PreviousFBID, 10) : null,
        LatestPartID: row.latestpartid ? String(row.latestpartid) : null // Handle object/null
      };

      // Validate critical fields
      if (isNaN(convertedRow.Dealerid)) {
        throw new Error(`Invalid Dealerid: ${row.dealerid}`);
      }

      table.rows.add(
        convertedRow.brandid,
        convertedRow.Dealerid,        // Now a number
        convertedRow.Locationid,      // Now a number
        convertedRow.maxvalue,        // Should be decimal (verify input)
        convertedRow.partid,
        convertedRow.LatestPartID,    // String or null
        convertedRow.UserID,
        convertedRow.UserFBRemarkID,
        convertedRow.CustomRem,
        convertedRow.ProposedQty,
        convertedRow.PreviousFBID     // Now a number or null
      );
    });

    // 3. PROPER TRANSACTION HANDLING
    // ------------------------------
    const request = new sql.Request(transaction); // Use transaction, not pool
    await request.bulk(table);
    await transaction.commit();
    console.log('Bulk insert successful');
    return

  } catch (err) {
    console.error('Error during bulk insert:', err);
    await transaction.rollback();
    throw err; // Re-throw for upstream handling
  } finally {
    await pool.close();
  }
};



export {partBrandCheck,readExcel,insertData}
