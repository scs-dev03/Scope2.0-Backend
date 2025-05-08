import sql from 'mssql'
import { getPool1 } from '../db/db.js'

const getBrands = async(req,res)=>{
    try {
        const pool = getPool1();
        const result = await pool
        .request()
        .query('use z_scope select bigid , vcbrand from [10.10.152.16].z_scope.dbo.Brand_master')
        res.status(200).json(result.recordset)
    } catch (error) {
        res.status(500).json(error)
    }
}
const getDealers =  async(req,res)=>{
    try {
        const pool = getPool1();
        const {brandid} = req.body;
        const result = await pool.request().input('brandid',sql.Int,brandid).query(` use z_scope select distinct(dealerid),dealer from [10.10.152.16].z_scope.dbo.locationinfo where brandid = @brandid`)
        res.status(200).json(result.recordset)
    } catch (error) {
        res.status(500).json(error)
        console.log(error);
    }
}
const getLocation = async(req,res)=>{
    try {
        const pool = getPool1();
        const {dealerid} = req.body;
        const result = await pool.request().input('dealerid',sql.Int,dealerid).query(`use z_scope select locationid,location from [10.10.152.16].z_scope.dbo.locationinfo where dealerid = @dealerid and status = 1 and ogsStatus = 1 order by location`)
        res.status(200).json(result.recordset)
    } catch (error) {
        res.status(500).json(error)
        console.log(error);
    }
}
const getWorkspace = async(req,res)=>{
    try {
        const pool = getPool1();
        // const {dealerid} = req.body;
        const result = await pool.request().query(`select WorkspaceID, Workspace from UAD_BI..SBS_DBS_WorkspaceMaster`)
        res.status(200).json(result.recordset)
    } catch (error) {
        res.status(500).json(error)
        console.log(error);
    }
}
const getDashboard = async(req,res)=>{
    try {
        const pool = getPool1();
        // const {dealerid} = req.body;
        const result = await pool.request().query(`select tcode , Dashboard from [10.10.152.16].z_scope.dbo.DB_DASHboardmaster where status = 1`)
        res.status(200).json(result.recordset)
    } catch (error) {
        res.status(500).json(error)
        console.log(error);
    }
}
const partNature = async(req,res)=>{
    try {
         const pool = await getPool1()
         const query = `select  tCode , Description  from [10.10.152.16].z_scope.dbo.PartNatureMaster`
         const result = await pool.request().query(query)
         res.status(200).json({Data:result.recordset})
    } catch (error) {
        res.status(500).json({Error:error.message})
    }
    }
const seasonal = async(req,res)=>{
    try {
         const pool = await getPool1()
         const query = `use [z_scope] select tCode , Description  from [10.10.152.16].z_scope.dbo.seasonalmaster`
         const result = await pool.request().query(query)
         res.status(200).json({Data:result.recordset})
    } catch (error) {
        res.status(500).json({Error:error.message})
    }
    }
const model = async(req,res)=>{
    try {
         const pool = await getPool1()
         const {brandid} = req.body
         const query = `select ModelID , Model  from [10.10.152.16].z_scope.dbo.ModelMaster where Brandid = ${brandid}`
         const result = await pool.request().query(query)
         res.status(200).json({Data:result.recordset})
    } catch (error) {
        res.status(500).json({Error:error.message})
    }
    }
const partType = async(req,res)=>{
try {
        const pool = await getPool1()
        const query = `select parttypeid , Description from [10.10.152.16].z_scope.dbo.parttypemaster`
        const result = await pool.request().query(query)
        res.status(200).json({Data:result.recordset})
} catch (error) {
    res.status(500).json({Error:error.message})
}
}
// const getMAX = async (req, res) => {
//     try {
//         const pool = await getPool1(); // Ensure the connection is awaited

//         const page = parseInt(req.query.page) || 1;
//         const pageSize = parseInt(req.query.pageSize) || 10;
//         const offset = (page - 1) * pageSize;

//         const totalRecordsQuery = await pool.request().query(`
//             SELECT COUNT(*) AS count FROM (
//                 SELECT DISTINCT 
//                     sn.Brandid, 
//                     sn.Dealerid, 
//                     sn.locationid, 
//                     sn.partnumber, 
//                     pm.partdesc, 
//                     pm.category, 
//                     pm.mrp, 
//                     pm.moq, 
//                     sn.Maxvalue
//                 FROM stockable_nonstockable_td001_20208 sn
//                 JOIN Part_Master pm ON pm.partnumber = sn.partnumber
//                 WHERE stockdate = '2025-02-01 00:00:00'  
//                  -- AND sn.locationid = 40744
//             ) AS SubQuery;
//         `);
//         const totalRecords = totalRecordsQuery.recordset[0].count;
//         const totalPages = Math.ceil(totalRecords / pageSize);

//         // 🟢 Fix pagination query (ORDER BY before OFFSET)
//         const dataQuery = await pool.request().query(`
//             SELECT DISTINCT 
//                 sn.Brandid, 
//                 sn.Dealerid, 
//                 sn.locationid, 
//                 sn.partnumber, 
//                 pm.partdesc, 
//                 pm.category, 
//                 pm.mrp, 
//                 pm.moq, 
//                 sn.Maxvalue
//             FROM stockable_nonstockable_td001_20208 sn
//             JOIN Part_Master pm ON pm.partnumber = sn.partnumber
//             WHERE stockdate = '2025-02-01 00:00:00'  
//               --AND sn.locationid = 40744
//             ORDER BY sn.partnumber -- Ensure ordering before pagination
//             OFFSET ${offset} ROWS
//             FETCH NEXT ${pageSize} ROWS ONLY;
//         `);

//         res.json({
//             currentPage: page,
//             pageSize,
//             totalRecords,
//             totalPages,
//             hasMore: page < totalPages,
//             data: dataQuery.recordset
//         });

//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ error: "Internal Server Error", details: error.message });
//     }
// };

const userInfo = async(req,res)=>{
try {
      const pool = await getPool1()
      const {token , usertype} = req.body

      
      if(!token || !usertype){
        return res.status(400).json({message:`Token and Usertype Both are required`})
      }
      if(usertype === 'a'){
      const query = `select bintid_pk , concat(vcfirstname , ' ', vcLastname)as username , designation from [10.10.152.16].z_scope.dbo.adminmaster_gen where bintId_Pk=z_scope.dbo.f_Decryption('${token}') `
      
      const result = await pool.request().query(query)
      res.status(200).json({Data:result.recordset})
      }
      else{
        const query = `SELECT distinct li.BrandID, dur.dealerid , dur.locationid , concat(amg.vcfirstname , ' ', amg.vcLastname)as username  FROM [10.10.152.16].z_scope.dbo.AdminMaster_GEN amg
    join [10.10.152.16].z_scope.dbo.Dealer_User_Relation dur on amg.bintid_pk = dur.userid
    join [10.10.152.16].z_scope.dbo.locationinfo li on dur.locationid = li.LocationID
    where bintId_Pk=z_scope.dbo.f_Decryption('${token}') `
    const result = await pool.request().query(query)
    res.status(200).json({Data:result.recordset})
      }
} catch (error) {
    res.status(500).json({Error:error.message})
}

}

export {getBrands,getDealers,getLocation,getWorkspace,getDashboard,partNature,model,seasonal,partType,userInfo}
