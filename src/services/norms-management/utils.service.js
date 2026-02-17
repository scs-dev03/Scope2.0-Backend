import {getPool } from '../../db/db.js'
const partfamilySaleservice = async (brandid,dealerid,locationid,partnumber) => {
    try {
        // console.log(brandid,dealerid,locationid,partnumber);
        
        const pool = await getPool()
        const query = `use [z_scope] EXEC sp_partfamilysale '${partnumber}',${brandid},${dealerid},${locationid}`
        const result = await pool.request().query(query)
        return result
    } catch (error) {
        throw new Error(`partfamilySaleservice failed: ${error.message}`);
    }

}


// MAX and Stock of any Location (Family)
const singlePartMaxByLocationService = async (brandid,dealerid,locationid,partnumber)=>{
try {
        const pool = getPool()
//         const query = 
//         ` use z_scope DECLARE  
//          @InputPart    VARCHAR(40) = '${partnumber}',      -- ←  input part 
//          @InputBrandID INT         =${brandid};           -- ←  input brand 
     
//         DECLARE @RowsInserted INT; 
     
//         -- 0) Drop any old temp-table 
//         IF OBJECT_ID('tempdb..#PartFamily','U') IS NOT NULL 
//          DROP TABLE #PartFamily; 
     
//         -- 1) Create a holding table: one row per (Part, BrandID) 
//         CREATE TABLE #PartFamily ( 
//          Part    VARCHAR(40), 
//          BrandID INT, 
//          --CONSTRAINT PK_PartFamily PRIMARY KEY (Part, BrandID) 
//         ); 
     
//         -- 2) Seed it with exactly your input (part, brand) 
//         INSERT INTO #PartFamily(Part, BrandID) 
//         VALUES (@InputPart, @InputBrandID); 
     
//         -- 3) Iteratively grow the family within that brand 
//         SET @RowsInserted = 1; 
//         WHILE @RowsInserted > 0 
//         BEGIN 
//             INSERT INTO #PartFamily(Part, BrandID) 
//             SELECT DISTINCT 
//                 sm.SubPartNumber1, 
//                 sm.BrandID 
//             FROM z_scope..Substitution_Master AS sm 
//             JOIN #PartFamily AS f 
//               ON sm.PartNumber1 = f.Part 
//              AND sm.BrandID    = f.BrandID 
//             WHERE NOT EXISTS ( 
//                SELECT 1 
//                FROM #PartFamily x 
//                WHERE x.Part    = sm.SubPartNumber1 
//                  AND x.BrandID = sm.BrandID 
//             ) 
        
//             UNION 
        
//             SELECT DISTINCT 
//                 sm.PartNumber1, 
//                 sm.BrandID 
//             FROM z_scope..Substitution_Master AS sm 
//             JOIN #PartFamily AS f 
//               ON sm.SubPartNumber1 = f.Part 
//              AND sm.BrandID        = f.BrandID 
//             WHERE NOT EXISTS ( 
//                SELECT 1 
//                FROM #PartFamily x 
//                WHERE x.Part    = sm.PartNumber1 
//                  AND x.BrandID = sm.BrandID 
//             ); 
        
//             SET @RowsInserted = @@ROWCOUNT; 
//         END 
        

// --select * from #PartFamily
// --select li.locationid , li.location , sum(maxvalue)as Max ,sum(cs2.Qty)as Stock ,sn.partnumber1 as maxpart, cs2.PartNumber as stockpart from Stockable_Nonstockable_TD001_${dealerid} sn
// --join LocationInfo li on li.LocationID = sn.Locationid
// --join #PartFamily pf on pf.Part = sn.partnumber1
// --join CurrentStock1 cs1 on cs1.LocationID = li.LocationID 
// --join CurrentStock2 cs2 on cs2.StockCode = cs1.tCode and cs2.PartNumber = pf.Part
// --where sn.Stockdate = (select MAX(stockdate) from Stockable_Nonstockable_TD001_${dealerid})
// --group by li.locationid , li.location , cs2.partnumber , sn.partnumber1

// select sn.Maxvalue , sn.partnumber1 
// --, case when sn.partnumber1 = sm.partnumber1 then sm.subpartnumber1 else sm.partnumber1 end as latest 
// from z_scope..Stockable_Nonstockable_TD001_${dealerid} sn
// join #PartFamily pf on pf.Part = sn.partnumber1 
// --left join Substitution_Master sm on sm.brandid = sn.BrandID and sm.partnumber1 = sn.partnumber1
// where sn.Stockdate = (select MAX(stockdate) from Stockable_Nonstockable_TD001_${dealerid}) and sn.locationid = ${locationid}
// group by  sn.Maxvalue , sn.partnumber1 --, sm.subpartnumber1 , sm.partnumber1

// select cs2.Qty,cs2.PartNumber  from #PartFamily pf 
// join z_scope..LocationInfo li on li.BrandID = pf.BrandID
// join z_scope..CurrentStock1 cs1 on li.LocationID = cs1.LocationID
// join z_scope..CurrentStock2 cs2 on cs1.tCode = cs2.StockCode and pf.Part = cs2.PartNumber
// where li.LocationID = ${locationid}
// `
const query = `
        use z_scope 
	  DECLARE 
        @InputPart VARCHAR(40) = '${partnumber}',
        @InputBrandID INT = ${brandid},
        @InputLocationID INT = ${locationid},
		@InputDealerid int = ${dealerid},
		@latestpart varchar(20);
     
	   IF OBJECT_ID('tempdb..#Part','U') IS NOT NULL
            DROP TABLE #Part;

create table #part(
part varchar(40)
)
select @latestpart = subpartnumber1 from Substitution_Master 
where brandid = @InputBrandID and (partnumber1 = @InputPart or subpartnumber1 = @InputPart)

insert into #part
select partnumber1 from substitution_master where brandid = @InputBrandID and subpartnumber1= @latestpart
union 
select ISNULL(@latestpart,@InputPart)  


select sn.Maxvalue , sn.partnumber1 
from z_scope..Stockable_Nonstockable_TD001_${dealerid} sn
join #part pf on pf.part = sn.partnumber1 
where sn.Stockdate = (select MAX(stockdate) from Stockable_Nonstockable_TD001_${dealerid} where locationid = @InputLocationID  and addedby <> 7) and sn.locationid = @InputLocationID and addedby <> 7
group by  sn.Maxvalue , sn.partnumber1

select cs2.Qty,cs2.PartNumber  from #part pf 
join z_scope..CurrentStock1 cs1 on  cs1.LocationID  = @InputLocationID
join z_scope..CurrentStock2 cs2 on cs1.tCode = cs2.StockCode and pf.part = cs2.PartNumber
    `
        const result = await pool.request().query(query)
        return result
} catch (error) {
    throw new Error(`singlePartMaxByLocationService failed: ${error.message}`)
}
}

