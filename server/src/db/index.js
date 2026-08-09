import { mkdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

import { DATA_DIR, DB_PATH } from "../config.js";
import { hashPassword } from "../utils/crypto.js";
import { ADMIN_PASSWORD, ADMIN_USERNAME } from "../config.js";

const SCHEMA = `
create table if not exists users (
  id integer primary key autoincrement,
  username text unique not null,
  email text,
  password_hash text not null,
  role text not null default 'user',
  banned integer not null default 0,
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

create table if not exists profiles (
  user_id integer primary key references users(id) on delete cascade,
  display_name text not null default '',
  avatar_key text,
  avatar_mime text,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

create table if not exists projects (
  id text primary key,
  owner_id integer not null references users(id) on delete cascade,
  title text not null,
  vibe_prompt text not null default '',
  style_params text not null default '{}',
  modules text not null default '[]',
  status text not null default 'draft',
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

create index if not exists idx_projects_owner on projects(owner_id, updated_at);

create table if not exists assets (
  id text primary key,
  project_id text not null references projects(id) on delete cascade,
  owner_id integer not null references users(id) on delete cascade,
  kind text not null check (kind in ('image', 'text')),
  name text not null,
  storage_path text,
  content text,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

create index if not exists idx_assets_project on assets(project_id, created_at);

create table if not exists rooms (
  id text primary key,
  name text not null,
  slug text,
  is_public integer not null default 1,
  created_by integer not null references users(id) on delete cascade,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

create table if not exists room_members (
  room_id text not null references rooms(id) on delete cascade,
  user_id integer not null references users(id) on delete cascade,
  role text not null default 'member' check (role in ('member', 'admin')),
  joined_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  last_read_at text,
  primary key (room_id, user_id)
);

create table if not exists messages (
  id text primary key,
  room_id text not null references rooms(id) on delete cascade,
  user_id integer not null references users(id) on delete cascade,
  body text not null,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

create index if not exists idx_messages_room on messages(room_id, created_at);

create table if not exists scores (
  id text primary key,
  game_id text not null,
  user_id integer not null references users(id) on delete cascade,
  score integer not null default 0,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

create index if not exists idx_scores_game on scores(game_id, score desc);

create table if not exists lan_rooms (
  id text primary key,
  name text not null,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

create table if not exists lan_messages (
  id text primary key,
  room_id text not null references lan_rooms(id) on delete cascade,
  nickname text not null,
  body text not null,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

create index if not exists idx_lan_messages_room on lan_messages(room_id, created_at);

create table if not exists settings (
  key text primary key,
  value text
);
`;

let db;

export function getDb() {
  if (db) return db;
  mkdirSync(DATA_DIR, { recursive: true });
  db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec(SCHEMA);
  migrate(db);
  return db;
}

export function ensureDemoUser() {
  const database = getDb();
  database
    .prepare(
      "insert or ignore into users (username, email, password_hash) values (?, ?, ?)",
    )
    .run("demo", "demo@local", hashPassword("demo1234"));
  const demo = database
    .prepare("select id from users where username = 'demo'")
    .get();
  if (demo) {
    database
      .prepare(
        "insert or ignore into profiles (user_id, display_name) values (?, ?)",
      )
      .run(demo.id, "演示用户");
  }
}

export function ensureAdmin() {
  const database = getDb();
  const existing = database
    .prepare("select id from users where username = ?")
    .get(ADMIN_USERNAME);
  if (existing) {
    database
      .prepare("update users set role = 'admin', password_hash = ? where id = ?")
      .run(hashPassword(ADMIN_PASSWORD), existing.id);
    database
      .prepare("update users set banned = 0 where id = ?")
      .run(existing.id);
    database
      .prepare(
        "insert or ignore into profiles (user_id, display_name) values (?, ?)",
      )
      .run(existing.id, "管理员");
    return;
  }
  const result = database
    .prepare(
      `insert into users (username, email, password_hash, role)
       values (?, ?, ?, 'admin')`,
    )
    .run(ADMIN_USERNAME, "admin@local", hashPassword(ADMIN_PASSWORD));
  database
    .prepare(
      "insert or ignore into profiles (user_id, display_name) values (?, ?)",
    )
    .run(Number(result.lastInsertRowid), "管理员");
}

export function closeDb() {
  if (db) db.close();
  db = undefined;
}

function migrate(database) {
  const userColumns = database
    .prepare("PRAGMA table_info(users)")
    .all()
    .map((column) => column.name);
  if (!userColumns.includes("email")) {
    database.exec("ALTER TABLE users ADD COLUMN email text;");
  }
  if (!userColumns.includes("role")) {
    database.exec(
      "ALTER TABLE users ADD COLUMN role text not null default 'user';",
    );
  }
  if (!userColumns.includes("banned")) {
    database.exec(
      "ALTER TABLE users ADD COLUMN banned integer not null default 0;",
    );
  }
  database.exec(
    "create unique index if not exists idx_users_email on users(email) where email is not null;",
  );
}
