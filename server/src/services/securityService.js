const failures = new Map();

const MAX_FAILURES = 5;
const LOCK_MS = 15 * 60 * 1000;

export function loginKey(identifier, ip) {
  return `${String(identifier || "").toLowerCase()}:${ip || "unknown"}`;
}

export function isLoginLocked(key) {
  const record = failures.get(key);
  return Boolean(
    record && record.count >= MAX_FAILURES && record.lockedUntil > Date.now(),
  );
}

export function recordLoginFailure(key) {
  const record = failures.get(key) ?? { count: 0, lockedUntil: 0 };
  record.count += 1;
  if (record.count >= MAX_FAILURES) {
    record.lockedUntil = Date.now() + LOCK_MS;
  }
  failures.set(key, record);
}

export function clearLoginFailures(key) {
  failures.delete(key);
}
