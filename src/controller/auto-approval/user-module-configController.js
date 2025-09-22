import {
  insertModuleViewConfig,
  updateModuleViewConfig,
} from "../../services/auto-approval/user-module-configService.js";
import { ApiError } from "../../utils/ApiError.js";


const addModuleViewConfig = async (req, res, next) => {
  try {
    const { userId, moduleId, columns } = req.body;

    if (!userId || !moduleId || !Array.isArray(columns)) {
      throw new ApiError(400, "userId, moduleId and columns[] are required");
    }

    const result = await insertModuleViewConfig(userId,moduleId, columns);
    res.status(201).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

const modifyModuleViewConfig = async (req, res, next) => {
  try {
    const { userId, moduleId, columns } = req.body;

    if (!userId || !moduleId || !Array.isArray(columns)) {
      throw new ApiError(400, "userId, moduleId and columns[] are required");
    }

    const result = await updateModuleViewConfig(userId, moduleId, columns);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

export {addModuleViewConfig,modifyModuleViewConfig}