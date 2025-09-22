import { getPool1 } from "../../db/db.js";
import { ApiError } from "../../utils/ApiError.js";

export const insertModuleViewConfig = async (userId, moduleId, columns) => {
  if (!userId || !moduleId || !Array.isArray(columns)) {
    throw new ApiError(400, "userId, moduleId and columns[] are required");
  }

  const cols = JSON.stringify(columns);

  const pool = await getPool1();
  try {
    const result = await pool.request()
      .input("userId", userId)
      .input("moduleId", moduleId)
      .input("columns", cols)
      .query(`
        INSERT INTO AAP_ModuleViewConfig (columns, userId, moduleId)
        VALUES (@columns, @userId, @moduleId)
      `);

    return { message: "Config inserted successfully" };
  } catch (err) {
    if (err.number === 2627) { 
      throw new ApiError(400, "Config already exists for this user and module");
    }
    throw new ApiError(500, err.message);
  }
};

export const updateModuleViewConfig = async (userId, moduleId, columns) => {
  if (!userId || !moduleId || !Array.isArray(columns)) {
    throw new ApiError(400, "userId, moduleId and columns[] are required");
  }

  const cols = JSON.stringify(columns);

  const pool = await getPool1();
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

  return { message: "Config updated successfully" };
};
