
// import { password } '../../db/db.js';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { getPool1 } from '../../db/db.js';
import { getLocalIp, getPublicIp, getClientIp }  from "../getIP.js";
import "dotenv/config"
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAILID,
      pass: process.env.EMAILPASSWORD,
    },
  });

   const getUsers=async function(){
        try{
            const pool=await getPool1();
            let query=`use [z_scope] Select vcFirstName,vcLastName ,bintId_pk as userId from [adminmaster_gen]`;
            const result=await pool.request().query(query);
            // console.log("----------",result)
            return result.recordset;
        }
        catch(error){
            console.log("error in user service ",error.message)
            return error;
        }
    }

    const createUser=async function(req){
        try{
            let firstName=req.name;
            let link=req?.link;
            let designationId=req.designation;
            let roleId=req.role;
            let email=req.email;
            let mobileNo=req.mobileNo;
            let lastName=req.lastName;
            let userName=firstName +' '+ lastName;
           // let password=req.password;
            let addedBy=req.userId;
            let businessVertical=req.associatedBusiness;
            let token=req.token;
            let status=req.status;
            let clientIp = getClientIp(req);
            let localIp = getLocalIp();
            let userType=req.userType;
            let password = await generatePassword(9);
           // console.log("password generate in user service ",password)
            let publicIp = "Fetching public IP..."
            publicIp = await getPublicIp();
            let pool=await getPool1();
            status=1;
            let query=`use [z_scope] Insert into adminmaster_gen (vcFirstName,vcLastName,designation,roleId,vcEmail,vcMobile,vcPassword,btstatus,addedby,business_vertical,vcUserName,type) 
            OUTPUT INSERTED.bintID_pk values (@firstName,@lastName,@designationId,@roleId,@email,@mobileNo,@password,@status,@addedBy,@businessVertical,'SCS$2025',@userType)`;
            
            let result=await pool.request().input('firstName',firstName).input('lastName',lastName)
            .input('designationId',designationId).input('roleId',roleId)
            .input('email',email).input('mobileNo',mobileNo).input('password',password)
            .input('addedBy',addedBy).input('businessVertical',businessVertical)
            .input('status',status).input('userType',userType)
            .query(query);
            //console.log("create user result ",result)
            let insertedId=result.recordset[0].bintID_pk;
            const newUserIdFormatted = `SCS$${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${insertedId}`;
           // console.log(newUserIdFormatted)
            let updateQuery = ` use [z_scope]
            UPDATE [adminmaster_gen] SET vcUserName = @newUserIdFormatted WHERE bintId_Pk = @insertedId;
        `;
            await pool.request()
            .input('newUserIdFormatted', newUserIdFormatted)
            .input('insertedId', insertedId)
            .query(updateQuery);
            let query2='';
             if(status=='Active'){
                 query2=` Insert into  [UAD_BI_LEAD_TIME].[dbo].[Audit_log](userID,status,
                IP,token,newUserID,operation,userCreatedId)  values(@addedBy,1,@publicIp,@token,
                @newUserIdFormatted,'user creation',@insertedId)`;
             }
             else{
                query2=` Insert into  [UAD_BI_LEAD_TIME].[dbo].[Audit_log](userID,status,
                IP,token,newUserID,operation,userCreatedId)  values(@addedBy,0,@publicIp,@token,
                @newUserIdFormatted,'user creation',@insertedId)`;
             }
            // console.log("----------",result)
            await pool.request().input('addedBy',addedBy)
            .input('publicIp',publicIp).input('token',token).input('newUserIdFormatted',newUserIdFormatted)
            .input('insertedId',insertedId)
            .query(query2)

           // console.log("link generated ",link)
            const expiryTime = Date.now() + (5 * 60 * 1000); // 15 minutes from now
            const encodedUserName = encodeURIComponent(userName);
            const uniqueLink = `${link}?expiry=${expiryTime}?email=${email}?userName=${encodedUserName}?userType='user'?type=${userType}`;
           // console.log("unique link ",uniqueLink)
            let mailOptions = {
                from: process.env.EMAILID, // Sender address
                to: email, // List of receivers
                subject: 'Create Password', // Subject line
                html: `Dear ${userName},<br><br>
                You can create your password with the link given below:<br>
               Link for accessing:- ${uniqueLink} `, // Plain text body
                // html: '<b>This is a test email sent from Node.js using Nodemailer!</b>' // HTML body (optional)
              };
              transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                  console.log('Error: ' + error);
                } else {
                  console.log('Email sent: ' + info.response);
                }
              });
            return result.recordset;
        }
        catch(error){
            console.log("error in create user service ",error.message);
            return error;
        }
    }

   const allUsers=async function(req){
        try{
            const pool=await getPool1();
            let userType=req.userType;
            let query=`Select bintId_pk as userId,vcFirstName,vcLastName,concat(vcFirstName,' ',vcLastName) as name, roleId,designation as designationId,business_vertical,vcEmail as emailId,vcMobile as mobileNo,btstatus as status,type from [z_scope].dbo.[adminmaster_gen] where type=@userType order by vcFirstName,vcLastName`;
            const result=await pool.request().input('userType',userType).query(query);
            // console.log("----------",result)
            return result.recordset;
        }
        catch(error){
            console.log("error in view user service ",error.message);
            return error;
        }
    }

   const deleteUser=async function(req){
        try{
            let userId=req.loginUserId;
            let id=parseInt(req.userId,10);
            //console.log(req,id)
            let status=req.status;
            let token=req.token;
            let query=''
            let newUserId=req.newUserId;
            let clientIp = getClientIp(req);
            let localIp = getLocalIp();
            
            let publicIp = "Fetching public IP..."
            publicIp = await getPublicIp();
            const pool=await getPool1();
            let btstatus=0;
            // if(status=='Active' || status=='active'){
            //     btstatus=1;
            // }
            // else{
            //     btstatus=0;
            // }
            // if(status=='Inactive' || status=='inactive'){
                query=`use [z_scope] Update [adminmaster_gen] set btstatus=@status where bintId_pk=@id`;
            // }
            // else{
                // query=`Update [user] set status='Active' where userId=@id`
            //}
            const result=await pool.request()
            .input('id',id).input('status',status).query(query);

            let query2='';
            // console.log("----------",result)
            if(status=='Inactive' || status=='inactive'){

                 query2=` Insert into [UAD_BI_LEAD_TIME].[dbo].[Audit_log](userID,operation,IP,status,newUserID) values(@userId,'delete user',@publicIp,0,@newUserId)`
            }
            else{
                query2=` Insert into [UAD_BI_LEAD_TIME].[dbo].[Audit_log](userID,operation,IP,status,newUserID) values(@userId,'delete user',@publicIp,1,@newUserId)`
            }

            await pool.request().
            input('userId',userId).input('publicIp',publicIp)
            .input('newUserId',newUserId).query(query2);
            return ;
        }
        catch(error){
            console.log("error in delete user service ",error.message)
        }
    }

   const editUser=async function(req) {
        try {
            let userId = req.userId; // userId to identify which user to update
            let userName = req.name;
            let firstName=req.name;
            let lastName=req.lastName;
            let designationId = req.designation;
            let roleId = req.role;
            let email = req.email;
            let mobileNo = req.mobileNo;
            let updatedBy = req.updatedBy; // userId of the person making the update
            let businessVertical = req.associatedBusiness;
            let token = req.token;
            let status=req.status;
            let btstatus;
            let userType=req.userType;
            let clientIp = getClientIp(req);
            let localIp = getLocalIp();
            if(status=='Active' || status=='active'){
                btstatus=1;
            }
            else{
                btstatus=0;
            }
            let publicIp = "Fetching public IP...";
            publicIp = await getPublicIp();
            
            let pool = await getPool1()
            
            // Update the user details in the database
            let query = ` use [z_scope]
                UPDATE [adminmaster_gen]
                SET 
                    vcFirstName = @firstName, 
                    vcLastName= @lastName,
                    designation = @designationId,
                    roleId = @roleId,
                    vcEmail = @email,
                    vcMobile = @mobileNo,
                    updatedBy=@updatedBy,
                    btstatus=@btstatus,
                    type=@userType,
                    business_vertical = @businessVertical
                WHERE bintId_pk = @userId;
            `;
            
            let result = await pool.request()
                .input('userId', userId)
                .input('firstName', firstName)
                .input('lastName', lastName)
                .input('designationId', designationId)
                .input('roleId', roleId)
                .input('email', email)
                .input('btstatus',btstatus)
                .input('updatedBy',updatedBy)
                .input('mobileNo', mobileNo)
                .input('businessVertical', businessVertical)
                .input('userType',userType)
                .query(query);
    
            //console.log("edit user result ", result);
    
            // Log the edit operation in Audit_log
            let query2 ='';
            if(status=='Active'){
                query2 = `
                    INSERT INTO [UAD_BI_LEAD_TIME].[dbo].[Audit_log](userID, status, IP, operation,userCreatedId)
                    VALUES(@updatedBy, 1, @publicIp, 'user edit',@userId);
                `;
            }
            else{
                query2 = ` use [UAD_BI_LEAD_TIME]
                INSERT INTO [UAD_BI_LEAD_TIME].[dbo].[Audit_log](userID, status, IP, operation,userCreatedId)
                VALUES(@updatedBy, 0, @publicIp, 'user edit',@userId);
            `;
            }
            
            await pool.request()
                .input('updatedBy', updatedBy)
                .input('publicIp', publicIp)
                .input('token', token)
                .input('userId', userId)
                .query(query2);
    
            return result.recordset;
        } catch (error) {
            console.log("error in edit user service ", error.message);
            return error;
        }
    }
    
   const requestNewMail=async function (req) {

        try{

            let userName=req.userName;
            let email=req.email;
            let link=req.link;
            let userType=req.userType;
            let type=req.type;
            // email='kirti.s@sparecare.in'
            // link='http://103.30.72.109/update-user-password'
            // userName='Kirti'
          //  console.log("1234",userName,email)
         // userName='Kirti Sindhwani'
            const expiryTime = Date.now() + (5 * 60 * 1000); // 15 minutes from now
            const encodedUserName = encodeURIComponent(userName);
            //console.log("user anme ",encodedUserName)
            const uniqueLink = `${link}?expiry=${expiryTime}?email=${email}?userName=${encodedUserName}?userType=${userType}?type=${type}`;
           // console.log("unique link ",uniqueLink)
            let mailOptions = {
                from: process.env.EMAILID, // Sender address
                to: email, // List of receivers
                subject: 'Create Password', // Subject line
                html: `Dear ${userName},<br><br>
                You can create your password with the link given below:<br>
               Link for accessing:- ${uniqueLink} `, // Plain text body
                // html: '<b>This is a test email sent from Node.js using Nodemailer!</b>' // HTML body (optional)
              };
              transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                  console.log('Error: ' + error);
                } else {
                  console.log('Email sent: ' + info.response);
                }
              });
        }
        catch(error){
            return error;
            
        }
    }

    const getUserInfo=async function(req){

        try{
            const pool = await getPool1()
            const token= req.token;
            const query = `use z_scope SELECT bintId_pk as userId ,concat (vcFirstName,' ',vcLastName) as username from adminmaster_gen
            where bintId_Pk=z_scope.dbo.f_Decryption('${token}') `;
            const result=await pool.request().input('token',token).query(query);
            return result.recordset;
        }
        catch(error){
            return error;
        }
    }
async function generatePassword(length = 12) {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_-+=<>?';
    let password = '';
    
    while (password.length < length) {
        const randomValue = crypto.randomBytes(1)[0]; // Get a random byte
        const index = randomValue % charset.length;  // Map the byte to an index in the charset
        password += charset[index];
    }

    return password;
}

export { createUser,editUser,deleteUser,requestNewMail,getUsers,allUsers,getUserInfo}

