import Router from 'express'
import { dashboardRefresh, siRefreshAuto } from '../../controller/automailers/dashboardschedulerautomailer.js'
import { Honda4WBrandPoolMail } from '../../utils/mailservice.js'
import { Honda_4W_BrandPool_AutoMailer , TATA_PCBU_BrandPool_AutoMailer } from '../../controller/automailers/brandpoolgnr.js'

const router = Router()

router.route("/dsRefresh").get(dashboardRefresh)
router.route("/siRefresh").get(siRefreshAuto)
router.route("/brandpool-honda4w").get(Honda_4W_BrandPool_AutoMailer)
router.route("/brandpool-pvtata").get(TATA_PCBU_BrandPool_AutoMailer)

export default router