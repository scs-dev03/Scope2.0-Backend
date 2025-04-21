import sql from 'mssql'
import {getPool1} from '../db/db.js'
import { readExcel } from '../utils/vonHelper.js'
import fs from 'fs'



const partDetails = async(req,res)=>{

    try {
        const pool =  getPool1()
        const {Brandid,Partnumber,excel}=req.body
        if (!Brandid) {
            return res.status(400).json({ error: 'Brandid required' });
        }
        let partnumberString = "";
        if(excel == 0){
          if (!Partnumber) {
            return res.status(400).json({ message: `Enter PartNumbers in an array or comma-separated string` });
          }
        
          let partnumberArray;

        if (Array.isArray(Partnumber)) {
          partnumberArray = Partnumber;
        } else if (typeof Partnumber === "string") {
          try {
            // Try parsing it if it's a stringified JSON array
            const parsed = JSON.parse(Partnumber);
            if (Array.isArray(parsed)) {
              partnumberArray = parsed;
            } else {
              // Fallback: split by comma if it’s a plain comma-separated string
      partnumberArray = Partnumber.split(",").map(p => p.trim());
       }
          } catch {
            // If JSON.parse fails, assume comma-separated string
            partnumberArray = Partnumber.split(",").map(p => p.trim());
          }
        } else {
          return res.status(400).json({ message: `PartNumbers must be an array or comma-separated string` });
        }

        // Wrap in single quotes for SQL
        partnumberString = partnumberArray.map(p => `'${p}'`).join(",");
        }
        
        else{
          if(req.file == undefined){
            return res.status(400).json({message:`Must upload a excel file`})
          }
          const {path} = req.file
        
          const Data = await readExcel(path);
          // console.log(Data);
          
          fs.unlinkSync(path);
          partnumberString = Data.map(item => `'${item.PartNumber}'`).join(",");
          console.log(partnumberString);

        }
          const query = `use z_scope select pm.partnumber , pm.partid,
                        (case when pm.partnumber = sm.partnumber then sm.subpartnumber else pm.partnumber end)as LatestPartno, 
                        pm.partdesc, pm.moq, pm.category, pm.landedcost,pm.mrp,pm.dateadded,pm.lastupdated from part_master pm
                        left join substitution_master sm 
                        ON pm.partnumber = sm.partnumber
                        where pm.partnumber in (${partnumberString}) and pm.brandid = ${Brandid}`
        // console.log(query);
        
        const result = await pool.request().query(query)
        // console.log(result.recordset);
        res.status(200).json(result.recordset) 

    } catch (error) {
        console.log(`error in getting part details`,error);
        
        res.status(500).json(error)
    }
}
const getLedgerbyPartid = async (req, res) => {
    try {
        const pool = getPool1();
        const { Dealerid, Locationid, Partid, from, to , excel} = req.body;
        // console.log(Partid);
        
        let query = "";

        if (!Partid || Partid === 'undefined' || Partid === null) {
            const { path } = req.file;

            // Step 1: Read Excel and extract part numbers
            const excelData = await readExcel(path);
            fs.unlinkSync(path); // delete uploaded file

            const partNumbersFromExcel = excelData.map(item => item.PartNumber?.toString().trim()).filter(Boolean);

            // Step 2: Fetch PartNumber-Partid mapping from DB
            const mappingQuery = `SELECT Partid, PartNumber FROM z_scope..Dealer_Sale_Upload_Old_TD001_${Dealerid}`;
            const mappingResult = await pool.request().query(mappingQuery);
            const mappingData = mappingResult.recordset;
            // console.log(mappingData);
            
            // Step 3: Create a dictionary for quick lookup
            const partNumberToPartidMap = {};
            mappingData.forEach(item => {
                if (item.PartNumber) {
                    partNumberToPartidMap[item.PartNumber.trim()] = item.Partid;
                }
            });

            // Step 4: Map Excel part numbers to partid
            const matchedPartids = partNumbersFromExcel
                .map(pn => partNumberToPartidMap[pn])
                .filter(pid => pid !== undefined);

            if (matchedPartids.length === 0) {
                return res.status(400).json({ message: "No matching Partids found for the provided part numbers." });
            }

            const partidString = matchedPartids.join(',');
            
            // Step 5: Build query
            query = `USE z_scope EXEC SP_MonthwisemultiPartLedger ${Dealerid}, ${Locationid}, '${partidString}', ${from}, ${to}`;
        } else {
            // When Partid is provided directly
            query = `USE z_scope EXEC SP_MonthwisemultiPartLedger ${Dealerid}, ${Locationid}, ${Partid}, ${from}, ${to}`;
        }


        // Execute the query
        const result = await pool.request().query(query);

        res.status(200).json(result.recordsets);

    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: error.message });
    }
};

