import { readExcel } from "../../utils/vonHelper.js";
import { insertApprovals, insertSpmParty, insertadvisorParty } from "../../services/auto-approval/spm-InsertionService.js"
import fs from 'fs'
import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";
import { spmBulkCSUpload, spmMultiCSUpload, spmBulkWSUpload, spmBulkVehicleUpload, stockViewService, partyAlreadyExistsCheck, getduplicatesArray, advisorAlreadyExistsCheck, findAdvisorOnLocation } from "../../services/auto-approval/spm-uploadService.js";
import { partyNameCodeMapping } from '../../services/auto-approval/spm-uploadService.js'
import { validateHeaders, findRowIssues, getDuplicatesByKey, getDuplicateGroups, normalizePartyRows, partyKey, isBlank, validateExcelRows, validatePartyExcelRows } from '../../utils/validator.js';

const stockuploadCs = async (req, res) => {
  try {
    const { LocationId, OrderType, PartyName, PartyCode, Bulk, userId } = req.body
    const file = req.file
    if (!file) {
      return res.status(400).json(new ApiError(400, "" || "File Not Attached"));
    }
    if (!Bulk || !OrderType || !LocationId || !userId) {
      return res.status(400).json(new ApiError(400, `Bulk , LocationId , userId and  OrderType is required`, [], ''))
    }
    if (Bulk == 1) {
      try {
        const data = await spmBulkCSUpload(LocationId, OrderType, file.path, userId)

        // await insertApprovals(data)
        res.status(200).json(`Bulk Insertion Successful`)
      } catch (error) {
        return res.status(error.statusCode).json(error);
      }
    }
    else {
      try {
        const data = await spmMultiCSUpload(LocationId, OrderType, PartyName, file.path, userId)

        // await insertApprovals(data)
        res.status(200).json(`Multi Insertion Succesfull`)
      } catch (error) {
        return res.status(error.statusCode).json(error);
      }
    }
  } catch (error) {
    return res.status(error.statusCode).json(error);
  }
}

const stockuploadWs = async (req, res) => {
  try {
    const { LocationId, OrderType, userId } = req.body
    const file = req.file
    if (!file) {
      return res.status(400).json(new ApiError(400, error?.message || "File Not Attached"));
    }
    if (!OrderType || !LocationId || !userId) {
      return res.status(400).json(new ApiError(400, `LocationId , userId and  OrderType is required`, [], ''))
    }
    const data = await spmBulkWSUpload(LocationId, OrderType, file.path, userId)
    await insertApprovals(data)
    res.status(200).json(`Bulk Insertion Successful`)
  } catch (error) {
    return res.status(error.statusCode).json(error);
  }
}

const vehicleUpload = async (req, res) => {
  try {
    const file = req.file
    if (!file) {
      return res.status(400).json(new ApiError(400, error?.message || "File Not Attached"));
    }
    const { LocationId, userId } = req.body
    if (!LocationId || !userId) {
      return res.status(400).json(new ApiError(400, `LocationId and userId  is required`, [], ''))
    }
    const data = await spmBulkVehicleUpload(file.path, LocationId, userId)
    await insertApprovals(data)
    res.status(200).json(`Bulk Insertion Successful`)
  } catch (error) {
    return res.status(error.statusCode).json(error);
  }
}

