import Router from 'express'
const router = Router()
import { getBrands, getDashboard, getDealers, getLocation, getWorkspace, homePageData, latestDates, model, pagination, partNature, partType, seasonal, userInfo, getUserModules, spmhomepage, ordertype, jobtype, hsncode, multiDealer, multiLocation, multiAdvisor, getUser } from '../controller/MasterApiController.js'


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

router.route('/home').post(spmhomepage)
// router.route('/hometest').post(spmhomepage)
router.route('/dates').post(latestDates)

router.route('/ordertype').get(ordertype)
router.route('/jobtype').get(jobtype)


router.route('/test/:pageno/:pagelimit').post(pagination)

router.route('/user-modules').post(getUserModules)
//router.route('/user-modules-r').post(getRawUserModules)

router.route('/hsncode').get(hsncode)

router.route('/multi-dealer').post(multiDealer)
router.route('/multi-location').post(multiLocation)
router.route('/multi-advisor').post(multiAdvisor)
router.route('/user').get(getUser)

export default router