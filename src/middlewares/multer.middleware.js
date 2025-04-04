import multer from "multer"
import path from "path"


const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, './public/temp')
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname)
    }
  })

  // Define file filter to accept only Excel files
const fileFilter = (req, file, cb) => {
  const allowedExtensions = [".xls", ".xlsx"];
  const fileExtension = path.extname(file.originalname).toLowerCase();

  if (allowedExtensions.includes(fileExtension)) {
    cb(null, true); // Accept the file
  } else {
    cb(new Error("Only Excel files are allowed!"), false); // Reject the file
  }
};

// Export configured multer instance
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // Optional: File size limit (5MB)
});