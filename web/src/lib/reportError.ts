import { serverApiUrl } from "./config";

const QUEUE_KEY = "multimod-error-queue";
const FLUSH_AFTER_MS = 2500;
const MAX_QUEUE = 40;

let queue: Array<Record<string, string>> = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let initialized = false;
let lastSentAt = 0;

function readQueue(): Array<Record<string, string>> {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as Array<Record<string, string>>) : [];
  } catch {
    return [];
  }
}

function persistQueue() {
  try {
    const trimmed = queue.slice(-MAX_QUEUE);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(trimmed));
  } catch {
    // 隐私模式等场景下忽略持久化失败
  }
}

async function flush() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (queue.length === 0 || Date.now() - lastSentAt < 500) return;
  const batch = queue.splice(0, queue.length);
  lastSentAt = Date.now();
  try {
    await fetch(`${serverApiUrl}/api/telemetry`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: batch }),
      signal: AbortSignal.timeout(8000),
    });
    persistQueue();
  } catch {
    queue.unshift(...batch);
    queue = queue.slice(0, MAX_QUEUE);
    persistQueue();
  }
}

function scheduleFlush() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void flush(), FLUSH_AFTER_MS);
}

export function reportError(
  error: unknown,
  context: string,
  extra: Record<string, string> = {},
) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : JSON.stringify(error) || String(error);
  queue.push({
    level: "error",
    source: context,
    message: message.slice(0, 2000),
    stack: error instanceof Error ? (error.stack ?? "").slice(0, 8000) : "",
    url: typeof location !== "undefined" ? location.href.slice(0, 2000) : "",
    userAgent: navigator.userAgent.slice(0, 500),
    time: new Date().toISOString(),
    ...extra,
  });
  queue = queue.slice(-MAX_QUEUE);
  persistQueue();
  scheduleFlush();
}

export function initErrorReporting() {
  if (initialized) return;
  initialized = true;

  const pending = readQueue();
  if (pending.length > 0) {
    queue.push(...pending);
    queue = queue.slice(-MAX_QUEUE);
    scheduleFlush();
  }

  const onError = (event: ErrorEvent) => {
    reportError(event.error ?? event.message, "window.error");
  };
  const onRejection = (event: PromiseRejectionEvent) => {
    reportError(event.reason, "unhandledrejection");
  };

  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);
  window.addEventListener("pagehide", () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    void flush();
  });

  return () => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
  };
}
