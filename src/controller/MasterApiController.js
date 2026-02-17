import sql from 'mssql'
import { getPool } from '../db/db.js'
import { clusterByBrandService, dealerByClusterService, getUserService, jobcardDate, lastOrderValue, multiAdvisorService, multiDealerService, multiLocationService, partQualityService, ppniValue, SixMonthLocationwiseSaleValue, snstockValue, stockQty, stockValue, tranferTypeService } from '../services/MasterApi/MasterApiService.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';

const getBrands = async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool
      .request()
      .query('use z_scope select bigid , vcbrand from Brand_master')
    res.status(200).json(result.recordset)
  } catch (error) {
    res.status(500).json(error)
  }
}
const getDealers = async (req, res) => {
  try {
    const pool = getPool();
    const { brandid } = req.body;
    const result = await pool.request().input('brandid', sql.Int, brandid).query(`use z_scope select distinct(dealerid),dealer from locationinfo where brandid = @brandid and dealerStatus = 1 `)
    res.status(200).json(result.recordset)
  } catch (error) {
    res.status(500).json(error)
    console.log(error);
  }
}

const getLocation = async (req, res) => {
  try {
    const pool = getPool();
    const { dealerid , userId} = req.body;
    const adminLocationQuery = `use z_scope select locationid,location from locationinfo where dealerid = @dealerid and status = 1 and ogsStatus = 1 order by location`
    const spmLocationQuery = `use z_scope select sl.locationid , sl.location from VW_SpmLocation sl
                              JOIN LocationInfo li on li.LocationID = sl.LocationID
                              where EmpID = @userId and li.OgsStatus = 1 and li.Status = 1 order by sl.location`
    let result
    if(userId){
    // const usertypeQuery = `use z_scope select type from AdminMaster_GEN where bintId_Pk = @userId`
    // const userType = await pool.request().input('userId', sql.Int, userId).query(usertypeQuery)
       result = await pool.request().input('userId', sql.Int, userId).query(spmLocationQuery)
   }else{
     result = await pool.request().input('dealerid', sql.Int, dealerid).query(adminLocationQuery)
   }
    res.status(200).json(result.recordset)
  } catch (error) {
    res.status(500).json(error)
    console.log(error);
  }
}

