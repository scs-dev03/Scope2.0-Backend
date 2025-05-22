// src/controllers/auth.controller.js

// const { password } = require('../../dbConfig');
import {login,refreshAccessToken,verify2FA,generate2FA,
  updatePasswordWhileCreatingUser,updatePasswordWhileCreatingDealerUser,getEmails,getDealerEmails} from '../../services/login/auth.service.js';
// Login or Refresh Access Token
const auth = async (req, res) => {
  const { email, userPassword } = req.body;

  try {
    const { accessToken, refreshToken,user } = await login(email, userPassword,res);
    // console.log(accessToken,refreshToken)
  //   res.cookie('accessToken', accessToken, {
  //     httpOnly: true,
  //     secure: true,
  //     // maxAge: 15 * 60 * 1000,
  //     // sameSite: 'None',
  // });

  // res.cookie('refreshToken', refreshToken, {
  //     httpOnly: true,
  //     secure: true,
  //     // maxAge: 7 * 24 * 60 * 60 * 1000,
  //     // sameSite: 'None',
  // });
  // const { secret, data_url } = await authService.generate2FA();
  // user.secret = secret; // Store the secret in user data or a session
  
  // res.render('verifyPage', { data_url });
  // res.json({ qrCodeUrl: data_url, secret });
  res.status(200).json({ message: 'Login successful' ,accessToken,refreshToken,user});
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
};
const refreshTokenController = async (req, res) => {
  const { refreshToken } = req.body;

  try {
    const newAccessToken = await refreshAccessToken(refreshToken);
    res.status(200).json({ accessToken: newAccessToken });
  } catch (error) {
    res.status(403).json({ message: error.message });
  }
};

const protectedRouteController = (req, res) => {
  const token = req.headers['authorization']?.split(' ')[1]; // Bearer token

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const result =  protectedRoute(token);
    res.status(200).json(result);
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
};

 const verifyRouteController=async (req,res)=>{
  const { token } = req.body;
  const userId=req.body.userId;
// console.log(" token ",token)
  const user = { secret: req.body.secret }; // Retrieve user secret from your session or DB

  const isValid = await verify2FA(user.secret, token,userId);
  //console.log("is valid in verify auth controller ",isValid)
  if (isValid) {
    return res.json({message:'2FA verified successfully!'});
  } else {
    return res.status(400).send('Invalid OTP');
  }
}

const generateQRCode=async (req,res)=>{

    try{
    const { secret, data_url } = await generate2FA();
    res.status(200).json({ message: 'QR generate Successfully' ,qr:data_url,secret});
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
}

const updatePasswordWhileCreatingUserInController=async (req,res)=>{

  try{
    const result=await updatePasswordWhileCreatingUser(req.body);
    res.status(200).json({message:'Successfully Updated',data:result})
  }catch(error){
    console.log("error ",error.message)
    res.status(201).json({message:'Successfully Updated'})
  }
}

const updatePasswordWhileCreatingDealerUserInController=async(req,res)=>{

   try{
    const result=await updatePasswordWhileCreatingDealerUser(req.body);
    res.status(200).json({message:'Successfully Updated',data:result})
  }catch(error){
    console.log("error ",error.message)
    res.status(201).json({message:'Successfully Updated'})
  }
}
const getEmailsInController=async (req,res)=>{
  try{
    const result= await getEmails(req);
    return res.status(200).json({data:result});

  }
  catch(error){
 console.log("error ",error.message)
   return res.status(201).json({message:'Error ',error:error.message})
  }
}

const getDealerEmailsInController=async(req,res)=>{
  try{
    const result= await getDealerEmails(req);
    return res.status(200).json({data:result});

  }
  catch(error){
 console.log("error ",error.message)
   return res.status(201).json({message:'Error ',error:error.message})
  }
}

export  { auth,refreshTokenController ,protectedRouteController,verifyRouteController,generateQRCode
  ,updatePasswordWhileCreatingUserInController,getDealerEmailsInController,
  getEmailsInController,
updatePasswordWhileCreatingDealerUserInController}
