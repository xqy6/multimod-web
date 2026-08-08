import { getDb } from "../db/index.js";

export function createShare({ id, userId, nodeId, token, expiresAt }) {
  getDb()
    .prepare(
      `insert into shares (id, user_id, node_id, token, expires_at)
       values (?, ?, ?, ?, ?)`,
    )
    .run(id, userId, nodeId, token, expiresAt);
}

export function findShareByToken(token) {
  return getDb().prepare("select * from shares where token = ?").get(token);
}

export function listShares(userId) {
  return getDb()
    .prepare("select * from shares where user_id = ? order by created_at desc")
    .all(userId);
}

export function deleteShare(userId, id) {
  getDb()
    .prepare("delete from shares where id = ? and user_id = ?")
    .run(id, userId);
}
