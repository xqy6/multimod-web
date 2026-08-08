import { randomBytes } from "node:crypto";

import {
  createShare,
  deleteShare,
  findShareByToken,
  listShares,
} from "../repositories/shareRepository.js";
import {
  getNodeForShare,
  listFolder,
  resolveParent,
} from "../services/nodeService.js";
import { objectPath } from "../services/storageService.js";
import { HttpError } from "../utils/httpError.js";

export function create(req, res, next) {
  try {
    const node = getNodeForShare(req.user.id, req.body.nodeId);
    const token = randomBytes(12).toString("hex");
    const expiresAt = req.body.expiresIn
      ? Date.now() + Number(req.body.expiresIn)
      : null;
    const id = randomBytes(8).toString("hex");
    createShare({ id, userId: req.user.id, nodeId: node.id, token, expiresAt });
    res.status(201).json({ id, token });
  } catch (error) {
    next(error);
  }
}

export function list(req, res, next) {
  try {
    res.json({ items: listShares(req.user.id) });
  } catch (error) {
    next(error);
  }
}

export function remove(req, res, next) {
  try {
    deleteShare(req.user.id, req.params.id);
    res.json({ message: "已取消分享" });
  } catch (error) {
    next(error);
  }
}

export function get(req, res, next) {
  try {
    const share = findShareByToken(req.params.token);
    if (!share || (share.expires_at && share.expires_at < Date.now())) {
      throw new HttpError(404, "分享不存在或已过期");
    }
    const node = getNodeForShare(share.user_id, share.node_id);
    if (node.kind === "file") {
      return res.json({
        name: node.name,
        kind: node.kind,
        size: node.size,
        downloadUrl: `/api/shares/${share.token}/download`,
      });
    }
    const parentPath = node.parent_id
      ? `/${node.name}`
      : "/";
    const listing = listFolder(share.user_id, parentPath);
    res.json({ name: node.name, kind: node.kind, ...listing });
  } catch (error) {
    next(error);
  }
}

export function downloadShared(req, res, next) {
  try {
    const share = findShareByToken(req.params.token);
    if (!share || (share.expires_at && share.expires_at < Date.now())) {
      throw new HttpError(404, "分享不存在或已过期");
    }
    const node = getNodeForShare(share.user_id, share.node_id);
    if (node.kind !== "file" || !node.storage_key) {
      throw new HttpError(400, "只能下载文件分享");
    }
    res.download(objectPath(node.storage_key), node.name);
  } catch (error) {
    next(error);
  }
}
