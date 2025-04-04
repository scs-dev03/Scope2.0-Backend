import express from 'express';
const router=express.Router();
<<<<<<< HEAD
import {addDealerLocationMapping,exportUploadedDataInController,
  editDealerLocationMapping,viewDealerLocationMapping,deleteDealerLocationMapping} from '../../controller/dealer-location-mapping/dealer-location-mapping.controller.js';
=======
import {addDealerLocationMapping,exportUploadedDataInController,editDealerLocationMapping} from '../../controller/dealer-location-mapping/dealer-location-mapping.controller.js';
>>>>>>> dc6a7f177bbb7aca02f71380070a746f9206b588
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
<<<<<<< HEAD
router.post('/view',viewDealerLocationMapping)
router.post('/delete',deleteDealerLocationMapping)
=======
>>>>>>> dc6a7f177bbb7aca02f71380070a746f9206b588
export default router;