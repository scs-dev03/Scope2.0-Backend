import { getPool1,getPool2 } from "../../db/db.js";
import sql from 'mssql'
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
	   cs2.qty,
       CASE
           WHEN os.greenflag = 'N' OR os.yellowflag = 'N' OR su.redflag = 'N' THEN 'Non-Moving' 
           WHEN sn.Maxvalue = 0 THEN 'Non-Stockable'
           WHEN sn.Maxvalue > 0 THEN 'Stockable'
       END AS Partstatus
   FROM part_master pm
   LEFT JOIN substitution_master sm 
       ON pm.partnumber1 = sm.partnumber1
   LEFT JOIN Stockable_Nonstockable_TD001_${dealerid} sn 
       ON sn.locationid = ${locationid} AND sn.partnumber1 = pm.partnumber1
   LEFT JOIN Opening_Stock_Upload_TD001_${dealerid} os 
       ON os.Locationid = ${locationid} AND pm.PartNumber = os.Partnumber1
   LEFT JOIN stock_upload_spm_td001_${dealerid} su 
       ON su.locationid = ${locationid}  AND pm.PartNumber1 = su.Partnumber1
	left JOIN currentstock1 cs1 
	ON cs1.locationid = ${locationid} 
	Left JOIN currentstock2 cs2 
	ON cs1.tcode = cs2.stockcode and cs2.partnumber = pm.partnumber1
   WHERE pm.partnumber1 IN ('${partnumber}')
     AND pm.brandid = ${brandid}`
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
        select * from #PartFamily
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
        DECLARE @StatusFilter VARCHAR(20) 
        SET @StatusFilter = CASE WHEN '${filter}' = 'null' THEN NULL ELSE '${filter}' END; -- Change to 'Approve', 'Close', 'Decline' as needed
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
            left join CurrentStock2 cs2 on cs2.StockCode = cs1.tCode  and cs2.PartNumber = co.part_number1
            left join Stockable_Nonstockable_TD001_${dealerid} sn on sn.locationid = co.locationid and sn.partnumber1 = co.part_number
            left JOin Opening_Stock_Upload_TD001_${dealerid} os on os.Locationid = co.LocationID and co.Part_Number = os.Partnumber1
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
    pm.BrandID,
    ISNULL(cs2.Qty, 0) AS Qty,
    CASE 
	 WHEN os.greenflag = 'Y' OR os.yellowflag = 'Y' OR su.redflag = 'Y' 
         THEN 'Non-Moving' 
        WHEN sn.PartNumber1 IS NULL THEN 'Non-Stockable'
        WHEN sn.MaxValue > 0 THEN 'Stockable'
        ELSE 'Non-Stockable'
    END AS PartStatus
FROM #PartFamily pf
LEFT JOIN Part_Master pm 
    ON pm.PartNumber1 = pf.Part AND pm.BrandID = pf.BrandID 
JOIN CurrentStock1 cs1 
    ON cs1.LocationID = 14
LEFT JOIN CurrentStock2 cs2 
    ON cs2.PartNumber = pf.Part AND cs1.tCode = cs2.StockCode
LEFT JOIN Stockable_Nonstockable_TD001_8 sn 
    ON sn.LocationID = cs1.LocationID AND sn.PartNumber1 = pf.Part and sn.stockdate = (select max(stockdate) from Stockable_Nonstockable_TD001_8)
LEFT Join Opening_Stock_Upload_TD001_8 os 
on os.Locationid = cs1.LocationID and pf.Part = os.Partnumber1
LEFT Join stock_upload_spm_td001_8 su 
ON su.locationid = cs1.locationid AND pf.Part = su.Partnumber1 and  su.stockdate = (select max(stockdate) from stock_upload_spm_td001_8)
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
        const query = `select rm.Role,concat(amg.vcFirstName,' ',amg.vcLastName)as Name from adminmaster_gen amg 
                        join Role_Master rm on rm.bigid = amg.Designation
                        where bintId_Pk = ${userid}`
        const result = await pool.request().query(query)
        return result
} catch (error) {
    throw new Error(`userinfoService failed: ${error.message}`);
}
}

// const locationwisePPNIValueService = async(dealerid,jobcardstatus , nonstockable)=>{
// try {
//         const pool = await getPool2()
//         const query = `
//         DECLARE @All_Time_NonStck VARCHAR(1) = ${nonstockable};  -- 'Y', 'N', or NULL
//         DECLARE @JobCardStatus VARCHAR(10) = ${jobcardstatus};    -- 'OPEN', 'CLOSE', or NULL
        
