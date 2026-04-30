import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import multer from "multer";
import dotenv from "dotenv";
import fs from "fs/promises";

dotenv.config();

// AWS S3 Client (v3)
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY2,
    secretAccessKey: process.env.AWS_SECRET_KEY2,
  },
});

// Multer local config (temporary storage before upload)
const storage = multer.diskStorage({
  destination: "uploads/", // local temp folder
  filename: (req, file, cb) => {
    const filename = `${Date.now()}-${file.originalname.replace(/\s+/g, "-")}`;
    cb(null, filename);    
  },
});

const upload = multer({ storage });

const uploadToS3 = async (file) => {
  const fileStream = await fs.readFile(file.path);

  const upload = new Upload({
    client: s3Client,
    params: {
      Bucket: process.env.S3_BUCKET2_NAME,
      Key: file.filename,
      Body: fileStream,
      ContentType: file.mimetype,
      // ACL: "public-read",
    },
  });

  const result = await upload.done();

  // Optional: delete the local file
  await fs.unlink(file.path);

  return result.Location;
};

export { upload, uploadToS3 };
