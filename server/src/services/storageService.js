import {
  createReadStream,
  createWriteStream,
  existsSync,
  mkdirSync,
  promises as fs,
} from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

import { OBJECT_DIR, UPLOAD_DIR } from "../config.js";
import { countNodesUsingStorageKey } from "../repositories/nodeRepository.js";
import { sha256 } from "../utils/crypto.js";

export function objectPath(storageKey) {
  return path.join(OBJECT_DIR, storageKey.slice(0, 2), storageKey);
}

export function tempUploadPath(uploadId, chunkIndex) {
  return path.join(UPLOAD_DIR, uploadId, `chunk-${chunkIndex}`);
}

export async function ingestTempFile(tempPath) {
  const hash = createHash("sha256");
  const stream = createReadStream(tempPath);
  for await (const chunk of stream) hash.update(chunk);
  const key = hash.digest("hex");
  const target = objectPath(key);
  mkdirSync(path.dirname(target), { recursive: true });
  if (!existsSync(target)) {
    await fs.copyFile(tempPath, target);
  }
  await fs.rm(tempPath, { force: true });
  const stat = await fs.stat(target);
  return { sha256: key, storageKey: key, size: stat.size };
}

export async function mergeChunks(uploadId, totalChunks) {
  const temp = path.join(UPLOAD_DIR, uploadId, "merged");
  const output = createWriteStream(temp);
  for (let index = 0; index < totalChunks; index += 1) {
    const source = tempUploadPath(uploadId, index);
    if (!existsSync(source)) {
      output.destroy();
      await fs.rm(temp, { force: true });
      throw new Error(`缺少分片 ${index}`);
    }
    await new Promise((resolve, reject) => {
      const input = createReadStream(source);
      input.pipe(output, { end: false });
      input.on("end", resolve);
      input.on("error", reject);
    });
  }
  await new Promise((resolve) => output.end(resolve));
  const result = await ingestTempFile(temp);
  await fs.rm(path.join(UPLOAD_DIR, uploadId), { recursive: true, force: true });
  return result;
}

export async function removeObjectIfUnused(storageKey, excludeId) {
  if (!storageKey) return;
  const count = countNodesUsingStorageKey(storageKey, excludeId);
  if (count === 0) {
    const target = objectPath(storageKey);
    await fs.rm(target, { force: true });
  }
}

export function randomSha256(buffer) {
  return sha256(buffer);
}
