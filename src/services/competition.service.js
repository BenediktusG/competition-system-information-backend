// File: /api/src/services/competition.service.js

import prisma from "../config/prisma.js";
import AppError from "../utils/AppError.js";

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
  try {
    return await prisma.competition.update({
      where: { id },
      data,
      include: { category: true },
    });
  } catch (error) {
    throw new AppError("Lomba tidak ditemukan", 404);
  }
};

export const deleteCompetition = async (id) => {
  try {
    await prisma.competition.delete({
      where: { id },
    });
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
