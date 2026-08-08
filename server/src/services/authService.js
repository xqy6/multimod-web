import { randomToken } from "../utils/crypto.js";
import { hashPassword, verifyPassword } from "../utils/crypto.js";
import { getDb } from "../db/index.js";
import { TOKEN_TTL_MS } from "../config.js";
import { HttpError } from "../utils/httpError.js";

function issueToken(database, userId) {
  const token = randomToken();
  database
    .prepare("insert into tokens (token, user_id, expires_at) values (?, ?, ?)")
    .run(token, userId, Date.now() + TOKEN_TTL_MS);
  return token;
}

export function register(username, password) {
  const database = getDb();
  const exists = database
    .prepare("select id from users where username = ?")
    .get(username);
  if (exists) throw new HttpError(409, "用户名已存在");
  const result = database
    .prepare("insert into users (username, password_hash) values (?, ?)")
    .run(username, hashPassword(password));
  const token = issueToken(database, Number(result.lastInsertRowid));
  return { user: { id: Number(result.lastInsertRowid), username }, token };
}

export function login(username, password) {
  const database = getDb();
  const user = database
    .prepare("select * from users where username = ?")
    .get(username);
  if (!user || !verifyPassword(password, user.password_hash)) {
    throw new HttpError(401, "用户名或密码错误");
  }
  const token = issueToken(database, user.id);
  return { user: { id: user.id, username: user.username }, token };
}

export function logout(token) {
  getDb().prepare("delete from tokens where token = ?").run(token);
}
