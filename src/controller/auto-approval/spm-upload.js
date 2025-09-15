import { readExcel } from "../../utils/vonHelper.js";
import {insertApprovals , insertSpmParty , insertadvisorParty} from "../../services/auto-approval/spm-InsertionService.js"
import fs from 'fs'
import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";
import { spmBulkCSUpload ,spmMultiCSUpload , spmBulkWSUpload, spmBulkVehicleUpload } from "../../services/auto-approval/spm-uploadService.js";


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

export {stockuploadCs,stockuploadWs,vehicleUpload , spmPartyUpload , spmAdvisorUpload}