import express from 'express';
const router=express.Router();
import {getBrandsInController,uploadFileInController,getDealers
  ,getLocations,getLocationsBasedOnBrandInController,
   getDesignationsInController, getRolesInController, getBusinessVerticalInController,getUploadTypesInController} from '../../controller/utilities/utilities.controller.js';
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

router.route('/brands').get(getBrandsInController)
router.post('/upload',upload.single('excelFile'),uploadFileInController)
router.post('/dealers',getDealers)
router.post('/locations',getLocations)
// router.post('/locations',locationController.getLocations)
router.post('/selected-locations',getLocationsBasedOnBrandInController)
router.get('/designations',getDesignationsInController)
router.get('/roles',getRolesInController)
router.get('/business-vertical',getBusinessVerticalInController)
router.get('/uploadTypes',getUploadTypesInController)
export default router;