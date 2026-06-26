import fs from 'fs';
import { lookup } from 'mime-types';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY2,
    secretAccessKey: process.env.AWS_SECRET_KEY2
  }
});


export const s3_another = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY3,
    secretAccessKey: process.env.AWS_SECRET_KEY3
  }
});
export async function uploadFileToS3(localFilePath, bucketName, s3Key) {
  // ✅ Delete if object already exists
  // console.log(localFilePath, bucketName , s3Key);
  
  try {
    await s3_another.send(new HeadObjectCommand({ Bucket: bucketName, Key: s3Key }));
    // If above doesn't throw, object exists — delete it
    await s3_another.send(new DeleteObjectCommand({ Bucket: bucketName, Key: s3Key }));
    console.log(`Existing object "${s3Key}" deleted`);
  } catch (err) {
    if (err.name !== 'NotFound') {
      console.error(`⚠️ Failed to check or delete existing object: ${err.message}`);
      throw err;
    }
    // If NotFound, it's okay — object doesn't exist
  }

  // ✅ Upload new file
  const fileStream = fs.createReadStream(localFilePath);
  const contentType = lookup(localFilePath) || 'application/octet-stream';

  const uploadCommand = new PutObjectCommand({
    Bucket: bucketName,
    Key: s3Key,
    Body: fileStream,
    ContentType: contentType
  });

  await s3_another.send(uploadCommand);

  // ✅ Return signed URL (valid 7 days)
  const getCommand = new GetObjectCommand({ Bucket: bucketName, Key: s3Key });
  const signedUrl = await getSignedUrl(s3, getCommand, { expiresIn: 604800 });

  return signedUrl;
}
