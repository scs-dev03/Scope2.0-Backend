// routes/lrn.routes.js

import express from "express";
import { createLrn } from "../../controller/LSP/lrn.controller.js";

const router = express.Router();

router.post("/lrn", createLrn);

export default router;