const spmPartyUpload = async (req, res) => {
  try {
    const file = req.file;
    const LocationId = Number(req.body.LocationId);
    const userId = Number(req.body.userId);

    if (!file) {
      return res.status(400).json(new ApiError(400, "File not attached", []));
    }
    if (!Number.isInteger(LocationId) || !Number.isInteger(userId)) {
      fs.unlinkSync(file.path);
      return res.status(400).json(new ApiError(400, "LocationId and userId are required", []));
    }

    const REQUIRED_HEADERS = ["PartyCode", "PartyName"];
    const { headers, data } = await readExcel(file.path);
    fs.unlinkSync(file.path); 

    // 1) Header validation
    const { ok: headersOk, missingHeaders } = validateHeaders(headers, REQUIRED_HEADERS);
    if (!headersOk) {
      return res.status(400).json(
        new ApiError(400, "Missing headers",  missingHeaders , "")
      );
    }

    // 2) Normalize party rows (trim/cap lengths)
    // const normalized = normalizePartyRows(data);

    // // 3) Row-level completeness (at least one of PartyCode/PartyName must be present)
    // const issues = normalized
    //   .map((row, i) => {
    //     const missing = [];
    //     const bothNull = isBlank(row.PartyCode) && isBlank(row.PartyName);
    //     if (bothNull) missing.push("PartyCode_or_PartyName");
    //     return { index: i, missing, row };
    //   })
    //   .filter(x => x.missing.length);
    // // console.log(`issues`, issues);

    // if (issues.length) {
    //   return res.status(400).json(
    //     new ApiError(400, "Data Incomplete", { missingRows: issues.map(x => x.row), issues }, "")
    //   );
    // }

    // // 4) Duplicates within the uploaded file
    // const duplicateRows = getDuplicatesByKey(normalized, partyKey);
    // // console.log(`duplicateRows`, duplicateRows);

    // if (duplicateRows.length) {
    //   const duplicateGroups = getDuplicateGroups(normalized, partyKey);
    //   return res.status(400).json(
    //     new ApiError(400, "Duplicate PartyCode/PartyName pairs in file", { duplicateRows, duplicateGroups }, "")
    //   );
    // }
    const normalized = normalizePartyRows(data); 
const v = validatePartyExcelRows(normalized);
if (!v.isValid) {
  return res.status(400).json(new ApiError(400, "Excel Contains Duplicate Values", v.issues));
}
    const formattedData = normalized.map(row => ({
      ...row,
      LocationId,
      CreatedBy: userId
    }));

    const existing = await partyAlreadyExistsCheck(formattedData);
    if (existing.length) {
      return res.status(400).json(
        new ApiError(400, "Some records already exist", existing, "")
      );
    }
    
    await insertSpmParty(formattedData);

    return res
      .status(200)
      .json(new ApiResponse(200, [], "Bulk insertion successful"));

  } catch (error) {
    const code = error?.statusCode || 500;
    return res.status(code).json(
      new ApiError(code, error?.message || "Something went wrong", error?.data || [], "")
    );
  }
};

const spmAdvisorUpload = async (req, res) => {
  try {
    const file = req.file
    const { LocationId, userId } = req.body
    if (!LocationId || !userId) {
      return res.status(400).json(new ApiError(400, error?.message || "LocationId and userId Not Found"));
    }
    if (!file) {
      return res.status(400).json(new ApiError(400, error?.message || "File Not Attached"));
    }

    const REQUIRED_HEADERS = ["Advisor", "PhoneNo", "Email"];
    const { headers, data } = await readExcel(file.path)
    fs.unlinkSync(file.path)
    

 // 1) Header validation
    const { ok: headersOk, missingHeaders } = validateHeaders(headers, REQUIRED_HEADERS);
    if (!headersOk) {
      return res.status(400).json(
        new ApiError(400, "Missing headers", missingHeaders, "")
      );
    }
       const check = validateExcelRows(data);
    if (!check.isValid) {
      // Build a concise error payload
      const problems = [];
      if (check.issues.missingAdvisor.length) {
        problems.push({
          type: "MissingAdvisor",
          rows: check.issues.missingAdvisor
        });
      }
      if (check.issues.duplicateAdvisors.length) {
        problems.push({
          type: "DuplicateAdvisors",
          items: check.issues.duplicateAdvisors
        });
      }
      if (check.issues.duplicateRows.length) {
        problems.push({
          type: "ExactDuplicateRows",
          items: check.issues.duplicateRows
        });
      }
      return res.status(400).json(new ApiError(400, "Excel Contains Duplicate Values", problems));
    }
    const formattedData = data.map(row => ({
      ...row,
      LocationId,
      userId
    }));
    
    const existing = await advisorAlreadyExistsCheck(formattedData, 'dbo.AAP_SPMAdvisorMaster')
    if (existing.length) {
      return res.status(400).json(
        new ApiError(400, "Some records already exist", existing, "")
      );
    }
    const advisorExists = await findAdvisorOnLocation(formattedData, 'dbo.AAP_SPMAdvisorMaster')
        if (advisorExists.length) {
      return res.status(400).json(
        new ApiError(400, "Some records already exist", advisorExists, "")
      );
    }
    await insertadvisorParty(formattedData);
    res.status(200).json(new ApiResponse(200, [], `Bulk Insertion Successfull`))
  } catch (error) {
    return res.status(500).json(error);
  }
}

