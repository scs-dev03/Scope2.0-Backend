import { updateAdvisorService, updatePartyService, viewAdvisorService, viewPartyService } from "../../services/auto-approval/spm-viewService.js"
import { ApiError } from "../../utils/ApiError.js"
import { ApiResponse } from "../../utils/ApiResponse.js"



const viewParty = async (req, res) => {
    try {
        const { LocationId } = req.body
        if (!LocationId) {
            return res.status(400).json(new ApiError(400, 'LocationId is Required', []))
        }
        const data = await viewPartyService(LocationId)
        res.status(200).json(new ApiResponse(200, data, 'Data Fetched Successfully'))
    } catch (error) {
        res.status(500).json(new ApiError(500, error, []))
    }
}

const viewAdvisor = async (req, res) => {
    try {
        const { LocationId } = req.body
        if (!LocationId) {
            return res.status(400).json(new ApiError(400, 'LocationId is Required', []))
        }
        const data = await viewAdvisorService(LocationId)
        res.status(200).json(new ApiResponse(200, data, 'Data Fetched Successfully'))
    } catch (error) {
        res.status(500).json(new ApiError(500, error, []))
    }
}

const updateParty = async (req, res) => {
    try {
        const { Id, PartyName, PartyCode, status } = req.body
        const IdNum = Number(Id);
        const statusNum = Number(status);

        if (!Number.isInteger(IdNum) || IdNum <= 0 || !(statusNum === 0 || statusNum === 1)) {
            return res.status(400).json(
                new ApiError(400, "Id and status (0 or 1) are required.", [], "")
            );
        }

        const result = await updatePartyService(Id, PartyName, PartyCode, status)
        if (result.updatedCount >= 0) {
            return res.status(200).json(new ApiResponse(200, [result.updatedRow], 'Party Updated Successfully'))
        }
    } catch (error) {
        throw new ApiError(error.statusCode || 500, error || 'Something Went Wrong', [], error.message)
    }
}

const updateAdvisor = async (req, res) => {
  try {
    const { Id, Advisor, PhoneNo, Email, Status } = req.body;

    // Validate Id & Status (if provided)
    const IdNum = Number(Id);
    if (!Number.isInteger(IdNum) || IdNum <= 0) {
      return res.status(400).json(new ApiError(400, 'Valid Id is required.', [], ''));
    }
    if (Status !== null && Status !== undefined) {
      const s = Number(Status);
      if (!(s === 0 || s === 1)) {
        return res.status(400).json(new ApiError(400, 'Status must be 0 or 1 when provided.', [], ''));
      }
    }

    const result = await updateAdvisorService({ Id, Advisor, PhoneNo, Email, Status });

    if ((result.updatedCount ?? 0) > 0) {
      return res
        .status(200)
        .json(new ApiResponse(200, [result.updatedRow], 'Advisor updated successfully'));
    }
    return res
      .status(404)
      .json(new ApiError(404, 'Advisor not found or nothing to update', [], ''));
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json(new ApiError(error.statusCode || 500, error.message || 'Something went wrong', [], ''));
  }
};


export { viewParty, viewAdvisor, updateParty , updateAdvisor}