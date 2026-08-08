import { promises as fs } from "node:fs";
import path from "node:path";
import multer from "multer";
import { randomBytes } from "node:crypto";

import { UPLOAD_DIR } from "../config.js";
import {
  completeChunkUpload,
  initChunkUpload,
  saveUploadedChunk,
} from "../services/chunkService.js";
import { HttpError } from "../utils/httpError.js";

const chunkUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => {
      fs.mkdir(path.join(UPLOAD_DIR, "tmp"), { recursive: true })
        .then(() => callback(null, path.join(UPLOAD_DIR, "tmp")))
        .catch(callback);
    },
    filename: (_req, _file, callback) => {
      callback(null, `chunk-${randomBytes(12).toString("hex")}`);
    },
  }),
});

export function init(req, res, next) {
  try {
    res.json(initChunkUpload(req.user.id, req.query.path, req.body ?? {}));
  } catch (error) {
    next(error);
  }
}

export function upload(req, res, next) {
  chunkUpload.single("chunk")(req, res, async (error) => {
    if (error) return next(error);
    if (!req.file) return next(new HttpError(400, "缺少分片文件"));
    try {
      const result = await saveUploadedChunk(
        req.body.uploadId,
        req.body.index,
        req.file.path,
      );
      res.json(result);
    } catch (saveError) {
      await fs.rm(req.file.path, { force: true });
      next(saveError);
    }
  });
}

export async function complete(req, res, next) {
  try {
    const result = await completeChunkUpload(req.user.id, req.body.uploadId);
    res.json({ message: "上传完成", ...result });
  } catch (error) {
    next(error);
  }
}
