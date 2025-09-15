import { getPool1 } from "../../db/db.js"

const viewParameterService = async(bucketId)=>{
try {
        const pool= await getPool1()
        const query = `select BucketId , Parameter , ColumnName from AAP_ParameterMaster where BucketId = ${bucketId}`
        const result = await pool.request().query(query)
        return result
} catch (error) {
    throw new Error(`viewBucketService failed : ${error.message}`);
}
}

export {viewParameterService}