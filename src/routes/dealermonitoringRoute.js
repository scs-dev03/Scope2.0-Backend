import { Router } from "express";
const router = Router()
import { partDetails, partSale } from "../controller/dealer-monitoring/user.dealermonitoring.js";

router.route('/partsale').post(partSale)
router.route('/partdetail').post(partDetails)

export default router