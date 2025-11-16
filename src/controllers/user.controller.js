// File: /api/src/controllers/user.controller.js

import * as userService from "../services/user.service.js";
import AppError from "../utils/AppError.js";

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export const getAll = asyncHandler(async (req, res) => {
  const users = await userService.getAllUsers();

  // PERBAIKAN: Kembalikan array user langsung
  res.status(200).json(users);
});

export const updateRole = asyncHandler(async (req, res) => {
  const { id: userIdToUpdate } = req.params;
  const { role: newRole } = req.body;
  const currentUserId = req.user.id;

  if (!newRole) {
    throw new AppError("Peran baru (role) wajib diisi", 400);
  }

  const updatedUser = await userService.updateUserRole(
    userIdToUpdate,
    newRole,
    currentUserId
  );

  // PERBAIKAN: Kembalikan objek user yang diupdate
  res.status(200).json(updatedUser);
});
