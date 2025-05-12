import {getAllModules,getModulesBasedOnRoles} from '../../services/sidebar/sidebar.service.js'

   const getAllModulesInController=async function(req,res){
        try{
            const result=await getAllModules(req);
            res.status(200).json({data:result});
        }
        catch(error){
            console.log("error in sidebar controller ",error)
            res.status(201).json({error:error.message});
        }
    }

  const  getModulesBasedOnRolesInController=async function(req,res){
        try{
            const result=await getModulesBasedOnRoles(req.body);
            res.status(200).json({data:result});
        }
        catch(error){
            console.log("error in getmodules based on roles sidebar controller ",error)
            res.status(201).json({error:error.message});
        }
    }

export {getModulesBasedOnRolesInController,getAllModulesInController}