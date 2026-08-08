import { promises as fs } from "node:fs";
import cors from "cors";
import express from "express";
import multer from "multer";

import {
  OBJECT_DIR,
  PORT,
  UPLOAD_DIR,
} from "./config.js";
import { closeDb, ensureDemoUser, getDb } from "./db/index.js";
import { authMiddleware } from "./middleware/auth.js";
import { authRouter } from "./routes/authRoutes.js";
import { chunkRouter } from "./routes/chunkRoutes.js";
import { fileRouter } from "./routes/fileRoutes.js";
import { folderRouter } from "./routes/folderRoutes.js";
import { shareRouter } from "./routes/shareRoutes.js";
import { trashRouter } from "./routes/trashRoutes.js";
import { HttpError } from "./utils/httpError.js";

async function main() {
  await fs.mkdir(OBJECT_DIR, { recursive: true });
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  getDb();
  ensureDemoUser();

  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, storage: "object-store + sqlite" });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/folders", authMiddleware, folderRouter);
  app.use("/api/files", authMiddleware, fileRouter);
  app.use("/api/chunks", authMiddleware, chunkRouter);
  app.use("/api/trash", authMiddleware, trashRouter);
  app.use("/api/shares", authMiddleware, shareRouter);

  app.use((req, res) => {
    res.status(404).json({ error: "接口不存在" });
  });

  app.use((error, _req, res, _next) => {
    if (error.status || error.statusCode) {
      return res
        .status(error.status || error.statusCode)
        .json({ error: error.message });
    }
    if (error instanceof HttpError) {
      return res.status(error.status).json({ error: error.message });
    }
    if (error instanceof multer.MulterError) {
      const message =
        error.code === "LIMIT_FILE_SIZE"
          ? "文件超过大小限制"
          : `上传失败：${error.message}`;
      return res.status(400).json({ error: message });
    }
    if (String(error.message).includes("UNIQUE constraint failed")) {
      return res.status(409).json({ error: "同名项目已存在" });
    }
    console.error(error);
    return res.status(500).json({ error: "服务器内部错误" });
  });

  const server = app.listen(PORT, () => {
    console.log(`网盘后端已启动：http://localhost:${PORT}`);
    console.log(`架构：SQLite 元数据 + 对象存储去重 + 分片上传 + 回收站`);
  });

  const shutdown = () => {
    server.close();
    closeDb();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error) => {
  console.error("启动失败", error);
  process.exit(1);
});
