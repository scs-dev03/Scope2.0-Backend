import { getPool  } from "../../db/db.js";
import sql from 'mssql'
import { ApiError } from "../../utils/ApiError.js";
const partInfo = async (brandid, partnumber) => {
  try {
    const pool = await getPool()
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

const reservedForVehicle = async (dealerid, locationid, partnumber) => {
  try {
    const pool = await getPool()
    // const query = ` use z_scope
    // select count(Part_Number1)as ReservedforVehicle from Create_Order_Request_TD001_${dealerid}
    // where Part_Number1 = '${partnumber}' and Final_Close = 'N'
    // group by Part_Number1`

    // const query = `
    //     use z_scope
    //     select 
    //     CASE WHEN cs2.qty < SUM(co.qty)  then cs2.Qty else SUM(co.qty)  end as ReservedforVehicle 
    //     from Create_Order_Request_TD001_${dealerid} co
    //     join currentstock1 cs1 on cs1.locationid = co.LocationID
    //     join CurrentStock2 cs2 on cs2.StockCode = cs1.tCode and cs2.PartNumber = co.Part_Number1
    //     where Part_Number1 = '${partnumber}' and Dateadded >  DATEADD(day, -60 , GETDATE()) 
    //     and cs2.Qty > 0 and Current_status <> 'Close' and co.LocationID = ${locationid}
    //     group by co.Qty , cs2.Qty`
        const query = `
        use z_scope
        select Vehiclenumber, CONCAT(amg.vcFirstName , '' , amg.vcLastName )Advisor , 
        CASE WHEN cs2.qty < SUM(co.qty)  then cs2.Qty else SUM(co.qty)  end as ReservedforVehicle ,
        co.SCS_Submit_Date , co.final_close
        from Create_Order_Request_TD001_${dealerid} co
        join currentstock1 cs1 on cs1.locationid = co.LocationID
        join CurrentStock2 cs2 on cs2.StockCode = cs1.tCode and cs2.PartNumber = co.Part_Number1
		    join AdminMaster_GEN amg on amg.bintId_Pk = co.AdvisorID
        where Part_Number1 = '${partnumber}'   and 
		    co.Dateadded >  DATEADD(day, -60 , GETDATE()) 
        and cs2.Qty > 0 and Current_status <> 'Close' and co.LocationID = ${locationid}
        group by co.Qty , cs2.Qty , Vehiclenumber , amg.vcFirstName , amg.vcLastName ,  co.SCS_Submit_Date , co.final_close
        `
    // console.log(query);
    const result = await pool.request().query(query)
    return result
  } catch (error) {
    throw new Error(`reservedForVehicle failed: ${error.message}`)
  }
}

const groupStock = async (brandid, dealerid, locationid, partnumber) => {
  try {
    const pool = await getPool()
    const query = `
        DECLARE
        @InputPart VARCHAR(40) = '${partnumber}',
        @InputBrandID INT = ${brandid},
        @InputLocationID INT = ${locationid},
        @InputDealerid int = ${dealerid} ,
        @RowsInserted INT;

		DECLARE @Part TABLE (partnumber varchar(30))
	
        declare @latestpart varchar(20) 
        select @latestpart = subpartnumber1 from z_scope..Substitution_Master (nolock)
        where brandid = @InputBrandID and (partnumber1 = @InputPart or subpartnumber1 = @InputPart)

		insert into @Part(partnumber)
        select partnumber1  from substitution_master (nolock) where brandid = @InputBrandID and subpartnumber1= @latestpart
        union 
        select ISNULL(@latestpart,@InputPart) 

		select l.bigid LocationID ,l.work_location location ,a.Stockdate,isnull(a.Qty,0) GroupStock 
		from Dealer_Workshop_Master l (nolock)
		left join (select cs1.LocationID , sum(cs2.Qty)Qty , cs1.StockDate from @Part p
		left join  CurrentStock2 cs2 (nolock) on cs2.PartNumber = p.partnumber
		left join CurrentStock1 cs1 on cs1.tCode = cs2.StockCode
		group by  cs1.LocationID ,cs1.Stockdate
		)a on l.bigid = a.LocationID
		where l.DealerID = @InputDealerid and l.OgsStatus = 1
        
    select * from @part

	DECLARE @StkblDate TABLE
	(
	LocationID  int,
	MaxDate  date
	)
	insert into @StkblDate(LocationID,MaxDate)
	select locationid,MAX(stockdate) from Stockable_Nonstockable_TD001_${dealerid} (nolock) where Dealerid = @InputDealerid
	group by Locationid

	DECLARE @RedFlag TABLE( LocationId int , FlagType varchar , Redflag varchar )
	insert into @RedFlag
	select dwm.bigid,ep.FlagType,su.RedFlag from 
	@Part pf 
	join Dealer_Workshop_Master dwm on dwm.dealerid = @InputDealerid and dwm.OgsStatus = 1
	outer apply (
              select top 1* from 
              Exceptional_Part_History (nolock) where locationid  = dwm.bigid and PartNumber = pf.partnumber
              order by bigId desc
         )ep
	left  join  Stock_Upload_SPM_TD001_${dealerid} su (nolock) on su.locationid = dwm.bigid and su.partnumber1 = pf.partnumber and su.Partnumber not in 
			(         
			select Partnumber from Exceptional_Part_History (nolock) where locationid  = dwm.bigid 
			) 
	and su.RedFlag = 'Y' and RedDate is not null


		select 
		l.location , l.locationid ,
		    CASE
		      WHEN SUM(l.MaxValue) > 0  THEN 'Stockable'
		      WHEN SUM(CASE WHEN l.greenflag = 'Y'OR l.yellowflag = 'Y'OR l.RedFlag   = 'Y'OR l.FlagType IN ('R','G','Y')THEN 1 ELSE 0 END) > 0THEN 'Non-Moving'
		      WHEN SUM(l.MaxValue) = 0 THEN 'Non-Stockable'
		      ELSE '' END AS PartStatus
		from 
		(
		select dl.work_location Location , dl.bigid LocationID , pf.partnumber ,sn.stockdate,
		case when pf.partnumber = sm.partnumber1 then sm.subpartnumber1 else pf.partnumber end as latest,
		ISNULL(sn.Maxvalue,0) Maxvalue , os.greenflag , os.yellowflag ,rf.RedFlag, rf.flagtype
		from @Part pf
		join Dealer_Workshop_Master (nolock) dl on  dl.BrandID= @InputBrandID
		join @RedFlag rf on rf.LocationId = dl.bigid
		left join z_scope..Substitution_Master sm (nolock) on  sm.brandid = @InputBrandID and pf.partnumber = sm.partnumber1
		outer apply(
		           select top 1 a1.* from 
		           Stockable_Nonstockable_TD001_${dealerid} a1 (nolock)
		           inner join @StkblDate b1 on(a1.Locationid=b1.LocationID and a1.Stockdate =b1.MaxDate)
		           where a1.Locationid = dl.bigid and a1.partnumber1 = pf.partnumber 
		           )sn
		left join Opening_Stock_Upload_TD001_${dealerid} os (nolock) on os.Locationid = dl.bigid and os.partnumber1 = pf.partnumber 
		where dl.OgsStatus = 1 and dl.DealerID=@InputDealerid)l
		group by l.location , l.LocationID
		order by l.Location
`
    const result = await pool.request().query(query)
    return result

  } catch (error) {
    throw new Error(`groupStock failed: ${error.message}`)
  }
}

const groupNorms = async (brandid, dealerid, locationid, partnumber) => {
  try {
    const pool = await getPool()
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
const jobCardByVehicleService = async (filter, vehicleno, dealerid) => {
  try {
    const pool = await getPool()
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

const partsByJobCardService = async (dealerid, jobcardno) => {
  try {
    const pool = await getPool()
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

const partSubstituteDetailService = async (brandid, dealerid, locationid, partnumber) => {
  try {
    const pool = await getPool()
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

const userroleService = async (userid) => {
  try {
    const pool = await getPool()
    const query = `select rm.Role,concat(amg.vcFirstName,' ',amg.vcLastName)as Name from z_scope..adminmaster_gen amg 
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
//         const pool = await getPool()
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

const locationwisePPNIValueService = async (dealerid, jobcardstatus, nonstockable, month) => {
  try {
    if (!dealerid) throw new Error("dealerid is required");

    const pool = await getPool();

    const request = pool.request()
      .input('All_Time_NonStck', sql.VarChar, nonstockable || null)
      .input('JobCardStatus', sql.VarChar, jobcardstatus || null);

    const tableName = `ppni_report_${dealerid}`;

    // const query = `
    //  USE [UAD_BI_PPNI];
    // DECLARE @d VARCHAR(10) = '${month}';

    // -- Parse to first day of month (as date)
    // DECLARE @firstDate DATE = TRY_CONVERT(DATE, '01-' + @d, 105);

    // -- Get last day using EOMONTH
    // DECLARE @lastDate DATE = EOMONTH(@firstDate);

    //       SELECT 
    //           p.Location, 
    //           p.LocationId, 
    //           Advisor,
    //           SUM(ppni_val) AS PPNI_Value
    //       FROM ${tableName} p
    // 	  left join z_scope..Create_Order_Request_TD001_${dealerid} co on co.Vehiclenumber = p.Vehiclenumber and co.Part_Number1 = p.PartNumber 
    // 	  join z_scope..currentstock1 cs1 on cs1.locationid = p.Locationid
    // 	  join z_scope..currentstock2 cs2 on cs2.StockCode = cs1.tCode and cs2.PartNumber = p.PartNumber
    //       WHERE  
    // 	  	co.JobLineCloseDate is null and
    // 	  cs2.Qty != 0  
    // 	  and 
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
    //           (p.dateadded >= @firstDate AND p.dateadded <= @lastDate)
    //           )
    //       GROUP BY 
    //           p.Location, 
    //           p.LocationId, 
    //           Advisor 
    //       HAVING 
    //           SUM(ppni_val) > 0
    //       ORDER BY 
    //           PPNI_Value DESC;`

    const query = `
    
    DECLARE @d VARCHAR(10) = '${month}';
    DECLARE @firstDate DATE = TRY_CONVERT(DATE, '01-' + @d, 105);
    DECLARE @lastDate DATE = EOMONTH(@firstDate);
    --declare @JobCardStatus varchar(50) = ;
    --declare @All_Time_NonStck varchar(50) = NULL;

    ;WITH T1 AS
    		(
    		  SELECT A.Part_Number1,C.Qty,A.Current_status,A.LocationID,A.Dealerid,A.BIGID ,A.JobLineCloseDate  
    		  FROM z_scope..Create_Order_Request_TD001_${dealerid} A
    		  LEFT JOIN z_scope..CurrentStock1  B ON (A.LocationID = B.LocationID)
    		  LEFT  JOIN z_scope..CurrentStock2  C	ON (C.Stockcode   = B.tcode AND C.PartNumber = A.Part_Number)	
    		  where Type='V' and A.current_status<>'Close'
    		  )
    Select A.LocationId , B.Location , B.Advisor , isnull(SUM(B.PPNI_Val),0) PPNI_Value 
    from T1 A 
    left join UAD_BI_PPNI..${tableName} B on A.Bigid = B.Bigid
    where
    	(
           @All_Time_NonStck IS NULL
           OR B.All_Time_NonStck = @All_Time_NonStck
    	)
    AND
     (
            (@JobCardStatus IS NULL AND b.JobCardStatus IN ('OPEN','CLOSE'))
            OR
            (@JobCardStatus IS NOT NULL AND b.JobCardStatus = @JobCardStatus)
      )
        AND (
            @firstDate IS NULL
            OR (b.DateAdded >= @firstDate AND b.DateAdded <= @lastDate)
        )

    GROUP BY A.LocationID , B.Location , B.advisor 
    HAVING SUM(PPNI_Val)>0
    order by SUM(PPNI_Val) desc`

    const result = await request.query(query);
    return result;
  } catch (error) {
    throw new Error(`locationwisePPNIValueService failed: ${error.message}`);
  }
};


const advisorwisePPNIValueService = async (dealerid, locationid, jobcardstatus, nonstockable, month) => {
  try {
    const pool = await getPool();

    const request = pool.request()
      .input('All_Time_NonStck', sql.VarChar(1), nonstockable)
      .input('JobCardStatus', sql.VarChar(10), jobcardstatus);

    // const query = `
    //       USE [UAD_BI_PPNI];
    //       DECLARE @d VARCHAR(10) = '${month}';

    // -- Parse to first day of month (as date)
    // DECLARE @firstDate DATE = TRY_CONVERT(DATE, '01-' + @d, 105);

    // -- Get last day using EOMONTH
    // DECLARE @lastDate DATE = EOMONTH(@firstDate);

    //       SELECT Advisor, SUM(ppni_val) AS PPNI_Value 
    //       FROM PPNI_report_${dealerid} p
    // 	  left join z_scope..Create_Order_Request_TD001_${dealerid} co on co.Vehiclenumber = p.Vehiclenumber and co.Part_Number1 = p.PartNumber 
    // 	  join z_scope..currentstock1 cs1 on cs1.locationid = p.Locationid
    // 	  join z_scope..currentstock2 cs2 on cs2.StockCode = cs1.tCode and cs2.PartNumber = p.PartNumber
    // 	  WHERE 
    // 	 co.JobLineCloseDate is null and
    // 	  cs2.Qty != 0
    // and
    //   (@All_Time_NonStck IS NULL OR All_Time_NonStck = @All_Time_NonStck)
    // 	AND
    // 	  (
    // 			(@JobCardStatus IS NULL AND JobCardStatus IN ('OPEN','CLOSE'))
    // 			OR
    // 			(@JobCardStatus IS NOT NULL AND JobCardStatus = @JobCardStatus)
    // 	  )
    //    AND (
    //            @firstDate IS NULL OR 
    //           (p.dateadded >=  @firstDate AND p.dateadded <= @lastDate)
    //           )
    //   AND p.locationid =@LocationID
    //       GROUP BY Advisor 
    //       HAVING SUM(ppni_val) > 0
    //       ORDER BY PPNI_Value DESC;
    // `

    const query = `
      DECLARE @d VARCHAR(10) = '${month}';
      DECLARE @firstDate DATE = TRY_CONVERT(DATE, '01-' + @d, 105);
      DECLARE @lastDate DATE = EOMONTH(@firstDate);
      --declare @JobCardStatus varchar(50) = 'Close';
      -- declare @All_Time_NonStck varchar(50) = NULL;

      ;WITH T1 AS
      		(
      		  SELECT A.Part_Number1,C.Qty,A.Current_status,A.LocationID,A.Dealerid,A.BIGID ,A.JobLineCloseDate  
      		  FROM z_scope..Create_Order_Request_TD001_${dealerid} A
      		  LEFT JOIN z_scope..CurrentStock1  B ON (A.LocationID = B.LocationID)
      		  LEFT  JOIN z_scope..CurrentStock2  C	ON (C.Stockcode   = B.tcode AND C.PartNumber = A.Part_Number)	
      		  where Type='V' and A.locationid = ${locationid} and A.current_status<>'Close'
      		  )
      Select  B.Advisor , isnull(SUM(B.PPNI_Val),0) PPNI_Value
      from T1 A 
      left join UAD_BI_PPNI..PPNI_report_${dealerid} B on A.Bigid = B.Bigid
      where
      	(
             @All_Time_NonStck IS NULL
             OR B.All_Time_NonStck = @All_Time_NonStck
      	)
      AND
       (
              (@JobCardStatus IS NULL AND b.JobCardStatus IN ('OPEN','CLOSE'))
              OR
              (@JobCardStatus IS NOT NULL AND b.JobCardStatus = @JobCardStatus)
        )
          AND (
              @firstDate IS NULL
              OR (b.DateAdded >= @firstDate AND b.DateAdded <= @lastDate)
          )

      GROUP BY  B.advisor 
      HAVING SUM(PPNI_Val)>0
      order by SUM(PPNI_Val) desc

    `
    request.input('LocationID', sql.Int, locationid);

    const result = await request.query(query);
    return result;
  } catch (error) {
    throw new Error(`advisorwisePPNIValueService failed: ${error.message}`);
  }
};


const vehiclewisePPNIValueService = async (dealerid, locationid, jobcardstatus, nonstockable, advisor, month, pageno, pagesize) => {
  try {
    const pool = await getPool();
    const request = pool.request()
    //   .input('All_Time_NonStck', sql.VarChar, nonstockable)
    //   .input('JobCardStatus', sql.VarChar, jobcardstatus)
    //   .input('locationid', sql.Int, locationid)
    //   .input('advisor', sql.VarChar, advisor);

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

    //     const query = `
    // DECLARE @d VARCHAR(10) = '${month}';
    // Declare @pagesize int = ${pagesize}, @pageno int = ${pageno} ;
    // DECLARE @offset INT = (@pageno - 1) * @pagesize;
    // DECLARE @firstDate DATE = TRY_CONVERT(DATE, '01-' + @d, 105);
    // DECLARE @lastDate DATE = EOMONTH(@firstDate);
    // declare @advisor varchar(50) = ${advisorSQL} ;
    // declare @JobCardStatus varchar(50) = ${jobcardstatusSQL};
    // declare @All_Time_NonStck varchar(50) = ${nonstockableSQL};

    // ;WITH T1 AS
    // (
    // 		SELECT A.Part_Number1,A.Vehiclenumber,C.Qty,A.Current_status,A.LocationID,A.Dealerid,A.BIGID ,A.JobLineCloseDate  FROM z_scope..Create_Order_Request_TD001_${dealerid} A
    // 		  LEFT JOIN z_scope..CurrentStock1  B ON (A.LocationID = B.LocationID)
    // 		  LEFT  JOIN z_scope..CurrentStock2  C	ON (C.Stockcode   = B.tcode AND C.PartNumber = A.Part_Number)	
    // 		  where A.Locationid = ${locationid}
    // 		  AND Type='V' and A.current_status<>'Close'
    // 		  )
    // SELECT count(a.Vehiclenumber) over() as TotalCount,A.DealerId,A.LocationId,A.Vehiclenumber,
    // SUM(B.PPNI_Val) PPNI_Value,
    // --SUM(IIF(A.current_status<>'Close',1,0))  NotIssued,
    // --SUM(IIF((A.Current_status<>'Close' AND A.QTY>0 AND B.PPNI_Val>0),1,0))  InstockCount
    //     COUNT(*)                                  AS NotIssued,    
    //     SUM(CASE WHEN  1 = 0 OR (A.Qty > 0) AND B.PPNI_Val > 0THEN 1 ELSE 0 END) AS InstockCount
    // FROM T1 A
    // LEFT JOIN UAD_BI_PPNI..PPNI_report_${dealerid} B ON( A.BIGID=B.Bigid)
    // where
    // (
    //        @All_Time_NonStck IS NULL
    //        OR B.All_Time_NonStck = @All_Time_NonStck
    //    )
    // AND
    //  (
    //         (@JobCardStatus IS NULL AND b.JobCardStatus IN ('OPEN','CLOSE'))
    //         OR
    //         (@JobCardStatus IS NOT NULL AND b.JobCardStatus = @JobCardStatus)
    //   )
    //     AND (
    //         @firstDate IS NULL
    //         OR (b.DateAdded >= @firstDate AND b.DateAdded <= @lastDate)
    //     )
    //     AND (
    //         @advisor IS NULL
    //         OR b.Advisor = @advisor
    //     )
    // GROUP BY A.Dealerid,A.Locationid,A.Vehiclenumber
    // HAVING SUM(PPNI_Val)>0
    // order by SUM(PPNI_Val) desc
    // offset  @offset rows
    // fetch next @pagesize Rows only;
    // `

    const query = `
    DECLARE @d VARCHAR(10) = '${month}';
    Declare @pagesize int = ${pagesize}, @pageno int = ${pageno} ;
    DECLARE @offset INT = (@pageno - 1) * @pagesize;
    DECLARE @firstDate DATE = TRY_CONVERT(DATE, '01-' + @d, 105);
    DECLARE @lastDate DATE = EOMONTH(@firstDate);
    declare @advisor varchar(50) = ${advisorSQL} ;
    declare @JobCardStatus varchar(50) = ${jobcardstatusSQL};
    declare @All_Time_NonStck varchar(50) = ${nonstockableSQL};

    ;WITH T1 AS
(
    SELECT
        A.Part_Number1,
        A.Vehiclenumber,
        C.Qty       AS StockQty,  
        A.Current_status,
        A.LocationID,
        A.Dealerid,
        A.BIGID,
        A.JobLineCloseDate
    FROM z_scope..Create_Order_Request_TD001_${dealerid} A
    LEFT JOIN z_scope..CurrentStock1 B
           ON B.LocationID = A.LocationID
    LEFT JOIN z_scope..CurrentStock2 C
           ON C.Stockcode = B.tcode
          AND C.PartNumber = A.Part_Number
    WHERE A.Locationid = ${locationid}
      AND A.Type = 'V'
      AND A.current_status <> 'Close'
)
SELECT
    COUNT(A.Vehiclenumber) OVER() AS TotalCount,
    A.DealerId,
    A.LocationId,
    A.Vehiclenumber,
    SUM(B.PPNI_Val)                          AS PPNI_Value,
    COUNT(*)                                  AS NotIssued,    
    SUM(CASE WHEN  1 = 0 OR (A.StockQty > 0) AND B.PPNI_Val > 0THEN 1 ELSE 0 END) AS InstockCount
FROM T1 A
LEFT JOIN UAD_BI_PPNI..PPNI_report_${dealerid} B
       ON B.Bigid = A.BIGID
      AND (@All_Time_NonStck IS NULL OR B.All_Time_NonStck = @All_Time_NonStck)
      AND (
            (@JobCardStatus IS NULL  AND B.JobCardStatus IN ('OPEN','CLOSE')) OR
            (@JobCardStatus IS NOT NULL AND B.JobCardStatus = @JobCardStatus)
          )
      AND (@firstDate IS NULL OR (B.DateAdded >= @firstDate AND B.DateAdded <= @lastDate))
      AND (@advisor IS NULL  OR B.Advisor = @advisor)
GROUP BY A.Dealerid, A.Locationid, A.Vehiclenumber
HAVING SUM(B.PPNI_Val) > 0
ORDER BY SUM(B.PPNI_Val) DESC, A.DealerId, A.LocationId, A.Vehiclenumber
OFFSET @offset ROWS
FETCH NEXT @pagesize ROWS ONLY;`
    const result = await request.query(query);
    // console.log(result);

    return result;
  }

  catch (error) {
    throw new Error(`vehiclewisePPNIValueService failed: ${error.message}`);
  }
};


const partwisePPNIValueService = async (dealerid, locationid, jobcardstatus, nonstockable, advisor, vehicleno, month) => {
  try {
    const pool = await getPool()
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

    // const query = `
    // DECLARE @d VARCHAR(10) = '${month}';
    // DECLARE @firstDate DATE = TRY_CONVERT(DATE, '01-' + @d, 105);
    // declare @advisor varchar(50) = ${advisorSQL} ;
    // declare @JobCardStatus varchar(50) = ${jobcardstatusSQL};
    // declare @All_Time_NonStck varchar(50) = ${nonstockableSQL};
    // DECLARE @lastDate DATE = EOMONTH(@firstDate);

    // use z_scope 
    //   ;with data as(
    //   select  latest , isnull(sum(qty),0)StockQty from (
    //   select cs2.PartNumber , 
    //   CASE WHEN cs2.PartNumber = sm.partnumber1 then sm.subpartnumber1 else cs2.PartNumber end as LAtest,
    //   QTY  from z_scope..CurrentStock2 cs2
    //   join z_scope..CurrentStock1 cs1 on cs1.tCode = cs2.StockCode
    //   join z_scope..LocationInfo li on li.LocationID = cs1.LocationID
    //   left join z_scope..substitution_master sm on sm.brandid = li.BrandID and sm.partnumber1 = cs2.PartNumber
    //   where cs1.LocationID = @locationid and Qty > 0)a
    //   group by latest
    //   ),
    // data2 as (
    // select 
    // co.bigid,
    // co.DealerId,
    // co.LocationId,
    // ppni.Vehiclenumber,
    //         ppni.PartNumber, 
    //         CASE WHEN ppni.PartNumber = sm.partnumber1 then sm.subpartnumber1 else ppni.PartNumber end as Latest,
    //         ppni.PartDesc, 
    //         part_category, 
    //         ppni.price,
    //         ppni.PPNI_Val,
    //         ppni.Qty as DemandedQty,
    //         All_Time_NonStck
    //       FROM 
    //       UAD_BI_PPNI..PPNI_report_${dealerid} ppni
    //       left join z_scope..Create_Order_Request_TD001_${dealerid} co on co.vehiclenumber = ppni.vehiclenumber and co.part_number1 = ppni.partnumber
    //         left join z_scope..substitution_master sm on sm.Brandid = ppni.brandid and ppni.partnumber = sm.partnumber1
    //       left join z_scope..currentstock1 cs1 on cs1.locationid = ppni.Locationid
    //       LEFT  join z_scope..currentstock2 cs2 on cs2.StockCode = cs1.tCode and cs2.PartNumber = ppni.PartNumber
    //       WHERE 
    //       co.joblineclosedate is  null 
    //         and	  cs2.Qty != 0
    //       and ppni.Vehiclenumber = '${vehicleno}'
    //       and
    //         (
    //           (@All_Time_NonStck IS NULL AND All_Time_NonStck IN ('Y', 'N')) 
    //           OR (@All_Time_NonStck IS NOT NULL AND All_Time_NonStck = @All_Time_NonStck)
    //         )
    //         AND
    //         (
    //           (@JobCardStatus IS NULL AND JobCardStatus IN ('OPEN', 'CLOSE')) 
    //           OR (@JobCardStatus IS NOT NULL AND JobCardStatus = @JobCardStatus)
    //         )
    //         AND (
    //         @firstDate IS NULL OR 
    //         (ppni.dateadded >= @firstDate AND ppni.dateadded <= @lastDate)
    //         )
    //         AND ppni.locationid = @locationid
    //       GROUP BY 
    //           co.bigid,  co.DealerId,co.LocationId,ppni.PartNumber, ppni.Vehiclenumber, ppni.PartDesc, part_category, ppni.price, ppni.Qty , All_Time_NonStck , sm.partnumber1 , sm.subpartnumber1  , ppni.PPNI_Val
    //       HAVING 
    //         SUM(ppni_val) > 0
    // )
    // select Data2.*,isnull(data.StockQty,0)as StockQty  
    //   from data2
    //   left  join data on data.latest = data2.Latest
    //   order by data2.ppni_val desc
    // `
    const query = `

    DECLARE @d VARCHAR(10) = '${month}';
    DECLARE @firstDate DATE = TRY_CONVERT(DATE, '01-' + @d, 105);
    declare @advisor varchar(50) = ${advisorSQL} ;
    declare @JobCardStatus varchar(50) = ${jobcardstatusSQL};
    declare @All_Time_NonStck varchar(50) = ${nonstockableSQL};
    DECLARE @lastDate DATE = EOMONTH(@firstDate);
    
    ;WITH T1 AS
      (
		      SELECT A.Part_Number1,A.Vehiclenumber,C.Qty,A.Current_status,A.LocationID,A.Dealerid,A.BIGID ,A.JobLineCloseDate  FROM z_scope..Create_Order_Request_TD001_${dealerid} A
		      LEFT JOIN z_scope..CurrentStock1  B ON (A.LocationID = B.LocationID)
		      LEFT JOIN z_scope..CurrentStock2  C	ON (C.Stockcode   = B.tcode AND C.PartNumber = A.Part_Number)	
		      where A.Locationid = ${locationid} and Vehiclenumber = '${vehicleno}'
		      AND Type='V' and A.current_status<>'Close'
		  )
SELECT A.bigid,A.DealerId,A.LocationId,A.Vehiclenumber,A.Part_Number1 PartNumber,
 CASE WHEN b.PartNumber = sm.partnumber1 then sm.subpartnumber1 else b.PartNumber end as Latest,
B.PartDesc,part_category, b.price,b.Qty as DemandedQty,SUM(B.PPNI_Val) PPNI_Val,isnull(A.Qty,0) StockQty,All_Time_NonStck
FROM T1 A
LEFT JOIN UAD_BI_PPNI..PPNI_report_${dealerid} B ON( A.BIGID=B.Bigid)
left join z_scope..substitution_master sm on sm.Brandid = b.brandid and b.partnumber = sm.partnumber1
where
(
       @All_Time_NonStck IS NULL
       OR B.All_Time_NonStck = @All_Time_NonStck
   )
AND
 (
        (@JobCardStatus IS NULL AND b.JobCardStatus IN ('OPEN','CLOSE'))
        OR
        (@JobCardStatus IS NOT NULL AND b.JobCardStatus = @JobCardStatus)
  )
    AND (
        @firstDate IS NULL
        OR (b.DateAdded >= @firstDate AND b.DateAdded <= @lastDate)
    )
    AND (
        @advisor IS NULL
        OR b.Advisor = @advisor
    )
GROUP BY A.bigid,A.Dealerid,A.Locationid,A.Part_Number1,B.PartDesc, 
          part_category, 
          b.price,
          b.PPNI_Val,
          b.Qty ,
          All_Time_NonStck,A.Qty,b.PartNumber ,sm.partnumber1, sm.subpartnumber1,A.VehicleNumber
HAVING SUM(PPNI_Val)>0 AND A.Qty > 0
order by SUM(PPNI_Val) desc
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

const PPNIVALUE12MonthsService = async (dealerid, locationid, nonstockable, jobcardstatus, advisior) => {
  try {
    const pool = await getPool();
    const tableName = `UAD_BI_PPNI..PPNI_report_${dealerid}`;

    const advisorSQL = advisior === null || advisior === undefined ? "NULL" : `'${advisior}'`;
    const jobcardstatusSQL = jobcardstatus === null || jobcardstatus === undefined ? "NULL" : `'${jobcardstatus}'`;
    const nonstockableSQL = nonstockable === null || nonstockable === undefined ? "NULL" : `'${nonstockable}'`;


    //     const query = `
    //       select CONCAT(MONTH(dateadded), '-', YEAR(dateadded)) AS [Date] ,
    // 	    SUM(ppni_val) AS PPNI_val,
    // 	    ROUND(SUM(ppni_val) / 100000.0, 2) AS PPNI_Value 
    // 	    from ${tableName}
    // 	    where (@locationid is null or locationid = @locationid)
    // 			AND   (@Advisor is null or advisor = @advisor)
    // 			AND   (@stkable IS NULL OR All_Time_NonStck = @stkable)
    // 			AND   (@jobcard IS NULL OR JobCardStatus = @jobcard) 

    // 	    group by  YEAR(dateadded), MONTH(dateadded)
    // 	    ORDER BY YEAR(dateadded) DESC, MONTH(dateadded) DESC;
    // `
    const query = `
Declare @locationid int = ${locationid},
@advisor varchar(50) = ${advisorSQL},
@jobcard varchar(10) = ${jobcardstatusSQL},
@stkable varchar(5)  = ${nonstockableSQL}
	
;WITH T1 AS
		(
		  SELECT A.Part_Number1,C.Qty,A.Current_status,A.LocationID,A.Dealerid,A.BIGID ,A.JobLineCloseDate  
		  FROM z_scope..Create_Order_Request_TD001_${dealerid} A
		  LEFT JOIN z_scope..CurrentStock1  B ON (A.LocationID = B.LocationID)
		  LEFT  JOIN z_scope..CurrentStock2 C ON (C.Stockcode   = B.tcode AND C.PartNumber = A.Part_Number)	
		  where Type='V' and A.current_status<>'Close'
		  )
	select CONCAT(MONTH(dateadded), '-', YEAR(dateadded)) AS [Date] ,
	SUM(ppni_val) AS PPNI_val,
	ROUND(SUM(ppni_val) / 100000.0, 2) AS PPNI_Value 
	from ${tableName} P
	join T1 A on A.Bigid = P.Bigid
	where (@locationid is null or p.locationid = @locationid) 
	AND (@Advisor is null or advisor = @advisor)
	and 
	(
       @stkable IS NULL OR P.All_Time_NonStck = @stkable
	) AND
	 (
        (@jobcard IS NULL AND P.JobCardStatus IN ('OPEN','CLOSE'))
        OR
        (@jobcard IS NOT NULL AND P.JobCardStatus = @jobcard)
  ) 
	group by  YEAR(dateadded), MONTH(dateadded)
	ORDER BY YEAR(dateadded) DESC, MONTH(dateadded) DESC;`

    const result = await pool.request()
      // .input('locationid', locationid)
      // .input('stkable', nonstockable)
      // .input('jobcard', jobcardstatus)
      // .input('advisor', advisior)
      .query(query);

    return result;
  } catch (error) {
    throw new Error(`PPNIVALUE12Months failed: ${error.message}`);
  }
};


const vehicleSearchService = async (dealerid, locationid, vehicleno, alltimenonstk, filter, issued, pageno, pagesize) => {
  try {
    const pool = await getPool()
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
    const query = `
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
        CASE  WHEN co.Current_status <> 'Close'  THEN 'Not Issued' ELSE 'Issued' END AS IssueStatus,
        co.BrandID
    FROM Create_Order_Request_TD001_${dealerid} co
    LEFT JOIN substitution_master sm 
        ON sm.Brandid = co.brandid AND co.Part_Number1 = sm.partnumber1
    JOIN LocationInfo li ON li.LocationID = co.LocationID
    left JOIN Part_Master pm 
        ON li.brandid = pm.brandid AND pm.partnumber = co.Part_Number1  
    LEFT JOIN [UAD_BI_PPNI].dbo.ppni_report_${dealerid} pr
        --ON pr.Jobcard_Number = co.Jobcard_number AND pr.PartNumber = co.Part_Number1
        ON pr.Bigid = co.Bigid
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
Where LocationID = @LocationId
order by value desc
OFFSET @offset ROWS
FETCH NEXT @pagesize ROWS ONLY;
`
    // const result = await pool.request()
    //   .input('vehicleno', vehicleno)
    //   .input('LocationId',sql.Int,locationid)
    //   .input('filter', filter)
    //   .input('alltimenonstk', alltimenonstk)
    //   .input('issued', issued)
    //   .query(query);

      const result = await pool.request()
      .input('DealerId', sql.Int, dealerid)
      .input('VehicleNo', sql.VarChar(50), vehicleno)
      .input('LocationId', sql.Int, locationid)
      .input('Filter', sql.VarChar(10), filter)
      .input('AllTimeNonStk', sql.VarChar(10), alltimenonstk)
      .input('Issued', sql.VarChar(1), issued)
      .input('PageSize', sql.Int, pagesize || 1000)
      .input('PageNo', sql.Int, pageno || 1)
      .execute('dbo.sp_APP_VehicleSearch_VB');

    return result;
  } catch (error) {
    throw new Error(`vehiclesearchService failed: ${error.message}`);
  }
}

const gainerListingService = async (dealerid, locationid, partnumber) => {
  try {
    const pool = await getPool()
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

const predictiveVehicleSearchService = async (dealerid, vehicleno) => {
  try {
    const pool = await getPool()
    const query = `
        --Declare @vehicleno varchar(10) = '@vehicleno'
    	select distinct(UPPER(Vehiclenumber))as Vehiclenumber from z_scope..Create_Order_Request_TD001_${dealerid}
    	where Vehiclenumber like ('%'+@vehicleno+'%')
        `
    const result = await pool.request().input('vehicleno', sql.VarChar, vehicleno).query(query)
    return result.recordset
  } catch (error) {
    throw new Error(`predictiveVehicleSearchService failed : ${error.message}`);
  }
}

const vehicledealercheck = async (vehicleno, dealerid, locationid) => {
  const pool = await getPool()
  const query = `select * from z_scope..Create_Order_Request_TD001_${dealerid} where vehiclenumber = '${vehicleno}' and LocationId = ${locationid}`
  const result = await pool.request().query(query)
  // console.log(result.recordset);
  // returns 1 if there’s at least one row, otherwise 0
  return result.recordset.length > 0 ? 1 : 0;
}

const partfamilywiseStockColor = async (brandid, dealerid, locationid, partnumber) => {
  try {
    const pool = await getPool()
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

const vehicleScore = async (dealerid,locationid, vehiclenumber) => {
  try {
    const pool = await getPool()
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
		ON cs1.LocationID = ${locationid}--co.LocationID
	  LEFT JOIN CurrentStock2 AS cs2
		ON cs2.StockCode   = cs1.tCode
	   AND cs2.PartNumber = co.Part_Number1	
	  WHERE
		co.vehiclenumber     = '${vehiclenumber}'
		AND co.Current_status <> 'Close';
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
//     const pool = await getPool()
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

    const pool = await getPool();

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
      .input('issued', issued ?? null)
      .query(sql);

    const totalRecords = result.recordset[0]?.count ?? 0;
    const totalPages = Math.ceil(totalRecords / pageSize);
    const hasMore = page < totalPages;
    // console.log(page,totalRecords,totalPages,hasMore);

    // return page < totalPages; 
    return { page, totalRecords, totalPages, hasMore }
  } catch (err) {
    console.log(err);

    throw new Error(`vehicleSearchPagination failed: ${err.message}`);
  }
};

const vehicleSearchlogsService = async (moduleName, event, details, userid , locationid) => {
  try {
    const pool = await getPool()
    const query = `use z_scope Insert into App_Logging(ModuleName,Event,Details,CreatedBy,LocationId)
                    OUTPUT inserted.ModuleName, inserted.Event, inserted.Details, inserted.CreatedBy , inserted.LocationId
                    values(@ModuleName,@Event,@Details,@CreatedBy,@LocationId)`
    const result = await pool.request()
      .input('ModuleName', sql.VarChar, moduleName)
      .input('Event', sql.VarChar, event)
      .input('Details', sql.VarChar,JSON.stringify(details))
      .input('CreatedBy', sql.Int, userid)
      .input('LocationId', sql.Int, locationid)
      .query(query)
    return result

  } catch (error) {
    throw new Error(`vehicleSearchlogsService failed : ${error.message}`);
  }
}
const viewLogService = async (type, partnumber, vehiclenumber, from, to) => {
  const pool = await getPool()
  const query = `use [z_scope] EXEC dbo.sp_dealerapplogsView @type,@partnumber,@vehiclenumber,@from,@to`
  const result = await pool.request()
    .input('type', sql.VarChar, type)
    .input('partnumber', sql.VarChar, partnumber ?? null)
    .input('vehiclenumber', sql.VarChar, vehiclenumber ?? null)
    .input('from', sql.DateTime, from ?? null)
    .input('to', sql.DateTime, to ?? null)
    .query(query)
  return result

}

const vehicleSearchConsentService = async (vehiclenumber, dealerid, locationid, userId) => {
  try {
    const pool = await getPool()
    const query = `
     use z_scope
     insert into vehicleremark (dealerId , LocationId , vehicleno , createdby)
    values(@dealerId,@LocationId,@vehicleno,@userId)`

    const result = await pool.request()
      .input('dealerId', sql.Int, dealerid)
      .input('LocationId', sql.Int, locationid)
      .input('vehicleno', sql.VarChar, vehiclenumber)
      .input('userId', sql.Int, userId)
      .query(query)
    return result
  } catch (error) {
    throw new ApiError(500, 'Unable to log the consent')
  }
}

const versionDetailService = async()=>{
try {
    const pool = await getPool()
    const query =  `use z_scope select top 1 * from App_VersionControl order by VersionID desc`
    const result = await pool.request().query(query)
    return result.recordset
} catch (error) {
  throw new ApiError(500,error)
}
}

const appSwitcherService = async(userId)=>{
try {
    const pool = await getPool()
    const query = `use z_scope select IIF(SUM(CAST(OgsStatus AS INT))>0,1,0)IsSimsActive , IIF(SUM(CAST(SharingStatus AS INT))>0,1,0)IsGainerActive from locationinfo where dealerid  = (select top 1 DealerID from VW_SpmLocation where EmpID = @userId )`
    const result = await pool.request().input('userId',sql.Int,userId).query(query)
    return result.recordset
} catch (error) {
  throw new ApiError(500,error)
}
}

export { appSwitcherService , versionDetailService, vehicleSearchConsentService, vehicleSearchPagination, vehicleScore, partfamilywiseStockColor, groupNorms, vehicledealercheck, PPNIVALUE12MonthsService, userroleService, partInfo, reservedForVehicle, groupStock, jobCardByVehicleService, partsByJobCardService, partSubstituteDetailService, locationwisePPNIValueService, advisorwisePPNIValueService, vehiclewisePPNIValueService, partwisePPNIValueService, vehicleSearchService, gainerListingService, predictiveVehicleSearchService, vehicleSearchlogsService, viewLogService }