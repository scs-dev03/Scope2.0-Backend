USE [z_scope];  -- Ensure the correct database is used

                select 
                sum(case 
            when dsm.NonMovingSale = 'BS' then 2
            when dsm.NonMovingSale in ('WS', 'CS') then 1
            else 0 -- Optional: Count as 0 for any other values
        end) as RequiredCount
from Dealer_Setting_master dsm
join locationinfo li
    on dsm.locationid = li.LocationID
where li.DealerID = 20855
-- Ensure the previous statement is terminated before using CTE
;WITH LocationSaleType AS (
    -- Step 1: Get all active locations and their NonMovingSale types
    SELECT 
        li.LocationID, 
        dsm.NonMovingSale 
    FROM Dealer_Setting_master dsm
    JOIN locationinfo li
        ON dsm.locationid = li.LocationID
    WHERE li.DealerID = 20855
    -- AND li.OgsStatus = 1
),
FilteredSales AS (
    -- Main query to filter data based on conditions
    SELECT 
        ds.locationid,
        ds.saletype,
        ds.StockDateMonth,
        ds.StockDateYear
    FROM dealer_sale_upload1_td001_20855 ds
    WHERE ds.locationid IN (SELECT LocationID FROM LocationSaleType)
    AND (
        -- Conditional filtering based on SaleType
        (EXISTS (
            SELECT 1 
            FROM LocationSaleType lst
            WHERE lst.LocationID = ds.locationid 
              AND lst.NonMovingSale = 'WS'
        ) AND ds.saletype = 'WS')
        OR
        (EXISTS (
            SELECT 1 
            FROM LocationSaleType lst
            WHERE lst.LocationID = ds.locationid 
              AND lst.NonMovingSale = 'CS'
        ) AND ds.saletype = 'CS')
        OR
        (EXISTS (
            SELECT 1 
            FROM LocationSaleType lst
            WHERE lst.LocationID = ds.locationid 
              AND lst.NonMovingSale = 'BS'
        ) AND ds.saletype IN ('WS', 'CS'))  
    )
    AND ds.StockDateMonth = MONTH(DATEADD(MONTH, -1, GETDATE()))  
    AND ds.StockDateYear = CASE 
        WHEN MONTH(GETDATE()) = 1 THEN YEAR(GETDATE()) - 1
        ELSE YEAR(GETDATE())
    END
)
-- Counting the number of rows
SELECT COUNT(*) AS GettingRowCount
FROM FilteredSales;


--------------------------------------------------------------------------------------------------------------
-- Currently Using For data validation
WITH data AS (
    SELECT li.locationid, dsm.NonMovingSale
    FROM z_scope..Dealer_Setting_Master dsm
    JOIN locationinfo li ON li.LocationID = dsm.locationid
    WHERE dsm.dealerid = @dealerid and li.Status = 1
)
SELECT li.location, d.NonMovingSale
FROM data d
LEFT JOIN z_scope..${dynamicTable} ds 
    ON d.locationid = ds.locationid 
    AND d.NonMovingSale = ds.SaleType
    AND ds.StockDateMonth = MONTH(DATEADD(MONTH, -1, GETDATE()))  
    AND ds.StockDateYear = 
        CASE 
            WHEN MONTH(GETDATE()) = 1 THEN YEAR(GETDATE()) - 1
            ELSE YEAR(GETDATE()) 
        END
        join locationinfo li on d.LocationID = li.LocationID and li.Status = 1
WHERE ds.locationid IS NULL;

------------------------------------------------------------------------------------------------------------------------

--Fetching Get request DAta
use [UAD_BI] select 
      sd.reqid, dm.Dashboard , sd.Brand, sd.Dealer, sd.ScheduledOn ,sm.StatusName , 
      CONCAT(amg1.vcFirstName, ' ', amg1.vcLastName) AS Addedby , sd.Addedon ,
      CASE WHEN sd.Editedby = amg2.bintId_Pk THEN CONCAT(amg2.vcFirstName, ' ', amg2.vcLastName) END AS Editedby, sd.Editedon , 
      CASE WHEN sd.Deletedby = amg3.bintId_Pk THEN CONCAT(amg3.vcFirstName, ' ', amg3.vcLastName) END AS Deletedby, sd.Deletedon,
      CASE WHEN d.BDMCode = amg4.bintId_Pk THEN CONCAT(amg4.vcFirstName, ' ', amg4.vcLastName) END AS BDM
      from SBS_DBS_ScheduledDashboard sd
      join z_scope..DB_DashboardMaster dm ON sd.DashboardCode = dm.tCode
      join UAD_BI..SBS_DBS_STATUS_MASTER sm on sd.status = sm.status
      join z_scope..Dealer_Master d on d.bigid = sd.Dealerid
      LEFT JOIN z_scope..AdminMaster_GEN amg1 ON sd.Addedby = amg1.bintId_Pk
      LEFT JOIN z_scope..AdminMaster_GEN amg2 ON sd.Editedby = amg2.bintId_Pk
      LEFT JOIN z_scope..AdminMaster_GEN amg3 ON sd.Editedby = amg3.bintId_Pk
      LEFT JOIN z_scope..AdminMaster_GEN amg4 ON d.BDMCode = amg4.bintId_Pk
      order by reqid desc

-------------------------------------------------------------------------------------------------------------
---Have to user this for data validation
WITH data AS (
    SELECT li.locationid, dsm.NonMovingSale
    FROM z_scope..Dealer_Setting_Master dsm
    JOIN locationinfo li ON li.LocationID = dsm.locationid
    WHERE dsm.dealerid = 8 AND li.Status = 1
)
SELECT li.location, d.NonMovingSale
FROM data d
LEFT JOIN z_scope..dealer_sale_upload1_td001_8 ds 
    ON d.locationid = ds.locationid 
    AND (
        (d.NonMovingSale = 'BS' AND ds.SaleType IN ('WS', 'CS'))
        OR (d.NonMovingSale = 'WS' AND ds.SaleType = 'CS')
        OR (d.NonMovingSale = 'CS' AND ds.SaleType = 'WS')
    )
    AND ds.StockDateMonth = MONTH(DATEADD(MONTH, -1, GETDATE()))  
    AND ds.StockDateYear = 
        CASE 
            WHEN MONTH(GETDATE()) = 1 THEN YEAR(GETDATE()) - 1
            ELSE YEAR(GETDATE()) 
        END
JOIN locationinfo li ON d.LocationID = li.LocationID AND li.Status = 1
WHERE ds.locationid IS NULL;
