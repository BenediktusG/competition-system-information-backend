// File: /api/src/controllers/auth.controller.js

import * as authService from "../services/auth.service.js";
import AppError from "../utils/AppError.js";

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 24 * 60 * 60 * 1000, // 1 hari
};

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    throw new AppError("Semua field (name, email, password) wajib diisi", 400);
  }

  const user = await authService.registerUser(name, email, password);

  // SESUAI SPEK: Kembalikan objek User
  res.status(201).json(user);
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    throw new AppError("Email dan password wajib diisi", 400);
  }

  const { user, token } = await authService.loginUser(email, password);
  res.cookie("token", token, cookieOptions);

  // SESUAI SPEK: Kembalikan objek User
  res.status(200).json(user);
});

export const logout = (req, res) => {
  res.cookie("token", "", {
    httpOnly: true,
    expires: new Date(0),
  });

  // SESUAI SPEK: Kembalikan objek { message: ... }
  res.status(200).json({ message: "Logout berhasil" });
};

export const getMe = asyncHandler(async (req, res) => {
  // req.user diisi oleh middleware isAuthenticated

  // SESUAI SPEK: Kembalikan objek User
  res.status(200).json(req.user);
});
