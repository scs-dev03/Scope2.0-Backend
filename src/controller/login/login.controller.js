import {loginUser,forgetPasswordService,verifyOTPService,resetPasswordService} from '../../services/login/login.service.js'

  const  loginUserInController=async function(req,res){
        try{
            const token = await loginUser(req.body);
            return res.json({ message: 'Login successful' ,data:token,login:true});
        }
        catch(error){
            res.status(201).send({message:error.message,login:false})
        }
    }

    const forgotPassword=async function(req,res){
        try {
            
            const response = await forgetPasswordService(req.body.email);
            // console.log(response)
            res.status(response.status).send({error:response.data,status:response.status});
          } catch (error) {
            console.error('Error in forget password controller:', error);
            res.status(500).json({ error: 'Unable to process request.' });
          }
    }
      // Verify OTP Controller
    const  verifyOTPController =async (req, res) => {
        try {
          const { otp, email } = req.body;
          console.log(otp,email)
          const response = await verifyOTPService(otp, email);
          res.status(response.status).send({error:response.data,status:response.status});
        } catch (error) {
          console.error('Error in OTP verification controller:', error);
          res.status(500).json({ error: 'Unable to validate OTP.' });
        }
      }
      
      // Reset Password Controller
    const  resetPasswordController=async (req, res) => {
        try {
          const { password, jwtToken } = req.body;
          const response = await resetPasswordService(password, jwtToken);
          res.status(response.status).send({error:response.data,status:response.status});
        } catch (error) {
          console.error('Error in reset password controller:', error);
          res.status(500).json({ error: 'Error in resetting password.' });
        }
      }

export {loginUserInController,resetPasswordController,verifyOTPController,forgotPassword}