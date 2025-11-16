// File: /api/src/routes/auth.routes.js

import express from "express";
import * as authController from "../controllers/auth.controller.js";
import { isAuthenticated } from "../middlewares/isAuthenticated.js";

const router = express.Router();

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/logout", authController.logout);

// Endpoint /me ini diproteksi.
// Hanya pengguna yang sudah login (memiliki cookie token valid)
// yang bisa mengaksesnya.
router.get("/me", isAuthenticated, authController.getMe);

export default router;
