// File: /api/src/controllers/category.controller.js

import * as categoryService from "../services/category.service.js";
import AppError from "../utils/AppError.js";

// Helper async
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export const getAll = asyncHandler(async (req, res) => {
  const categories = await categoryService.getAllCategories();
  res.status(200).json({
    status: "success",
    data: categories,
  });
});

export const create = asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (!name) {
    throw new AppError("Nama kategori wajib diisi", 400);
  }
  const newCategory = await categoryService.createCategory(name);
  res.status(201).json({
    status: "success",
    data: newCategory,
  });
});

export const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  if (!name) {
    throw new AppError("Nama kategori wajib diisi", 400);
  }
  const updatedCategory = await categoryService.updateCategory(id, name);
  res.status(200).json({
    status: "success",
    data: updatedCategory,
  });
});

export const remove = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await categoryService.deleteCategory(id);
  res.status(204).send(); // 204 No Content
});
