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
  // --- 1. Validasi Kekuatan Password ---
  // Aturan: Minimal 8 karakter.
  if (!password || password.length < 8) {
    throw new AppError(
      "Password terlalu lemah. Minimal harus 8 karakter.",
      400
    );
  }

  // --- 2. Validasi Email Strict (Regex) ---
  // Penjelasan Regex: /^[^\s@]+@unhas\.ac\.id$/
  // ^          : Mulai dari awal string (mencegah karakter sampah di depan)
  // [^\s@]+    : Karakter apapun KECUALI spasi atau '@' (mencegah double @)
  // @unhas\.ac\.id : Harus persis diikuti domain ini
  // $          : Akhir string (mencegah karakter tambahan di belakang)

  const emailRegex = /^[^\s@]+@unhas\.ac\.id$/;

  if (!emailRegex.test(email)) {
    throw new AppError(
      "Registrasi gagal. Gunakan email resmi kampus (@unhas.ac.id) yang valid.",
      400
    );
  }

  // 3. Cek jika email sudah ada (Duplikasi)
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new AppError("Email ini sudah terdaftar", 409); // 409 Conflict
  }

  // 4. Hash password
  const hashedPassword = await bcrypt.hash(password, 12);

  // 5. Simpan pengguna ke database
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role: "STUDENT", // Default role
    },
  });

  // 6. Hapus password dari objek sebelum dikirim kembali
  delete user.password;
  return user;
};

/**
 * Login pengguna
 * @param {string} email - Email pengguna
 * @param {string} password - Password pengguna
 */
export const loginUser = async (email, password) => {
  // Validasi input dasar untuk login
  if (!email || !password) {
    throw new AppError("Email dan password wajib diisi", 400);
  }

  // 1. Cari pengguna berdasarkan email
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new AppError("Email atau password salah", 401);
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
    process.env.JWT_SECRET,
    {
      expiresIn: "1d",
    }
  );

  // 4. Hapus password dari objek
  delete user.password;
  return { user, token };
};
