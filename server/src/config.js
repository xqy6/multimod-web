import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

export const PORT = Number(process.env.PORT || 4000);
export const STORAGE_ROOT = path.resolve(
  currentDir,
  "..",
  process.env.STORAGE_ROOT || "storage",
);
export const MAX_FILE_SIZE_MB = Number(
  process.env.MAX_FILE_SIZE_MB || 500,
);
