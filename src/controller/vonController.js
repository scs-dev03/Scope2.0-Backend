import { getPool } from '../db/db.js'
import sql from 'mssql'
import fs from 'fs'
import { partBrandCheck, readExcel, insertData, findLocationPartidDuplicates, checkPendingFeedbackAndStatus, findLocationPartidDuplicatesAdmin, insertAdminFeedback, checkReviewedFeedbackByBrand, statusCheck, invalidRemarks , invalidUserRemarks, cleanPartNumber } from '../utils/vonHelper.js'
import { MotherChildFamilySaleservice } from '../services/norms-management/utils.service.js'


const remarkMaster = async (req, res) => {
    try {

        const pool = await getPool()
        const { brandid, usertype } = req.body
        if (!brandid || !usertype) {
            return res.status(500).json({ Error: `Brandid and usertype are required` })
        }
        const query = `use [UAD_VON] select Remarkid , remark from UAD_VON_RemarksMaster where brandid = ${brandid} and status = 1 and usertype = '${usertype}'`
        const result = await pool.request().query(query)
        res.status(200).json({ Data: result.recordset })
    } catch (error) {
        res.status(500).json({ Error: error.message })
    }
}
const newRemark = async (req, res) => {
    try {
        const pool = await getPool()
        const { remark, brandid, addedby, usertype } = req.body
        if (!remark || !addedby || !usertype) {
            return res.status(400).json({ message: `All fields are required` })
        }
        try {
            const query = `select * from UAD_VON..UAD_VON_RemarksMaster where remark = '${remark}' and usertype = '${usertype}'`
            const result = await pool.request().query(query)
            // If remark already exists, return error
            if (result.recordset.length > 0) {
                return res.status(400).json({ message: "Remark already exists" });
            }
        } catch (error) {
            res.status(500).json({
                Error: error.message
            })
        }

        const query = ` use [UAD_VON]
        INSERT INTO UAD_VON_RemarksMaster (remark, brandid, addedby, usertype)
        SELECT 
        '${remark}', 
            COALESCE(${brandid}, bigid), 
            ${addedby},
            '${usertype}' 
            FROM 
                (SELECT DISTINCT bigid FROM z_scope..Brand_Master) AS brands
            WHERE 
                ${brandid} IS NULL OR bigid = ${brandid};`

        await pool.request().query(query)
        res.status(201).json({ message: `Remark successfully Created` })
    } catch (error) {
        res.status(500).json({ Error: error.message })
    }
}
const viewRemark = async (req, res) => {
    try {
        const pool = await getPool()
        const { brandid, usertype } = req.body

        if (!usertype === 'A' || !usertype === 'U') {
            return res.status(400).json({ message: `usertype should be 'A' or 'U'` })
        }
        const query = ` use [UAD_VON]
           DECLARE @Brandid INT = ${brandid},
            @Usertype VARCHAR(1) = '${usertype}';  -- Change to NULL to get all user types
            SELECT 
                rm.remarkid, 
                rm.remark, 
                bm.vcbrand, 
                CONCAT(amg.vcFirstName, ' ', amg.vcLastName) AS AddedBy, 
                rm.addedon, 
                rm.status 
            FROM UAD_VON_RemarksMaster rm
            JOIN z_scope..Brand_Master bm   
                ON bm.bigid = rm.brandid
            JOIN z_scope..AdminMaster_GEN amg 
                ON amg.bintId_Pk = rm.addedby
            WHERE 
                (@Brandid IS NULL OR rm.brandid = @Brandid)  -- If NULL, fetch all brands; otherwise, filter
                AND (@Usertype IS NULL OR rm.usertype = @Usertype);  -- If NULL, fetch all user types; otherwise, filter
                `
        const result = await pool.request().query(query)
        res.status(200).json({ Data: result.recordset })
    } catch (error) {
        res.status(500).json({ Error: error.message })
    }
}
const userView = async (req, res) => {
    try {
        const pool = await getPool()
        const { brandid, dealerid, r1, r2, l1, l2, partnumber, locationids, flag, seasonalid, modelid, natureid, parttype } = req.body
        if (!dealerid && !brandid) {
            return res.status(400).json({ Error: `Dealerid and Brandid is a required Parameter` })
        }
        let cleanPart = null;
        if (partnumber) {
            cleanPart = cleanPartNumber(partnumber)
            // Check for Check
            const Check = await maxpartmapping(cleanPart,brandid, dealerid, locationids)

            if (Check == false) {
                return res.status(400).json({ message: `No Sales in 12 Month for this part` })
            }
            const flagCheck = await partflagCheck(cleanPart, dealerid, locationids, flag)
            // console.log(flagCheck);
            if (flagCheck == false) {
                return res.status(400).json({ message: `Please choose correct filter` })
            }

        }
        const query = `exec [z_scope].dbo.GetMAXData1 @brandid, @dealerid , @r1, @r2, @l1, @l2, @partnumber, @locationids, @maxvalueflag ,@seasonalid,@natureid,@modelid,@parttype;`
        
        // if (!cleanPart && !locationids) {
        //     return res.status(400).json({ Error: `partnumber or locationid is required` })
        // }
        const request = pool.request();

        // Handle potential NULL values correctly
        request.input('brandid', sql.Int, brandid)
        request.input('dealerid', sql.Int, dealerid)
        request.input('r1', sql.Int, r1 ?? null);
        request.input('r2', sql.Int, r2 ?? null);
        request.input('l1', sql.Int, l1 ?? null);
        request.input('l2', sql.Int, l2 ?? null);
        request.input('seasonalid', sql.Int, seasonalid ?? null);
        request.input('natureid', sql.Int, natureid ?? null);
        request.input('modelid', sql.Int, modelid ?? null);
        request.input('partnumber', sql.VarChar, cleanPart ?? null);
        request.input('locationids', sql.VarChar, locationids ?? null);
        request.input('maxvalueflag', sql.Int, flag ?? null);
        request.input('parttype', sql.Int, parttype ?? null);

        const result = await request.query(query);

        res.status(200).json({ Data: result.recordset })
    } catch (error) {
        res.status(500).json({ Error: error.message })
    }
}
const userFeedbacklog = async (req, res) => {
    try {
        const pool = await getPool()
        const { brandid, dealerid, locationid, partnumber, max, remarkid, customrem, proposedqty, addedby } = req.body
        if (!brandid || !dealerid || !locationid || !addedby || !partnumber || max == null || proposedqty == null || !remarkid) {
            return res.status(400).json({ Error: `All Fields are required` })
        }
        const partCheck = await partBrandCheck(dealerid, locationid, partnumber)
        if (!partCheck) {
            return res.status(400).json({ message: `PartNumber is Invalid Not in Max` })
        }

        const dynamicTable = `[UAD_VON]..UAD_VON_SPMFeedback_${brandid}`
        // console.log(dynamicTable);
        const previousStatusCheck = await statusCheck(locationid, partnumber, dynamicTable)
        if (!previousStatusCheck) {
            return res.status(200).json({ message: `Previous feedback has pending state` })
        }
        let LatestPart = null;
        try {
            const LatestPartQuery = `
            Declare @latest varchar(20)
            Declare @partnumber varchar(20) = '${partnumber}'
            select @latest = CASE when pm.PartNumber1 = sm.PartNumber1 then sm.subpartnumber1 else pm.partnumber1 end 
            from z_scope.dbo.substitution_master sm
            join z_scope.dbo.part_master pm on pm.brandid = sm.brandid and pm.partnumber1 = sm.partnumber1
            where pm.partnumber1 = @partnumber and pm.brandid = ${brandid}
            Select ISNULL(@latest,@partnumber)Latest `

            const result = await pool.request().query(LatestPartQuery)

            LatestPart = result.recordset.length > 0 ? result.recordset[0].Latest : null;

        } catch (error) {
            return res.status(500).json({ Error: error.message, Error: `Error in Finding LatestPart` })
        }
        let previousFBID = null;
        try {
            const previousFBQuery = `
        SELECT TOP 1 FeedbackID 
        FROM ${dynamicTable}
        WHERE partnumber = '${partnumber}' 
        ORDER BY FeedbackDate DESC
       `;
            //    console.log(previousFBQuery);


            const previousFBResult = await pool.request()
                // .input('partnumber', sql.VarChar, partnumber)
                .query(previousFBQuery);
            // console.log(previousFBResult);

            previousFBID = previousFBResult.recordset.length > 0 ? previousFBResult.recordset[0].FeedbackID : null;
            // console.log(previousFBID);

        } catch (error) {
            return res.status(500).json({ Error: error.message, Error: `Error in Finding Previous Feedback` })
        }
        // console.log(remarkid);

        const query = `
                   Insert into  ${dynamicTable} (brandid , dealerid , locationid , PartNumber , LatestPartNumber , MaxValue , UserID , UserFBRemarkID ,Customrem, ProposedQty , FeedbackDate , PreviousFBID)
                   Values (@brandid,@dealerid , @locationid , @partnumber,@latestid,@max,@userid,@userfbid,@customrem,@proposedqty,GETDATE(),@previousfbid)`
        const request = await pool.request()
        request.input('brandid', sql.TinyInt, brandid)
        request.input('dealerid', sql.Int, dealerid)
        request.input('locationid', sql.Int, locationid)
        request.input('partnumber', sql.VarChar, partnumber)
        request.input('userid', sql.Int, addedby)
        request.input('latestid', sql.VarChar, LatestPart)
        request.input('max', sql.Int, max)
        request.input('userfbid', sql.Int, remarkid)
        request.input('customrem', sql.VarChar, customrem)
        request.input('proposedqty', sql.Int, proposedqty)
        request.input('previousfbid', sql.Int, previousFBID)

        await request.query(query)
        res.status(200).json({ message: `Success` })
    } catch (error) {
        res.status(500).json({ Error: error.message })
    }
}
const viewLog = async (req, res) => {
    try {
        const pool = await getPool()
        const { brandid, dealerid, locationid, partnumber } = req.body
        if (!brandid || !dealerid) {
            return res.status(400).json({ message: `Brandid and Dealerid are required Parameter` })
        }
        if (!locationid ||  !partnumber) {  
            return res.status(400).json({ message: `Locationid or partnumber anyone is required` })
        }
        const spmdynamicTable = `UAD_VON..UAD_VON_SPMFeedback_${brandid}`
        const admindynamicTable = `UAD_VON..UAD_VON_AdminFeedback_${brandid}`

        // const query = ` use [UAD_VON]
        // DECLARE @LocationID INT = ${locationid}  -- Set a value if filtering by location
        // DECLARE @PartID INT = ${partid}      -- Set a value if filtering by part
        // SELECT li.brand,li.Dealer,li.Location, pm.PartNumber, pm.PartDesc, pm.Category, pm.MRP, sf.MaxValue, CASE 
        // WHEN rm.Remark = 'Custom' THEN sf.Customrem 
        // ELSE rm.Remark 
        // END AS UserRemark,
        // sf.ProposedQty, sf.FeedbackDate, rmm.remark as AdminRemark, af.customrem,af.ApprovedQty , af.AdminFBDate ,sf.Status
        // FROM ${spmdynamicTable} sf
        // JOIN z_scope..part_master pm 
        // ON pm.brandid = sf.Brandid AND pm.partid = sf.partid
        // LEFT JOIN ${admindynamicTable} af on af.FeedbackID = sf.FeedbackID
        // LEFT JOIN UAD_VON..UAD_VON_Remarksmaster rmm 
        // ON rmm.Remarkid = af.AdminRemark
        // JOIN z_scope..locationinfo li 
        // ON li.LocationID = sf.Locationid
        // JOIN UAD_VON..UAD_VON_Remarksmaster rm 
        // ON rm.Remarkid = sf.UserFBRemarkID 
        // WHERE sf.Dealerid = ${dealerid}
        // AND (
        //     (@LocationID IS NOT NULL AND sf.locationid = @LocationID) 
        //     OR 
        //     (@PartID IS NOT NULL AND pm.partid = @PartID)
        // )
        // `
        const query = `
    USE [UAD_VON];
    SELECT 
        li.Brand, li.Dealer, li.Location, sf.PartNumber,
         pm.PartDesc, pm.Category, pm.MRP, 
        sf.MaxValue, 
        CASE 
            WHEN rm.Remark = 'Custom' THEN sf.Customrem 
            ELSE rm.Remark 
        END AS UserRemark,
        sf.ProposedQty, sf.FeedbackDate, 
         CASE 
            WHEN rmm.Remark = 'Custom' THEN af.Customrem 
            ELSE rmm.Remark 
        END AS AdminRemark, af.ApprovedQty, 
        af.AdminFBDate, sf.Status ,
         af.adminid , CONCAT(amg.vcFirstName, ' ',amg.vcLastName)as updatedby
    FROM ${spmdynamicTable} sf
    LEFT JOIN z_scope..part_master pm 
        ON pm.brandid = sf.Brandid AND pm.partnumber1 = sf.PartNumber
    LEFT JOIN ${admindynamicTable} af 
        ON af.FeedbackID = sf.FeedbackID
    LEFT JOIN UAD_VON..UAD_VON_Remarksmaster rmm 
        ON rmm.Remarkid = af.AdminRemark
    JOIN z_scope..locationinfo li 
        ON li.LocationID = sf.Locationid
    JOIN UAD_VON..UAD_VON_Remarksmaster rm 
        ON rm.Remarkid = sf.UserFBRemarkID 
    LEFT join z_scope..AdminMaster_GEN amg
		ON amg.bintId_Pk = af.adminid
    WHERE sf.Dealerid = @dealerid
    AND (@LocationID IS NULL OR sf.locationid = @LocationID)
    AND (@PartNumber IS NULL OR sf.PartNumber = @PartNumber);
`;

        const request = await pool.request();
        request.input('dealerid', sql.Int, dealerid);
        request.input('LocationID', sql.Int, locationid);
        request.input('PartNumber', sql.VarChar, partnumber);

        const result = await request.query(query);

        // const result = await pool.request().query(query)
        res.status(200).json({ Data: result.recordset })
    } catch (error) {
        res.status(500).json({ Error: error.message, message: `Error in userViewLog` })
    }
}
const adminView = async (req, res) => {
    try {
        const pool = await getPool()
        const { brandid, dealerid, r1, r2, l1, l2, partnumber, locationids, flag, seasonalid, modelid, natureid, status, parttype, pageno, pagesize } = req.body
        // console.log(brandid, dealerid, r1, r2 ,l1,l2, partnumber , locationid , flag, seasonalid, modelid, natureid, status,parttype, pageno, pagesize);
        let cleanPart = null;

        if (!brandid || !dealerid || !pageno || !pagesize) {
            return res.status(400).json({ Error: `Brandid and Dealerid are required Parameter` })
        }
        if (partnumber) {
             if(!dealerid){
                return res.status(400).json({message : `Dealer Is required when searching a part`})
            }
        //  cleanPart = cleanPartNumber(partnumber)
         cleanPart = partnumber ? cleanPartNumber(partnumber) : null;

            const Check = await maxpartmapping(cleanPart,brandid, dealerid, locationids)
            if (Check == false) {
                return res.status(400).json({ message: `No Sales in 12 Month for this part` })
            }
            const flagCheck = await partflagCheck(cleanPart, dealerid, locationids, flag)
            // console.log(flagCheck);
            if (flagCheck == false) {
                return res.status(400).json({ message: `Please choose correct filter` })
            }
        }
        // const query = `use z_scope EXEC sp_MAXAdminView @brandid ,@dealerid ,@locationid ,@seasonalid ,@natureid ,@modelid,@PartNumber,@r1 ,@r2,@l1,@l2 ,@MaxValueFlag,@parttype,@pageno,@pagesize;`
        // const query = `exec [z_scope].dbo.GetMAXDataAdmin @brandid,@dealerid , @r1, @r2,@l1, @l2, @partnumber, @locationid, @maxvalueflag ,@seasonalid,@natureid,@modelid,@status,@parttype;`
        // console.log(query);

        // if (!partnumber && !locationid) {
        //     return res.status(400).json({ Error: `partnumber or locationid is required` })
        // }

        const request = pool.request();

        // // Handle potential NULL values correctly
        // request.input('brandid', sql.Int, brandid)
        // request.input('dealerid', sql.Int, dealerid)
        // request.input('pageno', sql.Int, pageno)
        // request.input('pagesize', sql.Int, pagesize)
        // request.input('r1', sql.Int, r1 ?? null);
        // request.input('r2', sql.Int, r2 ?? null);
        // request.input('l1', sql.Int, l1 ?? null);
        // request.input('l2', sql.Int, l2 ?? null);
        // request.input('seasonalid', sql.Int, seasonalid ?? null);
        // request.input('natureid', sql.Int, natureid ?? null);
        // request.input('modelid', sql.Int, modelid ?? null);
        // request.input('PartNumber', sql.VarChar, cleanPart);
        // request.input('locationid', sql.Int, locationid ?? null);
        // request.input('MaxValueFlag', sql.Int, flag ?? null);
        // request.input('parttype', sql.Bit, parttype ?? null);

        const result = await pool.request()
    .input('brandid', sql.Int, brandid)
    .input('dealerid', sql.Int, dealerid)
    .input('locationids', sql.VarChar, locationids ?? null)
    .input('seasonalid', sql.Int, seasonalid ?? null)
    .input('natureid', sql.Int, natureid ?? null)
    .input('modelid', sql.Int, modelid ?? null)
    .input('PartNumber', sql.VarChar, cleanPart)
    .input('r1', sql.Int, r1 ?? null)
    .input('r2', sql.Int, r2 ?? null)
    .input('l1', sql.Int, l1 ?? null)
    .input('l2', sql.Int, l2 ?? null)
    .input('MaxValueFlag', sql.Int, flag ?? null)
    .input('parttype', sql.Bit, parttype ?? null)
    .input('pageno', sql.Int, pageno)
    .input('pagesize', sql.Int, pagesize)
    .execute('z_scope.dbo.sp_MAXAdminViewL');
        // const result = await request.query(query);
        // console.log(result.recordset);

        res.status(200).json({ Data: result.recordset })
    } catch (error) {
        res.status(500).json({ Error: error.message })
    }
}
const adminFeedbackLog = async (req, res) => {
    try {
        const pool = await getPool()
        const { brandid, dealerid, locationid, feedbackid, AdminRemark, customRem, ApprovedQty, addedby } = req.body
        if ((!brandid || !dealerid || !locationid || !AdminRemark || !addedby) || (feedbackid == null) || (ApprovedQty == null)) {
            return res.status(400).json({ message: `All Fields are required and Feedbackid cannot be null` })
        }

        const dynamicTable = `[UAD_VON]..UAD_VON_AdminFeedback_${brandid}`
        const userdynamicTable = `[UAD_VON]..UAD_VON_SPMFeedback_${brandid}`
        let PreviousAdminFBID = null;
        // console.log(PreviousAdminFBID);

        try {
            const previousAdminFBQuery = `
            select AdminFBID from ${dynamicTable} where FeedbackID = (
            select PreviousFBID from ${userdynamicTable} A
            join ${dynamicTable} B on A.FeedbackID = B.FeedbackID
            where A.FeedbackID = ${feedbackid}
            )`;
            // console.log(previousAdminFBQuery);
            
            const previousAdminFBResult = await pool.request().query(previousAdminFBQuery);
            // console.log(previousAdminFBResult);

            PreviousAdminFBID = previousAdminFBResult.recordset.length > 0 ? previousAdminFBResult.recordset[0].AdminFBID : null;
            // console.log(PreviousAdminFBID);

        } catch (error) {
            return res.status(500).json({ Error: error.message, Error: `Error in Finding Previous Feedback` })
        }
        let query = ` use [UAD_VON]             
                    insert into ${dynamicTable} (brandid,  dealerid , locationid, feedbackid ,AdminID,AdminRemark,ApprovedQty,PreviousAdminFBID,customrem)
                    values (@brandid , @dealerid , @locationid ,@feedbackid , @addedby , @adminremarkid , @approvedqty,@previousadminfbid,@customrem)`

        const request = await pool.request()
        request.input('brandid', sql.TinyInt, brandid)
        request.input('dealerid', sql.Int, dealerid)
        request.input('locationid', sql.Int, locationid)
        request.input('feedbackid', sql.Int, feedbackid)
        request.input('addedby', sql.Int, addedby)
        // request.input('latestid',sql.VarChar,LatestPartID)            
        // request.input('max',sql.Int,max)            
        request.input('adminremarkid', sql.Int, AdminRemark)
        request.input('customrem', sql.VarChar, customRem)
        request.input('approvedqty', sql.Int, ApprovedQty)
        request.input('previousadminfbid', sql.Int, PreviousAdminFBID)

        const result = await request.query(query)
        try {
            query = `update ${userdynamicTable} set Status = 'Reviewed' where feedbackid = ${feedbackid} `
            await pool.request().query(query)
        } catch (error) {
            res.status(500).json({ Error: error.message })
        }

        res.status(200).json({ message: `Success` })
    } catch (error) {
        res.status(500).json({ Error: error.message })
    }

}
const partFamily = async (req, res) => {
    try {
        const pool = await getPool()
        const { partnumber, brandid } = req.body
        if (!partnumber || !brandid) {
            return res.status(400).json({ Error: `partnumber and brandid is required` })
        }
        // console.log(partnumber);

        const query = `use z_scope
    DECLARE @Part TABLE (partnumber varchar(30),BrandId int)
	
        declare @latestpart varchar(20) 
        select @latestpart = subpartnumber1 from Substitution_Master (nolock)
        where brandid = @InputBrandID and (partnumber1 = @InputPart or subpartnumber1 = @InputPart)

		insert into @Part(partnumber,BrandId)
        select partnumber1 , @InputBrandID  from substitution_master (nolock) where brandid = @InputBrandID and subpartnumber1= @latestpart
        union 
        select ISNULL(@latestpart,@InputPart) ,@InputBrandID

	SELECT  
    pm.PartNumber1,
	CASE when pf.partnumber = sm.partnumber then sm.subpartnumber else pf.partnumber end as LatestPartNumber,
    pm.PartDesc,
    pm.LandedCost,
    pm.MRP,
    pm.PartID,
    pm.Category,
    pm.MOQ,
    pm.BrandID
    FROM z_scope..Part_Master pm
    JOIN @Part pf ON pm.PartNumber1 = pf.partnumber AND pm.BrandID = pf.BrandID
	left  JOIN z_scope..Substitution_Master sm on pf.BrandID = sm.brandid and pf.partnumber = sm.partnumber1
    ORDER BY pm.PartNumber1, pm.BrandID;`

        const result = await pool.request()
            .input('InputPart', sql.VarChar, partnumber)
            .input('InputBrandID', sql.Int, brandid)
            .query(query)
        // console.log(result.recordset);

        res.status(200).json({ Data: result.recordset })
    } catch (error) {
        res.status(500).json({ Error: error.message })
    }
}
const countPending = async (req, res) => {
    try {
        const pool = await getPool()
        const { brandid, dealerid } = req.body

        const query = `USE [UAD_VON]; 
DECLARE @sql NVARCHAR(MAX) = N'';
SELECT @sql = @sql + 
    'SELECT li.Brand,li.brandid, li.dealer,li.dealerid, li.location,li.locationid, COUNT(*) AS Pending ' +
    'FROM ' + QUOTENAME(name) + ' a ' + 
    'JOIN z_scope.dbo.locationinfo li ON li.locationid = a.locationid ' + 
    'WHERE a.status = ''Pending'' ' +
    'GROUP BY li.Brand,li.brandid, li.dealer,li.dealerid,li.locationid, li.location UNION ALL ' 
FROM sys.tables
WHERE name LIKE 'UAD_VON_SPMFeedback_%';

-- Remove the last ' UNION ALL ' to avoid syntax error
IF LEN(@sql) > 10
    SET @sql = LEFT(@sql, LEN(@sql) - 10);

-- Append ORDER BY
SET @sql = @sql + ' ORDER BY Pending DESC;';

-- Execute the dynamically built SQL
EXEC sp_executesql @sql;`
        const result = await pool.request().query(query)
        // console.log(result.recordset);
        res.status(200).json({ Data: result.recordset })
    } catch (error) {
        res.status(500).json({ Error: error.message })
    }
}

