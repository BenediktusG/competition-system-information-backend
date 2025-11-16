// File: /api/src/middlewares/isAuthenticated.js

import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";
import AppError from "../utils/AppError.js";

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export const isAuthenticated = asyncHandler(async (req, res, next) => {
  let token;

  // 1. Ambil token dari httpOnly cookie
  if (req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return next(new AppError("Anda belum login. Silakan login.", 401));
  }

  // 2. Verifikasi token
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return next(new AppError("Token tidak valid atau kedaluwarsa.", 401));
  }

  // 3. Cek apakah pengguna masih ada
  const currentUser = await prisma.user.findUnique({
    where: { id: decoded.id },
  });

  if (!currentUser) {
    return next(
      new AppError("Pengguna dengan token ini sudah tidak ada.", 401)
    );
  }

  // 4. (Opsional) Cek jika pengguna ganti password setelah token dibuat
  //    (Kita skip ini untuk kesederhanaan)

  // 5. Simpan data pengguna ke 'req' untuk digunakan di controller selanjutnya
  delete currentUser.password;
  req.user = currentUser;

  next();
});
