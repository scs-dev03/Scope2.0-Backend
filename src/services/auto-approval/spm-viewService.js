import { getPool1 } from "../../db/db.js";
import sql from 'mssql'
import { ApiError } from "../../utils/ApiError.js";

const viewPartyService = async (LocationId) => {
    try {
        const pool = await getPool1()
        const query = `use [z_scope] select Id,  PartyName , PartyCode , CreatedAt , Status from AAP_SPMPartyMaster where LocationId = @LocationId`
        const result = await pool.request().input('LocationId', sql.Int, LocationId).query(query)
        return result.recordset
    }
    catch (error) {
        throw new ApiError(500, error.message, []);

    }
}

const viewAdvisorService = async (LocationId) => {
    try {
        const pool = await getPool1()
        const query = `use [z_scope] select Advisor , PhoneNo , Email , CreatedAt , Status from AAP_SPMAdvisorMaster where LocationId = @LocationId`
        const result = await pool.request().input('LocationId', sql.Int, LocationId).query(query)
        return result.recordset
    }
    catch (error) {
        throw new ApiError(500, error.message, []);

    }
}

const changePartyStatusService = async (Id, status) => {
    try {
        console.log(Id,status);
        
        const pool = await getPool1()
        const query = `use z_scope update AAP_SPMPartyMaster set Status = @status where Id = @Id`
        const result = await pool.request()
            .input('Id', Id)
            .input('status', status).query(query)
        return result.rowsAffected
    } catch (error) {
        throw new ApiError(500, 'Unable to Change Party Status', [], error.message)
    }

}
export { viewPartyService, viewAdvisorService, changePartyStatusService }