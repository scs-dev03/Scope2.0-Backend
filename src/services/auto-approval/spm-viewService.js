import { getPool1 } from "../../db/db.js";
import sql from 'mssql'
import { ApiError } from "../../utils/ApiError.js";

const viewPartyService = async (LocationId) => {
    try {
        const pool = await getPool1()
        const query = `use [z_scope] select PartyName , PartyCode , CreatedAt , Status from AAP_SPMPartyMaster where LocationId = @LocationId`
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

export { viewPartyService, viewAdvisorService }