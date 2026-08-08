import { getDb } from "../db/index.js";

export function createUpload({
  id,
  userId,
  parentPath,
  fileName,
  totalSize,
  chunkSize,
  totalChunks,
}) {
  getDb()
    .prepare(
      `insert into uploads
       (id, user_id, parent_path, file_name, total_size, chunk_size, total_chunks)
       values (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(id, userId, parentPath, fileName, totalSize, chunkSize, totalChunks);
}

export function getUpload(id) {
  return getDb().prepare("select * from uploads where id = ?").get(id);
}

export function saveChunk(uploadId, chunkIndex, size, storagePath) {
  getDb()
    .prepare(
      `insert into chunks (upload_id, chunk_index, size, storage_path)
       values (?, ?, ?, ?)`,
    )
    .run(uploadId, chunkIndex, size, storagePath);
}

export function listChunks(uploadId) {
  return getDb()
    .prepare(
      "select * from chunks where upload_id = ? order by chunk_index asc",
    )
    .all(uploadId);
}

export function countChunks(uploadId) {
  return getDb()
    .prepare("select count(*) as count from chunks where upload_id = ?")
    .get(uploadId).count;
}

export function deleteUpload(id) {
  getDb().prepare("delete from uploads where id = ?").run(id);
}
