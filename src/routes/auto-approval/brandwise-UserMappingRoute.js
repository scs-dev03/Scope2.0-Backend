import Router from 'express'
import { createMapping, editMapping, viewMapping } from '../../controller/auto-approval/brandwise-UserMappingController.js'


const router = Router()

router.route("/view").post(viewMapping)
router.route("/mapping").post(createMapping)
router.route("/edit").post(editMapping)

export default router