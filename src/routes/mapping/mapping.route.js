import express from 'express';
const router=express.Router();
import multer from 'multer';
import fs from 'fs'
import { uploadFileInController } from '../../controller/mapping/mapping.controller.js';
// import {multer} from 'multer';
const uploadsDir = './mapping-uploads';
if(!fs.existsSync(uploadsDir)) {
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
const upload = multer({ storage: storage });
router.post('/upload',upload.single('excelFile'),uploadFileInController);
export default router;