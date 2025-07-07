// import sql from 'mssql'
// import {getPool1} from '../db/db.js'
// import { readExcel } from '../utils/vonHelper.js'
// import fs from 'fs'



// const partDetails = async(req,res)=>{

//     try {
//         const pool =  getPool1()
//         const {Brandid,Partnumber,excel}=req.body

//         if (!Brandid || !excel) {
//             return res.status(400).json({ error: 'Brandid and Excel are required' });
//         }
//         let partnumberString = "";
//         // excel = 0  => Read from body , excel = 1 => Read from Excel File
//         if(excel === '0'){
//           if (!Partnumber) {
//             return res.status(400).json({ message: `Enter PartNumbers in an array or comma-separated string` });
//           }
//           let partnumberArray;

//         if (Array.isArray(Partnumber)) {
//           partnumberArray = Partnumber;
//         } else if (typeof Partnumber === "string") {
//           try {
//             // Try parsing it if it's a stringified JSON array
//             const parsed = JSON.parse(Partnumber);
//             if (Array.isArray(parsed)) {
//               partnumberArray = parsed;
//             } else {
//               // Fallback: split by comma if it’s a plain comma-separated string
//       partnumberArray = Partnumber.split(",").map(p => p.trim());
//        }
//           } catch {
//             // If JSON.parse fails, assume comma-separated string
//             partnumberArray = Partnumber.split(",").map(p => p.trim());
//           }
//         } else {
//           return res.status(400).json({ message: `PartNumbers must be an array or comma-separated string` });
//         }

//         // Wrap in single quotes for SQL
//         partnumberString = partnumberArray.map(p => `'${p}'`).join(",");
//         }

//         else{
//           if(req.file == undefined){
//             return res.status(400).json({message:`Must upload a excel file`})
//           }
//           const {path} = req.file

//           const Data = await readExcel(path);
//           fs.unlinkSync(path);
//           // console.log(Data);

//           if(Data.length == 0){
//             return res.status(400).json({message:`No Partnumbers are Given`})
//           }
//           if(Data.length >=1000){
//             return res.status(400).json({message:`More than 1000 Partnumbers`})
//           }

// const  unmatchedParts = await partBrandMappingCheck(Brandid,Data,res)
// // console.log(unmatchedParts);

// if (unmatchedParts.length > 0) {
//   return res.status(400).json({
//     message: 'Some parts are not mapped with the selected brand.',
//     unmatchedParts: unmatchedParts.map(item => String(item.PartNumber).trim())
//   });
// }


//           partnumberString = Data.map(item => `'${item.PartNumber}'`).join(",");
//           // console.log(partnumberString);
//         }
//           const query = `use z_scope select pm.partnumber , pm.partid,
//                         (case when pm.partnumber = sm.partnumber then sm.subpartnumber else pm.partnumber end)as LatestPartno, 
//                         pm.partdesc, pm.moq, pm.category, pm.landedcost,pm.mrp,pm.dateadded,pm.lastupdated from part_master pm
//                         left join substitution_master sm 
//                         ON pm.partnumber = sm.partnumber
//                         where pm.partnumber in (${partnumberString}) and pm.brandid = ${Brandid}`
//         // console.log(query);

//         const result = await pool.request().query(query)
//         // console.log(result.recordset);
//         res.status(200).json(result.recordset) 

//     } catch (error) {
//         console.log(`error in getting part details`,error);

//         res.status(500).json(error)
//     }
// }
// // const getLedgerbyPartid = async (req, res) => {
// //     try {
// //         const pool = getPool1();
// //         const { Dealerid, Locationid, Partid, from, to , excel} = req.body;
// //         // console.log(Partid);

// //         let query = "";

// //         if (!Partid || Partid === 'undefined' || Partid === null) {
// //             const { path } = req.file;

// //             // Step 1: Read Excel and extract part numbers
// //             const excelData = await readExcel(path);
// //             fs.unlinkSync(path); // delete uploaded file

// //             const partNumbersFromExcel = excelData.map(item => item.PartNumber?.toString().trim()).filter(Boolean);

// //             // Step 2: Fetch PartNumber-Partid mapping from DB
// //             const mappingQuery = `SELECT Partid, PartNumber FROM z_scope..Dealer_Sale_Upload_Old_TD001_${Dealerid}`;
// //             const mappingResult = await pool.request().query(mappingQuery);
// //             const mappingData = mappingResult.recordset;
// //             // console.log(mappingData);

