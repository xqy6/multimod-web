import { randomUUID } from "node:crypto";
import { existsSync, promises as fs } from "node:fs";

import { getDb } from "../db/index.js";
import { objectPath } from "./storageService.js";
import { HttpError } from "../utils/httpError.js";

const MAX_ROOMS_PER_USER = 10;

function parseJson(value, fallback) {
  try {
    return value === null || value === undefined ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
}

function projectDto(row) {
  return {
    id: row.id,
    owner_id: String(row.owner_id),
    title: row.title,
    vibe_prompt: row.vibe_prompt,
    style_params: parseJson(row.style_params, {}),
    modules: parseJson(row.modules, []),
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function roomDto(row) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    created_by: String(row.created_by),
    created_at: row.created_at,
    member_count: Number(row.member_count ?? 0),
  };
}

function memberDto(row) {
  return {
    room_id: row.room_id,
    user_id: String(row.user_id),
    display_name: row.display_name ?? "",
    role: row.role,
    joined_at: row.joined_at,
    last_read_at: row.last_read_at ?? null,
  };
}

function messageDto(row) {
  return {
    id: row.id,
    room_id: row.room_id,
    user_id: String(row.user_id),
    body: row.body,
    display_name: row.display_name ?? "",
    created_at: row.created_at,
  };
}

function scoreDto(row) {
  return {
    id: row.id,
    game_id: row.game_id,
    user_id: String(row.user_id),
    score: Number(row.score),
    created_at: row.created_at,
    display_name: row.display_name ?? "",
  };
}

function ensureProject(userId, projectId) {
  const row = getDb()
    .prepare("select * from projects where id = ? and owner_id = ?")
    .get(projectId, userId);
  if (!row) throw new HttpError(404, "项目不存在");
  return row;
}

export function listProjects(userId) {
  return getDb()
    .prepare(
      "select * from projects where owner_id = ? order by updated_at desc",
    )
    .all(userId)
    .map(projectDto);
}

export function createProject(userId, input) {
  const id = randomUUID();
  getDb()
    .prepare(
      `insert into projects
       (id, owner_id, title, vibe_prompt, style_params, modules, status)
       values (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      userId,
      String(input.title || "").trim() || "未命名项目",
      String(input.vibe_prompt || ""),
      JSON.stringify(input.style_params || {}),
      JSON.stringify(Array.isArray(input.modules) ? input.modules : []),
      "draft",
    );
  return getProject(userId, id);
}

export function getProject(userId, projectId) {
  return projectDto(ensureProject(userId, projectId));
}

export function updateProject(userId, projectId, patch) {
  ensureProject(userId, projectId);
  const allowed = ["title", "vibe_prompt", "status"];
  const updates = [];
  const values = [];
  for (const key of allowed) {
    if (patch[key] !== undefined) {
      updates.push(`${key} = ?`);
      values.push(patch[key]);
    }
  }
  if (patch.modules !== undefined) {
    updates.push("modules = ?");
    values.push(JSON.stringify(patch.modules));
  }
  if (patch.style_params !== undefined) {
    updates.push("style_params = ?");
    values.push(JSON.stringify(patch.style_params));
  }
  if (updates.length > 0) {
    updates.push("updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')");
    values.push(projectId, userId);
    getDb()
      .prepare(
        `update projects set ${updates.join(", ")} where id = ? and owner_id = ?`,
      )
      .run(...values);
  }
  return getProject(userId, projectId);
}

export function deleteProject(userId, projectId) {
  ensureProject(userId, projectId);
  getDb()
    .prepare("delete from projects where id = ? and owner_id = ?")
    .run(projectId, userId);
}

export function listAssets(userId, projectId) {
  ensureProject(userId, projectId);
  return getDb()
    .prepare(
      "select * from assets where project_id = ? and owner_id = ? order by created_at asc",
    )
    .all(projectId, userId)
    .map((row) => assetDto(row));
}

function assetDto(row) {
  return {
    id: row.id,
    project_id: row.project_id,
    owner_id: String(row.owner_id),
    kind: row.kind,
    name: row.name,
    storage_path: row.storage_path,
    content: row.content,
    created_at: row.created_at,
    dataUrl:
      row.kind === "image" && row.storage_path
        ? `/api/assets/${row.id}/content`
        : undefined,
  };
}

export function addTextAsset(userId, projectId, name, content) {
  ensureProject(userId, projectId);
  const id = randomUUID();
  getDb()
    .prepare(
      `insert into assets (id, project_id, owner_id, kind, name, content)
       values (?, ?, ?, 'text', ?, ?)`,
    )
    .run(id, projectId, userId, String(name || ""), String(content || ""));
  return assetDto(getDb().prepare("select * from assets where id = ?").get(id));
}

export function addImageAsset(userId, projectId, name, storagePath) {
  ensureProject(userId, projectId);
  const id = randomUUID();
  getDb()
    .prepare(
      `insert into assets (id, project_id, owner_id, kind, name, storage_path)
       values (?, ?, ?, 'image', ?, ?)`,
    )
    .run(id, projectId, userId, String(name || "image"), storagePath);
  return assetDto(getDb().prepare("select * from assets where id = ?").get(id));
}

export async function deleteAsset(userId, assetId) {
  const row = getDb()
    .prepare("select * from assets where id = ? and owner_id = ?")
    .get(assetId, userId);
  if (!row) throw new HttpError(404, "素材不存在");
  getDb().prepare("delete from assets where id = ?").run(assetId);
  if (row.storage_path) {
    const count = getDb()
      .prepare("select count(*) as count from assets where storage_path = ?")
      .get(row.storage_path).count;
    if (count === 0) {
      const target = objectPath(row.storage_path);
      if (existsSync(target)) await fs.rm(target, { force: true });
    }
  }
}

export function getAssetContent(assetId) {
  const row = getDb().prepare("select * from assets where id = ?").get(assetId);
  if (!row?.storage_path) throw new HttpError(404, "图片不存在");
  return row;
}

export function listRooms() {
  return getDb()
    .prepare(
      `select r.*, (
         select count(*) from room_members rm where rm.room_id = r.id
       ) as member_count
       from rooms r
       where r.is_public = 1
       order by r.created_at desc`,
    )
    .all()
    .map(roomDto);
}

function ensureRoom(roomId) {
  const row = getDb().prepare("select * from rooms where id = ?").get(roomId);
  if (!row) throw new HttpError(404, "房间不存在");
  return row;
}

export function createRoom(userId, name) {
  const roomCount = getDb()
    .prepare("select count(*) as count from rooms where created_by = ?")
    .get(userId).count;
  if (Number(roomCount) >= MAX_ROOMS_PER_USER) {
    throw new HttpError(400, `每个用户最多创建 ${MAX_ROOMS_PER_USER} 个房间`);
  }
  const id = randomUUID();
  getDb()
    .prepare("insert into rooms (id, name, created_by) values (?, ?, ?)")
    .run(id, String(name || "").trim() || "新房间", userId);
  getDb()
    .prepare(
      "insert into room_members (room_id, user_id, role) values (?, ?, 'admin')",
    )
    .run(id, userId);
  const row = getDb().prepare("select * from rooms where id = ?").get(id);
  return roomDto({ ...row, member_count: 1 });
}

export function joinRoom(userId, roomId) {
  ensureRoom(roomId);
  getDb()
    .prepare(
      `insert into room_members (room_id, user_id, role)
       values (?, ?, 'member')
       on conflict(room_id, user_id) do nothing`,
    )
    .run(roomId, userId);
}

export function leaveRoom(userId, roomId) {
  ensureRoom(roomId);
  getDb()
    .prepare("delete from room_members where room_id = ? and user_id = ?")
    .run(roomId, userId);
}

export function listMembers(roomId) {
  ensureRoom(roomId);
  return getDb()
    .prepare(
      `select rm.room_id, rm.user_id, rm.role, rm.joined_at, rm.last_read_at, p.display_name
       from room_members rm
       left join profiles p on p.user_id = rm.user_id
       where rm.room_id = ?
       order by rm.joined_at asc`,
    )
    .all(roomId)
    .map(memberDto);
}

export function listMessages(roomId, before = null, limit = 200) {
  ensureRoom(roomId);
  const database = getDb();
  const rows = before
    ? database
        .prepare(
          `select m.*, p.display_name
           from messages m
           left join profiles p on p.user_id = m.user_id
           where m.room_id = ? and m.created_at < ?
           order by m.created_at desc
           limit ?`,
        )
        .all(roomId, before, limit)
    : database
        .prepare(
          `select m.*, p.display_name
           from messages m
           left join profiles p on p.user_id = m.user_id
           where m.room_id = ?
           order by m.created_at asc
           limit ?`,
        )
        .all(roomId, limit);
  return (before ? rows.reverse() : rows).map(messageDto);
}

export function searchMessages(roomId, query, limit = 50) {
  ensureRoom(roomId);
  const term = String(query || "").trim();
  if (!term) return [];
  const rows = getDb()
    .prepare(
      `select m.*, p.display_name
       from messages m
       left join profiles p on p.user_id = m.user_id
       where m.room_id = ? and m.body like ?
       order by m.created_at desc, m.id desc
       limit ?`,
    )
    .all(roomId, `%${term}%`, limit);
  return rows.reverse().map(messageDto);
}

export function getMessageContext(roomId, messageId) {
  ensureRoom(roomId);
  const target = getDb()
    .prepare(
      `select m.*, p.display_name
       from messages m
       left join profiles p on p.user_id = m.user_id
       where m.id = ? and m.room_id = ?`,
    )
    .get(messageId, roomId);
  if (!target) throw new HttpError(404, "message not found");
  const before = getDb()
    .prepare(
      `select m.*, p.display_name
       from messages m
       left join profiles p on p.user_id = m.user_id
       where m.room_id = ? and
             (m.created_at < ? or (m.created_at = ? and m.id < ?))
       order by m.created_at desc, m.id desc
       limit 40`,
    )
    .all(roomId, target.created_at, target.created_at, target.id)
    .reverse()
    .map(messageDto);
  const after = getDb()
    .prepare(
      `select m.*, p.display_name
       from messages m
       left join profiles p on p.user_id = m.user_id
       where m.room_id = ? and
             (m.created_at > ? or (m.created_at = ? and m.id > ?))
       order by m.created_at asc, m.id asc
       limit 20`,
    )
    .all(roomId, target.created_at, target.created_at, target.id)
    .map(messageDto);
  return { target: messageDto(target), before, after };
}

export function deleteMessages(userId, roomId, messageIds) {
  ensureRoom(roomId);
  const ids = [
    ...new Set(Array.isArray(messageIds) ? messageIds.map(String) : []),
  ].slice(0, 500);
  if (ids.length === 0) return { deleted: 0 };
  const placeholders = ids.map(() => "?").join(",");
  const result = getDb()
    .prepare(
      `delete from messages
       where room_id = ? and user_id = ? and id in (${placeholders})`,
    )
    .run(roomId, userId, ...ids);
  return { deleted: Number(result.changes) };
}

export function clearMyMessages(userId, roomId) {
  ensureRoom(roomId);
  const result = getDb()
    .prepare("delete from messages where room_id = ? and user_id = ?")
    .run(roomId, userId);
  return { deleted: Number(result.changes) };
}

export function sendMessage(userId, roomId, body) {
  ensureRoom(roomId);
  const isMember = getDb()
    .prepare("select 1 from room_members where room_id = ? and user_id = ?")
    .get(roomId, userId);
  if (!isMember) throw new HttpError(403, "请先加入房间");
  const id = randomUUID();
  getDb()
    .prepare(
      "insert into messages (id, room_id, user_id, body) values (?, ?, ?, ?)",
    )
    .run(id, roomId, userId, String(body || ""));
  const row = getDb()
    .prepare(
      `select m.*, p.display_name
       from messages m
       left join profiles p on p.user_id = m.user_id
       where m.id = ?`,
    )
    .get(id);
  return messageDto(row);
}

export function deleteMessage(userId, messageId) {
  const row = getDb()
    .prepare("select * from messages where id = ? and user_id = ?")
    .get(messageId, userId);
  if (!row) throw new HttpError(404, "消息不存在");
  getDb().prepare("delete from messages where id = ?").run(messageId);
  return { id: messageId, room_id: row.room_id };
}

export function markRoomRead(userId, roomId) {
  getDb()
    .prepare(
      `insert into room_members (room_id, user_id, role, last_read_at)
       values (?, ?, 'member', strftime('%Y-%m-%dT%H:%M:%fZ','now'))
       on conflict(room_id, user_id) do update set
         last_read_at = excluded.last_read_at`,
    )
    .run(roomId, userId);
}

export function getUnreadCounts(userId) {
  const members = getDb()
    .prepare("select room_id, last_read_at from room_members where user_id = ?")
    .all(userId);
  const counts = {};
  for (const member of members) {
    const row = member.last_read_at
      ? getDb()
          .prepare(
            "select count(*) as count from messages where room_id = ? and created_at > ?",
          )
          .get(member.room_id, member.last_read_at)
      : getDb()
          .prepare("select count(*) as count from messages where room_id = ?")
          .get(member.room_id);
    counts[member.room_id] = Number(row.count);
  }
  return counts;
}

export function submitScore(userId, gameId, score) {
  const id = randomUUID();
  getDb()
    .prepare(
      "insert into scores (id, game_id, user_id, score) values (?, ?, ?, ?)",
    )
    .run(id, String(gameId || ""), userId, Number(score || 0));
  return getDb().prepare("select * from scores where id = ?").get(id);
}

export function getBestScore(userId, gameId) {
  const row = getDb()
    .prepare(
      "select max(score) as score from scores where user_id = ? and game_id = ?",
    )
    .get(userId, gameId);
  return Number(row.score ?? 0);
}

export function getLeaderboard(gameId) {
  return getDb()
    .prepare(
      `select s.user_id,
              max(s.score) as score,
              max(s.created_at) as created_at,
              p.display_name
       from scores s
       left join profiles p on p.user_id = s.user_id
       where s.game_id = ?
       group by s.user_id, p.display_name
       order by score desc, created_at asc
       limit 20`,
    )
    .all(gameId)
    .map((row) => ({
      id: `user-${row.user_id}`,
      game_id: gameId,
      user_id: String(row.user_id),
      score: Number(row.score),
      created_at: row.created_at,
      display_name: row.display_name ?? "",
    }));
}
