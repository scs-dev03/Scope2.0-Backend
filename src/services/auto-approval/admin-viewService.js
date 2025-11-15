import { getPool1 } from "../../db/db.js"
import { ApiError } from "../../utils/ApiError.js"
import sql from 'mssql'

const adminDashboardService = async (BrandIds, DealerIds, LocationIds, OrderTypeId, From, To) => {
    try {
        const pool = await getPool1()
        const result = await pool.request()
            .input('BrandIdsCsv', sql.VarChar(100), BrandIds ?? null)
            .input('DealerIdsCsv', sql.VarChar(100), DealerIds ?? null)
            .input('LocationIdsCsv', sql.VarChar(100), LocationIds ?? null)
            .input('OrderTypeId', sql.Int, OrderTypeId ?? null)
            .input('From', sql.Date, From ?? null)
            .input('To', sql.Date, To ?? null)
            .execute('dbo.sp_AAP_AdminDashboard_VB')
        return result.recordset

    } catch (error) {
        throw new ApiError(500, error.message);

    }
}

const adminBrandwiseService = async () => {
    try {
        const pool = await getPool1()
        const request = pool.request()
        const query = `use z_scope EXEC dbo.sp_AAP_BrandWiseAdminDashboard_VB;`
        const result = await request.query(query)
        return result.recordset
    } catch (error) {
        throw new ApiError(500, error.message);
    }
}

export { adminDashboardService, adminBrandwiseService }