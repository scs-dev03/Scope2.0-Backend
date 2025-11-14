import sql from 'mssql'
import { getPool1, getPool2 } from '../../db/db.js'
import { ApiError } from '../../utils/ApiError.js';
import { login } from '../login/auth.service.js';

const stockQty = async (locationId) => {
    const pool = await getPool2();

    const stockquery = ` use [z_scope]
    SELECT SUM(qty) AS StockQty, AddedDate FROM [z_scope].dbo.CurrentStock1 cs1
    JOIN CurrentStock2 cs2 ON cs1.tCode = cs2.StockCode
    join LocationInfo li on cs1.LocationID = li.LocationID
    join Part_Master pm on pm.brandid = li.brandid and cs2.PartNumber = pm.partnumber1
    WHERE cs1.LocationID = ${locationId} and pm.PartTypeID = 1 --Sparepart
    GROUP BY AddedDate`

    const result = await pool.request().query(stockquery)
    // console.log(`stockQty`, result);
    return result.recordset
}

const stockValue = async (locationId) => {
    const pool = await getPool2();

    const stockvaluequery = `SELECT SUM((cs2.Qty * pm.landedcost)) AS stockvalue FROM [z_scope].dbo.CurrentStock1 cs1
                               JOIN [z_scope].dbo.CurrentStock2 cs2 ON cs2.StockCode = cs1.tCode
                               JOIN [z_scope].dbo.locationinfo li ON li.LocationID = cs1.LocationID
                               JOIN [z_scope].dbo.Part_Master pm ON pm.brandid = li.BrandID AND cs2.PartNumber = pm.partnumber
                               WHERE cs1.locationid = ${locationId} and pm.PartTypeID = 1`;

    const result = await pool.request().query(stockvaluequery)
    // console.log(`stockValue`, result);
    return result.recordset
}

const ppniValue = async (dealerid, locationId) => {
    const pool = await getPool2();

    const ppnivaluequery = `SELECT SUM(PPNI_Val) AS PPNIValue FROM [UAD_BI_PPNI].dbo.PPNI_report_${dealerid} ppni
                              join z_scope..LocationInfo li on ppni.LocationID = li.LocationID
                              join z_scope..Part_Master pm on pm.brandid = li.brandid and ppni.PartNumber = pm.partnumber1
                              WHERE ppni.locationid = ${locationId} and pm.PartTypeID = 1`;

    const result = await pool.request().query(ppnivaluequery)
    // console.log(`ppniValue`, result);
    return result.recordset
}

const snstockValue = async (dealerid, locationId) => {
    const pool = await getPool2();

    const snstockvaluequery = `
        use [z_scope] 
        declare @date datetime = (select MAX(Stockdate) from Stockable_Nonstockable_TD001_${dealerid} where Locationid = ${locationId})

		 drop table if exists #data 
		drop table if exists #data2  

		create table #data(PartNumber Varchar(30), Latest Varchar(30), Qty Decimal(18,2), landedcost Decimal(18,2))
		create table #data2(PartNumber Varchar(30), Latest Varchar(30))

		insert into #data
        SELECT  cs2.PartNumber ,
        CASE when cs2.PartNumber = sm.partnumber1 then sm.subpartnumber1 else cs2.PartNumber end as Latest, 
		cs2.Qty , pm.landedcost
        FROM [z_scope].dbo.CurrentStock1(NOLOCK) cs1
        JOIN [z_scope].dbo.CurrentStock2(NOLOCK) cs2 ON cs2.StockCode = cs1.tCode
        JOIN [z_scope].dbo.locationinfo(NOLOCK) li ON li.LocationID = cs1.LocationID
        left join Substitution_Master(NOLOCK) sm on sm.brandid = li.BrandID and sm.partnumber1 = cs2.PartNumber
        JOIN Part_Master(NOLOCK) pm ON pm.brandid = li.BrandID AND cs2.PartNumber = pm.partnumber and pm.PartTypeID = 1
        WHERE cs1.locationid = ${locationId} 


		insert into #data2
        select  sn.partnumber1 , CASE when sn.partnumber1 = sm.partnumber1 then sm.subpartnumber1 else sn.partnumber1 end as Latest
        from Stockable_Nonstockable_TD001_${dealerid}(NOLOCK) sn
        --join Dealer_Workshop_Master(NOLOCK) dwm on dwm.bigid = sn.Locationid and sn.Stockdate = dwm.MaxDate
        left join Substitution_Master(NOLOCK) sm on sm.brandid = sn.BrandID and sm.partnumber1 = sn.partnumber1
        JOIN Part_Master(NOLOCK) pm ON pm.brandid = sn.BrandID AND sn.PartNumber1 = pm.partnumber1 and pm.PartTypeID = 1
        where sn.Locationid = ${locationId} and sn.Stockdate = @date and Maxvalue >0


        SELECT  SUM(s.Qty * s.landedcost)as StockableValue
        FROM #data s
        JOIN #data2 sn on sn.latest = s.latest`

    const result = await pool.request().query(snstockvaluequery)
    // console.log(`ppniValue`, result);
    return result.recordset
}

