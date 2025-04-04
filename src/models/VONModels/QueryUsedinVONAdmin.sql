----------Count of pending feedbacks for admin-------------
DECLARE @brandid INT = NULL; -- Pass NULL to fetch all brandid
DECLARE @dealerid INT = NULL; -- Pass NULL to fetch all dealerid

DECLARE @sql NVARCHAR(MAX) = N'';

SELECT @sql = @sql + 
    'SELECT ' + 
    CASE 
        WHEN @dealerid IS NOT NULL THEN 'locationid' 
        WHEN @brandid IS NOT NULL THEN 'dealerid' 
        ELSE 'brandid' 
    END + 
    ', COUNT(status) AS Pending FROM ' + name + 
    ' WHERE status = ''Pending''' + 
    CASE WHEN @brandid IS NOT NULL 
         THEN ' AND brandid = ' + CAST(@brandid AS NVARCHAR(10)) 
         ELSE '' 
    END + 
    CASE WHEN @dealerid IS NOT NULL 
         THEN ' AND dealerid = ' + CAST(@dealerid AS NVARCHAR(10)) 
         ELSE '' 
    END + 
    ' GROUP BY ' + 
    CASE 
        WHEN @dealerid IS NOT NULL THEN 'locationid' 
        WHEN @brandid IS NOT NULL THEN 'dealerid' 
        ELSE 'brandid' 
    END + 
    ' UNION ALL ' 
FROM sys.tables
WHERE name LIKE 'UAD_VON_SPMFeedback_%';

-- Remove the last 'UNION ALL'
SET @sql = LEFT(@sql, LEN(@sql) - 10);

-- Print or execute the query
PRINT @sql;
EXEC sp_executesql @sql;



-------------------------------------
DECLARE @brandid INT = 32 ;
DECLARE @dealerid INT = null;    -- Set to NULL to fetch all dealerid
DECLARE @locationid INT = null ; -- Set to NULL to fetch all locationid

DECLARE @sql NVARCHAR(MAX) = N' SELECT distinct li.brand, li.dealer, li.location, fb.partid,pm.partnumber,pm.orderpartnumber,pm.partdesc,
						pm.landedcost, sn.maxvalue,sn.Avg3Msale, sn.n1,sn.n2,sn.n3,pm.category,pm.moq, 
						CASE WHEN rm.Remark = ''Custom'' THEN fb.Customrem ELSE rm.Remark END AS SPMRemark, fb.ProposedQty,
						CASE WHEN rm2.Remark = ''Custom'' THEN afb.Customrem ELSE rm2.Remark END AS LatestAdminRemark, afb.ApprovedQty,
						 fb.feedbackdate , fb.status FROM UAD_VON_SPMFeedback_'+ CAST(@brandid as nvarchar) +' fb
