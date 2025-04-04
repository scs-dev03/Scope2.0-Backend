
import {addDealerLocationMappingInService,exportUploadedData,editDealerLocationMappingInService} from '../../services/dealer-location-mapping/dealer-location-mapping.service.js';
const addDealerLocationMapping=async (req,res)=>{

    try{       
        const result= await addDealerLocationMappingInService(req);
        res.status(200).json(result);
        
    }
    catch(error){
        console.log("error in add dealer location mapping ",error.message)
        res.status(201).json({message:error.message})
    }
}

const exportUploadedDataInController=async (req,res)=>{
    try{
        
        const result= await exportUploadedData(req.body);
        res.status(200).json({data:result});
        
    }
    catch(error){
        res.status(201).json({message:error.message})
    }
}

const editDealerLocationMapping=async(req,res)=>{
    try{       
        const result= await editDealerLocationMappingInService(req);
        res.status(200).json(result);
        
    }
    catch(error){
        console.log("error in add dealer location mapping ",error.message)
        res.status(201).json({message:error.message})
    }
}

export { addDealerLocationMapping,exportUploadedDataInController,editDealerLocationMapping}