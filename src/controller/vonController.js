import {getPool1} from '../db/db.js'
import sql from 'mssql'
import xlsx from 'xlsx'
import fs from 'fs'
import { partBrandCheck } from '../utils/vonHelper.js'
import { model } from './MasterApiController.js'


const remarkMaster = async (req,res)=>{
try {
    
        const pool = await getPool1()
        const {brandid,usertype} = req.body
        if(!brandid || !usertype){
            return res.status(500).json({Error:`Brandid and usertype are required`})
        }
        const query = `use [UAD_VON] select Remarkid , remark from UAD_VON_RemarksMaster where brandid = ${brandid} and status =1 and usertype = '${usertype}'`
        const result = await pool.request().query(query)
        res.status(200).json({Data:result.recordset})
} catch (error) {
    res.status(500).json({Error:error.message})
}
}
const newRemark = async(req,res)=>{
try {
        const pool = await getPool1()
        const {remark,  brandid , addedby , usertype} = req.body
        if(!remark ||  !addedby || !usertype) {
            return res.status(400).json({message:`All fields are required`})
        }
        const query = ` use [UAD_VON]
        INSERT INTO UAD_VON_RemarksMaster (remark, brandid, addedby, usertype)
        SELECT 
        '${remark}', 
            COALESCE(${brandid}, bigid), 
            ${addedby},
            '${usertype}' 
            FROM 
                (SELECT DISTINCT bigid FROM z_scope..Brand_Master) AS brands
            WHERE 
                ${brandid} IS NULL OR bigid = ${brandid};`
          
          await pool.request().query(query)
          res.status(201).json({message:`Remark successfully Created`})
    } catch (error) {
            res.status(500).json({Error:error.message})
        }
}
const viewRemark = async(req,res)=>{
try {
        const pool = await getPool1()
        const {brandid , usertype} = req.body

        if(!usertype ==='A' || !usertype === 'U'){
                return res.status(400).json({message:`usertype should be 'A' or 'U'`})
        }
        const query = ` use [UAD_VON]
           DECLARE @Brandid INT = ${brandid},
            @Usertype VARCHAR(1) = '${usertype}';  -- Change to NULL to get all user types
            SELECT 
                rm.remarkid, 
                rm.remark, 
                bm.vcbrand, 
                CONCAT(amg.vcFirstName, ' ', amg.vcLastName) AS AddedBy, 
                rm.addedon, 
                rm.status 
            FROM UAD_VON_RemarksMaster rm
            JOIN z_scope..Brand_Master bm   
                ON bm.bigid = rm.brandid
            JOIN z_scope..AdminMaster_GEN amg 
                ON amg.bintId_Pk = rm.addedby
            WHERE 
                (@Brandid IS NULL OR rm.brandid = @Brandid)  -- If NULL, fetch all brands; otherwise, filter
                AND (@Usertype IS NULL OR rm.usertype = @Usertype);  -- If NULL, fetch all user types; otherwise, filter
                `
               const result = await  pool.request().query(query)
               res.status(200).json({Data:result.recordset})
} catch (error) {
    res.status(500).json({Error:error.message})
}
}
const userView = async(req,res)=>{
try {
        const pool = await  getPool1()
        const {brandid,dealerid,r1, r2 ,l1,l2, partnumber , locationid , flag, seasonalid, modelid, natureid,parttype} = req.body
        if(!dealerid && !brandid){
            return res.status(400).json({Error:`Dealerid and Brandid is a required Parameter`})
        }
        const query = `use z_scope EXEC GetMAXData @brandid, @dealerid , @r1, @r2, @l1, @l2, @partnumber, @locationid, @maxvalueflag ,@seasonalid,@natureid,@modelid,@parttype;`
        
        if(!partnumber && !locationid){
            return res.status(400).json({Error:`partnumber or locationid is required`})
        }
         const request = pool.request();
        
        // Handle potential NULL values correctly
        request.input('brandid',sql.Int,brandid)
        request.input('dealerid',sql.Int,dealerid)
        request.input('r1', sql.Int, r1 ?? null);
        request.input('r2', sql.Int, r2 ?? null);
        request.input('l1', sql.Int, l1 ?? null);
        request.input('l2', sql.Int, l2 ?? null);
        request.input('seasonalid', sql.Int, seasonalid ?? null);
        request.input('natureid', sql.Int, natureid ?? null);
        request.input('modelid', sql.Int, modelid ?? null);
        request.input('partnumber', sql.VarChar, partnumber ?? null);
        request.input('locationid', sql.Int, locationid ?? null);
        request.input('maxvalueflag', sql.Int, flag ?? null);
        request.input('parttype', sql.Int, parttype ?? null);

        const result = await request.query(query);
        // console.log(result.recordset[0]);
        
        res.status(200).json({Data:result.recordset})
} catch (error) {
    res.status(500).json({Error:error.message})
}
}
const userFeedbacklog = async (req,res)=>{
 try {
    const pool = await getPool1()
    const {brandid , dealerid , locationid,partid , max , remarkid, customrem , proposedqty } = req.body
    if(!brandid || !dealerid || !locationid || !partid || max == null || proposedqty == null  || !remarkid){
        return res.status(400).json({Error:`All Fields are required`})
    }
   const partCheck = await partBrandCheck(dealerid,locationid,partid)
   if(!partCheck){
        return res.status(400).json({Error:`PartID is Invalid`})
   }

    const dynamicTable = `[UAD_VON]..UAD_VON_SPMFeedback_${brandid}`
    // console.log(dynamicTable);
    
    let LatestPartID =null;
    try{
        const LatestPartQuery = `select (CASE WHEN pm.BrandID = sm.BrandID AND pm.PartNumber = sm.PartNumber THEN sm.SubPartNumber ELSE pm.PartNumber END) AS LatestPartNumber 
                                from z_scope..substitution_master sm
                                 join part_master pm on pm.brandid = sm.brandid and pm.partnumber = sm.partnumber 
                                where pm.partid = ${partid}`
            const result = await pool.request().query(LatestPartQuery)
            LatestPartID = result.recordset.length > 0 ? result.recordset[0].LatestPartNumber : null;
            // console.log(LatestPartID);  
            
    }catch(error){
        return res.status(500).json({Error:error.message,Error:`Error in Finding LatestPartID`})
    }
    let previousFBID = null;
    try {
        const previousFBQuery = `
        SELECT TOP 1 FeedbackID 
        FROM ${dynamicTable}
        WHERE PartID = @partid 
        ORDER BY FeedbackDate DESC
       `;
       
       const previousFBResult = await pool.request()
        .input('partid', sql.Int, partid)
        .query(previousFBQuery);
       
        previousFBID =  previousFBResult.recordset.length > 0 ? previousFBResult.recordset[0].FeedbackID : null;
        // console.log(previousFBID);
        
    } catch (error) {
        return res.status(500).json({Error:error.message,Error:`Error in Finding Previous Feedback`})
    }
   
    const query = `
                   Insert into  ${dynamicTable} (brandid , dealerid , locationid , PartID , LatestPartID , MaxValue , UserID , UserFBRemarkID ,Customrem, ProposedQty , FeedbackDate , PreviousFBID)
                   Values (@brandid,@dealerid , @locationid , @partid,@latestid,@max,1,@userfbid,@customrem,@proposedqty,GETDATE(),@previousfbid)`
     const request = await pool.request()
     request.input('brandid',sql.TinyInt,brandid)            
     request.input('dealerid',sql.Int,dealerid)            
     request.input('locationid',sql.Int,locationid)            
     request.input('partid',sql.Int,partid)            
     request.input('latestid',sql.VarChar,LatestPartID)            
     request.input('max',sql.Int,max)            
     request.input('userfbid',sql.Int,remarkid)                      
     request.input('customrem',sql.VarChar,customrem)                      
     request.input('proposedqty',sql.Int,proposedqty)            
     request.input('previousfbid',sql.Int,previousFBID)     
     
     await request.query(query)
     res.status(200).json({message:`Success`})
 } catch (error) {
    res.status(500).json({Error:error.message})
 }
}
const viewLog = async(req,res)=>{
try {
        const pool = await getPool1()
        const {brandid, dealerid , locationid , partid} = req.body
        if(!brandid || !dealerid){
            return res.status(400).json({message:`Brandid and Dealerid are required Parameter`})
        }
        if(!locationid && !partid){
            return res.status(400).json({message:`Locationid or Partid anyone is required`})
        }
        const spmdynamicTable = `UAD_VON..UAD_VON_SPMFeedback_${brandid}`
        const admindynamicTable = `UAD_VON..UAD_VON_AdminFeedback_${brandid}`
    
        // const query = ` use [UAD_VON]
        // DECLARE @LocationID INT = ${locationid}  -- Set a value if filtering by location
        // DECLARE @PartID INT = ${partid}      -- Set a value if filtering by part
        // SELECT li.brand,li.Dealer,li.Location, pm.PartNumber, pm.PartDesc, pm.Category, pm.MRP, sf.MaxValue, CASE 
        // WHEN rm.Remark = 'Custom' THEN sf.Customrem 
        // ELSE rm.Remark 
        // END AS UserRemark,
        // sf.ProposedQty, sf.FeedbackDate, rmm.remark as AdminRemark, af.customrem,af.ApprovedQty , af.AdminFBDate ,sf.Status
        // FROM ${spmdynamicTable} sf
        // JOIN z_scope..part_master pm 
        // ON pm.brandid = sf.Brandid AND pm.partid = sf.partid
		// LEFT JOIN ${admindynamicTable} af on af.FeedbackID = sf.FeedbackID
		// LEFT JOIN UAD_VON..UAD_VON_Remarksmaster rmm 
        // ON rmm.Remarkid = af.AdminRemark
        // JOIN z_scope..locationinfo li 
        // ON li.LocationID = sf.Locationid
        // JOIN UAD_VON..UAD_VON_Remarksmaster rm 
        // ON rm.Remarkid = sf.UserFBRemarkID 
        // WHERE sf.Dealerid = ${dealerid}
        // AND (
        //     (@LocationID IS NOT NULL AND sf.locationid = @LocationID) 
        //     OR 
        //     (@PartID IS NOT NULL AND pm.partid = @PartID)
        // )
        // `
        const query = `
    USE [UAD_VON];
    SELECT 
        li.Brand, li.Dealer, li.Location, 
        pm.PartNumber, pm.PartDesc, pm.Category, pm.MRP, 
        sf.MaxValue, 
        CASE 
            WHEN rm.Remark = 'Custom' THEN sf.Customrem 
            ELSE rm.Remark 
        END AS UserRemark,
        sf.ProposedQty, sf.FeedbackDate, 
         CASE 
            WHEN rmm.Remark = 'Custom' THEN af.Customrem 
            ELSE rmm.Remark 
        END AS AdminRemark, af.ApprovedQty, 
        af.AdminFBDate, sf.Status
    FROM ${spmdynamicTable} sf
    JOIN z_scope..part_master pm 
        ON pm.brandid = sf.Brandid AND pm.partid = sf.partid
    LEFT JOIN ${admindynamicTable} af 
        ON af.FeedbackID = sf.FeedbackID
    LEFT JOIN UAD_VON..UAD_VON_Remarksmaster rmm 
        ON rmm.Remarkid = af.AdminRemark
    JOIN z_scope..locationinfo li 
        ON li.LocationID = sf.Locationid
    JOIN UAD_VON..UAD_VON_Remarksmaster rm 
        ON rm.Remarkid = sf.UserFBRemarkID 
    WHERE sf.Dealerid = @dealerid
    AND (@LocationID IS NULL OR sf.locationid = @LocationID)
    AND (@PartID IS NULL OR pm.partid = @PartID);
`;

const request = await pool.request();
request.input('dealerid', sql.Int, dealerid);
request.input('LocationID', sql.Int, locationid);
request.input('PartID', sql.Int, partid);

const result = await request.query(query);

        // const result = await pool.request().query(query)
        res.status(200).json({Data:result.recordset})
} catch (error) {
    res.status(500).json({Error:error.message,message:`Error in userViewLog`})
}
}
const adminView = async(req,res)=>{
    try {
        const pool =await getPool1()
        const {brandid, dealerid, r1, r2 ,l1,l2, partnumber , locationid , flag, seasonalid, modelid, natureid, status,parttype} = req.body
        if(!brandid || !dealerid){
            return res.status(400).json({Error:`Brandid and Dealerid are required Parameter`})
        }
        const query = `use z_scope EXEC GetMAXDataAdmin @brandid,@dealerid , @r1, @r2,@l1, @l2, @partnumber, @locationid, @maxvalueflag ,@seasonalid,@natureid,@modelid,@status,@parttype;`
        if(!partnumber && !locationid){
            return res.status(400).json({Error:`partnumber or locationid is required`})
        }
        
         const request = pool.request();

        // Handle potential NULL values correctly
        request.input('brandid',sql.Int,brandid)        
        request.input('dealerid',sql.Int,dealerid)
        request.input('r1', sql.Int, r1 ?? null);
        request.input('r2', sql.Int, r2 ?? null);
        request.input('l1', sql.Int, l1 ?? null);
        request.input('l2', sql.Int, l2 ?? null);
        request.input('seasonalid', sql.Int, seasonalid ?? null);
        request.input('natureid', sql.Int, natureid ?? null);
        request.input('modelid', sql.Int, modelid ?? null);
        request.input('partnumber', sql.VarChar, partnumber ?? null);
        request.input('locationid', sql.Int, locationid ?? null);
        request.input('maxvalueflag', sql.Int, flag ?? null);
        request.input('status', sql.Bit, status ?? null);
        request.input('parttype', sql.Bit, parttype ?? null);

        const result = await request.query(query);        
        res.status(200).json({Data:result.recordset})
} catch (error) {
    res.status(500).json({Error:error.message})
}
}
const adminFeedbackLog = async (req,res)=>{
    try {
        const pool = await getPool1()
        const {brandid, dealerid ,locationid, feedbackid ,AdminRemark,customRem,ApprovedQty} = req.body
        if((!brandid ||  !dealerid || !locationid || !AdminRemark || !ApprovedQty) || (feedbackid == null)){
            return res.status(400).json({message:`All Fields are required and Feedbackid cannot be null`})
        }
        
         const dynamicTable = `[UAD_VON]..UAD_VON_AdminFeedback_${brandid}`
        const userdynamicTable = `[UAD_VON]..UAD_VON_SPMFeedback_${brandid}`
        let PreviousAdminFBID = null;
        // console.log(PreviousAdminFBID);
        
        try {
            const previousAdminFBQuery = `
            SELECT TOP 1 AdminFBID
            FROM ${dynamicTable}
            WHERE Feedbackid = @feedbackid 
            ORDER BY AdminFBDate DESC
           `;
        //    console.log(previousAdminFBQuery);
           
           const previousAdminFBResult = await pool.request()
            .input('feedbackid', sql.Int, feedbackid)
            .query(previousAdminFBQuery);
            // console.log(previousAdminFBResult);
            
            PreviousAdminFBID =  previousAdminFBResult.recordset.length > 0 ? previousAdminFBResult.recordset[0].AdminFBID : null; 
            // console.log(PreviousAdminFBID);
            
        }catch (error) {
            return res.status(500).json({Error:error.message,Error:`Error in Finding Previous Feedback`})
        }
        let query = ` use [UAD_VON]             
                    insert into ${dynamicTable} (brandid,  dealerid , locationid, feedbackid ,AdminID,AdminRemark,ApprovedQty,PreviousAdminFBID,customrem)
                    values (@brandid , @dealerid , @locationid ,@feedbackid , 146297 , @adminremarkid , @approvedqty,@previousadminfbid,@customrem)`
    
        const request = await pool.request()
        request.input('brandid',sql.TinyInt,brandid)            
        request.input('dealerid',sql.Int,dealerid)            
        request.input('locationid',sql.Int,locationid)            
        request.input('feedbackid',sql.Int,feedbackid)            
        // request.input('latestid',sql.VarChar,LatestPartID)            
        // request.input('max',sql.Int,max)            
        request.input('adminremarkid',sql.Int,AdminRemark)                      
        request.input('customrem',sql.VarChar,customRem)                      
        request.input('approvedqty',sql.Int,ApprovedQty)            
        request.input('previousadminfbid',sql.Int,PreviousAdminFBID) 
        
        const result = await request.query(query)
        try {
             query = `update ${userdynamicTable} set Status = 'Reviewed' where feedbackid = ${feedbackid} `
             await pool.request().query(query)
        } catch (error) {
            res.status(500).json({Error:error.message})
        }

        res.status(200).json({message:`Success`})
    } catch (error) {
        res.status(500).json({Error:error.message})
    }
                
}
const partFamily = async (req,res)=>{
try {
        const pool = await getPool1()
        const {partnumber} = req.body
        if(!partnumber){
            return res.status(400).json({Error:`partnumber is required`})
        }
        // console.log(partnumber);
        
        const query = ` use [z_scope] 
                        select pm.partnumber1, (CASE WHEN pm.BrandID = sm.BrandID AND pm.PartNumber = sm.PartNumber THEN sm.SubPartNumber ELSE pm.PartNumber END)as LatestPartNumber , pm.partdesc, pm.category,pm.landedcost from [10.10.152.16].[z_scope].dbo.substitution_master sm 
                        join [10.10.152.16].[z_scope].dbo.part_master pm on pm.brandid = sm.brandid and pm.partnumber1 = sm.partnumber1
                        where sm.subpartnumber = (select distinct subpartnumber1 from [10.10.152.16].[z_scope].dbo.substitution_master where partnumber1 = @partnumber)`
        const result = await pool.request().input('partnumber',sql.VarChar,partnumber).query(query)
        // console.log(result.recordset);
        
        res.status(200).json({Data:result.recordset})
} catch (error) {
    res.status(500).json({Error:error.message})
}
}
const countPending = async(req,res)=>{
try {
        const pool = await getPool1()
        const {brandid , dealerid} = req.body
   
    const query = `USE [UAD_VON]; 
DECLARE @sql NVARCHAR(MAX) = N'';
SELECT @sql = @sql + 
    'SELECT li.Brand,li.brandid, li.dealer,li.dealerid, li.location,li.locationid, COUNT(*) AS Pending ' +
    'FROM ' + QUOTENAME(name) + ' a ' + 
    'JOIN z_scope..locationinfo li ON li.locationid = a.locationid ' + 
    'WHERE a.status = ''Pending'' ' +
    'GROUP BY li.Brand,li.brandid, li.dealer,li.dealerid,li.locationid, li.location UNION ALL ' 
FROM sys.tables
WHERE name LIKE 'UAD_VON_SPMFeedback_%';

-- Remove the last ' UNION ALL ' to avoid syntax error
IF LEN(@sql) > 10
    SET @sql = LEFT(@sql, LEN(@sql) - 10);

-- Append ORDER BY
SET @sql = @sql + ' ORDER BY Pending DESC;';

-- Execute the dynamically built SQL
EXEC sp_executesql @sql;`
    const result = await pool.request().query(query)
    // console.log(result.recordset);
    res.status(200).json({Data:result.recordset})
} catch (error) {
      res.status(500).json({Error:error.message})
}
}
const partFamilySale = async(req,res)=>{
try {
        const pool = await getPool1()
        const {partnumber , brandid , dealerid , locationid}= req.body
        if(!partnumber || !brandid || !dealerid || !locationid){
            return res.status(400).json({message:`All fields are required`})
        }        
        const query = `use [UAD_VON] EXEC [10.10.152.16].[z_scope].dbo.sp_partfamilysale '${partnumber}',${brandid},${dealerid},${locationid}`      
        const result = await pool.request().query(query)
        res.status(200).json({Data:result.recordset})
} catch (error) {
     res.status(500).json({Error:error.message})
}

}
const adminPendingView = async(req,res)=>{
try {
        const pool = await getPool1()
        const {brandid,dealerid,locationid,status,seasonalid,modelid,natureid} = req.body
        if(!brandid){
            return res.status(400).json({message:`Brandid is required`})
        }
        const query = `use [UAD_VON] EXEC sp_GetAdminView @brandid = @brandid, @dealerid = @dealerid, @locationid = @locationid,@Status = @status,@seasonalid = @seasonalid, @natureid = @natureid, @modelid = @modelid;`
        const result = await pool.request()
        .input('brandid',sql.Int,brandid)
        .input('dealerid',sql.Int,dealerid)
        .input('locationid',sql.Int,locationid)
        .input('status',sql.Int,status)
        .input('seasonalid',sql.Int,seasonalid ?? null)
        .input('natureid',sql.Int,natureid ?? null)
        .input('modelid',sql.Int,modelid ?? null)
        .query(query)
        // console.log(result.recordset);
        res.status(200).json({Data:result.recordset})
} catch (error) {
    res.status(500).json({Error:error.message})
}
}
const dealerUpload = async(req,res)=>{
    
    const {id} = req.body
    if(!id){
        res.status(400).json({message:`Body is required`})
    }
    if (!req.file || req.file.length === 0) {
        return res.status(400).json({ message: "No files received" });
    }
    const filePath = req.file.path;
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0]; // Read the first sheet
    let data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
    // console.log("Data : ", data[0]);
     fs.unlinkSync(filePath)
     res.send(data)
}



export {remarkMaster,userView,adminView,userFeedbacklog,viewLog,newRemark,viewRemark,adminFeedbackLog,partFamily,countPending,partFamilySale,adminPendingView,dealerUpload}