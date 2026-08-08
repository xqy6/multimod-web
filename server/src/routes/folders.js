import { promises as fs } from "node:fs";
import path from "node:path";
import { Router } from "express";

import { HttpError } from "../utils/httpError.js";
import {
  joinApiPath,
  normalizeRelative,
  resolveSafe,
  validateName,
} from "../utils/pathUtils.js";

export const foldersRouter = Router();

// GET /api/folders?path=/docs
foldersRouter.get("/", async (req, res, next) => {
  try {
    const { relative, absolute } = resolveSafe(req.query.path);
    const stat = await fs.stat(absolute);
    if (!stat.isDirectory()) {
      throw new HttpError(400, "目标不是文件夹");
    }

    const entries = await fs.readdir(absolute, { withFileTypes: true });
    const folders = [];
    const files = [];

    for (const entry of entries) {
      const entryAbsolute = path.join(absolute, entry.name);
      const entryStat = await fs.lstat(entryAbsolute);
      if (entryStat.isSymbolicLink()) continue;
      const apiPath = joinApiPath(relative, entry.name);
      if (entryStat.isDirectory()) {
        folders.push({
          name: entry.name,
          path: apiPath,
          modifiedAt: entryStat.mtime.toISOString(),
        });
      } else if (entryStat.isFile()) {
        files.push({
          name: entry.name,
          path: apiPath,
          size: entryStat.size,
          modifiedAt: entryStat.mtime.toISOString(),
        });
      }
    }

    folders.sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
    files.sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));

    res.json({
      path: `/${relative}`,
      folders,
      files,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/folders?path=/docs  body: { name: "新建文件夹" }
foldersRouter.post("/", async (req, res, next) => {
  try {
    const name = validateName(req.body?.name);
    const { absolute } = resolveSafe(req.query.path);
    const stat = await fs.stat(absolute);
    if (!stat.isDirectory()) {
      throw new HttpError(400, "父目录不是文件夹");
    }

    const target = path.join(absolute, name);
    try {
      await fs.mkdir(target);
    } catch (error) {
      if (error.code === "EEXIST") {
        throw new HttpError(409, "同名文件夹已存在");
      }
      throw error;
    }

    res.status(201).json({
      message: "文件夹创建成功",
      folder: {
        name,
        path: joinApiPath(normalizeRelative(req.query.path), name),
      },
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/folders?path=/docs  body: { newName: "资料" }
foldersRouter.put("/", async (req, res, next) => {
  try {
    const { relative, absolute } = resolveSafe(req.query.path);
    if (!relative) {
      throw new HttpError(400, "不能重命名根目录");
    }
    const newName = validateName(req.body?.newName);
    const parent = path.dirname(absolute);
    const target = path.join(parent, newName);

    try {
      await fs.rename(absolute, target);
    } catch (error) {
      if (error.code === "ENOENT") {
        throw new HttpError(404, "文件夹不存在");
      }
      if (error.code === "EEXIST") {
        throw new HttpError(409, "同名文件夹已存在");
      }
      throw error;
    }

    res.json({
      message: "重命名成功",
      folder: {
        name: newName,
        path: joinApiPath(
          path.dirname(relative) === "." ? "" : path.dirname(relative),
          newName,
        ),
      },
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/folders?path=/docs
foldersRouter.delete("/", async (req, res, next) => {
  try {
    const { relative, absolute } = resolveSafe(req.query.path);
    if (!relative) {
      throw new HttpError(400, "不能删除根目录");
    }

    try {
      await fs.rm(absolute, { recursive: true, force: false });
    } catch (error) {
      if (error.code === "ENOENT") {
        throw new HttpError(404, "文件夹不存在");
      }
      throw error;
    }

    res.json({ message: "删除成功", deleted: `/${relative}` });
  } catch (error) {
    next(error);
  }
});
