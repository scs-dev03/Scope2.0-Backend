import { Router } from "express";
import bucketroutes from "./bucket-managementRoute.js";
import parameterroutes from "./parameter-managementRoute.js"
import spmuploadroutes from "./spm-upload.js"

const router = Router()


router.use('/aa',bucketroutes)
router.use('/aa',parameterroutes)
router.use('/aa',spmuploadroutes)

export default router