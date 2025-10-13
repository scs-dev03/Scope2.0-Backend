import { Router } from "express";
import { changePartyStatus,  viewAdvisor, viewParty } from "../../controller/auto-approval/spm-view.js";


const router = Router();

router.post("/viewparty", viewParty);
router.delete("/party",changePartyStatus);

router.post("/viewadvisor", viewAdvisor);

export default router