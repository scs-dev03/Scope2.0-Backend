import Router from 'express'
const router = Router()
import { getBrands,getDashboard,getDealers,getLocation, getWorkspace, model, partNature, partType, seasonal } from '../controller/MasterApiController.js'


router.route('/brands').get(getBrands)
router.route('/dealers').post(getDealers)
router.route('/locations').post(getLocation)
router.route('/workspaces').get(getWorkspace)
router.route('/dashboards').get(getDashboard)
router.route('/model').post(model)
router.route('/nature').get(partNature)
router.route('/seasonal').get(seasonal)
router.route('/parttype').get(partType)




export default router