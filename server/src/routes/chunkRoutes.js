import { Router } from "express";

import {
  complete,
  init,
  upload,
} from "../controllers/chunkController.js";

export const chunkRouter = Router();

chunkRouter.post("/init", init);
chunkRouter.post("/upload", upload);
chunkRouter.post("/complete", complete);
