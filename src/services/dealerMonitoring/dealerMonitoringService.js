import { getPool1,getPool2 } from "../../db/db.js";

const partDescwithStockandQuality = async (brandid,dealerid,locationid,partnumber)=>{
 try {
       const pool = await getPool2()
       const query = `
       SELECT DISTINCT
       pm.partnumber1,
       pm.partid,
       (CASE 
           WHEN pm.partnumber = sm.partnumber THEN sm.subpartnumber 
           ELSE pm.partnumber 
        END) AS LatestPartno,
       pm.partdesc,
       pm.moq,
       pm.category,
       pm.landedcost,
       pm.mrp,
       pm.dateadded,
       pm.lastupdated,
       CASE
           WHEN os.greenflag = 'N' OR os.yellowflag = 'N' OR su.redflag = 'N' THEN 'Non-Moving' 
           WHEN sn.Maxvalue = 0 THEN 'Non-Stockable'
           WHEN sn.Maxvalue > 0 THEN 'Stockable'
       END AS Partstatus,
       cs2.Qty AS Stock
   FROM part_master pm
   LEFT JOIN substitution_master sm 
       ON pm.partnumber1 = sm.partnumber1
   LEFT JOIN Stockable_Nonstockable_TD001_${dealerid} sn 
       ON sn.locationid = ${locationid} AND sn.partnumber1 = pm.partnumber1
   LEFT JOIN Opening_Stock_Upload_TD001_${dealerid} os 
       ON os.Locationid = ${locationid} AND pm.PartNumber = os.Partnumber1
   LEFT JOIN stock_upload_spm_td001_${dealerid} su 
       ON su.locationid = ${locationid} AND pm.PartNumber1 = su.Partnumber1
   LEFT JOIN CurrentStock2 cs2 
       ON pm.partnumber = cs2.PartNumber
   LEFT JOIN (
       SELECT * FROM CurrentStock1 WHERE LocationID = ${locationid}
   ) cs1 
       ON cs1.tCode = cs2.StockCode
   WHERE pm.partnumber1 IN ('${partnumber}')
     AND pm.brandid = ${brandid}
     --AND cs1.Locationid = ${locationid}`
//    console.log(query);
   
   const result = await pool.request().query(query)
//    console.log(result);
   
   return result
 } catch (error) {
    throw new Error(`partDescwithStockandQuality failed: ${error.message}`)
 }
}

const reservedForVehicle = async (dealerid,partnumber)=>{
try {
        const pool = await getPool2()
        const query = `
        select count(Part_Number1)as ReservedforVehicle from Create_Order_Request_TD001_${dealerid}
        where Part_Number1 = '${partnumber}' and Final_Close = 'N'
        group by Part_Number1
        `
        // console.log(query);
        const result = await pool.request().query(query)
        return result
} catch (error) {
    throw new Error(`reservedForVehicle failed: ${error.message}`)
}
}

const groupStock = async (brandid,locationid,partnumber)=>{
try {
        const pool = await getPool2()
        const query = `
        DECLARE
        @InputPart VARCHAR(40) = '${partnumber}',-- ← your input part
        @InputBrandID INT = ${brandid}; -- ← your input brand
        DECLARE @RowsInserted INT;
        -- 0) Drop any old temp-table
        IF OBJECT_ID('tempdb..#PartFamily','U') IS NOT NULL
        DROP TABLE #PartFamily;
        -- 1) Create a holding table: one row per (Part, BrandID)
        CREATE TABLE #PartFamily (
        Part VARCHAR(40),
        BrandID INT,
        --CONSTRAINT PK_PartFamily PRIMARY KEY (Part, BrandID)
        );
        -- 2) Seed it with exactly your input (part, brand)
        INSERT INTO #PartFamily(Part, BrandID)
        VALUES (@InputPart, @InputBrandID);
    
    
        -- 3) Iteratively grow the family within that brand
        SET @RowsInserted = 1;
        WHILE @RowsInserted > 0
        BEGIN
        INSERT INTO #PartFamily(Part, BrandID)
        SELECT DISTINCT
        sm.SubPartNumber1,
        sm.BrandID
        FROM Substitution_Master AS sm
        JOIN #PartFamily AS f
        ON sm.PartNumber1 = f.Part
        AND sm.BrandID = f.BrandID
        WHERE NOT EXISTS (
        SELECT 1
        FROM #PartFamily x
        WHERE x.Part = sm.SubPartNumber1
        AND x.BrandID = sm.BrandID
        )
        UNION
        SELECT DISTINCT
        sm.PartNumber1,
        sm.BrandID
        FROM Substitution_Master AS sm
        JOIN #PartFamily AS f
        ON sm.SubPartNumber1 = f.Part
        AND sm.BrandID = f.BrandID
        WHERE NOT EXISTS (
        SELECT 1
        FROM #PartFamily x
        WHERE x.Part = sm.PartNumber1
        AND x.BrandID = sm.BrandID
        );
        SET @RowsInserted = @@ROWCOUNT;
        END
        ;with sub as(
        select LocationID ,location from LocationInfo where dealerid = (select dealerid from
        locationinfo where locationid = ${locationid}) and OgsStatus = 1
        )
        select sub.location,sub.locationid,sum(qty)as Stock from CurrentStock2 cs2
        join CurrentStock1 cs1 on cs1.tCode = cs2.StockCode
        join #PartFamily pf on pf.Part = cs2.partnumber
        join sub on cs1.locationid = sub.locationid
        group by sub.location,sub.locationid
        `
        // console.log(query);
        
        const result = await pool.request().query(query)
        return result
} catch (error) {
    throw new Error(`groupStock failed: ${error.message}`)
}
}

