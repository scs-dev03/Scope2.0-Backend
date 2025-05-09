import  express from 'express'
import { addColumnsInController ,editColumns,getRecords,exportData,
    getUploadedData,exportMultiSheetData,downloadFormatInController,getFileTypes,
    getUploadLogsInController,readSubHeader,exportLogMultisheetData,
    deleteUploadedDataController,downloadBrandFormatInController,uploadDataInController,mappingExistInController

} from '../../controller/lead-time/lead-time.controller.js';
const router=express.Router();
router.post('/add-column',addColumnsInController);
router.post('/edit-column',editColumns);
router.post('/fetch',getRecords)
router.post('/export',exportData)
router.post('/uploaded-data',getUploadedData)
router.post('/export-multi',exportMultiSheetData)
router.post('/upload',uploadDataInController)
router.post('/download-format',downloadFormatInController)
router.post('/file-type',getFileTypes)
router.post('/uploaded-logs',getUploadLogsInController)
router.post('/read-sub-header',readSubHeader)
router.post('/mapping-exist',mappingExistInController)
router.post('/download-logs',exportLogMultisheetData)
router.post('/delete-uploaded-data',deleteUploadedDataController)
router.post('/download-brand',downloadBrandFormatInController)
export default router;