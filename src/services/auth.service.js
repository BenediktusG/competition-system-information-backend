// File: /api/src/services/auth.service.js

import prisma from "../config/prisma.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import AppError from "../utils/AppError.js";

/**
 * Registrasi pengguna baru
 * @param {string} name - Nama pengguna
 * @param {string} email - Email pengguna
 * @param {string} password - Password pengguna
 */
export const registerUser = async (name, email, password) => {
  // 1. Validasi email SSO
  if (!email.endsWith("@unhas.ac.id")) {
    throw new AppError(
      "Registrasi gagal. Gunakan email SSO (@sso.kampus.ac.id)",
      400
    );
  }

  // 2. Cek jika email sudah ada
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new AppError("Email ini sudah terdaftar", 409); // 409 Conflict
  }

  // 3. Hash password
  const hashedPassword = await bcrypt.hash(password, 12);

  // 4. Simpan pengguna ke database
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role: "STUDENT", // Default role
    },
  });

  // 5. Hapus password dari objek sebelum dikirim kembali
  delete user.password;
  return user;
};

/**
 * Login pengguna
 * @param {string} email - Email pengguna
 * @param {string} password - Password pengguna
 */
export const loginUser = async (email, password) => {
  // 1. Cari pengguna berdasarkan email
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new AppError("Email atau password salah", 401); // 401 Unauthorized
  }

  // 2. Bandingkan password
  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new AppError("Email atau password salah", 401);
  }

  // 3. Buat JSON Web Token (JWT)
  const token = jwt.sign(
    {
      id: user.id,
      role: user.role,
    },
    process.env.JWT_SECRET, // Ambil dari .env
    {
      expiresIn: "1d", // Token berlaku 1 hari
    }
  );

  // 4. Hapus password dari objek
  delete user.password;
  return { user, token };
};