const partFamilySale = async (req, res) => {
    try {
        // const pool = await getPool()
        const { partnumber, brandid, dealerid, locationid } = req.body
        if (!partnumber || !brandid || !dealerid || !locationid) {
            return res.status(400).json({ message: `All fields are required` })
        }
        const data = await MotherChildFamilySaleservice(brandid, dealerid, locationid, partnumber)
        res.status(200).json({ Data: data.recordset })
    } catch (error) {
        res.status(500).json({ Error: error.message })
    }

}

// const adminPendingView = async (req, res) => {
//     try {
//         const pool = await getPool()
//         const { brandid, dealerid, locationid, status, seasonalid, modelid, natureid , partnumber , r1 , r2 , l1 , l2 ,flag , parttype } = req.body
//         // console.log(brandid, dealerid, locationid, status, seasonalid, modelid, natureid , partnumber , r1 , r2 , l1 , l2 ,flag , parttype);
//         if (!brandid) {
//             return res.status(400).json({ message: `Brandid is required` })
//         }
//         const query = `use [UAD_VON] EXEC sp_GetAdminView @brandid = @brandid, @dealerid = @dealerid, @locationid = @locationid,@Status = @status,@seasonalid = @seasonalid, @natureid = @natureid, @modelid = @modelid, @PartNumber = @PartNumber,@r1=@r1,@r2=r2,@l1=@l1,@l2=@l2,@MaxValueFlag=@MaxValueFlag,@parttype=@parttype;`
//         // console.log(query);