// //             // Step 3: Create a dictionary for quick lookup
// //             const partNumberToPartidMap = {};
// //             mappingData.forEach(item => {
// //                 if (item.PartNumber) {
// //                     partNumberToPartidMap[item.PartNumber.trim()] = item.Partid;
// //                 }
// //             });

// //             // Step 4: Map Excel part numbers to partid
// //             const matchedPartids = partNumbersFromExcel
// //                 .map(pn => partNumberToPartidMap[pn])
// //                 .filter(pid => pid !== undefined);

// //             if (matchedPartids.length === 0) {
// //                 return res.status(400).json({ message: "No matching Partids found for the provided part numbers." });
// //             }

// //             const partidString = matchedPartids.join(',');

// //             // Step 5: Build query
// //             query = `USE z_scope EXEC SP_MonthwisemultiPartLedger ${Dealerid}, ${Locationid}, '${partidString}', ${from}, ${to}`;
// //         } else {
// //             // When Partid is provided directly
// //             query = `USE z_scope EXEC SP_MonthwisemultiPartLedger ${Dealerid}, ${Locationid}, ${Partid}, ${from}, ${to}`;
// //         }


// //         // Execute the query
// //         const result = await pool.request().query(query);

// //         res.status(200).json(result.recordsets);

// //     } catch (error) {
// //         console.error("Error:", error);
// //         res.status(500).json({ message: error.message });
// //     }
// // };

// const getLedger = async (req, res) => {
//     const pool = await getPool1();
//     const {Brandid, Dealerid, Locationid, PartNumber, from, to, excel } = req.body;

//     let partnumbers = [];
//     // if(PartNumber.length >= 100){
//     //     return res.status(400).json({message:`More than 100 parts Send in excel`})
//     // }
//     try {
//       // Step 1: Get part numbers based on `excel` flag
//       if (excel == 1) {
//         const Data = await readExcel(req.file.path);
//         fs.unlinkSync(req.file.path); // delete uploaded file
//         const  unmatchedParts = await partBrandMappingCheck(Brandid,Data)
//         // console.log(unmatchedParts);

//         if (unmatchedParts.length > 0) {
//           return res.status(400).json({
//             message: 'Some parts are not mapped with the selected brand.',
//             unmatchedParts: unmatchedParts.map(item => String(item.PartNumber).trim())
//           });
//         }
//         partnumbers = Data.map(item => item.PartNumber?.toString().trim()).filter(Boolean);

//     } else {
//         if(!PartNumber){return res.status(400).json({message:`Partnumber is required`})}
//         if (Array.isArray(PartNumber)) {
//             // already an array, use it directly
//             partnumbers = PartNumber.map(p => p.toString().trim());
//           }
//           else if (typeof PartNumber === 'string') {
//             const raw = PartNumber.trim();
//             if (raw.startsWith('[') && raw.endsWith(']')) {
//               // try to parse JSON
//               try {
//                 partnumbers = JSON.parse(raw).map(p => p.toString().trim());
//               } catch {
//                 return res.status(400).json({
//                   message: 'Invalid JSON array in PartNumber.'
//                 });
//               }
//             } else {
//               // fallback: comma‑separated string
//               partnumbers = raw
//                 .split(',')
//                 .map(p => p.trim())
//                 .filter(Boolean);
//             }
//           }
//           else {
//             return res.status(400).json({
//               message: 'PartNumber must be an array or a string.'
//             });
//           }
//     }

//       if (partnumbers.length === 0) {
//         return res.status(400).json({ message: "No part numbers provided." });
//       }
//       if(partnumbers.length >=1000){
//         return res.status(400).json({message:`More Than 1000 Partnumbers not allowed`})
//       }

//       // Step 2: Fetch PartNumber-Partid mapping from DB
//       const mappingQuery = `SELECT Partid, PartNumber FROM z_scope..Dealer_Sale_Upload_Old_TD001_${Dealerid}`;
//       const mappingResult = await pool.request().query(mappingQuery);
//       const mappingData = mappingResult.recordset;

//       // Step 3: Create a dictionary for quick lookup
//       const partNumberToPartidMap = {};
//       mappingData.forEach(item => {
//         if (item.PartNumber) {
//           partNumberToPartidMap[item.PartNumber.trim()] = item.Partid;
//         }
//       });

//       // Step 4: Map part numbers to part IDs
//       const matchedPartids = partnumbers
//         .map(pn => partNumberToPartidMap[pn])
//         .filter(pid => pid !== undefined);

//       if (matchedPartids.length === 0) {
//         return res.status(400).json({ message: "No matching Partids found for the provided part numbers." });
//       }

//       const partidString = matchedPartids.join(',');
//     //   console.log('Matched PartIDs:', partidString);

