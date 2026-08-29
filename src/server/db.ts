import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath =
  process.env.SQLITE_DB_PATH ||
  process.env.DB_PATH ||
  path.join(process.cwd(), 'data', 'paios5.sqlite');

function createDatabaseInstance(): Database.Database {
  if (dbPath !== ':memory:') {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  try {
    const instance = new Database(dbPath);
    try {
      instance.pragma('journal_mode = WAL');
    } catch (_) {}
    instance.pragma('foreign_keys = ON');
    return instance;
  } catch (err) {
    console.warn('[DB] SQLite open failed. Attempting shm/wal clean recovery...', err);
    if (dbPath !== ':memory:') {
      try {
        if (fs.existsSync(`${dbPath}-shm`)) fs.unlinkSync(`${dbPath}-shm`);
        if (fs.existsSync(`${dbPath}-wal`)) fs.unlinkSync(`${dbPath}-wal`);
      } catch (_) {}
    }
    const instance = new Database(dbPath);
    try {
      instance.pragma('journal_mode = WAL');
    } catch (_) {}
    instance.pragma('foreign_keys = ON');
    return instance;
  }
}

export const db = createDatabaseInstance();

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    display_name TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS user_storage (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    storage_key TEXT NOT NULL,
    payload TEXT NOT NULL DEFAULT '{}',
    version INTEGER NOT NULL DEFAULT 1,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_user_storage_uid ON user_storage(user_id);
  CREATE INDEX IF NOT EXISTS idx_user_storage_key ON user_storage(user_id, storage_key);

  CREATE TABLE IF NOT EXISTS plugin_inbound_pit (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    source_plugin_id TEXT NOT NULL,
    target_plugin_id TEXT,
    priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'blocker')),
    payload TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'staged' CHECK (status IN ('staged', 'synced', 'rejected')),
    created_at INTEGER NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_plugin_pit_user ON plugin_inbound_pit(user_id, status);
`);

export default db;
