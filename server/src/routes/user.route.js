import express from "express";
import {
  getCurrentUser,
  login,
  logout,
  logoutAllSessions,
  refreshSession,
  register,
} from "../controllers/user.controller.js";
import authRateLimit from "../middlewares/authRateLimit.js";
import requireAuth from "../middlewares/requireAuth.js";

const router = express.Router();

router.post("/register", authRateLimit, register);
router.post("/login", authRateLimit, login);
router.post("/refresh", authRateLimit, refreshSession);
router.post("/logout", logout);
router.post("/logout-all", requireAuth, logoutAllSessions);
router.get("/me", requireAuth, getCurrentUser);

export default router;
