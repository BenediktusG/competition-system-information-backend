// File: /api/src/services/user.service.js

import prisma from "../config/prisma.js";
import AppError from "../utils/AppError.js";

export const getAllUsers = async () => {
  return await prisma.user.findMany({
    // Pastikan tidak mengirim password
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: {
      name: "asc",
    },
  });
};

export const updateUserRole = async (
  userIdToUpdate,
  newRole,
  currentUserId
) => {
  // 1. Validasi peran baru
  if (newRole !== "STUDENT" && newRole !== "ADMIN") {
    throw new AppError(
      "Peran hanya bisa diubah menjadi STUDENT atau ADMIN",
      400
    );
  }

  // 2. Cek jika pengguna mencoba mengubah perannya sendiri
  if (userIdToUpdate === currentUserId) {
    throw new AppError("Tidak dapat mengubah peran diri sendiri", 400);
  }

  // 3. Cari pengguna yang akan diubah
  const user = await prisma.user.findUnique({
    where: { id: userIdToUpdate },
  });

  if (!user) {
    throw new AppError("Pengguna tidak ditemukan", 404);
  }

  // 4. Pastikan Super Admin lain tidak diubah
  if (user.role === "SUPER_ADMIN") {
    throw new AppError("Tidak dapat mengubah peran sesama Super Admin", 403);
  }

  // 5. Update peran
  const updatedUser = await prisma.user.update({
    where: { id: userIdToUpdate },
    data: { role: newRole },
  });

  delete updatedUser.password;
  return updatedUser;
};
