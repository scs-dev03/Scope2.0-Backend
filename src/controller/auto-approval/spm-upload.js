import { readExcel } from "../../utils/vonHelper.js";
import { insertApprovals, insertSpmParty, insertadvisorParty } from "../../services/auto-approval/spm-InsertionService.js"
import fs from 'fs'
import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";
import { spmBulkCSUpload, spmMultiCSUpload, spmBulkWSUpload, spmBulkVehicleUpload, stockViewService, partyAlreadyExistsCheck, getduplicatesArray, advisorAlreadyExistsCheck, findAdvisorOnLocation, mappingVehicleOrder, vehicleViewService, spmMultiVehicleUpload } from "../../services/auto-approval/spm-uploadService.js";
import { partyNameCodeMapping } from '../../services/auto-approval/spm-uploadService.js'
import { validateHeaders, findRowIssues, getDuplicatesByKey, getDuplicateGroups, normalizePartyRows, partyKey, isBlank, validateExcelRows, validatePartyExcelRows, partBrandMappingCheck, mapPartiesOrCollectInvalidFirst, orderTypeCheck, consolidateLines, payloadValidator, splitByInvalid, mapPartyIds, consolidateByVehicle } from '../../utils/validator.js';
import { uploadToS3 } from "../../middlewares/multer.middleware.js";
import { insertPartNumbers } from "../../services/auto-approval/notinmasterService.js";



const stockuploadCs = async (req, res) => {
  const { LocationId, OrderType, PartyId, Bulk, userId, BrandId, DealerId } = req.body;
  const file = req.file;

  // helper to safely send errors
  const sendError = (err) => {
    const status = Number(err?.statusCode ?? err?.status) || 400; // or 500 if you prefer
    // Wrap non-ApiError into your ApiError shape
    if (!(err instanceof ApiError)) {
      return res.status(status).json(new ApiError(status, err?.message || 'Unexpected error', [], ''));
    }
    return res.status(status).json(err);
  };

  try {
    if (!file) {
      return res.status(400).json(new ApiError(400, "File Not Attached", [], ''));
    }

    // IMPORTANT: Bulk can be 0 or 1 -> check nullish, not falsy
    if (!Bulk || !OrderType || !LocationId || !userId) {
      return res
        .status(400)
        .json(new ApiError(400, "Bulk, LocationId, userId and OrderType are required", [], ''));
    }

    const checkOrderType = orderTypeCheck(OrderType)
    if (!checkOrderType) {
      throw new ApiError(400, `${OrderType} is a Invalid OrderType`);
    }

    if (Number(Bulk) === 1) {
      try {
        const data = await spmBulkCSUpload(LocationId, OrderType, file.path, userId);

        const invalidParts = await partBrandMappingCheck(BrandId, data)
        // if (invalidParts.length > 0) {
        //   return res.status(400).json(new ApiError(400, 'PartNumbers Not in Master', invalidParts))
        // }
        const { validData, skipped: notinMaster } = splitByInvalid(data, invalidParts, 'PartNumber');

        //inserting in not in master
        await insertPartNumbers(BrandId, DealerId, userId, notinMaster)

        const partyMappingData = await partyNameCodeMapping(LocationId)

        //If Any of PartyName or PartyCode Matches then it gives TRUE
        const invalidParty = mapPartiesOrCollectInvalidFirst(validData, partyMappingData)
        if (invalidParty.ok === false) {
          return res.status(400).json(new ApiError(400, 'Excel Contains Invalid Parties', invalidParty))
        }

        const { grouped, errors } = consolidateLines(invalidParty.mapped, { groupByParty: true });
        if (errors.length) {
          return res.status(400).json(new ApiError(400, "Data validation failed", errors, ""));
        }
        // console.log(grouped);
        
        const result = await stockViewService(grouped, BrandId, DealerId)

        return res.status(200).json(new ApiResponse(200, { result, notinMaster: notinMaster || [] }, "Data Fetched Successfully "));
      } catch (error) {
        return sendError(error);
      }
    } else {
      if (!PartyId) {
        return res.status(400).json(new ApiError(400, "PartyId is required", [], ''));
      }
      try {
        const data = await spmMultiCSUpload(LocationId, OrderType, PartyId, file.path, userId);

        const invalidParts = await partBrandMappingCheck(BrandId, data)
        // if (invalidParts.length > 0) {
        //   return res.status(400).json(new ApiError(400, 'PartNumbers Not in Master', invalidParts))
        // }

        // const cleanedData = consolidateLines(data, { groupByParty: false })
        // const result = await stockViewService(cleanedData, BrandId)

        // return res.status(200).json(new ApiResponse(200, result, "File Uploaded SuccessFully"));
        const { validData, skipped: notinMaster } = splitByInvalid(data, invalidParts, 'PartNumber');

        //inserting in not in master
        await insertPartNumbers(BrandId, DealerId, userId, notinMaster)

        const { grouped, errors } = consolidateLines(validData, { groupByParty: false });
        if (errors.length) {
          return res.status(400).json(new ApiError(400, "Data validation failed", errors, ""));
        }
        // console.log(grouped);
        
        const result = await stockViewService(grouped, BrandId, DealerId)

        return res.status(200).json(new ApiResponse(200, { result, notinMaster: notinMaster || [] }, 'Data Fetched Successfully'));
      } catch (error) {
        return sendError(error);
      }
    }
  } catch (error) {
    return sendError(error);
  }
}

