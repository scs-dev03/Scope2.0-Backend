import {getPool1 , getPool2} from '../../db/db.js'
const partfamilySaleservice = async (brandid,dealerid,locationid,partnumber) => {
    try {
        const pool = await getPool2()
        const query = `use [z_scope] EXEC  sp_partfamilysale '${partnumber}',${brandid},${dealerid},${locationid}`
        const result = await pool.request().query(query)
        return result
    } catch (error) {
        throw new Error(`partfamilySaleservice failed: ${error.message}`);
    }

}
export {partfamilySaleservice}