import { adminBrandwiseService, adminDashboardService } from "../../services/auto-approval/admin-viewService.js"
import { ApiError } from "../../utils/ApiError.js"
import { ApiResponse } from "../../utils/ApiResponse.js"

const adminDashboard = async (req, res) => {
    try {
        const { BrandId, DealerId, LocationId, OrderTypeId, From, To } = req.body
        // if (!From || !To) {
        //     return res.status(400).json(new ApiError(400, `From and To are required `))
        // }
        function format(arr) {
            if (!Array.isArray(arr) || arr.length === 0) return null;
            const s = arr.map(v => String(v).trim()).filter(Boolean).join(',');
            return s ? `'${s.replace(/'/g, "''")}'` : null;
        }

        const formattedBrandIds = format(BrandId)
        const formattedDealerIds = format(DealerId)
        const formattedLocationIds = format(LocationId)

        const result = await adminDashboardService(formattedBrandIds, formattedDealerIds, formattedLocationIds, OrderTypeId, From, To)

        res.status(200).json(new ApiResponse(200, result, `Data Fetched Successfully`))
    } catch (error) {
        res.status(500).json(new ApiError(error.statusCode || 500, error.message))
    }

}

const adminBrandwise = async (req, res) => {
    try {
        const result = await adminBrandwiseService()
        res.status(200).json(new ApiResponse(200, result))
    } catch (error) {
        res.status(500).json(new ApiError(error.statusCode || 500, error.message))
    }
}

export { adminDashboard, adminBrandwise }