//         const result = await pool.request()
//             .input('brandid', sql.Int, brandid)
//             .input('dealerid', sql.Int, dealerid)
//             .input('locationid', sql.Int, locationid)
//             .input('status', sql.Bit, status)
//             .input('seasonalid', sql.Int, seasonalid ?? null)
//             .input('natureid', sql.Int, natureid ?? null)
//             .input('modelid', sql.Int, modelid ?? null)
//             .input('partnumber', sql.VarChar(50), partnumber ?? null)
//             .input('r1', sql.Decimal(10,2), r1 ?? null)
//             .input('r2', sql.Decimal(10,2), r2 ?? null)
//             .input('l1', sql.Decimal(10,2), l1 ?? null)
//             .input('l2', sql.Decimal(10,2), l2 ?? null)
//             .input('MaxValueFlag', sql.Int, flag ?? null)
//             .input('parttype', sql.Int, parttype ?? null)
//             .query(query)
//         // console.log(result.recordset);
//         res.status(200).json({ Data: result.recordset })
//     } catch (error) {
//         res.status(500).json({ Error: error.message })
//     }
// }
const adminPendingView = async (req, res) => {
    try {
        const pool = await getPool();
        let {
            brandid,
            dealerid,
            locationids,
            status,
            seasonalid,
            modelid,
            natureid,
            partnumber,
            r1,
            r2,
            l1,
            l2,
            flag,
            parttype,
            exportFlag
        } = req.body;

        brandid = Number(brandid);
        dealerid = dealerid !== null ? Number(dealerid) : null;
        locationids = locationids !== null ? locationids : null;
        status = status !== null ? Number(status) : null;
        seasonalid = seasonalid !== null ? Number(seasonalid) : null;
        modelid = modelid !== null ? Number(modelid) : null;
        natureid = natureid !== null ? Number(natureid) : null;
        r1 = r1 !== null ? Number(r1) : null;
        r2 = r2 !== null ? Number(r2) : null;
        l1 = l1 !== null ? Number(l1) : null;
        l2 = l2 !== null ? Number(l2) : null;
        flag = flag !== null ? Number(flag) : null;
        parttype = parttype !== null ? Number(parttype) : null;

        if (Number(exportFlag) === 1) {
            status = null;
        }

        if (!brandid) {
            return res.status(400).json({ message: `Brandid is required` });
        }
        let cleanPart = null;
        if (partnumber) {
            if(!dealerid){
                return res.status(400).json({message : `Dealer Is required when searching a part`})
            }
            // cleanPart = cleanPartNumber(partnumber)
            cleanPart = partnumber ? cleanPartNumber(partnumber) : null;
            const Check = await maxpartmapping(cleanPart,brandid, dealerid, locationids)
            // console.log(Check);

            if (Check == false) {
                return res.status(400).json({ message: `No Sales in 12 Month for this part` })
            }
            const flagCheck = await partflagCheck(cleanPart, dealerid, locationids, flag)
            // console.log(flagCheck);
            if (flagCheck == false) {
                return res.status(400).json({ message: `Please choose correct MAX filter` })
            }
        }

        // const query = `
        //     USE [UAD_VON]
        //     EXEC sp_GetAdminView4 
        //         @brandid = @brandid,
        //         @dealerid = @dealerid,
        //         @locationid = @locationid,
        //         @Status = @status,
        //         @seasonalid = @seasonalid,
        //         @natureid = @natureid,
        //         @modelid = @modelid,
        //         @PartNumber = @PartNumber,
        //         @r1 = @r1,
        //         @r2 = @r2,
        //         @l1 = @l1,
        //         @l2 = @l2,
        //         @MaxValueFlag = @MaxValueFlag,
        //         @parttype = @parttype;
        // `;
        // console.log(query);
        
        // const result = await pool.request()
        //     .input('brandid', sql.Int, brandid)
        //     .input('dealerid', sql.Int, dealerid)
        //     .input('locationid', sql.Int, locationid)
        //     .input('status', sql.Bit, status)
        //     .input('seasonalid', sql.Int, seasonalid)
        //     .input('natureid', sql.Int, natureid)
        //     .input('modelid', sql.Int, modelid)
        //     .input('PartNumber', sql.VarChar(50), cleanPart)
        //     .input('r1', sql.Decimal(10, 2), r1)
        //     .input('r2', sql.Decimal(10, 2), r2)
        //     .input('l1', sql.Decimal(10, 2), l1)
        //     .input('l2', sql.Decimal(10, 2), l2)
        //     .input('MaxValueFlag', sql.Int, flag)
        //     .input('parttype', sql.Int, parttype)
        //     .query(query);

        const result = await pool.request()
    .input('brandid', sql.Int, brandid)
    .input('dealerid', sql.Int, dealerid)
    .input('locationids', sql.VarChar, locationids ?? null)
    .input('Status', sql.Bit, status ?? null)
    .input('seasonalid', sql.Int, seasonalid ?? null)
    .input('natureid', sql.Int, natureid ?? null)
    .input('modelid', sql.Int, modelid ?? null)
    .input('PartNumber', sql.VarChar(50), cleanPart ?? null)
    .input('r1', sql.Decimal(10, 2), r1 ?? null)
    .input('r2', sql.Decimal(10, 2), r2 ?? null)
    .input('l1', sql.Decimal(10, 2), l1 ?? null)
    .input('l2', sql.Decimal(10, 2), l2 ?? null)
    .input('MaxValueFlag', sql.Int, flag ?? null)
    .input('parttype', sql.Int, parttype ?? null)
    .input('exportFlag',sql.Bit , exportFlag )
    .execute('UAD_VON.dbo.sp_GetAdminView4L');
        
        res.status(200).json({ Data: result.recordset });
    } catch (error) {
        res.status(500).json({ Error: error.message });
    }
};

