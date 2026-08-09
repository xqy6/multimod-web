import { existsSync } from "node:fs";

import { DB_PATH, OBJECT_DIR, UPLOAD_DIR } from "../config.js";
import { getDb } from "../db/index.js";

const startedAt = Date.now();

export function getHealth() {
  const checks = {
    database: false,
    objectStorage: existsSync(OBJECT_DIR),
    uploads: existsSync(UPLOAD_DIR),
    databaseFile: existsSync(DB_PATH),
  };

  try {
    const row = getDb().prepare("select 1 as ok").get();
    checks.database = Number(row?.ok) === 1;
  } catch {
    checks.database = false;
  }

  const ok = Object.values(checks).every(Boolean);
  return {
    ok,
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
    startedAt: new Date(startedAt).toISOString(),
    version: "1.0.0",
    checks,
  };
}
