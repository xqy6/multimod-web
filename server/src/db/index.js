import { mkdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

import { DATA_DIR, DB_PATH } from "../config.js";
import { hashPassword } from "../utils/crypto.js";

const SCHEMA = `
create table if not exists users (
  id integer primary key autoincrement,
  username text unique not null,
  password_hash text not null,
  created_at text not null default (datetime('now'))
);

create table if not exists tokens (
  token text primary key,
  user_id integer not null references users(id) on delete cascade,
  expires_at integer not null
);

create table if not exists nodes (
  id integer primary key autoincrement,
  user_id integer not null references users(id) on delete cascade,
  parent_id integer references nodes(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('folder', 'file')),
  size integer not null default 0,
  mime_type text,
  sha256 text,
  storage_key text,
  is_deleted integer not null default 0,
  deleted_at text,
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);

create index if not exists idx_nodes_parent on nodes(user_id, parent_id);
create index if not exists idx_nodes_storage on nodes(storage_key);

create table if not exists uploads (
  id text primary key,
  user_id integer not null,
  parent_path text not null,
  file_name text not null,
  total_size integer not null,
  chunk_size integer not null,
  total_chunks integer not null,
  created_at text not null default (datetime('now'))
);

create table if not exists chunks (
  upload_id text not null references uploads(id) on delete cascade,
  chunk_index integer not null,
  size integer not null,
  storage_path text not null,
  primary key (upload_id, chunk_index)
);

create table if not exists shares (
  id text primary key,
  user_id integer not null,
  node_id integer not null references nodes(id) on delete cascade,
  token text unique not null,
  expires_at integer,
  created_at text not null default (datetime('now'))
);
`;

let db;

export function getDb() {
  if (db) return db;
  mkdirSync(DATA_DIR, { recursive: true });
  db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec(SCHEMA);
  return db;
}

export function ensureDemoUser() {
  const database = getDb();
  database
    .prepare(
      "insert or ignore into users (username, password_hash) values (?, ?)",
    )
    .run("demo", hashPassword("demo1234"));
}

export function closeDb() {
  if (db) db.close();
  db = undefined;
}