const singleUploadCs = async (req, res) => {
  try {
    const {
      LocationId, OrderType, PartyName,
      PartNumber, Qty, Remarks, userId
    } = req.body;

    if (!LocationId || !OrderType || !PartyName || !PartNumber || !userId) {
      return res.status(400).json(new ApiError(400, 'LocationId, OrderType, PartyName, PartNumber and userId are required', [], ''));
    }
    //Normal/Urgent/Co-Dealer/Transfer
    if (!(OrderType == 'Normal' || OrderType == 'Urgent' || OrderType == 'Co-Dealer' || OrderType == 'Transfer')) {
      return res.status(400).json(new ApiError(400, 'please enter a valid order type', ['Normal', 'Co-Dealer', 'Urgent', 'Transfer']));
    }
    const partyMappingData = await partyNameCodeMapping(LocationId);
    if (!Array.isArray(partyMappingData) || partyMappingData.length === 0) {
      return res.status(400).json(new ApiError(400, `No Parties configured for Location ${LocationId}`));
    }

    const norm = s => String(s ?? "").trim().toLowerCase();
    const idByName = new Map(partyMappingData.map(({ PartyName, Id }) => [norm(PartyName), Id]));
    const PartyId = idByName.get(norm(PartyName));
    if (!PartyId) {
      return res.status(400).json(new ApiError(400, `No party found matching PartyName='${PartyName}' for Location ${LocationId}`));
    }

    const row = {
      PartNumber: String(PartNumber),
      Qty: Qty ? parseInt(Qty, 10) : null,
      PartyId,
      LocationId: LocationId ? parseInt(LocationId, 10) : null,
      OrderType: String(OrderType),
      Type: 'S',
      Remarks: Remarks || null,
      UploadedBy: userId ? parseInt(userId, 10) : null
    };

    const result = await insertApprovals([row]);
    return res.status(200).json({ message: 'Single Insertion Successful', result });
  } catch (error) {
    const status = (error && error.statusCode) || 500;
    console.error("SingleUploadCS error:", error);
    return res.status(status).json(error);
  }
};

const stockuploadWsSingle = async (req, res) => {
  try {
    const { LocationId, OrderType, userId, PartNumber, Qty, Remarks } = req.body;

    if (!LocationId || !OrderType || !userId || !PartNumber || !Qty) {
      return res.status(400).json(
        new ApiError(
          400,
          "LocationId, userId, OrderType, PartNumber, and Qty are required",
          [],
          ""
        )
      );
    }
    //Normal/Urgent/Co-Dealer/Transfer
    if (!(OrderType == 'Normal' || OrderType == 'Urgent' || OrderType == 'Co-Dealer' || OrderType == 'Transfer')) {
      return res.status(400).json(new ApiError(400, 'please enter a valid(Normal/Urgent/Co-Dealer/Transfer) order type', ['Normal', 'Co-Dealer', 'Urgent', 'Transfer']));
    }
    const formattedData = {
      PartNumber,
      Qty,
      Remarks: Remarks, // optional
      LocationId,
      OrderType,
      Type: "S",
      UploadedBy: userId,
    };

    await insertApprovals([formattedData]);
    res.status(200).json("Single Insertion Successful");
  } catch (error) {
    return res.status(error.statusCode || 500).json(error);
  }
};

const vehicleUploadSingle = async (req, res) => {
  try {
    const {
      LocationId,
      userId,
      VehicleNumber,
      VehicleModel,
      JobType,
      Advisor,
      OrderType,
      PartNumber,
      Qty,
      Remarks,
      AdvanceValue,
      Estimate,
      JobCardNumber
    } = req.body;

    if (!LocationId || !userId) {
      return res.status(400).json(
        new ApiError(400, "LocationId and userId are required", [], "")
      );
    }

    const REQUIRED_ALWAYS = ["VehicleNumber", "VehicleModel", "JobType", "Advisor", "OrderType", "PartNumber", "Qty"];
    const missing = REQUIRED_ALWAYS.filter(field => !req.body[field]);
    if (missing.length) {
      return res.status(400).json(
        new ApiError(400, "Missing required fields", missing, "")
      );
    }

    //one of Advance Value / Estimate 
    if ((AdvanceValue == null || AdvanceValue === "") && (Estimate == null || Estimate === "")) {
      return res.status(400).json(
        new ApiError(400, "At least one of AdvanceValue or Estimate is required", [], "")
      );
    }

    // Validate OrderType
    const ALLOWED = ["Normal", "Urgent", "Co-Dealer", "Transfer"];
    const norm = v => String(v ?? "").trim().toLowerCase();
    if (!ALLOWED.map(norm).includes(norm(OrderType))) {
      return res.status(400).json(
        new ApiError(400, `Invalid OrderType. Allowed: ${ALLOWED.join(", ")}`, [], "")
      );
    }

    const formattedData = {
      VehicleNumber,
      VehicleModel,
      JobType,
      Advisor,
      OrderType,
      PartNumber,
      Qty,
      Remarks: Remarks,
      AdvanceValue: AdvanceValue || null,
      Estimate: Estimate || null,
      JobCardNumber: JobCardNumber || null,
      LocationId,
      Type: "V",
      UploadedBy: userId
    };

    await insertApprovals([formattedData]);

    res.status(200).json("Single Vehicle Insertion Successful");
  } catch (error) {
    return res.status(error.statusCode || 500).json(error);
  }
};

