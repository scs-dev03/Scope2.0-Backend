import express from 'express';
const router=express.Router();
import { bulkTOCInController, singleTOCInController,getRecordsInController} from '../../controller/TOC-Upload/toc-upload.controller.js';

import multer from "multer";
import fs from 'fs';
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
router.post('/upload',multiUpload,singleTOCInController);
router.post('/bulk',upload.single('excelFile'),bulkTOCInController);
router.post('/records',getRecordsInController);
export default router;