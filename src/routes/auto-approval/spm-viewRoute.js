import { Router } from "express";
import {  updateAdvisor, updateParty,  viewAdvisor, viewParty , viewOrderStatus, orderPlaced, reOrder, nonMoving, viewgroupStock, spmDashboard, reqToGainer} from "../../controller/auto-approval/spm-view.js";


const router = Router();

router.post("/viewparty", viewParty);
router.put("/party",updateParty);

router.post("/viewadvisor", viewAdvisor);
router.put("/advisor",updateAdvisor);

router.post("/view-os",viewOrderStatus)
router.patch("/os/order",orderPlaced)
router.post("/os/re-order",reOrder)
router.post('/req-to-gainer',reqToGainer)

router.post("/non-moving",nonMoving)
router.post("/group-stock",viewgroupStock)

router.post('/dashboard',spmDashboard)
export default router