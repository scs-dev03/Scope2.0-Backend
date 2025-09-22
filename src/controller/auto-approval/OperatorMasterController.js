import {
 getOperator
} from "../../services/auto-approval/OperatorMasterService.js";
import { ApiError } from "../../utils/ApiError.js";

const fetchOperators = async (req, res, next) => {
  try {
    const result = await getOperator();
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(new ApiError(400, "cannot fetch the data"));
  }
};

export {fetchOperators};