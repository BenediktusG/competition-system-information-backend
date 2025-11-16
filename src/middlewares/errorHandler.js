// File: /api/src/middlewares/errorHandler.js

// Middleware ini akan menangani semua error yang dilempar di aplikasi
const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
  });
};

export default globalErrorHandler;
