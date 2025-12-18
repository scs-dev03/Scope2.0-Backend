import { getPool1 } from "../../db/db.js"
import { ApiError } from "../../utils/ApiError.js"

const viewParameterService = async (bucketId) => {
    try {
        const pool = await getPool1()
        const query = `select BucketId , Parameter , ColumnName from AAP_ParameterMaster where BucketId = ${bucketId}`
        const result = await pool.request().query(query)
        return result
    } catch (error) {
        throw new Error(`viewBucketService failed : ${error.message}`);
    }
}


const valuedParamsListService = async (tableName) => {
    try {
        const pool = await getPool1()
        const query = `
       SELECT *
       FROM ${tableName}
       --WHERE (@LocationId IS NULL OR LocationId = @LocationId)
       --ORDER BY Name;
     `;

        const result = await pool.request()
            //    .input('LocationId', sql.Int, LocationId ?? null)
            .query(query);

        return result;
    } catch (error) {
        throw new ApiError(500, `No List Found`, [], ``)
    }
}

const locationSpecificParamsListService = async (tableName, LocationId) => {
    try {
        const pool = await getPool1()

        const query = `
       SELECT *
       FROM ${tableName}
       WHERE  LocationId = ${LocationId} and Status = 1
       --ORDER BY Name;
     `;
        //   console.log(query);

        const result = await pool.request()
            // .input('LocationId', sql.Int, LocationId)
            .query(query);

        return result;
    } catch (error) {
        throw new ApiError(500, `No List Found`, [], ``)
    }
}

const remarkParametersService = async () => {
    try {
        const pool = await getPool1()
        const query = `use z_scope select Parameter from AAP_RemarkParameter`
        const result = await pool.request().query(query)
        return result.recordset
    } catch (error) {
        throw new ApiError(500, error.message)
    }
}
export { viewParameterService, valuedParamsListService, locationSpecificParamsListService, remarkParametersService }