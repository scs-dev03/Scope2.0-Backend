import { readExcel } from "../../utils/vonHelper.js";
import {insertApprovals , insertSpmParty , insertadvisorParty} from "../../services/auto-approval/spm-uploadService.js"
import fs from 'fs'
import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";
import { log } from "console";


const stockuploadCs = async(req,res)=>{
    const file = req.file
      if (!file) {
        return res.status(400).json(new ApiError(400, error?.message || "File Not Attached"));
     }
    let {headers,data} = await readExcel(req.file.path); 
    fs.unlinkSync(req.file.path); // Delete uploaded file after processing
  
        const REQUIRED_HEADERS = ["PartNumber", "Qty", "Remarks"];
        const missingHeaders = REQUIRED_HEADERS.filter(header => !headers.includes(header));
        // console.log(missingHeaders);
            
        if (missingHeaders.length > 0) {
          return res.status(400).json({
            message: "Missing headers or data",
            missingHeaders
          });
        }
    await insertApprovals(data)
    res.status(200).json(`Bulk Insertion Succesful`)
}
const stockuploadWs = async()=>{
}

const vehicleUpload = async(req,res)=>{
    const file = req.file
     if (!file) {
        return res.status(400).json(new ApiError(400, error?.message || "File Not Attached"));
    }
    let {headers,data} = await readExcel(req.file.path); 
    fs.unlinkSync(req.file.path); // Delete uploaded file after processing
    
        const REQUIRED_HEADERS = ["VehicleNumber","VehicleModel","JobCardNumber","JobType","Advisor","OrderType","PartNumber","Qty","Remarks","AdvanceValue","Estimate"];
        const missingHeaders = REQUIRED_HEADERS.filter(header => !headers.includes(header));
        // console.log(missingHeaders);
            
        if (missingHeaders.length > 0) {
          return res.status(400).json({
            message: "Missing headers or data",
            missingHeaders
          });
        }
    await insertApprovals(data)
    res.status(200).json(`Bulk Insertion Succesful`)
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
  res.status(500).json(new ApiError(500,'Bulk Insertion Fails',error.message))
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

    // console.log(formattedData);
    await insertadvisorParty(formattedData);
    res.status(200).json(new ApiResponse(200,[],`Bulk Insertion Successfull`))
    } catch (error) {
  res.status(500).json(new ApiError(500,'Bulk Insertion Fails',error.message))
}
}

export {stockuploadCs,stockuploadWs,vehicleUpload , spmPartyUpload , spmAdvisorUpload}