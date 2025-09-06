import { Router } from "express";
import { upload } from "../../middlewares/multer.middleware.js";
import { spmAdvisorUpload, spmPartyUpload, stockuploadCs  , vehicleUpload} from "../../controller/auto-approval/spm-upload.js";


const router = Router()

router.route('/stkupload-cs').post(upload.single('file'),stockuploadCs)
router.route('/vehicleupload').post(upload.single('file'),vehicleUpload)
router.route('/partyupload').post(upload.single('file'),spmPartyUpload)
router.route('/advisorupload').post(upload.single('file'),spmAdvisorUpload)
// router.route('/stkupload-ws').post(upload.single('file'),stockuploadWs)

export default router