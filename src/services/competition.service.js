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
  if (!categoryId) return; // Skip jika tidak ada categoryId (untuk update partial)

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
// READ OPERATIONS (Tidak Berubah Signifikan)
// ========================================================================

export const getActiveCompetitions = async (query) => {
  const { search, categoryId, sort } = query;
  const now = new Date();

  let where = {
    isArchived: false,
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

export const getArchivedCompetitions = async () => {
  const now = new Date();
  return await prisma.competition.findMany({
    where: {
      OR: [{ isArchived: true }, { registrationEndDate: { lte: now } }],
    },
    orderBy: { registrationEndDate: "desc" },
    include: { category: { select: { id: true, name: true } } },
  });
};

export const getCompetitionById = async (id) => {
  const competition = await prisma.competition.findUnique({
    where: { id },
    include: { category: { select: { id: true, name: true } } },
  });

  if (!competition) {
    throw new AppError("Lomba tidak ditemukan", 404);
  }
  return competition;
};

// ========================================================================
// WRITE OPERATIONS (DIPERBAIKI)
// ========================================================================

export const createCompetition = async (data) => {
  const {
    title,
    registrationStartDate,
    registrationEndDate,
    categoryId,
    posterUrl,
  } = data;

  // 1. Validasi Field Wajib (Basic)
  // Poster wajib ada saat create
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

  // 2. Validasi Foreign Key (Category)
  await validateCategoryExists(categoryId);

  // 3. Validasi Logika Tanggal
  validateDateLogic(registrationStartDate, registrationEndDate);

  // 4. Create Database
  try {
    return await prisma.competition.create({
      data,
      include: { category: true },
    });
  } catch (error) {
    // Jaga-jaga jika ada constraint lain
    throw new AppError("Gagal membuat lomba: " + error.message, 500);
  }
};

export const updateCompetition = async (id, data) => {
  // 1. Ambil data eksisting terlebih dahulu
  // Ini PENTING untuk:
  // a. Validasi tanggal (kita butuh tanggal lama jika user hanya update salah satu tanggal)
  // b. Menghapus poster lama
  const existingCompetition = await prisma.competition.findUnique({
    where: { id },
  });

  if (!existingCompetition) {
    throw new AppError("Lomba tidak ditemukan", 404);
  }

  // 2. Validasi Kategori (Jika user mengubah kategori)
  if (data.categoryId) {
    await validateCategoryExists(data.categoryId);
  }

  // 3. Validasi Logika Tanggal (Kompleksitas Partial Update)
  // Gunakan tanggal baru jika ada, jika tidak pakai tanggal lama
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
      data,
      include: { category: true },
    });
  } catch (error) {
    throw new AppError("Gagal mengupdate lomba: " + error.message, 500);
  }
};

export const deleteCompetition = async (id) => {
  // 1. Cek keberadaan data
  const existingCompetition = await prisma.competition.findUnique({
    where: { id },
    select: { posterUrl: true },
  });

  if (!existingCompetition) {
    throw new AppError("Lomba tidak ditemukan", 404);
  }

  try {
    // 2. Hapus data dari database DULU (Transaction safe)
    await prisma.competition.delete({ where: { id } });

    // 3. Hapus file poster
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
  // Cek dulu apakah ID valid agar errornya 404 bukan 500/P2025
  const exists = await prisma.competition.count({ where: { id } });
  if (!exists) throw new AppError("Lomba tidak ditemukan", 404);

  return await prisma.competition.update({
    where: { id },
    data: { isArchived: true },
    include: { category: true },
  });
};
