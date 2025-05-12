import {createRole,viewRole,editRole,deleteRole,downloadRoleFormat
    ,uploadRoleFormat,getAccessSettingsBasedOnRole,getEditAccessSettingsBasedOnRole
} from '../../services/role-based-access-management/role-based.service.js';

   const createRoleInController=async function (req,res){
        try{
            const result=await createRole(req.body,res);
            res.status(200).json({message:'Role Created Successfully',error:result})
        }
        catch(error){
            res.status(201).json({message:'Role is not able to create successfully',error:error.message })
        }
    }
  const  viewRoleInController=async function(req,res){
        try{
            const result=await viewRole(req.body,res);
            res.status(200).json({data:result})
        }
        catch(error){
            res.status(201).json({message:'Role is not able to view successfully',error:error.message })
        }
    }
   const editRoleInController=async function(req,res){
        try{
            const result=await editRole(req.body,res);
            res.status(200).json({message:'Role Updated Successfully'})
        }
        catch(error){
            res.status(201).json({message:'Role is not able to update successfully',error:error.message })
        }
    }
   const deleteRoleInController=async function(req,res){
        try{
            const result=await deleteRole(req.body,res);
            res.status(200).json({message:'Role Delete Successfully'})
        }
        catch(error){
            res.status(201).json({message:'Role is not able to delete successfully',error:error.message })
        }
    }
    const downloadRoleFormatInController=async function(req,res) {
        try{
            //console.log(req)
            const result=await downloadRoleFormat(req.body.data,res);
              res.send(result);
        }
        catch(error){
            res.status(201).json({message:'Unable to download Role Format',error:error.message })
        }
    }
    const uploadRoleFormatInController=async function(req,res){
        try{
            const filePath = req.file.path;
          
            const result=await uploadRoleFormat(req.body.data,filePath);
            res.status(200).json({message:'Role uploaded Successfully',isWrongFile:result})
        }
        catch(error){
            res.status(201).json({message:'Unable to upload Format',error:error.message })
        }
    }
    const getAccessSettingBasedOnRoleInController=async function(req,res){
        try{
            const result=await getAccessSettingsBasedOnRole(req.body);
            res.status(200).json({message:'Access Settings are successfully fetched..',data:result})
        }
        catch(error){
            res.status(201).json({message:'Unable to get access settings based on role',error:error.message })
        }
    }
   const getEditAccessSettingBasedOnRole=async function(req,res){
        try{
            const result=await getEditAccessSettingsBasedOnRole(req.body);
            res.status(200).json({message:'Access Settings are successfully fetched..',data:result})
        }
        catch(error){
            res.status(201).json({message:'Unable to get edit access settings',error:error.message })
        }
    }

export {getEditAccessSettingBasedOnRole,getAccessSettingBasedOnRoleInController,uploadRoleFormatInController,
    downloadRoleFormatInController, deleteRoleInController,editRoleInController,
    viewRoleInController,createRoleInController
}