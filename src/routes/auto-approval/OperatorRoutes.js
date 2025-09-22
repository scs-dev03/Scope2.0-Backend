import { Router } from "express";
import {
    fetchOperators
} from "../../controller/auto-approval/OperatorMasterController.js"

const router = Router();

router.get("/operatorview", fetchOperators);

export default router