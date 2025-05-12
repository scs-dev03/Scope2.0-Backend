import sql from 'mssql'
import { getPool1 ,getPool2} from '../db/db.js'

const getBrands = async(req,res)=>{
    try {
        const pool = getPool2();
        const result = await pool
        .request()
        .query('use z_scope select bigid , vcbrand from Brand_master')
        res.status(200).json(result.recordset)
    } catch (error) {
        res.status(500).json(error)
    }
}
const getDealers =  async(req,res)=>{
    try {
        const pool = getPool2();
        const {brandid} = req.body;
        const result = await pool.request().input('brandid',sql.Int,brandid).query(` use z_scope select distinct(dealerid),dealer from locationinfo where brandid = @brandid`)
        res.status(200).json(result.recordset)
    } catch (error) {
        res.status(500).json(error)
        console.log(error);
    }
}
const getLocation = async(req,res)=>{
    try {
        const pool = getPool2();
        const {dealerid} = req.body;
        const result = await pool.request().input('dealerid',sql.Int,dealerid).query(`use z_scope select locationid,location from locationinfo where dealerid = @dealerid and status = 1 and ogsStatus = 1 order by location`)
        res.status(200).json(result.recordset)
    } catch (error) {
        res.status(500).json(error)
        console.log(error);
    }
}
const getWorkspace = async(req,res)=>{
    try {
        const pool = getPool1();
        // const {dealerid} = req.body;
        const result = await pool.request().query(`select WorkspaceID, Workspace from UAD_BI..SBS_DBS_WorkspaceMaster`)
        res.status(200).json(result.recordset)
    } catch (error) {
        res.status(500).json(error)
        console.log(error);
    }
}
const getDashboard = async(req,res)=>{
    try {
        const pool = getPool2();
        // const {dealerid} = req.body;
        const result = await pool.request().query(`select tcode , Dashboard from DB_DASHboardmaster where status = 1`)
        res.status(200).json(result.recordset)
    } catch (error) {
        res.status(500).json(error)
        console.log(error);
    }
}
const partNature = async(req,res)=>{
    try {
         const pool = await getPool2()
         const query = `select  tCode , Description  from PartNatureMaster`
         const result = await pool.request().query(query)
         res.status(200).json({Data:result.recordset})
    } catch (error) {
        res.status(500).json({Error:error.message})
    }
    }
const seasonal = async(req,res)=>{
    try {
         const pool = await getPool2()
         const query = `use [z_scope] select tCode , Description  from seasonalmaster`
         const result = await pool.request().query(query)
         res.status(200).json({Data:result.recordset})
    } catch (error) {
        res.status(500).json({Error:error.message})
    }
    }
const model = async(req,res)=>{
    try {
         const pool = await getPool2()
         const {brandid} = req.body
         const query = `select ModelID , Model  from ModelMaster where Brandid = ${brandid}`
         const result = await pool.request().query(query)
         res.status(200).json({Data:result.recordset})
    } catch (error) {
        res.status(500).json({Error:error.message})
    }
    }
const partType = async(req,res)=>{
try {
        const pool = await getPool2()
        const query = `select parttypeid , Description from parttypemaster`
        const result = await pool.request().query(query)
        res.status(200).json({Data:result.recordset})
} catch (error) {
    res.status(500).json({Error:error.message})
}
}
// const getMAX = async (req, res) => {
//     try {
//         const pool = await getPool1(); // Ensure the connection is awaited

//         const page = parseInt(req.query.page) || 1;
//         const pageSize = parseInt(req.query.pageSize) || 10;
//         const offset = (page - 1) * pageSize;

//         const totalRecordsQuery = await pool.request().query(`
//             SELECT COUNT(*) AS count FROM (
//                 SELECT DISTINCT 
//                     sn.Brandid, 
//                     sn.Dealerid, 
//                     sn.locationid, 
//                     sn.partnumber, 
//                     pm.partdesc, 
//                     pm.category, 
//                     pm.mrp, 
//                     pm.moq, 
//                     sn.Maxvalue
//                 FROM stockable_nonstockable_td001_20208 sn
//                 JOIN Part_Master pm ON pm.partnumber = sn.partnumber
//                 WHERE stockdate = '2025-02-01 00:00:00'  
//                  -- AND sn.locationid = 40744
//             ) AS SubQuery;
//         `);
//         const totalRecords = totalRecordsQuery.recordset[0].count;
//         const totalPages = Math.ceil(totalRecords / pageSize);

//         // 🟢 Fix pagination query (ORDER BY before OFFSET)
//         const dataQuery = await pool.request().query(`
//             SELECT DISTINCT 
//                 sn.Brandid, 
//                 sn.Dealerid, 
//                 sn.locationid, 
//                 sn.partnumber, 
//                 pm.partdesc, 
//                 pm.category, 
//                 pm.mrp, 
//                 pm.moq, 
//                 sn.Maxvalue
//             FROM stockable_nonstockable_td001_20208 sn
//             JOIN Part_Master pm ON pm.partnumber = sn.partnumber
//             WHERE stockdate = '2025-02-01 00:00:00'  
//               --AND sn.locationid = 40744
//             ORDER BY sn.partnumber -- Ensure ordering before pagination
//             OFFSET ${offset} ROWS
//             FETCH NEXT ${pageSize} ROWS ONLY;
//         `);

