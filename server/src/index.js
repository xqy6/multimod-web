import { promises as fs } from "node:fs";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import archiver from "archiver";
import cors from "cors";
import express from "express";
import multer from "multer";

import {
  BACKUP_TOKEN,
  DATA_DIR,
  OBJECT_DIR,
  PORT,
  UPLOAD_DIR,
} from "./config.js";
import { closeDb, ensureAdmin, ensureDemoUser, getDb } from "./db/index.js";
import { authMiddleware } from "./middleware/auth.js";
import { authRouter } from "./routes/authRoutes.js";
import { adminRouter } from "./routes/adminRoutes.js";
import { assetContent, assetRouter } from "./routes/assetRoutes.js";
import { chatRouter } from "./routes/chatRoutes.js";
import { chunkRouter } from "./routes/chunkRoutes.js";
import { fileRouter } from "./routes/fileRoutes.js";
import { folderRouter } from "./routes/folderRoutes.js";
import { lanRouter } from "./routes/lanRoutes.js";
import { profileRouter } from "./routes/profileRoutes.js";
import { projectRouter } from "./routes/projectRoutes.js";
import { scoreRouter } from "./routes/scoreRoutes.js";
import { shareRouter } from "./routes/shareRoutes.js";
import { trashRouter } from "./routes/trashRoutes.js";
import { HttpError } from "./utils/httpError.js";
import { getAnnouncement } from "./services/adminService.js";
import { createRateLimiter } from "./middleware/rateLimit.js";
import { getHealth } from "./utils/health.js";
import {
  closeLogger,
  flushLogs,
  logger,
  reportServerError,
  requestLogger,
} from "./utils/logger.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.resolve(currentDir, "..", "..", "web", "dist");

async function main() {
  await fs.mkdir(OBJECT_DIR, { recursive: true });
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  getDb();
  ensureDemoUser();
  ensureAdmin();

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(requestLogger);
  app.use("/lan", lanRouter);

  app.get("/api/health", (_req, res) => {
    res.json(getHealth());
  });

  app.get("/api/backup/full", (req, res, next) => {
    if (!BACKUP_TOKEN || req.headers.authorization !== `Bearer ${BACKUP_TOKEN}`) {
      return res.status(403).json({ error: "备份令牌无效" });
    }
    try {
      if (!existsSync(DATA_DIR)) {
        return res.status(404).json({ error: "数据目录不存在" });
      }
      res.setHeader("Content-Type", "application/zip");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=netdisk-backup-${new Date()
          .toISOString()
          .replace(/[:.]/g, "-")}.zip`,
      );
      const archive = archiver("zip", { zlib: { level: 9 } });
      archive.on("error", () => res.destroy());
      archive.pipe(res);
      archive.directory(DATA_DIR, false);
      archive.finalize();
    } catch (error) {
      next(error);
    }
  });

  app.post(
    "/api/telemetry",
    createRateLimiter({ windowMs: 60_000, max: 30 }),
    (req, res) => {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const events = Array.isArray(body.events)
      ? body.events.slice(0, 50)
      : [body];
    for (const event of events) {
      if (!event || typeof event !== "object") continue;
      const message =
        typeof event.message === "string"
          ? event.message.slice(0, 2000)
          : "前端错误上报";
      const source = typeof event.source === "string" ? event.source : "web";
      const stack =
        typeof event.stack === "string" ? event.stack.slice(0, 8000) : "";
      reportServerError(new Error(message), {
        originalUrl:
          typeof event.url === "string" ? event.url.slice(0, 2000) : "",
        method: "POST",
      }, {
        source,
        stack,
        level: event.level === "warn" ? "warn" : "error",
        userAgent:
          typeof event.userAgent === "string"
            ? event.userAgent.slice(0, 500)
            : "",
      });
    }
    res.json({ ok: true });
    },
  );

  app.use("/api/auth", authRouter);
  app.use("/api/admin", authMiddleware, adminRouter);
  app.get("/api/announcement", authMiddleware, (_req, res) => {
    res.json({ data: getAnnouncement() });
  });
  app.use("/api/profile", profileRouter);
  app.use("/api/projects", authMiddleware, projectRouter);
  app.use("/api/projects/:projectId/assets", authMiddleware, assetRouter);
  app.use("/api", authMiddleware, chatRouter);
  app.use("/api/scores", authMiddleware, scoreRouter);
  app.use("/api/folders", authMiddleware, folderRouter);
  app.use("/api/files", authMiddleware, fileRouter);
  app.use("/api/chunks", authMiddleware, chunkRouter);
  app.use("/api/trash", authMiddleware, trashRouter);
  app.use("/api/shares", authMiddleware, shareRouter);
  app.get("/api/assets/:id/content", assetContent);

  if (existsSync(path.join(DIST_DIR, "index.html"))) {
    app.use(express.static(DIST_DIR));
    app.use((req, res, next) => {
      if (
        req.method === "GET" &&
        !req.path.startsWith("/api") &&
        req.path !== "/lan" &&
        !req.path.startsWith("/lan/")
      ) {
        return res.sendFile(path.join(DIST_DIR, "index.html"));
      }
      next();
    });
  }

  app.use((req, res) => {
    res.status(404).json({ error: "接口不存在" });
  });

  app.use((error, _req, res, _next) => {
    if (error.status || error.statusCode) {
      reportServerError(error, _req, { handled: true });
      return res
        .status(error.status || error.statusCode)
        .json({ error: error.message });
    }
    if (error instanceof HttpError) {
      reportServerError(error, _req, { handled: true });
      return res.status(error.status).json({ error: error.message });
    }
    if (error instanceof multer.MulterError) {
      const message =
        error.code === "LIMIT_FILE_SIZE"
          ? "文件超过大小限制"
          : `上传失败：${error.message}`;
      reportServerError(error, _req, { handled: true });
      return res.status(400).json({ error: message });
    }
    if (String(error.message).includes("UNIQUE constraint failed")) {
      reportServerError(error, _req, { handled: true });
      return res.status(409).json({ error: "同名项目已存在" });
    }
    reportServerError(error, _req);
    return res.status(500).json({ error: "服务器内部错误" });
  });

  const server = app.listen(PORT, () => {
    logger.info("server started", {
      port: PORT,
      dataDir: DATA_DIR,
    });
  });

  const shutdown = async () => {
    server.close(async () => {
      closeDb();
      await flushLogs();
      await closeLogger();
      process.exit(0);
    });
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error) => {
  console.error("server failed to start", error);
  process.exit(1);
});