const dealerUpload = async (req, res) => {
    let transaction; // Declare transaction outside try block
    const { addedby } = req.body

    try {
        const pool = await getPool();
        transaction = await pool.transaction(); // Initialize transaction

        if (!req.file || req.file.length === 0) {
            return res.status(400).json({ message: "No files received" });
        }
        // console.log(req.file.path);

        let { headers, data } = await readExcel(req.file.path);
        // console.log(`data` , data);
        // console.log(headers)
        fs.unlinkSync(req.file.path); // Delete uploaded file after processing

        const REQUIRED_HEADERS = [
            "Brand",
            "Dealer",
            "Location",
            "Maxvalue",
            "partnumber",
            "UserRemark",
            "ProposedQty"
        ];


        // ✅ Check for required headers
        // const uploadedHeaders = Object.keys(data[0] || {});
        // console.log(uploadedHeaders);
        const missingHeaders = REQUIRED_HEADERS.filter(header => !headers.includes(header));
        // console.log(missingHeaders);

        if (missingHeaders.length > 0) {
            return res.status(400).json({
                message: "Missing headers or data",
                missingHeaders
            });
        }

        const cleanedData = data
            .filter(item => item.UserRemark !== null && item.UserRemark !== undefined && item.ProposedQty !== null && item.ProposedQty !== undefined &&  String(item.UserRemark).trim() !== "" &&  String(item.ProposedQty).trim() !== "")
            .map(({ Brand, Dealer, Location, Maxvalue, partnumber, UserRemark, ProposedQty }) => ({
                Brand,
                Dealer,
                Location,
                Maxvalue,
                partnumber,
                UserRemark,
                ProposedQty
            }));
        //  console.log(cleanedData[0]);

        const invalidUserRemarksData = invalidUserRemarks(cleanedData)
    // console.log(invalidAdminRemarks1);
    if(invalidUserRemarksData.length > 0){
        return res.status(400).json({message:'Invalid UserRemark Found in Excel',invalidUserRemarksData})
    }

        const isArrayEmpty = (arr) => !arr || arr.length === 0;
        if (isArrayEmpty(cleanedData)) {
            return res.status(400).json({ message: `UserFeedback and ProposedQty cannot be null or undefined` })
        }
        // Fetch the brandid and dealerid for a given brand and dealer if needed
        const brand = cleanedData[0].Brand;
        const dealer = cleanedData[0].Dealer;
        const location = cleanedData[0].Location;


        const queryIds = `SELECT brandid, dealerid , locationid
                    FROM z_scope..locationinfo 
                    WHERE brand LIKE '${brand}' AND dealer LIKE '${dealer}' AND location LIKE '${location}'`;

        const resultIds = await pool.request().query(queryIds);
        const { brandid, dealerid, locationid } = resultIds.recordset[0];
        // console.log(brandid, dealerid , locationid);

        // const partidpartnumbermapping = [];

        // const query = `select  partid , partnumber from z_scope..Stockable_Nonstockable_TD001_${dealerid} where Locationid = ${locationid} and addedby != 7 and Stockdate = (select MAX(stockdate) from z_scope..Stockable_Nonstockable_TD001_${dealerid} where Locationid = ${locationid} and addedby != 7)`;
        // // console.log(query);

        // const partidpartnumberresult = await pool.request().query(query);
        // // console.log(partidpartnumberresult);


        // if (partidpartnumberresult.recordset.length > 0) {
        //     partidpartnumbermapping.push(...partidpartnumberresult.recordset);
        // }
        // // console.log(partidpartnumbermapping);

        // const updatedCleanedData = cleanedData.map(item => {
        //     const matched = partidpartnumbermapping.find(
        //         mapItem => mapItem.partnumber === item.partnumber
        //     );

        //     return {
        //         ...item,
        //         Partid: matched ? matched.partid : null
        //     };
        // });


        // console.log("Final Item with Partid:", updatedCleanedData);

        // Get duplicates

        // console.log(cleanedData);

        const duplicateEntries = findLocationPartidDuplicates(cleanedData);
        if (!isArrayEmpty(duplicateEntries)) {
            return res.status(400).json({ Data: duplicateEntries })
        }
        // console.log('Duplicate combinations:', duplicateEntries); 


        // Extract distinct values from data
        const distinctLocations = [...new Set(cleanedData.map(item => item.Location))];
        const distinctBrands = [...new Set(cleanedData.map(item => item.Brand))];
        const distinctDealers = [...new Set(cleanedData.map(item => item.Dealer))];
        // const distinctPartid = [...new Set(cleanedData.map(item => item.Partid))];

        // console.log('Distinct Locations:', distinctLocations);
        // console.log('Distinct Brands:', distinctBrands);
        // console.log('Distinct Dealers:', distinctDealers);
        // console.log('Distinct PartID:', distinctPartid);


        // console.log('Brand & Dealer IDs:', { brandid, dealerid });

        // Now, similarly, fetch IDs for each distinct brand
        const brandResults = [];
        for (const b of distinctBrands) {
            const queryBrand = `SELECT brandid FROM z_scope..locationinfo WHERE brand LIKE '${b}'`;
            const brandResult = await pool.request().query(queryBrand);
            if (brandResult.recordset.length) {
                brandResults.push({
                    brand: b,
                    brandid: brandResult.recordset[0].brandid
                });
            }
        }
        const tableName = `UAD_VON..UAD_VON_SPMFeedback_${brandResults[0].brandid}`
        // console.log(tableName);
        // console.log('Brands with IDs:', brandResults);

        // And similarly, for each distinct dealer
        const dealerResults = [];
        for (const d of distinctDealers) {
            const queryDealer = `SELECT dealerid FROM z_scope..locationinfo WHERE dealer LIKE '${d}'`;
            const dealerResult = await pool.request().query(queryDealer);
            if (dealerResult.recordset.length) {
                dealerResults.push({
                    dealer: d,
                    dealerid: dealerResult.recordset[0].dealerid
                });
            }
        }
        // console.log('Dealers with IDs:', dealerResults);
        const maxTable = `z_scope..stockable_nonstockable_td001_${dealerResults[0].dealerid}`
        // console.log(maxTable);


        // Get location IDs for each distinct location
        const locationResults = [];
        let locResult
        for (const loc of distinctLocations) {
            const queryLocation = `
    SELECT locationid 
    FROM z_scope..locationinfo 
    WHERE brandid = ${brandid} 
      AND dealerid = '${dealerid}'
      AND location LIKE '${loc}'
  `;
            locResult = await pool.request().query(queryLocation);
            if (locResult.recordset.length) {
                locationResults.push({
                    location: loc,
                    locationid: locResult.recordset[0].locationid
                });
            }
        }

        // console.log('Locations with IDs:', locationResults);
        // console.log(locationResults[0].locationid);


        // console.log(locResult.recordset[0].locationid);
        const latestParts = [];

        // const queryLatestPartID = `SELECT partid, subpartid FROM z_scope..Substitution_Master WHERE brandid = ${brandResults[0].brandid}`;
        // const queryLatestPartID = `
        // select partid , partnumber1
        // from Part_Master where partnumber1 in (
        // select (CASE 
        // WHEN sn.partnumber1 = sm.partnumber1 THEN sm.subpartnumber ELSE sn.partnumber END) AS LatestPartno from Stockable_Nonstockable_TD001_${dealerResults[0].dealerid} sn
        // join LocationInfo li on li.LocationID = sn.Locationid
        // left join Substitution_Master sm on sm.partnumber1 = sn.partnumber1 and li.BrandID = sm.brandid
        // where sn.Stockdate = (select MAX(Stockdate) from Stockable_Nonstockable_TD001_${dealerResults[0].dealerid}) and sn.Locationid = ${locResult.recordset[0].locationid}) and brandid = ${brandResults[0].brandid}`

        //         const queryLatestPartID = `
        //         WITH LatestParts AS (
        //   SELECT
        //     sn.partnumber1,
        //     COALESCE(sm.subpartnumber, sn.partnumber1) AS LatestPartno,
        //     li.BrandID
        //   FROM z_scope..Stockable_Nonstockable_TD001_${dealerResults[0].dealerid} AS sn
        //   JOIN z_scope..LocationInfo     AS li
        //     ON li.LocationID = sn.LocationID
        //   LEFT JOIN z_scope..Substitution_Master AS sm
        //     ON sm.partnumber1 = sn.partnumber1
        //    AND sm.brandid     = li.BrandID
        //   WHERE sn.Stockdate = (
        //           SELECT MAX(Stockdate)
        //             FROM z_scope..Stockable_Nonstockable_TD001_${dealerResults[0].dealerid}
        //         )
        //     AND sn.LocationID = ${locResult.recordset[0].locationid}
        // )
        // SELECT
        //   lp.partnumber1,
        //   pm1.partid    AS PartID,
        //   lp.LatestPartno,
        //   pm2.partid    AS LatestPartID
        // FROM LatestParts AS lp
        // -- join to get the original PartID
        // JOIN z_scope..Part_Master AS pm1
        //   ON pm1.brandid      = lp.BrandID
        //  AND pm1.partnumber1  = lp.partnumber1
        // -- join to get the substituted/latest PartID
        // LEFT JOIN z_scope..Part_Master AS pm2
        //   ON pm2.brandid      = lp.BrandID
        //  AND pm2.partnumber1  = lp.LatestPartno;
        // `

        const queryLatestPart = `select sn.partnumber1 , CASE when sn.partnumber1 = sm.partnumber1 then sn.partnumber1 else sn.partnumber1 end as Latest from Stockable_Nonstockable_TD001_${dealerResults[0].dealerid} sn
                                left JOIN Substitution_Master sm on sn.Brandid = sm.brandid and sm.partnumber1 = sn.partnumber1
                                where Locationid = ${locResult.recordset[0].locationid} and Stockdate = ( SELECT MAX(Stockdate) FROM z_scope..Stockable_Nonstockable_TD001_${dealerResults[0].dealerid} where LocationID = ${locResult.recordset[0].locationid} and Addedby != 7) and sn.Addedby != 7`
        const queryResult = await pool.request().query(queryLatestPart);
        // console.log(queryResult);

        if (queryResult.recordset.length) {
            queryResult.recordset.forEach(row => {
                latestParts.push({
                    PartNumber: row.partnumber1,       // Mapping partid correctly
                    LatestPart: row.Latest // Mapping subpartid correctly
                });
            });
        }
        // console.log(`latestParts`,latestParts);

        // Inside "Get previousFBIDs" section
        const previousFBIDs = [];

        // Query for all locations in locationResults
        const queryPreviousFBID = `
    WITH RankedFeedback AS (
        SELECT 
            FeedbackID, 
            PartNumber, 
            locationid,
            ROW_NUMBER() OVER (PARTITION BY PartNumber, locationid ORDER BY FeedbackDate DESC) AS rn
        FROM ${tableName}
        WHERE locationid IN (${locationResults.map(l => l.locationid).join(',')})
    )
    SELECT FeedbackID, PartNumber, locationid
    FROM RankedFeedback
    WHERE rn = 1;
`;

        try {
            const previousFBResult = await pool.request().query(queryPreviousFBID);
            if (previousFBResult.recordset.length) {
                previousFBIDs.push(...previousFBResult.recordset.map(row => ({
                    PartNumber: row.partNumber,
                    LocationID: row.locationid, // Include locationid
                    PreviousFBID: row.FeedbackID
                })));
            }
        } catch (fetchError) {
            console.error("Error fetching PreviousFBIDs:", fetchError);

        }
        // console.log(`previousFBIDs`,previousFBIDs);

        // Inside "Get maxValue for each part-location pair" section
        let maxValueMapping = [];

        // Query for maxvalue for all relevant locations
        const queryMaxValue = `
    SELECT partnumber, locationid, maxvalue 
    FROM ${maxTable} 
    WHERE locationid IN (${locationResults.map(l => l.locationid).join(',')}) and addedby != 7
    AND stockdate = (
        SELECT MAX(stockdate)  
        FROM ${maxTable}  
        WHERE locationid IN (${locationResults.map(l => l.locationid).join(',')} ) and  addedby != 7
    )
`;
        // console.log(queryMaxValue);


        const maxResult = await pool.request().query(queryMaxValue);

        if (maxResult.recordset.length) {
            maxValueMapping = maxResult.recordset.map(row => ({
                PartNumber: row.partnumber,
                LocationID: row.locationid, // Use actual locationid
                MaxValue: row.maxvalue
            }));
        }

        // console.log(`maxValueMapping`,maxValueMapping);

        // console.log("PreviousFBIDs:", previousFBIDs);
        const UserID = addedby;
        // const UserFBRemarkID = 1; // Static feedback remark ID
        // Fetch remark mappings
        const remarkQuery = `SELECT RemarkID, Remark as RemarkName FROM UAD_VON..UAD_VON_RemarksMaster where usertype = 'U' and brandid = ${brandResults[0].brandid}`;
        const remarkResult = await pool.request().query(remarkQuery);

        const remarkMappings = remarkResult.recordset.map(row => ({
            RemarkID: row.RemarkID,
            RemarkName: row.RemarkName.trim().toLowerCase()
        }));
        const UserFBRemarkID = await getFeedbackId(brandResults[0].brandid, 'U')
        // console.log(UserFBRemarkID);

        //   console.log("latestPartIDs:", latestPartIDs);
        // console.log("maxValueMapping:", maxValueMapping);
        // console.log("previousFBIDs:", previousFBIDs);

        // Transform the data to only include the required fields
        const formattedData = cleanedData.map(item => {
            const brandMapping = brandResults.find(b => b.brand === item.Brand);
            const dealerMapping = dealerResults.find(d => d.dealer === item.Dealer);
            const locationMapping = locationResults.find(l => l.location === item.Location);

            // Convert locationid to NUMBER to match mappings
            const locationid = locationMapping ? Number(locationMapping.locationid) : null;

            // 1. LatestPartID Mapping
            const latestpartidMapping = latestParts.find(lp =>
                lp.PartNumber === item.partnumber // Ensure `Partid` exists in latestPartIDs
            );

            // 2. MaxValue Mapping
            const maxValueMappingItem = maxValueMapping.find(mv =>
                mv.PartNumber === item.partnumber &&
                mv.LocationID === locationid // Match numeric LocationID
            );

            // 3. PreviousFBID Mapping
            const partidPreviousFBIDMapping = previousFBIDs.find(pfb =>
                pfb.PartNumber === item.partnumber &&
                pfb.LocationID === locationid
            );

            // Find matching remark ID
            // console.log(remarkMappings);

            // const matchedRemark = remarkMappings.find(r =>
            //     r.RemarkName === (item.UserRemark || "")
            // );


            return {
                brandid: brandMapping?.brandid,
                dealerid: dealerMapping?.dealerid,
                locationid: locationid,
                maxvalue: maxValueMappingItem?.MaxValue ?? null, // Default to null if undefined
                // partnumber: item.partnumber,
                latestpartnumber: latestpartidMapping?.LatestPart ?? null,
                UserID: UserID,
                UserFBRemarkID: UserFBRemarkID,
                // UserFBRemarkID: matchedRemark?.RemarkID ?? null,
                CustomRem: item.UserRemark,
                ProposedQty: item.ProposedQty,
                PreviousFBID: partidPreviousFBIDMapping?.PreviousFBID ?? null,
                PartNumber: item.partnumber
            };
        });
        //         const missingRemarks = formattedData.filter(item => !item.UserFBRemarkID);

        // if (missingRemarks.length > 0) {
        //     return res.status(400).json({
        //         message: "Some remarks could not be mapped to RemarkID.",
        //         unmappedRemarks: missingRemarks.map(r => ({
        //             PartNumber: r.PartNumber,
        //             Remark: r.CustomRem
        //         }))
        //     });
        // }
        // console.log(formattedData);

        const invalidRecords = formattedData.filter(item =>
            !item.locationid ||
            item.maxvalue == null
            // !item.maxvalue == 0
        );
        // console.log(`invalid`,invalidRecords[0]);


        if (invalidRecords.length > 0) {
            return res.status(400).json({
                message: "Some records have missing data",
                invalidRecords: invalidRecords.map(r => ({
                    PartNumber: r.PartNumber,
                    Location: r.locationid,
                    MaxValue: r.maxvalue
                }))
            });
        }


        const check = await checkPendingFeedbackAndStatus(dealerid, tableName, formattedData);
        // console.log(check);


        if (check.length > 0) {
            return res.status(400).json({
                message: "Some records are in pending status.",
                pendingRecords: check
            });
        }

        // console.log(formattedData);

        // await transaction.begin(); // Start transaction
        // console.log(`formattedData`,formattedData);


       try {
         await insertData(formattedData, tableName) 
       } catch (error) {
        // console.log(error);
        return res.status(500).json({Error:error.message})
       } // Insert Function to insert formatted data into table
        // await transaction.commit(); // Commit transaction


        res.status(200).json({
            message: "Data inserted successfully"
            // , data: formattedData 
        });

    } catch (error) {
        console.error("Error in dealerUpload:", error);

        if (transaction) {
            await transaction.rollback(); // Rollback transaction on error
        }

        res.status(500).json({ Error: error.message });
    }
};

