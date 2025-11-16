// File: /api/src/controllers/category.controller.js

import * as categoryService from "../services/category.service.js";
import AppError from "../utils/AppError.js";

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export const getAll = asyncHandler(async (req, res) => {
  const categories = await categoryService.getAllCategories();

  // PERBAIKAN: Kembalikan array langsung
  res.status(200).json(categories);
});

export const create = asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (!name) {
    throw new AppError("Nama kategori wajib diisi", 400);
  }
  const newCategory = await categoryService.createCategory(name);

  // PERBAIKAN: Kembalikan objek kategori baru
  res.status(201).json(newCategory);
});

export const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  if (!name) {
    throw new AppError("Nama kategori wajib diisi", 400);
  }
  const updatedCategory = await categoryService.updateCategory(id, name);

  // PERBAIKAN: Kembalikan objek kategori yang diupdate
  res.status(200).json(updatedCategory);
});

export const remove = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await categoryService.deleteCategory(id);

  // (Sudah Sesuai) Spek meminta 204 No Content
  res.status(204).send();
});
