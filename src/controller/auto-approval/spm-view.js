import { viewAdvisorService, viewPartyService } from "../../services/auto-approval/spm-viewService.js"
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


export { viewParty, viewAdvisor }