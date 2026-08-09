import { getDb } from "../db/index.js";
import { TOKEN_TTL_MS } from "../config.js";
import { HttpError } from "../utils/httpError.js";
import { hashPassword, randomToken, verifyPassword } from "../utils/crypto.js";

function issueToken(database, userId) {
  const token = randomToken();
  database
    .prepare("insert into tokens (token, user_id, expires_at) values (?, ?, ?)")
    .run(token, userId, Date.now() + TOKEN_TTL_MS);
  return token;
}

function toUserDto(user) {
  const profile = getDb()
    .prepare("select display_name from profiles where user_id = ?")
    .get(user.id);
  return {
    id: String(user.id),
    email: user.email ?? "",
    display_name:
      profile?.display_name ||
      user.email?.split("@")[0] ||
      user.username ||
      "用户",
    role: user.role ?? "user",
    isAdmin: user.role === "admin",
    isDemo: false,
  };
}

export function register(email, password, displayName) {
  const database = getDb();
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const normalizedPassword = String(password || "");
  const normalizedDisplayName = String(displayName || "").trim();
  if (!normalizedEmail.includes("@")) {
    throw new HttpError(400, "请输入有效的邮箱地址");
  }
  if (normalizedPassword.length < 6) {
    throw new HttpError(400, "密码至少需要 6 位");
  }
  const exists = database
    .prepare("select id from users where username = ?")
    .get(normalizedEmail);
  const emailExists = database
    .prepare("select id from users where lower(email) = lower(?)")
    .get(normalizedEmail);
  if (exists || emailExists) {
    throw new HttpError(409, "该邮箱已注册");
  }
  const result = database
    .prepare(
      "insert into users (username, email, password_hash) values (?, ?, ?)",
    )
    .run(normalizedEmail, normalizedEmail, hashPassword(normalizedPassword));
  const userId = Number(result.lastInsertRowid);
  database
    .prepare("insert into profiles (user_id, display_name) values (?, ?)")
    .run(userId, normalizedDisplayName || normalizedEmail.split("@")[0]);
  const token = issueToken(database, userId);
  const user = database.prepare("select * from users where id = ?").get(userId);
  return { user: toUserDto(user), token };
}

export function login(identifier, password) {
  const database = getDb();
  const normalized = String(identifier || "").trim().toLowerCase();
  const user = database
    .prepare(
      "select * from users where lower(email) = lower(?) or lower(username) = lower(?)",
    )
    .get(normalized, normalized);
  if (!user || !verifyPassword(String(password || ""), user.password_hash)) {
    throw new HttpError(401, "邮箱或密码错误");
  }
  const token = issueToken(database, user.id);
  return { user: toUserDto(user), token };
}

export function logout(token) {
  getDb().prepare("delete from tokens where token = ?").run(token);
}

export function currentUser(userId) {
  const user = getDb().prepare("select * from users where id = ?").get(userId);
  if (!user) throw new HttpError(401, "登录已失效");
  return toUserDto(user);
}
