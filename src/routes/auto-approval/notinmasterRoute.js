import Router from 'express'
import { addNotinMaster, uploadNotinMaster, viewNotInMaster } from '../../controller/auto-approval/notinmasterController.js'
import { upload,uploadImg } from '../../middlewares/multer.middleware.js'

const router = Router()

router.post("/view",viewNotInMaster)
router.route("/add").post(uploadImg.single('image'),addNotinMaster)
router.route("/upload").post(upload.single('file'),uploadNotinMaster)


export default router