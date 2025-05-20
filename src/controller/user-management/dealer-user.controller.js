import { allDealerUsers, createDealerUser, deleteDealerUser, editDealerUser, getDealerUserInfo, getDealerUsers } from "../../services/user-management/dealer-user.service.js";

const  getDealerUsersInController=async function(req,res){
        try{
            const result=await getDealerUsers();
            // console.log("result ",result)
            
            return res.status(200).send({data:result})
        }
        catch(error){
            return res.status(201).send({error:error.message})
        }
    }

   const createDealerUserInController=async function(req,res){
        try{
            const result=await createDealerUser(req.body);
            return res.status(200).send({data:result})

        }catch(error){
            res.status(201).send({error:error.message})
        }
    }

    const editDealerUserInController=async function(req,res){

        try{
            const result=await editDealerUser(req.body);
            return res.status(200).send({data:result})

        }catch(error){
            res.status(201).send({error:error.message})
        }
    }
    
    const viewDealerUserInController=async function(req,res){
        try{
            const result=await allDealerUsers(req.body);
            return res.status(200).send({data:result})

        }catch(error){
            res.status(201).send({error:error.message})
        }
    }

    const deleteDealerUserInController=async function(req,res){
        try{
            const result=await deleteDealerUser(req.body);
            return res.status(200).send({data:result})
        }
        catch(error){
            res.status(201).send({error:error.message})
        }
    }

    // const requestNewMailInController=async function(req,res){
    //     try{
    //         const result=await requestNewMail(req.body);
    //         return res.status(200).send({data:result})
    //     }
    //     catch(error){
    //         res.status(201).send({error:error.message})
    //     }
    // }

    const getDealerUserInfoInController=async function (req,res) {
        try{
            const result=await getDealerUserInfo(req.body);
            return res.status(200).send({data:result})
        }
        catch(error){
            res.status(201).send({error:error.message})
        }
        
    }

    
export {
   
    deleteDealerUserInController ,
    viewDealerUserInController,
    editDealerUserInController,
    createDealerUserInController,
    getDealerUsersInController,
    getDealerUserInfoInController
}