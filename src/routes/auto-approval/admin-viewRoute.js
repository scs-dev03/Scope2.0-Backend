import Router from 'express'
import { adminDashboard } from '../../controller/auto-approval/admin-viewController.js'

const router = Router()

router.route("/dashboard").post(adminDashboard)


export default router