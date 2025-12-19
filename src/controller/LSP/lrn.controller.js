// controllers/lrn.controller.js
import { createLrnService, getAllLrnsService,
  getLrnsByLspService, getLrnsByDispatchOrderService, 
  getLrnByNumberService, getLrnsByStatusService } from "../../services/LSP/lrn.service.js";

export const createLrn = async (req, res, next) => {
  try {
    const result = await createLrnService(req.body);
    console.log("Results after lrnService", result);

    res.status(201).json({
      message: "LRN created successfully",
      data: result
    });
  } catch (err) {
    next(err);
  }
};

export const getAllLrns = async (req, res, next) => {
  try {
    const data = await getAllLrnsService();
    res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
};

export const getLrnsByLsp = async (req, res, next) => {
  try {
    const { lspName } = req.query;

    if (!lspName) {
      return res.status(400).json({ message: "lspName is required" });
    }

    const data = await getLrnsByLspService(lspName);
    res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
};

export const getLrnsByDispatchOrder = async (req, res, next) => {
  try {
    const { dispatchOrderNo } = req.params;

    if (!dispatchOrderNo) {
      return res
        .status(400)
        .json({ message: "dispatchOrderNo is required" });
    }

    const data = await getLrnsByDispatchOrderService(dispatchOrderNo);

    res.status(200).json({
      dispatchOrderNo,
      count: data.length,
      data
    });
  } catch (err) {
    next(err);
  }
};

export const getLrnByNumber = async (req, res, next) => {
  try {
    const { lrNumber } = req.params;

    if (!lrNumber) {
      return res.status(400).json({ message: "lrNumber is required" });
    }

    const data = await getLrnByNumberService(lrNumber);

    if (!data.length) {
      return res.status(404).json({
        message: "No LRN found for given LRNumber"
      });
    }

    res.status(200).json({
      lrNumber,
      count: data.length,
      data
    });
  } catch (err) {
    next(err);
  }
};

export const getLrnsByStatus = async (req, res, next) => {
  try {
    const { status } = req.params;

    if (!status) {
      return res.status(400).json({ message: "status is required" });
    }

    const data = await getLrnsByStatusService(status);

    res.status(200).json({
      status,
      count: data.length,
      data
    });
  } catch (err) {
    next(err);
  }
};