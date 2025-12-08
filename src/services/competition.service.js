// File: /api/src/services/competition.service.js

import prisma from "../config/prisma.js";
import AppError from "../utils/AppError.js";
import fs from "fs";
import path from "path";

/**
 * Validasi Logika Tanggal
 * @param {Date|string} startDate
 * @param {Date|string} endDate
 */
const validateDateLogic = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (end < start) {
    throw new AppError(
      "Tanggal selesai pendaftaran tidak boleh lebih awal dari tanggal mulai.",
      400
    );
  }
};

/**
 * Validasi Kategori Ada atau Tidak
 * @param {string} categoryId
 */
const validateCategoryExists = async (categoryId) => {
  if (!categoryId) return;

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
  });

  if (!category) {
    throw new AppError(
      `Kategori dengan ID ${categoryId} tidak ditemukan.`,
      400
    );
  }
};

// ========================================================================
// READ OPERATIONS
// ========================================================================

export const getActiveCompetitions = async (query) => {
  const { search, categoryId, sort } = query;
  const now = new Date();

  // [UBAH] Tambahkan filter status: 'ACCEPTED'
  // Hanya lomba yang sudah disetujui yang boleh tampil di halaman publik
  let where = {
    isArchived: false,
    status: "ACCEPTED",
    registrationEndDate: { gt: now },
  };

  if (search) {
    where.title = { contains: search };
  }

  if (categoryId) {
    where.categoryId = categoryId;
  }

  let orderBy = { createdAt: "desc" };

  if (sort === "deadline_asc") orderBy = { registrationEndDate: "asc" };
  else if (sort === "deadline_desc") orderBy = { registrationEndDate: "desc" };

  return await prisma.competition.findMany({
    where,
    orderBy,
    include: { category: { select: { id: true, name: true } } },
  });
};

// [BARU] Mengambil daftar lomba yang statusnya PENDING (untuk Admin)
export const getPendingCompetitions = async () => {
  return await prisma.competition.findMany({
    where: {
      status: "PENDING",
      isArchived: false,
    },
    orderBy: { createdAt: "desc" }, // Yang baru diajukan paling atas
    include: {
      category: { select: { id: true, name: true } },
      author: {
        // Sertakan info siapa yang mengajukan
        select: { name: true, email: true },
      },
    },
  });
};

export const getArchivedCompetitions = async () => {
  const now = new Date();
  return await prisma.competition.findMany({
    where: {
      OR: [{ isArchived: true }, { registrationEndDate: { lte: now } }],
      // Opsional: Apakah arsip juga harus yang ACCEPTED?
      // Biasanya ya, kecuali admin ingin melihat arsip yang rejected.
      // Untuk saat ini kita biarkan terbuka agar admin bisa lihat history.
    },
    orderBy: { registrationEndDate: "desc" },
    include: { category: { select: { id: true, name: true } } },
  });
};

export const getCompetitionById = async (id) => {
  const competition = await prisma.competition.findUnique({
    where: { id },
    include: {
      category: { select: { id: true, name: true } },
      author: { select: { name: true, email: true } }, // Tampilkan pengaju di detail
    },
  });

  if (!competition) {
    throw new AppError("Lomba tidak ditemukan", 404);
  }
  return competition;
};

// ========================================================================
// WRITE OPERATIONS
// ========================================================================

// [UBAH] Menambahkan parameter 'user' untuk pengecekan role & author
export const createCompetition = async (data, user) => {
  const {
    title,
    registrationStartDate,
    registrationEndDate,
    categoryId,
    posterUrl,
    // Field lain spread via ...data di prisma create
  } = data;

  // 1. Validasi Field Wajib
  if (
    !title ||
    !registrationStartDate ||
    !registrationEndDate ||
    !categoryId ||
    !posterUrl
  ) {
    throw new AppError(
      "Data tidak lengkap. Pastikan judul, tanggal, kategori, dan poster diisi.",
      400
    );
  }

  // 2. Validasi Foreign Key
  await validateCategoryExists(categoryId);

  // 3. Validasi Logika Tanggal
  validateDateLogic(registrationStartDate, registrationEndDate);

  // 4. [BARU] Tentukan Status Awal & Author
  // Jika Admin/SuperAdmin -> ACCEPTED
  // Jika Student -> PENDING
  const initialStatus = ["ADMIN", "SUPER_ADMIN"].includes(user.role)
    ? "ACCEPTED"
    : "PENDING";

  // 5. Create Database
  try {
    const newCompetition = await prisma.competition.create({
      data: {
        ...data, // Spread data input (pastikan controller sudah membersihkan input)
        registrationStartDate: new Date(registrationStartDate),
        registrationEndDate: new Date(registrationEndDate),
        // [BARU] Insert field baru
        status: initialStatus,
        authorId: user.id,
      },
      include: { category: true },
    });

    // Return object tambahan agar controller tahu statusnya
    return {
      ...newCompetition,
      _initialStatus: initialStatus, // Helper property untuk response message di controller
    };
  } catch (error) {
    throw new AppError("Gagal membuat lomba: " + error.message, 500);
  }
};