//         res.json({
//             currentPage: page,
//             pageSize,
//             totalRecords,
//             totalPages,
//             hasMore: page < totalPages,
//             data: dataQuery.recordset
//         });

//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ error: "Internal Server Error", details: error.message });
//     }
// };

const userInfo = async(req,res)=>{
try {
      const pool = await getPool2()
      const {token , usertype} = req.body
      
    //   console.log(token , usertype);
      
      if(!token || !usertype){
        return res.status(400).json({message:`token and usertype both are required`})
      }
      if(usertype === 'a'){
      const query = `select bintid_pk , concat(vcfirstname , ' ', vcLastname)as username , designation from adminmaster_gen where bintId_Pk=z_scope.dbo.f_Decryption('${token}') `
      
      const result = await pool.request().query(query)
      res.status(200).json({Data:result.recordset})
      }
      else{
        const query = `SELECT distinct li.BrandID, dur.dealerid , dur.locationid , concat(amg.vcfirstname , ' ', amg.vcLastname)as username ,li.location  FROM AdminMaster_GEN amg
    join Dealer_User_Relation dur on amg.bintid_pk = dur.userid
    join locationinfo li on dur.locationid = li.LocationID
    where bintId_Pk=z_scope.dbo.f_Decryption('${token}') `
    const result = await pool.request().query(query)
    res.status(200).json({Data:result.recordset})
      }
} catch (error) {
    res.status(500).json({Error:error.message})
}

}
const homePageData =  async (req, res) => {
    const {locationId , dealerid} = req.body 
    const pool = await getPool2();
    if(!locationId || !dealerid){
       return  res.status(400).json({message:`locationId and dealerid is required`})
    }
        const stockquery = `select sum(qty)as StockQty , AddedDate from [z_scope].dbo.CurrentStock1 cs1
                        join CurrentStock2 cs2 on cs1.tCode=cs2.StockCode
                        where LocationID = ${locationId}
                        group by AddedDate`

        const stockvaluequery = `select sum((cs2.Qty*pm.landedcost))as stockvalue from [z_scope].dbo.CurrentStock1 cs1 
                                join [z_scope].dbo.CurrentStock2 cs2 on  cs2.StockCode = cs1.tCode
                                join [z_scope].dbo.locationinfo li on li.LocationID=cs1.LocationID
                                join [z_scope].dbo.Part_Master pm on pm.brandid = li.BrandID and cs2.PartNumber = pm.partnumber
                                where cs1.locationid = ${locationId}`

        const ppnivaluequery = `select sum(PPNI_Val)as PPNIValue from [UAD_BI_PPNI].dbo.PPNI_report_${dealerid}
                                where locationid = ${locationId}`

        const snstockvaluequery = `WITH LatestSN AS (
    SELECT *
    FROM stockable_nonstockable_td001_${dealerid}
    WHERE locationid = ${locationId}
      AND stockdate = (
          SELECT MAX(stockdate)
                  FROM stockable_nonstockable_td001_${dealerid}
                  WHERE locationid = ${locationId}
              )
        )
        SELECT  
            SUM(CASE WHEN sn.MaxValue IS NULL OR sn.MaxValue = 0 THEN 1 ELSE 0 END) AS NonStockable,
            SUM(CASE WHEN sn.MaxValue IS NOT NULL AND sn.MaxValue > 0 THEN 1 ELSE 0 END) AS Stockable,
            SUM(CASE WHEN sn.MaxValue IS NOT NULL AND sn.MaxValue > 0 THEN ISNULL(cs2.Qty, 0) * ISNULL(pm.landedcost, 0) ELSE 0 END) AS StockableValue,
            SUM(CASE WHEN sn.MaxValue IS NULL OR sn.MaxValue = 0 THEN ISNULL(cs2.Qty, 0) * ISNULL(pm.landedcost, 0) ELSE 0 END) AS NonStockableValue
        FROM
            CurrentStock2 cs2
        INNER JOIN
            CurrentStock1 cs1 ON cs2.StockCode = cs1.tCode
        LEFT JOIN
            LatestSN sn ON cs1.LocationID = sn.LocationID AND cs2.PartNumber = sn.partnumber1
        INNER JOIN
            Dealer_Workshop_Master li ON cs1.LocationID = li.bigid
        LEFT JOIN
            Part_Master pm ON pm.brandid = li.BrandID AND cs2.PartNumber = pm.partnumber
        WHERE
            cs1.LocationID = ${locationId}`

                const lastorderValuequery = `select scsorderno, sum(finalorderqty)as QTY , sum(finalorderval)as Value , addeddate from [10.10.152.17].[z_scope].dbo.ogs_orderdata_td001_${dealerid}
                                        where addeddate = (select max(addeddate) from [10.10.152.17].[z_scope].dbo.ogs_orderdata_td001_${dealerid} where locationid = ${locationId} )
                                        and locationid = ${locationId}
                                        group by scsorderno , addeddate`
        
        const jobcardDatequery = `select max(Close_Date) joblineupdatedate,max(Final_Close_Date) jobcardcloseddate from [z_scope].dbo.create_order_request_td001_${dealerid} 
                                    where locationid = ${locationId} `
                                    // console.log(snstockvaluequery);

        //This query gives sale in lakhs
        const SixMonthLocationwiseSaleValueQuery = `
                        DECLARE
                        @ls INT,
                        @st INT,
                        @Columnsold NVARCHAR(MAX),
                        @SumColumns NVARCHAR(MAX),
                        @d1 VARCHAR(50),  
                        @d2 VARCHAR(50),
                        @d3 VARCHAR(50),
                        @Dealerid INT,
                        @Dealerold NVARCHAR(MAX),
                        @sql NVARCHAR(MAX);

                    	SET @ls = 6;   -- (For Number of month)
                    	SET @st = 1;  
                    	SET @Columnsold = '';
                    	SET @SumColumns = '';


                    WHILE @st <= @ls
                    BEGIN
                        SET @d1 = CONCAT(LEFT(DATENAME(MONTH, DATEADD(MONTH, -@st, GETDATE())), 3), '_', RIGHT(YEAR(DATEADD(MONTH, -@st, GETDATE())), 2), '_WS');
                        SET @d2 = CONCAT(LEFT(DATENAME(MONTH, DATEADD(MONTH, -@st, GETDATE())), 3), '_', RIGHT(YEAR(DATEADD(MONTH, -@st, GETDATE())), 2), '_CS');
                        SET @d3 = CONCAT(LEFT(DATENAME(MONTH, DATEADD(MONTH, -@st, GETDATE())), 3), '_', RIGHT(YEAR(DATEADD(MONTH, -@st, GETDATE())), 2), '_P');


                        SET @Columnsold = CONCAT(@Columnsold, CASE WHEN @Columnsold = '' THEN '' ELSE ', ' END, 
                                                 QUOTENAME(@d1), ', ', QUOTENAME(@d2), ', ', QUOTENAME(@d3));

                        SET @SumColumns = CONCAT(@SumColumns, 
                            CASE WHEN @SumColumns = '' THEN '' ELSE ', ' END,
                            --'ROUND(SUM(ds.' + QUOTENAME(@d1) + ' * pm.landedcost)/ 100000.0, 2) AS [' + @d1 + '_Value] , ',
                    		'CAST(ROUND(SUM(ds.' + QUOTENAME(@d1) + ' * pm.landedcost) / 100000.0, 2) AS DECIMAL(10,2)) AS [' + @d1 + '_Value],',
                            'CAST(ROUND(SUM(ds.' + QUOTENAME(@d2) + ' * pm.landedcost) / 100000.0, 2) AS DECIMAL(10,2)) [' + @d2 + '_Value], ',
                            'CAST(ROUND(SUM(ds.' + QUOTENAME(@d3) + ' * pm.landedcost)/ 100000.0, 2) AS DECIMAL(10,2)) [' + @d3 + '_Value] ');

                        SET @st = @st + 1;
                    END;


                    SELECT @Dealerid = dealerid 
                    FROM locationinfo 
                    WHERE locationid = ${locationId};


                    SET @Dealerold = '[z_scope].dbo.Dealer_Sale_Upload_Old_TD001_' + CAST(@Dealerid AS NVARCHAR(10));

                    SET @sql = '

                    SELECT 
                        ' + @SumColumns + '
                    FROM ' + @Dealerold + ' ds
                    JOIN [z_scope].[dbo].LocationInfo li 
                        ON li.LocationID = ds.LocationId
                    LEFT JOIN [z_scope].[dbo].part_master pm 
                        ON pm.brandid = li.BrandID AND ds.PartNumber1 = pm.partnumber1
                    WHERE li.locationid = ${locationId};';

                    EXEC sp_executesql @sql;
        `

        // console.log(lastorderValuequery);
        
         try {
           const stock =  await pool.request().query(stockquery)
           const stockValue = await pool.request().query(stockvaluequery)
           const ppniValue = await pool.request().query(ppnivaluequery)
           const snstockvalue = await pool.request().query(snstockvaluequery)
           const lastOrderValue = await pool.request().query(lastorderValuequery)
           const lastjobcard = await pool.request().query(jobcardDatequery)
           const SixMonthLocationwiseSaleValue = await pool.request().query(SixMonthLocationwiseSaleValueQuery)
       
        
           res.status(200).json(
            {
            StockQty:stock.recordset,
            StockValue:stockValue.recordset,
            PPNIValue:ppniValue.recordset,
            SNStockValue:snstockvalue.recordset,
            lastOrderDetails:lastOrderValue.recordset,
            JobCardDate:lastjobcard.recordset,
            SixMonthSaleValue:SixMonthLocationwiseSaleValue.recordset

        }
        )
         } catch (error) {
            res.status(500).json(error.message)
         }                           
  };    

export {homePageData,getBrands,getDealers,getLocation,getWorkspace,getDashboard,partNature,model,seasonal,partType,userInfo}
