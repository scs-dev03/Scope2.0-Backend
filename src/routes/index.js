import express from 'express';
const router= express.Router();
import utilitesRoutes from '../routes/utilities/utilities.route.js';
import stockUploadMappingRoutes from '../routes/stock-upload-mapping/stock-upload-mapping.route.js';
import dealerLocationRoutes from '../routes/dealer-location-mapping/dealer-location-mapping.route.js'
import stockUploadRoutesBySpm from '../routes/stock-upload/stock-upload.route.js'
import stockUploadRoutesByScsUser from '../routes/stock-upload-by-scs-user/stock-upload-by-scs-user.route.js'
import leadTimeRoutes from '../routes/lead-time/lead-time.route.js';
import loginRoutes from '../routes/login/login.route.js';
import userRoutes from '../routes/user-management/user.route.js';
import authRoutes from '../routes/login/auth.route.js';
import roleRoutes from '../routes/role-based-access-management/role-based.route.js';
import updatePasswordRoutes from '../routes/update-password/update-password.route.js';
import sidebarRoutes from '../routes/sidebar/sidebar.route.js'
import mappingRoutes from '../routes/mapping/mapping.route.js'
router.use('/utilities',utilitesRoutes)
router.use('/st-mapping',stockUploadMappingRoutes);
router.use('/dl-mapping',dealerLocationRoutes);
router.use('/stock-upload',stockUploadRoutesBySpm)
router.use('/upload',stockUploadRoutesByScsUser)

//leadtime
// router.use('/mapping',mappingRoutes)
// router.use('/utilities',utilitesRoutes)
router.use('/leadtime',leadTimeRoutes)
router.use('/login',loginRoutes)
router.use('/user',userRoutes)
router.use('/auth-user',authRoutes)
router.use('/roles',roleRoutes)
router.use('/update-pass',updatePasswordRoutes)
router.use('/sidebar',sidebarRoutes)
router.use('/mapping',mappingRoutes)
export default router;