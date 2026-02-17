import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { generateToken } from '../../utils/jwtUtils.js';

// import transporter=require('../../config/mailConfig';
import sql from 'mssql2';
import crypto from 'crypto'
import nodemailer from 'nodemailer'
const otps = {}
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAILID,
      pass: process.env.EMAILPASSWORD,
    },
  });

  const  loginUser= async function(req,res){
             pool=await getPool();
            // Check if the user exists
            const user = await findUserByUsername(pool,req.email,req.userPassword);
            if (!user) {
              throw new Error('Invalid credentials');
            }
          
            // Compare the password with the hashed password
            // const isPasswordValid = await bcrypt.compare(password, user.password);
            // if (!isPasswordValid) {
            //   throw new Error('Invalid credentials');
            // }
          
            // Generate JWT token
            const token = await generateToken(user.userId);
            return {token,user};
          
          
    }
   const forgetPasswordService=async function(email) {
        try {
           // console.log("email ",email)
          if (!email) {
            return { status: 400, data   : { error: 'Email is required.' } };
          }
      
          const pool = await getPool();
          let query=`SELECT emailId FROM [User] WHERE emailId = @email`;
          const result = await pool.request()
            .input('email', sql.NVarChar, email)
            .query(query);
            // console.log(result)
          if (result.length === 0) {
            return { status: 404, data: { error: 'User not found.' } };
          }
      
          const otp = crypto.randomInt(100000, 999999);
          const expiresAt = Date.now() + 5 * 60 * 1000;
          otps[email] = { otp, expiresAt };
      
          const mailOptions = {
            from: process.env.EMAILID,
            to: email,
            subject: 'Password Reset OTP',
            text: `Here is your OTP: ${otp}\nTo authenticate, please use the following code.\nThis OTP is valid for 5 minutes.`,
          };
        //   console.log("transporter ",transporter.sendMail)
          transporter.sendMail(mailOptions, (error) => {
            if (error) {
              console.error('Error sending email:', error);
              return { status: 500, data: { error: 'Failed to send OTP.' } };
            }
          });
      
          return { status: 200, data: { message: 'OTP sent successfully.', expiresAt } };
        } catch (error) {
          console.error('Error in forget password service:', error);
          return { status: 500, data: { error: 'Unable to process request.' } };
        }
      }
   const   verifyOTPService= async (userOtp, email) => {
        try {
          if (!userOtp || !email) {
            return { status: 201, data: { message: 'OTP and email are required.' } };
          }
      
          const savedOtp = otps[email];
          if (!savedOtp) {
            return { status: 400, data: { message: 'OTP has expired.' } };
          }
      
          const { otp: correctOtp, expiresAt } = savedOtp;
          if (parseInt(userOtp) !== correctOtp || Date.now() > expiresAt) {
            return { status: 400, data: { error: 'Invalid or expired OTP.'  } };
          }
      
          delete otps[email];
      
          const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '5m' });
          return { status: 200, data: { message: 'OTP validated successfully.', token } };
        } catch (error) {
          console.error('Error validating OTP service:', error);
          return { status: 500, data: { error: 'Unable to validate OTP.' } };
        }
      }
    const  resetPasswordService = async (password, token) => {
        try {
          if (!password || !token) {
            return { status: 400, data: { message: 'Password and token are required.' } };
          }
      
          let email;
          try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            email = decoded.email;
          } catch (error) {
            return { status: 500, data: { message: 'Invalid or expired token.' } };
          }
          const hashedPassword=password;
          // const hashedPassword = await bcrypt.hash(password, 10);
          const pool = await getPool();
      
          await pool.request()
            .input('email', sql.NVarChar(100), email)
            .input('password', sql.NVarChar(255), hashedPassword)
            .query( `UPDATE [User] SET password = @password WHERE emailId = @email`);
      
          return { status: 200, data: { message: 'Password changed successfully.' } };
        } catch (error) {
          console.error('Error in reset password service:', error);
          return { status: 500, data: { message: 'Error in resetting password.', error } };
        }
      }


const findUserByUsername = async (pool,email,password) => {
    
    try {
        console.log("email ",email,password)
        let query=`SELECT * FROM [user] WHERE emailId = @email and password=@password`
      const result = await pool.request()
        .input('email',  email)
        .input('password',password)
        .query(query);
      console.log("result ",result)
      return result[0] || null;  // Return the first record, or null if not found
    } catch (err) {
      console.error('Error querying the database:', err);
      throw new Error('Database query failed');
    }
  };

export {
  loginUser,
  forgetPasswordService,verifyOTPService,resetPasswordService ,findUserByUsername
}