import express from "express";
import {
  getAllLSPsController,
  getCommonFieldsController,
  getFieldMappingController,
  addOrSwitchLRNController,
  upsertLRNDetailsController,
  getLRNsByDispatchController,
  getLRNDetailsController,
  getLRNsByStatusController
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

router.get("/field-mapping/:lspName", getFieldMappingController);
router.post("/dispatch-lrn", addOrSwitchLRNController);

router.post("/lrn-details", upsertLRNDetailsController);

router.get("/dispatch/:dispatchOrderNo/lrns", getLRNsByDispatchController);
router.get("/lrn/:lrNumber", getLRNDetailsController);

router.get("/lrns/status/:statusId", getLRNsByStatusController);



export default router;
