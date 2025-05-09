import express from 'express';
let router=express.Router();
import { handlePasswordResetRequest, handlePasswordReset } from '../../controller/update-password/update-password.controller.js';
router.post('/request-password-reset', handlePasswordResetRequest);

// Route for resetting the password
router.post('/reset-password/:token', handlePasswordReset);

export default router;
