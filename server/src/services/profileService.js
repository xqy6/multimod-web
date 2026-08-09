import { getDb } from "../db/index.js";
import { ingestTempFile, objectPath } from "./storageService.js";
import { HttpError } from "../utils/httpError.js";

export function getProfile(userId) {
  return getDb()
    .prepare("select * from profiles where user_id = ?")
    .get(userId);
}

export function updateProfile(userId, displayName) {
  const name = String(displayName || "").trim();
  if (!name) throw new HttpError(400, "昵称不能为空");
  getDb()
    .prepare(
      `insert into profiles (user_id, display_name)
       values (?, ?)
       on conflict(user_id) do update set display_name = excluded.display_name`,
    )
    .run(userId, name);
  return getProfile(userId);
}

export async function saveAvatar(userId, filePath, mimeType) {
  const ingested = await ingestTempFile(filePath);
  getDb()
    .prepare(
      `insert into profiles (user_id, display_name, avatar_key, avatar_mime)
       values (?, '', ?, ?)
       on conflict(user_id) do update set
         avatar_key = excluded.avatar_key,
         avatar_mime = excluded.avatar_mime`,
    )
    .run(userId, ingested.storageKey, mimeType || "image/png");
  const profile = getProfile(userId);
  return {
    avatarUrl: `/api/profile/${userId}/avatar?ts=${Date.now()}`,
    storagePath: profile.avatar_key,
  };
}

export function avatarFilePath(profile) {
  return objectPath(profile.avatar_key);
}
