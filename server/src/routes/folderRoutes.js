import { Router } from "express";

import {
  create,
  list,
  remove,
  rename,
} from "../controllers/folderController.js";

export const folderRouter = Router();

folderRouter.get("/", list);
folderRouter.post("/", create);
folderRouter.put("/", rename);
folderRouter.delete("/", remove);
