// routes/lrn.routes.js

import express from "express";
import { createLrn, getAllLrns, getLrnsByLsp } from "../../controller/LSP/lrn.controller.js";

const router = express.Router();

router.post("/lrn", createLrn);
router.get("/lrn", getAllLrns);
router.get("/lrn/by-lsp", getLrnsByLsp);

export default router;

