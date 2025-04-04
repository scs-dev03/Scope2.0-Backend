import Router from 'express'
import { getDashboardbyDealer , uploadSchedule, getRequests,getBDM, editSchedule , deleteReq , changeLog, changelogView, requestNewDashboard, newDashboardSchedule, requestBy, newDashboardView,countView,statusTimelime} from '../controller/dashboardSchedulerController.js'
const router = Router()

router.route('/getdashboard').post(getDashboardbyDealer)
// router.route('/getbrands').post(getBrandsforDashboard)
// router.route('/getdealers').post(getDealersforDashboard)
router.route('/setschedule').post(uploadSchedule)
router.route('/getbdm').get(getBDM)
router.route('/getrequests').get(getRequests)
router.route('/requestby').get(requestBy)
router.route('/delrequest').post(deleteReq)
router.route('/editschedule').post(editSchedule)
router.route('/changelog').post(changeLog)
router.route('/changelogview').get(changelogView)
router.route('/newdashboardview').get(newDashboardView)
router.route('/newdashboard').post(newDashboardSchedule)
router.route('/getnewdashboard').post(requestNewDashboard)
router.route('/status').post(statusTimelime)
router.route('/countview').get(countView)
// router.route('/test').get(test)


export default  router