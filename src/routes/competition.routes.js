// File: /api/src/routes/competition.routes.js

import express from "express";
import * as compController from "../controllers/competition.controller.js";
import { isAuthenticated } from "../middlewares/isAuthenticated.js";
import { isAuthorized } from "../middlewares/isAuthorized.js";

const router = express.Router();
const adminOnly = isAuthorized(["ADMIN", "SUPER_ADMIN"]);

// Rute Publik (untuk semua user yang ter-autentikasi)
router.get("/", isAuthenticated, compController.getAllActive);
router.get("/archived", isAuthenticated, compController.getAllArchived);
router.get("/:id", isAuthenticated, compController.getById);

// Rute Admin & Super Admin
router.post("/", isAuthenticated, adminOnly, compController.create);
router.put("/:id", isAuthenticated, adminOnly, compController.update);
router.delete("/:id", isAuthenticated, adminOnly, compController.remove);
router.post("/:id/archive", isAuthenticated, adminOnly, compController.archive);

export default router;