//       // TODO: Proceed with partidString in your SQL query or further logic
//     const  query = `USE z_scope EXEC SP_MonthwisemultiPartLedger ${Dealerid}, ${Locationid}, '${partidString}', ${from}, ${to}`;

//     const result = await pool.request().query(query)
//       res.status(200).json({Data:result.recordsets});
//     } catch (error) {
//     //   console.error('getLedger error:', error.message);
//       res.status(500).json({ error: error.message });
//     }
//   };


//   const partBrandMappingCheck = async (Brandid, Data) => {
//     try {
//       const pool = await getPool1();
//       const partBrandMappingQuery = `USE z_scope; SELECT brandid, partnumber FROM Part_Master WHERE brandid = ${Brandid}`;
//       const partBrandMappingResult = await pool.request().query(partBrandMappingQuery);

//       const mappedPartNumbers = new Set(
//         partBrandMappingResult.recordset.map(row => row.partnumber?.trim())
//       );

//       const unmatchedParts = Data.filter(item => {
//         const part = String(item.PartNumber || '').trim();
//         return part && !mappedPartNumbers.has(part);
//       });

//       return unmatchedParts;

//     } catch (error) {
//       console.error(`Error in partBrandMappingCheck: ${error.message}`);
//       throw error; // re-throw so you can catch it in the controller
//     }
//   };


// export {partDetails,getLedger}

import { getPool1  , getPool2 } from '../db/db.js';
import { readExcel } from '../utils/vonHelper.js';
import fs from 'fs';

/**
 * Controller: Fetch part details by part numbers
 * Supports part numbers from body input or uploaded Excel file
 */
const partDetails = async (req, res) => {
  try {
    const pool = getPool2();
    const { Brandid, Partnumber, excel } = req.body;
    
    if (!Brandid || !excel) {
      return res.status(400).json({ error: 'Brandid and Excel flag are required' });
    }

    let partnumberString = "";

    // Option 1: Read from Partnumber field in body
    if (excel === '0') {
      if (!Partnumber) {
        return res.status(400).json({ message: 'Provide PartNumbers in an array or comma-separated string' });
      }

      let partnumberArray;

      // Handle different Partnumber formats
      if (Array.isArray(Partnumber)) {
        partnumberArray = Partnumber;
      } else if (typeof Partnumber === "string") {
        try {
          // Try parsing as JSON array
          const parsed = JSON.parse(Partnumber);
          partnumberArray = Array.isArray(parsed)
            ? parsed
            : Partnumber.split(",").map(p => p.trim());
        } catch {
          // Fallback: comma-separated string
          partnumberArray = Partnumber.split(",").map(p => p.trim());
        }
      } else {
        return res.status(400).json({ message: 'PartNumbers must be an array or string' });
      }

      // Convert to SQL-safe string
      partnumberString = partnumberArray.map(p => `'${p}'`).join(",");
    }

    // Option 2: Read from uploaded Excel file
    else {
      if (req.file == undefined) {
        return res.status(400).json({ message: 'Must upload an Excel file' });
      }

      const { path } = req.file;
      const Data = await readExcel(path);
      fs.unlinkSync(path); // Clean up file

      if (Data.length === 0) {
        return res.status(400).json({ message: 'No part numbers found in Excel' });
      }

      if (Data.length >= 1000) {
        return res.status(400).json({ message: 'More than 1000 part numbers not allowed' });
      }

      // Check if all parts are mapped to brand
      const unmatchedParts = await partBrandMappingCheck(Brandid, Data.data);
      if (unmatchedParts.length > 0) {
        return res.status(400).json({
          message: 'Some parts are not mapped with the selected brand.',
          unmatchedParts: unmatchedParts.map(item => String(item.PartNumber).trim())
        });
      }

      partnumberString = Data.data.map(item => `'${item.PartNumber}'`).join(",");
    }

    // Build and run SQL query
    const query = `
      USE z_scope;
      SELECT 
        pm.partnumber, pm.partid,
        (CASE 
          WHEN pm.partnumber = sm.partnumber THEN sm.subpartnumber 
          ELSE pm.partnumber 
        END) AS LatestPartno,
        pm.partdesc, pm.moq, pm.category, 
        pm.landedcost, pm.mrp, pm.dateadded, pm.lastupdated 
      FROM z_scope.dbo.part_master pm
      LEFT JOIN z_scope.dbo.substitution_master sm ON pm.brandid = sm.brandid and pm.partnumber = sm.partnumber
      WHERE pm.partnumber IN (${partnumberString}) AND pm.brandid = ${Brandid}
    `;

    const result = await pool.request().query(query);
    res.status(200).json(result.recordset);

  } catch (error) {
    console.log('Error in getting part details:', error);
    res.status(500).json(error);
  }
};

