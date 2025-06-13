import {getPool1 , getPool2} from '../../db/db.js'
const partfamilySaleservice = async (brandid,dealerid,locationid,partnumber) => {
    try {
        // console.log(brandid,dealerid,locationid,partnumber);
        
        const pool = await getPool2()
        const query = `use [z_scope] EXEC  sp_partfamilysale '${partnumber}',${brandid},${dealerid},${locationid}`
        const result = await pool.request().query(query)
        return result
    } catch (error) {
        throw new Error(`partfamilySaleservice failed: ${error.message}`);
    }

}

const singlePartMaxByLocationService = async (dealerid,partnumber)=>{
try {
        const pool = getPool2()
        const query = `use [z_scope] select distinct li.location , li.locationid, sn.maxvalue 
                        from stockable_nonstockable_td001_${dealerid} sn
                        join locationinfo li on li.LocationID = sn.locationid
                        where sn.partnumber = '${partnumber}' and sn.stockdate = (select max(stockdate) from stockable_nonstockable_td001_${dealerid}) 
                        group by li.location ,li.locationid, sn.Maxvalue`

        const result = await pool.request().query(query)
        return result
} catch (error) {
    throw new Error(`singlePartMaxByLocationService failed: ${error.message}`)
}
}
export {partfamilySaleservice,singlePartMaxByLocationService}