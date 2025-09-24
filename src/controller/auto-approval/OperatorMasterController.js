import { getOperator } from "../../services/auto-approval/OperatorMasterService.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";

const fetchOperators = async (req, res) => {
  try {
    const data = await getOperator();
    res
        .status(200)
        .json(new ApiResponse(200, data, "template fetched successfully"));
  } catch (err) {
    res
      .status(err.statusCode || 500)
      .json(new ApiError(err.statusCode || 500, err.message, [], ""));
  }
};

export {fetchOperators};