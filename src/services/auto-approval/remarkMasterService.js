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

export { insertRemarkService, remarktypeMasterService, remarkViewService, editRemarkService }