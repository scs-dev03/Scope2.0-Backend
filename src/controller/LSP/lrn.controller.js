// controllers/lrn.controller.js
import { createLrnService } from "../../services/LSP/lrn.service.js";

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