//         USE [UAD_BI_PPNI];
        
//         SELECT 
//             Location, 
//             LocationId, 
//             Advisor,
//             SUM(ppni_val) AS PPNI_Value
//         FROM 
//             ppni_report_${dealerid}
//         WHERE  
//             (
//                 (@All_Time_NonStck IS NULL AND All_Time_NonStck IN ('Y', 'N')) 
//                 OR (@All_Time_NonStck IS NOT NULL AND All_Time_NonStck = @All_Time_NonStck)
//             )
//             AND
//             (
//                 (@JobCardStatus IS NULL AND JobCardStatus IN ('OPEN', 'CLOSE')) 
//                 OR (@JobCardStatus IS NOT NULL AND JobCardStatus = @JobCardStatus)
//             )
//         GROUP BY 
//             Location, 
//             LocationId, 
//             Advisor
//         HAVING 
//             SUM(ppni_val) > 0
//         ORDER BY 
//             PPNI_Value DESC;
        
//         `
//         const result = await pool.request().query(query)
//         return result
// } catch (error) {
//     throw new Error(`locationwisePPNIValueService failed: ${error.message}`);
// }
// }

const locationwisePPNIValueService = async (dealerid, jobcardstatus, nonstockable) => {
  try {
    if (!dealerid) throw new Error("dealerid is required");

    const pool = await getPool2();

    const request = pool.request()
      .input('All_Time_NonStck', sql.VarChar, nonstockable || null)
      .input('JobCardStatus', sql.VarChar, jobcardstatus || null);

    const tableName = `ppni_report_${dealerid}`;

    const query = `
      USE [UAD_BI_PPNI];

      SELECT 
          Location, 
          LocationId, 
          Advisor,
          SUM(ppni_val) AS PPNI_Value
      FROM ${tableName}
      WHERE  
          (
              (@All_Time_NonStck IS NULL AND All_Time_NonStck IN ('Y', 'N')) 
              OR (@All_Time_NonStck IS NOT NULL AND All_Time_NonStck = @All_Time_NonStck)
          )
          AND
          (
              (@JobCardStatus IS NULL AND JobCardStatus IN ('OPEN', 'CLOSE')) 
              OR (@JobCardStatus IS NOT NULL AND JobCardStatus = @JobCardStatus)
          )
      GROUP BY 
          Location, 
          LocationId, 
          Advisor
      HAVING 
          SUM(ppni_val) > 0
      ORDER BY 
          PPNI_Value DESC;
    `;

    const result = await request.query(query);
    return result;
  } catch (error) {
    throw new Error(`locationwisePPNIValueService failed: ${error.message}`);
  }
};


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

