import express from 'express';
const router=express.Router();
import { addColumnMapping, alreadyExistedColumnMapping, editColumnMapping, viewColumnMapping } from '../../controller/stock-upload-mapping/stock-upload-mapping.controller.js';
router.post('/create',addColumnMapping);
router.post('/view',viewColumnMapping);
router.post('/edit',editColumnMapping);
router.get('/all-existed-mapping',alreadyExistedColumnMapping)
export default router;