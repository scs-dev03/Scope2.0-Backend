import {getPool1} from '../db/db.js'
import sql from 'mssql'

import fs from 'fs'
import { partBrandCheck, readExcel,insertData } from '../utils/vonHelper.js'
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
        // console.log(brandid, dealerid, r1, r2 ,l1,l2, partnumber , locationid , flag, seasonalid, modelid, natureid, status,parttype);
        
        if(!brandid || !dealerid){
            return res.status(400).json({Error:`Brandid and Dealerid are required Parameter`})
        }
        const query = `use z_scope EXEC GetMAXDataAdmin @brandid,@dealerid , @r1, @r2,@l1, @l2, @partnumber, @locationid, @maxvalueflag ,@seasonalid,@natureid,@modelid,@status,@parttype;`
        // console.log(query);
        
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
        console.log(result.recordset[0]);
               
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
        const {partnumber , brandid} = req.body
        if(!partnumber || !brandid){
            return res.status(400).json({Error:`partnumber and brandid is required`})
        }
        // console.log(partnumber);
        
        // const query = ` use [z_scope] 
        //                 select pm.partnumber1, (CASE WHEN pm.BrandID = sm.BrandID AND pm.PartNumber = sm.PartNumber THEN sm.SubPartNumber ELSE pm.PartNumber END)as LatestPartNumber , pm.partdesc, pm.category,pm.landedcost from [10.10.152.16].[z_scope].dbo.substitution_master sm 
        //                 join [10.10.152.16].[z_scope].dbo.part_master pm on pm.brandid = sm.brandid and pm.partnumber1 = sm.partnumber1
        //                 where sm.subpartnumber = (select distinct subpartnumber1 from [10.10.152.16].[z_scope].dbo.substitution_master where partnumber1 = @partnumber)`
        const query = `use z_scope
                        select pm.partnumber1, (CASE WHEN pm.BrandID = sm.BrandID AND pm.PartNumber = sm.PartNumber THEN sm.SubPartNumber ELSE pm.PartNumber END)as LatestPartNumber , pm.partdesc, pm.category,pm.landedcost from Substitution_Master sm
                        join part_master pm on pm.brandid = sm.brandid and sm.partnumber = pm.partnumber
                        where sm.subpartnumber = '${partnumber}' and sm.brandid = ${brandid}`
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
        const query = `use [UAD_VON] EXEC  sp_partfamilysale '${partnumber}',${brandid},${dealerid},${locationid}`      
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
const dealerUpload = async (req, res) => {
    let transaction; // Declare transaction outside try block
  
    try {
      const pool = await getPool1();
      transaction = await pool.transaction(); // Initialize transaction
  
      if (!req.file || req.file.length === 0) {
        return res.status(400).json({ message: "No files received" });
      }
    // console.log(req.file.path);
    
      let data = await readExcel(req.file.path);
    //   console.log(`data` , data[0]);
      
      fs.unlinkSync(req.file.path); // Delete uploaded file after processing
   
      const cleanedData =  data
             .filter(item => item.UserRemark !== null && item.ProposedQty !== null && item.ProposedQty !== null && item.ProposedQty !== undefined)
            .map(({ Brand, Dealer, Location, Maxvalue, Partid, UserRemark, ProposedQty }) => ({
                Brand,
                Dealer,
                Location,
                Maxvalue,
                Partid,
                UserRemark,
                ProposedQty
            }));
    
// console.log(cleanedData);
const isArrayEmpty = (arr) => !arr || arr.length === 0;
if(isArrayEmpty(cleanedData)){
    return res.status(400).json({message:`UserFeedback and ProposedQty cannot be null or undefined`})
}


// Extract distinct values from data
const distinctLocations = [...new Set(cleanedData.map(item => item.Location))];
const distinctBrands    = [...new Set(cleanedData.map(item => item.Brand))];
const distinctDealers   = [...new Set(cleanedData.map(item => item.Dealer))];
const distinctPartid    = [...new Set(cleanedData.map(item=> item.Partid))];

// console.log('Distinct Locations:', distinctLocations);
// console.log('Distinct Brands:', distinctBrands);
// console.log('Distinct Dealers:', distinctDealers);
// console.log('Distinct PartID:', distinctPartid);

// Fetch the brandid and dealerid for a given brand and dealer if needed
const brand = data[0].Brand;
const dealer = data[0].Dealer;


const queryIds = `SELECT brandid, dealerid 
FROM locationinfo 
WHERE brand LIKE '${brand}' AND dealer LIKE '${dealer}'`;

const resultIds = await pool.request().query(queryIds);
const { brandid, dealerid } = resultIds.recordset[0];
// console.log('Brand & Dealer IDs:', { brandid, dealerid });

// Now, similarly, fetch IDs for each distinct brand
const brandResults = [];
for (const b of distinctBrands) {
    const queryBrand = `SELECT brandid FROM locationinfo WHERE brand LIKE '${b}'`;
    const brandResult = await pool.request().query(queryBrand);
    if (brandResult.recordset.length) {
        brandResults.push({
            brand: b,
            brandid: brandResult.recordset[0].brandid
        });
    }
}
const tableName = `UAD_VON..UAD_VON_SPMFeedback_${brandResults[0].brandid}`
// console.log(tableName);

// console.log('Brands with IDs:', brandResults);

// And similarly, for each distinct dealer
const dealerResults = [];
for (const d of distinctDealers) {
    const queryDealer = `SELECT dealerid FROM locationinfo WHERE dealer LIKE '${d}'`;
    const dealerResult = await pool.request().query(queryDealer);
    if (dealerResult.recordset.length) {
        dealerResults.push({
            dealer: d,
            dealerid: dealerResult.recordset[0].dealerid
        });
    }
}
// console.log('Dealers with IDs:', dealerResults);
const maxTable = `z_scope..stockable_nonstockable_td001_${dealerResults[0].dealerid}`
// console.log(maxTable);


// Get location IDs for each distinct location
const locationResults = [];

for (const loc of distinctLocations) {
  const queryLocation = `
    SELECT locationid 
    FROM locationinfo 
    WHERE brandid = ${brandid} 
      AND dealerid = '${dealerid}'
      AND location LIKE '${loc}'
  `;
  const locResult = await pool.request().query(queryLocation);
  if (locResult.recordset.length) {
      locationResults.push({
          location: loc,
          locationid: locResult.recordset[0].locationid
        });
    }
}

console.log('Locations with IDs:', locationResults);

const latestPartIDs = [];

for (const partid of distinctPartid) {
  const queryLatestPartID = `
WITH LatestPartNumberCTE AS (
    SELECT TOP 1
        (CASE 
            WHEN pm.BrandID = sm.BrandID AND pm.PartNumber = sm.PartNumber 
            THEN sm.SubPartNumber 
            ELSE pm.PartNumber 
        END) AS LatestPartNumber
    FROM substitution_master sm
    JOIN z_scope..part_master pm 
      ON pm.brandid = sm.brandid 
     AND pm.partnumber = sm.partnumber 
    WHERE pm.partid = ${partid}
)
SELECT partid
FROM z_scope..part_master
WHERE partnumber = (SELECT LatestPartNumber FROM LatestPartNumberCTE);
  `;
//   const queryLatestPartID = `select * from locationinfo`
  const queryResult = await pool.request().query(queryLatestPartID);
  
  if (queryResult.recordset.length) {
    latestPartIDs.push({
      Partid: partid,
      LatestPartID: queryResult.recordset[0].partid
    });
  }
}
console.log('LatestPartIDs:', latestPartIDs);

const previousFBIDs = [];
for (const partid of distinctPartid) {  
  const queryPreviousFBID = `
    SELECT TOP 1 FeedbackID 
    FROM ${tableName}
    WHERE PartID = ${partid} 
    ORDER BY FeedbackDate DESC
  `;
//   console.log("Executing Query:", queryPreviousFBID);  
  try {
    const previousFBResult = await pool.request().query(queryPreviousFBID);

    if (previousFBResult.recordset.length) {
      previousFBIDs.push({
        Partid: partid,
        PreviousFBID: previousFBResult.recordset[0].FeedbackID
      });
    }
  } catch (fetchError) {
    console.error(`Error fetching PreviousFBID for PartID ${partid}:`, fetchError);
  }
}
console.log(previousFBIDs);
let maxValueMapping = [];
        for (const partid of distinctPartid) {
            for (const location of locationResults) {
                const queryMaxValue = `
                    SELECT maxvalue FROM ${maxTable} 
                    WHERE partid = ${partid} 
                    AND locationid = ${location.locationid} 
                    AND stockdate = (SELECT TOP 1 stockdate FROM ${maxTable} where partid = ${partid} ORDER BY stockdate DESC)
                `;
                const maxResult = await pool.request().query(queryMaxValue);
                if (maxResult.recordset.length) {
                    maxValueMapping.push({
                        Partid: partid,
                        Location: location.locationid,
                        MaxValue: maxResult.recordset[0].maxvalue
                    });
                }
                // console.log(queryMaxValue);
                
            }
        }
        console.log(maxValueMapping);
        

const invalidRecords = cleanedData.filter(item => {
    const locationMapping = locationResults.find(l => l.location === item.Location);
    return !locationMapping;  // If location is not found, it's invalid
});

if (invalidRecords.length > 0) {
    // console.error("Invalid Locations Found:", invalidRecords.map(r => ({ Dealer: r.Dealer, Location: r.Location })));

    return res.status(400).json({
        message: "Some locations are invalid for the given dealer",
        invalidLocations: invalidRecords.map(r => ({ Dealer: r.Dealer, Location: r.Location }))
    });
}
 
// console.log("PreviousFBIDs:", previousFBIDs);
  const UserID = 1; // Static User ID
  const UserFBRemarkID = 1; // Static feedback remark ID

    // Transform the data to only include the required fields
const formattedData = cleanedData.map(item => {
    // Get mapping values based on the original object's Brand, Dealer, and Location
    const brandMapping = brandResults.find(b => b.brand === item.Brand);
    const dealerMapping = dealerResults.find(d => d.dealer === item.Dealer);
    const locationMapping = locationResults.find(l => l.location === item.Location);
    const latestpartidMapping = latestPartIDs.find(lp => lp.Partid === item.Partid);
    const partidPreviousFBIDMapping = previousFBIDs.find(pfb => pfb.Partid === item.Partid);  // Fix Matching
    const maxValueMappingItem = maxValueMapping.find(mv => mv.Partid === item.Partid);
    // const partNumberMapping = partNumberMappings.find(p => p.partid === item.Partid);
    // const maxValueMapping = maxValues.find(mv => mv.partnumber === partNumberMapping?.partnumber && mv.locationid === locationMapping?.locationid);

    return {
      brandid: brandMapping ? brandMapping.brandid : null,
      dealerid: dealerMapping ? dealerMapping.dealerid : null,
      locationid: locationMapping ? locationMapping.locationid : null,
    //   maxvalue: item.Maxvalue,
    // maxvalue: maxValueMapping ? maxValueMapping.maxvalue : null,
    maxvalue: maxValueMappingItem ? maxValueMappingItem.MaxValue : null, 
      partid: item.Partid,
      latestpartid: latestpartidMapping ? latestpartidMapping.LatestPartID : null,
      UserID: UserID,
      UserFBRemarkID: UserFBRemarkID,
      CustomRem: item.UserRemark,
      ProposedQty: item.ProposedQty,
      PreviousFBID: partidPreviousFBIDMapping ? partidPreviousFBIDMapping.PreviousFBID : null, // Fix
    };
    
});
// Find records with null locationid
// const invalidRecords = formattedData.filter(item => item.locationid === null);

if (invalidRecords.length > 0) {
    // console.error("Error: The following records have null locationid:", invalidRecords);

    return res.status(400).json({
        message: "Some records have missing location IDs",
        invalidRecords: invalidRecords
    });
}
// console.log(formattedData);

console.log("Formatted Data:", formattedData);

await transaction.begin(); // Start transaction
await insertData(formattedData,tableName)  // Insert Function to insert formatted data into table
await transaction.commit(); // Commit transaction
    // console.log(`Dealer Feedback INSERTED`);
    
      res.status(200).json({ message: "Data inserted successfully", data: formattedData });

} catch (error) {
      console.error("Error in dealerUpload:", error);
  
      if (transaction) {
        await transaction.rollback(); // Rollback transaction on error
      }
  
      res.status(500).json({ Error: error.message });
    }
};


