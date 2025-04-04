import sql from 'mssql'
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




export {partBrandCheck}