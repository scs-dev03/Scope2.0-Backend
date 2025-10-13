import { Router } from "express";
import {  updateAdvisor, updateParty,  viewAdvisor, viewParty } from "../../controller/auto-approval/spm-view.js";


const router = Router();

router.post("/viewparty", viewParty);
router.put("/party",updateParty);

router.post("/viewadvisor", viewAdvisor);
router.put("/advisor",updateAdvisor);


export default router