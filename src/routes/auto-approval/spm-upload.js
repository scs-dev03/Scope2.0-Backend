import { Router } from "express";
import { upload } from "../../middlewares/multer.middleware.js";
import { spmAdvisorUpload, spmPartyUpload, stockuploadCs  , vehicleUpload , stockuploadWs, singleUploadCs,stockuploadWsSingle,vehicleUploadSingle,spmPartyUploadSingle,spmAdvisorUploadSingle, stockView} from "../../controller/auto-approval/spm-upload.js";


const router = Router()

router.route('/addparty').post(spmPartyUploadSingle)
router.route('/partyupload').post(upload.single('file'),spmPartyUpload)

router.route('/addadvisor').post(spmAdvisorUploadSingle);
router.route('/advisorupload').post(upload.single('file'),spmAdvisorUpload)

router.route('/vehicleupload-single').post(vehicleUploadSingle);
router.route('/vehicleupload').post(upload.single('file'),vehicleUpload)

router.route('/stkupload-cs').post(upload.single('file'),stockuploadCs)
router.route('/stkupload-cs-single').post(singleUploadCs)

router.route('/stkupload-ws').post(upload.single('file'),stockuploadWs)
router.route('/stkupload-ws-single').post(stockuploadWsSingle);

router.route('/stkview').post(upload.single('file'),stockView)
export default router