const partFamilyService = async(partnumber , brandid)=>{
try {
        const pool = await getPool()
        const query =     ` DECLARE 
                            @InputPart    VARCHAR(40) = '${partnumber}',   -- ← your input part
                            @InputBrandID INT         = ${brandid};               -- ← your input brand
                        
                        DECLARE @RowsInserted INT;
                        
                        -- 0) Drop any old temp‐table
                        IF OBJECT_ID('tempdb..#PartFamily','U') IS NOT NULL
                            DROP TABLE #PartFamily;
                        
                        -- 1) Create a holding table: one row per (Part, BrandID)
                        CREATE TABLE #PartFamily (
                            Part    VARCHAR(40),
                            BrandID INT,
                            CONSTRAINT PK_PartFamily PRIMARY KEY (Part, BrandID)
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
                            FROM z_scope..Substitution_Master AS sm
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
                            FROM z_scope..Substitution_Master AS sm
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
                        
                        select * from #partfamily
                        -- 4) Pull full details for every (Part, BrandID) found
                         SELECT  
                            pm.PartNumber1,
    						CASE when pf.part = sm.partnumber then sm.subpartnumber else pf.part end as LatestPartNumber,
                            pm.PartDesc,
                            pm.LandedCost,
                            pm.MRP,
                            pm.PartID,
                            pm.Category,
                            pm.MOQ,
                            pm.BrandID
                        FROM z_scope..Part_Master pm
                        JOIN #PartFamily pf
                          ON pm.PartNumber1 = pf.Part
                         AND pm.BrandID     = pf.BrandID
    					 JOIN z_scope..Substitution_Master sm 
    					 on pf.BrandID = sm.brandid
    					 and pf.part = sm.partnumber1
                        ORDER BY pm.PartNumber1, pm.BrandID;
                        
                        -- 5) Clean up
                        DROP TABLE #PartFamily;`
    
            const result = await pool.request().query(query)  
            // console.log(`part`,result.recordset);
            
            return result  
} catch (error) {
    throw new Error(`partFamilyService Failed : ${error.message}`);
}                
}
const partBrandMapping = async(brandid,partnumber)=>{
try {
        const pool = await getPool()
        const query = `use z_scope select * from part_master where partnumber1 = '${partnumber}' and brandid = ${brandid}`
        const result = await pool.request().query(query)
        if(result.recordset.length > 0){
            return 1
        }
        return 0
} catch (error) {
    throw new Error(`partBrandMapping failed: ${error.message}`);
}
}
export {partfamilySaleservice,singlePartMaxByLocationService,partFamilyService,partBrandMapping}