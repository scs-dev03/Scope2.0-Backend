import { Router } from "express";
import bucketroutes from "./bucket-managementRoute.js";
import parameterroutes from "./parameter-managementRoute.js"
import spmuploadroutes from "./spm-upload.js"
import userModuleConfigroutes from './user-module-configRoutes.js'
import rulemgmtroutes from './rule-managementRoute.js'
import operatorroutes from './OperatorRoutes.js'
import spmviewroutes from './spm-viewRoute.js'
import nimroutes from './notinmasterRoute.js'
import adminviewroutes from './admin-viewRoute.js'

const router = Router()

router.use('/aa',bucketroutes)

router.use('/aa',parameterroutes)

router.use('/aa',operatorroutes)

router.use('/aa',spmuploadroutes)
router.use('/aa',spmviewroutes)

router.use('/aa',userModuleConfigroutes)

router.use('/aa',rulemgmtroutes)

router.use('/aa/nim',nimroutes)

router.use("/aa/admin",adminviewroutes)



export default router