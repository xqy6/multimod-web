import { getDb } from "../db/index.js";
import { HttpError } from "../utils/httpError.js";

export function getStats() {
  const database = getDb();
  const count = (table) =>
    Number(database.prepare(`select count(*) as count from ${table}`).get().count);
  return {
    users: count("users"),
    projects: count("projects"),
    rooms: count("rooms"),
    messages: count("messages"),
    scores: count("scores"),
    files: count("nodes where kind = 'file'"),
  };
}

export function listUsers() {
  return getDb()
    .prepare(
      `select u.id, u.username, u.email, u.role, u.banned, u.created_at, p.display_name
       from users u
       left join profiles p on p.user_id = u.id
       order by u.created_at desc`,
    )
    .all()
    .map((row) => ({
      id: String(row.id),
      username: row.username,
      email: row.email ?? "",
      role: row.role ?? "user",
      banned: Boolean(Number(row.banned || 0)),
      display_name: row.display_name ?? "",
      created_at: row.created_at,
    }));
}

export function deleteUser(adminUserId, targetUserId) {
  const id = Number(targetUserId);
  if (id === Number(adminUserId)) {
    throw new HttpError(400, "不能删除当前管理员账号");
  }
  const target = getDb().prepare("select * from users where id = ?").get(id);
  if (!target) throw new HttpError(404, "用户不存在");
  if (target.role === "admin") {
    throw new HttpError(400, "不能删除管理员账号");
  }

  const database = getDb();
  database.exec("BEGIN");
  try {
    database.prepare("delete from messages where user_id = ?").run(id);
    database.prepare("delete from room_members where user_id = ?").run(id);
    database.prepare("delete from scores where user_id = ?").run(id);
    database.prepare("delete from assets where owner_id = ?").run(id);
    database.prepare("delete from projects where owner_id = ?").run(id);
    database.prepare("delete from profiles where user_id = ?").run(id);
    database.prepare("delete from tokens where user_id = ?").run(id);
    database.prepare("delete from nodes where user_id = ?").run(id);
    database.prepare("delete from shares where user_id = ?").run(id);
    database.prepare("delete from users where id = ?").run(id);
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

export function listProjects() {
  return getDb()
    .prepare(
      `select p.*, u.email, pr.display_name
       from projects p
       left join users u on u.id = p.owner_id
       left join profiles pr on pr.user_id = p.owner_id
       order by p.updated_at desc`,
    )
    .all()
    .map((row) => ({
      id: row.id,
      title: row.title,
      vibe_prompt: row.vibe_prompt,
      status: row.status,
      owner_id: String(row.owner_id),
      owner_email: row.email ?? "",
      owner_name: row.display_name ?? "",
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
}

export function deleteProject(projectId) {
  const database = getDb();
  const project = database
    .prepare("select * from projects where id = ?")
    .get(projectId);
  if (!project) throw new HttpError(404, "项目不存在");
  database.exec("BEGIN");
  try {
    database.prepare("delete from assets where project_id = ?").run(projectId);
    database.prepare("delete from projects where id = ?").run(projectId);
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

export function listRooms() {
  return getDb()
    .prepare(
      `select r.*, u.email, pr.display_name,
        (select count(*) from room_members rm where rm.room_id = r.id) as member_count,
        (select count(*) from messages m where m.room_id = r.id) as message_count
       from rooms r
       left join users u on u.id = r.created_by
       left join profiles pr on pr.user_id = r.created_by
       order by r.created_at desc`,
    )
    .all()
    .map((row) => ({
      id: row.id,
      name: row.name,
      created_by: String(row.created_by),
      owner_email: row.email ?? "",
      owner_name: row.display_name ?? "",
      member_count: Number(row.member_count),
      message_count: Number(row.message_count),
      created_at: row.created_at,
    }));
}

export function deleteRoom(roomId) {
  const database = getDb();
  const room = database.prepare("select * from rooms where id = ?").get(roomId);
  if (!room) throw new HttpError(404, "房间不存在");
  database.exec("BEGIN");
  try {
    database.prepare("delete from messages where room_id = ?").run(roomId);
    database.prepare("delete from room_members where room_id = ?").run(roomId);
    database.prepare("delete from rooms where id = ?").run(roomId);
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

export function listAdminMessages(roomId = null, limit = 100) {
  const database = getDb();
  const rows = roomId
    ? database
        .prepare(
          `select m.*, u.email, p.display_name
           from messages m
           left join users u on u.id = m.user_id
           left join profiles p on p.user_id = m.user_id
           where m.room_id = ?
           order by m.created_at desc
           limit ?`,
        )
        .all(roomId, limit)
    : database
        .prepare(
          `select m.*, u.email, p.display_name
           from messages m
           left join users u on u.id = m.user_id
           left join profiles p on p.user_id = m.user_id
           order by m.created_at desc
           limit ?`,
        )
        .all(limit);
  return rows.map((row) => ({
    id: row.id,
    room_id: row.room_id,
    user_id: String(row.user_id),
    body: row.body,
    created_at: row.created_at,
    email: row.email ?? "",
    display_name: row.display_name ?? "",
  }));
}

export function deleteAdminMessages(ids) {
  const database = getDb();
  const list = Array.isArray(ids) ? ids.filter(Boolean) : [];
  if (list.length === 0) throw new HttpError(400, "请选择要删除的消息");
  database.exec("BEGIN");
  try {
    for (const id of list) {
      database.prepare("delete from messages where id = ?").run(String(id));
    }
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

export function setUserBanned(adminUserId, targetUserId, banned) {
  const id = Number(targetUserId);
  if (id === Number(adminUserId)) {
    throw new HttpError(400, "不能封禁当前管理员账号");
  }
  const target = getDb().prepare("select * from users where id = ?").get(id);
  if (!target) throw new HttpError(404, "用户不存在");
  if (target.role === "admin") {
    throw new HttpError(400, "不能封禁管理员账号");
  }
  getDb()
    .prepare("update users set banned = ? where id = ?")
    .run(banned ? 1 : 0, id);
}

export function getAnnouncement() {
  const row = getDb()
    .prepare("select value from settings where key = 'announcement'")
    .get();
  return row?.value ?? "";
}

export function setAnnouncement(value) {
  getDb()
    .prepare(
      `insert into settings (key, value) values ('announcement', ?)
       on conflict(key) do update set value = excluded.value`,
    )
    .run(String(value || ""));
}

export function exportBackup() {
  const database = getDb();
  const all = (sql) => database.prepare(sql).all();
  return {
    exported_at: new Date().toISOString(),
    users: all("select * from users"),
    projects: all("select * from projects"),
    assets: all("select * from assets"),
    rooms: all("select * from rooms"),
    room_members: all("select * from room_members"),
    messages: all("select * from messages"),
    scores: all("select * from scores"),
    settings: all("select * from settings"),
  };
}
