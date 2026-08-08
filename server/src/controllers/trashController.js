import {
  getTrash,
  purgeTrash,
  restoreTrash,
} from "../services/nodeService.js";
import { removeObjectIfUnused } from "../services/storageService.js";
import { purgeNode } from "../repositories/nodeRepository.js";
import { HttpError } from "../utils/httpError.js";

export function list(req, res, next) {
  try {
    res.json({ items: getTrash(req.user.id) });
  } catch (error) {
    next(error);
  }
}

export function restore(req, res, next) {
  try {
    res.json(restoreTrash(req.user.id, req.body.nodeId));
  } catch (error) {
    next(error);
  }
}

export async function purge(req, res, next) {
  try {
    const node = purgeNode(req.user.id, Number(req.query.nodeId));
    if (!node) throw new HttpError(404, "回收站项目不存在");
    await removeObjectIfUnused(node.storage_key, node.id);
    res.json({ message: "已彻底删除", purged: node.id });
  } catch (error) {
    next(error);
  }
}