const adminUpload = async (req, res) => {
    // const pool = await getPool()
    const pool = await getPool()
    const { file, addedby } = req.body
    if (!addedby) {
        return res.status(400).json({ message: "addedby is required" });
    }
    if (!req.file || req.file.length === 0) {
        return res.status(400).json({ message: "No files received" });
    }
    // console.log(req.file.path);

    const { headers, data } = await readExcel(req.file.path);
    //   console.log(`data` , data);
    //   console.log(headers );


    fs.unlinkSync(req.file.path); // Delete uploaded file after processing
    const REQUIRED_HEADERS = [
        "brand", "dealer", "location", "feedbackid", "AdminRemark", "ApprovedQty"
    ];


    //  Check for required headers
    const missingHeaders = REQUIRED_HEADERS.filter(header => !headers.includes(header));
    if (missingHeaders.length > 0) {
        return res.status(400).json({
            message: "Missing headers or data",
            missingHeaders
        });
    }

// console.log(data[0],data[3]);

    const cleanedData = data
        .filter(item => item.AdminRemark !== null && item.AdminRemark !== undefined && item.ApprovedQty !== null && item.ApprovedQty !== undefined &&  String(item.AdminRemark).trim() !== "" &&  String(item.ApprovedQty).trim() !== "")
        .map(({ brand, dealer, location, feedbackid, AdminRemark, ApprovedQty }) => ({
            brand,
            dealer,
            location,
            feedbackid,
            AdminRemark,
            ApprovedQty
        }));
    // console.log(cleanedData);

    const invalidAdminRemarks = invalidRemarks(cleanedData)
    // console.log(invalidAdminRemarks1);
    if(invalidAdminRemarks.length > 0){
        return res.status(400).json({message:'Invalid AdminRemarks Found in Excel',invalidAdminRemarks})
    }
    

    const isArrayEmpty = (arr) => !arr || arr.length === 0;
    if (isArrayEmpty(cleanedData)) {
        return res.status(400).json({ message: `No data found to upload` })
    }
    const duplicateEntries = findLocationPartidDuplicatesAdmin(cleanedData);
    if (!isArrayEmpty(duplicateEntries)) {
        // console.log(duplicateEntries);

        return res.status(400).json({
            message: `These Locations and feedbackid are duplicate`,
            Data: duplicateEntries
        })
    }
    // Extract distinct values from data
    const distinctLocations = [...new Set(cleanedData.map(item => item.location))];
    const distinctBrands = [...new Set(cleanedData.map(item => item.brand))];
    const distinctDealers = [...new Set(cleanedData.map(item => item.dealer))];
    const distinctFeedbackids = [...new Set(cleanedData.map(item => item.feedbackid))];

    // console.log(distinctFeedbackids);


    const brand = data[0].brand;
    const queryIds = `SELECT top 1 brandid
                        FROM z_scope..locationinfo 
                        WHERE brand LIKE '${brand}'`;

    const resultIds = await pool.request().query(queryIds);
    // console.log(resultIds.recordset);
    const brandResults = [];
    for (const b of distinctBrands) {
        const queryBrand = `SELECT brandid FROM z_scope..locationinfo WHERE brand LIKE '${b}'`;
        const brandResult = await pool.request().query(queryBrand);
        if (brandResult.recordset.length) {
            brandResults.push({
                brand: b,
                brandid: brandResult.recordset[0].brandid
            });
        }
    }
    const AdmintableName = `UAD_VON..UAD_VON_AdminFeedback_${brandResults[0].brandid}`
    const tableName = `UAD_VON..UAD_VON_SPMFeedback_${brandResults[0].brandid}`
    // console.log(AdmintableName);

    const dealerResults = [];
    for (const d of distinctDealers) {
        const queryDealer = `SELECT dealerid FROM z_scope..locationinfo WHERE dealer LIKE '${d}'`;
        const dealerResult = await pool.request().query(queryDealer);
        if (dealerResult.recordset.length) {
            dealerResults.push({
                dealer: d,
                dealerid: dealerResult.recordset[0].dealerid
            });
        }
    }
    // console.log('Dealers with IDs:', dealerResults);
    if (dealerResults.length > 1) {
        return res.status(400).json({ message: `Multiple Dealers Found! Only Single Dealer is Allowed`, Dealers: dealerResults })
    }
    const maxTable = `z_scope..stockable_nonstockable_td001_${dealerResults[0].dealerid}`
    // console.log(maxTable);


    // Get location IDs for each distinct location
    const locationResults = [];

    for (const loc of distinctLocations) {
        const queryLocation = `
    SELECT locationid 
    FROM z_scope..locationinfo 
    WHERE brandid = ${resultIds.recordset[0].brandid} 
      AND dealerid = '${dealerResults[0].dealerid}'
      AND location LIKE '${loc}'
  `;
        const locResult = await pool.request().query(queryLocation);
        if (locResult.recordset.length) {
            locationResults.push({
                location: loc,
                locationid: locResult.recordset[0].locationid
            });
        }
    }

    // console.log('Locations with IDs:', locationResults);


    const previousFBIDs = [];
    const queryPreviousAdminFBID = `
    SELECT S.FeedbackID, A1.AdminFBID AS PreviousAdminFBID
    FROM ${AdmintableName} A1
    JOIN ${tableName} S ON A1.FeedbackID = S.PreviousFBID
    WHERE S.FeedbackID IN (${distinctFeedbackids.join(",")}); 
`;
    // console.log(queryPreviousAdminFBID);

    try {
        const previousFBResult = await pool.request().query(queryPreviousAdminFBID);
        // console.log(previousFBResult);

        previousFBIDs.push(...previousFBResult.recordset.map(row => ({
            FeedbackID: row.FeedbackID,
            PreviousAdminFBID: row.PreviousAdminFBID
        })));


    } catch (fetchError) {
        console.error("Error fetching PreviousAdminFBIDs:", fetchError);
    }

    // console.log(previousFBIDs);


    const AdminID = addedby; // Static User ID
    // const AdminRemark = 1; // Static feedback remark ID

    //     const remarkQuery = `
    //   SELECT RemarkID, Remark AS RemarkName 
    //   FROM UAD_VON..UAD_VON_RemarksMaster 
    //   WHERE usertype = 'A' AND brandid = ${brandResults[0].brandid}
    // `;
    //     const remarkResult = await pool.request().query(remarkQuery);

    //     const remarkMappings = remarkResult.recordset.map(row => ({
    //         RemarkID: row.RemarkID,
    //         RemarkName: row.RemarkName.trim().toLowerCase()
    //     }));

    const AdminFBRemarkID = await getFeedbackId(brandResults[0].brandid, 'A')

    const formattedData = cleanedData.map(item => {
        const brandMapping = brandResults.find(b => b.brand === item.brand);
        const dealerMapping = dealerResults.find(d => d.dealer === item.dealer);
        const locationMapping = locationResults.find(l => l.location === item.location);

        // Convert locationid to NUMBER to match mappings
        const locationid = locationMapping ? Number(locationMapping.locationid) : null;
        const previousMapping = previousFBIDs.find(prev => prev.FeedbackID === item.feedbackid);
        // Match AdminRemark dynamically
        // const matchedRemark = remarkMappings.find(r =>
        //     r.RemarkName === (item.AdminRemark || "").trim().toLowerCase()
        // );

        return {
            brandid: brandMapping?.brandid,
            dealerid: dealerMapping?.dealerid,
            locationid: locationid,
            feedbackid: item.feedbackid,
            AdminID: AdminID,
            AdminRemarkID: AdminFBRemarkID,
            // AdminRemarkID: matchedRemark?.RemarkID ?? null,
            ApprovedQty: item.ApprovedQty,
            CustomRem: item.AdminRemark,
            PreviousAdminFBID: previousMapping ? previousMapping.PreviousAdminFBID : null // Assign found value or null

        };
    });
    // console.log(formattedData);
    // const missingRemarks = formattedData.filter(item => !item.AdminRemarkID);

    // if (missingRemarks.length > 0) {
    //     return res.status(400).json({
    //         message: "Some remarks could not be mapped to RemarkID.",
    //         unmappedRemarks: missingRemarks.map(r => ({
    //             FeedbackID: r.feedbackid,
    //             Remark: r.CustomRem
    //         }))
    //     });
    // }

    const ids = formattedData.map(item => item.feedbackid).join(",")
    // console.log(ids);

    const check = await checkReviewedFeedbackByBrand(brandResults[0].brandid, formattedData);
    // console.log(check);

    if (check.length > 0) {
        return res.status(400).json({
            message: "Some records are already reviewed.",
            pendingRecords: check
        });
    }

    try {
        const { feedbackIds } = await insertAdminFeedback(formattedData, brandResults[0].brandid)
    } catch (error) {
        // console.log(error);
        return res.status(500).json({Error:error.message})

    }  // Insert Function to insert formatted data into table
    // Update the status to 'Reviewed' where FeedbackID is in the feedbackIds string
    try {
        const statusQuery = `
        UPDATE ${tableName}
        SET Status = 'Reviewed'
        WHERE FeedbackID IN (${ids})
      `;
        //   console.log(statusQuery);

        await pool.request().query(statusQuery);
    } catch (error) {
        return res.status(400).json({ message: `error in updating status Reviewed in admin , ${error.message}` })
    }
    res.status(200).json({ message: "Data inserted successfully", data: formattedData });

}