const jobCardByVehicleService = async (filter,vehicleno,dealerid)=>{
try {
        const pool= await getPool2()
        const query = 
        `
        DECLARE @StatusFilter VARCHAR(20) = '${filter}'; -- Change to 'Approve', 'Close', 'Decline' as needed
        SELECT DISTINCT 
        jobcard_number, 
        SUM(OrderValue) AS Value, 
        current_status  
        FROM Create_Order_Request_TD001_${dealerid}
        WHERE vehiclenumber = '${vehicleno}'
        AND (@StatusFilter IS NULL OR current_status = @StatusFilter)
        GROUP BY jobcard_number, current_status;
        `
        
        const result = await pool.request().query(query)
        return result
} catch (error) {
    throw new Error(`jobCardByVehicle failed: ${error.message}`)
}
}

const partsByJobCardService = async(dealerid , jobcardno)=>{
try {
            const pool = await getPool2()
            const query =  
            `
            select distinct co.part_number1 , pm.partdesc , pm.mrp , co.Qty as StockQty , 
            CASE
            WHEN os.greenflag = 'N' OR os.yellowflag = 'N' OR su.redflag = 'N' 
            THEN 'Non-Moving' 
            WHEN sn.Maxvalue = 0 THEN 'Non-Stockable'
    		WHEN sn.Maxvalue > 0 THEN 'Stockable'
            END AS Partstatus
            from Create_Order_Request_TD001_${dealerid} co
            join LocationInfo li on li.LocationID = co.LocationID
            join Part_Master pm on li.brandid = pm.brandid and pm.partnumber = co.Part_Number1
            left join CurrentStock1 cs1 on co.LocationID = cs1.locationid 
            left join  CurrentStock2 cs2 on cs2.StockCode = cs1.tCode  and cs2.PartNumber = co.part_number1
            left join Stockable_Nonstockable_TD001_${dealerid} sn on sn.locationid = co.locationid and sn.partnumber1 = co.part_number
            left JOin  Opening_Stock_Upload_TD001_${dealerid} os on os.Locationid = co.LocationID and co.Part_Number = os.Partnumber1
            left JOIN stock_upload_spm_td001_${dealerid} su ON su.locationid = co.locationid AND co.Part_Number1 = su.Partnumber1
            where co.jobcard_number = '${jobcardno}' and su.stockdate = (select max(stockdate) from stock_upload_spm_td001_${dealerid})    
            `
            const result = await pool.request().query(query)
            return result 
} catch (error) {
    throw new Error(`partsByJobCard failed: ${error.message}`)
}
}

const partSubstituteDetailService = async(brandid,partnumber)=>{
try {
        const pool = await getPool2()
        const query = `
        DECLARE  
         @InputPart    VARCHAR(40) = '${partnumber}',      -- ←  input part 
         @InputBrandID INT         = ${brandid};           -- ←  input brand 
     
        DECLARE @RowsInserted INT; 
     
        -- 0) Drop any old temp-table 
        IF OBJECT_ID('tempdb..#PartFamily','U') IS NOT NULL 
         DROP TABLE #PartFamily; 
     
        -- 1) Create a holding table: one row per (Part, BrandID) 
        CREATE TABLE #PartFamily ( 
         Part    VARCHAR(40), 
         BrandID INT, 
         --CONSTRAINT PK_PartFamily PRIMARY KEY (Part, BrandID) 
        ); 
     
        -- 2) Seed it with exactly your input (part, brand) 
        INSERT INTO #PartFamily(Part, BrandID) 
        VALUES (@InputPart, @InputBrandID); 
     
        -- 3) Iteratively grow the family within that brand 
        SET @RowsInserted = 1; 
        WHILE @RowsInserted > 0 
        BEGIN 
            INSERT INTO #PartFamily(Part, BrandID) 
            SELECT DISTINCT 
                sm.SubPartNumber1, 
                sm.BrandID 
            FROM Substitution_Master AS sm 
            JOIN #PartFamily AS f 
              ON sm.PartNumber1 = f.Part 
             AND sm.BrandID    = f.BrandID 
            WHERE NOT EXISTS ( 
               SELECT 1 
               FROM #PartFamily x 
               WHERE x.Part    = sm.SubPartNumber1 
                 AND x.BrandID = sm.BrandID 
            ) 
        
            UNION 
        
            SELECT DISTINCT 
                sm.PartNumber1, 
                sm.BrandID 
            FROM Substitution_Master AS sm 
            JOIN #PartFamily AS f 
              ON sm.SubPartNumber1 = f.Part 
             AND sm.BrandID        = f.BrandID 
            WHERE NOT EXISTS ( 
               SELECT 1 
               FROM #PartFamily x 
               WHERE x.Part    = sm.PartNumber1 
                 AND x.BrandID = sm.BrandID 
            ); 
        
            SET @RowsInserted = @@ROWCOUNT; 
        END 
        
        -- 4) Pull full details for every (Part, BrandID) found 
        SELECT   
            pm.PartNumber1, 
            pm.PartDesc, 
            pm.LandedCost, 
            pm.MRP, 
            pm.PartID, 
            pm.Category, 
            pm.MOQ, 
            pm.BrandID 
        FROM Part_Master pm 
        JOIN #PartFamily pf 
          ON pm.PartNumber1 = pf.Part 
         AND pm.BrandID     = pf.BrandID 
        ORDER BY pm.PartNumber1, pm.BrandID; 
        
        -- 5) Clean up 
     DROP TABLE #PartFamily;
        `
        const result = await pool.request().query(query)
        return result
} catch (error) {
    throw new Error(`partSubstituteDetailsService failed: ${error.message}`)
}
}