const stockuploadWs = async (req, res) => {
  try {
    const { LocationId, OrderType, userId, BrandId, DealerId } = req.body
    const file = req.file
    if (!file) {
      return res.status(400).json(new ApiError(400, "File Not Attached"));
    }
    if (!OrderType || !LocationId || !userId || !BrandId) {
      return res.status(400).json(new ApiError(400, `LocationId , userId and  OrderType is required`, [], ''))
    }

    const checkOrderType = orderTypeCheck(OrderType)
    if (!checkOrderType) {
      throw new ApiError(400, `${OrderType} is a Invalid OrderType`);
    }
    const data = await spmBulkWSUpload(LocationId, OrderType, file.path, userId)

    const invalidParts = await partBrandMappingCheck(BrandId, data)

    // res.status(200).json(new ApiResponse(200, result, "File Uploaded SuccessFully"))
    const { validData, skipped: notinMaster } = splitByInvalid(data, invalidParts, 'PartNumber');

    //inserting in not in master
    await insertPartNumbers(BrandId, DealerId, userId, notinMaster)
    // const clubbedData = consolidateLines(validData, { groupByParty: false })
    // const result = await stockViewService(clubbedData, BrandId)

    const { grouped, errors } = consolidateLines(validData, { groupByParty: false });
    if (errors.length) {
      return res.status(400).json(new ApiError(400, "Data validation failed", errors, ""));
    }

    const result = await stockViewService(grouped, BrandId, DealerId)

    return res.status(200).json(new ApiResponse(200, { result, notinMaster: notinMaster || [] }, 'Data Fetched Successfully'));
  } catch (error) {
    return res.status(500).json(new ApiError(error.statusCode || 500, error.message, error.errors || []));
  }
}

const vehicleUpload = async (req, res) => {
  const sendError = (err) => {
    const status = Number(err?.statusCode ?? err?.status) || 400; // or 500 if you prefer
    // Wrap non-ApiError into your ApiError shape
    if (!(err instanceof ApiError)) {
      return res.status(status).json(new ApiError(status, err?.message || 'Unexpected error', [], ''));
    }
    return res.status(status).json(err);
  };
  try {
    const file = req.file
    if (!file) {
      return res.status(400).json(new ApiError(400, "File Not Attached"));
    }
    const { LocationId, userId, BrandId, DealerId } = req.body
    if (!LocationId || !userId) {
      return res.status(400).json(new ApiError(400, `LocationId BrandId , DealerId and userId  is required`, [], ''))
    }
    const data = await spmBulkVehicleUpload(file.path, LocationId, userId)

    const invalidParts = await partBrandMappingCheck(BrandId, data)
    const { validData, skipped: notinMaster } = splitByInvalid(data, invalidParts, 'PartNumber');

    //inserting in not in master
    await insertPartNumbers(BrandId, DealerId, userId, notinMaster)

    const { grouped, errors } = consolidateByVehicle(validData);
    if (errors.length) {
      return res.status(400).json(new ApiError(400, "Data validation failed", errors, ""));
    }

    // Can be used Further
    // const mappedData = await mappingVehicleOrder(grouped)

    const result = await vehicleViewService(grouped, BrandId, DealerId)
    // console.log(result);
    
    
    res.status(200).json(new ApiResponse(200, { result, notinMaster: notinMaster || [] }, `Data Fetched Successfully`))

  } catch (error) {

    return sendError(error);

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
        new ApiError(400, "Missing headers", missingHeaders, "")
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
    // console.log(existing);

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
    const v = payloadValidator(req.body, { requirePartyId: true });
    if (!v.ok) {
      return res.status(400).json(new ApiError(400, "Data validation failed", v.errors, ""));
    }
    const { payload, BrandId, DealerId } = req.body
    const raw = typeof payload === 'string' ? JSON.parse(payload) : payload;

    // Accept array or single object
    const first = Array.isArray(raw) ? raw[0] : raw;

    const Addedby = first?.userId

    const formattedData = payload.map((row) => ({
      ...row,
      Type: "S",
    }))

    const invalidParts = await partBrandMappingCheck(BrandId, formattedData)

    const { validData, skipped: notinMaster } = splitByInvalid(formattedData, invalidParts, 'PartNumber');

    //inserting in not in master
    await insertPartNumbers(BrandId, DealerId, Addedby, notinMaster)

    const clubbedData = consolidateLines(validData, { groupByParty: false })

    const result = await stockViewService(clubbedData.grouped, BrandId, DealerId)

    return res.status(200).json(new ApiResponse(200, { result, notinMaster: notinMaster || [] }, 'Data Fetched Successfully'));

    // return res.status(200).json(new ApiResponse(200, result, `Parts Submmitted`));
  } catch (error) {
    const status = (error && error.statusCode) || 500;
    return res.status(status).json(new ApiError(status, `Unable to record stock request`, error.message));
  }
};

