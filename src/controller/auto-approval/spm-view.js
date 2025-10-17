import { findAdvisorOnLocation, partyAlreadyExistsCheck } from "../../services/auto-approval/spm-uploadService.js"
import { existingAdvisor, existingPartyNameandCodeService, updateAdvisorService, updatePartyService, viewAdvisorService, viewPartyService } from "../../services/auto-approval/spm-viewService.js"
import { ApiError } from "../../utils/ApiError.js"
import { ApiResponse } from "../../utils/ApiResponse.js"



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
            return res.status(200).json(new ApiResponse(200, [result.updatedRow], 'Party Updated Successfully'))
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


export { viewParty, viewAdvisor, updateParty, updateAdvisor }