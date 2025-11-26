import { getPool1 } from "../../db/db.js"
import { ApiError } from "../../utils/ApiError.js"
import sql from 'mssql'

const viewMappingService = async (BrandId, DealerId, LocationId, UserId) => {
    try {
        const pool = await getPool1()
        const query = `select bm.vcbrand Brand , dm.vcName Dealer , li.Location , CONCAT(amg.vcFirstName,' ',amg.vcLastName)Name , mm.Addedon , CONCAT(amg2.vcFirstName,' ',amg2.vcLastName)AddedBy 
        from AAP_BrandWiseMapping mm
        left JOIN Brand_Master bm on bm.bigid = mm.BrandId
        left JOIN dealer_master dm on dm.bigid = mm.DealerId
        left Join LocationInfo li on li.locationid = mm.locationid
        left join AdminMaster_GEN amg on amg.bintId_Pk = mm.UserId
        left join AdminMaster_GEN amg2 on amg2.bintId_Pk = mm.AddedBy
        where (@UserId is NULL OR mm.UserId = @UserId)
        AND (@BrandId IS NULL or mm.BrandId = @BrandId)
        AND (@DealerId IS NULL OR mm.DealerId = @DealerId)
        AND (@LocationId IS NULL OR mm.LocationId = @LocationId)
        and mm.Status = 1`
        const result = await pool.request()
            .input('BrandId', sql.Int, BrandId ?? null)
            .input('DealerId', sql.Int, DealerId ?? null)
            .input('LocationId', sql.Int, LocationId ?? null)
            .input('UserId', sql.Int, UserId ?? null)
            .query(query)
        return result.recordset
    } catch (error) {
        throw new ApiError(200, error.message)
    }
}

const createMappingService = async (payload, addedBy) => {
    const pool = await getPool1()
    const transaction = new sql.Transaction(pool);
    try {

        await transaction.begin();

        const now = new Date();
        let inserted = 0;

        // new Request per row (simplest + avoids parameter reuse issues)
        for (const row of payload) {
            const req = new sql.Request(transaction);
            await req
                .input('BrandId', sql.Int, row.BrandId)          // can be null
                .input('DealerId', sql.Int, row.DealerId)        // can be null
                .input('LocationId', sql.Int, row.LocationId)    // can be null
                .input('UserId', sql.Int, row.userId)
                // .input('AddedOn', sql.DateTime, now)
                .input('AddedBy', sql.Int, addedBy)
                // .input('Status', sql.Bit, 1)                     // active
                .query(`
          INSERT INTO AAP_BrandWiseMapping
            (BrandId, DealerId, LocationId, UserId, AddedBy)
          VALUES
            (@BrandId, @DealerId, @LocationId, @UserId, @AddedBy);
        `);

            inserted++;
        }

        await transaction.commit();

        return {
            rowsInserted: inserted,
        };
    }
    catch (error) {
        await transaction.rollback();
        throw new ApiError(500, error.message || 'DB error in createMappingService');
    }
}

const editMappingService = async (payload,addedBy) => {
    const pool = await getPool1();
    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin();

        const now = new Date();
        const userId = payload[0].userId; // ✅ only one user

        const mixedUser = payload.find((r) => r.userId !== userId);
        if (mixedUser) {
            throw new ApiError(
                400,
                'Edit allowed for only one user per request. All rows must have same userId.'
            );
        }

        // delete existing mappings ONLY for this user
        const delReq = new sql.Request(transaction);
        const delResult = await delReq
            .input('UserId', sql.Int, userId)
            .query(`DELETE FROM AAP_BrandWiseMapping WHERE UserId = @UserId;`);

        let deleted = 0;
        if (Array.isArray(delResult.rowsAffected)) {
            deleted = delResult.rowsAffected.reduce((a, b) => a + b, 0);
        } else {
            deleted = delResult.rowsAffected || 0;
        }

        // insert new mappings for this same user
        let inserted = 0;
        for (const row of payload) {
            const req = new sql.Request(transaction);
            await req
                .input('BrandId', sql.Int, row.BrandId)        // can be null
                .input('DealerId', sql.Int, row.DealerId)      // can be null
                .input('LocationId', sql.Int, row.LocationId)  // can be null
                .input('UserId', sql.Int, userId)              // enforce same user
                .input('AddedBy', sql.Int, addedBy)
                .query(`
          INSERT INTO AAP_BrandWiseMapping
            (BrandId, DealerId, LocationId, UserId, AddedBy)
          VALUES
            (@BrandId, @DealerId, @LocationId, @UserId, @AddedBy);
        `);

            inserted++;
        }

        await transaction.commit();

        return {
            userId,
            rowsDeleted: deleted,
            rowsInserted: inserted,
        };
    } catch (error) {
        await transaction.rollback();
        throw new ApiError(500, error.message || 'DB error in editMappingService');
    }
}

export { viewMappingService, createMappingService, editMappingService }