const singleUploadWS = async (req, res) => {
  try {
    const v = payloadValidator(req.body, { requirePartyId: false }); // toggle true if needed
    if (!v.ok) {
      return res.status(400).json(new ApiError(400, "Data validation failed", v.errors, ""));
    }
    const { payload, BrandId, DealerId } = req.body
    const raw = typeof payload === 'string' ? JSON.parse(payload) : payload;

    // Accept array or single object
    const first = Array.isArray(raw) ? raw[0] : raw;

    const Addedby = first?.userId

    const formattedData = payload.map((row) => ({
      ...row,
      Type: "S",
    }))

    // const invalidParts = await partBrandMappingCheck(BrandId, formattedData)
    // if (invalidParts.length > 0) {
    //   return res.status(400).json(new ApiError(400, `PartNumber Not In Master`, invalidParts))
    // }

    // const clubbedData = consolidateLines(formattedData, { groupByParty: false })
    // const result = await stockViewService(clubbedData, BrandId)

    // return res.status(200).json(new ApiResponse(200, result, `Part Submmitted`));
    const invalidParts = await partBrandMappingCheck(BrandId, formattedData)

    const { validData, skipped: notinMaster } = splitByInvalid(formattedData, invalidParts, 'PartNumber');

    //inserting in not in master
    await insertPartNumbers(BrandId, DealerId, Addedby, notinMaster)

    const clubbedData = consolidateLines(validData, { groupByParty: false })
    const result = await stockViewService(clubbedData.grouped, BrandId, DealerId)

    return res.status(200).json(new ApiResponse(200, { result, notinMaster: notinMaster || [] }, 'Data Fetched Successfully'));
  } catch (error) {
    const status = (error && error.statusCode) || 500;
    return res.status(status).json(new ApiError(status, `Unable to record stock request`, error.message));
  }
};

const vehicleUploadSingle = async (req, res) => {
  try {
    const excelFile = req.files?.file?.[0] || null;
    const imageFile = req.files?.image?.[0] || null;

    const { LocationId, userId, VehicleNumber, VehicleModel, JobCardNumber, JobType, OrderType, Estimate, AdvanceValue, BrandId, DealerId, Advisor } = req.body
    // console.log(LocationId , userId , VehicleNumber , VehicleModel , JobCardNumber , JobType , OrderType , Estimate , AdvanceValue , BrandId , DealerId);

    if (!excelFile || !LocationId || !BrandId || !DealerId || !userId || !VehicleModel || !VehicleNumber || !JobType || !OrderType) {
      return res.status(400).json(new ApiError(400, `Excel , LocationId , userId , VehicleNumber , VehicleModel , JobCardNumber , JobType , OrderType , BrandId , DealerId are Required`))
    }
    // if ((AdvanceValue == null || AdvanceValue === "") && (Estimate == null || Estimate === "")) {
    //   return res.status(400).json(
    //     new ApiError(400, "At least one of AdvanceValue or Estimate is required", [], "")
    //   );
    // }

    let url = null;

    if (imageFile) {
      try {
        const s3Data = await uploadToS3(imageFile);
        url = s3Data?.url ?? null;      // if upload succeeds, use URL; else null
      } catch (error) {
        // Only fail if image was actually provided and upload failed
        throw new ApiError(500, error.message);
      }
    }
    const data = await spmMultiVehicleUpload(excelFile.path, { LocationId, userId, VehicleNumber, VehicleModel, JobCardNumber, JobType, OrderType, Estimate, AdvanceValue, url, Advisor })

    const invalidParts = await partBrandMappingCheck(BrandId, data)
    const { validData, skipped: notinMaster } = splitByInvalid(data, invalidParts, 'PartNumber');

    //inserting in not in master
    await insertPartNumbers(BrandId, DealerId, userId, notinMaster)
    
    const { grouped, errors } = consolidateByVehicle(validData);
    if (errors.length) {
      return res.status(400).json(new ApiError(400, "Data validation failed", errors, ""));
    }

    const result = await vehicleViewService(grouped, BrandId, DealerId)

    res.status(200).json(new ApiResponse(200, { result, notinMaster: notinMaster || [] }, `Data Fetched Successfully`))
  } catch (error) {
    return res.status(error.statusCode || 500).json(error);
  }
};