const maxpartmapping = async (partNumber, BrandId , DealerId, LocationIds) => {
    const pool = await getPool()
    // const query = `select * from z_scope..stockable_nonstockable_td001_${DealerId} where locationid = ${LocationId} and partnumber1 = '${partNumber}' and stockdate = (select MAX(stockdate) from z_scope..stockable_nonstockable_td001_${DealerId} where locationid = ${LocationId})`
    // const query = `with data as (
    //                 select locationid , MAX(Stockdate)Stockdate from z_scope..stockable_nonstockable_td001_${DealerId} where Addedby !=7
    //                 group by Locationid
    //                 )
    //                 select * from z_scope..stockable_nonstockable_td001_${DealerId} sn
    //                 join data d on d.Locationid = sn.Locationid and d.Stockdate = sn.Stockdate
    //                 where partnumber1 = '${partNumber}' and d.LocationId = ${LocationId}`

    const query = `
    use z_scope
        DECLARE @Part TABLE (partnumber varchar(30))
        declare @latestpart varchar(20) 
        select @latestpart = subpartnumber1 from Substitution_Master (nolock)
        where brandid = @brandid and (partnumber1 = @partnumber or subpartnumber1 = @partnumber)

		insert into @Part(partnumber)
        select partnumber1  from substitution_master (nolock) where brandid = @brandid and subpartnumber1= @latestpart
        union 
        select ISNULL(@latestpart,@partnumber) 
        drop table if exists #temp1
		CREATE TABLE #temp1 (  
		LocationID INT,  
		MaxDate DATETIME  
		); 
 
		INSERT INTO #temp1   
		SELECT locationid, MAX(stockdate) AS MaxDate  
		FROM stockable_nonstockable_td001_${DealerId} (NOLOCK)  
		WHERE  addedby != 7 and (             @LocationIDs IS NULL             OR LocationID IN (                 SELECT TRY_CAST(value AS int)                 FROM STRING_SPLIT(@LocationIDs,',')                 WHERE TRY_CAST(value AS int) IS NOT NULL        ))
		GROUP BY LocationID;  

        select * from z_scope..stockable_nonstockable_td001_${DealerId} sn
        join #temp1 d on d.Locationid = sn.Locationid and d.MaxDate = sn.Stockdate
        JOIN @Part p on p.partnumber = sn.partnumber1`

    const result = await pool.request().input('brandid',sql.Int,BrandId).input('partnumber',sql.VarChar,partNumber).input('LocationIDs',sql.VarChar,LocationIds).query(query)
    // console.log(query);
    // console.log("maxresult",result.recordset);
    
    if (result.recordset.length === 0) {
        return false
    }
    return true;
}