const lastOrderValue = async (dealerid, locationId) => {
    const pool = await getPool2();

    const lastorderValuequery = `SELECT scsorderno, SUM(finalorderqty) AS QTY, SUM(finalorderval) AS Value, addeddate
                                  FROM [10.10.152.17].[z_scope].dbo.ogs_orderdata_td001_${dealerid}
                                  WHERE addeddate = (
                                    SELECT MAX(addeddate) FROM [10.10.152.17].[z_scope].dbo.ogs_orderdata_td001_${dealerid}
                                    WHERE locationid = ${locationId}
                                  )
                                  AND locationid = ${locationId}
                                  GROUP BY scsorderno, addeddate`;

    const result = await pool.request().query(lastorderValuequery)
    // console.log(`ppniValue`, result);
    return result.recordset
}

const jobcardDate = async (dealerid, locationId) => {
    const pool = await getPool2();

    const jobcardDatequery = `SELECT MAX(Close_Date) joblineupdatedate, MAX(Final_Close_Date) jobcardcloseddate
                                FROM [z_scope].dbo.create_order_request_td001_${dealerid} 
                                WHERE locationid = ${locationId}`;

    const result = await pool.request().query(jobcardDatequery)
    // console.log(`ppniValue`, result);
    return result.recordset
}
const SixMonthLocationwiseSaleValue = async (dealerid, locationId) => {
    const pool = await getPool2();

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


    const result = await pool.request().query(SixMonthLocationwiseSaleValueQuery)
    // console.log(`ppniValue`, result);
    return result.recordset
}

const multiDealerService = async (BrandIds) => {
    try {
        const pool = await getPool1()
        const query = `
        use z_scope
        select Brand , DealerID , Dealer from LocationInfo where Brandid in (${BrandIds}) 
        AND DealerStatus = 1
        Group by Brand , Dealer , DealerID
        order by Brand , Dealer`
        const result = await pool.request().query(query)
        return result.recordset
    } catch (error) {
        throw new ApiError(500, error.message)
    }
}

const multiLocationService = async (DealerIds) => {
    try {
        const pool = await getPool1()
        const query = `
        use z_scope
        select Dealer, LocationID , Location from LocationInfo where DealerId in (${DealerIds}) 
        AND OgsStatus = 1
        Group by Dealer, LocationID , Location
        Order by Dealer ,Location`
        const result = await pool.request().query(query)
        return result.recordset
    } catch (error) {
        throw new ApiError(500, error.message)
    }
}

const multiAdvisorService = async (LocationIds) => {
    try {
        const pool = await getPool1()
        const query = `
        use z_scope
        select Id , li.Location , Advisor from AAP_SPMAdvisorMaster ad
        JOIN LocationInfo li on ad.LocationId = li.LocationID
        where ad.LocationId in (${LocationIds})
        AND ad.Status = 1 and li.OgsStatus = 1
        Order by li.Location`

        // console.log(query);
        
        const result = await pool.request().query(query)
        return result.recordset
    } catch (error) {
        throw new ApiError(500, error.message)
    }
}
export { stockQty, stockValue, snstockValue, lastOrderValue, jobcardDate, ppniValue, SixMonthLocationwiseSaleValue, multiDealerService, multiLocationService, multiAdvisorService }