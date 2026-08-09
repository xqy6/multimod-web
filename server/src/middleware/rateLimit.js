const buckets = new Map();
let cleanupTimer = null;

function scheduleCleanup(windowMs) {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (now > bucket.reset + windowMs) buckets.delete(key);
    }
    if (buckets.size === 0 && cleanupTimer) {
      clearInterval(cleanupTimer);
      cleanupTimer = null;
    }
  }, 60_000);
  cleanupTimer.unref?.();
}

export function createRateLimiter({ windowMs = 60000, max = 30 } = {}) {
  scheduleCleanup(windowMs);
  return (req, res, next) => {
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    const bucket = buckets.get(key) ?? {
      count: 0,
      reset: now + windowMs,
    };
    if (now > bucket.reset) {
      bucket.count = 0;
      bucket.reset = now + windowMs;
    }
    bucket.count += 1;
    if (bucket.count > max) {
      return res.status(429).json({ error: "请求过于频繁，请稍后再试" });
    }
    buckets.set(key, bucket);
    next();
  };
}
