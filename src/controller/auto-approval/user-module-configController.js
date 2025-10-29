import {
  insertModuleViewConfig,
  updateModuleViewConfig,
} from "../../services/auto-approval/user-module-configService.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";


const addModuleViewConfig = async (req, res) => {
  try {
    const { userId, moduleId, columns } = req.body;

    if (!userId || !moduleId || !columns) {
      throw new ApiError(400, "userId, moduleId and columns are required");
    }

    const data = await insertModuleViewConfig(userId, moduleId, columns);
    res
      .status(200)
      .json(new ApiResponse(200, data, "Inserted successfully"));
  } catch (err) {
    res
      .status(err.statusCode || 500)
      .json(new ApiError(err.statusCode || 500, err.message || "internal server error", [], ""))
  }
};

const modifyModuleViewConfig = async (req, res) => {
  try {
    const { userId, moduleId, columns } = req.body;

    if (!userId || !moduleId || !columns) {
      throw new ApiError(400, "userId, moduleId and columns are required");
    }

    const data = await updateModuleViewConfig(userId, moduleId, columns);
    res
      .status(200)
      .json(new ApiResponse(200, data, "User Module Config Updated successfully"));
  } catch (err) {
    res
      .status(err.statusCode || 500)
      .json(new ApiError(err.statusCode || 500, err.message || "internal server error", [], ""))
  }
};

export { addModuleViewConfig, modifyModuleViewConfig }