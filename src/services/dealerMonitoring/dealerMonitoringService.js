import { getPool1,getPool2 } from "../../db/db.js";
import sql from 'mssql'
const partInfo = async (brandid,partnumber)=>{
 try {
       const pool = await getPool2()
       const query = `
        use [z_scope]
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
        pm.mrp
    FROM z_scope..part_master pm
    LEFT JOIN z_scope..substitution_master sm 
        ON pm.brandid = sm.brandid and pm.partnumber1 = sm.partnumber1
    WHERE pm.partnumber1 IN ('${partnumber}')
      AND pm.brandid = ${brandid} `
  //  console.log(query);
   
   const result = await pool.request().query(query)
//    console.log(result);
   
   return result
 } catch (error) {
    throw new Error(`partInfo failed: ${error.message}`)
 }
}

const reservedForVehicle = async (dealerid,partnumber)=>{
try {
        const pool = await getPool2()
        // const query = ` use z_scope
        // select count(Part_Number1)as ReservedforVehicle from Create_Order_Request_TD001_${dealerid}
        // where Part_Number1 = '${partnumber}' and Final_Close = 'N'
        // group by Part_Number1`

        const query = `
        use z_scope
        select 
        CASE WHEN cs2.qty < SUM(co.qty)  then cs2.Qty else SUM(co.qty)  end as ReservedforVehicle 
        from Create_Order_Request_TD001_${dealerid} co
        join currentstock1 cs1 on cs1.locationid = co.LocationID
        join CurrentStock2 cs2 on cs2.StockCode = cs1.tCode and cs2.PartNumber = co.Part_Number1
        where Part_Number1 = '${partnumber}' and Dateadded >  DATEADD(day, -60 , GETDATE()) 
        and cs2.Qty > 0 and Current_status <> 'Close'
        group by co.Qty , cs2.Qty
        `
        // console.log(query);
        const result = await pool.request().query(query)
        return result
} catch (error) {
    throw new Error(`reservedForVehicle failed: ${error.message}`)
}
}

const groupStock = async (brandid,dealerid,locationid,partnumber)=>{
try {
        const pool = await getPool2()
        const query = `
         DECLARE 
        @InputPart VARCHAR(40) = '${partnumber}',
        @InputBrandID INT = ${brandid},
        @InputLocationID INT = ${locationid},
        @InputDealerid int = ${dealerid},
        @RowsInserted INT;

        declare @latestpart varchar(20) 
        select @latestpart = subpartnumber1 from Substitution_Master 
        where brandid = @InputBrandID and (partnumber1 = @InputPart or subpartnumber1 = @InputPart)

        ;with part as (
        select partnumber1 from substitution_master where brandid = @InputBrandID and subpartnumber1= @latestpart
        union 
        select ISNULL(@latestpart,@InputPart) 
        ),
        loc as (
        select locationid , Location from LocationInfo where DealerID  = @InputDealerid
        )select cs1.LocationID ,l.location ,cs1.Stockdate,SUM(Qty)GroupStock from CurrentStock1 cs1
        join loc l on l.LocationID = cs1.LocationID
        join CurrentStock2 cs2 on cs2.StockCode = cs1.tCode
        join part p on p.partnumber1 = cs2.PartNumber
        group by cs1.locationid , l.location ,cs1.Stockdate

        -- Drop temp table if exists
        IF OBJECT_ID('tempdb..#PartFamily','U') IS NOT NULL
            DROP TABLE #PartFamily;

        -- Create PartFamily temp table
        CREATE TABLE #PartFamily (
            Part VARCHAR(40),
            BrandID INT
        );

        -- Seed with input part
        INSERT INTO #PartFamily (Part, BrandID)
        VALUES (@InputPart, @InputBrandID);

        -- Expand the part family
        SET @RowsInserted = 1;
        WHILE @RowsInserted > 0
        BEGIN
            INSERT INTO #PartFamily (Part, BrandID)
            SELECT DISTINCT sm.SubPartNumber1, sm.BrandID
            FROM Substitution_Master sm
            JOIN #PartFamily f ON sm.PartNumber1 = f.Part AND sm.BrandID = f.BrandID
            WHERE NOT EXISTS (
                SELECT 1 FROM #PartFamily x WHERE x.Part = sm.SubPartNumber1 AND x.BrandID = sm.BrandID
            )
            UNION
            SELECT DISTINCT sm.PartNumber1, sm.BrandID
            FROM Substitution_Master sm
            JOIN #PartFamily f ON sm.SubPartNumber1 = f.Part AND sm.BrandID = f.BrandID
            WHERE NOT EXISTS (
                SELECT 1 FROM #PartFamily x WHERE x.Part = sm.PartNumber1 AND x.BrandID = sm.BrandID
            );

            SET @RowsInserted = @@ROWCOUNT;
        END;
    select * from #PartFamily


--;WITH sub AS (
--  SELECT LocationID, Location
--  FROM   LocationInfo
--  WHERE  DealerID = (
--           SELECT DealerID
--           FROM   LocationInfo
--           WHERE  LocationID = @InputLocationID
--         )
--    AND  OgsStatus = 1
--)
--SELECT
--  dl.Location,
--  dl.LocationID,
--
--  -- 1) Total stock across all parts
--  ISNULL(SUM(cs2.Qty), 0) AS Stock,  
--  cs1.Stockdate
--
--FROM #PartFamily pf
--  JOIN LocationInfo li
--    ON li.BrandID = pf.BrandID
--  JOIN sub dl
--    ON dl.LocationID = li.LocationID
--
--  OUTER APPLY (
--    SELECT TOP 1 cs1.tCode , cs1.StockDate
--    FROM   CurrentStock1 AS cs1
--    WHERE  cs1.LocationID = dl.LocationID
--    ORDER  BY cs1.StockDate DESC
--  ) AS cs1
--
--  LEFT JOIN CurrentStock2 AS cs2
--    ON cs2.StockCode   = cs1.tCode
--   AND cs2.PartNumber  = pf.Part
--GROUP BY
--  dl.Location,
--  dl.LocationID , 
--  cs1.StockDate
--Having sum(cs2.qty) > 0
--ORDER BY
--  dl.LocationID;

  ;WITH sub AS (
    SELECT
      loc.LocationID,
      loc.Location
    FROM LocationInfo loc
    WHERE loc.DealerID = (
            SELECT DealerID
            FROM   LocationInfo
            WHERE  LocationID = @InputLocationID
          )
      AND loc.OgsStatus = 1
)
select 
l.location , l.locationid ,
    CASE
      WHEN SUM(l.MaxValue) > 0  THEN 'Stockable'
      WHEN SUM(CASE WHEN l.greenflag = 'Y'OR l.yellowflag = 'Y'OR l.RedFlag   = 'Y'OR l.FlagType IN ('R','G','Y')THEN 1 ELSE 0 END) > 0THEN 'Non-Moving'
      WHEN SUM(l.MaxValue) = 0 THEN 'Non-Stockable'
      ELSE '' END AS PartStatus
from 
(
select li.Location , li.LocationID , pf.Part ,sn.stockdate,
case when pf.Part = sm.partnumber1 then sm.subpartnumber1 else pf.Part end as latest,
ISNULL(sn.Maxvalue,0) Maxvalue , os.greenflag , os.yellowflag ,su.RedFlag, ep.flagtype
from #PartFamily pf
join LocationInfo li on pf.BrandID = li.BrandID
join sub dl on dl.LocationID = li.LocationID
outer apply (
select top 1* from 
Exceptional_Part_History where LocationId = dl.LocationID and PartNumber = pf.Part
order by bigId desc
)ep
left join Substitution_Master sm 
on pf.BrandID = sm.brandid and pf.Part = sm.partnumber1
--left join Stockable_Nonstockable_TD001_${dealerid} sn
--on sn.Locationid = li.LocationID and sn.partnumber1 = pf.Part and sn.Stockdate = (select MAX(stockdate) from Stockable_Nonstockable_TD001_${dealerid} where locationid = li.Locationid)
outer apply(
select top 1 * from 
Stockable_Nonstockable_TD001_${dealerid} where Locationid = li.LocationID and partnumber1 = pf.Part and Stockdate = (select MAX(stockdate) from Stockable_Nonstockable_TD001_${dealerid} where Locationid = li.LocationID)
)sn
left join Opening_Stock_Upload_TD001_${dealerid} os
on os.Locationid = li.LocationID and os.partnumber1 = pf.Part 
left join Stock_Upload_SPM_TD001_${dealerid} su
on su.Locationid = li.LocationID and su.partnumber1 = pf.Part and su.Partnumber not in (ep.PartNumber) and su.RedFlag = 'Y' and RedDate is not null --and sn.Stockdate = (select MAX(stockdate) from Stock_Upload_SPM_TD001_${dealerid})
)l
group by l.location , l.LocationID
        `
        const result = await pool.request().query(query)
        return result
} catch (error) {
    throw new Error(`groupStock failed: ${error.message}`)
}
}

