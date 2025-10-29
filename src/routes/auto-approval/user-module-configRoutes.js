import { Router } from "express";
import {
  addModuleViewConfig,
  modifyModuleViewConfig
} from "../../controller/auto-approval/user-module-configController.js";

const router = Router();

router.post("/viewmoduleconfig", addModuleViewConfig);   
router.put("/updatemoduleconfig",modifyModuleViewConfig); 

export default router;
