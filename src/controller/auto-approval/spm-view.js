import { json } from "express"
import { findAdvisorOnLocation, partyAlreadyExistsCheck } from "../../services/auto-approval/spm-uploadService.js"
import { existingAdvisor, existingPartyNameandCodeService, nonMovingService, orderPlacedService, reorderService, spmDashboardService, updateAdvisorService, updatePartyService, viewAdvisorService, viewOrderStatusService, viewPartyService } from "../../services/auto-approval/spm-viewService.js"
import { ApiError } from "../../utils/ApiError.js"
import { ApiResponse } from "../../utils/ApiResponse.js"
import { groupStock } from "../../services/dealerMonitoring/dealerMonitoringService.js"



const viewParty = async (req, res) => {
    try {
        const { LocationId, Status } = req.body
        if (!LocationId) {
            return res.status(400).json(new ApiError(400, 'LocationId is Required', []))
        }
        const data = await viewPartyService(LocationId, Status)
        res.status(200).json(new ApiResponse(200, data, 'Data Fetched Successfully'))
    } catch (error) {
        res.status(500).json(new ApiError(500, error, []))
    }
}

const viewAdvisor = async (req, res) => {
    try {
        const { LocationId , Status} = req.body
        if (!LocationId) {
            return res.status(400).json(new ApiError(400, 'LocationId is Required', []))
        }
        const data = await viewAdvisorService(LocationId , Status)
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

        const existingPartyNameandCode = await existingPartyNameandCodeService(Id)
        const partyNames = existingPartyNameandCode
            .map(obj => obj.PartyName)
            .filter(name => name !== null && name !== undefined);

        const partyCodes = existingPartyNameandCode
            .map(obj => obj.PartyCode)
            .filter(code => code !== null && code !== undefined);

        if (partyNames.includes(PartyName)) {
            return res.status(400).json(new ApiError(400, `PartyName Already Exists`))
        }
        if (partyCodes.includes(PartyCode)) {
            return res.status(400).json(new ApiError(400, `PartyCode Already Exists`))
        }

        const result = await updatePartyService(Id, PartyName, PartyCode, status)
        if (result.updatedCount >= 0) {
            return res.status(200).json(new ApiResponse(200, [result.updatedRow], 'Updated Successfully'))
        }
    } catch (error) {
        return res.status(error.statusCode || 500).json(new ApiError(error.statusCode || 500, error.message || 'Unable to Update Party Details', []));
        // throw new ApiError(error.statusCode || 500, error || 'Something Went Wrong', [], error.message)
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

        // const existing = await existingAdvisor(Id)
        // const existingAdvisorName = existing[0]
        // const existingAdvisorDetails = existing[1]
        // // console.log(existingAdvisorName,existingAdvisorDetails);

        // const advisorNames = existingAdvisorName
        //     .map(obj => obj.Advisor)
        //     .filter(name => name !== null && name !== undefined);
        // console.log(advisorNames);
        // console.log(Advisor.toLowerCase());

        // if (advisorNames.includes(Advisor)) {
        //     return res.status(400).json(new ApiError(400, `Advisor Already Exists`))
        // }
        // const existingPhoneNo = existingAdvisorDetails
        //     .map(obj => obj.PhoneNo)
        //     .filter(name => name !== null && name !== undefined);

        // if (existingPhoneNo.includes(PhoneNo)) {
        //     return res.status(400).json(new ApiError(400, `PhoneNo Already Exists`))
        // }
        // const existingEmails = existingAdvisorDetails
        //     .map(obj => obj.Email)
        //     .filter(name => name !== null && name !== undefined);

        // if (existingEmails.includes(Email)) {
        //     return res.status(400).json(new ApiError(400, `Email Already Exists`))
        // }

        const normStr = s =>
            s == null ? null : String(s).trim().replace(/\s+/g, ' ').toLowerCase();

        const normPhone = s =>
            s == null ? null : String(s).replace(/\D/g, ''); // keep digits only

        const normEmail = s =>
            s == null ? null : String(s).trim().toLowerCase();

        // ----- your code -----
        const existing = await existingAdvisor(Id);
        const existingAdvisorName = existing[0];     // [{ Advisor, Id }, ...]
        const existingAdvisorDetails = existing[1];  // [{ PhoneNo, Email, Id }, ...]

        // Build fast lookup sets (ignore nulls)
        const advisorSet = new Set(
            existingAdvisorName
                .map(o => normStr(o.Advisor))
                .filter(Boolean)
        );

        const phoneSet = new Set(
            existingAdvisorDetails
                .map(o => normPhone(o.PhoneNo))
                .filter(Boolean)
        );

        const emailSet = new Set(
            existingAdvisorDetails
                .map(o => normEmail(o.Email))
                .filter(Boolean)
        );

        // Normalize incoming values
        const inAdvisor = normStr(Advisor);
        const inPhone = normPhone(PhoneNo);
        const inEmail = normEmail(Email);

        // Case-insensitive / normalized checks
        if (inAdvisor && advisorSet.has(inAdvisor)) {
            return res.status(400).json(new ApiError(400, 'Advisor Already Exists'));
        }

        if (inPhone && phoneSet.has(inPhone)) {
            return res.status(400).json(new ApiError(400, 'PhoneNo Already Exists'));
        }

        if (inEmail && emailSet.has(inEmail)) {
            return res.status(400).json(new ApiError(400, 'Email Already Exists'));
        }

        const result = await updateAdvisorService({ Id, Advisor, PhoneNo, Email, Status });

        if ((result.updatedCount ?? 0) > 0) {
            return res
                .status(200)
                .json(new ApiResponse(200, [result.updatedRow], 'Updated successfully'));
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

// const viewOrderStatus = async(req,res)=> {
//     const {DealerId ,LocationIds , RequestType , From , To , OrderTypeIds , PartNumbers , VehicleNumbers , JobCardNumbers , AdvisorIds , Status} = req.body
//     const result = await viewOrderStatusService()
//     res.status(200).json(new ApiResponse(200,result))
// }
const viewOrderStatus = async (req, res) => {
    try {
        const {
            DealerId,
            LocationIds,
            RequestType,
            From,
            To,
            OrderTypeIds,
            PartNumbers,
            VehicleNumbers,
            JobCardNumbers,
            AdvisorIds,
            Status
        } = req.body;

        // console.log(DealerId, LocationIds, RequestType, From, To, OrderTypeIds, PartNumbers, VehicleNumbers, JobCardNumbers, AdvisorIds, Status);
        // Handle triple quotes for SQL parameters
        // function formatForSql(array) {
        //     if (!Array.isArray(array) || array.length === 0) return "NULL";
        //     const joined = array.map(v => `'${v}'`).join(",");
        //     return `'${joined.replace(/'/g, "''")}'`;
        // }

        // function format(arr) {
        //     if (!Array.isArray(arr) || arr.length === 0) return null;
        //     // if (!Array.isArray(arr)) return '';
        //     return arr.join(',');
        // }
        function format(arr) {
            if (!Array.isArray(arr) || arr.length === 0) return null;
            const s = arr.map(v => String(v).trim()).filter(Boolean).join(',');
            return s ? `'${s.replace(/'/g, "''")}'` : null;
        }

        //  // Format parameters using the formatForSql function
        const formattedLocationIds = format(LocationIds);
        const formattedRequestType = format(RequestType);
        const formattedOrderTypeIds = format(OrderTypeIds);
        const formattedPartNumbers = format(PartNumbers);
        const formattedVehicleNumbers = format(VehicleNumbers);
        const formattedJobCardNumbers = format(JobCardNumbers);
        const formattedAdvisorIds = format(AdvisorIds);
        const formattedStatus = format(Status);

        // console.log(DealerId,
        //     formattedLocationIds,
        //     formattedRequestType,
        //     From,
        //     To,
        //     formattedOrderTypeIds,
        //     formattedPartNumbers,
        //     formattedVehicleNumbers,
        //     formattedJobCardNumbers,
        //     formattedAdvisorIds,
        //     formattedStatus);

        const result = await viewOrderStatusService(
            DealerId,
            formattedLocationIds,
            formattedRequestType,
            From,
            To,
            formattedOrderTypeIds,
            formattedPartNumbers,
            formattedVehicleNumbers,
            formattedJobCardNumbers,
            formattedAdvisorIds,
            formattedStatus // Pass formatted Status
        );
        res.status(200).json(new ApiResponse(200, result));
    } catch (error) {
        res.status(500).json(error)
    }
};

const orderPlaced = async (req, res) => {
    try {
        const { DealerId, bigid, scs_status, orderplace, POnumber } = req.body
        if (!DealerId || !bigid || scs_status === undefined || !orderplace) {
            return res.status(400).json(new ApiError(400, `DealerId, bigid , scs_status , orderplace are required`))
        }
        if (orderplace === "YES" && (!POnumber || POnumber === undefined)) {
            return res.status(400).json(new ApiError(400, `Ponumber is required when orderplace is 'YES'`))
        }

        let tableName;
        if (scs_status === "Approve" || scs_status === "Decline") {
            tableName = `create_order_request_td001_${DealerId}`
        }
        else {
            tableName = `CreateOrderRequestPending_td001_${DealerId}`
        }

        const result = await orderPlacedService(tableName, bigid, orderplace, POnumber)
        res.status(200).json(new ApiResponse(200, [result.rowsAffected[0]], `Updated Successfully`,))
    } catch (error) {
        res.status(500).json(error)
    }
}

const reOrder = async (req, res) => {
    try {
        const { DealerId, bigid, Remarks } = req.body
        if (!DealerId || !bigid) {
            return res.status(400).json(new ApiError(400, `DealerId and Remarks are required`))
        }
        const result = await reorderService(DealerId, bigid, Remarks)
        res.status(200).json(new ApiResponse(200, result, `ReOrder Successfull`))
    } catch (error) {
        res.status(500).json(error)
    }
}

const nonMoving = async (req, res) => {
    try {
        const { partnumber, BrandId, LocationId } = req.body
        if (!partnumber || !BrandId || !LocationId) {
            return res.status(400).json(new ApiError(400, `partnumber, BrandId, LocationId are required`))
        }
        const result = await nonMovingService(partnumber, BrandId, LocationId)
        res.status(200).json(new ApiResponse(200, result, `Data Fetched Successfully`))
    } catch (error) {
        res.status(500).json(new ApiError(500, error.message))
    }
}

const viewgroupStock = async (req, res) => {
    try {
        const { BrandId, DealerId, LocationId, PartNumber } = req.body
        if (!PartNumber || !BrandId || !LocationId || !DealerId) {
            return res.status(400).json(new ApiError(400, `partnumber, BrandId, LocationId , DealerId are required`))
        }
        const result = await groupStock(BrandId, DealerId, LocationId, PartNumber)
        // console.log(result);
        res.status(200).json(new ApiResponse(200, result.recordset, `Data Fetched Successfully`))
    } catch (error) {
        res.status(500).json(new ApiError(500, error))
    }
}

const spmDashboard = async (req, res) => {
    try {
        const { DealerId, LocationId, OrderTypeId, From, To } = req.body
        if (!DealerId || !From || !To) {
            return res.status(400).json(new ApiError(400, `DealerId , From and To are required `))
        }
        const result = await spmDashboardService(DealerId, LocationId, OrderTypeId, From, To)
        res.status(200).json(new ApiResponse(200, result, `Data Fetched Successfully`))
    } catch (error) {
        res.status(500).json(error)
    }
}

export { viewParty, viewAdvisor, updateParty, updateAdvisor, viewOrderStatus, orderPlaced, reOrder, nonMoving, viewgroupStock, spmDashboard }