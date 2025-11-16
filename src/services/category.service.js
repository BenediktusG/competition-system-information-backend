// File: /api/src/services/category.service.js

import prisma from "../config/prisma.js";
import AppError from "../utils/AppError.js";

export const getAllCategories = async () => {
  return await prisma.category.findMany({
    orderBy: { name: "asc" },
  });
};

export const createCategory = async (name) => {
  // Cek duplikat
  const existingCategory = await prisma.category.findUnique({
    where: { name },
  });

  if (existingCategory) {
    throw new AppError("Nama kategori sudah ada", 409);
  }

  return await prisma.category.create({
    data: { name },
  });
};

export const updateCategory = async (id, name) => {
  // Cek duplikat (pastikan bukan nama kategori itu sendiri)
  const existingCategory = await prisma.category.findUnique({
    where: { name },
  });

  if (existingCategory && existingCategory.id !== id) {
    throw new AppError("Nama kategori sudah ada", 409);
  }

  try {
    return await prisma.category.update({
      where: { id },
      data: { name },
    });
  } catch (error) {
    // Tangani jika ID tidak ditemukan
    throw new AppError("Kategori tidak ditemukan", 404);
  }
};

export const deleteCategory = async (id) => {
  try {
    await prisma.category.delete({
      where: { id },
    });
    return; // Tidak mengembalikan apa-apa
  } catch (error) {
    throw new AppError("Kategori tidak ditemukan", 404);
  }
};
