import { createWriteStream, existsSync, mkdirSync } from "node:fs";
import path from "node:path";

import {
  LOG_DIR,
  LOG_LEVEL,
  LOG_WEBHOOK_URL,
  TELEMETRY_WEBHOOK_URL,
} from "../config.js";

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const currentLevel = LEVELS[LOG_LEVEL] ?? LEVELS.info;
const queue = [];
let stream;

function ensureStream() {
  if (stream) return stream;
  mkdirSync(LOG_DIR, { recursive: true });
  const file = path.join(LOG_DIR, "server.log");
  stream = createWriteStream(file, { flags: "a" });
  stream.on("error", () => {
    stream = undefined;
  });
  return stream;
}

async function sendWebhook(payload) {
  if (!LOG_WEBHOOK_URL) return;
  try {
    await fetch(LOG_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // Webhook 不可用时不阻塞业务
  }
}

function write(level, message, fields = {}) {
  if (LEVELS[level] < currentLevel) return;
  const entry = {
    level,
    time: new Date().toISOString(),
    message,
    ...fields,
  };
  const line = JSON.stringify(entry);
  if (level === "error") {
    console.error(line);
  } else {
    console.log(line);
  }
  try {
    ensureStream().write(`${line}\n`);
  } catch {
    // 磁盘异常时仍保持 stdout 日志
  }
  queue.push(entry);
  if (queue.length >= 20) {
    void flushLogs();
  }
}

export async function flushLogs() {
  if (queue.length === 0) return;
  const batch = queue.splice(0, queue.length);
  await sendWebhook({ type: "server.logs", logs: batch });
}

export const logger = {
  debug(message, fields) {
    write("debug", message, fields);
  },
  info(message, fields) {
    write("info", message, fields);
  },
  warn(message, fields) {
    write("warn", message, fields);
  },
  error(message, fields) {
    write("error", message, fields);
  },
};

export function requestLogger(req, res, next) {
  const startedAt = Date.now();
  req.requestId =
    req.headers["x-request-id"] || crypto.randomUUID().slice(0, 8);
  res.on("finish", () => {
    write("info", "request", {
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Date.now() - startedAt,
      ip: req.ip,
    });
  });
  next();
}

export function reportServerError(error, req, fields = {}) {
  const status = error?.status || error?.statusCode || 500;
  const message = error?.message || String(error);
  const detail = {
    requestId: req?.requestId,
    method: req?.method,
    path: req?.originalUrl,
    status,
    stack: error?.stack || "",
  };
  write("error", message, { ...fields, ...detail });
  const webhook = TELEMETRY_WEBHOOK_URL || LOG_WEBHOOK_URL;
  if (webhook) {
    void fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "server.error", level: "error", ...detail }),
      signal: AbortSignal.timeout(5000),
    }).catch(() => {});
  }
}

export function closeLogger() {
  return new Promise((resolve) => {
    if (!stream) return resolve();
    stream.end(() => resolve());
    stream = undefined;
  });
}
