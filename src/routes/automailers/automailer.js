import Router from 'express'
import { dashboardRefresh , siRefreshAuto } from '../../controller/automailers/dashboardschedulerautomailer.js'

const router = Router()

router.route("/dsRefresh").get(dashboardRefresh)
router.route("/siRefresh").get(siRefreshAuto)

export default router