import multer from "multer"
import path from "path"
import {Upload} from '@aws-sdk/lib-storage'
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs/promises";


const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, './public/temp')
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname)
    }
  })

  // Define file filter to accept only Excel files
const fileFilterexcel = (req, file, cb) => {
  const allowedExtensions = [".xls", ".xlsx"];
  const fileExtension = path.extname(file.originalname).toLowerCase();

  if (allowedExtensions.includes(fileExtension)) {
    cb(null, true); // Accept the file
  } else {
    cb(new Error("Only Excel files are allowed!"), false); // Reject the file
  }
};

// Export configured multer instance
 const upload = multer({
  storage: storage,
  fileFilter: fileFilterexcel,
  limits: { fileSize: 5 * 1024 * 1024 }, // Optional: File size limit (5MB)
});

const fileFilterImg= (req, file, cb) => {
  const allowedExtensions = [".jpeg", ".png",".jpg"];
  const fileExtension = path.extname(file.originalname).toLowerCase();

  if (allowedExtensions.includes(fileExtension)) {
    cb(null, true); // Accept the file
  } else {
    cb(new Error(`Allowed Extensions ".jpeg", ".png",".jpg"`), false); // Reject the file
  }
};
 const uploadImg = multer({
  storage: storage,
  fileFilter: fileFilterImg,
  limits: { fileSize: 5 * 1024 * 1024 }, // Optional: File size limit (5MB)
});

const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'file') {
    // excel only
    const ok = /excel|spreadsheetml/.test(file.mimetype) || /\.(xlsx|xls|csv)$/i.test(file.originalname);
    return cb(ok ? null : new Error('Only Excel/CSV allowed in "file" field'), ok);
  }
  if (file.fieldname === 'image') {
    const ok = /^image\//.test(file.mimetype);
    return cb(ok ? null : new Error('Only images allowed in "image" field'), ok);
  }
  cb(new Error('Unexpected field: ' + file.fieldname));
};

const uploadBoth = multer({ storage, fileFilter })
  .fields([
    { name: 'file',  maxCount: 1 },   // Excel
    { name: 'image', maxCount: 1 }    // Image
  ]);

// AWS S3 Client
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
  },
});

const uploadToS3 = async (file) => {
  const fileStream = await fs.readFile(file.path);

  const upload = new Upload({
    client: s3Client,
    params: {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: file.filename,
      Body: fileStream,
      ContentType: file.mimetype,
    },
  });

  const result = await upload.done();

  // Clean up local temp file
  await fs.unlink(file.path);

  return {
    url: result.Location,
    key: file.filename,
  };
};


export {upload,uploadImg,uploadToS3,uploadBoth}