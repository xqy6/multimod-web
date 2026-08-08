import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import multer from "multer";

import { PORT, STORAGE_ROOT } from "./config.js";
import { filesRouter } from "./routes/files.js";
import { foldersRouter } from "./routes/folders.js";
import { HttpError } from "./utils/httpError.js";

const logFile = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "server.log",
);

async function main() {
  await fs.mkdir(STORAGE_ROOT, { recursive: true });

  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, storageRoot: STORAGE_ROOT });
  });

  app.use("/api/folders", foldersRouter);
  app.use("/api/files", filesRouter);

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
    console.error(error);
    void fs.appendFile(
      logFile,
      `${new Date().toISOString()}\n${error.stack}\n`,
    );
    return res.status(500).json({ error: "服务器内部错误" });
  });

  app.listen(PORT, () => {
    console.log(`网盘后端已启动：http://localhost:${PORT}`);
    console.log(`存储目录：${STORAGE_ROOT}`);
  });
}

main().catch((error) => {
  console.error("启动失败", error);
  process.exit(1);
});
