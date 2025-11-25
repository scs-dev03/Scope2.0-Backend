import Router from 'express'
import { editRemark, insertRemark, remarktypeMaster, remarkView } from '../../controller/auto-approval/remarkMasterController.js'

const router = Router()

router.route("/insert").post(insertRemark)
router.route("/remarktype").post(remarktypeMaster)
router.route("/view").post(remarkView)
router.route("/edit").post(editRemark)


export default router