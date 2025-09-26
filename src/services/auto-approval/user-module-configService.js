import { getPool1 } from "../../db/db.js";
import { ApiError } from "../../utils/ApiError.js";

export const insertModuleViewConfig = async (userId, moduleId, columns) => {
  const cols = JSON.stringify(columns);
  const pool = await getPool1();
  const transaction=pool.transaction();
  try {
    await transaction.begin();
//     const useridForeignKeyCheckCheck = await transaction.request()
//       .input("userId", userId)
//       .query(
//         `SELECT bintId_Pk 
// FROM AdminMaster_GEN 
// WHERE bintId_Pk = @userId
// `
//       )
//     const moduleForeignKeyCheck = await transaction.request()
//       .input("moduleId", moduleId)
//       .query(
//         `select * from Module_Master where id=@moduleId`
//       )
//     if (useridForeignKeyCheckCheck.recordset.length == 0 || moduleForeignKeyCheck.recordset.length == 0) {
//       throw new ApiError(400, "invalid user id or module id");
//     }
    const result = await transaction.request()
      .input("userId", userId)
      .input("moduleId", moduleId)
      .input("columns", cols)
      .query(`
        INSERT INTO AAP_ModuleViewConfig (columns, userId, moduleId)
        VALUES (@columns, @userId, @moduleId)
      `);
    await transaction.commit();
    return result.recordset;
  } catch (err) {
    await transaction.rollback();
    throw new ApiError(err.statusCode || 500, err.message || "internal server error");
  }
};

export const updateModuleViewConfig = async (userId, moduleId, columns) => {
  try {
    const cols = JSON.stringify(columns);

    const pool = await getPool1();
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
      .input("columns", cols)
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
