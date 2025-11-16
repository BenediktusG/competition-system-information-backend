// File: /api/src/utils/AppError.js

// Ini adalah kelas kustom untuk error kita
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true; // Error yang kita buat (bukan bug)

    Error.captureStackTrace(this, this.constructor);
  }
}

export default AppError;
