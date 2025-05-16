import express from 'express'
import { createUserInController, deleteUserInController, editUserInController, getUsersInController, requestNewMailInController, 
    viewUserInController,getUserInfoInController } from '../../controller/user-management/user.controller.js';
const router=express.Router();

router.get('/get-user',getUsersInController);
router.post('/create-user',createUserInController)
router.post('/view-user',viewUserInController)
router.post('/delete-user',deleteUserInController);
router.post('/edit-user',editUserInController);
router.post('/request-new-mail',requestNewMailInController);
router.post('/user-details',getUserInfoInController)
export default router