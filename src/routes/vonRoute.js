import Router from 'express'
import { upload } from '../middlewares/multer.middleware.js'
import {remarkMaster, adminView, userFeedbacklog, userView, viewLog, newRemark, viewRemark, adminFeedbackLog, partFamily, countPending, partFamilySale, adminPendingView, dealerUpload } from '../controller/vonController.js'
const router = Router()

router.route('/remark').post(remarkMaster)
router.route('/newremark').post(newRemark)
router.route('/viewremark').post(viewRemark)

router.route('/viewuser').post(userView)
router.route('/userlog').post(userFeedbacklog)
router.route('/viewlog').post(viewLog)

router.route('/viewadmin').post(adminView)
router.route('/adminlog').post(adminFeedbackLog)

router.route('/partfamily').post(partFamily)
router.route('/countpending').get(countPending)
router.route('/partfamilysale').post(partFamilySale)

router.route('/adminpendingview').post(adminPendingView)
router.route('/upload').post(upload.single('file'),dealerUpload);
// router.post('/upload', (req, res, next) => {
//     // console.log("Headers:", req.headers);
//     console.log("Body:", req.body);
//     console.log("Files:", req.files);
//     next();
// }, upload.single('file'), dealerUpload);


export default router