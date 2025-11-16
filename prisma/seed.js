// File: /api/prisma/seed.js

import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Memulai proses seeding...");

  // --- Konfigurasi Super Admin ---
  const superAdminEmail = "superadmin@sso.kampus.ac.id";
  const superAdminName = "Kepala Departemen";
  // Ganti password ini dengan password yang aman
  const superAdminPassword = "superadmin123";
  // ---------------------------------

  // 1. Hash password
  const hashedPassword = await bcrypt.hash(superAdminPassword, 12);

  // 2. Buat (atau update) Super Admin
  // upsert = update or insert.
  // Ini mencegah error jika Anda menjalankan seed berkali-kali.
  const admin = await prisma.user.upsert({
    where: { email: superAdminEmail }, // Cari berdasarkan email
    update: {}, // Jangan lakukan apa-apa jika sudah ada
    create: {
      email: superAdminEmail,
      name: superAdminName,
      password: hashedPassword,
      role: Role.SUPER_ADMIN, // Gunakan enum Role
    },
  });

  console.log(`✅ Super Admin telah dibuat (atau sudah ada): ${admin.email}`);

  // 3. (Opsional) Tambahkan beberapa kategori awal
  await prisma.category.upsert({
    where: { name: "UI/UX" },
    update: {},
    create: { name: "UI/UX" },
  });

  await prisma.category.upsert({
    where: { name: "Data Science" },
    update: {},
    create: { name: "Data Science" },
  });

  await prisma.category.upsert({
    where: { name: "Competitive Programming" },
    update: {},
    create: { name: "Competitive Programming" },
  });

  console.log("🌱 Kategori awal telah di-seed.");
  console.log("Proses seeding selesai.");
}

// Jalankan fungsi main dan pastikan koneksi ditutup
main()
  .catch((e) => {
    console.error("Terjadi error saat seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
