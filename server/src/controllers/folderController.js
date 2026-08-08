import {
  createFolder,
  deleteFolder,
  listFolder,
  renameFolder,
} from "../services/nodeService.js";
import { validateName } from "../utils/pathUtils.js";

export function list(req, res, next) {
  try {
    res.json(listFolder(req.user.id, req.query.path));
  } catch (error) {
    next(error);
  }
}

export function create(req, res, next) {
  try {
    const name = validateName(req.body?.name);
    const result = createFolder(req.user.id, req.query.path, name);
    res.status(201).json({ message: "文件夹创建成功", ...result });
  } catch (error) {
    next(error);
  }
}

export function rename(req, res, next) {
  try {
    const newName = validateName(req.body?.newName);
    const result = renameFolder(req.user.id, req.query.path, newName);
    res.json({ message: "重命名成功", ...result });
  } catch (error) {
    next(error);
  }
}

export function remove(req, res, next) {
  try {
    const result = deleteFolder(req.user.id, req.query.path);
    res.json({ message: "已移入回收站", ...result });
  } catch (error) {
    next(error);
  }
}
