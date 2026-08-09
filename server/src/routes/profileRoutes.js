import { promises as fs } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { Router } from "express";
import multer from "multer";

import { MAX_FILE_SIZE_MB, UPLOAD_DIR } from "../config.js";
import { authMiddleware } from "../middleware/auth.js";
import {
  avatarFilePath,
  getProfile,
  saveAvatar,
  updateProfile,
} from "../services/profileService.js";
import { HttpError } from "../utils/httpError.js";

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => {
      fs.mkdir(path.join(UPLOAD_DIR, "tmp"), { recursive: true })
        .then(() => callback(null, path.join(UPLOAD_DIR, "tmp")))
        .catch(callback);
    },
    filename: (_req, _file, callback) => {
      callback(null, `avatar-${randomBytes(12).toString("hex")}`);
    },
  }),
  limits: { fileSize: Math.min(MAX_FILE_SIZE_MB, 10) * 1024 * 1024 },
});

export const profileRouter = Router();

profileRouter.get("/:userId/avatar", (req, res, next) => {
  try {
    const profile = getProfile(Number(req.params.userId));
    if (!profile?.avatar_key) {
      throw new HttpError(404, "头像不存在");
    }
    res.setHeader("Content-Type", profile.avatar_mime || "image/png");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.sendFile(avatarFilePath(profile), (error) => {
      if (error) next(error);
    });
  } catch (error) {
    next(error);
  }
});

profileRouter.use(authMiddleware);

profileRouter.put("/", (req, res, next) => {
  try {
    const profile = updateProfile(req.user.id, req.body?.displayName);
    res.json({ profile, message: "资料已保存" });
  } catch (error) {
    next(error);
  }
});

profileRouter.post("/avatar", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) throw new HttpError(400, "请选择要上传的图片");
    const result = await saveAvatar(
      req.user.id,
      req.file.path,
      req.file.mimetype,
    );
    res.json({ message: "头像已更新", ...result });
  } catch (error) {
    if (req.file?.path) await fs.rm(req.file.path, { force: true });
    next(error);
  }
});
