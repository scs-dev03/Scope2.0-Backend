import express from 'express';
const router=express.Router();
import {createRoleInController,editRoleInController,viewRoleInController,deleteRoleInController,
  downloadRoleFormatInController,uploadRoleFormatInController,getAccessSettingBasedOnRoleInController,
  getEditAccessSettingBasedOnRole
} from '../../controller/role-based-access-management/role-based.controller.js';
const uploadsDir = './role-access-settings-upload';
import multer from 'multer';
import fs from 'fs';
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
// console.log("storage ",storage)
const upload = multer({ storage: storage });
router.post('/create',createRoleInController)
router.get('/view',viewRoleInController)
router.post('/edit',editRoleInController)
router.post('/delete',deleteRoleInController)
router.post('/download-role-format',downloadRoleFormatInController)
router.post('/upload-role',upload.single('excelFile'),uploadRoleFormatInController)
router.post('/access-setting-on-BVID',getAccessSettingBasedOnRoleInController)
router.post('/edit-access-setting-on-BVID',getEditAccessSettingBasedOnRole)
export default router;