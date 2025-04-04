import express from 'express';
const router=express.Router();
import {addDealerLocationMapping,exportUploadedDataInController,editDealerLocationMapping} from '../../controller/dealer-location-mapping/dealer-location-mapping.controller.js';
import fs from 'fs'
import multer from 'multer';
// import {multer} from 'multer';
const uploadsDir = './mapping-uploads';
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
const upload = multer({ storage: storage });
router.post('/create',upload.single('excelFile'),addDealerLocationMapping)
router.post('/export',exportUploadedDataInController)
router.post('/edit',upload.single('excelFile'),editDealerLocationMapping)
export default router;