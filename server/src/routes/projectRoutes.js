import { Router } from "express";

import {
  createProject,
  deleteProject,
  getProject,
  listProjects,
  updateProject,
} from "../services/platformService.js";

export const projectRouter = Router();

projectRouter.get("/", (req, res, next) => {
  try {
    res.json({ data: listProjects(req.user.id) });
  } catch (error) {
    next(error);
  }
});

projectRouter.post("/", (req, res, next) => {
  try {
    const project = createProject(req.user.id, req.body ?? {});
    res.status(201).json({ data: project });
  } catch (error) {
    next(error);
  }
});

projectRouter.get("/:id", (req, res, next) => {
  try {
    res.json({ data: getProject(req.user.id, req.params.id) });
  } catch (error) {
    next(error);
  }
});

projectRouter.patch("/:id", (req, res, next) => {
  try {
    res.json({
      data: updateProject(req.user.id, req.params.id, req.body ?? {}),
    });
  } catch (error) {
    next(error);
  }
});

projectRouter.delete("/:id", (req, res, next) => {
  try {
    deleteProject(req.user.id, req.params.id);
    res.json({ message: "项目已删除" });
  } catch (error) {
    next(error);
  }
});