const addVehicle = async (req, res) => {
  try {
    const { BrandId, DealerId, payload } = req.body
    if(!BrandId || !DealerId || !payload){
      res.status(400).json(new ApiError(400,`BrandId , DealerId and payload are required`))
    }
    const raw = typeof payload === 'string' ? JSON.parse(payload) : payload;

    // Accept array or single object
    const first = Array.isArray(raw) ? raw[0] : raw;

    const Addedby = first?.userId

    const file = req.file;
    // console.log(file);
    

    let url;
    // try {
    //   const s3Data = await uploadToS3(file)
    //   url = s3Data?.url ?? null;

    // } catch (error) {
    //   throw new ApiError(500, error.message);
    // }
    // let url = null;
    if (file) {
      try {
        const s3Data = await uploadToS3(file); 
        url = s3Data?.url ?? null;
      } catch (error) {
        throw new ApiError(500, error.message);
      }
    }
    let rows;
    try {
      const parsed = typeof payload === 'string' ? JSON.parse(payload) : payload;
      rows = Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) {
      return res.status(400).json({ message: 'Invalid JSON in payload' });
    }

    const clean = v => (typeof v === 'string' ? v.replace(/^'+/, '').trim() : v);
    const num = v => (v === '' || v == null ? null : Number(v));


    // console.log("rows", rows);

    const formattedData = rows.map(r => ({
      LocationId: num(r.LocationId),
      VehicleNumber: clean(r.VehicleNumber),
      VehicleModel: clean(r.VehicleModel),
      JobCardNumber: clean(r.JobCardNumber),
      JobType: clean(r.JobType),
      Advisor: clean(r.Advisor),
      OrderType: clean(r.OrderType),
      PartNumber: clean(r.PartNumber),
      Qty: num(r.Qty),
      Remarks: clean(r.Remarks),
      Estimate: num(r.Estimate),
      AdvanceValue: num(r.AdvanceValue),
      url,
      Type: 'V'
    }));

    // console.log(`formattedData`,formattedData);

    const invalidParts = await partBrandMappingCheck(BrandId, formattedData)

    const { validData, skipped: notinMaster } = splitByInvalid(formattedData, invalidParts, 'PartNumber');

    //inserting in not in master
    await insertPartNumbers(BrandId, DealerId, Addedby, notinMaster)

    const { grouped, errors } = consolidateByVehicle(validData);
    if (errors.length) {
      return res.status(400).json(new ApiError(400, "Data validation failed", errors, ""));
    }

    const result = await vehicleViewService(grouped, BrandId, DealerId)
    // console.log(result);
    
    res.status(200).json(new ApiResponse(200, { result, notinMaster: notinMaster || [] }, `Data Fetched Successfully`))
  } catch (error) {
    res.status(500).json(error.message)
  }
}

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
    // console.log(existing);

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

  try {
    const { LocationId, OrderType, PartyName, userId } = req.body
    const file = req.file
    if (!file) {
      return res.status(400).json(new ApiError(400, "" || "File Not Attached"));
    }

    const data = await stockViewService(file.path, LocationId, OrderType, userId)

    res.status(200).json(new ApiResponse(200, data, 'Data Fetched Successfully'))
  } catch (error) {
    res.status(500).json(new ApiError(error.statusCode || 500, error.message))
  }
}

const orderInsertion = async (req, res) => {
  try {
    const { userId, type, payload } = req.body

    // console.log(`mapped`,mapped);

    let formattedData = {};

    if (type === "S") {
      const LocationId = payload[0].LocationId
      const partyMappingData = await partyNameCodeMapping(LocationId)
      const { mapped, unmatched, conflicts } = mapPartyIds(payload, partyMappingData);
      formattedData = mapped.map((row) => ({
        ...row,
        UploadedBy: userId,
        Type: type
      }))
    }
    else {
      // const LocationId = payload[0].LocationId
      const mappedData = await mappingVehicleOrder(payload)
      mappedData.mapped
      formattedData = mappedData.mapped.map((row) => ({
        ...row,
        UploadedBy: userId,
        Type: type
      }))
    }

    const result = await insertApprovals(formattedData)
    res.status(200).json(new ApiResponse(200, formattedData, 'Insertion Successfull'))
  } catch (error) {
    res.status(500).json(new ApiError(500, `Unable to Insert Approvals`, [error.message], error.message))
  }
}

export { addVehicle, orderInsertion, stockView, stockuploadCs, stockuploadWs, vehicleUpload, spmPartyUpload, spmAdvisorUpload, singleUploadCs, singleUploadWS, vehicleUploadSingle, spmPartyUploadSingle, spmAdvisorUploadSingle }