import { getPool1 } from "../../db/db.js"
import sql from 'mssql'
import { ApiError } from "../../utils/ApiError.js"

const insertRemarkService = async (BrandId, DealerId, LocationId, Remark, Remarktype, userid) => {
    const pool = await getPool1()
    const query = `use z_scope
    insert into aap_remarkmaster(BrandId,DealerId,LocationId , Remark  , Remarktype , AddedBy)
    values(@BrandId,@DealerId,@LocationId,@Remark,@RemarkType,@AddedBy)
    `

    const result = await pool.request()
        .input('BrandId', sql.Int, BrandId ?? null)
        .input('DealerId', sql.Int, DealerId ?? null)
        .input('LocationId', sql.Int, LocationId ?? null)
        .input('Remark', sql.VarChar(100), Remark)
        .input('RemarkType', sql.Int, Remarktype)
        .input('AddedBy', sql.Int, userid)
        .query(query)

    // console.log(result);

    return result
}

const remarktypeMasterService = async (Type) => {
    try {
        const pool = await getPool1()
        const query = `use z_scope
        select Id , Remark from aap_remarktypemaster where remarkfor = '${Type}' and status = 1`
        const result = await pool.request().query(query)
        return result.recordset
    } catch (error) {
        throw new ApiError(500, error.message);

    }
}

const remarkViewService = async (BrandId, DealerId, LocationId, RemarkFor, RemarkTypeId) => {
    try {
        const pool = await getPool1()
        const query = `use z_scope select rm.Id ,bm.vcbrand Brand , dm.vcName Dealer , li.Location , bm.bigid BrandId , dm.bigid DealerId , li.locationid , rm.Remark, rtm.RemarkFor , rtm.Remark Type , rm.Addedby AddedbyId ,CONCAT(vcFirstName,' ',vcLastName)Addedby , rm.AddedOn  from AAP_RemarkMaster rm
            JOIN AAP_RemarkTypeMaster rtm on rm.Remarktype = rtm.Id
            LEFT JOIN LocationInfo li on li.locationid = rm.locationid
			left join Brand_Master bm on bm.bigid = rm.BrandId
			left join Dealer_Master dm on dm.bigid = rm.DealerId
			join AdminMaster_GEN amg on amg.bintId_Pk = rm.AddedBy
            where (@BrandId IS NULL OR rm.Brandid = @BrandId)
            AND (@DealerId IS NULL OR rm.DealerId = @DealerID)
            AND (@LocationId IS NULL OR rm.LocationId = @LocationID)
            AND (@RemarkFor IS NULL OR rtm.RemarkFor = @RemarkFor)
            AND (@RemarkTypeId IS NULL OR rtm.Id = @RemarkTypeId)`

        const result = await pool.request()
            .input('BrandId', sql.Int, BrandId ?? null)
            .input('DealerId', sql.Int, DealerId ?? null)
            .input('LocationId', sql.Int, LocationId ?? null)
            .input('RemarkFor', sql.VarChar(1), RemarkFor)
            .input('RemarkTypeId', sql.Int, RemarkTypeId ?? null)
            .query(query)
        // console.log(result);
        return result.recordset
    } catch (error) {
        throw new ApiError(500, error.message);
    }
}

const editRemarkService = async (Id, BrandId, DealerId, LocationId, Remark, RemarkTypeId) => {
    try {
        const pool = await getPool1()
        const query = `use z_scope
        update AAP_RemarkMaster
        set BrandId = @BrandId,
    	DealerId = @DealerId,
    	LocationId = @LocationId,
    	Remark = @Remark,
    	Remarktype = @RemarkTypeId
        where id = @Id`

        const result = await pool.request()
            .input('Id', sql.Int, Id)
            .input('BrandId', sql.Int, BrandId ?? null)
            .input('DealerId', sql.Int, DealerId ?? null)
            .input('LocationId', sql.Int, LocationId ?? null)
            .input('Remark', sql.VarChar(100), Remark)
            .input('RemarkTypeId', sql.Int, RemarkTypeId ?? null)
            .query(query)
    } catch (error) {
        throw new ApiError(500, error.message)
    }
}