// [BARU] Update Status Lomba (Moderasi Admin)
export const updateCompetitionStatus = async (id, newStatus) => {
  // Validasi input status
  if (!["ACCEPTED", "REJECTED"].includes(newStatus)) {
    throw new AppError(
      "Status tidak valid. Gunakan ACCEPTED atau REJECTED.",
      400
    );
  }

  try {
    return await prisma.competition.update({
      where: { id },
      data: { status: newStatus },
    });
  } catch (error) {
    if (error.code === "P2025") {
      throw new AppError("Lomba tidak ditemukan", 404);
    }
    throw new AppError("Gagal mengubah status lomba", 500);
  }
};

export const updateCompetition = async (id, data) => {
  // 1. Ambil data eksisting
  const existingCompetition = await prisma.competition.findUnique({
    where: { id },
  });

  if (!existingCompetition) {
    throw new AppError("Lomba tidak ditemukan", 404);
  }

  // 2. Validasi Kategori
  if (data.categoryId) {
    await validateCategoryExists(data.categoryId);
  }

  // 3. Validasi Logika Tanggal
  const newStartDate =
    data.registrationStartDate || existingCompetition.registrationStartDate;
  const newEndDate =
    data.registrationEndDate || existingCompetition.registrationEndDate;

  validateDateLogic(newStartDate, newEndDate);

  // 4. Handle Poster Update
  if (data.posterUrl && existingCompetition.posterUrl) {
    try {
      const oldPosterPath = path.join("public", existingCompetition.posterUrl);
      if (fs.existsSync(oldPosterPath)) {
        await fs.promises.unlink(oldPosterPath);
      }
    } catch (err) {
      console.warn(`Gagal menghapus poster lama lomba ${id}:`, err.message);
    }
  }

  // 5. Update Database
  try {
    return await prisma.competition.update({
      where: { id },
      data: {
        ...data,
        // Pastikan tanggal dikonversi ke object Date jika di-update
        ...(data.registrationStartDate && {
          registrationStartDate: new Date(data.registrationStartDate),
        }),
        ...(data.registrationEndDate && {
          registrationEndDate: new Date(data.registrationEndDate),
        }),
        ...(data.eventDate && { eventDate: new Date(data.eventDate) }),
      },
      include: { category: true },
    });
  } catch (error) {
    throw new AppError("Gagal mengupdate lomba: " + error.message, 500);
  }
};

export const deleteCompetition = async (id) => {
  const existingCompetition = await prisma.competition.findUnique({
    where: { id },
    select: { posterUrl: true },
  });

  if (!existingCompetition) {
    throw new AppError("Lomba tidak ditemukan", 404);
  }

  try {
    await prisma.competition.delete({ where: { id } });

    if (existingCompetition.posterUrl) {
      const posterPath = path.join("public", existingCompetition.posterUrl);
      if (fs.existsSync(posterPath)) {
        await fs.promises.unlink(posterPath);
      }
    }
    return;
  } catch (error) {
    throw new AppError("Gagal menghapus lomba", 500);
  }
};

export const archiveCompetition = async (id) => {
  const exists = await prisma.competition.count({ where: { id } });
  if (!exists) throw new AppError("Lomba tidak ditemukan", 404);

  return await prisma.competition.update({
    where: { id },
    data: { isArchived: true },
    include: { category: true },
  });
};