// const partflagCheck = async (partnumber, dealerid, locationids, flag) => {
//     if(flag == null){
//         return true
//     }
//     const pool = await getPool()
//     const queryflagzero = `use z_scope select * from z_scope..stockable_nonstockable_td001_${dealerid} where locationid = ${locationid} and partnumber1 = '${partnumber}' and Addedby != 7 and Maxvalue = 0 and stockdate = (select MAX(stockdate) from z_scope..stockable_nonstockable_td001_${dealerid} where locationid = ${locationid} and Addedby != 7)`
//     const queryflagone = `use z_scope select * from z_scope..stockable_nonstockable_td001_${dealerid} where locationid = ${locationid} and partnumber1 = '${partnumber}' and Addedby != 7 and Maxvalue > 0 and stockdate = (select MAX(stockdate) from z_scope..stockable_nonstockable_td001_${dealerid} where locationid = ${locationid} and Addedby != 7)`
//     let result;
//     if (flag) {

//         result = await pool.request().query(queryflagone)
//         // console.log(`1`,result.recordset);
        
//     }
//     else {
//         result = await pool.request().query(queryflagzero)
//         // console.log(2,result.recordset);
//     }
//     console.log('flagCheck',result);

//     if (result.recordset.length === 0) {
//         return false
//     }
//     return true;
// }

