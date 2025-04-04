
<<<<<<< HEAD
import {addDealerLocationMappingInService,exportUploadedData,editDealerLocationMappingInService,
    viewDealerLocationMappingInService,deleteDealerLocationMappingInService
} from '../../services/dealer-location-mapping/dealer-location-mapping.service.js';
=======
import {addDealerLocationMappingInService,exportUploadedData,editDealerLocationMappingInService} from '../../services/dealer-location-mapping/dealer-location-mapping.service.js';
>>>>>>> dc6a7f177bbb7aca02f71380070a746f9206b588
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

<<<<<<< HEAD
const viewDealerLocationMapping=async (req,res)=>{
    try{       
        const result= await viewDealerLocationMappingInService(req.body);
        res.status(200).json(result);
        
    }
    catch(error){
        console.log("error in view dealer location mapping ",error.message)
        res.status(201).json({message:error.message})
    }
}
const deleteDealerLocationMapping=async(req,res)=>{
    try{       
        const result= await deleteDealerLocationMappingInService(req.body);
        res.status(200).json(result);
        
    }
    catch(error){
        console.log("error in delete dealer location mapping ",error.message)
        res.status(201).json({message:error.message})
    }
}
export { addDealerLocationMapping,exportUploadedDataInController,editDealerLocationMapping
    ,viewDealerLocationMapping,deleteDealerLocationMapping}
=======
export { addDealerLocationMapping,exportUploadedDataInController,editDealerLocationMapping}
>>>>>>> dc6a7f177bbb7aca02f71380070a746f9206b588
