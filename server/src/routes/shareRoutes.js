import { Router } from "express";

import {
  create,
  downloadShared,
  get,
  list,
  remove,
} from "../controllers/shareController.js";

export const shareRouter = Router();

shareRouter.post("/", create);
shareRouter.get("/", list);
shareRouter.delete("/:id", remove);
shareRouter.get("/:token", get);
shareRouter.get("/:token/download", downloadShared);
