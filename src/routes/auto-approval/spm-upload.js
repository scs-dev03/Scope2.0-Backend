import { Router } from "express";
import { upload } from "../../middlewares/multer.middleware.js";
import { spmAdvisorUpload, spmPartyUpload, stockuploadCs  , vehicleUpload , stockuploadWs, singleUploadCs,stockuploadWsSingle,vehicleUploadSingle,spmPartyUploadSingle,spmAdvisorUploadSingle} from "../../controller/auto-approval/spm-upload.js";


const router = Router()

router.route('/stkupload-cs').post(upload.single('file'),stockuploadCs)
router.route('/stkupload-ws').post(upload.single('file'),stockuploadWs)
router.route('/vehicleupload').post(upload.single('file'),vehicleUpload)
router.route('/partyupload').post(upload.single('file'),spmPartyUpload)
router.route('/advisorupload').post(upload.single('file'),spmAdvisorUpload)
router.route('/stkupload-cs-single').post(singleUploadCs)
router.route('/stkupload-ws-single').post(stockuploadWsSingle);
router.route('/vehicleupload-single').post(vehicleUploadSingle);
router.route('/partyupload-single').post(spmPartyUploadSingle)
router.route('/advisorupload-single').post(spmAdvisorUploadSingle);
export default router