// const dealerUpload = async (req, res) => {
//     let transaction;
//     try {
//         console.time("dealerUpload"); // Start timing execution

//         const pool = await getPool1(); // Ensure pool is connected
//         transaction = pool.transaction(); // Initialize transaction

//         if (!req.file || req.file.length === 0) {
//             return res.status(400).json({ message: "No files received" });
//         }

//         let data = await readExcel(req.file.path);
//         fs.unlinkSync(req.file.path); // Delete uploaded file after processing

//         const cleanedData = data
//             .filter(item => item.UserRemark !== null && item.ProposedQty !== null)
//             .map(({ Brand, Dealer, Location, Maxvalue, Partid, UserRemark, ProposedQty }) => ({
//                 Brand,
//                 Dealer,
//                 Location,
//                 Maxvalue,
//                 Partid,
//                 UserRemark,
//                 ProposedQty
//             }));

//         if (cleanedData.length === 0) {
//             return res.status(400).json({ message: "UserFeedback and ProposedQty cannot be null or undefined" });
//         }

//         // 🔹 Set SQL request timeout (default is 15s, increase to 60s)
//         const request = pool.request();
//         request.timeout = 60000;

//         // 🔹 Fetch IDs (with error handling)
//         const brand = data[0].Brand;
//         const dealer = data[0].Dealer;

