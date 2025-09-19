import { Router } from "express";
import { viewParameter } from "../../controller/auto-approval/parameter-managementController.js";

const router = Router()


router.route('/parameterview').post(viewParameter)





export default router
