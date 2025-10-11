import { Router } from "express";
import { changePartyStatus,  viewAdvisor, viewParty } from "../../controller/auto-approval/spm-view.js";


const router = Router();

router.get("/viewparty", viewParty);
router.delete("/party",changePartyStatus);

router.get("/viewadvisor", viewAdvisor);

export default router