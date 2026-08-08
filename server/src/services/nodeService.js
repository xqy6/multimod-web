import { randomBytes } from "node:crypto";

import {
  createNode,
  findChild,
  findFolderBySegments,
  findNodeById,
  listChildren,
  listTrash,
  purgeNode,
  renameNode,
  restoreNode,
  restoreTree,
  softDeleteNode,
  softDeleteTree,
} from "../repositories/nodeRepository.js";
import { HttpError } from "../utils/httpError.js";
import {
  joinApiPath,
  joinSegmentsPath,
  normalizeSegments,
} from "../utils/pathUtils.js";

function toFolderDto(node, segments) {
  return {
    name: node.name,
    path: joinApiPath(segments, node.name),
    modifiedAt: node.updated_at,
  };
}

function toFileDto(node, segments) {
  return {
    name: node.name,
    path: joinApiPath(segments, node.name),
    size: node.size,
    modifiedAt: node.updated_at,
  };
}

export function resolveParent(userId, pathInput) {
  const segments = normalizeSegments(pathInput);
  if (segments.length === 0) {
    return { parentId: null, segments };
  }
  const parent = findFolderBySegments(userId, segments);
  if (!parent) {
    throw new HttpError(404, "文件夹不存在");
  }
  return { parentId: parent.id, segments };
}

export function listFolder(userId, pathInput) {
  const { parentId, segments } = resolveParent(userId, pathInput);
  const children = listChildren(userId, parentId);
  return {
    path: joinSegmentsPath(segments),
    folders: children
      .filter((node) => node.kind === "folder")
      .map((node) => toFolderDto(node, segments)),
    files: children
      .filter((node) => node.kind === "file")
      .map((node) => toFileDto(node, segments)),
  };
}

export function createFolder(userId, pathInput, name) {
  const { parentId, segments } = resolveParent(userId, pathInput);
  if (findChild(userId, parentId, name)) {
    throw new HttpError(409, "同名文件夹已存在");
  }
  const node = createNode({
    userId,
    parentId,
    name,
    kind: "folder",
  });
  return { folder: toFolderDto(node, segments) };
}

export function renameFolder(userId, pathInput, newName) {
  const segments = normalizeSegments(pathInput);
  if (segments.length === 0) {
    throw new HttpError(400, "不能重命名根目录");
  }
  const node = findFolderBySegments(userId, segments);
  if (!node) {
    throw new HttpError(404, "文件夹不存在");
  }
  if (findChild(userId, node.parent_id, newName)) {
    throw new HttpError(409, "同名文件夹已存在");
  }
  renameNode(userId, node.id, newName);
  return {
    folder: {
      name: newName,
      path: joinApiPath(segments.slice(0, -1), newName),
    },
  };
}

export function deleteFolder(userId, pathInput) {
  const segments = normalizeSegments(pathInput);
  if (segments.length === 0) {
    throw new HttpError(400, "不能删除根目录");
  }
  const node = findFolderBySegments(userId, segments);
  if (!node) {
    throw new HttpError(404, "文件夹不存在");
  }
  softDeleteTree(userId, node.id);
  return { deleted: joinSegmentsPath(segments) };
}

export function findFile(userId, pathInput, name) {
  const { parentId, segments } = resolveParent(userId, pathInput);
  const node = findChild(userId, parentId, name);
  if (!node || node.kind !== "file") {
    throw new HttpError(404, "文件不存在");
  }
  return { node, segments };
}

export function renameFile(userId, pathInput, oldName, newName) {
  const { node, segments } = findFile(userId, pathInput, oldName);
  if (findChild(userId, node.parent_id, newName)) {
    throw new HttpError(409, "同名文件已存在");
  }
  renameNode(userId, node.id, newName);
  return {
    file: {
      name: newName,
      path: joinApiPath(segments, newName),
    },
  };
}

export function deleteFile(userId, pathInput, name) {
  const { node, segments } = findFile(userId, pathInput, name);
  softDeleteNode(userId, node.id);
  return { deleted: joinApiPath(segments, name) };
}

export function getTrash(userId) {
  return listTrash(userId).map((node) => ({
    id: node.id,
    name: node.name,
    kind: node.kind,
    size: node.size,
    deletedAt: node.deleted_at,
  }));
}

export function restoreTrash(userId, nodeId) {
  restoreTree(userId, Number(nodeId));
  const node = findNodeById(userId, Number(nodeId));
  if (!node) throw new HttpError(404, "回收站项目不存在");
  return { restored: node.id };
}

export async function purgeTrash(userId, nodeId) {
  const node = purgeNode(userId, Number(nodeId));
  if (!node) throw new HttpError(404, "回收站项目不存在");
  return { purged: node.id };
}

export function getNodeForShare(userId, nodeId) {
  const node = findNodeById(userId, Number(nodeId));
  if (!node || node.is_deleted) {
    throw new HttpError(404, "文件不存在");
  }
  return node;
}

export function newUploadId() {
  return randomBytes(16).toString("hex");
}
