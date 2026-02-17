import { getPool } from "../../db/db.js";
import { ApiError } from "../../utils/ApiError.js";

export const insertModuleViewConfig = async (userId, moduleId, columns) => {
  const pool = await getPool();
  const transaction = pool.transaction();
  try {
    await transaction.begin();
    const result = await transaction.request()
      .input("userId", userId)
      .input("moduleId", moduleId)
      .input("columns", columns)
      .query(`
        INSERT INTO AAP_ModuleViewConfig (columns, userId, moduleId)
        VALUES (@columns, @userId, @moduleId)
      `);
    await transaction.commit();
    return result.recordset;
  } catch (err) {
    await transaction.rollback();
    throw new ApiError(err.statusCode || 500, err.message || "Internal server error");
  }
};

export const updateModuleViewConfig = async (userId, moduleId, columns) => {
  try {
    const pool = await getPool();
    //     const useridForeignKeyCheckCheck = await pool.request()
    //       .input("userId", userId)
    //       .query(
    //         `SELECT bintId_Pk 
    // FROM AdminMaster_GEN 
    // WHERE bintId_Pk = @userId
    // `
    //       )
    //     const moduleForeignKeyCheck = await pool.request()
    //       .input("moduleId", moduleId)
    //       .query(
    //         `select * from Module_Master where id=@moduleId`
    //       )
    //     if (useridForeignKeyCheckCheck.recordset.length == 0 || moduleForeignKeyCheck.recordset.length == 0) {
    //       throw new ApiError(400, "invalid user id or module id");
    //     }
    const result = await pool.request()
      .input("userId", userId)
      .input("moduleId", moduleId)
      .input("columns", columns)
      .query(`
      UPDATE AAP_ModuleViewConfig
      SET columns = @columns,
      updatedAt = GETDATE()
      WHERE userId = @userId AND moduleId = @moduleId
    `);

    if (result.rowsAffected[0] === 0) {
      throw new ApiError(404, "No existing config found for this user and module");
    }

    return result.recordset;
  }
  catch (err) {
    throw new ApiError(err.statusCode || 500, err.message || "internal server error")
  }
};
