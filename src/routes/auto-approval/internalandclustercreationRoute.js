import  Router  from "express";
import { addCluster, addInternal, editClusterRule, editInternalRule, getcluster, uploadCluster, viewClusterRule, viewRule } from "../../controller/auto-approval/internalandclustercreationController.js";
import {upload} from '../../middlewares/multer.middleware.js'

const router = Router()

router.route("/upload-rule").post(upload.single('file'),addInternal)
router.route("/view-rule").post(viewRule)
router.route("/getcluster").post(getcluster)

router.route("/add-cluster").post(addCluster)
router.route("/upload-cluster").post(upload.single('file'),uploadCluster)
router.route("/cluster/view").post(viewClusterRule)

router.route("/editinternal").post(editInternalRule)
router.route("/cluster/edit").post(editClusterRule)

export default router