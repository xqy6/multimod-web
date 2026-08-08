import { Router } from "express";

import {
  download,
  remove,
  rename,
  uploadFile,
} from "../controllers/fileController.js";

export const fileRouter = Router();

fileRouter.post("/upload", uploadFile);
fileRouter.put("/rename", rename);
fileRouter.delete("/", remove);
fileRouter.get("/download", download);
