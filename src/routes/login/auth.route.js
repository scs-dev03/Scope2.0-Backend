// src/routes/auth.routes.js

import express from "express";
import { auth,refreshTokenController,protectedRouteController,verifyRouteController,
    generateQRCode, 
    getEmailsInController,
    updatePasswordWhileCreatingUserInController} from "../../controller/login/auth.controller.js";

const router = express.Router();

// Unified route for login and refresh token
router.post("/auth", auth);
// router.post('/login', loginController);

// Route for refreshing access token
router.post('/refresh', refreshTokenController);
router.get('/protected', protectedRouteController);
router.post('/verify', verifyRouteController);
router.get('/generate-qr',generateQRCode);
router.post('/update-user',updatePasswordWhileCreatingUserInController);
router.post('/check-email',getEmailsInController)
export default router;
