import {
  getAllLSPsService,
  getCommonFieldsService,
  getFieldMappingService,
  addOrSwitchLRNService,
  upsertLRNDetailsService,
  getLRNDetailsService,
  getLRNsByDispatchService,
  getLRNsByStatusService
} from "../../services/LSP/lsp.service.js";

const getAllLSPsController = async (req, res) => {
  try {
    const data = await getAllLSPsService();
    return res.status(200).json({
      success: true,
      data
    });
  } catch (err) {
    console.error("Error fetching LSPs:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch LSPs"
    });
  }
};

const getCommonFieldsController = async (req, res) => {
  try {
    const data = await getCommonFieldsService();
    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("Error fetching common fields:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch common fields" });
  }
};

const getFieldMappingController = async (req, res) => {
  try {
    const { lspId } = req.params; // lspId = column name

    const data = await getFieldMappingService(lspId);

    res.json({
      success: true,
      data
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

const addOrSwitchLRNController = async (req, res) => {
  try {
    const { dispatchOrderNo, lrNumber, LSPCode } = req.body;

    if (!dispatchOrderNo || !lrNumber || !LSPCode) {
      return res.status(400).json({ success: false, message: "dispatchOrderNo, lrNumber, and LSPCode are required" });
    }

    const data = await addOrSwitchLRNService(dispatchOrderNo, lrNumber, LSPCode);

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("Error adding/switching LRN:", err);
    return res.status(500).json({ success: false, message: err.message || "Failed to add/switch LRN" });
  }
};

const upsertLRNDetailsController = async (req, res) => {
  try {
    const data = req.body;

    if (!data.LRNumber || !data.LSPCode || !data.StatusID) {
      return res.status(400).json({
        success: false,
        message: "LRNumber, LSPCode, and StatusID are required"
      });
    }

    const result = await upsertLRNDetailsService(data);
    return res.status(200).json({ success: true, data: result });

  } catch (err) {
    console.error("Error upserting LRNDetails:", err);
    return res.status(500).json({ success: false, message: err.message || "Failed to upsert LRNDetails" });
  }
};

const getLRNsByDispatchController = async (req, res) => {
  try {
    const { dispatchOrderNo } = req.params;
    const data = await getLRNsByDispatchService(dispatchOrderNo);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("Error fetching LRNs by dispatch:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

const getLRNDetailsController = async (req, res) => {
  try {
    const { lrNumber } = req.params;
    const data = await getLRNDetailsService(lrNumber);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("Error fetching LRN details:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

const getLRNsByStatusController = async (req, res) => {
  try {
    const { statusId } = req.params;
    const data = await getLRNsByStatusService(statusId);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("Error fetching LRNs by status:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export {
  getAllLSPsController,
  getCommonFieldsController,
  getFieldMappingController,
  addOrSwitchLRNController,
  upsertLRNDetailsController,
  getLRNsByDispatchController,
  getLRNDetailsController,
  getLRNsByStatusController
};
