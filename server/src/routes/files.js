import { promises as fs } from "node:fs";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { Router } from "express";
import multer from "multer";

import { MAX_FILE_SIZE_MB } from "../config.js";
import { HttpError } from "../utils/httpError.js";
import {
  joinApiPath,
  normalizeRelative,
  resolveSafe,
  sanitizeFileName,
  validateName,
} from "../utils/pathUtils.js";

export const filesRouter = Router();

function uniqueFile(absolute, name) {
  const parsed = path.parse(name);
  let candidate = path.join(absolute, name);
  let counter = 1;
  while (existsSync(candidate)) {
    candidate = path.join(
      absolute,
      `${parsed.name}-${counter}${parsed.ext}`,
    );
    counter += 1;
  }
  return candidate;
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, callback) => {
      try {
        const { absolute } = resolveSafe(req.query.path);
        mkdirSync(absolute, { recursive: true });
        callback(null, absolute);
      } catch (error) {
        callback(error);
      }
    },
    filename: (req, file, callback) => {
      const name = sanitizeFileName(file.originalname);
      const absolute = resolveSafe(req.query.path).absolute;
      const finalPath = uniqueFile(absolute, name);
      callback(null, path.basename(finalPath));
    },
  }),
  limits: {
    fileSize: MAX_FILE_SIZE_MB * 1024 * 1024,
  },
});

// POST /api/upload?path=/docs  multipart/form-data  field: file
filesRouter.post("/upload", (req, res, next) => {
  upload.single("file")(req, res, async (error) => {
    if (error) return next(error);
    if (!req.file) {
      return next(new HttpError(400, "请选择要上传的文件"));
    }
    const relative = normalizeRelative(req.query.path);
    res.status(201).json({
      message: "上传成功",
      file: {
        name: req.file.filename,
        originalName: req.file.originalname,
        path: joinApiPath(relative, req.file.filename),
        size: req.file.size,
        modifiedAt: new Date().toISOString(),
      },
    });
  });
});

// DELETE /api/files?path=/docs&name=test.txt
filesRouter.delete("/", async (req, res, next) => {
  try {
    const name = validateName(req.query.name);
    const { absolute, relative } = resolveSafe(req.query.path);
    const target = path.join(absolute, name);
    const stat = await fs.lstat(target);
    if (!stat.isFile()) {
      throw new HttpError(400, "目标不是文件");
    }
    await fs.rm(target, { force: false });
    res.json({
      message: "文件删除成功",
      deleted: joinApiPath(relative, name),
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/files/rename?path=/docs&name=a.txt  body: { newName: "b.txt" }
filesRouter.put("/rename", async (req, res, next) => {
  try {
    const oldName = validateName(req.query.name);
    const newName = validateName(req.body?.newName);
    const { absolute, relative } = resolveSafe(req.query.path);
    const source = path.join(absolute, oldName);
    const target = path.join(absolute, newName);

    try {
      await fs.rename(source, target);
    } catch (error) {
      if (error.code === "ENOENT") {
        throw new HttpError(404, "文件不存在");
      }
      if (error.code === "EEXIST") {
        throw new HttpError(409, "同名文件已存在");
      }
      throw error;
    }

    res.json({
      message: "重命名成功",
      file: {
        name: newName,
        path: joinApiPath(relative, newName),
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/files/download?path=/docs&name=test.txt
filesRouter.get("/download", async (req, res, next) => {
  try {
    const name = validateName(req.query.name);
    const { absolute } = resolveSafe(req.query.path);
    const target = path.join(absolute, name);
    const stat = await fs.lstat(target);
    if (!stat.isFile()) {
      throw new HttpError(404, "文件不存在");
    }
    res.download(target, name);
  } catch (error) {
    next(error);
  }
});
