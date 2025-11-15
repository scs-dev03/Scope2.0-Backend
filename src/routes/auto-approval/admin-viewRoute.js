import Router from 'express'
import { adminBrandwise, adminDashboard } from '../../controller/auto-approval/admin-viewController.js'

const router = Router()

router.route("/dashboard").post(adminDashboard)
router.route("/dashboard").get(adminBrandwise)


export default router