// File: /api/src/routes/competition.routes.js

import express from "express";
import * as compController from "../controllers/competition.controller.js";
import { isAuthenticated } from "../middlewares/isAuthenticated.js";
import { isAuthorized } from "../middlewares/isAuthorized.js";
import upload from "../middlewares/upload.js";

const router = express.Router();
const adminOnly = isAuthorized(["ADMIN", "SUPER_ADMIN"]);

// =================================================================
// 1. Rute List & Static (Urutan Sangat Penting!)
// =================================================================

// Get Lomba Aktif (Status ACCEPTED)
router.get("/", isAuthenticated, compController.getAllActive);

// Get Lomba Arsip
router.get("/archived", isAuthenticated, compController.getAllArchived);

// [BARU] Get Lomba Pending (Khusus Admin)
// PERHATIAN: Harus diletakkan SEBELUM route /:id
// Jika diletakkan di bawah /:id, maka request ke "/admin/pending"
// akan dianggap mencari lomba dengan ID="admin" -> Error 404/500
router.get(
  "/admin/pending",
  isAuthenticated,
  adminOnly,
  compController.getAllPending
);

// =================================================================
// 2. Rute Detail (Dynamic ID)
// =================================================================

router.get("/:id", isAuthenticated, compController.getById);

// =================================================================
// 3. Rute Create / Submission
// =================================================================

// [MODIFIKASI] Create Lomba
// 'adminOnly' DIHAPUS agar Mahasiswa bisa submit pengajuan.
// Logic status (PENDING vs ACCEPTED) ditangani di Service/Controller.
router.post(
  "/",
  isAuthenticated,
  // adminOnly, <--- Dihapus
  upload.single("poster"),
  compController.create
);

// =================================================================
// 4. Rute Admin Actions (Edit, Status, Delete)
// =================================================================

// [BARU] Update Status (Approve/Reject)
router.put(
  "/:id/status",
  isAuthenticated,
  adminOnly,
  compController.updateStatus
);

// Edit Data Lomba (Tetap Admin Only - Mahasiswa tidak bisa edit setelah submit)
router.put(
  "/:id",
  isAuthenticated,
  adminOnly,
  upload.single("poster"),
  compController.update
);

router.delete("/:id", isAuthenticated, adminOnly, compController.remove);
router.post("/:id/archive", isAuthenticated, adminOnly, compController.archive);

export default router;