const vehiclewisePPNIValueService = async (dealerid, locationid, jobcardstatus, nonstockable, advisor) => {
  try {
    const pool = await getPool2();

    const request = pool.request()
      .input('All_Time_NonStck', sql.VarChar(1), nonstockable)
      .input('JobCardStatus', sql.VarChar(10), jobcardstatus)
      .input('locationid', sql.Int, locationid)
      .input('advisor', sql.VarChar(100), advisor);

    const query = `
      USE [UAD_BI_PPNI];

      SELECT 
          Vehiclenumber,
          PartNumber, 
          PartDesc, 
          part_category, 
          price,
          Qty, 
          SUM(ppni_val) AS PPNI_Value,
          	CASE 
    WHEN stock_category = 'NS-NS' THEN 'NON-MOVING'
    WHEN stock_category IN ('S-NS', 'NS-S') THEN 'NON-STOCKABLE'
    WHEN stock_category = 'S-S' THEN 'STOCKABLE'
    ELSE 'UNKNOWN'
END AS Partnature
      FROM 
          PPNI_report_${dealerid}
      WHERE 
          (
              (@All_Time_NonStck IS NULL AND All_Time_NonStck IN ('Y', 'N')) 
              OR (@All_Time_NonStck IS NOT NULL AND All_Time_NonStck = @All_Time_NonStck)
          )
          AND
          (
              (@JobCardStatus IS NULL AND JobCardStatus IN ('OPEN', 'CLOSE')) 
              OR (@JobCardStatus IS NOT NULL AND JobCardStatus = @JobCardStatus)
          )
          AND locationid = @locationid
          AND advisor = @advisor
      GROUP BY 
          PartNumber, Vehiclenumber, PartDesc, part_category, price, Qty ,  stock_category
      HAVING 
          SUM(ppni_val) > 0
      ORDER BY 
          PPNI_Value DESC;
    `;

    const result = await request.query(query);
    return result;

  } catch (error) {
    throw new Error(`vehiclewisePPNIValueService failed: ${error.message}`);
  }
};


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

const PPNIVALUE12MonthsService = async (dealerid, locationid, nonstockable, jobcardstatus) => {
  try {
    const pool = await getPool2();
    const tableName = `PPNI_report_${dealerid}`;

    const query = `
      USE uad_bi_ppni;
      SELECT TOP 12
        location,
        CONCAT(MONTH(dateadded), '-', YEAR(dateadded)) AS Date,
        SUM(ppni_val) AS PPNI_val,
        ROUND(SUM( ppni_val)/ 100000.0, 2) as PPNI_Value
      FROM ${tableName}
      WHERE 
        locationid = @locationid AND 
        (@stkable IS NULL OR All_Time_NonStck = @stkable OR All_Time_NonStck IS NULL) AND 
        (@jobcard IS NULL OR JobCardStatus = @jobcard OR JobCardStatus IS NULL)
      GROUP BY 
        location,  YEAR(dateadded), MONTH(dateadded)
      ORDER BY 
       YEAR(dateadded) DESC, MONTH(dateadded) DESC;
    `;

    const result = await pool.request()
      .input('locationid', locationid)
      .input('stkable', nonstockable)
      .input('jobcard', jobcardstatus)
      .query(query);

    return result;
  } catch (error) {
    throw new Error(`PPNIVALUE12Months failed: ${error.message}`);
  }
};


