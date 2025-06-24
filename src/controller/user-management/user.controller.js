import {getUsers,createUser,editUser,allUsers,deleteUser,requestNewMail,getUserInfo,getUserListBasedOnBDL} from '../../services/user-management/user.service.js';

  const  getUsersInController=async function(req,res){
        try{
            const result=await getUsers();
            // console.log("result ",result)
            
            return res.status(200).send({data:result})
        }
        catch(error){
            return res.status(201).send({error:error.message})
        }
    }

   const createUserInController=async function(req,res){
        try{
            const result=await createUser(req.body);
            return res.status(200).send({data:result})

        }catch(error){
            res.status(201).send({error:error.message})
        }
    }

    const editUserInController=async function(req,res){

        try{
            const result=await editUser(req.body);
            return res.status(200).send({data:result})

        }catch(error){
            res.status(201).send({error:error.message})
        }
    }
    
    const viewUserInController=async function(req,res){
        try{
            const result=await allUsers(req.body);
            return res.status(200).send({data:result})

        }catch(error){
            res.status(201).send({error:error.message})
        }
    }

    const deleteUserInController=async function(req,res){
        try{
            const result=await deleteUser(req.body);
            return res.status(200).send({data:result})
        }
        catch(error){
            res.status(201).send({error:error.message})
        }
    }

    const requestNewMailInController=async function(req,res){
        try{
            const result=await requestNewMail(req.body);
            return res.status(200).send({data:result})
        }
        catch(error){
            res.status(201).send({error:error.message})
        }
    }

    const getUserInfoInController=async function (req,res) {
        try{
            const result=await getUserInfo(req.body);
            return res.status(200).send({data:result})
        }
        catch(error){
            res.status(201).send({error:error.message})
        }
        

    }
     const getUsersBasedOnBDL=async function(req,res) {

        try{
            const result=await getUserListBasedOnBDL(req.body);
            return res.status(200).send({data:result})
        }
        catch(error){
            res.status(201).send({error:error.message})
        }
    }
export {
    requestNewMailInController,
    deleteUserInController ,
    viewUserInController,
    editUserInController,
    createUserInController,
    getUsersInController,
    getUserInfoInController,
    getUsersBasedOnBDL
}
