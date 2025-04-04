ALter PROCEDURE sp_GetAdminView
    @brandid INT,
    @dealerid INT = NULL,
    @locationid INT = NULL,
    @Status BIT = NULL,               -- (0->Pending Reviews and 1->Reviewed , null -> All)
    @seasonalid INT = NULL,           -- Optional: Seasonal ID filter
    @natureid INT = NULL,             -- Optional: Nature ID filter
    @modelid INT = NULL               -- Optional: Model ID filter
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @currentDealerID INT;
    DECLARE @sql NVARCHAR(MAX);

    -- Create a temporary table to store all results
    IF OBJECT_ID('tempdb..#TempResults') IS NOT NULL
        DROP TABLE #TempResults;

    CREATE TABLE #TempResults (
        brand NVARCHAR(255),
        dealer NVARCHAR(255),
        location NVARCHAR(255),
        partid INT,
        partnumber NVARCHAR(255),
        orderpartnumber NVARCHAR(255),
        partdesc NVARCHAR(255),
        landedcost DECIMAL(18,2),
        maxvalue DECIMAL(18,2),
        Avg3Msale DECIMAL(18,2),
        n1 DECIMAL(18,2),
        n2 DECIMAL(18,2),
        n3 DECIMAL(18,2),
        category NVARCHAR(255),
        moq INT,
        SPMRemark NVARCHAR(255),
        ProposedQty INT,
        LatestAdminRemark NVARCHAR(255),
        ApprovedQty INT,
        Maxdate Datetime,
        feedbackdate DATETIME,
        status NVARCHAR(50),
        feedbackid int,
        model NVARCHAR(255), 
        nature NVARCHAR(255),
        Subpartcount Int
    );

    -- Fetch multiple dealer IDs if @dealerid is NULL, otherwise process a single dealer ID
    IF @dealerid IS NULL
    BEGIN
        DECLARE dealer_cursor CURSOR FOR
        SELECT DISTINCT dealerid FROM UAD_VON..UAD_VON_SPMFeedback_9;  -- Adjust table name if needed

        OPEN dealer_cursor;
        FETCH NEXT FROM dealer_cursor INTO @currentDealerID;

        WHILE @@FETCH_STATUS = 0
        BEGIN
            PRINT 'Processing DealerID: ' + CAST(@currentDealerID AS NVARCHAR(10));

            -- Construct the dynamic SQL query for the current dealerid
            SET @sql = N'
                INSERT INTO #TempResults
                SELECT DISTINCT li.brand, li.dealer, li.location, fb.partid, pm.partnumber,
                pm.orderpartnumber, pm.partdesc,
                pm.landedcost, sn.maxvalue, sn.Avg3Msale, sn.n1, sn.n2, sn.n3, pm.category, pm.moq, 
                CASE WHEN rm.Remark = ''Custom'' THEN fb.Customrem ELSE rm.Remark END AS SPMRemark, fb.ProposedQty,
                CASE WHEN rm2.Remark = ''Custom'' THEN afb.Customrem ELSE rm2.Remark END AS LatestAdminRemark, afb.ApprovedQty,
                sn.Stockdate,fb.feedbackdate, fb.status ,fb.feedbackid,psm.modelid,pn.description as Nature,
                (select count(partnumber) from z_scope..substitution_master where subpartnumber = pm.partnumber and brandid = fb.brandid) as SubpartCount
                FROM UAD_VON..UAD_VON_SPMFeedback_' + CAST(@brandid AS NVARCHAR) + ' fb
                JOIN z_scope..part_master pm ON pm.brandid = fb.brandid AND pm.partid = fb.partid 
                JOIN z_scope..stockable_nonstockable_td001_' + CAST(@currentDealerID AS NVARCHAR) + ' sn 
                ON sn.partnumber = pm.partnumber AND sn.locationid = fb.locationid
                JOIN z_scope..locationinfo li ON li.locationid = fb.locationid
                LEFT JOIN UAD_VON..UAD_VON_RemarksMaster rm ON rm.remarkid = fb.UserFBRemarkID
                OUTER APPLY (
                    SELECT TOP 1 * 
                    FROM UAD_VON_AdminFeedback_' + CAST(@brandid AS NVARCHAR) + ' afb 
                    WHERE fb.dealerid = li.DealerID 
                      AND fb.locationid = sn.locationid 
                      AND fb.PartID = sn.PartID
                    ORDER BY afb.AdminFBid DESC
                ) afb
                LEFT JOIN UAD_VON..UAD_VON_RemarksMaster rm2 ON rm2.remarkid = afb.AdminRemark
                LEFT JOIN z_scope..PartMgmt_PartNatureMapping pnm ON fb.PartID = pnm.PartID
                LEFT JOIN z_scope..partsmodelmapping psm ON fb.PartID = psm.PartID
                LEFT JOIN z_scope..partmgmt_seasonalmapping psam ON fb.PartID = psam.PartID
                left join z_scope..PartNatureMaster pn on pn.tcode = pnm.partnatureid
                WHERE 1=1 
                AND( @Status IS NULL  
                OR (@Status = 0 AND (fb.Status = ''Pending'' OR fb.Status IS NULL)) 
                OR (@Status = 1 AND fb.Status = ''Reviewed'')
                )				    
                AND (@natureid IS NULL OR pnm.PartNatureID = @natureid)
                AND (@modelid IS NULL OR psm.ModelID = @modelid)
                AND (@seasonalid IS NULL OR psam.SeasonalID = @seasonalid)
               -- AND sn.stockdate = DATEADD(MONTH, DATEDIFF(MONTH, 0, GETDATE()), 0) 
			   AND sn.stockdate = (select top 1 stockdate from z_scope..stockable_nonstockable_td001_' + CAST(@dealerid AS NVARCHAR) + ' order by stockdate desc)
                AND fb.dealerid = ' + CAST(@currentDealerID AS NVARCHAR(10));

            -- Add condition for locationid if provided
            IF @locationid IS NOT NULL
                SET @sql = @sql + ' AND fb.locationid = ' + CAST(@locationid AS NVARCHAR(10));

            PRINT @sql
            -- Execute the query with all parameters
            EXEC sp_executesql @sql, 
                N'@Status BIT, @seasonalid INT, @natureid INT, @modelid INT', 
                @Status, @seasonalid, @natureid, @modelid;

            -- Fetch next dealerid
            FETCH NEXT FROM dealer_cursor INTO @currentDealerID;
        END;

        -- Close and deallocate the cursor
        CLOSE dealer_cursor;
        DEALLOCATE dealer_cursor;
    END
    ELSE
    BEGIN
        PRINT 'Processing single DealerID: ' + CAST(@dealerid AS NVARCHAR(10));

        -- Construct query for a single dealerid
        SET @sql = N'
            INSERT INTO #TempResults
            SELECT DISTINCT li.brand, li.dealer, li.location, fb.partid, pm.partnumber, pm.orderpartnumber, pm.partdesc,
                pm.landedcost, sn.maxvalue, sn.Avg3Msale, sn.n1, sn.n2, sn.n3, pm.category, pm.moq, 
                CASE WHEN rm.Remark = ''Custom'' THEN fb.Customrem ELSE rm.Remark END AS SPMRemark, fb.ProposedQty,
                CASE WHEN rm2.Remark = ''Custom'' THEN afb.Customrem ELSE rm2.Remark END AS LatestAdminRemark, afb.ApprovedQty,
                sn.Stockdate,fb.feedbackdate, fb.status, fb.feedbackid,psm.modelid,pn.description as Nature,
                (select count(partnumber) from z_scope..substitution_master where subpartnumber = pm.partnumber and brandid = fb.brandid) as SubpartCount
            FROM UAD_VON_SPMFeedback_' + CAST(@brandid AS NVARCHAR) + ' fb
            JOIN z_scope..part_master pm ON pm.brandid = fb.brandid AND pm.partid = fb.partid 
            JOIN z_scope..stockable_nonstockable_td001_' + CAST(@dealerid AS NVARCHAR) + ' sn 
                ON sn.partnumber = pm.partnumber AND sn.locationid = fb.locationid
            JOIN z_scope..locationinfo li ON li.locationid = fb.locationid
            LEFT JOIN UAD_VON..UAD_VON_RemarksMaster rm ON rm.remarkid = fb.UserFBRemarkID
            OUTER APPLY (
                SELECT TOP 1 * 
                FROM UAD_VON_AdminFeedback_' + CAST(@brandid AS NVARCHAR) + ' afb 
                WHERE fb.dealerid = li.DealerID 
                  AND fb.locationid = sn.locationid 
                  AND fb.PartID = sn.PartID
                ORDER BY afb.AdminFBid DESC
            ) afb
            LEFT JOIN UAD_VON..UAD_VON_RemarksMaster rm2 ON rm2.remarkid = afb.AdminRemark
            LEFT JOIN z_scope..PartMgmt_PartNatureMapping pnm ON fb.PartID = pnm.PartID
            LEFT JOIN z_scope..partsmodelmapping psm ON fb.PartID = psm.PartID
            left join z_scope..PartNatureMaster pn on pn.tcode = pnm.partnatureid
            WHERE 1=1 
            AND(
            @Status IS NULL  
            OR (@Status = 0 AND (fb.Status = ''Pending'' OR fb.Status IS NULL)) 
            OR (@Status = 1 AND fb.Status = ''Reviewed'')
            )
            AND (@natureid IS NULL OR pnm.PartNatureID = @natureid)
            AND (@modelid IS NULL OR psm.ModelID = @modelid)
            --AND sn.stockdate = DATEADD(MONTH, DATEDIFF(MONTH, 0, GETDATE()), 0)
			AND sn.stockdate = (select top 1 stockdate from z_scope..stockable_nonstockable_td001_' + CAST(@dealerid AS NVARCHAR) + ' order by stockdate desc)
            AND fb.dealerid = ' + CAST(@dealerid AS NVARCHAR(10))

        -- Add condition for locationid if provided
        IF @locationid IS NOT NULL
            SET @sql = @sql + ' AND fb.locationid = ' + CAST(@locationid AS NVARCHAR(10));

        PRINT @sql
        -- Execute the query with all parameters
        EXEC sp_executesql @sql, 
            N'@Status BIT, @seasonalid INT, @natureid INT, @modelid INT', 
            @Status, @seasonalid, @natureid, @modelid;
    END;

    -- Return consolidated results	
    SELECT * FROM #TempResults ORDER BY feedbackdate;

    -- Drop the temp table
    DROP TABLE #TempResults;
END;

-- Example call
-- USE [UAD_VON] 
-- EXEC sp_GetAdminView @brandid = 25, @dealerid = 20762, @locationid = 43405, @Status = 0, @seasonalid = null, @natureid = null, @modelid = null;