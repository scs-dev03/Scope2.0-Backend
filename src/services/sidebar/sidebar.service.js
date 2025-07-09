// const sql=require('mssql2');
// const connection=require('../../connection')
import { getPool1, getPool2 } from "../../db/db.js";
  const  getAllModules=async function(req){

        try{
            const pool=await getPool2();
            const result=await pool.request().query('use z_scope Select * from module_master');
            return result;
        }
        catch(error){
            return error;
        }
    }

   const  getModulesBasedOnRoles=async function(req){

        try{
            const pool=await getPool2();
            let userId=parseInt(req.userId,10);
            let moduleType=req.moduleType;
            let query1=`select roleId ,vcphoto from z_scope..adminmaster_gen where bintId_pk=@userId`;
            const roleIdResult=await pool.request().input('userId',userId).query(query1);

            let roleId=roleIdResult.recordset[0].roleId;
            let vcphoto=roleIdResult.recordset[0].vcphoto
            // roleId=79;
            let query=`use z_scope select mm.module_name,mm.isActive,mm.parentModuleName,mm.module_route,
            rmm.view1,rmm.edit1,rmm.add1,rmm.delete1 from module_master mm join role_module_mapping rmm on  rmm.module_id=mm.id where rmm.role_id=@roleId
            and rmm.view1!=0 and rmm.edit1!=0 and rmm.delete1!=0 and rmm.add1!=0 and mm.isActive=1`;

            const result=await pool.request().input('roleId',roleId).query(query);
            //console.log("------",result.recordset)
            let combinedData=[{modules:result.recordset,profile:vcphoto}]
            //console.log("combinedData ",combinedData)
            return combinedData;
        }
        catch(error){
           // console.log("error in siderbar service ",error)
            return error;
        }
    }

    export {getAllModules,getModulesBasedOnRoles}