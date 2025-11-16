// File: /api/src/routes/user.routes.js

import express from "express";
import * as userController from "../controllers/user.controller.js";
import { isAuthenticated } from "../middlewares/isAuthenticated.js";
import { isAuthorized } from "../middlewares/isAuthorized.js";

const router = express.Router();

// Semua rute di sini HANYA untuk SUPER_ADMIN
router.use(isAuthenticated, isAuthorized(["SUPER_ADMIN"]));

router.get("/", userController.getAll);
router.put("/:id/role", userController.updateRole);

export default router;
