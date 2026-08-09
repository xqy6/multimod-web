import { Router } from "express";

import {
  loginUser,
  logoutUser,
  me,
  registerUser,
} from "../controllers/authController.js";
import { authMiddleware } from "../middleware/auth.js";
import { createRateLimiter } from "../middleware/rateLimit.js";

const authLimiter = createRateLimiter({ windowMs: 60000, max: 10 });

export const authRouter = Router();

authRouter.post("/register", authLimiter, registerUser);
authRouter.post("/login", authLimiter, loginUser);
authRouter.post("/logout", logoutUser);
authRouter.get("/me", authMiddleware, me);
