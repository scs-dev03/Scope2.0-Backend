// const bcrypt = require('bcryptjs');
// // const User = require('../models/User');
// const { generateResetToken, verifyResetToken } = require('../utils/token');
// const sendResetEmail = require('../../config/mailConfig');
// const connection=require('../../connection')
// // Service to handle password reset request
// const requestPasswordReset = async (email) => {

//     const pool=await connection.connectDB();
//     await pool.request().input('email',email).query(`Select userID from [user] where emailId=email`)
//   const user = await User.findOne({ email });
//   if (!user) {
//     throw new Error('User not found');
//   }

//   // Generate reset token
//   const resetToken = generateResetToken(user._id);

//   // Save the token and expiration to the user document
//   user.resetPasswordToken = resetToken;
//   user.resetPasswordExpires = Date.now() + 3600000; // Expires in 1 hour
//   await user.save();

//   // Send email with reset link
//   await sendResetEmail(email, resetToken);

//   return { message: 'Password reset link sent to your email' };
// };

// // Service to reset the password using the token
// const resetPassword = async (token, newPassword) => {
//   const decoded = verifyResetToken(token);
//   const user = await User.findById(decoded.userId);

//   if (!user || user.resetPasswordToken !== token || user.resetPasswordExpires < Date.now()) {
//     throw new Error('Invalid or expired token');
//   }

//   // Hash the new password
//   user.password = bcrypt.hashSync(newPassword, 10);

//   // Clear reset token and expiration
//   user.resetPasswordToken = undefined;
//   user.resetPasswordExpires = undefined;

//   await user.save();
//   return { message: 'Password successfully reset' };
// };

// module.exports = { requestPasswordReset, resetPassword };

export const requestPasswordReset=async()=>{

}

export const resetPassword=async()=>{
    
}