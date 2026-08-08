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
