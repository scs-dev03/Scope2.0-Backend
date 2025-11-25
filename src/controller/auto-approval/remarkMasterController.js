import { editRemarkService, insertRemarkService, remarktypeMasterService, remarkViewService } from "../../services/auto-approval/remarkMasterService.js"
import { ApiError } from "../../utils/ApiError.js"
import { ApiResponse } from "../../utils/ApiResponse.js"

const insertRemark = async (req, res) => {
    try {
        const { BrandId, DealerId, LocationId, Remark, Remarktype, userid } = req.body
        // console.log(BrandId, DealerId, LocationId, Remark, Remarktype, userid);
        if(!Remarktype){
            return res.status(400).json(new ApiError(400,`Remarktype is Required`))
        }

        const result = await insertRemarkService(BrandId, DealerId, LocationId, Remark, Remarktype, userid)
        res.status(200).json(new ApiResponse(200, result, `Remarks Created`))
    } catch (error) {
        res.status(500).json(new ApiError(200, error.message))
    }
}

const remarktypeMaster = async (req, res) => {
    try {
        const { Type } = req.body
        const result = await remarktypeMasterService(Type)
        res.status(200).json(new ApiResponse(200, result))
    } catch (error) {
        res.status(500).json(new ApiError(500, error.message))
    }
}

const remarkView = async (req, res) => {
    try {
        const { BrandId, DealerId, LocationId, RemarkFor, RemarkTypeId } = req.body
        const result = await remarkViewService(BrandId, DealerId, LocationId, RemarkFor, RemarkTypeId)
        res.status(200).json(new ApiResponse(200, result, `Data Fetched`))
    } catch (error) {
        res.status(500).json(new ApiError(error.statusCode || 500, error.message))
    }

}

const editRemark = async (req, res) => {
    try {
        const { Id, BrandId, DealerId, LocationId, Remark, RemarkTypeId } = req.body
        if (!Id || !BrandId == null || !DealerId == null || !LocationId == null || !Remark || !RemarkTypeId) {
            return res.status(400).json(new ApiError(200, `All Fields are Required`))
        }
        const result = await editRemarkService(Id, BrandId, DealerId, LocationId, Remark, RemarkTypeId)
        res.status(200).json(new ApiResponse(200, result, `Remark Updated Successfully`))
    } catch (error) {
        res.status(error.statusCode || 500).json(new ApiError(error.statusCode || 500, error.message))
    }
}

export { insertRemark, remarktypeMaster, remarkView, editRemark }