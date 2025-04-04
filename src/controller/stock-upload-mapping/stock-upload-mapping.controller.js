import { addMapping, editMapping, viewMapping,alreadyExistedMapping } from "../../services/stock-upload-mapping/stock-upload-mapping.service.js";

export const addColumnMapping=async (req,res)=>{
        try{
            const result=await addMapping(req.body);
            res.status(200).json({data:result});
        }
       catch(error){
           console.error('Error in stock upload mapping controller:', error.message);
   
          if (!res.headersSent) {
               res.status(500).json({ message: 'An error occurred while add column stock uplaod controller.', error: error.message });
           } else {
               console.error('Headers already sent');
           }
       }
}

export const viewColumnMapping=async (req,res)=>{
    try{
           const result=await viewMapping(req.body);
           res.status(200).json({data:result});
       }
       catch(error){
           console.error('Error in stock upload mapping controller:', error.message);
   
          if (!res.headersSent) {
               res.status(500).json({ message: 'An error occurred while view column stock uplaod controller.', error: error.message });
           } else {
               console.error('Headers already sent');
           }
       }
}

export const editColumnMapping=async (req,res)=>{
    try{
           const result=await editMapping(req.body);
           res.status(200).json({data:result});
       }
       catch(error){
           console.error('Error in stock upload mapping controller:', error.message);
   
          if (!res.headersSent) {
               res.status(500).json({ message: 'An error occurred while edit column stock uplaod controller.', error: error.message });
           } else {
               console.error('Headers already sent');
           }
       }
}

export const alreadyExistedColumnMapping=async (req,res)=>{
    try{
           const result=await alreadyExistedMapping(req.body);
           res.status(200).json({data:result});
       }
       catch(error){
           console.error('Error in already existed mapping stock upload mapping controller:', error.message);
   
          if (!res.headersSent) {
               res.status(500).json({ message: 'An error occurred while already existed column stock uplaod controller.', error: error.message });
           } else {
               console.error('Headers already sent');
           }
       }
}