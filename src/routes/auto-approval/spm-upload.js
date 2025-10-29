import { Router } from "express";
import { upload, uploadBoth, uploadImg } from "../../middlewares/multer.middleware.js";
import { spmAdvisorUpload, spmPartyUpload, stockuploadCs  , vehicleUpload , stockuploadWs, singleUploadCs,vehicleUploadSingle,spmPartyUploadSingle,spmAdvisorUploadSingle, stockView, singleUploadWS, orderInsertion, addVehicle} from "../../controller/auto-approval/spm-upload.js";


const router = Router()

router.route('/addparty').post(spmPartyUploadSingle)
router.route('/partyupload').post(upload.single('file'),spmPartyUpload)

router.route('/addadvisor').post(spmAdvisorUploadSingle);
router.route('/advisorupload').post(upload.single('file'),spmAdvisorUpload)

router.route('/add-vehicle').post(uploadImg.single('image'),addVehicle);
router.route('/multi-vehicle').post(uploadBoth,vehicleUploadSingle);
router.route('/vehicleupload').post(upload.single('file'),vehicleUpload)

router.route('/addstk-cs').post(singleUploadCs)
router.route('/stkupload-cs').post(upload.single('file'),stockuploadCs)

router.route('/addstk-ws').post(singleUploadWS);
router.route('/stkupload-ws').post(upload.single('file'),stockuploadWs)

router.route('/stkview').post(upload.single('file'),stockView)

router.route('/insert').post(orderInsertion)
export default router