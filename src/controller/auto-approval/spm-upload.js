import { readExcel } from "../../utils/vonHelper.js";
import {insertApprovals , insertSpmParty , insertadvisorParty} from "../../services/auto-approval/spm-InsertionService.js"
import fs from 'fs'
import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";
import { spmBulkCSUpload ,spmMultiCSUpload , spmBulkWSUpload, spmBulkVehicleUpload } from "../../services/auto-approval/spm-uploadService.js";
import {partyNameCodeMapping} from '../../services/auto-approval/spm-uploadService.js'


const stockuploadCs = async(req,res)=>{
    try {
      const {LocationId,OrderType , PartyName , PartyCode , Bulk ,userId  } = req.body
      const file = req.file
        if (!file) {
          return res.status(400).json(new ApiError(400, "" || "File Not Attached"));
        }
      if(!Bulk || !OrderType || !LocationId || !userId){
        return res.status(400).json(new ApiError(400,`Bulk , LocationId , userId and  OrderType is required`,[],''))
      }
      if(Bulk == 1){
      try {
          const data = await spmBulkCSUpload(LocationId,OrderType , file.path , userId)
          await insertApprovals(data)
          res.status(200).json(`Bulk Insertion Successful`)
        } catch (error) {
          return res.status(error.statusCode).json(error);   
        }
      }
    else{
      try {
        const data = await spmMultiCSUpload(LocationId,OrderType ,PartyName, file.path , userId)
        await insertApprovals(data)
        res.status(200).json(`Multi Insertion Succesfull`)
      } catch (error) {
        return res.status(error.statusCode).json(error);
      }
    }
    } catch (error) {
       return res.status(error.statusCode).json(error); 
    }
}

const stockuploadWs = async(req,res)=>{
try {
    const {LocationId,OrderType,userId} = req.body
    const file = req.file
        if (!file) {
          return res.status(400).json(new ApiError(400, error?.message || "File Not Attached"));
       }
       if(!OrderType || !LocationId || !userId){
        return res.status(400).json(new ApiError(400,`LocationId , userId and  OrderType is required`,[],''))
      }
      const data = await spmBulkWSUpload(LocationId,OrderType , file.path ,userId)
      await insertApprovals(data)
      res.status(200).json(`Bulk Insertion Successful`)
} catch (error) {
  return res.status(error.statusCode).json(error);
}
}

const vehicleUpload = async(req,res)=>{
try {
      const file = req.file
       if (!file) {
          return res.status(400).json(new ApiError(400, error?.message || "File Not Attached"));
      }
      const {LocationId , userId} = req.body
      if(!LocationId || !userId){
      return res.status(400).json(new ApiError(400,`LocationId and userId  is required`,[],''))
    }
      const data = await spmBulkVehicleUpload(file.path,LocationId,userId)
      await insertApprovals(data)
      res.status(200).json(`Bulk Insertion Successful`)
} catch (error) {
  return res.status(error.statusCode).json(error);
}
}

const spmPartyUpload = async(req,res)=>{
try {
    const file = req.file
    const {LocationId , userId} = req.body
    if(!file){
      return res.status(400).json(new ApiError(400, error?.message || "File Not Attached"));
    }
    if(!LocationId || !userId ){
      return res.status(400).json(new ApiError(400, error?.message || "LocationId and userId Not Found"));
    }
    const {headers, data} = await readExcel(file.path)
    fs.unlinkSync(file.path)

    const REQUIRED_HEADERS = ["PartyCode" , "PartyName"];
    const missingHeaders = REQUIRED_HEADERS.filter(header=> !headers.includes(header))
    if (missingHeaders.length > 0) {
            return res.status(400).json({
              message: "Missing headers or data",
              missingHeaders
            });
          }

    const formattedData =  data.map(row => ({
      ...row,
      LocationId,
      userId
      }));
    await insertSpmParty(formattedData);
    res.status(200).json(new ApiResponse(200,[],`Bulk Insertion Successfull`))
    } catch (error) {
  return res.status(error.statusCode).json(error);
}
}

const spmAdvisorUpload = async(req,res)=>{
try {
    const file = req.file
    const {LocationId, userId} = req.body
    if(!LocationId || !userId ){
      return res.status(400).json(new ApiError(400, error?.message || "LocationId and userId Not Found"));
    }
    if(!file){
      return res.status(400).json(new ApiError(400, error?.message || "File Not Attached"));
    }
    const {headers, data} = await readExcel(file.path)
    const REQUIRED_HEADERS = ["Advisor" , "PhoneNo" , "Email"];
    const missingHeaders = REQUIRED_HEADERS.filter(header=> !headers.includes(header))
    if (missingHeaders.length > 0) {
          return res.status(400).json({
            message: "Missing headers or data",
            missingHeaders
            });
          }

    const formattedData =  data.map(row => ({
      ...row,
      LocationId,
      userId
      })); 

    await insertadvisorParty(formattedData);
    res.status(200).json(new ApiResponse(200,[],`Bulk Insertion Successfull`))
    } catch (error) {
  return res.status(error.statusCode).json(error);
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
    if(!(OrderType == 'Normal' || OrderType == 'Urgent' || OrderType == 'Co-Dealer' ||OrderType == 'Transfer')){
      return res.status(400).json(new ApiError(400, 'please enter a valid order type',['Normal','Co-Dealer','Urgent','Transfer']));
    }
    const partyMappingData = await partyNameCodeMapping(LocationId);
    if (!Array.isArray(partyMappingData) || partyMappingData.length === 0) {
      return res.status(400).json(new ApiError(400,`No Parties configured for Location ${LocationId}`));
    }

    const norm = s => String(s ?? "").trim().toLowerCase();
    const idByName = new Map(partyMappingData.map(({ PartyName, Id }) => [norm(PartyName), Id]));
    const PartyId = idByName.get(norm(PartyName));
    //console.log("Party mapping data:", partyMappingData);
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

    // console.log("Row being inserted:", row);
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
    if(!(OrderType == 'Normal' || OrderType == 'Urgent' || OrderType == 'Co-Dealer' ||OrderType == 'Transfer')){
      return res.status(400).json(new ApiError(400, 'please enter a valid(Normal/Urgent/Co-Dealer/Transfer) order type',['Normal','Co-Dealer','Urgent','Transfer']));
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

    const REQUIRED_ALWAYS = ["VehicleNumber","VehicleModel","JobType","Advisor","OrderType","PartNumber","Qty"];
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
    const ALLOWED = ["Normal","Urgent","Co-Dealer","Transfer"];
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
    const { LocationId, userId, PartyCode, PartyName } = req.body;

    if (!LocationId || !userId || !PartyCode || !PartyName) {
      return res.status(400).json(
        new ApiError(
          400,
          "LocationId, userId, PartyCode and PartyName are required",
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

    await insertSpmParty(formattedData);

    res
      .status(200)
      .json(new ApiResponse(200, [], "Single Insertion Successful"));
  } catch (error) {
    return res.status(error.statusCode || 500).json(error);
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

    const formattedData = [
      {
        LocationId,
        Advisor,
        PhoneNo: PhoneNo,
        Email: Email,
        userId
      }
    ];

    await insertadvisorParty(formattedData);

    res
      .status(200)
      .json(new ApiResponse(200, [], "Single Advisor Insertion Successful"));
  } catch (error) {
    return res.status(error.statusCode || 500).json(error);
  }
};


export {stockuploadCs,stockuploadWs,vehicleUpload,spmPartyUpload,spmAdvisorUpload,singleUploadCs,stockuploadWsSingle,vehicleUploadSingle,spmPartyUploadSingle,spmAdvisorUploadSingle}
