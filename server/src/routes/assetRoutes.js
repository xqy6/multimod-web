import { promises as fs } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { Router } from "express";
import multer from "multer";

import { MAX_FILE_SIZE_MB, UPLOAD_DIR } from "../config.js";
import {
  addImageAsset,
  addTextAsset,
  deleteAsset,
  getAssetContent,
  listAssets,
} from "../services/platformService.js";
import { ingestTempFile, objectPath } from "../services/storageService.js";
import { HttpError } from "../utils/httpError.js";

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => {
      fs.mkdir(path.join(UPLOAD_DIR, "tmp"), { recursive: true })
        .then(() => callback(null, path.join(UPLOAD_DIR, "tmp")))
        .catch(callback);
    },
    filename: (_req, _file, callback) => {
      callback(null, `asset-${randomBytes(12).toString("hex")}`);
    },
  }),
  limits: { fileSize: Math.min(MAX_FILE_SIZE_MB, 50) * 1024 * 1024 },
});

const MIME_BY_EXT = {
  avif: "image/avif",
  bmp: "image/bmp",
  gif: "image/gif",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  svg: "image/svg+xml",
  webp: "image/webp",
};

export const assetRouter = Router();

function projectIdFrom(req) {
  const match = req.originalUrl.match(/^\/api\/projects\/([^/]+)\/assets/);
  return match ? decodeURIComponent(match[1]) : req.params.projectId;
}

assetRouter.get("/", (req, res, next) => {
  try {
    res.json({ data: listAssets(req.user.id, projectIdFrom(req)) });
  } catch (error) {
    next(error);
  }
});

assetRouter.post("/text", (req, res, next) => {
  try {
    const { name, content } = req.body ?? {};
    const asset = addTextAsset(
      req.user.id,
      projectIdFrom(req),
      String(name || ""),
      String(content || ""),
    );
    res.status(201).json({ data: asset });
  } catch (error) {
    next(error);
  }
});

assetRouter.post(
  "/image",
  upload.single("file"),
  async (req, res, next) => {
    try {
      if (!req.file) throw new HttpError(400, "请选择要上传的图片");
      const ingested = await ingestTempFile(req.file.path);
      const asset = addImageAsset(
        req.user.id,
        projectIdFrom(req),
        req.file.originalname || "image",
        ingested.storageKey,
      );
      res.status(201).json({ data: asset });
    } catch (error) {
      if (req.file?.path) await fs.rm(req.file.path, { force: true });
      next(error);
    }
  },
);

assetRouter.delete("/:assetId", async (req, res, next) => {
  try {
    await deleteAsset(req.user.id, req.params.assetId);
    res.json({ message: "素材已删除" });
  } catch (error) {
    next(error);
  }
});

export function assetContent(req, res, next) {
  try {
    const asset = getAssetContent(req.params.id);
    const ext = asset.name.split(".").pop()?.toLowerCase() ?? "";
    res.setHeader(
      "Content-Type",
      MIME_BY_EXT[ext] ?? "application/octet-stream",
    );
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.sendFile(objectPath(asset.storage_path), (error) => {
      if (error) next(error);
    });
  } catch (error) {
    next(error);
  }
}
