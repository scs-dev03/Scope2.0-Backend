import { Router } from "express";
import { viewAdvisor, viewParty } from "../../controller/auto-approval/spm-view.js";


const router = Router();

router.get("/viewparty", viewParty);
router.get("/viewadvisor", viewAdvisor);

export default router