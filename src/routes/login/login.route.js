import express from 'express';
import {loginUserInController,forgotPassword,verifyOTPController,resetPasswordController} from '../../controller/login/login.controller.js'
const router=express.Router();

router.post('/user',loginUserInController)
router.post('/forgot-password',forgotPassword)
router.post('/verify-otp', verifyOTPController);
router.post('/reset-password', resetPasswordController);
export default router


