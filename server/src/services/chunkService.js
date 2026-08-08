import { promises as fs } from "node:fs";
import path from "node:path";

import { UPLOAD_DIR } from "../config.js";
import {
  countChunks,
  createUpload,
  deleteUpload,
  getUpload,
  saveChunk,
} from "../repositories/uploadRepository.js";
import { createNode, findChild } from "../repositories/nodeRepository.js";
import { HttpError } from "../utils/httpError.js";
import { normalizeSegments, validateName } from "../utils/pathUtils.js";
import { mergeChunks, tempUploadPath } from "./storageService.js";
import { newUploadId, resolveParent } from "./nodeService.js";

export function initChunkUpload(userId, pathInput, input) {
  const fileName = validateName(input.fileName);
  const totalSize = Number(input.totalSize);
  const chunkSize = Number(input.chunkSize);
  const totalChunks = Number(input.totalChunks);
  if (!totalSize || !chunkSize || !totalChunks) {
    throw new HttpError(400, "分片参数不完整");
  }
  const { parentId, segments } = resolveParent(userId, pathInput);
  if (findChild(userId, parentId, fileName)) {
    throw new HttpError(409, "同名文件已存在");
  }
  const id = newUploadId();
  createUpload({
    id,
    userId,
    parentPath: `/${segments.join("/")}`,
    fileName,
    totalSize,
    chunkSize,
    totalChunks,
  });
  return { uploadId: id, chunkSize, totalChunks };
}

export async function saveUploadedChunk(uploadId, index, tempPath) {
  const upload = getUpload(uploadId);
  if (!upload) throw new HttpError(404, "上传任务不存在");
  const chunkIndex = Number(index);
  if (chunkIndex < 0 || chunkIndex >= upload.total_chunks) {
    throw new HttpError(400, "分片序号越界");
  }
  const stat = await fs.stat(tempPath);
  const target = tempUploadPath(uploadId, chunkIndex);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.rename(tempPath, target);
  saveChunk(uploadId, chunkIndex, stat.size, target);
  return { uploadedChunks: countChunks(uploadId) };
}

export async function completeChunkUpload(userId, uploadId) {
  const upload = getUpload(uploadId);
  if (!upload) throw new HttpError(404, "上传任务不存在");
  const uploaded = countChunks(uploadId);
  if (uploaded !== upload.total_chunks) {
    throw new HttpError(400, `分片未完成：${uploaded}/${upload.total_chunks}`);
  }
  const merged = await mergeChunks(uploadId, upload.total_chunks);
  const segments = normalizeSegments(upload.parent_path);
  const { parentId } = resolveParent(userId, upload.parent_path);
  const node = createNode({
    userId,
    parentId,
    name: upload.file_name,
    kind: "file",
    size: merged.size,
    mimeType: "application/octet-stream",
    sha256: merged.sha256,
    storageKey: merged.storageKey,
  });
  deleteUpload(uploadId);
  return {
    file: {
      name: node.name,
      path: `${segments.length ? `/${segments.join("/")}` : ""}/${node.name}`,
      size: node.size,
    },
  };
}

export async function cleanupUploadDir(uploadId) {
  await fs.rm(path.join(UPLOAD_DIR, uploadId), { recursive: true, force: true });
}
