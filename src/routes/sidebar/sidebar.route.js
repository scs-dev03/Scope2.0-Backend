import express from 'express';
const router=express.Router();
import {getAllModulesInController, getModulesBasedOnRolesInController} from '../../controller/sidebar/sidebar.controller.js'
router.get('/module',getAllModulesInController)
router.post('/modules-based-on-roles',getModulesBasedOnRolesInController)
export default router;