const spmPartyUploadSingle = async (req, res) => {
  try {
    const normalize = v =>
      v === undefined || v === null || (typeof v === 'string' && v.trim() === '')
        ? null
        : v;

    const { LocationId, userId } = req.body;
    let { PartyCode = null, PartyName = null } = req.body;

    // normalize both
    PartyCode = normalize(PartyCode);
    PartyName = normalize(PartyName);

    if (!LocationId || !userId || !(PartyCode !== null || PartyName !== null)) {
      return res.status(400).json(
        new ApiError(
          400,
          "LocationId, userId and PartyCode or PartyName are required",
          [],
          ""
        )
      );
    }

    const formattedData = [
      {
        LocationId,
        PartyCode,
        PartyName,
        CreatedBy: userId
      }
    ];

    const duplicates = await partyAlreadyExistsCheck(formattedData)
    if (duplicates.length != 0) {
      return res.status(400).json(new ApiError(400, `Some Records Already Exists`, duplicates))
    }

    await insertSpmParty(formattedData);

    res
      .status(200)
      .json(new ApiResponse(200, [formattedData[0]], "Single Insertion Successful"));
  } catch (error) {
    return res.status(error.statusCode || 500).json(new ApiError(500, error, []));
  }
};

const spmAdvisorUploadSingle = async (req, res) => {
  try {
    const { LocationId, userId, Advisor, PhoneNo, Email } = req.body;

    if (!LocationId || !userId || !Advisor) {
      return res
        .status(400)
        .json(
          new ApiError(
            400,
            "LocationId, userId and Advisor are required",
            [],
            ""
          )
        );
    }

    if (PhoneNo && !/^\d{1,10}$/.test(PhoneNo.toString())) {
      return res
        .status(400)
        .json(new ApiError(400, "Invalid Phone Number", [], ""));
    }
    // const isExists = await isPhoneEmailExists(PhoneNo,Email,'AAP_SPMAdvisorMaster')
    // if(isExists > 0){
    //   return res.status(400).json(new ApiError(400,`PhoneNo or Email already associated with another user`))
    // }
    const formattedData = [
      {
        LocationId,
        Advisor,
        PhoneNo: PhoneNo,
        Email: Email,
        userId
      }
    ];
    const existing = await advisorAlreadyExistsCheck(formattedData, 'dbo.AAP_SPMAdvisorMaster')
    if (existing.length) {
      return res.status(400).json(
        new ApiError(400, "Some records already exist", existing, "")
      );
    }
    const advisorExists = await findAdvisorOnLocation(formattedData, 'dbo.AAP_SPMAdvisorMaster')
        if (advisorExists.length) {
      return res.status(400).json(
        new ApiError(400, "Some records already exist", advisorExists, "")
      );
    }
    await insertadvisorParty(formattedData);

    res
      .status(200)
      .json(new ApiResponse(200, [], "Advisor Added Successfully"));
  } catch (error) {
    return res.status(error.statusCode || 500).json(error);
  }
};

const stockView = async (req, res) => {

  const { LocationId, OrderType, PartyName, userId } = req.body
  const file = req.file
  if (!file) {
    return res.status(400).json(new ApiError(400, "" || "File Not Attached"));
  }

  const data = await stockViewService(file.path, LocationId, OrderType, userId)

  res.status(200).json(new ApiResponse(200, data, 'message'))


}
export { stockView, stockuploadCs, stockuploadWs, vehicleUpload, spmPartyUpload, spmAdvisorUpload, singleUploadCs, stockuploadWsSingle, vehicleUploadSingle, spmPartyUploadSingle, spmAdvisorUploadSingle }
