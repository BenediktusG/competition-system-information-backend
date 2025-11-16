// File: /api/src/services/competition.service.js

import prisma from "../config/prisma.js";
import AppError from "../utils/AppError.js";
import fs from "fs"; // <-- IMPORT BARU: File System
import path from "path"; // <-- IMPORT BARU: Path

/**
 * Mendapatkan lomba aktif (belum arsip & belum deadline)
 * dengan filter, search, dan sort.
 */
export const getActiveCompetitions = async (query) => {
  const { search, categoryId, sort } = query;
  const now = new Date();

  // 1. Tentukan Kondisi WHERE
  let where = {
    isArchived: false,
    registrationEndDate: {
      gt: now, // Deadline > waktu sekarang
    },
  };

  if (search) {
    // MySQL defaultnya case-insensitive, tapi ini membuatnya eksplisit
    where.title = {
      contains: search,
      // mode: 'insensitive', // Gunakan jika database Anda case-sensitive
    };
  }

  if (categoryId) {
    where.categoryId = categoryId;
  }

  // 2. Tentukan Kondisi ORDER BY
  let orderBy = {
    createdAt: "desc", // Default sort
  };

  if (sort === "deadline_asc") {
    orderBy = { registrationEndDate: "asc" };
  } else if (sort === "deadline_desc") {
    orderBy = { registrationEndDate: "desc" };
  }

  return await prisma.competition.findMany({
    where,
    orderBy,
    include: {
      category: {
        select: { id: true, name: true },
      },
    },
  });
};

/**
 * Mendapatkan lomba yang diarsip (manual atau otomatis karena deadline)
 */
export const getArchivedCompetitions = async () => {
  const now = new Date();
  return await prisma.competition.findMany({
    where: {
      OR: [
        { isArchived: true },
        {
          registrationEndDate: {
            lte: now, // Deadline <= waktu sekarang
          },
        },
      ],
    },
    orderBy: {
      registrationEndDate: "desc",
    },
    include: {
      category: {
        select: { id: true, name: true },
      },
    },
  });
};

export const getCompetitionById = async (id) => {
  const competition = await prisma.competition.findUnique({
    where: { id },
    include: {
      category: {
        select: { id: true, name: true },
      },
    },
  });

  if (!competition) {
    throw new AppError("Lomba tidak ditemukan", 404);
  }
  return competition;
};

export const createCompetition = async (data) => {
  // Asumsikan validasi data (e.g., date) sudah dilakukan di controller/middleware
  return await prisma.competition.create({
    data,
    include: { category: true },
  });
};

export const updateCompetition = async (id, data) => {
  // Cek apakah ada poster baru yang di-upload.
  // 'data.posterUrl' hanya akan ada jika controller menambahkannya dari req.file.
  if (data.posterUrl) {
    try {
      // 1. Ambil data poster LAMA dari database SEBELUM di-update.
      const existingCompetition = await prisma.competition.findUnique({
        where: { id },
        select: { posterUrl: true }, // Hanya ambil posterUrl
      });

      // 2. Cek jika poster lama ada
      if (existingCompetition && existingCompetition.posterUrl) {
        // 3. Buat file path yang benar
        //    posterUrl = /uploads/filename.jpg
        //    path.join('public', ...) = public/uploads/filename.jpg
        const oldPosterPath = path.join(
          "public",
          existingCompetition.posterUrl
        );

        // 4. Hapus file lama dari file system
        if (fs.existsSync(oldPosterPath)) {
          await fs.promises.unlink(oldPosterPath);
          console.log(`File lama berhasil dihapus: ${oldPosterPath}`);
        }
      }
    } catch (err) {
      // Log error jika gagal hapus file, tapi jangan hentikan proses update
      console.warn(`Gagal menghapus file lama untuk lomba ${id}:`, err.message);
    }
  }

  // 5. Lanjutkan proses update ke database dengan data baru
  try {
    return await prisma.competition.update({
      where: { id },
      data, // 'data' sudah berisi posterUrl baru (jika ada)
      include: { category: true },
    });
  } catch (error) {
    throw new AppError("Lomba tidak ditemukan", 404);
  }
};

export const deleteCompetition = async (id) => {
  // --- PENINGKATAN: Hapus file poster saat lomba dihapus ---
  try {
    // 1. Ambil data poster LAMA sebelum dihapus
    const existingCompetition = await prisma.competition.findUnique({
      where: { id },
      select: { posterUrl: true },
    });

    // 2. Hapus data dari database
    await prisma.competition.delete({
      where: { id },
    });

    // 3. Hapus file poster dari file system (setelah DB berhasil)
    if (existingCompetition && existingCompetition.posterUrl) {
      const posterPath = path.join("public", existingCompetition.posterUrl);
      if (fs.existsSync(posterPath)) {
        await fs.promises.unlink(posterPath);
        console.log(`Poster lomba ${id} berhasil dihapus: ${posterPath}`);
      }
    }
    return;
  } catch (error) {
    throw new AppError("Lomba tidak ditemukan", 404);
  }
};

export const archiveCompetition = async (id) => {
  try {
    return await prisma.competition.update({
      where: { id },
      data: { isArchived: true }, // Set manual arsip
      include: { category: true },
    });
  } catch (error) {
    throw new AppError("Lomba tidak ditemukan", 404);
  }
};
