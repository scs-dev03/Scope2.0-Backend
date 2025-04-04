import express from 'express';
const router= express.Router();
import utilitesRoutes from '../routes/utilities/utilities.route.js';
import stockUploadMappingRoutes from '../routes/stock-upload-mapping/stock-upload-mapping.route.js';
import dealerLocationRoutes from '../routes/dealer-location-mapping/dealer-location-mapping.route.js'
import stockUploadRoutesBySpm from '../routes/stock-upload/stock-upload.route.js'
import stockUploadRoutesByScsUser from '../routes/stock-upload-by-scs-user/stock-upload-by-scs-user.route.js'
router.use('/utilities',utilitesRoutes)
router.use('/st-mapping',stockUploadMappingRoutes);
router.use('/dl-mapping',dealerLocationRoutes);
router.use('/stock-upload',stockUploadRoutesBySpm)
router.use('/upload',stockUploadRoutesByScsUser)
export default router;