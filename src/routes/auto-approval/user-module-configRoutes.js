import { Router } from "express";
import {
  addModuleViewConfig,
  modifyModuleViewConfig
} from "../../controller/auto-approval/user-module-configController.js";

const router = Router();

router.post("/module-view-config", addModuleViewConfig);   
router.put("/module-view-config", modifyModuleViewConfig); 

export default router;
