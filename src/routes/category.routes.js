// File: /api/src/routes/category.routes.js

import express from "express";
import * as categoryController from "../controllers/category.controller.js";
import { isAuthenticated } from "../middlewares/isAuthenticated.js";
import { isAuthorized } from "../middlewares/isAuthorized.js";

const router = express.Router();
const adminOnly = isAuthorized(["ADMIN", "SUPER_ADMIN"]);

// Semua pengguna yang login bisa melihat kategori
router.get("/", isAuthenticated, categoryController.getAll);

// Hanya Admin/Super Admin yang bisa memodifikasi
router.post("/", isAuthenticated, adminOnly, categoryController.create);
router.put("/:id", isAuthenticated, adminOnly, categoryController.update);
router.delete("/:id", isAuthenticated, adminOnly, categoryController.remove);

export default router;
