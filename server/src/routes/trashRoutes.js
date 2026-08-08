import { Router } from "express";

import {
  list,
  purge,
  restore,
} from "../controllers/trashController.js";

export const trashRouter = Router();

trashRouter.get("/", list);
trashRouter.post("/restore", restore);
trashRouter.delete("/", purge);
