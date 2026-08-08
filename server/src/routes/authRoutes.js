import { Router } from "express";

import {
  loginUser,
  logoutUser,
  registerUser,
} from "../controllers/authController.js";

export const authRouter = Router();

authRouter.post("/register", registerUser);
authRouter.post("/login", loginUser);
authRouter.post("/logout", logoutUser);
