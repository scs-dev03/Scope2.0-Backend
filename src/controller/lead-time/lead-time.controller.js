import { stat } from "fs";
import {addColumns,mappingExist,updateColumns,fetchColumns
  ,generateExcelFile,getUploadedDataDetails,getExportFileTypeData,createExcelFile,
  createLogsFile,uploadData,deleteUploadedData,readExcelFile,
  getUploadLogs,getFileTypeBasedOnBrand,downloadFormat,downloadBrandFormat,getLocationMaster} from '../../services/lead-time/lead-time.service.js';
import readExcelFileMappingService from '../../services/mapping/mapping.service.js';
// const locationService=require('../../services/utilites/location.service')
import fs from 'fs';
 const addColumnsInController= async function (req, res) {
    try {
     
      const result = await addColumns(req.body);
      res.status(200).send({ data: result ,status:200});
    } catch (error) {
      res.status(201).send({ error: "Not Inserted" });
    }
  }

 const mappingExistInController=async function(req,res){
    try{
      const res=await mappingExist(req.body)
      res.send({data:res,status:200});

    }
    catch(error){
      res.status(201).json({error:error.message})
    }
   
  }
 const editColumns= async function (req, res) {
    try {
      const result = await updateColumns(req.body);
      res.status(200).send({ data: result });
    } catch (error) {
      res.status(201).send({ error: "Not Inserted" });
    }
  }
  const getRecords= async function (req, res) {
    try {
      // console.log("req ",req.body)
      const result = await fetchColumns(req.body);
      res.status(200).send({ data: result });
    } catch (error) {
      res.status(201).send({ error: "Not Inserted" });
    }
  }

  const exportData=async function (req, res) {
    const data = req.body; // Data sent from the frontend

    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ message: "Invalid or empty data" });
    }

    try {
      // Generate the Excel file (buffer)
      const excelFile = await generateExcelFile(data);

      // Set the response headers to indicate a downloadable file
      res.setHeader("Content-Disposition", "attachment; filename=export.xlsx");
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      // Send the Excel file as a response
      res.send(excelFile);
    } catch (error) {
      console.error("Error generating Excel file:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  const getUploadedData= async function (req, res) {
    try {
     
            const result = await getUploadedDataDetails(req.body);
                  res.status(200).send({ data: result ,status:200});
    } catch (error) {
      res.status(201).send({ error: "Not fetched" });
    }
  }

 const exportMultiSheetData= async function (req, res) {
    try {
      // console.log("req.body ",req.body)
      const fileTypes = req.body.fileType;
      const data=await getExportFileTypeData(req.body,res);

     //console.log("data",data)
      const fileBuffer = await createExcelFile(
       data,fileTypes
      );

      // const fileBuffer1=await leadTimeService.createLogsFile(data,res);
      
 
      // Send file as response
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=multi_sheets.xlsx"
      );
      // res.setHeader("Content-Type", "application/json");
     res.send(
     fileBuffer)
   
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error generating Excel file", error: error.message });
    }
  }

 const exportLogMultisheetData=async function (req,res) {
    try{
    const data=await getExportFileTypeData(req.body,res);


    const fileBuffer1=await createLogsFile(data,res);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=multi_sheets.xlsx"
    );
    res.send(fileBuffer1)}catch (error) {
      res
        .status(200)
        .json({ message: "Error generating Excel file", error: error.message });
    }
  }

 const uploadDataInController= async function (req, res) {
  let data;
    try{
      // Example of setting correct headers
res.setHeader('Content-Type', 'application/json');

        //  console.log("req.file.path",req)
         data=await readExcelFileMappingService(req.body.filePath)
        //  console.log("data ",data.headers);
          
            try {
               
                  const result = await uploadData(req.body, data,res);
                 // console.log("res ",result)
                  res.status(200).send({ data: result});

                
            } catch (error) {
                res.status(500).send({ error: "Error uploading data: " + error.message });
            }


    }
    catch(error){
        console.log("error ",error.message)
    }
   
  }

 const deleteUploadedDataController=async function(req,res){
    try{
      await deleteUploadedData(req.body);
      res.status(200).send({message:'Delete successfully'})
    }
    catch(error){
      res.status(201).send({message:error.message})
    }
  }

  const readSubHeader=async function (req,res) {

    try{
      // console.log("filePtah",req)
      const result=await readExcelFile(req.body.filePath);
      return res.send({status:200,data:result})
    }
    catch(error){
      res.status(201).send({message:error.message})
    }
  }

 const downloadFormatInController = async function(req,res) {
    try {

     // console.log(req.body);
     let brandId=req.body.brand_id;
      const data=await getLocationMaster(brandId);
     //  console.log("data ",data)
       const result = await downloadFormat({body:req.body,locationMaster:data});
      
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=multi_sheets.xlsx"
      );
      res.send(result);
      // res.status(200).send({ data: result });
    } catch (error) {
      res.status(201).send({ error: error });
    }
  }

  const getFileTypes=async function(req,res){
    try {
      // console.log(req.body);
      const result = await getFileTypeBasedOnBrand(req.body);
      res.status(200).send({ data: result });
    } catch (error) {
      res.status(201).send({ error: error.message});
    }
  }
 const getUploadLogsInController=async function(req,res){
      try{
        const result=await getUploadLogs(req.body)
          res.status(200).send({data:result.recordset})
      }
      catch(error){
        res.status(201).send({error:"Uploaded Logs are not fetched"})
      }
  }

 const downloadBrandFormatInController=async function (req,res) {
    try{

     // console.log("brand ",req.body)
      const result=await downloadBrandFormat(req.body,res);
  //     res.setHeader('Content-Type', 'application/zip');
  // res.setHeader('Content-Disposition', 'attachment; filename=files.zip');
  
  // Create a zip archive

// Send the Excel file as a response
res.send(result);
    }
    catch(error){
      res.status(201).send({error:"download format are not fetched"})
    }
    
  }

export {addColumnsInController,mappingExistInController,editColumns,downloadBrandFormatInController
  ,getUploadLogsInController,getFileTypes ,downloadFormatInController,readSubHeader,
  deleteUploadedDataController,uploadDataInController,exportLogMultisheetData ,getRecords,
  exportData,exportMultiSheetData,getUploadedData
}



