// File: /api/src/index.js

import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";

import prisma from "./config/prisma.js";
import globalErrorHandler from "./middlewares/errorHandler.js";

// --- Impor Router ---
import authRouter from "./routes/auth.routes.js";
import categoryRouter from "./routes/category.routes.js"; // BARU
import competitionRouter from "./routes/competition.routes.js"; // BARU
import userRouter from "./routes/user.routes.js"; // BARU

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// --- Middleware ---
app.use(
  cors({
    origin: "http://localhost:3000", // Sesuaikan port frontend Anda
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());

// --- Routes ---
const apiBaseUrl = "/api/v1";

app.get(apiBaseUrl, (req, res) => {
  res.send("Sistem Informasi Lomba API is running...");
});

// Gunakan semua router
app.use(`${apiBaseUrl}/auth`, authRouter);
app.use(`${apiBaseUrl}/categories`, categoryRouter); // BARU
app.use(`${apiBaseUrl}/competitions`, competitionRouter); // BARU
app.use(`${apiBaseUrl}/users`, userRouter); // BARU

// --- Global Error Handler ---
app.use(globalErrorHandler);

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
});
