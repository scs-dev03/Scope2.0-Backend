import { Router } from "express";
import { parameterValue, remarkParameters, viewParameter } from "../../controller/auto-approval/parameter-managementController.js";

const router = Router()


router.route('/parameterview').post(viewParameter)
router.route('/parameter').post(parameterValue)
router.route('/remark-parameter').get(remarkParameters)




export default router
