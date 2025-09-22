import { Router } from "express";
import bucketroutes from "./bucket-managementRoute.js";
import parameterroutes from "./parameter-managementRoute.js"
import spmuploadroutes from "./spm-upload.js"
import operatorroutes from "./OperatorRoutes.js"


const router = Router()


router.use('/aa',bucketroutes)
router.use('/aa',parameterroutes)
router.use('/aa',spmuploadroutes)
router.use('/aa',operatorroutes)

export default router