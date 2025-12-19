// routes/lrn.routes.js

import express from "express";
import { createLrn, getAllLrns, getLrnsByLsp, 
    getLrnsByDispatchOrder, getLrnByNumber, getLrnsByStatus } from "../../controller/LSP/lrn.controller.js";

const router = express.Router();

router.post("/lrn", createLrn);
router.get("/lrn", getAllLrns);
router.get("/lrn/by-lsp", getLrnsByLsp);
router.get("/lrn/by-dispatch/:dispatchOrderNo", getLrnsByDispatchOrder);
router.get("/lrn/by-lr/:lrNumber", getLrnByNumber);
router.get("/lrn/by-status/:status", getLrnsByStatus);

export default router;

