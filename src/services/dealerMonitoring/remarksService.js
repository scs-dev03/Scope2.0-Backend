import { getPool1 } from "../../db/db.js";
import sql from 'mssql'

const remarkmasterService = async(type)=>{
try {
        const pool = await getPool1()
        const query = `select Remark from uad_bi_ppni..PPNIRemarkMaster where RemarkFor = @type`
        const result = await pool.request()
                                .input('type',sql.VarChar,type)
                                .query(query)
    
        return result
} catch (error) {
    throw new Error(`remarkmasterService failed : ${error.message}`);
    
}
}

const partremarkInsertion = async(Dealerid,Locationid,bigid,remarkid,remark,advancevalue,url,vehiclenumber , partnumber , userid , transaction)=>{
  try {
        const pool = await getPool1()
        const query = `use [UAD_BI_PPNI] 
                      Insert into PartRemark(Dealerid,Locationid,Approvalid,partnumber,vehicleno,Image,advancevalue,remarkid,details,Createdby)
                      Values(@Dealerid,@Locationid,@bigid,@partnumber,@vehiclenumber,@url,@advancevalue,@remarkid,@remark,@userid) `
  
      const result = await pool.request()
                              .input('Dealerid',sql.Int,Dealerid)
                              .input('Locationid',sql.Int,Locationid)
                              .input('bigid',sql.Int,bigid)
                              .input('remarkid',sql.Int,remarkid)
                              .input('remark',sql.VarChar,remark ?? null)
                              .input('advancevalue',sql.Int,advancevalue ?? null)
                              .input('url',sql.NVarChar, url ?? null)
                              .input('vehiclenumber',sql.VarChar,vehiclenumber)
                              .input('partnumber',sql.VarChar,partnumber)
                              .input('userid',sql.Int,userid)
                              .query(query)
        await transaction.commit()   
  } catch (error) {
    await transaction.rollback()
    throw new Error(`partremarkInsertion falied: ${error.message}`);
    
  }
}

const vehicleremarkInsertion = async(Dealerid,Locationid,remarkid,remark,advancevalue,url,vehiclenumber, userid , transaction)=>{
  try {
        const pool = await getPool1()
        const query = `use [UAD_BI_PPNI] 
                      Insert into VehicleRemark(Dealerid,Locationid,vehicleno,Image,advancevalue,remarkid,details,Createdby)
                      Values(@Dealerid,@Locationid,@vehiclenumber,@url,@advancevalue,@remarkid,@remark,@userid) `
  
      const result = await pool.request()
                              .input('Dealerid',sql.Int,Dealerid)
                              .input('Locationid',sql.Int,Locationid)
                              .input('remarkid',sql.Int,remarkid)
                              .input('remark',sql.VarChar,remark ?? null)
                              .input('advancevalue',sql.Int,advancevalue ?? null)
                              .input('url',sql.NVarChar,url ?? null)
                              .input('vehiclenumber',sql.VarChar,vehiclenumber)
                              .input('userid',sql.Int,userid)
                              .query(query)
        await transaction.commit()   
  } catch (error) {
    await transaction.rollback()
    throw new Error(`vehicleremarkInsertion falied: ${error.message}`);
    
  }
}

const ppnipartremarkInsertion = async(Dealerid,Locationid,bigid,remarkid,remark,advancevalue,url,vehiclenumber , partnumber , userid , transaction)=>{
  try {
        const pool = await getPool1()
        const query = `use [UAD_BI_PPNI] 
                      Insert into PPNIPartRemark(Dealerid,Locationid,Approvalid,partnumber,vehicleno,Image,advancevalue,remarkid,details,Createdby)
                      Values(@Dealerid,@Locationid,@bigid,@partnumber,@vehiclenumber,@url,@advancevalue,@remarkid,@remark,@userid) `
  
      const result = await pool.request()
                              .input('Dealerid',sql.Int,Dealerid)
                              .input('Locationid',sql.Int,Locationid)
                              .input('bigid',sql.Int,bigid)
                              .input('remarkid',sql.Int,remarkid)
                              .input('remark',sql.VarChar,remark ?? null)
                              .input('advancevalue',sql.Int,advancevalue ?? null)
                              .input('url',sql.NVarChar, url ?? null)
                              .input('vehiclenumber',sql.VarChar,vehiclenumber)
                              .input('partnumber',sql.VarChar,partnumber)
                              .input('userid',sql.Int,userid)
                              .query(query)
        await transaction.commit()   
  } catch (error) {
    await transaction.rollback()
    throw new Error(`ppnipartremarkInsertion falied: ${error.message}`);
    
  }
}

const ppnivehicleremarkInsertion = async(Dealerid,Locationid,remarkid,remark,advancevalue,url,vehiclenumber, userid , transaction)=>{
  try {
        const pool = await getPool1()
        const query = `use [UAD_BI_PPNI] 
                      Insert into PPNIVehicleRemark(Dealerid,Locationid,vehicleno,Image,advancevalue,remarkid,details,Createdby)
                      Values(@Dealerid,@Locationid,@vehiclenumber,@url,@advancevalue,@remarkid,@remark,@userid) `
  
      const result = await pool.request()
                              .input('Dealerid',sql.Int,Dealerid)
                              .input('Locationid',sql.Int,Locationid)
                              .input('remarkid',sql.Int,remarkid)
                              .input('remark',sql.VarChar,remark ?? null)
                              .input('advancevalue',sql.Int,advancevalue ?? null)
                              .input('url',sql.NVarChar,url ?? null)
                              .input('vehiclenumber',sql.VarChar,vehiclenumber)
                              .input('userid',sql.Int,userid)
                              .query(query)
        await transaction.commit()   
  } catch (error) {
    await transaction.rollback()
    throw new Error(`ppnivehicleremarkInsertion falied: ${error.message}`);
    
  }
}
export {remarkmasterService,partremarkInsertion ,vehicleremarkInsertion , ppnipartremarkInsertion, ppnivehicleremarkInsertion}