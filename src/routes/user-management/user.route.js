import express from 'express'
import { createUserInController, deleteUserInController, editUserInController, getUsersInController, requestNewMailInController, 
    viewUserInController,getUserInfoInController,getUsersBasedOnBDL } from '../../controller/user-management/user.controller.js';
import {createDealerUserInController, deleteDealerUserInController, editDealerUserInController,
     getDealerUserInfoInController, getDealerUsersInController, viewDealerUserInController} 
from '../../controller/user-management/dealer-user.controller.js'
    const router=express.Router();

//for admin
router.get('/get-user',getUsersInController);
router.post('/create-user',createUserInController)
router.post('/view-user',viewUserInController)
router.post('/delete-user',deleteUserInController);
router.post('/edit-user',editUserInController);
router.post('/request-new-mail',requestNewMailInController);
router.post('/user-details',getUserInfoInController)
// router.post('/dealer-user-list',getUsersBasedOnBDL)

//for dealer
router.get('/get-dealer-user',getDealerUsersInController);
router.post('/create-dealer-user',createDealerUserInController)
router.post('/view-dealer-user',viewDealerUserInController)
router.post('/delete-dealer-user',deleteDealerUserInController);
router.post('/edit-dealer-user',editDealerUserInController
);
router.post('/user-dealer-details',getDealerUserInfoInController);

export default router