const partflagCheck = async (partnumber, dealerid, locationids, flag) => {
    if (flag == null) {
        return true;
    }

    const pool = await getPool();

    const tableName = `[z_scope].dbo.[stockable_nonstockable_td001_${Number(dealerid)}]`;

    const query = `
        ;WITH data AS (
            SELECT 
                locationid, 
                MAX(stockdate) AS MaxDate
            FROM ${tableName} WITH (NOLOCK)
            WHERE Addedby != 7
              AND (
                    @LocationIDs IS NULL
                    OR LocationID IN (
                        SELECT TRY_CAST(value AS INT)
                        FROM STRING_SPLIT(@LocationIDs, ',')
                        WHERE TRY_CAST(value AS INT) IS NOT NULL
                    )
                  )
            GROUP BY LocationID
        )
        SELECT TOP 1 1 AS Found
        FROM ${tableName} sn WITH (NOLOCK)
        JOIN data d 
            ON d.LocationID = sn.LocationID 
           AND d.MaxDate = sn.StockDate
        WHERE sn.PartNumber1 = @PartNumber
          AND sn.Addedby != 7
          AND (
                (@Flag = 0 AND sn.Maxvalue = 0)
                OR
                (@Flag = 1 AND sn.Maxvalue > 0)
              );
    `;

    const result = await pool.request()
        .input('PartNumber', sql.VarChar(50), partnumber)
        .input('LocationIDs', sql.VarChar(300), locationids || null)
        .input('Flag', sql.Int, flag)
        .query(query);

    // console.log('flagCheck', result.recordset);

    return result.recordset.length > 0;
};

async function getFeedbackId(brandid, usertype) {
    try {
        const pool = await getPool()
        const query = `select remarkid from UAD_VON..UAD_VON_RemarksMaster where brandid = '${brandid}' and remark = 'Custom' and usertype = '${usertype}'`
        const result = await pool.request().query(query)
        return result.recordset[0].remarkid
    } catch (error) {
        throw new Error(`Error in getFeedbackId: ${error.message}`)
    }
}
export { remarkMaster, userView, adminView, userFeedbacklog, viewLog, newRemark, viewRemark, adminFeedbackLog, partFamily, countPending, partFamilySale, adminPendingView, dealerUpload, adminUpload }