//         console.time("Query - Get Brand & Dealer ID");
//         const queryIds = `SELECT brandid, dealerid FROM locationinfo WHERE brand = @brand AND dealer = @dealer`;
//         request.input("brand", sql.NVarChar, brand);
//         request.input("dealer", sql.NVarChar, dealer);
//         const resultIds = await request.query(queryIds);
//         console.timeEnd("Query - Get Brand & Dealer ID");

//         if (resultIds.recordset.length === 0) {
//             return res.status(400).json({ message: `No matching Brand/Dealer found: ${brand} - ${dealer}` });
//         }

//         const { brandid, dealerid } = resultIds.recordset[0];

//         // Start Transaction
//         try {
//             console.time("Transaction Begin");
//             await transaction.begin();
//             console.timeEnd("Transaction Begin");
//         } catch (err) {
//             console.error("Transaction start failed:", err);
//             return res.status(500).json({ message: "Transaction could not start", error: err.message });
//         }

//         // 🔹 Insert Process (Replace with actual bulk insert logic)
//         console.time("Insert Data");
//         await insertData(cleanedData, brandid, dealerid);
//         console.timeEnd("Insert Data");

//         console.time("Transaction Commit");
//         await transaction.commit();
//         console.timeEnd("Transaction Commit");

//         console.timeEnd("dealerUpload"); // End timing execution
//         res.status(200).json({ message: "Data inserted successfully" });

//     } catch (error) {
//         console.error("Error in dealerUpload:", error);

//         if (transaction) {
//             console.time("Transaction Rollback");
//             await transaction.rollback();
//             console.timeEnd("Transaction Rollback");
//         }

//         res.status(500).json({ message: "Internal server error", error: error.message });
//     }
// };



  



export {remarkMaster,userView,adminView,userFeedbacklog,viewLog,newRemark,viewRemark,adminFeedbackLog,partFamily,countPending,partFamilySale,adminPendingView,dealerUpload}