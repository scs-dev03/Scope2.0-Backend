import { singleTOCInService ,bulkTOCInService,getRecordsInService} from "../../services/TOC Upload/toc-upload.service.js";


export const singleTOCInController=async (req,res)=>{

     try{
               const result=await singleTOCInService(req);
               res.status(200).json(result);
           }
           catch(error){
               console.error('Error in already existed toc upload controller:', error.message);
       
              if (!res.headersSent) {
                   res.status(500).json({ message: 'An error occurred while already existed column toc upload controller.', error: error.message });
               } else {
                   console.error('Headers already sent');
               }
           }
}

export const bulkTOCInController=async (req,res)=>{

     try{
               const result=await bulkTOCInService(req);
               res.status(200).json(result);
           }
           catch(error){
               console.error('Error in already existed toc upload controller:', error.message);
       
              if (!res.headersSent) {
                   res.status(500).json({ message: 'An error occurred while already existed column toc upload controller.', error: error.message });
               } else {
                   console.error('Headers already sent');
               }
           }
}

export const getRecordsInController=async(req,res)=>{

     try{
               const result=await getRecordsInService(req.body);
               res.status(200).json({data:result});
           }
           catch(error){
               console.error('Error in already existed toc upload controller:', error.message);
       
              if (!res.headersSent) {
                   res.status(500).json({ message: 'An error occurred while already existed column toc upload controller.', error: error.message });
               } else {
                   console.error('Headers already sent');
               }
           }
}