/**
 * Controller: Fetch part ledger by PartIDs
 * Supports reading from body or Excel file
 */
const getLedger = async (req, res) => {
  const pool = await getPool2();
  const { Brandid, Dealerid, Locationid, PartNumber, from, to, excel } = req.body;
  if(!Brandid || !Dealerid || !Locationid == null || !from || !to || !excel){
    return res.status(400).json({message:`All Fields are required`})
  }
  let partnumbers = [];

  try {
    // Option 1: Read from Excel file
    if (excel == 1) {
      if (req.file == undefined) {
        return res.status(400).json({ message: 'Must upload an Excel file' });
      }
      const Data = await readExcel(req.file.path);
      fs.unlinkSync(req.file.path); // Clean up

      const unmatchedParts = await partBrandMappingCheck(Brandid, Data.data);
      if (unmatchedParts.length > 0) {
        return res.status(400).json({
          message: 'Some parts are not mapped with the selected brand.',
          unmatchedParts: unmatchedParts.map(item => String(item.PartNumber).trim())
        });
      }

      partnumbers = Data.data.map(item => item.PartNumber?.toString().trim()).filter(Boolean);
    }

    // Option 2: Read from body
    else {
      if (!PartNumber) return res.status(400).json({ message: 'Partnumber is required' });

      if (Array.isArray(PartNumber)) {
        partnumbers = PartNumber.map(p => p.toString().trim());
      } else if (typeof PartNumber === 'string') {
        const raw = PartNumber.trim();
        if (raw.startsWith('[') && raw.endsWith(']')) {
          try {
            partnumbers = JSON.parse(raw).map(p => p.toString().trim());
          } catch {
            return res.status(400).json({ message: 'Invalid JSON array in PartNumber' });
          }
        } else {
          partnumbers = raw.split(',').map(p => p.trim()).filter(Boolean);
        }
      } else {
        return res.status(400).json({ message: 'PartNumber must be an array or string' });
      }
    }

    if (partnumbers.length === 0) {
      return res.status(400).json({ message: 'No part numbers provided' });
    }

    if (partnumbers.length >= 1000) {
      return res.status(400).json({ message: 'More than 1000 part numbers not allowed' });
    }

    // Fetch mapping of PartNumber to Partid from DB
    const mappingQuery = `SELECT Partid, PartNumber FROM z_scope..Dealer_Sale_Upload_Old_TD001_${Dealerid}`;
    const mappingResult = await pool.request().query(mappingQuery);
    const mappingData = mappingResult.recordset;

    const partNumberToPartidMap = {};
    mappingData.forEach(item => {
      if (item.PartNumber) {
        partNumberToPartidMap[item.PartNumber.trim()] = item.Partid;
      }
    });

    // Map input part numbers to part IDs
    const matchedPartids = partnumbers
      .map(pn => partNumberToPartidMap[pn])
      .filter(pid => pid !== undefined);

    if (matchedPartids.length === 0) {
      return res.status(400).json({ message: 'No matching Partids found for the provided part numbers.' });
    }

    const partidString = matchedPartids.join(',');

    // Call stored procedure with mapped part IDs
    const query = `exec [z_scope].dbo.SP_MonthwisemultiPartLedger ${Dealerid}, ${Locationid}, '${partidString}', ${from}, ${to}`;
    const result = await pool.request().query(query);

    res.status(200).json({ Data: result.recordsets });

  } catch (error) {
    // console.log(error.message);
    
    res.status(500).json({Error: error.message,
      Api : `Error in /ledger`});
  }
};

/**
 * Utility function: Validate if all part numbers in the data are mapped to the brand
 */
const partBrandMappingCheck = async (Brandid, Data) => {
  try {
    // console.log(Data);
    
    const pool = await getPool2();
    const query = `
      USE z_scope;
      SELECT brandid, partnumber FROM z_scope.dbo.Part_Master WHERE brandid = ${Brandid}
    `;
    const result = await pool.request().query(query);

    const mappedPartNumbers = new Set(result.recordset.map(row => row.partnumber?.trim()));

    const unmatchedParts = Data.filter(item => {
      const part = String(item.PartNumber || '').trim();
      return part && !mappedPartNumbers.has(part);
    });

    return unmatchedParts;
  } catch (error) {
    console.error(`Error in partBrandMappingCheck: ${error.message}`);
    throw error;
  }
};

export { partDetails, getLedger };
