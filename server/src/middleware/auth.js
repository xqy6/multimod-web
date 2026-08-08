import { getDb } from "../db/index.js";

export function authMiddleware(req, _res, next) {
  const database = getDb();
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    const token = header.slice(7);
    const row = database
      .prepare(
        `select users.id, users.username from tokens
         join users on users.id = tokens.user_id
         where tokens.token = ? and tokens.expires_at > ?`,
      )
      .get(token, Date.now());
    if (row) {
      req.user = { id: row.id, username: row.username };
      return next();
    }
  }

  const demo = database
    .prepare("select id, username from users where username = 'demo'")
    .get();
  req.user = { id: demo.id, username: demo.username };
  next();
}
