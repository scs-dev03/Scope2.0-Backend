import Router from 'express'
import {  getLedgerbyPartid, partDetails } from '../controller/salesViewController.js'
import { upload } from '../middlewares/multer.middleware.js'
const router = Router()

// router.route('/brands').get(getBrands)
// router.route('/dealers').post(getDealers)
// router.route('/location').post(getLocation)
router.route('/partdetails').post(partDetails)
router.route('/ledger').post(upload.single('file'),getLedgerbyPartid)


export default router