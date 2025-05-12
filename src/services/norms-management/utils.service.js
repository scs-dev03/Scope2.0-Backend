import {getPool1} from '../../db/db.js'
const partfamilySaleservice = async (brandid,dealerid,locationid,partnumber,res) => {
    try {
        const pool = await getPool1()
        const query = `use [UAD_VON] EXEC  sp_partfamilysale '${partnumber}',${brandid},${dealerid},${locationid}`
        const result = await pool.request().query(query)
        return result
    } catch (error) {
        return res.status(500).json({ 
            Error: error.message , 
            Service:`partfamilySaleservice`
         })
    }

}
export {partfamilySaleservice}