const insertRemarkSettingService = async (payload, ApprovalStatus, GroupStockStatus, GainerStatus, addedBy) => {
    const pool = await getPool1();

    if (!Array.isArray(payload) || payload.length === 0) {
        throw new Error("payload must be a non-empty array");
    }
    if (addedBy == null) {
        throw new Error("addedBy is required");
    }

    // basic validation + normalize to int
    //   const rows = payload.map((x, i) => {
    //     const BrandId = Number(x.BrandId);
    //     const DealerId = Number(x.DealerId);
    //     const LocationId = Number(x.LocationId);

    // if (!Number.isInteger(BrandId) || !Number.isInteger(DealerId) || !Number.isInteger(LocationId)) {
    //   throw new Error(`Invalid BrandId/DealerId/LocationId at index ${i}`);
    // }

    // return { BrandId, DealerId, LocationId };
    //   });

    //   console.log(rows);

    const tx = new sql.Transaction(pool);

    try {
        await tx.begin();

        // MERGE (UPSERT):
        // - If same BrandId+DealerId+LocationId exists => update flags
        // - Else => insert new row
        const req = new sql.Request(tx);
        req.input("json", sql.NVarChar(sql.MAX), JSON.stringify(payload));
        req.input("ApprovalRemarks", sql.Bit, ApprovalStatus);
        req.input("GroupStockRemarks", sql.Bit, GroupStockStatus);
        req.input("GainerReqRemarks", sql.Bit, GainerStatus);
        req.input("AddedBy", sql.Int, addedBy);

        const query = `
      ;WITH Src AS (
        SELECT BrandId, DealerId, LocationId
        FROM OPENJSON(@json)
        WITH (
          BrandId INT '$.BrandId',
          DealerId INT '$.DealerId',
          LocationId INT '$.LocationId'
        )
      )
      MERGE AAP_RemarkSettingMaster AS T
      USING Src AS S
        ON  T.BrandId = S.BrandId
        AND T.DealerId = S.DealerId
        AND T.LocationId = S.LocationId
      WHEN MATCHED THEN
        UPDATE SET
          ApprovalRemarks   = @ApprovalRemarks,
          GroupStockRemarks = @GroupStockRemarks,
          GainerReqRemarks  = @GainerReqRemarks,
          AddedBy           = @AddedBy,
          AddedOn           = GETDATE()
      WHEN NOT MATCHED BY TARGET THEN
        INSERT (BrandId, DealerId, LocationId, ApprovalRemarks, GroupStockRemarks, GainerReqRemarks, AddedBy)
        VALUES (S.BrandId, S.DealerId, S.LocationId, @ApprovalRemarks, @GroupStockRemarks, @GainerReqRemarks, @AddedBy)
      OUTPUT
        $action AS ActionType,
        inserted.Id,
        inserted.BrandId,
        inserted.DealerId,
        inserted.LocationId,
        inserted.ApprovalRemarks,
        inserted.GroupStockRemarks,
        inserted.GainerReqRemarks,
        inserted.AddedBy,
        inserted.AddedOn;
    `;

        const result = await req.query(query);

        await tx.commit();

        return {
            total: result.recordset.length,
            details: result.recordset, // includes ActionType = 'INSERT' or 'UPDATE'
        };
    } catch (err) {
        try { await tx.rollback(); } catch { }
        throw err;
    }

}

const viewRemarkSettingService = async (BrandId, DealerId, LocationId, UserId) => {
    try {
        const pool = await getPool1()
        const query = `
        use z_scope    
        select bm.vcbrand Brand , dm.vcName Dealer , li.Location , rsm.ApprovalRemarks , rsm.GroupStockRemarks , rsm.GainerReqRemarks , bm.bigid BrandId , dm.bigid DealerId , li.LocationID , CONCAT(amg.vcFirstName,' ',amg.vcLastName)AddedBy , rsm.AddedOn from AAP_RemarkSettingMaster rsm
        left JOIN Brand_Master bm on bm.bigid = rsm.BrandId
        left JOIN dealer_master dm on dm.bigid = rsm.DealerId
        left Join LocationInfo li on li.locationid = rsm.locationid
        left join AdminMaster_GEN amg on amg.bintId_Pk = rsm.AddedBy
        where (@UserId is NULL OR rsm.AddedBy in (${UserId}))
        AND (@BrandId IS NULL or rsm.BrandId in  (${BrandId}))
        AND (@DealerId IS NULL OR rsm.DealerId in (${DealerId}))
        AND (@LocationId IS NULL OR rsm.LocationId in  (${LocationId}))`

        const result = await pool.request()
            .input('BrandId', sql.VarChar, BrandId ?? null)
            .input('DealerId', sql.VarChar, DealerId ?? null)
            .input('LocationId', sql.VarChar, LocationId ?? null)
            .input('UserId', sql.VarChar, UserId ?? null)
            .query(query)
        return result.recordset
    } catch (error) {
        throw new ApiError(200, error)
    }
}
export { insertRemarkService, remarktypeMasterService, remarkViewService, editRemarkService, insertRemarkSettingService, viewRemarkSettingService }