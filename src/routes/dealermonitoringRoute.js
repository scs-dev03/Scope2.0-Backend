import { Router } from "express";
const router = Router()
import { orderDetailsByPartnumber, partDetails, partSale, singlePartMaxByLocation } from "../controller/dealer-monitoring/user.dealermonitoring.js";


//Sale Trend
router.route('/partsale').post(partSale)
router.route('/partdetail').post(partDetails)

//Norms
router.route('/norms').post(singlePartMaxByLocation)

//Order Trend
router.route('/order').post(orderDetailsByPartnumber)

export default router