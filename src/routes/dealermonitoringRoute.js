import { Router } from "express";
const router = Router()
import { orderDetailsByPartnumber, partDetails, partSale, partSearch, partStock, singlePartMaxByLocation, substituteParts, vehicleSearch } from "../controller/dealer-monitoring/user.dealermonitoring.js";



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

export default router