const groupNorms = async(brandid,dealerid,locationid,partnumber)=>{
try {
    const pool = await getPool2()
    const query = ` use z_scope
    DECLARE 
              @InputPart VARCHAR(40) =  '${partnumber}',
              @InputBrandID INT = ${brandid},
              @InputLocationID INT = ${locationid},
              @RowsInserted INT;
  
          -- Drop temp table if exists
          IF OBJECT_ID('tempdb..#PartFamily','U') IS NOT NULL
              DROP TABLE #PartFamily;
  
          -- Create PartFamily temp table
          CREATE TABLE #PartFamily (
              Part VARCHAR(40),
              BrandID INT
          );
  
          -- Seed with input part
          INSERT INTO #PartFamily (Part, BrandID)
          VALUES (@InputPart, @InputBrandID);
  
          -- Expand the part family
          SET @RowsInserted = 1;
          WHILE @RowsInserted > 0
          BEGIN
              INSERT INTO #PartFamily (Part, BrandID)
              SELECT DISTINCT sm.SubPartNumber1, sm.BrandID
              FROM Substitution_Master sm
              JOIN #PartFamily f ON sm.PartNumber1 = f.Part AND sm.BrandID = f.BrandID
              WHERE NOT EXISTS (
                  SELECT 1 FROM #PartFamily x WHERE x.Part = sm.SubPartNumber1 AND x.BrandID = sm.BrandID
              )
              UNION
              SELECT DISTINCT sm.PartNumber1, sm.BrandID
              FROM Substitution_Master sm
              JOIN #PartFamily f ON sm.SubPartNumber1 = f.Part AND sm.BrandID = f.BrandID
              WHERE NOT EXISTS (
                  SELECT 1 FROM #PartFamily x WHERE x.Part = sm.PartNumber1 AND x.BrandID = sm.BrandID
              );
  
              SET @RowsInserted = @@ROWCOUNT;
          END;
          --select * from #PartFamily
          -- Location list for given input location's dealer
          ;WITH sub AS (
              SELECT LocationID, Location
              FROM LocationInfo
              WHERE DealerID = (SELECT DealerID FROM LocationInfo WHERE LocationID = @InputLocationID)
                AND OgsStatus = 1
          )
  		select sub.Location , sub.LocationID , isnull(sn.Maxvalue,0)as Max , isnull(sn.partnumber1,'N/A')as Partnumber from z_scope..Stockable_Nonstockable_TD001_${dealerid} sn
  		join #PartFamily pf on pf.Part = sn.partnumber1 
  	 join sub on sn.Locationid = sub.locationid and sn.Stockdate = (select MAX(stockdate) from stockable_nonstockable_td001_${dealerid})
    `
    const result = await pool.request().query(query)
    return result
} catch (error) {
   throw new Error(`groupNorms failed : ${error.message}`);
   
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

const partSubstituteDetailService = async(brandid,dealerid,locationid,partnumber)=>{
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
    ISNULL(cs2.Qty, 0) AS Qty
FROM #PartFamily pf
LEFT JOIN Part_Master pm 
    ON pm.PartNumber1 = pf.Part AND pm.BrandID = pf.BrandID 
JOIN CurrentStock1 cs1 
    ON cs1.LocationID = ${locationid}
LEFT JOIN CurrentStock2 cs2 
    ON cs2.PartNumber = pf.Part AND cs1.tCode = cs2.StockCode
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
        const pool = await getPool2()
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

const locationwisePPNIValueService = async (dealerid, jobcardstatus, nonstockable,month) => {
  try {
    if (!dealerid) throw new Error("dealerid is required");

    const pool = await getPool2();

    const request = pool.request()
      .input('All_Time_NonStck', sql.VarChar, nonstockable || null)
      .input('JobCardStatus', sql.VarChar, jobcardstatus || null);

    const tableName = `ppni_report_${dealerid}`;

//     const query = `
//             USE [UAD_BI_PPNI];
// DECLARE @d VARCHAR(10) = '${month}';

// -- Parse to first day of month (as date)
// DECLARE @firstDate DATE = TRY_CONVERT(DATE, '01-' + @d, 105);

// -- Get last day using EOMONTH
// DECLARE @lastDate DATE = EOMONTH(@firstDate);

//       SELECT 
//           Location, 
//           LocationId, 
//           Advisor,
//           SUM(ppni_val) AS PPNI_Value
//       FROM ${tableName}
//       WHERE  
//           (
//               (@All_Time_NonStck IS NULL AND All_Time_NonStck IN ('Y', 'N')) 
//               OR (@All_Time_NonStck IS NOT NULL AND All_Time_NonStck = @All_Time_NonStck)
//           )
//           AND
//           (
//               (@JobCardStatus IS NULL AND JobCardStatus IN ('OPEN', 'CLOSE')) 
//               OR (@JobCardStatus IS NOT NULL AND JobCardStatus = @JobCardStatus)
//           )
// 		    AND (
//           @firstDate IS NULL OR 
//           (dateadded >= @firstDate AND dateadded <= @lastDate)
//           )
//       GROUP BY 
//           Location, 
//           LocationId, 
//           Advisor
//       HAVING 
//           SUM(ppni_val) > 0
//       ORDER BY 
//           PPNI_Value DESC;
//     `;
const query = `
 USE [UAD_BI_PPNI];
DECLARE @d VARCHAR(10) = '${month}';

-- Parse to first day of month (as date)
DECLARE @firstDate DATE = TRY_CONVERT(DATE, '01-' + @d, 105);

-- Get last day using EOMONTH
DECLARE @lastDate DATE = EOMONTH(@firstDate);

      SELECT 
          p.Location, 
          p.LocationId, 
          Advisor,
          SUM(ppni_val) AS PPNI_Value
      FROM ${tableName} p
	  left join z_scope..Create_Order_Request_TD001_${dealerid} co on co.Vehiclenumber = p.Vehiclenumber and co.Part_Number1 = p.PartNumber 
	  join z_scope..currentstock1 cs1 on cs1.locationid = p.Locationid
	  join z_scope..currentstock2 cs2 on cs2.StockCode = cs1.tCode and cs2.PartNumber = p.PartNumber
      WHERE  
	  	co.JobLineCloseDate is null and
	  cs2.Qty != 0  
	  and 
          (
              (@All_Time_NonStck IS NULL AND All_Time_NonStck IN ('Y', 'N')) 
              OR (@All_Time_NonStck IS NOT NULL AND All_Time_NonStck = @All_Time_NonStck)
          )
          AND
          (
              (@JobCardStatus IS NULL AND JobCardStatus IN ('OPEN', 'CLOSE')) 
              OR (@JobCardStatus IS NOT NULL AND JobCardStatus = @JobCardStatus)
          )
		    AND (
          @firstDate IS NULL OR 
          (p.dateadded >= @firstDate AND p.dateadded <= @lastDate)
          )
      GROUP BY 
          p.Location, 
          p.LocationId, 
          Advisor 
      HAVING 
          SUM(ppni_val) > 0
      ORDER BY 
          PPNI_Value DESC;
`
    const result = await request.query(query);
    return result;
  } catch (error) {
    throw new Error(`locationwisePPNIValueService failed: ${error.message}`);
  }
};


const advisorwisePPNIValueService = async (dealerid, locationid, jobcardstatus, nonstockable,month) => {
  try {
    const pool = await getPool2();

    const request = pool.request()
      .input('All_Time_NonStck', sql.VarChar(1), nonstockable)
      .input('JobCardStatus', sql.VarChar(10), jobcardstatus);

const query = `
      USE [UAD_BI_PPNI];
      DECLARE @d VARCHAR(10) = '${month}';

-- Parse to first day of month (as date)
DECLARE @firstDate DATE = TRY_CONVERT(DATE, '01-' + @d, 105);

-- Get last day using EOMONTH
DECLARE @lastDate DATE = EOMONTH(@firstDate);

      SELECT Advisor, SUM(ppni_val) AS PPNI_Value 
      FROM PPNI_report_${dealerid} p
	  left join z_scope..Create_Order_Request_TD001_${dealerid} co on co.Vehiclenumber = p.Vehiclenumber and co.Part_Number1 = p.PartNumber 
	  join z_scope..currentstock1 cs1 on cs1.locationid = p.Locationid
	  join z_scope..currentstock2 cs2 on cs2.StockCode = cs1.tCode and cs2.PartNumber = p.PartNumber
	  WHERE 
	 co.JobLineCloseDate is null and
	  cs2.Qty != 0
and
  (@All_Time_NonStck IS NULL OR All_Time_NonStck = @All_Time_NonStck)
	AND
	  (
			(@JobCardStatus IS NULL AND JobCardStatus IN ('OPEN','CLOSE'))
			OR
			(@JobCardStatus IS NOT NULL AND JobCardStatus = @JobCardStatus)
	  )
   AND (
           @firstDate IS NULL OR 
          (p.dateadded >=  @firstDate AND p.dateadded <= @lastDate)
          )
  AND p.locationid =@LocationID
      GROUP BY Advisor 
      HAVING SUM(ppni_val) > 0
      ORDER BY PPNI_Value DESC;
`
    request.input('LocationID', sql.Int, locationid);

    const result = await request.query(query);
    return result;
  } catch (error) {
    throw new Error(`advisorwisePPNIValueService failed: ${error.message}`);
  }
};


const vehiclewisePPNIValueService = async (dealerid, locationid, jobcardstatus, nonstockable, advisor , month, pageno, pagesize) => {
  try {
    const pool = await getPool2();
    const request = pool.request()
    //   .input('All_Time_NonStck', sql.VarChar, nonstockable)
    //   .input('JobCardStatus', sql.VarChar, jobcardstatus)
    //   .input('locationid', sql.Int, locationid)
    //   .input('advisor', sql.VarChar, advisor);

// const query = `

// DECLARE @d VARCHAR(10) = '${month}';
// Declare @pagesize int = ${pagesize}, @pageno int = ${pageno} ;
// DECLARE @offset INT = (@pageno - 1) * @pagesize;
// DECLARE @firstDate DATE = TRY_CONVERT(DATE, '01-' + @d, 105);
// DECLARE @lastDate DATE = EOMONTH(@firstDate);


// select count(ppni.Vehiclenumber) over() as TotalCount ,ppni.Vehiclenumber , SUM(PPNI_Val)PPNI_Value  , b.NotIssued , a.InstockCount from UAD_BI_PPNI..PPNI_report_${dealerid} ppni
// 	  outer apply(
// 			 SELECT
// 			ISNULL(SUM(CASE WHEN cs2.PartNumber IS NOT NULL THEN 1 ELSE 0 END),0)    
// 			  AS InStockCount
// 		  FROM z_scope..Create_Order_Request_TD001_${dealerid} AS co
// 		  JOIN z_scope..CurrentStock1 AS cs1
// 			ON cs1.LocationID = co.LocationID
// 		  LEFT JOIN z_scope..CurrentStock2 AS cs2
// 			ON cs2.StockCode   = cs1.tCode
// 		   AND cs2.PartNumber = co.Part_Number	
// 		  WHERE
// 			co.vehiclenumber     = ppni.VehicleNumber
// 			AND co.JobLineCloseDate IS NULL
// 			  )as a
// 			   outer apply (
// 			 SELECT
// 			COUNT(Part_Number1)as NotIssued
// 		  FROM z_scope..create_order_request_td001_${dealerid} AS co
// 		  WHERE
// 			co.vehiclenumber     =  ppni.Vehiclenumber
// 			AND co.JobLineCloseDate IS NULL
// 			  )as b
//      left join z_scope..Create_Order_Request_TD001_${dealerid} co on co.Vehiclenumber = ppni.Vehiclenumber and co.Part_Number1 = ppni.PartNumber 
// 	  left join z_scope..currentstock1 cs1 on cs1.locationid = ppni.Locationid
// 		LEFT  join z_scope..currentstock2 cs2 on cs2.StockCode = cs1.tCode and cs2.PartNumber = ppni.PartNumber
// where ppni.Locationid = @locationid
// AND
// 	 co.JobLineCloseDate is null and
// 		  cs2.Qty > 0
//    AND (
//        @All_Time_NonStck IS NULL
//        OR ppni.All_Time_NonStck = @All_Time_NonStck
//    )
// AND
//  (
//         (@JobCardStatus IS NULL AND ppni.JobCardStatus IN ('OPEN','CLOSE'))
//         OR
//         (@JobCardStatus IS NOT NULL AND ppni.JobCardStatus = @JobCardStatus)
//   )
//     AND (
//         @firstDate IS NULL
//         OR (ppni.DateAdded >= @firstDate AND ppni.DateAdded <= @lastDate)
//     )
//     AND (
//         @advisor IS NULL
//         OR ppni.Advisor = @advisor
//     )
//         group by ppni.Vehiclenumber   , b.NotIssued , a.InstockCount
// 		  HAVING 
// 			  SUM(ppni_val) > 0
// 			  order by PPNI_Value desc
// 			  offset  @offset rows
// 			  fetch next @pagesize Rows only;
//     `
  // Prepare SQL-safe variable strings
    const advisorSQL =
      advisor === null || advisor === undefined
        ? "NULL"
        : `'${advisor}'`;
    const jobcardstatusSQL =
      jobcardstatus === null || jobcardstatus === undefined
        ? "NULL"
        : `'${jobcardstatus}'`;
    const nonstockableSQL =
      nonstockable === null || nonstockable === undefined
        ? "NULL"
        : `'${nonstockable}'`;

        // console.log(advisorSQL, jobcardstatusSQL , nonstockableSQL);
        
const query = `
DECLARE @d VARCHAR(10) = '${month}';
Declare @pagesize int = ${pagesize}, @pageno int = ${pageno} ;
DECLARE @offset INT = (@pageno - 1) * @pagesize;
DECLARE @firstDate DATE = TRY_CONVERT(DATE, '01-' + @d, 105);
DECLARE @lastDate DATE = EOMONTH(@firstDate);
declare @advisor varchar(50) = ${advisorSQL} ;
declare @JobCardStatus varchar(50) = ${jobcardstatusSQL};
declare @All_Time_NonStck varchar(50) = ${nonstockableSQL};


select count(ppni.Vehiclenumber) over() as TotalCount ,ppni.DealerId,ppni.LocationId,ppni.Vehiclenumber , SUM(PPNI_Val)PPNI_Value  , b.NotIssued , a.InstockCount 
from UAD_BI_PPNI..PPNI_report_${dealerid} ppni
	  outer apply(
			 SELECT
			ISNULL(SUM(CASE WHEN cs2.PartNumber IS NOT NULL THEN 1 ELSE 0 END),0)    
			  AS InStockCount
		  FROM z_scope..Create_Order_Request_TD001_${dealerid}  AS co
		  JOIN z_scope..CurrentStock1 AS cs1
			ON cs1.LocationID = co.LocationID
		  LEFT JOIN z_scope..CurrentStock2 AS cs2
			ON cs2.StockCode   = cs1.tCode
		   AND cs2.PartNumber = co.Part_Number	
		  WHERE
			co.vehiclenumber     = ppni.VehicleNumber
			AND co.JobLineCloseDate IS NULL
			  )as a
			   outer apply (
			 SELECT
			COUNT(Part_Number1)as NotIssued
		  FROM z_scope..create_order_request_td001_${dealerid}  AS co
		  WHERE
			co.vehiclenumber     =  ppni.Vehiclenumber
			AND co.JobLineCloseDate IS NULL
			  )as b
	 left join z_scope..Create_Order_Request_TD001_${dealerid}  co on co.Vehiclenumber = ppni.Vehiclenumber and co.Part_Number1 = ppni.PartNumber 
	  left join z_scope..currentstock1 cs1 on cs1.locationid = ppni.Locationid
		 LEFT  join z_scope..currentstock2 cs2 on cs2.StockCode = cs1.tCode and cs2.PartNumber = ppni.PartNumber
where ppni.Locationid = ${locationid}
AND
	 co.JobLineCloseDate is null and
		  cs2.Qty != 0
   AND (
       @All_Time_NonStck IS NULL
       OR ppni.All_Time_NonStck = @All_Time_NonStck
   )
AND
 (
        (@JobCardStatus IS NULL AND ppni.JobCardStatus IN ('OPEN','CLOSE'))
        OR
        (@JobCardStatus IS NOT NULL AND ppni.JobCardStatus = @JobCardStatus)
  )
    AND (
        @firstDate IS NULL
        OR (ppni.DateAdded >= @firstDate AND ppni.DateAdded <= @lastDate)
    )
    AND (
        @advisor IS NULL
        OR ppni.Advisor = @advisor
    )
        group by ppni.Vehiclenumber   , b.NotIssued , a.InstockCount ,ppni.Dealerid,ppni.LocationId
		  HAVING 
			  SUM(ppni_val) > 0
			  order by PPNI_Value desc
			  offset  @offset rows
			  fetch next @pagesize Rows only;
`
    const result = await request.query(query);
    // console.log(result);
    
    return result;
}

 catch (error) {
    throw new Error(`vehiclewisePPNIValueService failed: ${error.message}`);
  }
};


  const partwisePPNIValueService = async(dealerid,locationid,jobcardstatus , nonstockable , advisor , vehicleno , month)=>{
  try {
          const pool = await getPool2()

  // const query = ` 
  //  DECLARE @d VARCHAR(10) = '${month}';
  // DECLARE @firstDate DATE = TRY_CONVERT(DATE, '01-' + @d, 105);

  // DECLARE @lastDate DATE = EOMONTH(@firstDate);
  // use z_scope 
  // 	;with data as(
  // 	select  latest , isnull(sum(qty),0)StockQty from (
  // 	select cs2.PartNumber , 
  // 	CASE WHEN cs2.PartNumber = sm.partnumber1 then sm.subpartnumber1 else cs2.PartNumber end as LAtest,
  // 	QTY  from z_scope..CurrentStock2 cs2
  // 	join z_scope..CurrentStock1 cs1 on cs1.tCode = cs2.StockCode
  // 	join z_scope..LocationInfo li on li.LocationID = cs1.LocationID
  // 	left join z_scope..substitution_master sm on sm.brandid = li.BrandID and sm.partnumber1 = cs2.PartNumber
  // 	where cs1.LocationID = ${locationid} and Qty > 0)a
  // 	group by latest
  // 	),
  // data2 as (
  // select 
  // ppni.Vehiclenumber,
  // 			  ppni.PartNumber, 
  // 			  CASE WHEN ppni.PartNumber = sm.partnumber1 then sm.subpartnumber1 else ppni.PartNumber end as Latest,
  // 			  ppni.PartDesc, 
  // 			  part_category, 
  // 			  ppni.price,
  // 			  ppni.PPNI_Val,
  // 			  ppni.Qty as DemandedQty,
  // 			  All_Time_NonStck
  // 		  FROM 
  // 			  UAD_BI_PPNI..PPNI_report_${dealerid} ppni
  // 			left join z_scope..Create_Order_Request_TD001_${dealerid} co on co.vehiclenumber = ppni.vehiclenumber and co.part_number1 = ppni.partnumber
  //    			  left join z_scope..substitution_master sm on sm.Brandid = ppni.brandid and ppni.partnumber = sm.partnumber1
  // 		  WHERE 
  // 		   co.joblineclosedate is  null 
  // 		   and ppni.Vehiclenumber = '${vehicleno}'
  // 		   and
  // 			  (
  // 				  (@All_Time_NonStck IS NULL AND All_Time_NonStck IN ('Y', 'N')) 
  // 				  OR (@All_Time_NonStck IS NOT NULL AND All_Time_NonStck = @All_Time_NonStck)
  // 			  )
  // 			  AND
  // 			  (
  // 				  (@JobCardStatus IS NULL AND JobCardStatus IN ('OPEN', 'CLOSE')) 
  // 				  OR (@JobCardStatus IS NOT NULL AND JobCardStatus = @JobCardStatus)
  // 			  )
  // 			  AND (
  // 			  @firstDate IS NULL OR 
  // 			  (ppni.dateadded >= @firstDate AND ppni.dateadded <= @lastDate)
  // 			  )
  // 			  AND ppni.locationid = ${locationid}
  // 		  GROUP BY 
  // 			  ppni.PartNumber, ppni.Vehiclenumber, ppni.PartDesc, part_category, ppni.price, ppni.Qty , All_Time_NonStck , sm.partnumber1 , sm.subpartnumber1  , ppni.PPNI_Val
  // 		  HAVING 
  // 			  SUM(ppni_val) > 0
  // )
  // select Data2.*,isnull(data.StockQty,0)as StockQty  
  // 	from data2
  // 	left  join data on data.latest = data2.Latest
  // 	order by data2.ppni_val desc
  //   `
      const advisorSQL =
        advisor === null || advisor === undefined
          ? "NULL"
          : `'${advisor}'`;
      const jobcardstatusSQL =
        jobcardstatus === null || jobcardstatus === undefined
          ? "NULL"
          : `'${jobcardstatus}'`;
      const nonstockableSQL =
        nonstockable === null || nonstockable === undefined
          ? "NULL"
          : `'${nonstockable}'`;

  // console.log(dealerid,locationid,advisorSQL,jobcardstatusSQL,nonstockableSQL,month);

  const query = `
      DECLARE @d VARCHAR(10) = '${month}';
  DECLARE @firstDate DATE = TRY_CONVERT(DATE, '01-' + @d, 105);
  declare @advisor varchar(50) = ${advisorSQL} ;
  declare @JobCardStatus varchar(50) = ${jobcardstatusSQL};
  declare @All_Time_NonStck varchar(50) = ${nonstockableSQL};
  DECLARE @lastDate DATE = EOMONTH(@firstDate);

  use z_scope 
    ;with data as(
    select  latest , isnull(sum(qty),0)StockQty from (
    select cs2.PartNumber , 
    CASE WHEN cs2.PartNumber = sm.partnumber1 then sm.subpartnumber1 else cs2.PartNumber end as LAtest,
    QTY  from z_scope..CurrentStock2 cs2
    join z_scope..CurrentStock1 cs1 on cs1.tCode = cs2.StockCode
    join z_scope..LocationInfo li on li.LocationID = cs1.LocationID
    left join z_scope..substitution_master sm on sm.brandid = li.BrandID and sm.partnumber1 = cs2.PartNumber
    where cs1.LocationID = @locationid and Qty > 0)a
    group by latest
    ),
  data2 as (
  select 
  co.bigid,
  co.DealerId,
  co.LocationId,
  ppni.Vehiclenumber,
          ppni.PartNumber, 
          CASE WHEN ppni.PartNumber = sm.partnumber1 then sm.subpartnumber1 else ppni.PartNumber end as Latest,
          ppni.PartDesc, 
          part_category, 
          ppni.price,
          ppni.PPNI_Val,
          ppni.Qty as DemandedQty,
          All_Time_NonStck
        FROM 
        UAD_BI_PPNI..PPNI_report_${dealerid} ppni
        left join z_scope..Create_Order_Request_TD001_${dealerid} co on co.vehiclenumber = ppni.vehiclenumber and co.part_number1 = ppni.partnumber
          left join z_scope..substitution_master sm on sm.Brandid = ppni.brandid and ppni.partnumber = sm.partnumber1
        left join z_scope..currentstock1 cs1 on cs1.locationid = ppni.Locationid
        LEFT  join z_scope..currentstock2 cs2 on cs2.StockCode = cs1.tCode and cs2.PartNumber = ppni.PartNumber
        WHERE 
        co.joblineclosedate is  null 
          and	  cs2.Qty != 0
        and ppni.Vehiclenumber = '${vehicleno}'
        and
          (
            (@All_Time_NonStck IS NULL AND All_Time_NonStck IN ('Y', 'N')) 
            OR (@All_Time_NonStck IS NOT NULL AND All_Time_NonStck = @All_Time_NonStck)
          )
          AND
          (
            (@JobCardStatus IS NULL AND JobCardStatus IN ('OPEN', 'CLOSE')) 
            OR (@JobCardStatus IS NOT NULL AND JobCardStatus = @JobCardStatus)
          )
          AND (
          @firstDate IS NULL OR 
          (ppni.dateadded >= @firstDate AND ppni.dateadded <= @lastDate)
          )
          AND ppni.locationid = @locationid
        GROUP BY 
            co.bigid,  co.DealerId,co.LocationId,ppni.PartNumber, ppni.Vehiclenumber, ppni.PartDesc, part_category, ppni.price, ppni.Qty , All_Time_NonStck , sm.partnumber1 , sm.subpartnumber1  , ppni.PPNI_Val
        HAVING 
          SUM(ppni_val) > 0
  )
  select Data2.*,isnull(data.StockQty,0)as StockQty  
    from data2
    left  join data on data.latest = data2.Latest
    order by data2.ppni_val desc
  `
          const result = await pool.request()
          .input('locationid', sql.Int, locationid)
          .query(query)
  // console.log(result);

          return result
  } catch (error) {
      throw new Error(`partwisePPNIValueService failed: ${error.message}`);
  }
  }

const PPNIVALUE12MonthsService = async (dealerid, locationid, nonstockable, jobcardstatus , advisior) => {
  try {
    const pool = await getPool2();
    const tableName = `PPNI_report_${dealerid}`;

    const query = `
USE UAD_BI_PPNI;

SELECT TOP 12
  location,
  CONCAT(MONTH(dateadded), '-', YEAR(dateadded)) AS [Date],
  SUM(ppni_val) AS PPNI_val,
  ROUND(SUM(ppni_val) / 100000.0, 2) AS PPNI_Value
FROM PPNI_report_${dealerid}
WHERE 
  locationid = @locationid
  AND (@stkable IS NULL OR All_Time_NonStck = @stkable)
  AND (@jobcard IS NULL OR JobCardStatus = @jobcard)
  AND (@advisor IS NULL OR Advisor = @advisor)
GROUP BY 
  location, YEAR(dateadded), MONTH(dateadded)
ORDER BY 
  YEAR(dateadded) DESC, MONTH(dateadded) DESC;
    `;

    const result = await pool.request()
      .input('locationid', locationid)
      .input('stkable', nonstockable)
      .input('jobcard', jobcardstatus)
      .input('advisor', advisior)
      .query(query);

    return result;
  } catch (error) {
    throw new Error(`PPNIVALUE12Months failed: ${error.message}`);
  }
};


const vehicleSearchService = async(dealerid,locationid,vehicleno,alltimenonstk,filter,issued,pageno,pagesize)=>{
try {
        const pool = await getPool2()
//  const query  = `
//   use z_scope 
// 	;with data as(
// 	select  latest , sum(ISNULL(Qty,0))StockQty from (
// 	select cs2.PartNumber , 
// 	CASE WHEN cs2.PartNumber = sm.partnumber1 then sm.subpartnumber1 else cs2.PartNumber end as LAtest,
// 	isnull(QTY,0) as QTY from CurrentStock2 cs2
// 	join CurrentStock1 cs1 on cs1.tCode = cs2.StockCode
// 	join LocationInfo li on li.LocationID = cs1.LocationID
// 	left join substitution_master sm on sm.brandid = li.BrandID and sm.partnumber1 = cs2.PartNumber
// 	where cs1.LocationID = ${locationid}) a
// 	group by latest
// 	),
// 	data2 as(
//       SELECT DISTINCT
//           co.jobcard_number,
//           co.part_number1,
// 		  CASE WHEN co.Part_Number1 = sm.partnumber1 then sm.subpartnumber1 else co.Part_Number1 end as Latest,
//           pm.partdesc,
//           pm.category,
//           co.Price,
//           --isnull(cs2.Qty,0) AS StockQty,
//           --co.current_status,
//           --co.Final_close,
		  
//           co.qty as Qty,
//           Case when co.Final_close = 'N' then 'Open' else 'Close' END as Final_close,
//           co.Price * co.Qty AS Value,co.Dateadded as OrderDate,
//           pr.All_Time_NonStck,
//           pr.PPNI_Val/pr.price as PPNI_Qty,
//           Case when co.JobLineCloseDate IS NULL then 'Not Issued' Else 'Issued' End as IssueStatus
//       FROM Create_Order_Request_TD001_${dealerid} co
// 	  left join z_scope..substitution_master sm on sm.Brandid = co.brandid and co.Part_Number1 = sm.partnumber1
//       JOIN LocationInfo li 
//           ON li.LocationID = co.LocationID
//       JOIN Part_Master pm 
//           ON li.brandid = pm.brandid 
//           AND pm.partnumber = co.Part_Number1  
//       LEFT JOIN [UAD_BI_PPNI].dbo.ppni_report_${dealerid} pr
//          ON pr.Jobcard_Number = co.Jobcard_number
//          AND pr.PartNumber = co.Part_Number1 --and pr.dateadded = co.Dateadded
//       WHERE co.vehiclenumber = @vehicleno
//         AND (@filter IS NULL OR co.final_close = @filter)
//         AND (@alltimenonstk IS NULL OR pr.All_Time_NonStck = @alltimenonstk)
//         AND (
//           @issued IS NULL OR
//           (@issued = '0' AND co.JobLineCloseDate IS NULL) OR
//           (@issued = '1' AND co.JobLineCloseDate IS NOT NULL)
//         ))
// select data2.*,isnull(data.StockQty,0)StockQty from data2 
// left join data on data.LAtest = data2.Latest
//  `
const query =`
            USE z_scope;
declare @pagesize int = ${pagesize}, @pageno int = ${pageno};
DECLARE @offset INT = (@pageno - 1) * @pagesize;
;WITH data AS (
    SELECT latest, SUM(ISNULL(Qty, 0)) AS StockQty 
    FROM (
        SELECT 
            cs2.PartNumber, 
            CASE 
                WHEN cs2.PartNumber = sm.partnumber1 THEN sm.subpartnumber1 
                ELSE cs2.PartNumber 
            END AS latest,
            ISNULL(QTY, 0) AS QTY 
        FROM CurrentStock2 cs2
        JOIN CurrentStock1 cs1 ON cs1.tCode = cs2.StockCode
        JOIN LocationInfo li ON li.LocationID = cs1.LocationID
        LEFT JOIN substitution_master sm 
            ON sm.brandid = li.BrandID AND sm.partnumber1 = cs2.PartNumber
        WHERE cs1.LocationID = ${locationid}
    ) a
    GROUP BY latest
),

data2 AS (
    SELECT DISTINCT
        co.bigid,
        co.DealerId,
        co.LocationId,
        co.Vehiclenumber,
        co.jobcard_number,
        co.part_number1,
        CASE 
            WHEN co.Part_Number1 = sm.partnumber1 THEN sm.subpartnumber1 
            ELSE co.Part_Number1 
        END AS Latest,
        pm.partdesc,
        pm.category,
        co.Price,
        co.qty AS Qty,
        CASE 
            WHEN co.Final_close = 'N' THEN 'Open' 
            ELSE 'Close' 
        END AS Final_close,
        co.Price * co.Qty AS Value,
        co.Dateadded AS OrderDate,
        pr.All_Time_NonStck,
        iif(isnull(pr.price,0)>0,pr.PPNI_Val / pr.price,0) AS PPNI_Qty,
        CASE 
            WHEN co.JobLineCloseDate IS NULL THEN 'Not Issued' 
            ELSE 'Issued' 
        END AS IssueStatus,
        co.BrandID
    FROM Create_Order_Request_TD001_${dealerid} co
    LEFT JOIN substitution_master sm 
        ON sm.Brandid = co.brandid AND co.Part_Number1 = sm.partnumber1
    JOIN LocationInfo li ON li.LocationID = co.LocationID
    left JOIN Part_Master pm 
        ON li.brandid = pm.brandid AND pm.partnumber = co.Part_Number1  
    LEFT JOIN [UAD_BI_PPNI].dbo.ppni_report_${dealerid} pr
        ON pr.Jobcard_Number = co.Jobcard_number AND pr.PartNumber = co.Part_Number1
    WHERE co.vehiclenumber = @vehicleno
	 AND (@filter IS NULL OR co.final_close = @filter)
        AND (@alltimenonstk IS NULL OR pr.All_Time_NonStck = @alltimenonstk)
        AND (
          @issued IS NULL OR
          (@issued = '0' AND co.JobLineCloseDate IS NULL) OR
          (@issued = '1' AND co.JobLineCloseDate IS NOT NULL)
        )
),

groupstock AS (
    SELECT 
        lp.Latest,
        SUM(ISNULL(cs2.Qty, 0)) AS GroupStock
    FROM (
        SELECT DISTINCT
            COALESCE(sm.subpartnumber1, d2.Latest) AS Latest,
            sm.partnumber1 AS EquivalentPart,
            d2.BrandID
        FROM data2 d2
        LEFT JOIN substitution_master sm 
            ON (d2.Latest = sm.subpartnumber1 OR d2.Latest = sm.partnumber1)
            AND d2.BrandID = sm.BrandID
        UNION 
        SELECT Latest, Latest AS EquivalentPart, BrandID
        FROM data2
    ) lp
    JOIN CurrentStock2 cs2 ON cs2.PartNumber = lp.EquivalentPart
    JOIN CurrentStock1 cs1 ON cs1.tCode = cs2.StockCode
    JOIN LocationInfo li ON li.LocationID = cs1.LocationID
    WHERE li.DealerID = ${dealerid}
    GROUP BY lp.Latest
)

SELECT count(part_number1)  OVER() as Count,
    d2.*,
    ISNULL(d.StockQty, 0) AS StockQty,
    ISNULL(gs.GroupStock, 0) AS GroupStock
FROM data2 d2
LEFT JOIN data d ON d.latest = d2.Latest
LEFT JOIN groupstock gs ON gs.Latest = d2.Latest
order by value desc
OFFSET @offset ROWS
FETCH NEXT @pagesize ROWS ONLY;
`
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

const predictiveVehicleSearchService = async(dealerid , vehicleno)=>{
try {
        const pool = await getPool2()
        const query = `
        --Declare @vehicleno varchar(10) = '@vehicleno'
    	select distinct(UPPER(Vehiclenumber))as Vehiclenumber from z_scope..Create_Order_Request_TD001_${dealerid}
    	where Vehiclenumber like ('%'+@vehicleno+'%')
        `
        const result = await pool.request().input('vehicleno',sql.VarChar,vehicleno).query(query)
        return result.recordset
} catch (error) {
    throw new Error(`predictiveVehicleSearchService failed : ${error.message}`);
} 
}

const vehicledealercheck = async(vehicleno , dealerid)=>{
    const pool = await getPool2()
    const query = `select * from z_scope..Create_Order_Request_TD001_${dealerid} where vehiclenumber = '${vehicleno}'`
    const result = await pool.request().query(query)
    // console.log(result.recordset);
   // returns 1 if there’s at least one row, otherwise 0
return result.recordset.length > 0 ? 1 : 0;
}

const partfamilywiseStockColor = async(brandid,dealerid,locationid,partnumber)=>{
try {
    const pool = await getPool2()
    const query = ` use z_scope
     DECLARE 
              @InputPart VARCHAR(40) = '${partnumber}',
              @InputBrandID INT = ${brandid},
              @InputLocationID INT = ${locationid},
              @RowsInserted INT;
  
          -- Drop temp table if exists
          IF OBJECT_ID('tempdb..#PartFamily','U') IS NOT NULL
              DROP TABLE #PartFamily;
  
          -- Create PartFamily temp table
          CREATE TABLE #PartFamily (
              Part VARCHAR(40),
              BrandID INT
          );
  
          -- Seed with input part
          INSERT INTO #PartFamily (Part, BrandID)
          VALUES (@InputPart, @InputBrandID);
  
          -- Expand the part family
          SET @RowsInserted = 1;
          WHILE @RowsInserted > 0
          BEGIN
              INSERT INTO #PartFamily (Part, BrandID)
              SELECT DISTINCT sm.SubPartNumber1, sm.BrandID
              FROM Substitution_Master sm
              JOIN #PartFamily f ON sm.PartNumber1 = f.Part AND sm.BrandID = f.BrandID
              WHERE NOT EXISTS (
                  SELECT 1 FROM #PartFamily x WHERE x.Part = sm.SubPartNumber1 AND x.BrandID = sm.BrandID
              )
              UNION
              SELECT DISTINCT sm.PartNumber1, sm.BrandID
              FROM Substitution_Master sm
              JOIN #PartFamily f ON sm.SubPartNumber1 = f.Part AND sm.BrandID = f.BrandID
              WHERE NOT EXISTS (
                  SELECT 1 FROM #PartFamily x WHERE x.Part = sm.PartNumber1 AND x.BrandID = sm.BrandID
              );
  
              SET @RowsInserted = @@ROWCOUNT;
          END;
              --select * from #PartFamily
            select l.Part,
    CASE
      WHEN SUM(l.MaxValue) > 0  THEN 'Stockable'
      WHEN SUM(CASE WHEN l.greenflag = 'Y' OR l.yellowflag = 'Y' OR l.RedFlag   = 'Y' OR l.FlagType IN ('R','G','Y')THEN 1 ELSE 0 END) > 0 THEN 'Non-Moving'
      WHEN SUM(l.MaxValue) = 0 THEN 'Non-Stockable'
      ELSE '' END AS Partstatus
from 
(
select pf.part,
--case when pf.Part = sm.partnumber1 then sm.subpartnumber1 else pf.Part end as latest,
ISNULL(sn.Maxvalue,0) Maxvalue , os.greenflag , os.yellowflag ,su.RedFlag, ep.flagtype
from #PartFamily pf
outer apply (
select top 1* from 
Exceptional_Part_History where LocationId = @InputLocationID and PartNumber = pf.Part
order by bigId desc
)ep
outer apply(
select top 1 * from 
Stockable_Nonstockable_TD001_${dealerid} where Locationid = @InputLocationID and partnumber1 = pf.Part and Stockdate = (select MAX(stockdate) from Stockable_Nonstockable_TD001_${dealerid} where Locationid = @InputLocationID)
)sn
left join Opening_Stock_Upload_TD001_${dealerid} os
on os.Locationid = @InputLocationID and os.partnumber1 = pf.Part 
left join Stock_Upload_SPM_TD001_${dealerid} su
on su.Locationid = @InputLocationID and su.partnumber1 = pf.Part and su.Partnumber not in (ep.PartNumber) and su.RedFlag = 'Y' and RedDate is not null --and sn.Stockdate = (select MAX(stockdate) from Stock_Upload_SPM_TD001_${dealerid})
)l
group by l.Part
          ` 
  
        const result = await pool.request().query(query)
        return result
} catch (error) {
  throw new Error(`partfamilywiseStockColor failed : ${error.message}`);
}
}

const vehicleScore = async (dealerid,vehiclenumber)=>{
try {
    const pool = await getPool2()
    const query = 
    ` use z_scope
	SELECT
		-- In-stock
		ISNULL(SUM(CASE WHEN cs2.PartNumber IS NOT NULL THEN 1 ELSE 0 END),0)    
		  AS InStockCount,
		ISNULL(SUM(CASE WHEN cs2.PartNumber IS NOT NULL THEN co.Ordervalue ELSE 0 END),0)
		  AS InStockTotal,
  
		-- Out-of-stock  
		ISNULL(SUM(CASE WHEN cs2.PartNumber IS NULL THEN 1 ELSE 0 END),0)   
		  AS OutStockCount,
		ISNULL(SUM(CASE WHEN cs2.PartNumber IS NULL THEN co.Ordervalue ELSE 0 END),0)
		  AS OutStockTotal
	  FROM create_order_request_td001_${dealerid} AS co
	  JOIN CurrentStock1 AS cs1
		ON cs1.LocationID = co.LocationID
	  LEFT JOIN CurrentStock2 AS cs2
		ON cs2.StockCode   = cs1.tCode
	   AND cs2.PartNumber = co.Part_Number	
	  WHERE
		co.vehiclenumber     = '${vehiclenumber}'
		AND co.JobLineCloseDate IS NULL;
    `
    const result = await pool.request().query(query)
    return result
} catch (error) {
  throw new Error(`vehicleScore failed : ${error.message}`);
  
}
}

// const vehicleSearchPagination = async(page,pagesize,dealerid,vehicleno,alltimestk,issued,filter)=>{
//   console.log(pagesize,dealerid,vehicleno,alltimestk,issued,filter);
  
// try {
//     const pool = await getPool2()
//     const query = `select count(co.bigid)count from z_scope..Create_Order_Request_TD001_${dealerid} co
//         join uad_bi_ppni..ppni_report_${dealerid} p on p.locationid = co.LocationID and p.partnumber = co.Part_Number1 where co.vehiclenumber = '${vehicleno}' 
//              AND (@filter IS NULL OR co.final_close = @filter)
//             AND (@alltimenonstk IS NULL OR pr.All_Time_NonStck = @alltimenonstk)
//             AND (
//           @issued IS NULL OR
//             (@issued = '0' AND co.JobLineCloseDate IS NULL) OR
//             (@issued = '1' AND co.JobLineCloseDate IS NOT NULL)
//           )
//     )`
//     const totalRecordsQuery = await pool.request()
//     .input('alltimenonstk',alltimestk)
//     .input('issued',issued)
//     .input('filter',filter)
//     .query(
//       // `select count(bigid)count from Create_Order_Request_TD001_${dealerid} where vehiclenumber = '${vehicleno}'`
//       query
//     );
//     const totalRecords = totalRecordsQuery.recordset[0].count;
//     const totalPages = Math.ceil(totalRecords / pagesize);
//     console.log(totalRecords,totalPages);
    
//     return page < totalPages
// } catch (error) {
//   throw new Error(`vehicleSearchPaginationfailed ${error}`);
// }
// }
const vehicleSearchPagination = async (page, pageSize, dealerId, vehicleNo, allTimeNonStk, issued, filter) => {
  try {
    if (!pageSize || pageSize <= 0) throw new Error('pagesize must be > 0');

    const pool = await getPool2();

    const sql = `
      SELECT COUNT(1) AS count
      FROM z_scope..Create_Order_Request_TD001_${dealerId} AS co
      JOIN uad_bi_ppni..ppni_report_${dealerId} AS p
        ON p.locationid = co.LocationID
       AND p.partnumber = co.Part_Number
      WHERE co.vehiclenumber = @vehicleno
        AND (@filter IS NULL OR co.final_close = @filter)
        AND (@allTimeNonStk IS NULL OR p.All_Time_NonStck = @allTimeNonStk)
        AND (
              @issued IS NULL
           OR (@issued = '0' AND co.JobLineCloseDate IS NULL)
           OR (@issued = '1' AND co.JobLineCloseDate IS NOT NULL)
        );
    `;

    const result = await pool.request()
      .input('vehicleno', vehicleNo)
      .input('filter', filter ?? null)
      .input('allTimeNonStk', allTimeNonStk ?? null)
      .input('issued',  issued ?? null)
      .query(sql);

    const totalRecords = result.recordset[0]?.count ?? 0;
    const totalPages = Math.ceil(totalRecords / pageSize);
    const hasMore = page < totalPages;
      // console.log(page,totalRecords,totalPages,hasMore);
      
    // return page < totalPages; 
    return {page,totalRecords,totalPages,hasMore}
  } catch (err) {
    console.log(err);
    
    throw new Error(`vehicleSearchPagination failed: ${err.message}`);
  }
};

const vehicleSearchlogsService = async(moduleName,event,details,userid)=>{
try {
    const pool = await getPool1()
    const query = `use z_scope Insert into App_Logging(ModuleName,Event,Details,CreatedBy)
                    OUTPUT inserted.ModuleName, inserted.Event, inserted.Details, inserted.CreatedBy
                    values(@ModuleName,@Event,@Details,@CreatedBy)`
    const result = await pool.request()
    .input('ModuleName',sql.VarChar,moduleName)
    .input('Event',sql.VarChar,event)
    .input('Details',sql.VarChar,details)
    .input('CreatedBy',sql.Int,userid)
    .query(query)  
    return result

    } catch (error) {
      throw new Error(`vehicleSearchlogsService failed : ${error.message}`);  
    }              
}
const viewLogService = async(type,partnumber,vehiclenumber , from , to)=>{
  const pool = await getPool1()
  const query = `use [UAD_BI_PPNI] EXEC dbo.sp_dealerapplogsView @type,@partnumber,@vehiclenumber,@from,@to`
  const result = await pool.request()
    .input('type',sql.VarChar,type)
    .input('partnumber',sql.VarChar,partnumber ?? null)
    .input('vehiclenumber',sql.VarChar,vehiclenumber ?? null)
    .input('from',sql.DateTime,from ?? null)
    .input('to',sql.DateTime,to ?? null)
    .query(query)  
    return result

}
export {vehicleSearchPagination,vehicleScore,partfamilywiseStockColor,groupNorms,vehicledealercheck,PPNIVALUE12MonthsService,userroleService,partInfo,reservedForVehicle,groupStock,jobCardByVehicleService,partsByJobCardService,partSubstituteDetailService,locationwisePPNIValueService,advisorwisePPNIValueService,vehiclewisePPNIValueService,partwisePPNIValueService,vehicleSearchService,gainerListingService,predictiveVehicleSearchService,vehicleSearchlogsService,viewLogService}