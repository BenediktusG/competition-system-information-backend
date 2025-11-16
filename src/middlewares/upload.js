// File: /api/src/middlewares/upload.js

import multer from "multer";
import path from "path";
import AppError from "../utils/AppError.js";

// Tentukan lokasi penyimpanan
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Simpan file ke folder public/uploads
    cb(null, "public/uploads/");
  },
  filename: (req, file, cb) => {
    // Buat nama file unik untuk menghindari konflik
    // Contoh: poster-1678886400000.jpg
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const extension = path.extname(file.originalname);
    cb(null, "poster-" + uniqueSuffix + extension);
  },
});

// Filter file: Hanya izinkan format gambar
const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === "image/jpeg" ||
    file.mimetype === "image/png" ||
    file.mimetype === "image/jpg"
  ) {
    cb(null, true); // Terima file
  } else {
    cb(
      new AppError("Format gambar tidak valid. (Hanya JPEG/PNG/JPG)", 400),
      false
    ); // Tolak file
  }
};

// Inisialisasi multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 5, // Batas 5MB per file
  },
  fileFilter: fileFilter,
});

export default upload;