const getWorkspace = async (req, res) => {
  try {
    const pool = getPool();
    // const {dealerid} = req.body;
    const result = await pool.request().query(`select WorkspaceID, Workspace from UAD_BI..SBS_DBS_WorkspaceMaster`)
    res.status(200).json(result.recordset)
  } catch (error) {
    res.status(500).json(error)
    console.log(error);
  }
}
const getDashboard = async (req, res) => {
  try {
    const pool = getPool();
    // const {dealerid} = req.body;
    const result = await pool.request().query(`select tcode , Dashboard from DB_DASHboardmaster where status = 1`)
    res.status(200).json(result.recordset)
  } catch (error) {
    res.status(500).json(error)
    console.log(error);
  }
}
const partNature = async (req, res) => {
  try {
    const pool = await getPool()
    const query = `select  tCode , Description  from z_scope..PartNatureMaster`
    const result = await pool.request().query(query)
    res.status(200).json({ Data: result.recordset })
  } catch (error) {
    res.status(500).json({ Error: error.message })
  }
}
const seasonal = async (req, res) => {
  try {
    const pool = await getPool()
    const query = `use [z_scope] select tCode , Description  from seasonalmaster`
    const result = await pool.request().query(query)
    res.status(200).json({ Data: result.recordset })
  } catch (error) {
    res.status(500).json({ Error: error.message })
  }
}
const model = async (req, res) => {
  try {
    const pool = await getPool()
    const { brandid } = req.body
    const query = `select ModelID , Model  from ModelMaster where Brandid = ${brandid}`
    const result = await pool.request().query(query)
    res.status(200).json({ Data: result.recordset })
  } catch (error) {
    res.status(500).json({ Error: error.message })
  }
}
const partType = async (req, res) => {
  try {
    const pool = await getPool()
    const query = `select parttypeid , Description from z_scope..parttypemaster`
    const result = await pool.request().query(query)
    res.status(200).json({ Data: result.recordset })
  } catch (error) {
    res.status(500).json({ Error: error.message })
  }
}
const pagination = async (req, res) => {
  try {
    const pool = await getPool(); // Ensure the connection is awaited
    const { pageno, pagelimit } = req.params
    const page = parseInt(req.query.page) || pageno
    const pageSize = parseInt(req.query.pageSize) || pagelimit;
    const offset = (page - 1) * pageSize;

    const totalRecordsQuery = await pool.request().query(`select count(locationid)count from locationinfo`);
    const totalRecords = totalRecordsQuery.recordset[0].count;
    const totalPages = Math.ceil(totalRecords / pageSize);
    // console.log(totalRecords,totalPages);


    // 🟢 Fix pagination query (ORDER BY before OFFSET)
    const dataQuery = await pool.request().query(`
            select * from locationinfo 
            order by locationid
            OFFSET ${offset} ROWS
            FETCH NEXT ${pageSize} ROWS ONLY;
        `);

    res.json({
      currentPage: page,
      pageSize,
      totalRecords,
      totalPages,
      hasMore: page < totalPages,
      data: dataQuery.recordset
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
};

const userInfo = async (req, res) => {
  try {
    const pool = await getPool()
    const { token, usertype } = req.body

    //   console.log(token , usertypehj);

    if (!token || !usertype) {
      return res.status(400).json({ message: `token and usertype both are required` })
    }
    if (usertype === 'a') {
      const query = `use [z_scope] select bintid_pk , concat(vcfirstname , ' ', vcLastname)as username , designation,vcphoto from adminmaster_gen where bintId_Pk=z_scope.dbo.f_Decryption('${token}') `

      const result = await pool.request().query(query)
      res.status(200).json({ Data: result.recordset })
    }
    else {
      const query = `use [z_scope] SELECT distinct li.BrandID, dur.dealerid , dur.locationid , concat(amg.vcfirstname , ' ', amg.vcLastname)as username ,li.location,amg.bintId_pk as userId,vcphoto FROM AdminMaster_GEN amg
    join Dealer_User_Relation dur on amg.bintid_pk = dur.userid
    join locationinfo li on dur.locationid = li.LocationID
    where bintId_Pk=z_scope.dbo.f_Decryption('${token}') `
      const result = await pool.request().query(query);
      const completedata = result.recordset;
      const vcphoto = completedata.length > 0 ? completedata[0].vcphoto : null;
      const data = completedata.map(({ vcphoto, ...rest }) => rest);
      res.status(200).json({ vcphoto, Data: data });
    }
  } catch (error) {
    res.status(500).json({ Error: error.message })
  }
}

const homePageData = async (req, res) => {
  const { locationId, dealerid } = req.body;
  if (!locationId || !dealerid) {
    return res.status(400).json({ message: `locationId and dealerid are required` });
  }

  try {
    const pool = await getPool();

    // Define all static queries
    // const stockquery = `SELECT SUM(qty) AS StockQty, AddedDate FROM [z_scope].dbo.CurrentStock1 cs1
    //                     JOIN CurrentStock2 cs2 ON cs1.tCode = cs2.StockCode
    //                     WHERE LocationID = ${locationId}
    //                     GROUP BY AddedDate`;

    const stockquery = ` use [z_scope]
                          SELECT SUM(qty) AS StockQty, AddedDate FROM [z_scope].dbo.CurrentStock1 cs1
                          JOIN CurrentStock2 cs2 ON cs1.tCode = cs2.StockCode
                          join LocationInfo li on cs1.LocationID = li.LocationID
                          join Part_Master pm on pm.brandid = li.brandid and cs2.PartNumber = pm.partnumber1
                          WHERE cs1.LocationID = ${locationId} and pm.PartTypeID = 1 --Sparepart
                          GROUP BY AddedDate`

    const stockvaluequery = `SELECT SUM((cs2.Qty * pm.landedcost)) AS stockvalue FROM [z_scope].dbo.CurrentStock1 cs1
                               JOIN [z_scope].dbo.CurrentStock2 cs2 ON cs2.StockCode = cs1.tCode
                               JOIN [z_scope].dbo.locationinfo li ON li.LocationID = cs1.LocationID
                               JOIN [z_scope].dbo.Part_Master pm ON pm.brandid = li.BrandID AND cs2.PartNumber = pm.partnumber
                               WHERE cs1.locationid = ${locationId} and pm.PartTypeID = 1`;

    const ppnivaluequery = `SELECT SUM(PPNI_Val) AS PPNIValue FROM [UAD_BI_PPNI].dbo.PPNI_report_${dealerid} ppni
                              join z_scope..LocationInfo li on ppni.LocationID = li.LocationID
                              join z_scope..Part_Master pm on pm.brandid = li.brandid and ppni.PartNumber = pm.partnumber1
                              WHERE ppni.locationid = ${locationId} and pm.PartTypeID = 1`;

    // const snstockvaluequery = `use [z_scope] ;WITH LatestSN AS (
    //                             SELECT sn.partnumber1 , sn.Locationid , sn.Maxvalue FROM stockable_nonstockable_td001_${dealerid} sn
    // 					                  join Part_Master pm on pm.brandid = sn.Brandid and sn.partnumber1 = pm.partnumber1 
    //                             WHERE sn.locationid = ${locationId} and pm.PartTypeID = 1
    //                             AND sn.stockdate = (SELECT MAX(stockdate) FROM stockable_nonstockable_td001_${dealerid} WHERE locationid = ${locationId})
    //                           )
    //                           SELECT  
    //                               SUM(CASE WHEN sn.MaxValue IS NULL OR sn.MaxValue = 0 THEN 1 ELSE 0 END) AS NonStockable,
    //                               SUM(CASE WHEN sn.MaxValue IS NOT NULL AND sn.MaxValue > 0 THEN 1 ELSE 0 END) AS Stockable,
    //                               SUM(CASE WHEN sn.MaxValue IS NOT NULL AND sn.MaxValue > 0 THEN ISNULL(cs2.Qty, 0) * ISNULL(pm.landedcost, 0) ELSE 0 END) AS StockableValue,
    //                               SUM(CASE WHEN sn.MaxValue IS NULL OR sn.MaxValue = 0 THEN ISNULL(cs2.Qty, 0) * ISNULL(pm.landedcost, 0) ELSE 0 END) AS NonStockableValue
    //                           FROM CurrentStock2 cs2
    //                           INNER JOIN CurrentStock1 cs1 ON cs2.StockCode = cs1.tCode
    //                           LEFT JOIN LatestSN sn ON cs1.LocationID = sn.LocationID AND cs2.PartNumber = sn.partnumber1
    //                           INNER JOIN Dealer_Workshop_Master li ON cs1.LocationID = li.bigid
    //                           LEFT JOIN Part_Master pm ON pm.brandid = li.BrandID AND cs2.PartNumber = pm.partnumber
    //                           WHERE cs1.LocationID = ${locationId}`;

    const snstockvaluequery = `
                          use [z_scope] 
declare @date datetime = (select MAX(Stockdate) from Stockable_Nonstockable_TD001_${dealerid} where Locationid = ${locationId})
;WITH Stock AS (
SELECT  pm.brandid,cs1.LocationID, cs2.PartNumber ,
CASE when cs2.PartNumber = sm.partnumber1 then sm.subpartnumber1 else cs2.PartNumber end as Latest, cs2.Qty , pm.landedcost
FROM [z_scope].dbo.CurrentStock1(NOLOCK) cs1
JOIN [z_scope].dbo.CurrentStock2(NOLOCK) cs2 ON cs2.StockCode = cs1.tCode
JOIN [z_scope].dbo.locationinfo(NOLOCK) li ON li.LocationID = cs1.LocationID
left join Substitution_Master(NOLOCK) sm on sm.brandid = li.BrandID and sm.partnumber1 = cs2.PartNumber
JOIN Part_Master(NOLOCK) pm ON pm.brandid = li.BrandID AND cs2.PartNumber = pm.partnumber and pm.PartTypeID = 1
WHERE cs1.locationid = ${locationId} 
),
sn as (
select sn.Locationid , sn.partnumber1 ,sn.Maxvalue, CASE when sn.partnumber1 = sm.partnumber1 then sm.subpartnumber1 else sn.partnumber1 end as Latest
from Stockable_Nonstockable_TD001_${dealerid}(NOLOCK) sn
--join Dealer_Workshop_Master(NOLOCK) dwm on dwm.bigid = sn.Locationid and sn.Stockdate = dwm.MaxDate
left join Substitution_Master(NOLOCK) sm on sm.brandid = sn.BrandID and sm.partnumber1 = sn.partnumber1
JOIN Part_Master(NOLOCK) pm ON pm.brandid = sn.BrandID AND sn.PartNumber1 = pm.partnumber1 and pm.PartTypeID = 1
where sn.Locationid = ${locationId} and sn.Stockdate = @date and Maxvalue >0
)
SELECT  SUM(s.Qty * s.landedcost)as StockableValue
FROM Stock s 
JOIN sn on sn.latest = s.latest
      `
    const lastorderValuequery = `SELECT scsorderno, SUM(finalorderqty) AS QTY, SUM(finalorderval) AS Value, addeddate
                                  FROM [10.10.152.17].[z_scope].dbo.ogs_orderdata_td001_${dealerid}
                                  WHERE addeddate = (
                                    SELECT MAX(addeddate) FROM [10.10.152.17].[z_scope].dbo.ogs_orderdata_td001_${dealerid}
                                    WHERE locationid = ${locationId}
                                  )
                                  AND locationid = ${locationId}
                                  GROUP BY scsorderno, addeddate`;

    const jobcardDatequery = `SELECT MAX(Close_Date) joblineupdatedate, MAX(Final_Close_Date) jobcardcloseddate
                                FROM [z_scope].dbo.create_order_request_td001_${dealerid} 
                                WHERE locationid = ${locationId}`;

    // Run all static queries in parallel
    const [
      stock,
      stockValue,
      ppniValue,
      snstockvalue,
      lastOrderValue,
      lastjobcard
    ] = await Promise.all([
      pool.request().query(stockquery),
      pool.request().query(stockvaluequery),
      pool.request().query(ppnivaluequery),
      pool.request().query(snstockvaluequery),
      pool.request().query(lastorderValuequery),
      pool.request().query(jobcardDatequery)
    ]);
    const a = snstockvalue.recordset[0].StockableValue
    const b = stockValue.recordset[0].stockvalue

    // Run dynamic SQL separately (not safe to include in Promise.all)
    const SixMonthLocationwiseSaleValueQuery = `
        DECLARE @ls INT = 6, @st INT = 1, @Columnsold NVARCHAR(MAX) = '', @SumColumns NVARCHAR(MAX) = '',
                @d1 VARCHAR(50), @d2 VARCHAR(50), @d3 VARCHAR(50), @Dealerid INT, @Dealerold NVARCHAR(MAX), @sql NVARCHAR(MAX);
  
        WHILE @st <= @ls
        BEGIN
            SET @d1 = CONCAT(LEFT(DATENAME(MONTH, DATEADD(MONTH, -@st, GETDATE())), 3), '_', RIGHT(YEAR(DATEADD(MONTH, -@st, GETDATE())), 2), '_WS');
            SET @d2 = CONCAT(LEFT(DATENAME(MONTH, DATEADD(MONTH, -@st, GETDATE())), 3), '_', RIGHT(YEAR(DATEADD(MONTH, -@st, GETDATE())), 2), '_CS');
            SET @d3 = CONCAT(LEFT(DATENAME(MONTH, DATEADD(MONTH, -@st, GETDATE())), 3), '_', RIGHT(YEAR(DATEADD(MONTH, -@st, GETDATE())), 2), '_P');
            SET @Columnsold = CONCAT(@Columnsold, CASE WHEN @Columnsold = '' THEN '' ELSE ', ' END, QUOTENAME(@d1), ', ', QUOTENAME(@d2), ', ', QUOTENAME(@d3));
            SET @SumColumns = CONCAT(@SumColumns,
                CASE WHEN @SumColumns = '' THEN '' ELSE ', ' END,
                'CAST(ROUND(SUM(ds.' + QUOTENAME(@d1) + ' * pm.landedcost) / 100000.0, 2) AS DECIMAL(10,2)) AS [' + @d1 + '_Value],',
                'CAST(ROUND(SUM(ds.' + QUOTENAME(@d2) + ' * pm.landedcost) / 100000.0, 2) AS DECIMAL(10,2)) [' + @d2 + '_Value],',
                'CAST(ROUND(SUM(ds.' + QUOTENAME(@d3) + ' * pm.landedcost) / 100000.0, 2) AS DECIMAL(10,2)) [' + @d3 + '_Value]');
            SET @st += 1;
        END;
  
        SELECT @Dealerid = dealerid FROM locationinfo WHERE locationid = ${locationId};
        SET @Dealerold = '[z_scope].dbo.Dealer_Sale_Upload_Old_TD001_' + CAST(@Dealerid AS NVARCHAR(10));
  
        SET @sql = '
        SELECT ' + @SumColumns + '
        FROM ' + @Dealerold + ' ds
        JOIN [z_scope].dbo.LocationInfo li ON li.LocationID = ds.LocationId
        LEFT JOIN [z_scope].dbo.part_master pm ON pm.brandid = li.BrandID AND ds.PartNumber1 = pm.partnumber1 and pm.parttypeid = 1
        WHERE li.locationid = ${locationId}';
        EXEC sp_executesql @sql;
      `;

    // const SixMonthLocationwiseSaleValue = await pool.request().query(SixMonthLocationwiseSaleValueQuery);

    res.status(200).json({
      StockQty: stock.recordset,
      StockValue: stockValue.recordset,
      PPNIValue: ppniValue.recordset,
      SNStockValue: [{ StockableValue: a, NonStockableValue: b - a }],
      lastOrderDetails: lastOrderValue.recordset,
      JobCardDate: lastjobcard.recordset,
      // SixMonthSaleValue: SixMonthLocationwiseSaleValue.recordset
    });

  } catch (error) {
    console.error("Error in homePageData:", error);
    res.status(500).json({ message: error.message });
  }
};

const latestDates = async (req, res) => {
  try {
    const pool = await getPool();
    const { locationid, dealerid } = req.body;

    if (!locationid || !dealerid) {
      return res.status(400).json({ message: 'locationid and dealerid are required' });
    }

    // Validate dealerid to be numeric and safe
    if (isNaN(dealerid)) {
      return res.status(400).json({ message: 'Invalid dealerid' });
    }

    // const tableName = `ppni_report_${dealerid}`;

    // const query = `
    //   USE [UAD_BI_PPNI];

    //   WITH latest_stock_date AS (
    //     SELECT TOP 1 latest_stock_date FROM ${tableName}
    //     WHERE locationid = @locationid
    //     ORDER BY latest_stock_date DESC
    //   ),
    //   latest_jobline AS (
    //     SELECT TOP 1 Joblineclosedate FROM ${tableName}
    //     WHERE locationid = @locationid
    //     ORDER BY Joblineclosedate DESC
    //   ),
    //   latest_jobcard AS (
    //     SELECT TOP 1 Jobcardclosedate FROM ${tableName}
    //     WHERE locationid = @locationid
    //     ORDER BY Jobcardclosedate DESC
    //   )

    //   SELECT 'stock' AS source, latest_stock_date AS latest_date FROM latest_stock_date
    //   UNION
    //   SELECT 'jobline' AS source, Joblineclosedate AS latest_date FROM latest_jobline
    //   UNION
    //   SELECT 'jobcard' AS source, Jobcardclosedate AS latest_date FROM latest_jobcard;
    // `;
    const query = `
      select StockDate from z_scope..currentstock1 where locationid = ${locationid}
      select MAX(joblineclosedate)as JoblineCloseDate from z_scope..create_order_request_td001_${dealerid} where locationid = ${locationid}
      select MAX(final_close_date)as JobCardCloseDate from z_scope..create_order_request_td001_${dealerid} where locationid = ${locationid}
    `
    const result = await pool.request()
      .input('locationid', sql.Int, locationid)
      .query(query);
    // console.log(result.recordsets);

    res.status(200).json({
      Data: result.recordsets
    });

  } catch (error) {
    res.status(500).json({ Error: error.message });
  }
};

const getUserModules = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const pool = await getPool();

    const result = await pool.request()
      .input("userId", sql.Int, userId)
      .query(` use [z_scope]
        select ad.bintId_Pk as userId,
               ad.roleID as roleId,
               rm.module_id as moduleId,
               mm.parentId,
               mm.module_name as label,
               mm.module_route as route,
               mm.Sequence as [order],
               mm.Type as type,
               mm.Icon as icon,
               mm.badge,
               mm.view1,
               mm.edit1,
               mm.add1,
               mm.delete1,
               mm.id
        from AdminMaster_GEN ad
        inner join role_module_mapping rm on ad.roleID = rm.role_id
        inner join Module_Master mm on rm.module_id = mm.id
        where ad.bintId_Pk = @userId
      `);

    const modules = result.recordset;
    const accessibleRoutes = modules
      .map(m => m.route)
      .filter(r => r);
    // Step 2: Load all modules (for parent lookups)
    const allModulesResult = await pool.request().query(`
      use [z_scope]
      select id, parentId, module_name as label, module_route as route,
             Type as type,Icon as icon, Sequence as [order], badge,
             view1, edit1, add1, delete1
            from Module_Master
    `);

    const allModules = allModulesResult.recordset;
    const moduleMap = new Map(allModules.map(m => [m.id, m]));

    const needed = new Map();
    function addWithParents(moduleId) {
      let current = moduleMap.get(moduleId);
      while (current) {
        needed.set(current.id, current);
        if (current.parentId === 0) break;
        current = moduleMap.get(current.parentId);
      }
    }

    for (const m of modules) {
      addWithParents(m.moduleId);
    }

    function buildTree(parentId = 0, visited = new Set()) {
      const children = [...needed.values()].filter(m => m.parentId === parentId);

      return children
        .sort((a, b) => a.order - b.order)
        .map(m => {
          if (visited.has(m.id)) {
            console.warn(`Cycle detected at module ${m.id} (${m.label}), skipping`);
            return { ...m, children: [] };
          }

          const newVisited = new Set(visited);
          newVisited.add(m.id);

          return {
            id: m.id,
            label: m.label,
            type: m.type,
            route: m.route,
            icon: m.icon,
            order: m.order,
            badge: m.badge,
            roles: {
              view: m.view1,
              add: m.add1,
              edit: m.edit1,
              delete: m.delete1
            },
            children: buildTree(m.id, newVisited)
          };
        });
    }

    const tree = buildTree(0);
    // console.log("Final sidebar tree built with", tree.length, "top-level nodes");
    return res.json({ tree, accessibleRoutes });

  } catch (err) {
    // console.error("Error in getUserModules:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// const spmhomepage = async (req,res)=>{
//   const { locationId, dealerid } = req.body;
//   if (!locationId || !dealerid) {
//     return res.status(400).json({ message: `locationId and dealerid are required` });
//   }

//   const [data, data2, data3, data4, data5, data6 , data7] = await Promise.all([
//             stockQty(locationId),
//             stockValue(locationId),
//             ppniValue(dealerid,locationId),
//             snstockValue(dealerid,locationId),
//             lastOrderValue(dealerid,locationId),
//             jobcardDate(dealerid,locationId),
//             SixMonthLocationwiseSaleValue(dealerid,locationId)
//         ]);

// }

const spmhomepage = async (req, res) => {
  const { locationId, dealerid } = req.body;
  if (!locationId || !dealerid) {
    return res.status(400).json({ message: `locationId and dealerid are required` });
  }

  const t = () => performance.now();
  const times = [];

  try {
    const s1 = t(); const p1 = stockQty(locationId)
      .finally(() => times.push({ label: 'stockQty', ms: +(t() - s1).toFixed(2) }));

    const s2 = t(); const p2 = stockValue(locationId)
      .finally(() => times.push({ label: 'stockValue', ms: +(t() - s2).toFixed(2) }));

    const s3 = t(); const p3 = ppniValue(dealerid, locationId)
      .finally(() => times.push({ label: 'ppniValue', ms: +(t() - s3).toFixed(2) }));

    const s4 = t(); const p4 = snstockValue(dealerid, locationId)
      .finally(() => times.push({ label: 'snstockValue', ms: +(t() - s4).toFixed(2) }));

    const s5 = t(); const p5 = lastOrderValue(dealerid, locationId)
      .finally(() => times.push({ label: 'lastOrderValue', ms: +(t() - s5).toFixed(2) }));

    const s6 = t(); const p6 = jobcardDate(dealerid, locationId)
      .finally(() => times.push({ label: 'jobcardDate', ms: +(t() - s6).toFixed(2) }));

    const s7 = t(); const p7 = SixMonthLocationwiseSaleValue(dealerid, locationId)
      .finally(() => times.push({ label: 'SixMonthLocationwiseSaleValue', ms: +(t() - s7).toFixed(2) }));

    const [data, data2, data3, data4, data5, data6, data7] = await Promise.allSettled([p1, p2, p3, p4, p5, p6, p7]);

    times.sort((a, b) => b.ms - a.ms);
    // console.table(times);
    // console.log('Slowest:', times[0]);

    return res.status(200).json({
      StockQty: data.value,
      StockValue: data2.value,
      PPNIValue: data3.value,
      SNStockValue: data4.value,
      lastOrderDetails: data5.value,
      JobCardDate: data6.value,
      SixMonthSaleValue: data7.value
    });
  } catch (err) {
    console.error('Error in spmhomepage:', err);
    return res.status(500).json({ message: err.message });
  }
};

const ordertype = async (req, res) => {
  try {
    const pool = await getPool()
    const query = `use z_scope select Id,Name from ordertypemaster`
    const result = await pool.request().query(query)
    res.status(200).json(new ApiResponse(200, result.recordset, `Data Fetched Successfully`))
  } catch (error) {
    throw new ApiError(500, 'Unable to Get Ordertype', [error.message])
  }
}

const jobtype = async (req, res) => {
  try {
    const pool = await getPool()
    const query = `use z_scope select bigid Id,jobcart_type Jobtype from Job_Card_Type where status = 1`
    const result = await pool.request().query(query)
    res.status(200).json(new ApiResponse(200, result.recordset, `Data Fetched Successfully`))
  } catch (error) {
    throw new ApiError(500, 'Unable to Get Jobtype', [error.message])
  }
}

const hsncode = async (req, res) => {
  try {
    const pool = await getPool()
    const query = `use z_scope select tcode , description from hsnmaster`
    const result = await pool.request().query(query)
    res.status(200).json(new ApiResponse(200, result.recordset, `Data Fetched Successfully`))
  } catch (error) {
    res.status(500).json(500, 'Unable to Get HSNCode', [error.message])
  }
}

function format(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  const s = arr.map(v => String(v).trim()).filter(Boolean).join(',');
  return s ? `${s.replace(/'/g, "''")}` : null;
}

const multiDealer = async (req, res) => {
  try {
    const { BrandIds } = req.body
    if (!BrandIds) {
      return res.status(400).json(new ApiError(400, `BrandIds are required`))
    }
    const formattedBrandIds = format(BrandIds);

    const result = await multiDealerService(formattedBrandIds)
    res.status(200).json(new ApiResponse(200, result))
  } catch (error) {
    res.status(500).json(new ApiError(error.statusCode || 500, error.message))
  }
}
const multiLocation = async (req, res) => {
  try {
    const { DealerIds } = req.body
    if (!DealerIds) {
      return res.status(400).json(new ApiError(400, `DealerIds are required`))
    }
    const formattedDealerIds = format(DealerIds);

    const result = await multiLocationService(formattedDealerIds)
    res.status(200).json(new ApiResponse(200, result))
  } catch (error) {
    res.status(500).json(new ApiError(error.statusCode || 500, error.message))
  }
}
const multiAdvisor = async (req, res) => {
  try {
    const { LocationIds } = req.body
    if (!LocationIds) {
      return res.status(400).json(new ApiError(400, `LocationIds are required`))
    }
    const formattedLocationIds = format(LocationIds);

    const result = await multiAdvisorService(formattedLocationIds)
    res.status(200).json(new ApiResponse(200, result))
  } catch (error) {
    res.status(500).json(new ApiError(error.statusCode || 500, error.message))
  }
}
const getUser = async (req, res) => {
  try {
    const result = await getUserService()
    res.status(200).json(new ApiResponse(200, result))
  } catch (error) {
    res.status(500).json(new ApiError(500, error.message))
  }
}

const partQuality = async (req, res) => {
  try {
    const result = await partQualityService()
    res.status(200).json(new ApiResponse(200, result))
  } catch (error) {
    res.status(500).json(new ApiError(500, error.message))
  }
}

const tranferType = async (req, res) => {
  try {
    const result = await tranferTypeService()
    res.status(200).json(new ApiResponse(200, result))
  } catch (error) {
    res.status(500).json(new ApiError(500, error.message))
  }
}

const clusterByBrand = async (req, res) => {
  try {
    const { BrandId } = req.body
    const result = await clusterByBrandService(BrandId)
    res.status(200).json(new ApiResponse(200, result))
  } catch (error) {
    res.status(500).json(new ApiError(500, error.message))
  }
}

const dealerByCluster = async (req, res) => {
  try {
    const { ClusterCode } = req.body
    const result = await dealerByClusterService(ClusterCode)
    res.status(200).json(new ApiResponse(200, result))
  } catch (error) {
    res.status(500).json(new ApiError(500, error.message))
  }
}
export { hsncode, jobtype, ordertype, spmhomepage, pagination, homePageData, getBrands, getDealers, getLocation, getWorkspace, getDashboard, partNature, model, seasonal, partType, userInfo, latestDates, getUserModules, multiDealer, multiLocation, multiAdvisor, getUser, partQuality, tranferType ,clusterByBrand , dealerByCluster}