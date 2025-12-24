import express from "express";
import {
  getAllLSPsController,
  getCommonFieldsController,
  getFieldMappingController,
  addOrSwitchLRNController,
  upsertLRNDetailsController,
  getLRNsByDispatchController,
  getLRNDetailsController,
  getLRNsByStatusController,
  ingestLSPPayloadController
} from "../../controller/LSP/lsp.controller.js";

const router = express.Router();

/**
 * Master APIs
 */
router.get("/lsps", getAllLSPsController);
router.get("/common-fields", getCommonFieldsController);

/**
 * Mapping APIs
 */

router.get("/field-mapping/:lspCode", getFieldMappingController);

/**
 * Updating LRN or inserting new LRN
 * Mapping in mappingTable
 */
router.post("/dispatch-lrn", addOrSwitchLRNController);
router.post("/lrn-details", upsertLRNDetailsController);

// map the data according to lsp code
router.post("/ingest", ingestLSPPayloadController);

// get by DON or LRN Number
router.get("/dispatch/:dispatchOrderNo/lrns", getLRNsByDispatchController);
router.get("/lrn/:lrNumber", getLRNDetailsController);

// get by status
router.get("/lrns/status/:statusId", getLRNsByStatusController);

export default router;
