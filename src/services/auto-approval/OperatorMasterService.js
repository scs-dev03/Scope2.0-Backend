import { getPool1 } from "../../db/db.js";
import { ApiError } from "../../utils/ApiError.js";

export const getOperator = async () => {
    const pool = await getPool1();
    try {
        const result = await pool.request()
            .query(`
       select Operator from autoapproval..OperatorMaster
      `);
       const data=result.recordset;
        return {data}
    } catch (err) {
        throw new ApiError(500, err.message);
    }
};
