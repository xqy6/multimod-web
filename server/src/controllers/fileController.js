import { promises as fs } from "node:fs";
import path from "node:path";
import multer from "multer";
import { randomBytes } from "node:crypto";

import { MAX_FILE_SIZE_MB, UPLOAD_DIR } from "../config.js";
import { createNode } from "../repositories/nodeRepository.js";
import {
  deleteFile,
  findFile,
  renameFile,
  resolveParent,
} from "../services/nodeService.js";
import { ingestTempFile, objectPath } from "../services/storageService.js";
import { HttpError } from "../utils/httpError.js";
import { validateName } from "../utils/pathUtils.js";

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => {
      fs.mkdir(path.join(UPLOAD_DIR, "tmp"), { recursive: true })
        .then(() => callback(null, path.join(UPLOAD_DIR, "tmp")))
        .catch(callback);
    },
    filename: (_req, _file, callback) => {
      callback(null, `tmp-${randomBytes(12).toString("hex")}`);
    },
  }),
  limits: { fileSize: MAX_FILE_SIZE_MB * 1024 * 1024 },
});

export function uploadFile(req, res, next) {
  upload.single("file")(req, res, async (error) => {
    if (error) return next(error);
    if (!req.file) return next(new HttpError(400, "请选择要上传的文件"));
    try {
      const ingested = await ingestTempFile(req.file.path);
      const { parentId, segments } = resolveParent(req.user.id, req.query.path);
      const node = createNode({
        userId: req.user.id,
        parentId,
        name: path.basename(req.file.originalname),
        kind: "file",
        size: ingested.size,
        mimeType: req.file.mimetype,
        sha256: ingested.sha256,
        storageKey: ingested.storageKey,
      });
      res.status(201).json({
        message: "上传成功",
        file: {
          name: node.name,
          originalName: path.basename(req.file.originalname),
          path: `${segments.length ? `/${segments.join("/")}` : ""}/${node.name}`,
          size: node.size,
          modifiedAt: node.updated_at,
        },
      });
    } catch (ingestError) {
      await fs.rm(req.file.path, { force: true });
      next(ingestError);
    }
  });
}

export function rename(req, res, next) {
  try {
    const oldName = validateName(req.query.name);
    const newName = validateName(req.body?.newName);
    const result = renameFile(req.user.id, req.query.path, oldName, newName);
    res.json({ message: "重命名成功", ...result });
  } catch (error) {
    next(error);
  }
}

export function remove(req, res, next) {
  try {
    const name = validateName(req.query.name);
    const result = deleteFile(req.user.id, req.query.path, name);
    res.json({ message: "已移入回收站", ...result });
  } catch (error) {
    next(error);
  }
}

export function download(req, res, next) {
  try {
    const name = validateName(req.query.name);
    const { node } = findFile(req.user.id, req.query.path, name);
    if (!node.storage_key) {
      throw new HttpError(404, "文件内容不存在");
    }
    res.download(objectPath(node.storage_key), node.name);
  } catch (error) {
    next(error);
  }
}
