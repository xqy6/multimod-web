import { getDb } from "../db/index.js";

export function findNodeById(userId, id) {
  return getDb()
    .prepare("select * from nodes where id = ? and user_id = ?")
    .get(id, userId);
}

export function findFolderBySegments(userId, segments) {
  const database = getDb();
  let parentId = null;
  let last = null;
  for (const segment of segments) {
    last =
      parentId === null
        ? database
            .prepare(
              `select * from nodes
               where user_id = ? and parent_id is null and name = ?
                 and kind = 'folder' and is_deleted = 0`,
            )
            .get(userId, segment)
        : database
            .prepare(
              `select * from nodes
               where user_id = ? and parent_id = ? and name = ?
                 and kind = 'folder' and is_deleted = 0`,
            )
            .get(userId, parentId, segment);
    if (!last) return null;
    parentId = last.id;
  }
  return last;
}

export function findChild(userId, parentId, name) {
  const database = getDb();
  return parentId === null
    ? database
        .prepare(
          `select * from nodes
           where user_id = ? and parent_id is null and name = ? and is_deleted = 0`,
        )
        .get(userId, name)
    : database
        .prepare(
          `select * from nodes
           where user_id = ? and parent_id = ? and name = ? and is_deleted = 0`,
        )
        .get(userId, parentId, name);
}

export function listChildren(userId, parentId) {
  const database = getDb();
  return parentId === null
    ? database
        .prepare(
          `select * from nodes
           where user_id = ? and parent_id is null and is_deleted = 0
           order by kind desc, name collate nocase`,
        )
        .all(userId)
    : database
        .prepare(
          `select * from nodes
           where user_id = ? and parent_id = ? and is_deleted = 0
           order by kind desc, name collate nocase`,
        )
        .all(userId, parentId);
}

export function createNode({
  userId,
  parentId,
  name,
  kind,
  size = 0,
  mimeType = null,
  sha256 = null,
  storageKey = null,
}) {
  const result = getDb()
    .prepare(
      `insert into nodes
       (user_id, parent_id, name, kind, size, mime_type, sha256, storage_key)
       values (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      userId,
      parentId,
      name,
      kind,
      size,
      mimeType,
      sha256,
      storageKey,
    );
  return findNodeById(userId, Number(result.lastInsertRowid));
}

export function renameNode(userId, id, newName) {
  getDb()
    .prepare(
      `update nodes set name = ?, updated_at = datetime('now') where id = ? and user_id = ?`,
    )
    .run(newName, id, userId);
}

export function softDeleteNode(userId, id) {
  getDb()
    .prepare(
      `update nodes
       set is_deleted = 1, deleted_at = datetime('now'), updated_at = datetime('now')
       where id = ? and user_id = ?`,
    )
    .run(id, userId);
}

export function softDeleteTree(userId, id) {
  getDb()
    .prepare(
      `with recursive subtree(id) as (
         select id from nodes where id = ? and user_id = ?
         union all
         select n.id from nodes n
         join subtree s on n.parent_id = s.id
         where n.user_id = ?
       )
       update nodes
       set is_deleted = 1, deleted_at = datetime('now'), updated_at = datetime('now')
       where id in (select id from subtree) and user_id = ?`,
    )
    .run(id, userId, userId, userId);
}

export function listTrash(userId) {
  return getDb()
    .prepare(
      `select * from nodes where user_id = ? and is_deleted = 1
       order by deleted_at desc`,
    )
    .all(userId);
}

export function restoreNode(userId, id) {
  const node = findNodeById(userId, id);
  if (!node) return null;
  let name = node.name;
  let candidate = name;
  let suffix = 1;
  while (findChild(userId, node.parent_id, candidate)) {
    const parsed = name.split(".");
    const ext = parsed.length > 1 ? `.${parsed.pop()}` : "";
    candidate = `${parsed.join(".")}-restored-${suffix}${ext}`;
    suffix += 1;
  }
  getDb()
    .prepare(
      `update nodes set is_deleted = 0, deleted_at = null, name = ?,
       updated_at = datetime('now') where id = ? and user_id = ?`,
    )
    .run(candidate, id, userId);
  return findNodeById(userId, id);
}

export function restoreTree(userId, id) {
  getDb()
    .prepare(
      `with recursive subtree(id) as (
         select id from nodes where id = ? and user_id = ?
         union all
         select n.id from nodes n
         join subtree s on n.parent_id = s.id
         where n.user_id = ?
       )
       update nodes
       set is_deleted = 0, deleted_at = null, updated_at = datetime('now')
       where id in (select id from subtree) and user_id = ?`,
    )
    .run(id, userId, userId, userId);
}

export function purgeNode(userId, id) {
  const node = findNodeById(userId, id);
  if (!node) return null;
  getDb()
    .prepare("delete from nodes where id = ? and user_id = ?")
    .run(id, userId);
  return node;
}

export function countNodesUsingStorageKey(storageKey, excludeId) {
  return getDb()
    .prepare(
      `select count(*) as count from nodes where storage_key = ? and id != ?`,
    )
    .get(storageKey, excludeId).count;
}
