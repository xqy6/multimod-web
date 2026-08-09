import { Router } from "express";

import {
  deleteAdminMessages,
  deleteProject,
  deleteRoom,
  deleteUser,
  exportBackup,
  getAnnouncement,
  getStats,
  listAdminMessages,
  listProjects,
  listRooms,
  listUsers,
  setAnnouncement,
  setUserBanned,
} from "../services/adminService.js";

export const adminRouter = Router();

adminRouter.use((req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "需要管理员权限" });
  }
  next();
});

adminRouter.get("/stats", (_req, res, next) => {
  try {
    res.json({ data: getStats() });
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/users", (_req, res, next) => {
  try {
    res.json({ data: listUsers() });
  } catch (error) {
    next(error);
  }
});

adminRouter.delete("/users/:id", (req, res, next) => {
  try {
    deleteUser(req.user.id, req.params.id);
    res.json({ message: "用户已删除" });
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/users/:id/ban", (req, res, next) => {
  try {
    setUserBanned(req.user.id, req.params.id, Boolean(req.body?.banned));
    res.json({ message: req.body?.banned ? "用户已封禁" : "用户已解封" });
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/projects", (_req, res, next) => {
  try {
    res.json({ data: listProjects() });
  } catch (error) {
    next(error);
  }
});

adminRouter.delete("/projects/:id", (req, res, next) => {
  try {
    deleteProject(req.params.id);
    res.json({ message: "项目已删除" });
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/rooms", (_req, res, next) => {
  try {
    res.json({ data: listRooms() });
  } catch (error) {
    next(error);
  }
});

adminRouter.delete("/rooms/:id", (req, res, next) => {
  try {
    deleteRoom(req.params.id);
    res.json({ message: "房间已删除" });
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/messages", (req, res, next) => {
  try {
    const roomId =
      typeof req.query.roomId === "string" && req.query.roomId
        ? req.query.roomId
        : null;
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    res.json({ data: listAdminMessages(roomId, limit) });
  } catch (error) {
    next(error);
  }
});

adminRouter.delete("/messages", (req, res, next) => {
  try {
    deleteAdminMessages(req.body?.ids);
    res.json({ message: "消息已删除" });
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/announcement", (_req, res, next) => {
  try {
    res.json({ data: getAnnouncement() });
  } catch (error) {
    next(error);
  }
});

adminRouter.put("/announcement", (req, res, next) => {
  try {
    setAnnouncement(req.body?.value);
    res.json({ message: "公告已保存", data: getAnnouncement() });
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/backup", (_req, res, next) => {
  try {
    res.setHeader("Content-Disposition", "attachment; filename=backup.json");
    res.json(exportBackup());
  } catch (error) {
    next(error);
  }
});
