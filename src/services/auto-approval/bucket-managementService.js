import { getPool1 } from "../../db/db.js"

const viewBucketService = async(req,res)=>{
try {
        const pool= await getPool1()
        const query = `select * from AAP_bucketmaster`
        const result = await pool.request().query(query)
        return result
} catch (error) {
    throw new Error(`viewBucketService failed : ${error.message}`);
    
}
}

export {viewBucketService}