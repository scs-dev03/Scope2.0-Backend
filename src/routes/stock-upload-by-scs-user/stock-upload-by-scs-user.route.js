import express from 'express';
const router=express.Router();
import multer from "multer";
import fs from 'fs';
import {allRecordsSingleUpload, getPartNotInMasterSingleUpload, singleUploadedData, 
  singleUploadStock,bulkStockUpload,getBulkRecords,getBulkData} from '../../controller/stock-upload-by-scs-user/stock-upload-by-scs-user.controller.js'

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

//single-upload
router.post('/single-upload',upload.single('excelFile'),singleUploadStock)
router.post('/part-not-in-master',getPartNotInMasterSingleUpload)
router.post('/all-uploadedData',singleUploadedData)
router.post('/all-records',allRecordsSingleUpload)

router.post('/bulk-upload',upload.single('excelFile'),bulkStockUpload)
router.post('/all-records-bulk',getBulkRecords)
router.post('/all-uploaded-data',getBulkData)
export default router;
