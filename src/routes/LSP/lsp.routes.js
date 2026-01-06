import express from "express";
import {
  getAllLSPsController,
  getCommonFieldsController,
  getFieldMappingController,
  addOrSwitchLRNController,
  getLRNsByDispatchController,
  getLRNDetailsController,
  getLRNsByStatusController,
  ingestLSPPayloadController,
  insertLRNDetailsVersionController,
  getLRNHistoryController,
  addActionController,
  getActionsByLRNController
} from "../../controller/LSP/lsp.controller.js";

const router = express.Router();

/**
 * =========================
 * MASTER APIs
 * =========================
 */
router.get("/lsps", getAllLSPsController);
router.get("/common-fields", getCommonFieldsController);

/**
 * =========================
 * FIELD MAPPING APIs
 * =========================
 */
router.get("/field-mapping/:lspCode", getFieldMappingController);

/**
 * =========================
 * CORE INGESTION
 * =========================
 */
router.post("/ingest", ingestLSPPayloadController);

/**
 * =========================
 * ADMIN / INTERNAL APIs
 * (Versioned LRN Insert)
 * =========================
 */
router.post(
  "/lrn/version",
  insertLRNDetailsVersionController
);

/**
 * =========================
 * DISPATCH ↔ LRN
 * =========================
 */
router.post("/dispatch-lrn", addOrSwitchLRNController);

/**
 * =========================
 * READ APIs
 * =========================
 */
router.get(
  "/dispatch/:dispatchOrderNo/lrns",
  getLRNsByDispatchController
);

router.get(
  "/lrn/:lrNumber",
  getLRNDetailsController
);

router.get(
  "/lrns/status/:statusId",
  getLRNsByStatusController
);

router.get("/lrn/:lrNumber/history", getLRNHistoryController);

// actions
router.post("/actions", addActionController);
router.get("/actions/:lrNumber/:version", getActionsByLRNController);

export default router;
