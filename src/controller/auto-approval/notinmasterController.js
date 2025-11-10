import { uploadToS3 } from "../../middlewares/multer.middleware.js"
import { addNotinMasterService, mappingParttypeHSNCode, uploadNotinMasterService, viewNotInMasterService } from "../../services/auto-approval/notinmasterService.js"
import { ApiError } from "../../utils/ApiError.js"
import { ApiResponse } from "../../utils/ApiResponse.js"
import { validateHeaders } from "../../utils/validator.js"
import { readExcel } from "../../utils/vonHelper.js"
import fs from 'fs'

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
            PartTypeId, Model, GSTPer, QtyPerVehicle, HSNID, Status, Detailsby, Remarks, LatestPartNumber, url
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

const uploadNotinMaster = async (req, res) => {
    const { BrandId, userId } = req.body
    const file = req.file

    if (!BrandId || !userId) {
        return res.status(400).json(new ApiError(400, `BrandId and userId is Required`))
    }
    if (!file) {
        return res.status(400).json(new ApiError(400, `file is Required`))
    }
    const { headers, data } = await readExcel(file.path)
    const REQUIRED_HEADERS = ["PartNumber", "PartDesc", "MRP", "LandedCost", "MOQ", "Model"]
    fs.unlinkSync(file.path);

    const { ok: headersOk, missingHeaders } = validateHeaders(headers, REQUIRED_HEADERS);
    if (!headersOk) {
        return res.status(400).json(
            new ApiError(400, "Missing headers", missingHeaders, "")
        );
    }
    // helper: treat undefined/null/"" (or whitespace-only) as missing
    const isEmpty = v =>
        v === undefined || v === null || (typeof v === "string" && v.trim() === "");

    // optional: trim all string cells
    const cleaned = data.map(row =>
        Object.fromEntries(
            Object.entries(row).map(([k, v]) => [k, typeof v === "string" ? v.trim() : v])
        )
    );

    // validate each row for required cells
    const rowErrors = [];
    cleaned.forEach((row, idx) => {
        const missingCols = REQUIRED_HEADERS.filter(col => isEmpty(row[col]));
        if (missingCols.length) {
            // +2 because row 1 = header, row 2 = first data row
            rowErrors.push({ rowNumber: idx + 2, missingColumns: missingCols });
        }
    });

    if (rowErrors.length) {
        return res.status(400).json(
            new ApiError(400, "Missing required cell values", rowErrors, "")
        );
    }
    const { mapped, errors } = await mappingParttypeHSNCode(data)
    if (errors.length) {
        return res.status(400).json(new ApiError(400, `Invalid PartType or HSNcode`, errors))
    }
    const result = await uploadNotinMasterService(BrandId, mapped , userId)

    res.status(200).json(new ApiResponse(200, result, `Uploaded Successfully`))

}
export { viewNotInMaster, addNotinMaster, uploadNotinMaster }