import {
  getAllLSPsService,
  getCommonFieldsService,
  getFieldMappingService,
  addOrSwitchLRNService,
  insertLRNDetailsVersionService,
  getLRNDetailsService,
  getLRNsByDispatchService,
  getLRNsByStatusService,
  ingestLSPPayloadService,
  getLRNHistoryService,
  addActionService,
  getLRNActionsService
} from "../../services/LSP/lsp.service.js";

//MASTER CONTROLLERS
const getAllLSPsController = async (req, res) => {
  try {
    const data = await getAllLSPsService();
    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("Error fetching LSPs:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch LSPs" });
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

//FIELD MAPPING
const getFieldMappingController = async (req, res) => {
  try {
    const { lspCode } = req.params;
    const data = await getFieldMappingService(lspCode);

    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

//DISPATCH ↔ LRN
const addOrSwitchLRNController = async (req, res) => {
  try {
    const { dispatchOrderNo, lrNumber, LSPCode } = req.body;

    if (!dispatchOrderNo || !lrNumber || !LSPCode) {
      return res.status(400).json({
        success: false,
        message: "dispatchOrderNo, lrNumber, and LSPCode are required"
      });
    }

    const data = await addOrSwitchLRNService(dispatchOrderNo, lrNumber, LSPCode);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("Error adding/switching LRN:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

//VERSIONED LRN INSERT
const insertLRNDetailsVersionController = async (req, res) => {
  try {
    const payload = req.body;

    if (!payload.LRNumber || !payload.LSPCode || !payload.Status) {
      return res.status(400).json({
        success: false,
        message: "LRNumber, LSPCode, and StatusID are required"
      });
    }

    payload.NormalExceptionRTO = payload.NormalExceptionRTO ?? 1;
    payload.IsCritical = payload.IsCritical ?? 0;

    const data = await insertLRNDetailsVersionService(payload);

    return res.status(201).json({
      success: true,
      data
    });
  } catch (err) {
    console.error("Error inserting LRN version:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to insert LRN version"
    });
  }
};

//READ APIs
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

//MAIN INGESTION
const ingestLSPPayloadController = async (req, res) => {
  try {
    const { lspCode, lspName, dispatchOrderNo, data } = req.body;

    const result = await ingestLSPPayloadService({
      lspCode,
      lspName,
      dispatchOrderNo,
      data
    });

    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
};

// get history of LRN
const getLRNHistoryController = async (req, res) => {
  try {
    const { lrNumber } = req.params;

    if (!lrNumber) {
      return res.status(400).json({
        success: false,
        message: "LRNumber is required"
      });
    }

    const rows = await getLRNHistoryService(lrNumber);

    const map = {};

    rows.forEach(r => {
      const key = `${r.LRNumber}-${r.Version}`;

      if (!map[key]) {
        // create base LRN object (exclude action columns)
        const {
          ActionID,
          ActionMessage,
          UserID,
          ActionTime,
          Photos,
          ...lrnData
        } = r;

        map[key] = {
          ...lrnData,
          Actions: []
        };
      }

      // push action if exists
      if (r.ActionID) {
        map[key].Actions.push({
          ActionID: r.ActionID,
          Message: r.ActionMessage,
          Photos: r.Photos,
          UserID: r.UserID,
          ActionTime: r.ActionTime
        });
      }
    });

    const result = Object.values(map);

    return res.status(200).json({
      success: true,
      count: result.length,
      data: result
    });
  } catch (err) {
    console.error("Error fetching LRN history:", err);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// actions
const addActionController = async (req, res) => {
  try {
    const { LRNumber, Version, Message, Photos, UserID, Issue, Resolution } = req.body;
    
    if (!LRNumber || !Version || !Message || !UserID) {
      return res.status(400).json({
        success: false,
        message: "LRNumber, Version, Message and UserID are required"
      });
    }
    
    const result = await addActionService({
      LRNumber,
      Version,
      Message,
      Photos,
      UserID,
      Issue,
      Resolution
    });

    return res.status(201).json({
      success: true,
      data: result
    });
  } catch (err) {
    console.error("Add Action Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to add action"
    });
  }
};

const getActionsByLRNController = async (req, res) => {
  try {
    const { lrNumber, version } = req.params;

    const actions = await getLRNActionsService(lrNumber, Number(version));

    return res.status(200).json({
      success: true,
      data: actions
    });
  } catch (err) {
    console.error("Get Actions Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to fetch actions"
    });
  }
};

export {
  getAllLSPsController,
  getCommonFieldsController,
  getFieldMappingController,
  addOrSwitchLRNController,
  insertLRNDetailsVersionController,
  getLRNsByDispatchController,
  getLRNDetailsController,
  getLRNsByStatusController,
  ingestLSPPayloadController,
  getLRNHistoryController,
  addActionController,
  getActionsByLRNController
};
