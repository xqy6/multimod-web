import { Router } from "express";

import { getProfile } from "../services/profileService.js";
import {
  clearMyMessages,
  createRoom,
  deleteMessage,
  deleteMessages,
  getMessageContext,
  getUnreadCounts,
  joinRoom,
  leaveRoom,
  listMembers,
  listMessages,
  listRooms,
  markRoomRead,
  searchMessages,
  sendMessage,
} from "../services/platformService.js";
import { HttpError } from "../utils/httpError.js";

const clients = new Map();

function broadcast(roomId, event, data) {
  const roomClients = clients.get(roomId);
  if (!roomClients) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const entry of roomClients) {
    try {
      entry.res.write(payload);
    } catch {
      // ignore closed responses; cleanup happens on close
    }
  }
}

function broadcastPresence(roomId) {
  const connectedIds = new Set(
    [...(clients.get(roomId) ?? [])].map((entry) => String(entry.userId)),
  );
  const members = listMembers(roomId).filter((member) =>
    connectedIds.has(member.user_id),
  );
  broadcast(roomId, "presence", members);
}

export const chatRouter = Router();

chatRouter.get("/rooms", (_req, res, next) => {
  try {
    res.json({ data: listRooms() });
  } catch (error) {
    next(error);
  }
});

chatRouter.post("/rooms", (req, res, next) => {
  try {
    const room = createRoom(req.user.id, req.body?.name);
    res.status(201).json({ data: room });
    broadcastPresence(room.id);
  } catch (error) {
    next(error);
  }
});

chatRouter.post("/rooms/:roomId/join", (req, res, next) => {
  try {
    joinRoom(req.user.id, req.params.roomId);
    res.json({ message: "已加入房间" });
    broadcastPresence(req.params.roomId);
  } catch (error) {
    next(error);
  }
});

chatRouter.post("/rooms/:roomId/leave", (req, res, next) => {
  try {
    leaveRoom(req.user.id, req.params.roomId);
    res.json({ message: "已离开房间" });
    broadcastPresence(req.params.roomId);
  } catch (error) {
    next(error);
  }
});

chatRouter.get("/rooms/:roomId/members", (req, res, next) => {
  try {
    res.json({ data: listMembers(req.params.roomId) });
  } catch (error) {
    next(error);
  }
});

chatRouter.get("/rooms/:roomId/messages", (req, res, next) => {
  try {
    const before =
      typeof req.query.before === "string" ? req.query.before : null;
    const limit = Math.min(Number(req.query.limit) || 200, 200);
    const data = listMessages(req.params.roomId, before, limit);
    res.json({ data, hasMore: data.length === limit });
  } catch (error) {
    next(error);
  }
});

chatRouter.get("/rooms/:roomId/search", (req, res, next) => {
  try {
    res.json({ data: searchMessages(req.params.roomId, req.query.q) });
  } catch (error) {
    next(error);
  }
});

chatRouter.get(
  "/rooms/:roomId/messages/:messageId/context",
  (req, res, next) => {
    try {
      res.json(getMessageContext(req.params.roomId, req.params.messageId));
    } catch (error) {
      next(error);
    }
  },
);

chatRouter.post("/rooms/:roomId/messages/delete", (req, res, next) => {
  try {
    const result = deleteMessages(
      req.user.id,
      req.params.roomId,
      req.body?.messageIds,
    );
    broadcast(req.params.roomId, "delete", { ids: req.body?.messageIds ?? [] });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

chatRouter.post("/rooms/:roomId/messages/clear", (req, res, next) => {
  try {
    const result = clearMyMessages(req.user.id, req.params.roomId);
    broadcast(req.params.roomId, "delete", { clear: true });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

chatRouter.post("/rooms/:roomId/messages", (req, res, next) => {
  try {
    const body = String(req.body?.body || "").trim();
    if (!body) throw new HttpError(400, "消息不能为空");
    const message = sendMessage(req.user.id, req.params.roomId, body);
    res.status(201).json({ data: message });
    broadcast(req.params.roomId, "message", message);
  } catch (error) {
    next(error);
  }
});

chatRouter.delete("/messages/:messageId", (req, res, next) => {
  try {
    const deleted = deleteMessage(req.user.id, req.params.messageId);
    if (deleted) broadcast(deleted.room_id, "delete", { id: deleted.id });
    res.json({ message: "消息已删除" });
  } catch (error) {
    next(error);
  }
});

chatRouter.post("/rooms/:roomId/read", (req, res, next) => {
  try {
    markRoomRead(req.user.id, req.params.roomId);
    res.json({ message: "已读" });
    broadcast(req.params.roomId, "read", listMembers(req.params.roomId));
  } catch (error) {
    next(error);
  }
});

chatRouter.post("/rooms/:roomId/typing", (req, res, next) => {
  try {
    const members = listMembers(req.params.roomId);
    if (
      !members.some((member) => String(member.user_id) === String(req.user.id))
    ) {
      throw new HttpError(403, "你不是该房间成员");
    }
    const profile = getProfile(req.user.id);
    broadcast(req.params.roomId, "typing", [
      {
        room_id: req.params.roomId,
        user_id: String(req.user.id),
        display_name: profile?.display_name || req.user.email,
        role: "member",
        joined_at: new Date().toISOString(),
      },
    ]);
    res.json({ message: "ok" });
  } catch (error) {
    next(error);
  }
});

chatRouter.get("/unread", (req, res, next) => {
  try {
    res.json({ data: getUnreadCounts(req.user.id) });
  } catch (error) {
    next(error);
  }
});

chatRouter.get("/rooms/:roomId/events", (req, res) => {
  const roomId = req.params.roomId;
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.write(": connected\n\n");
  const heartbeat = setInterval(() => {
    try {
      res.write(": ping\n\n");
    } catch {
      // response already closed
    }
  }, 25000);

  const roomClients = clients.get(roomId) ?? new Set();
  const entry = { res, userId: req.user.id };
  roomClients.add(entry);
  clients.set(roomId, roomClients);
  broadcastPresence(roomId);

  req.on("close", () => {
    clearInterval(heartbeat);
    const current = clients.get(roomId);
    if (current) {
      current.delete(entry);
      if (current.size === 0) clients.delete(roomId);
    }
    broadcastPresence(roomId);
  });
});
