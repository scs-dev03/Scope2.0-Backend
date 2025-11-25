import { getPool1 } from "../db/db.js"
import sql from 'mssql'

const ErrorLog = async (ModuleName, Error, userId) => {
    try {
        const pool = await getPool1()
        const query = `use z_scope
        Insert INTO App_ErrorLogging(ModuleName , Error , UserId)
        Values (@Module , @Error , @UserId)`
        const result = await pool.request()
            .input('Module', sql.VarChar, ModuleName)
            .input('Error', sql.VarChar, Error)
            .input('UserId', sql.Int, userId)
            .query(query)
    } catch (error) {
        console.error(error);        
    }
}

export {ErrorLog}