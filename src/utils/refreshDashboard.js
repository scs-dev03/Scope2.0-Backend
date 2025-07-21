import { getPool1 , DSpool } from "../db/db.js";
import sql from 'mssql'
import { checkGroupSetting } from "./dashboardscheduleHelper.js";


// const refreshSI = async(dealerid,reqid)=>{
//    // console.log(dealerid , reqid);
   
//    try {
//       const pool = await DSpool()
//             const today = new Date();
//             const year = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();
//             const month = today.getMonth() === 0 ? 11 : today.getMonth() - 1;
//             const firstDayLastMonth = new Date(year, month, 1);
//             // 
//             // Format date properly in YYYY-MM-DD format
//             const date = firstDayLastMonth.toLocaleDateString('en-CA'); // en-CA gives YYYY-MM-DD format
//             // console.log(typeof(date),date)

//             // console.log(date); //  outputs like "2025-01-01"
//             let query = ` exec [UAD_BI_SI].[dbo].uad_si_report_3 '${dealerid}','${date}'`
      
//           const result =  await pool.request().query(query)
//           console.log(`Data Refreshing SI for reqid: ${reqid} at ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`);

//       let Check =  isDataRefreshed(result.recordset[0])

//       //Data Refresh Done Successfully
//       if(Check){
//          query = `use [UAD_BI] Update SBS_DBS_ScheduledDashboard set status = 3 where reqid = @reqid`
//          await pool.request().input('reqid',sql.Int,reqid).query(query)
//       }
//    } 
//    // if SP fails then error is catched in catch block and then status = 2 (Data Refresh Failed) is updated here 
//    catch (error) {
//       console.error("Error refreshing SI:", error.message);
//       // Handle the failure scenario: update status to 2
//       try {
//         const pool = await DSpool();
//         let query = `use [UAD_BI] Update SBS_DBS_ScheduledDashboard set status = 2 where reqid = @reqid`;
//         await pool.request().input('reqid', sql.Int, reqid).query(query);

//         query = `use [UAD_BI] Insert into SBS_DBS_ErrorLog (reqid,Reason,addedon) values(@reqid,@error,GETDATE())`
//       await pool.request().input('reqid', sql.Int, reqid).input('error', sql.VarChar, error.message).query(query);
//       } catch (updateError) {
//         console.error("Error updating SBS_DBS_ScheduledDashboard:", updateError.message);
//       }
//     }
// }

const refreshSI = async (dealerid, reqid) => {
  try {
    const pool = await DSpool();
    const today = new Date();
    const year = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();
    const month = today.getMonth() === 0 ? 11 : today.getMonth() - 1;
    const date = new Date(year, month, 1).toLocaleDateString('en-CA');

    let query = `exec [UAD_BI_SI].[dbo].uad_si_report_3 '${dealerid}','${date}'`;
    const result = await pool.request().query(query);

    console.log(`Data Refreshing SI for reqid: ${reqid} at ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`);

    const record = result.recordset[0];
    const Check = isSIDataRefreshed(record);
    console.log("SP Output:", record, "| isDataRefreshed:", Check);

    query = `use [UAD_BI] Update SBS_DBS_ScheduledDashboard set status = @status where reqid = @reqid`;
    const status = Check ? 3 : 2;

    await pool.request()
      .input('status', sql.Int, status)
      .input('reqid', sql.Int, reqid)
      .query(query);

    if (!Check) {
      const errQuery = `use [UAD_BI] Insert into SBS_DBS_ErrorLog (reqid, Reason, addedon) values (@reqid, @error, GETDATE())`;
      await pool.request()
        .input('reqid', sql.Int, reqid)
        .input('error', sql.VarChar, 'SP did not return expected success output')
        .query(errQuery);
    }

  } catch (error) {
    console.error("Error refreshing SI:", error.message);
    try {
      const pool = await DSpool();
      const query = `use [UAD_BI] Update SBS_DBS_ScheduledDashboard set status = 2 where reqid = @reqid`;
      await pool.request().input('reqid', sql.Int, reqid).query(query);

      const errLog = `use [UAD_BI] Insert into SBS_DBS_ErrorLog (reqid, Reason, addedon) values (@reqid, @error, GETDATE())`;
      await pool.request().input('reqid', sql.Int, reqid).input('error', sql.VarChar, error.message).query(errLog);
    } catch (updateError) {
      console.error("Error updating SBS_DBS_ScheduledDashboard:", updateError.message);
    }
  }
}

