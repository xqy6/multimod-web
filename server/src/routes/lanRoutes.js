import { randomUUID } from "node:crypto";
import { networkInterfaces } from "node:os";
import { Router } from "express";

import { getDb } from "../db/index.js";
import { HttpError } from "../utils/httpError.js";

const clients = new Map();

function broadcast(roomId, event, data) {
  const roomClients = clients.get(roomId);
  if (!roomClients) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const response of roomClients) {
    try {
      response.write(payload);
    } catch {
      // ignore closed responses
    }
  }
}

function roomDto(row) {
  return {
    id: row.id,
    name: row.name,
    message_count: Number(row.message_count ?? 0),
    created_at: row.created_at,
  };
}

function messageDto(row) {
  return {
    id: row.id,
    room_id: row.room_id,
    nickname: row.nickname,
    body: row.body,
    created_at: row.created_at,
  };
}

function ensureRoom(roomId) {
  const row = getDb().prepare("select * from lan_rooms where id = ?").get(roomId);
  if (!row) throw new HttpError(404, "房间不存在");
  return row;
}

export const lanRouter = Router();

lanRouter.get("/health", (_req, res) => {
  res.json({ ok: true, mode: "lan-chat" });
});

lanRouter.get("/ip", (_req, res) => {
  const addresses = [];
  for (const items of Object.values(networkInterfaces())) {
    for (const item of items ?? []) {
      if (item.family === "IPv4" && !item.internal) {
        addresses.push(item.address);
      }
    }
  }
  res.json({ addresses });
});

lanRouter.get("/rooms", (_req, res, next) => {
  try {
    const rows = getDb()
      .prepare(
        `select r.*, (
           select count(*) from lan_messages m where m.room_id = r.id
         ) as message_count
         from lan_rooms r
         order by r.created_at desc`,
      )
      .all();
    res.json({ data: rows.map(roomDto) });
  } catch (error) {
    next(error);
  }
});

lanRouter.post("/rooms", (req, res, next) => {
  try {
    const name = String(req.body?.name || "").trim();
    if (!name) throw new HttpError(400, "房间名不能为空");
    const id = randomUUID();
    getDb()
      .prepare("insert into lan_rooms (id, name) values (?, ?)")
      .run(id, name);
    const row = getDb().prepare("select * from lan_rooms where id = ?").get(id);
    res.status(201).json({ data: roomDto({ ...row, message_count: 0 }) });
  } catch (error) {
    next(error);
  }
});

lanRouter.get("/rooms/:roomId/messages", (req, res, next) => {
  try {
    ensureRoom(req.params.roomId);
    const rows = getDb()
      .prepare(
        `select * from lan_messages
         where room_id = ?
         order by created_at asc
         limit 200`,
      )
      .all(req.params.roomId);
    res.json({ data: rows.map(messageDto) });
  } catch (error) {
    next(error);
  }
});

lanRouter.post("/rooms/:roomId/messages", (req, res, next) => {
  try {
    ensureRoom(req.params.roomId);
    const nickname = String(req.body?.nickname || "").trim();
    const body = String(req.body?.body || "").trim();
    if (!nickname) throw new HttpError(400, "昵称不能为空");
    if (!body) throw new HttpError(400, "消息不能为空");
    const id = randomUUID();
    getDb()
      .prepare(
        `insert into lan_messages (id, room_id, nickname, body)
         values (?, ?, ?, ?)`,
      )
      .run(id, req.params.roomId, nickname, body);
    const row = getDb()
      .prepare("select * from lan_messages where id = ?")
      .get(id);
    const message = messageDto(row);
    res.status(201).json({ data: message });
    broadcast(req.params.roomId, "message", message);
  } catch (error) {
    next(error);
  }
});

lanRouter.get("/rooms/:roomId/events", (req, res) => {
  const roomId = req.params.roomId;
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.write(": connected\n\n");

  const roomClients = clients.get(roomId) ?? new Set();
  roomClients.add(res);
  clients.set(roomId, roomClients);
  req.on("close", () => {
    const current = clients.get(roomId);
    if (current) {
      current.delete(res);
      if (current.size === 0) clients.delete(roomId);
    }
  });
});
