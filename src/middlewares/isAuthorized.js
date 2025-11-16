// File: /api/src/middlewares/isAuthorized.js

import AppError from "../utils/AppError.js";

/**
 * Middleware untuk mengecek peran pengguna.
 * Harus dijalankan SETELAH isAuthenticated.
 * @param {Array<string>} roles - Array berisi peran yang diizinkan (e.g., ['ADMIN', 'SUPER_ADMIN'])
 */
export const isAuthorized = (roles) => {
  return (req, res, next) => {
    // req.user seharusnya sudah ada dari middleware isAuthenticated
    if (!req.user || !roles.includes(req.user.role)) {
      return next(
        new AppError("Anda tidak memiliki izin untuk melakukan aksi ini.", 403) // 403 Forbidden
      );
    }
    next();
  };
};