const refreshBenchmarking = async(dealerid,reqid)=>{
   try {
     const pool = await DSpool()
     let query = `exec [UAD_BI].[dbo].DRD_Adjustment_Dealer @dealerid`
     let result =  await pool.request().input('dealerid',sql.Int,dealerid).query(query)
      console.log(`Data Refreshing Benchmarking for reqid: ${reqid} at ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`);

      let Check =  isDataRefreshed(result.recordset[0])
      //Data Refresh Done Successfully
      if(Check){
         query = `use [UAD_BI] Update SBS_DBS_ScheduledDashboard set status = 3 where reqid = @reqid`
         await pool.request().input('reqid',sql.Int,reqid).query(query)
      }
   } 
   // if SP fails then error is catched in catch block and then status = 2 (Data Refresh Failed) is updated here 
   catch (error) {
      console.error("Error refreshing Benchmarking:", error.message);
      // Handle the failure scenario: update status to 2
      try {
        const pool = await getPool1();
        let query = `use [UAD_BI] Update SBS_DBS_ScheduledDashboard set status = 2 where reqid = @reqid`;
        await pool.request().input('reqid', sql.Int, reqid).query(query);

        query = `use [UAD_BI] Insert into SBS_DBS_ErrorLog (reqid,Reason,addedon) values(@reqid,@error,GETDATE())`
      await pool.request().input('reqid', sql.Int, reqid).input('error', sql.VarChar, error.message).query(query);
      } catch (updateError) {
        console.error("Error updating SBS_DBS_ScheduledDashboard:", updateError.message);
      }
    }
}
const refreshCID = async(dealerid,reqid)=>{
   try {
      const pool = await DSpool()
    const isGroupSettingDone = checkGroupSetting(dealerid) 
   //  console.log(isGroupSettingDone);
    
    if(!isGroupSettingDone){
      return res.status(400).json({message:`Group Setting Not done`})
    }
     let query = `exec [UAD_BI_CID].[dbo].UAD_Cinv_Compile @dealerid`
   //   const test = `use uad_bi select * from BackupTbl`
     const result =  await pool.request().input('dealerid',sql.Int,dealerid).query(query)
      console.log(`Data Refreshing CID for reqid: ${reqid} at ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`);
      let Check =  isDataRefreshed(result.recordset[0])
      //Data Refresh Done Successfully
      if(Check){
         query = `use [UAD_BI] Update SBS_DBS_ScheduledDashboard set status = 3 where reqid = @reqid`
         await pool.request().input('reqid',sql.Int,reqid).query(query)
      }

      // if SP fails then error is catched in catch block and then status = 2 (Data Refresh Failed) is updated here 
   } catch (error) {
   //  res.status(500).send(error.message)
   console.error("Error refreshing CID:", error.message);
   try {
      const pool = await DSpool();
      const query = `use [UAD_BI] Update SBS_DBS_ScheduledDashboard set status = 2 where reqid = @reqid`;
      await pool.request().input('reqid', sql.Int, reqid).query(query);

      query = `use [UAD_BI] Insert into SBS_DBS_ErrorLog (reqid,Reason,addedon) values(@reqid,@error,GETDATE())`
      await pool.request().input('reqid', sql.Int, reqid).input('error', sql.VarChar, error.message).query(query);
    } catch (updateError) {

      console.error("Error updating SBS_DBS_ScheduledDashboard:", updateError.message);
    }
   }
}
const refreshPPNI = async(brandid,dealerid,reqid)=>{
   try {
      const pool = await DSpool()
      // let query = `use UAD_BI_PPNI exec UAD_PPNI_Report_LS @brandid,@dealerid`
      // const result =  await pool.request().input('brandid',sql.TinyInt,brandid).input('dealerid',sql.Int,dealerid).query(query)
      console.log(`Data Refreshing PPNI for reqid: ${reqid} at ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`);
      // let Check =  isDataRefreshed(result.recordset[0])
      //Data Refresh Done Successfully
      // if(Check){
        const  query = `use [UAD_BI] Update SBS_DBS_ScheduledDashboard set status = 3 where reqid = @reqid`
         await pool.request().input('reqid',sql.Int,reqid).query(query)
      // }
   } catch (error) {
   console.error("Error refreshing PPNI:", error.message);
   try {
      const pool = await DSpool();
      let query = `use [UAD_BI] Update SBS_DBS_ScheduledDashboard set status = 2 where reqid = @reqid`;
      await pool.request().input('reqid', sql.Int, reqid).query(query);

      query = `use [UAD_BI] Insert into SBS_DBS_ErrorLog (reqid,Reason,addedon) values(@reqid,@error,GETDATE())`
      await pool.request().input('reqid', sql.Int, reqid).input('error', sql.VarChar, error.message).query(query);

    } catch (updateError) {
      console.error("Error updating SBS_DBS_ScheduledDashboard:", updateError.message);
    }
   }
}
const refreshSpecialList = async(reqid)=>{
   try {
      const pool = await DSpool()
      console.log(`Data Refreshing Special List for reqid: ${reqid} at ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`);
      //Data is Always Refreshed in Special List 
      let query = `use [UAD_BI] Update SBS_DBS_ScheduledDashboard set status = 3 where reqid = @reqid`
       await pool.request().input('reqid',sql.Int,reqid).query(query)
   } catch (error) {
   //  res.status(500).send(error.message)
   console.error("Error refreshing spl:", error.message);
   }
}
const refreshGainerMini = async(reqid)=>{
   try {
      const pool = await DSpool()
      console.log(`Data Refreshing Gainer Mini for reqid: ${reqid} at ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`);
      //Data is Always Refreshed in Special List 
      let query = `use [UAD_BI] Update SBS_DBS_ScheduledDashboard set status = 3 where reqid = @reqid`
       await pool.request().input('reqid',sql.Int,reqid).query(query)
   } catch (error) {
   //  res.status(500).send(error.message)
   console.error("Error refreshing GainerMini:", error.message);
   }
}
const refreshTOPS = async(dealerid,reqid)=>{
   try {
     const pool = await DSpool()
     let query = `EXEC [10.10.152.17].[z_scope].[dbo].Tops_vs_scs_norms_dealerwise_test1 @dealerid`
   //   const test = `use uad_bi select * from BackupTbl`
     const result =  await pool.request().input('dealerid',sql.Int,dealerid).query(query)
      console.log(`Data Refreshing TOPS for reqid: ${reqid} at ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`)
      let Check =  isDataRefreshed(result.recordset[0])
      //Data Refresh Done Successfully
      if(Check){
         query = `use [UAD_BI] Update SBS_DBS_ScheduledDashboard set status = 3 where reqid = @reqid`
         await pool.request().input('reqid',sql.Int,reqid).query(query)
      }
   } catch (error) {
      console.error("Error refreshing Benchmarking:", error.message);
      // Handle the failure scenario: update status to 2
      try {
        const pool = await DSpool();
        const query = `use [UAD_BI] Update SBS_DBS_ScheduledDashboard set status = 2 where reqid = @reqid`;
        await pool.request().input('reqid', sql.Int, reqid).query(query);

        query = `use [UAD_BI] Insert into SBS_DBS_ErrorLog (reqid,Reason,addedon) values(@reqid,@error,GETDATE())`
      await pool.request().input('reqid', sql.Int, reqid).input('error', sql.VarChar, error.message).query(query);
      } catch (updateError) {
        console.error("Error updating SBS_DBS_ScheduledDashboard:", updateError.message);
      }
    }
}

function isDataRefreshed(result) {
   if(result || result.recordset === 'Success'){
      return  true;
   }
   else{
      return false;
   }
} 
function isSIDataRefreshed(result) {
   if(result === `{ '': 'Success' }`){
      return  true;
   }
   else{
      return false;
   }
} 
// function isDataRefreshed(result) {
//   return result && result.Success === 1;
// }
// function isDataRefreshed(result) {
//   if (!result) return false;

//   if (result.status === 'Success' || result.Success === 1) {
//     return true;
//   }

//   console.warn("Unexpected result from SP:", result);
//   return false;
// }


export  {refreshSI,refreshBenchmarking,refreshCID,refreshPPNI,refreshTOPS,refreshSpecialList,refreshGainerMini}