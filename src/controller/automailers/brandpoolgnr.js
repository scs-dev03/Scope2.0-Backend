import {uploadFileToS3} from '../../services/gainer/uploadtoS3.js'
import { connectDB } from '../../db/db.js';
import sql from 'mssql';
import 'dotenv/config';
import { Honda4WBrandPoolMail, tatacvBrandPoolMail , transporter} from '../../utils/mailservice.js';
import { Honda4W_Brand_Pool_Query, PC_NM_Pool_Mailer } from '../../models/BrandPoolQuery.js';
import { exportAndCheckSize } from '../../utils/BrandPool.js';
import { ApiResponse } from '../../utils/ApiResponse.js';


async function TATA_PCBU_BrandPool_AutoMailer(req,res) {
  try {

  await connectDB();
  const result = await exportAndCheckSize({query: PC_NM_Pool_Mailer,
  filenamePrefix: 'TATA_PC'});

    if (!result.success) {
      console.error(`Export failed: ${result.message}`);
      return;
    }

    const s3Url = await uploadFileToS3(result.outputZipPath, process.env.S3_BUCKET3_NAME, result.s3Key);
    console.log(`Download URL (valid 7 Days): ${s3Url}`);

    const date = new Date().toISOString().slice(0, 10);
    const mailOptions = tatacvBrandPoolMail(date,s3Url);

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("❌ Mail failed:", error.message);
        return;
      }
      console.log(`📧 Mail sent: ${info.response}`);
      return res.status(200).send(`📧 Mail sent: ${info.response}`)
    });
    

  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    return res.status(500).send(`❌ Unexpected error: ${err.message}`)
  } finally {
    await sql.close(); 
  }
}

async function Honda_4W_BrandPool_AutoMailer(req,res) {
  try {

  await connectDB();
  const result = await exportAndCheckSize({query: Honda4W_Brand_Pool_Query,
  filenamePrefix: 'Honda_4W'});

    if (!result.success) {
      console.error(`Export failed: ${result.message}`);
      return;
    }

    const s3Url = await uploadFileToS3(result.outputZipPath, process.env.S3_BUCKET3_NAME, result.s3Key);
    console.log(`Download URL (valid 7 Days): ${s3Url}`);

    const date = new Date().toISOString().slice(0, 10);
    const mailOptions = Honda4WBrandPoolMail(date,s3Url);

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("❌ Mail failed:", error.message);
        return;
      }
      console.log(`📧 Mail sent: ${info.response}`);
      return res.status(200).send(`📧 Mail sent: ${info.response}`)
    });
    
    

  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    return res.status(200).send(`❌ Unexpected error: ${err.message}`)
  } finally {
    await sql.close(); 
  }
}


export {TATA_PCBU_BrandPool_AutoMailer,Honda_4W_BrandPool_AutoMailer}