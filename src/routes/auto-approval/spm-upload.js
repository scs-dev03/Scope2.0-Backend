import { Router } from "express";
import { upload } from "../../middlewares/multer.middleware.js";
import { spmAdvisorUpload, spmPartyUpload, stockuploadCs  , vehicleUpload , stockuploadWs} from "../../controller/auto-approval/spm-upload.js";


const router = Router()

router.route('/stkupload-cs').post(upload.single('file'),stockuploadCs)
router.route('/stkupload-ws').post(upload.single('file'),stockuploadWs)
router.route('/vehicleupload').post(upload.single('file'),vehicleUpload)
router.route('/partyupload').post(upload.single('file'),spmPartyUpload)
router.route('/advisorupload').post(upload.single('file'),spmAdvisorUpload)

export default router