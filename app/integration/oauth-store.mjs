import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createHash } from 'node:crypto';

const persistent = process.env.TENNIS_STATE_BACKEND === 'sqlite' && Boolean(process.env.TENNIS_SQLITE_FILE);
let database = null;

if (persistent) {
  const { DatabaseSync } = await import('node:sqlite');
  mkdirSync(dirname(process.env.TENNIS_SQLITE_FILE), { recursive: true, mode: 0o700 });
  database = new DatabaseSync(process.env.TENNIS_SQLITE_FILE);
  database.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS oauth_records (
      collection TEXT NOT NULL,
      key_hash TEXT NOT NULL,
      value_json TEXT NOT NULL,
      expires_at INTEGER,
      PRIMARY KEY (collection, key_hash)
    );
    CREATE INDEX IF NOT EXISTS idx_oauth_records_expiry ON oauth_records(expires_at);
  `);
}

const memory = new Map();
const hashKey = key => createHash('sha256').update(String(key)).digest('hex');
const memoryKey = (collection, key) => `${collection}:${key}`;

export const oauthPersistence = persistent ? 'sqlite' : 'memory';

export function createOAuthCollection(collection) {
  return {
    set(key, value) {
      if (!database) {
        memory.set(memoryKey(collection, key), value);
        return this;
      }
      database.prepare(`INSERT INTO oauth_records (collection, key_hash, value_json, expires_at) VALUES (?, ?, ?, ?)
        ON CONFLICT(collection, key_hash) DO UPDATE SET value_json=excluded.value_json, expires_at=excluded.expires_at`).run(
        collection, hashKey(key), JSON.stringify(value), Number.isFinite(value?.expiresAt) ? value.expiresAt : null
      );
      return this;
    },
    get(key) {
      if (!database) return memory.get(memoryKey(collection, key));
      const row = database.prepare('SELECT value_json FROM oauth_records WHERE collection = ? AND key_hash = ?').get(collection, hashKey(key));
      if (!row) return undefined;
      try { return JSON.parse(row.value_json); } catch { return undefined; }
    },
    delete(key) {
      if (!database) return memory.delete(memoryKey(collection, key));
      return database.prepare('DELETE FROM oauth_records WHERE collection = ? AND key_hash = ?').run(collection, hashKey(key)).changes > 0;
    }
  };
}
