import sql from 'mssql'
import {getPool1} from '../db/db.js'


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
const getLedgerbyPartid = async(req,res)=>{
    try {
        const pool = getPool1();
        const {Dealerid,Locationid,Partid,from,to}=req.body;
        const query = ` use norms exec SP_MonthwisePartLedger @Dealerid,@Locationid,@Partid,@from,@to`
    
        const result = await pool
        .request()
        .input('Dealerid', sql.Int, Dealerid)
        .input('Locationid', sql.Int, Locationid)
        .input('Partid', sql.Int, Partid)
        .input('from', sql.Date, from)
        .input('to', sql.Date, to)
        .query(query)
        // console.log(result.recordset);
        res.status(200).json(result.recordsets)
    } catch (error) {
        console.log("Error",error);
        
        res.status(500).json(error.message)
    }
    
}

export {partDetails,getLedgerbyPartid}