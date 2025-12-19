// controllers/lrn.controller.js
import { createLrnService, getAllLrnsService,
  getLrnsByLspService } from "../../services/LSP/lrn.service.js";

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