import express from 'express';
const router=express.Router();
import multer from "multer";
import fs from 'fs';
import {uploadDataSingleLocation,getPartNotInMasterSingleLocation,
    allRecordsSingleLocation,uploadedDataSingleLocation,uploadDataMultiLocation
    ,getMultiLocationUploadedData,getPartNotInMasterMultiLocation,
    allRecordsMultiLocation,getPartNotInMasterInController,bulkUploadDataInController} from '../../controller/stock-upload/stock-upload.controller.js'

const uploadsDir='./mapping-uploads';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Set up multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});
const upload=multer({storage:storage});
const multiUpload=multer({storage:storage}).array('files[]');

//single-location
router.post('/single-location',upload.single('excelFile'),uploadDataSingleLocation)
router.post('/part-not-in-master',getPartNotInMasterSingleLocation)
router.post('/all-uploadedData',uploadedDataSingleLocation)
router.post('/all-records',allRecordsSingleLocation)

//multi location
router.post('/multi-location',multiUpload,uploadDataMultiLocation)
router.post('/multi-uploadedData',getMultiLocationUploadedData)
router.post('/part-not-in-master-ml',getPartNotInMasterMultiLocation)
router.post('/all-records-ml',allRecordsMultiLocation)

//bulk upload

router.post('/part-not-in-master-bulk',getPartNotInMasterInController);
router.post('/bulk-upload',bulkUploadDataInController)
export default router