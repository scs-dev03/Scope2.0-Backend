import { Router } from "express";
const router = Router()
import { advisorwisePPNIValue, locationwisePPNIValue, orderDetailsByPartnumber, partDetails, partSale, partSearch, partStock, partwisePPNIValue, PPNIVALUE12Months, singlePartMaxByLocation, substituteParts, userRole, vehicleSearch, vehiclewisePPNIValue } from "../controller/dealer-monitoring/user.dealermonitoring.js";



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


export default router