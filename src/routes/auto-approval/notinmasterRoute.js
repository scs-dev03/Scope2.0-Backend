import Router from 'express'
import { addNotinMaster, adminAction, uploadNotinMaster, viewNotInMaster } from '../../controller/auto-approval/notinmasterController.js'
import { upload,uploadImg } from '../../middlewares/multer.middleware.js'

const router = Router()

router.post("/view",viewNotInMaster)
router.route("/add").post(uploadImg.single('image'),addNotinMaster)
router.route("/upload").post(upload.single('file'),uploadNotinMaster)
router.route("/action").post(adminAction)



export default router