const vehicleSearchService = async(dealerid,vehicleno,alltimenonstk,filter,issued)=>{
try {
        const pool = await getPool2()
    //     const query = `
    //     --DECLARE @StatusFilter VARCHAR(20) = @filter;
    //     --DECLARE @Alltime_nonstck VARCHAR(1) = @alltimenonstk;
    //     --DECLARE @VehicleNo VARCHAR(50) = @vehicleno;
    //     --DECLARE @issued VARCHAR(1) = @issued;
    
    //     SELECT DISTINCT
    //         co.jobcard_number,
    //         co.part_number1,
    //         pm.partdesc,
    //         co.Price,
    //         co.Qty,
    //         co.Stock AS StockQty,
    //         co.current_status,
    //         co.Price * co.Qty AS Value,
    //         pr.All_Time_NonStck 
    //     FROM Create_Order_Request_TD001_${dealerid} co
    //     JOIN LocationInfo li 
    //         ON li.LocationID = co.LocationID
    //     JOIN Part_Master pm 
    //         ON li.brandid = pm.brandid 
    //         AND pm.partnumber = co.Part_Number1
    //     LEFT JOIN CurrentStock1 cs1 
    //         ON co.LocationID = cs1.locationid
    //     LEFT JOIN CurrentStock2 cs2 
    //         ON cs2.StockCode = cs1.tCode  
    //         AND cs2.PartNumber = co.part_number1
    //     LEFT JOIN Stockable_Nonstockable_TD001_${dealerid} sn 
    //         ON sn.locationid = co.locationid 
    //         AND sn.partnumber1 = co.part_number
    //     LEFT JOIN [UAD_BI_PPNI].dbo.ppni_report_${dealerid} pr
    //        ON pr.Jobcard_Number = co.Jobcard_number
    //        AND pr.PartNumber = co.Part_Number1
    //     WHERE co.vehiclenumber = @VehicleNo
    //       AND (@StatusFilter IS NULL OR co.current_status = @StatusFilter)
    //       AND (@Alltime_nonstck IS NULL OR pr.All_Time_NonStck = @Alltime_nonstck)
    //       AND (
    //         @issued IS NULL OR
    //         (@issued = '0' AND co.JobLineCloseDate IS NULL) OR
    //         (@issued = '1' AND co.JobLineCloseDate IS NOT NULL)
    //       );
    //   `;
       const query = `
      SELECT DISTINCT
          co.jobcard_number,
          co.part_number1,
          pm.partdesc,
          pm.category,
          co.Price,
          co.Qty,
          co.Stock AS StockQty,
          co.current_status,
          co.Price * co.Qty AS Value,
          pr.All_Time_NonStck,
          Case when co.JobLineCloseDate IS NULL then 'Not Issued' Else 'Issued' End as IssueStatus
      FROM Create_Order_Request_TD001_${dealerid} co
      JOIN LocationInfo li 
          ON li.LocationID = co.LocationID
      JOIN Part_Master pm 
          ON li.brandid = pm.brandid 
          AND pm.partnumber = co.Part_Number1
      LEFT JOIN CurrentStock1 cs1 
          ON co.LocationID = cs1.locationid
      LEFT JOIN CurrentStock2 cs2 
          ON cs2.StockCode = cs1.tCode  
          AND cs2.PartNumber = co.part_number1
      LEFT JOIN Stockable_Nonstockable_TD001_${dealerid} sn 
          ON sn.locationid = co.locationid 
          AND sn.partnumber1 = co.part_number
      LEFT JOIN [UAD_BI_PPNI].dbo.ppni_report_${dealerid} pr
         ON pr.Jobcard_Number = co.Jobcard_number
         AND pr.PartNumber = co.Part_Number1
      WHERE co.vehiclenumber = @vehicleno
        AND (@filter IS NULL OR co.current_status = @filter)
        AND (@alltimenonstk IS NULL OR pr.All_Time_NonStck = @alltimenonstk)
        AND (
          @issued IS NULL OR
          (@issued = '0' AND co.JobLineCloseDate IS NULL) OR
          (@issued = '1' AND co.JobLineCloseDate IS NOT NULL)
        );
    `;
      const result = await pool.request()
        .input('vehicleno', vehicleno)
        .input('filter', filter)
        .input('alltimenonstk', alltimenonstk)
        .input('issued', issued)
        .query(query);
        
      return result;
} catch (error) {
    throw new Error(`vehiclesearchService failed: ${error.message}`);
    
}
}

const gainerListingService = async(dealerid , locationid , partnumber)=>{
try {
        const pool = await getPool2()
        // const query = `
        // select pm.partnumber1 , pm.partdesc , pm.Category , pm.mrp , pm.landedcost ,CONCAT(unm.DISCOUNT,'%')as Discount  from SH_UPLOADNONMOVINGPART unm 
        // join locationinfo li on li.locationid = unm.locationid
        // join part_master pm on li.brandid = pm.brandid and pm.partnumber = unm.partnumber
        // where unm.locationid = ${locationid} and unm.partnumber = '${partnumber}'
        // `
        const query = `use z_scope EXEC GainerListingSinglePart '${dealerid}', '${partnumber}', ${locationid};`

        const result = await pool.request().query(query)
        return result.recordset
} catch (error) {
    throw new Error(`gainerListingService failed : ${error.message}`);
    
}
}
export {PPNIVALUE12MonthsService,userroleService,partDescwithStockandQuality,reservedForVehicle,groupStock,jobCardByVehicleService,partsByJobCardService,partSubstituteDetailService,locationwisePPNIValueService,advisorwisePPNIValueService,vehiclewisePPNIValueService,partwisePPNIValueService,vehicleSearchService,gainerListingService}