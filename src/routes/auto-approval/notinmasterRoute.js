import Router from 'express'
import { addNotinMaster, viewNotInMaster } from '../../controller/auto-approval/notinmasterController.js'
import { uploadImg } from '../../middlewares/multer.middleware.js'

const router = Router()

router.post("/view",viewNotInMaster)
router.route("/add").post(uploadImg.single('image'),addNotinMaster)


export default router