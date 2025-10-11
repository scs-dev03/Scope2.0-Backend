import { partyAlreadyExistsCheck } from "../../services/auto-approval/spm-uploadService.js"
import { changePartyStatusService, viewAdvisorService, viewPartyService } from "../../services/auto-approval/spm-viewService.js"
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

const changePartyStatus = async (req, res) => {
    try {
        const { Id, status } = req.body
        const IdNum = Number(Id);
        const statusNum = Number(status); 

        if (!Number.isInteger(IdNum) || IdNum <= 0 || !(statusNum === 0 || statusNum === 1)) {
            return res.status(400).json(
                new ApiError(400, "Id and status (0 or 1) are required.", [], "")
            );
        }

        const result = await changePartyStatusService(Id, status)
        if (result > 0) {
            return res.status(200).json(new ApiResponse(200, [], 'Party Status Changed Successfully'))
        }
    } catch (error) {
        throw new ApiError(error.statusCode || 500, error || 'Something Went Wrong', [], error.message)
    }
}

export { viewParty, viewAdvisor, changePartyStatus }