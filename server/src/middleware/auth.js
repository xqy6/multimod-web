import { getDb } from "../db/index.js";

function isPublicShare(req) {
  return (
    req.method === "GET" &&
    /^\/api\/shares\/[^/]+(\/download)?$/.test(req.path)
  );
}

function canUseQueryToken(req) {
  return (
    /^\/api\/shares/.test(req.path) ||
    /^\/api\/files\/download/.test(req.path) ||
    /\/events$/.test(req.path) ||
    isPublicShare(req)
  );
}

export function authMiddleware(req, res, next) {
  const database = getDb();
  const header = req.headers.authorization;
  const queryToken =
    canUseQueryToken(req) && typeof req.query.token === "string"
      ? req.query.token
      : null;
  const token = header?.startsWith("Bearer ")
    ? header.slice(7)
    : queryToken;

  if (token) {
    const row = database
      .prepare(
        `select users.id, users.username, users.email, users.role, users.banned from tokens
         join users on users.id = tokens.user_id
         where tokens.token = ? and tokens.expires_at > ?`,
      )
      .get(token, Date.now());
    if (row) {
      if (Number(row.banned)) {
        return res.status(403).json({ error: "账号已被封禁" });
      }
      req.user = {
        id: Number(row.id),
        username: row.username,
        email: row.email ?? "",
        role: row.role ?? "user",
        banned: Number(row.banned || 0),
      };
      return next();
    }
  }

  if (isPublicShare(req)) {
    const demo = database
      .prepare("select id, username, email, role from users where username = 'demo'")
      .get();
    if (demo) {
      req.user = {
        id: Number(demo.id),
        username: demo.username,
        email: demo.email ?? "",
        role: demo.role ?? "user",
      };
      return next();
    }
  }

  res.status(401).json({ error: "请先登录" });
}
