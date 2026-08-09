import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

export const PORT = Number(process.env.PORT || 4000);
export const DATA_DIR = path.resolve(
  currentDir,
  "..",
  process.env.DATA_DIR || "data",
);
export const DB_PATH = path.join(DATA_DIR, "netdisk.db");
export const OBJECT_DIR = path.join(DATA_DIR, "objects");
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
export const MAX_FILE_SIZE_MB = Number(
  process.env.MAX_FILE_SIZE_MB || 500,
);
export const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "xieqiyan66";
export const BACKUP_TOKEN = process.env.BACKUP_TOKEN || "";
export const LOG_DIR = path.resolve(
  currentDir,
  "..",
  process.env.LOG_DIR || "logs",
);
export const LOG_LEVEL = process.env.LOG_LEVEL || "info";
export const LOG_WEBHOOK_URL = process.env.LOG_WEBHOOK_URL || "";
export const TELEMETRY_WEBHOOK_URL =
  process.env.TELEMETRY_WEBHOOK_URL || "";
export const BACKUP_KEEP_DAYS = Number(process.env.BACKUP_KEEP_DAYS || 7);
export const BACKUP_S3_ENDPOINT = process.env.BACKUP_S3_ENDPOINT || "";
export const BACKUP_S3_REGION = process.env.BACKUP_S3_REGION || "auto";
export const BACKUP_S3_BUCKET = process.env.BACKUP_S3_BUCKET || "";
export const BACKUP_S3_PREFIX = process.env.BACKUP_S3_PREFIX || "netdisk";
export const BACKUP_S3_ACCESS_KEY = process.env.BACKUP_S3_ACCESS_KEY || "";
export const BACKUP_S3_SECRET_KEY = process.env.BACKUP_S3_SECRET_KEY || "";
export const BACKUP_WEBHOOK_URL = process.env.BACKUP_WEBHOOK_URL || "";
