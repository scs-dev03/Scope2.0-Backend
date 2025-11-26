import Router from 'express'
import { createMapping, editMapping, userBrands, userDealers, userLocation, viewMapping } from '../../controller/auto-approval/brandwise-UserMappingController.js'


const router = Router()

router.route("/view").post(viewMapping)
router.route("/mapping").post(createMapping)
router.route("/edit").post(editMapping)

router.route("/brand").post(userBrands)
router.route("/dealer").post(userDealers)
router.route("/location").post(userLocation)

export default router