join z_scope..part_master pm on pm.brandid = fb.brandid and pm.partid = fb.partid 
join z_scope..stockable_nonstockable_td001_20208 sn on sn.partnumber = pm.partnumber and sn.locationid = fb.locationid
join z_scope..locationinfo li on li.locationid = fb.locationid
LEFT JOIN UAD_VON..UAD_VON_RemarksMaster rm on rm.remarkid = fb.UserFBRemarkID
OUTER APPLY (
    SELECT TOP 1 * 
    FROM UAD_VON_AdminFeedback_'+ CAST(@brandid as nvarchar) +' aFb 
    WHERE fb.dealerid = li.DealerID 
      AND fb.locationid = sn.locationid 
      AND fb.PartID = sn.PartID
    ORDER BY afb.AdminFBid DESC
) afb
LEFT JOIN UAD_VON..UAD_VON_RemarksMaster rm2 on rm2.remarkid = afb.AdminRemark
WHERE 1=1 and sn.stockdate = DATEADD(MONTH, DATEDIFF(MONTH, 0, GETDATE()), 0) and fb.status = ''Pending''';

-- Add condition for dealerid if provided
IF @dealerid IS NOT NULL
    SET @sql = @sql + ' AND fb.dealerid = ' + CAST(@dealerid AS NVARCHAR(10));

-- Add condition for locationid if provided
IF @locationid IS NOT NULL
    SET @sql = @sql + ' AND fb.locationid = ' + CAST(@locationid AS NVARCHAR(10));

-- Append ORDER BY after WHERE conditions are complete
SET @sql = @sql + ' ORDER BY fb.feedbackdate';

-- Print or execute the query
PRINT @sql; -- Useful for debugging
EXEC sp_executesql @sql;
 
--------------------------------------------------------
--  Tells the count of substitutions for any part number 
--------------------------------------------------------
SELECT partnumber, COUNT(*) AS Substitutions FROM substitution_master 
WHERE partnumber = '90704100' 
GROUP BY partnumber

UNION ALL

SELECT '90704100' AS partnumber, 0 AS Substitutions
WHERE NOT EXISTS (
    SELECT 1 FROM substitution_master WHERE partnumber = '90704100'
);
--------------------------------------------------------
--  Gives List of Part Family for single part
--------------------------------------------------------
DECLARE @partnumber NVARCHAR(50) = '40001663';
DECLARE @brandid INT = 32;  
  SELECT 
    pm.partnumber AS PartNumber
FROM part_master pm
WHERE pm.partnumber = @partnumber 
  AND pm.brandid = @brandid
UNION ALL
SELECT 
    pm_sub.partnumber AS PartNumber
FROM substitution_master sm
JOIN part_master pm_sub 
    ON sm.subpartnumber = pm_sub.partnumber
WHERE sm.partnumber = @partnumber
  AND pm_sub.brandid = @brandid
  --------------------------------------------------------
--  Gives Part Family Sale for single last
-----------------------------------------------------
 use [z_scope]
 DECLARE 
 @partnumber NVARCHAR(50) = '${partnumber}',
 @brandid INT = ${brandid},
 @dealerid INT = ${dealerid}, 
 @locationid INT = ${locationid},
  @ls INT = 6,                          -- Number of months to generate
  @st INT = 1,                          -- Loop counter
  @Columnsold NVARCHAR(MAX) = '',       -- Will hold the dynamic column list
  @d1 NVARCHAR(100),                    -- Dynamic column name for _WS column
  @d2 NVARCHAR(100),                    -- Dynamic column name for _CS column
  @SQL NVARCHAR(MAX)
 -----------------------------------------------------
 -- Generate Dynamic Column List for the past 6 months
 -----------------------------------------------------
 WHILE @st <= @ls  
 BEGIN  
     SET @d1 = CONCAT(
                 LEFT(DATENAME(MONTH, DATEADD(MONTH, -@st, GETDATE())), 3), '_',
                 RIGHT(CONVERT(VARCHAR(4), YEAR(DATEADD(MONTH, -@st, GETDATE()))), 2), '_WS');  
     SET @d2 = CONCAT(
                 LEFT(DATENAME(MONTH, DATEADD(MONTH, -@st, GETDATE())), 3), '_',
                 RIGHT(CONVERT(VARCHAR(4), YEAR(DATEADD(MONTH, -@st, GETDATE()))), 2), '_CS'); 
     SET @Columnsold = @Columnsold + CASE WHEN @Columnsold = '' THEN '' ELSE ', ' END 
                        + QUOTENAME(@d1) + ', ' + QUOTENAME(@d2); 
     SET @st = @st + 1;  
 END; 
 -- Debugging output
 PRINT @Columnsold
 -- Construct the dynamic SQL
 SET @SQL = '
 SELECT partnumber, ' + @Columnsold + '
 FROM dealer_sale_upload_old_td001_' + CAST(@dealerid AS NVARCHAR(10)) + '
 WHERE locationid = @locationid 
 AND partnumber IN ( 
     SELECT pm.partnumber 
     FROM part_master pm
     WHERE pm.partnumber = @partnumber 
     AND pm.brandid = @brandid
     UNION ALL
     SELECT pm_sub.partnumber 
     FROM substitution_master sm
     JOIN part_master pm_sub 
         ON sm.subpartnumber = pm_sub.partnumber
     WHERE sm.partnumber = @partnumber
     AND pm_sub.brandid = @brandid
 )'
 -- Debugging output
 PRINT @SQL
 -- Execute the dynamic SQL using parameterization
 EXEC sp_executesql @SQL, 
     N'@locationid INT, @partnumber NVARCHAR(50), @brandid INT', 
     @locationid, @partnumber, @brandid;'