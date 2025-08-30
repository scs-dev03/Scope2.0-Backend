import Router from 'express'
const router = Router()
import { getBrands,getDashboard,getDealers,getLocation, getWorkspace, homePageData, latestDates, model, pagination, partNature, partType, seasonal, userInfo, getUserModules } from '../controller/MasterApiController.js'


router.route('/brands').get(getBrands)
router.route('/dealers').post(getDealers)
router.route('/locations').post(getLocation)
router.route('/workspaces').get(getWorkspace)
router.route('/dashboards').get(getDashboard)
router.route('/model').post(model)
router.route('/nature').get(partNature)
router.route('/seasonal').get(seasonal)
router.route('/parttype').get(partType)
router.route('/userinfo').post(userInfo)

router.route('/home').post(homePageData)
router.route('/dates').post(latestDates)



router.route('/test/:pageno/:pagelimit').post(pagination)

router.get("/user/:userId/modules", getUserModules);

export default router