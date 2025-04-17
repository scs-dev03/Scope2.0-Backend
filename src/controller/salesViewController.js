import sql from 'mssql'
import {getPool1} from '../db/db.js'
import { readExcel } from '../utils/vonHelper.js'
import fs from 'fs'

// const getBrands = async(req,res)=>{
//     try {
//         const pool = getPool1();
//         const result = await pool
//         .request()
//         .query('use z_scope select bigid , vcbrand from Brand_master')
//         res.status(200).json(result.recordset)
//     } catch (error) {
//         res.status(500).json(error)
//     }
// }
// const getDealers =  async(req,res)=>{
//     try {
//         const pool = getPool1();
//         const {brandid} = req.body;
//         const result = await pool.request().input('brandid',sql.Int,brandid).query(` use z_scope select distinct(dealerid),dealer from locationinfo where brandid = @brandid`)
//         res.status(200).json(result.recordset)
//     } catch (error) {
//         res.status(500).json(error)
//         console.log(error);
//     }
// }
// const getLocation = async(req,res)=>{
//     try {
//         const pool = getPool1();
//         const {dealerid} = req.body;
//         const result = await pool.request().input('dealerid',sql.Int,dealerid).query(`use z_scope select locationid,location from locationinfo where dealerid = @dealerid`)
//         res.status(200).json(result.recordset)
//     } catch (error) {
//         res.status(500).json(error)
//         console.log(error);
//     }
// }
const partDetails = async(req,res)=>{

    try {
        const pool =  getPool1()
        const {Brandid,Partnumber}=req.body
        if (!Brandid || !Partnumber) {
            return res.status(400).json({ error: 'Brandid and Partnumber are required' });
        }
        const query = `use z_scope select pm.partnumber , pm.partid,
                        (case when pm.partnumber = sm.partnumber then sm.subpartnumber else pm.partnumber end)as LatestPartno, 
                        pm.partdesc, pm.moq, pm.category, pm.landedcost,pm.mrp,pm.dateadded,pm.lastupdated from part_master pm
                        left join substitution_master sm 
                        ON pm.partnumber = sm.partnumber
                        where pm.partnumber = @Partnumber and pm.brandid = @Brandid`
        const result = await pool
        .request()
        .input('Partnumber', sql.NVarChar, Partnumber) // Assuming Partnumber is a string
         .input('Brandid', sql.Int, Brandid) // Assuming Brandid is an integer
        .query(query)
        // console.log(result.recordset);

        res.status(200).json(result.recordset) 
    } catch (error) {
        console.log(`error in getting part details`,error);
        
        res.status(500).json(error)
    }
}
// const getLedgerbyPartid = async(req,res)=>{
//     try {
//         const pool = getPool1();
//         const {Dealerid,Locationid,Partid,from,to}=req.body;
//         console.log(Partid);
        

//         let query = ""
//         if(Partid === undefined){
//             const {file} = req.file
//             let data = await readExcel(req.file.path);
//             console.log(data);
            
//             fs.unlinkSync(req.file.path); // Delete uploaded file after processing
//             const partidpartnumbermapping = [];
//             const partidnumberQuery = `select partid , partnumber   from z_scope..Dealer_Sale_Upload_Old_TD001_${Dealerid}`


//                 const partidpartnumberresult = await pool.request().query(partidnumberQuery);
//                 console.log(partidpartnumberresult.recordset);


//                 if (partidpartnumberresult.recordset.length > 0) {
//                   partidpartnumbermapping.push(...partidpartnumberresult.recordset);
//                 }
//                 console.log(partidpartnumbermapping);

//             let partidString = data.map(item => item.Partids).join(',');
//              query = ` use z_scope exec SP_MonthwisemultiPartLedger ${Dealerid},${Locationid},'${partidString}',${from},${to}`
//         }
//         else{
//             query = ` use z_scope exec SP_MonthwisemultiPartLedger ${Dealerid},${Locationid},${Partid},${from},${to}`
//         }
//         console.log(query);
        
//         // const query = ` use z_scope exec SP_MonthwisemultiPartLedger @Dealerid,@Locationid,'@Partid',@from,@to`
        
//         const result = await pool.request() .query(query)
//         // .input('Dealerid', sql.Int, Dealerid)
//         // .input('Locationid', sql.Int, Locationid)
//         // .input('Partid', sql.VarChar, partidString)
//         // .input('from', sql.Date, from)
//         // .input('to', sql.Date, to)
       
//         // console.log(result.recordset);
//         res.status(200).json(result.recordsets)
//     } catch (error) {
//         console.log("Error",error);
        
//         res.status(500).json(error.message)
//     }
    
// }


const getLedgerbyPartid = async (req, res) => {
    try {
        const pool = getPool1();
        const { Dealerid, Locationid, Partid, from, to } = req.body;
        
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

export {partDetails,getLedgerbyPartid}