import { uploadToS3 } from "../../middlewares/multer.middleware.js"
import { addNotinMasterService, viewNotInMasterService } from "../../services/auto-approval/notinmasterService.js"
import { ApiError } from "../../utils/ApiError.js"
import { ApiResponse } from "../../utils/ApiResponse.js"

const viewNotInMaster = async (req, res) => {
    try {
        const { BrandId, DealerId, LocationId, PartNumber, PartTypeId, Addedby, From, To, Status } = req.body

        // if(s !== number){
        //     return res.status(400).json(new ApiError(200,`Status is required`))
        // }
        if (Status !== null && Status !== undefined) {
            const s = Number(Status);
            if (!(s === 0 || s === 1 || s === 2)) {
                return res.status(400).json(new ApiError(400, 'Status must be 0 or 1 when provided.', [], ''));
            }
        }
        const result = await viewNotInMasterService(BrandId, DealerId, LocationId, PartNumber, PartTypeId, Addedby, From, To, Status)
        res.status(200).json(new ApiResponse(200, result, `Data Fetched SuccessFully`))
    } catch (error) {
        res.status(500).json(error)
    }
}

const addNotinMaster = async (req, res) => {
    try {
        const { Id, BrandId, DealerId, LocationId, PartNumber, PartDesc, MRP, LandedCost, MOQ, PartTypeId, Model, GSTPer, QtyPerVehicle, HSNID, Status, Detailsby, Remarks, LatestPartNumber } = req.body
        const file = req.file || null;

        const REQUIRED_FIELDS = ["Id", "BrandId", "DealerId", "LocationId", "PartNumber", "PartDesc", "MRP", "LandedCost", "MOQ", "PartTypeId", "Model", "Status"]
        const isMissing = v =>
            v === undefined || v === null || (typeof v === 'string' && v.trim() === '');

        const missing = REQUIRED_FIELDS.filter(k => isMissing(req.body[k]));
        if (missing.length) {
            return res.status(400).json(new ApiError(400, 'Missing required fields', missing, ''));
        }

        let url;
        if (file) {
            try {
                const s3Data = await uploadToS3(file);
                url = s3Data?.url ?? null;
            } catch (error) {
                throw new ApiError(500, error.message);
            }
        }
        const result = await addNotinMasterService({
            Id, BrandId, DealerId, LocationId, PartNumber, PartDesc, MRP, LandedCost, MOQ,
            PartTypeId, Model, GSTPer, QtyPerVehicle, HSNID, Status, Detailsby, Remarks, LatestPartNumber , url
        });
        // console.log(result);

        if (result.notFound) {
            return res.status(404).json(new ApiError(404, `Id ${Id} Not found in NotInMaster`, [], ''));
        }

        return res.status(200).json(new ApiResponse(200, { rowsAffected: result.rowsAffected }, 'Updated'));
    } catch (error) {
        return res.status(500).json(new ApiError(500, error.message || 'Unexpected error', [], ''));
    }
}

export { viewNotInMaster, addNotinMaster }