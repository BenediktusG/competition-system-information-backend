// File: /api/src/controllers/auth.controller.js

import * as authService from "../services/auth.service.js";
import AppError from "../utils/AppError.js";

// Helper untuk membungkus controller async agar bisa ditangani error handler
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Opsi untuk cookie
const cookieOptions = {
  httpOnly: true, // Mencegah XSS
  secure: process.env.NODE_ENV === "production", // Hanya di HTTPS
  sameSite: "strict", // Mencegah CSRF
  maxAge: 24 * 60 * 60 * 1000, // 1 hari
};

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    throw new AppError("Semua field (name, email, password) wajib diisi", 400);
  }

  const user = await authService.registerUser(name, email, password);

  res.status(201).json({
    status: "success",
    data: {
      user,
    },
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError("Email dan password wajib diisi", 400);
  }

  const { user, token } = await authService.loginUser(email, password);

  // KUNCI: Set token di httpOnly cookie
  res.cookie("token", token, cookieOptions);

  // Kirim data pengguna sebagai respons
  res.status(200).json({
    status: "success",
    data: {
      user,
    },
  });
});

export const logout = (req, res) => {
  // Hapus cookie dengan nama 'token'
  res.cookie("token", "", {
    httpOnly: true,
    expires: new Date(0), // Set kedaluwarsa ke masa lalu
  });

  res.status(200).json({ status: "success", message: "Logout berhasil" });
};

export const getMe = asyncHandler(async (req, res) => {
  // Data pengguna (req.user) akan diisi oleh middleware 'isAuthenticated'
  // Kita akan buat middleware ini di langkah selanjutnya.

  // Untuk sekarang, kita asumsikan req.user ada
  res.status(200).json({
    status: "success",
    data: {
      user: req.user,
    },
  });
});
