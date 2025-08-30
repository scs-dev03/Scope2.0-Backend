import { Router } from "express";
import bucketroutes from "./bucket-managementRoute.js";
import parameterroutes from "./parameter-managementRoute.js"

const router = Router()


router.use('/aa',bucketroutes)
router.use('/aa',parameterroutes)


export default router