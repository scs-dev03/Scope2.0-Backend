import { Router } from "express";
const router = Router()
import { advisorwisePPNIValue, appSwitcher, gainerListing, getCurrentVersion, locationwisePPNIValue, orderDetailsByPartnumber, partDetails, partSale, partSearch, partStock, partwisePPNIValue, PPNIVALUE12Months, predictiveVehicleSearch, singlePartMaxByLocation, substituteParts, userRole, vehicleSearch, vehicleSearchConsent, vehicleSearchLogs, vehiclewisePPNIValue, viewLog , vehicleGroupStock, vehicleReserved } from "../controller/dealer-monitoring/user.dealermonitoring.js";
import { partremark, ppnipartremark, ppnivehicleremark, remarkMaster, vehicleremark } from "../controller/dealer-monitoring/remark.dealermonitoring.js";
import { uploadImg } from "../middlewares/multer.middleware.js";



//Sale Trend
router.route('/partsale').post(partSale)
router.route('/partdetail').post(partDetails)

//Norms
router.route('/norms').post(singlePartMaxByLocation)

//Order Trend
router.route('/order').post(orderDetailsByPartnumber)

//Part Stock
router.route('/partstock').post(partStock)

//Vehicle Search
router.route('/vehicle').post(vehicleSearch)
router.route('/grpstk').post(vehicleGroupStock)
router.route('/reserved').post(vehicleReserved)

router.route('/jobcard').post(partSearch)

//Substitution Search
router.route('/subparts').post(substituteParts)

//User Role
router.route('/user-role').post(userRole)

//PPNI Value
router.route('/ppni-l').post(locationwisePPNIValue)
router.route('/ppni-a').post(advisorwisePPNIValue)
router.route('/ppni-v').post(vehiclewisePPNIValue)
router.route('/ppni-p').post(partwisePPNIValue)
router.route('/ppni').post(PPNIVALUE12Months)

//Gainer Listing
router.route('/gnr-listing').post(gainerListing)

//Predictive Vehicle Search
router.route('/predictive-v').post(predictiveVehicleSearch)


router.route('/remark').post(remarkMaster)
router.route('/rmrk-vp').post(uploadImg.single('file'), partremark)
// router.route('/rmrk-vv').post(uploadImg.single('file'),vehicleremark)
router.route('/rmrk-pp').post(uploadImg.single('file'), ppnipartremark)
router.route('/rmrk-pv').post(uploadImg.single('file'), ppnivehicleremark)

router.route('/log').post(vehicleSearchLogs)
router.route('/view-log').post(viewLog)

router.route('/vehicle-consent').post(vehicleSearchConsent)

router.route('/version').get(getCurrentVersion)
router.route('/app-switcher').post(appSwitcher)

export default router