const getLedger = async (req, res) => {
    const pool = await getPool1();
    const { Dealerid, Locationid, PartNumber, from, to, excel } = req.body;
    console.log(Dealerid, Locationid, PartNumber, from, to, excel);
    
    let partnumbers = [];
    if(PartNumber.length >= 100){
        return res.status(400).json({message:`More than 100 parts Send in excel`})
    }
    try {
      // Step 1: Get part numbers based on `excel` flag
      if (excel == 1) {
        const Data = await readExcel(req.file.path);
        fs.unlinkSync(req.file.path); // delete uploaded file
        partnumbers = Data.map(item => item.PartNumber?.toString().trim()).filter(Boolean);
        
    } else {
        if (Array.isArray(PartNumber)) {
            // already an array, use it directly
            partnumbers = PartNumber.map(p => p.toString().trim());
          }
          else if (typeof PartNumber === 'string') {
            const raw = PartNumber.trim();
            if (raw.startsWith('[') && raw.endsWith(']')) {
              // try to parse JSON
              try {
                partnumbers = JSON.parse(raw).map(p => p.toString().trim());
              } catch {
                return res.status(400).json({
                  message: 'Invalid JSON array in PartNumber.'
                });
              }
            } else {
              // fallback: comma‑separated string
              partnumbers = raw
                .split(',')
                .map(p => p.trim())
                .filter(Boolean);
            }
          }
          else {
            return res.status(400).json({
              message: 'PartNumber must be an array or a string.'
            });
          }
    }
  
      if (partnumbers.length === 0) {
        return res.status(400).json({ message: "No part numbers provided." });
      }
      if(partnumbers.length >=1000){
        return res.status(400).json({message:`More Than 1000 Partnumbers not allowed`})
      }
  
      // Step 2: Fetch PartNumber-Partid mapping from DB
      const mappingQuery = `SELECT Partid, PartNumber FROM z_scope..Dealer_Sale_Upload_Old_TD001_${Dealerid}`;
      const mappingResult = await pool.request().query(mappingQuery);
      const mappingData = mappingResult.recordset;
  
      // Step 3: Create a dictionary for quick lookup
      const partNumberToPartidMap = {};
      mappingData.forEach(item => {
        if (item.PartNumber) {
          partNumberToPartidMap[item.PartNumber.trim()] = item.Partid;
        }
      });
  
      // Step 4: Map part numbers to part IDs
      const matchedPartids = partnumbers
        .map(pn => partNumberToPartidMap[pn])
        .filter(pid => pid !== undefined);
  
      if (matchedPartids.length === 0) {
        return res.status(400).json({ message: "No matching Partids found for the provided part numbers." });
      }
  
      const partidString = matchedPartids.join(',');
    //   console.log('Matched PartIDs:', partidString);
  
      // TODO: Proceed with partidString in your SQL query or further logic
    const  query = `USE z_scope EXEC SP_MonthwisemultiPartLedger ${Dealerid}, ${Locationid}, '${partidString}', ${from}, ${to}`;
    const result = await pool.request().query(query)
      res.status(200).json({Data:result.recordsets});
    } catch (error) {
    //   console.error('getLedger error:', error.message);
      res.status(500).json({ error: error.message });
    }
  };
  
export {partDetails,getLedgerbyPartid,getLedger}