const userroleService = async(userid)=>{
try {
        const pool = await getPool1()
        const query = `select rm.Role from adminmaster_gen amg 
                        join Role_Master rm on rm.bigid = amg.Designation
                        where bintId_Pk = ${userid}`
        const result = await pool.request().query(query)
        return result
} catch (error) {
    throw new Error(`userinfoService failed: ${error.message}`);
}
}

const locationwisePPNIValueService = async(dealerid,jobcardstatus , nonstockable)=>{
try {
        const pool = await getPool2()
        const query = ` USE [UAD_BI_PPNI]
                        select Location, LocationId ,Advisor,sum(ppni_val)as PPNI_Value
                        from ppni_report_${dealerid} 
                        where All_Time_NonStck = '${nonstockable}' and JobCardStatus = '${jobcardstatus}'
                        group by Location , Advisor , LocationId
                        order by PPNI_Value DeSc `
        const result = await pool.request().query(query)
        return result
} catch (error) {
    throw new Error(`locationwisePPNIValueService failed: ${error.message}`);
}
}

const advisorwisePPNIValueService = async(dealerid,locationid,jobcardstatus , nonstockable )=>{
try {
        const pool = await getPool2()
        const query = ` USE [UAD_BI_PPNI]
                        select Advisor ,sum(ppni_val)as PPNI_Value from PPNI_report_${dealerid}
                        where All_Time_NonStck = '${nonstockable}' and JobCardStatus = '${jobcardstatus}' and locationid = ${locationid}
                        group by Advisor
                        order by PPNI_Value DeSc `
        const result = await pool.request().query(query)
        return result
} catch (error) {
    throw new Error(`locationwisePPNIValueService failed: ${error.message}`);
}
}

const vehiclewisePPNIValueService = async(dealerid,locationid,jobcardstatus , nonstockable , advisor)=>{
try {
        const pool = await getPool2()
        const query = ` USE [UAD_BI_PPNI]
                        select Vehiclenumber ,PartNumber, PartDesc , part_category, price ,Qty, sum(ppni_val)as PPNI_Value from PPNI_report_${dealerid}
                        where All_Time_NonStck = '${nonstockable}' and JobCardStatus = '${jobcardstatus}' and locationid = ${locationid} and advisor like '${advisor}' 
                        group by PartNumber , Vehiclenumber, PartDesc , part_category ,price ,Qty having sum(ppni_val) > 0
                        order by PPNI_Value DeSc `
        const result = await pool.request().query(query)
        return result
} catch (error) {
    throw new Error(`advisorwisePPNIValueService failed: ${error.message}`);
}
}

const partwisePPNIValueService = async(dealerid,locationid,jobcardstatus , nonstockable , advisor , vehicleno)=>{
try {
        const pool = await getPool2()
        const query = ` USE [UAD_BI_PPNI]
                        select PartNumber , ppni_val from PPNI_report_${dealerid}
                        where All_Time_NonStck = '${nonstockable}' and JobCardStatus = '${jobcardstatus}' and locationid = ${locationid} and advisor like '${advisor}' and Vehiclenumber = '${vehicleno}'
                        order by PPNI_Val DeSc `
        const result = await pool.request().query(query)
        return result
} catch (error) {
    throw new Error(`advisorwisePPNIValueService failed: ${error.message}`);
}
}
export {userroleService,partDescwithStockandQuality,reservedForVehicle,groupStock,jobCardByVehicleService,partsByJobCardService,partSubstituteDetailService,locationwisePPNIValueService,advisorwisePPNIValueService,vehiclewisePPNIValueService,partwisePPNIValueService}