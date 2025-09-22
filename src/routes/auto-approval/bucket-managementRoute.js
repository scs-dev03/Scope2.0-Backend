import { Router } from "express";
import { viewBucket } from "../../controller/auto-approval/bucket-managementController.js";

const router = Router()


router.get('/bucketview',viewBucket)





export default router
