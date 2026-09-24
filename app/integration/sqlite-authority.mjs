import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { emptyState, applyStateOperation, readModel } from './tennis-service.mjs';

const SCHEMA_VERSION = 1;

const schema = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS tennis_configuration (
  id TEXT PRIMARY KEY CHECK (id = 'default'),
  season_start TEXT NOT NULL,
  season_end TEXT NOT NULL,
  weekdays_json TEXT NOT NULL,
  times_json TEXT NOT NULL,
  match_duration_minutes INTEGER NOT NULL,
  matches_per_day INTEGER NOT NULL,
  generated_at TEXT,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  active INTEGER NOT NULL CHECK (active IN (0, 1)),
  fixed_first INTEGER NOT NULL CHECK (fixed_first IN (0, 1)),
  fixed_last INTEGER NOT NULL CHECK (fixed_last IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS player_unavailability (
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  unavailable_date TEXT NOT NULL,
  PRIMARY KEY (player_id, unavailable_date)
);
CREATE TABLE IF NOT EXISTS player_availability_rules (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT,
  weekdays_json TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS schedule_days (
  date TEXT PRIMARY KEY
);
CREATE TABLE IF NOT EXISTS matches (
  date TEXT NOT NULL REFERENCES schedule_days(date) ON DELETE CASCADE,
  time TEXT NOT NULL,
  player_a TEXT REFERENCES players(id) ON DELETE SET NULL,
  player_b TEXT REFERENCES players(id) ON DELETE SET NULL,
  PRIMARY KEY (date, time)
);
CREATE INDEX IF NOT EXISTS idx_player_unavailability_date ON player_unavailability(unavailable_date);
CREATE INDEX IF NOT EXISTS idx_matches_player_a ON matches(player_a);
CREATE INDEX IF NOT EXISTS idx_matches_player_b ON matches(player_b);
CREATE INDEX IF NOT EXISTS idx_availability_rules_player ON player_availability_rules(player_id);
`;

async function openDatabase(file) {
  const { DatabaseSync } = await import('node:sqlite');
  await mkdir(dirname(file), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
  return db;
}

export async function migrateSQLite(file) {
  const db = await openDatabase(file);
  try {
    db.exec('BEGIN IMMEDIATE');
    db.exec(schema);
    const applied = db.prepare('SELECT version FROM schema_migrations WHERE version = ?').get(SCHEMA_VERSION);
    if (!applied) db.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)').run(SCHEMA_VERSION, new Date().toISOString());
    db.exec('COMMIT');
    return { version: SCHEMA_VERSION, tables: db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all().map(row => row.name) };
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  } finally {
    db.close();
  }
}

const bool = value => value ? 1 : 0;
const parseJSON = (value, fallback) => {
  try { return JSON.parse(value); } catch { return fallback; }
};

export async function loadSQLiteState(file) {
  await migrateSQLite(file);
  const db = await openDatabase(file);
  try {
    const configurationRow = db.prepare('SELECT * FROM tennis_configuration WHERE id = ?').get('default');
    const playerRows = db.prepare('SELECT * FROM players ORDER BY rowid').all();
    const unavailableRows = db.prepare('SELECT player_id, unavailable_date FROM player_unavailability ORDER BY unavailable_date').all();
    const ruleRows = db.prepare('SELECT * FROM player_availability_rules ORDER BY rowid').all();
    const dayRows = db.prepare('SELECT date FROM schedule_days ORDER BY date').all();
    const matchRows = db.prepare('SELECT date, time, player_a, player_b FROM matches ORDER BY date, time').all();
    if (!configurationRow && !playerRows.length && !dayRows.length) {
      const state = emptyState();
      await saveSQLiteState(file, state);
      return state;
    }
    const unavailable = new Map();
    for (const row of unavailableRows) unavailable.set(row.player_id, [...(unavailable.get(row.player_id) || []), row.unavailable_date]);
    const rules = new Map();
    for (const row of ruleRows) rules.set(row.player_id, [...(rules.get(row.player_id) || []), {
      id: row.id, kind: row.kind, startDate: row.start_date, endDate: row.end_date || undefined,
      weekdays: parseJSON(row.weekdays_json, []), note: row.note || undefined
    }]);
    const players = playerRows.map(row => ({
      id: row.id, name: row.name, active: Boolean(row.active), fixedFirst: Boolean(row.fixed_first), fixedLast: Boolean(row.fixed_last),
      unavailable: unavailable.get(row.id) || [], availabilityRules: rules.get(row.id) || undefined
    }));
    const matches = new Map();
    for (const row of matchRows) matches.set(row.date, [...(matches.get(row.date) || []), { time: row.time, a: row.player_a, b: row.player_b }]);
    const schedule = dayRows.map(row => ({ date: row.date, matches: matches.get(row.date) || [] }));
    return {
      players,
      schedule,
      configuration: {
        seasonStart: configurationRow?.season_start,
        seasonEnd: configurationRow?.season_end,
        weekdays: parseJSON(configurationRow?.weekdays_json, []),
        times: parseJSON(configurationRow?.times_json, []),
        matchDurationMinutes: configurationRow?.match_duration_minutes,
        matchesPerDay: configurationRow?.matches_per_day
      },
      generatedAt: configurationRow?.generated_at || null
    };
  } finally {
    db.close();
  }
}

export async function saveSQLiteState(file, state) {
  await migrateSQLite(file);
  const db = await openDatabase(file);
  const now = new Date().toISOString();
  try {
    db.exec('BEGIN IMMEDIATE');
    db.exec('DELETE FROM matches; DELETE FROM schedule_days; DELETE FROM player_availability_rules; DELETE FROM player_unavailability; DELETE FROM players;');
    const configuration = state.configuration;
    db.prepare(`INSERT INTO tennis_configuration
      (id, season_start, season_end, weekdays_json, times_json, match_duration_minutes, matches_per_day, generated_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET season_start=excluded.season_start, season_end=excluded.season_end,
      weekdays_json=excluded.weekdays_json, times_json=excluded.times_json, match_duration_minutes=excluded.match_duration_minutes,
      matches_per_day=excluded.matches_per_day, generated_at=excluded.generated_at, updated_at=excluded.updated_at`).run(
      'default', configuration.seasonStart, configuration.seasonEnd, JSON.stringify(configuration.weekdays), JSON.stringify(configuration.times),
      configuration.matchDurationMinutes, configuration.matchesPerDay, state.generatedAt, now
    );
    const playerStatement = db.prepare('INSERT INTO players (id, name, active, fixed_first, fixed_last, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
    const unavailableStatement = db.prepare('INSERT INTO player_unavailability (player_id, unavailable_date) VALUES (?, ?)');
    const ruleStatement = db.prepare('INSERT INTO player_availability_rules (id, player_id, kind, start_date, end_date, weekdays_json, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    for (const player of state.players) {
      playerStatement.run(player.id, player.name, bool(player.active), bool(player.fixedFirst), bool(player.fixedLast), now, now);
      for (const date of player.unavailable || []) unavailableStatement.run(player.id, date);
      for (const rule of player.availabilityRules || []) ruleStatement.run(rule.id, player.id, rule.kind, rule.startDate, rule.endDate || null, JSON.stringify(rule.weekdays || []), rule.note || null, now, now);
    }
    const dayStatement = db.prepare('INSERT INTO schedule_days (date) VALUES (?)');
    const matchStatement = db.prepare('INSERT INTO matches (date, time, player_a, player_b) VALUES (?, ?, ?, ?)');
    for (const day of state.schedule) {
      dayStatement.run(day.date);
      for (const match of day.matches) matchStatement.run(day.date, match.time, match.a || null, match.b || null);
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  } finally {
    db.close();
  }
}

export async function applySQLiteOperation(file, operation, input = {}) {
  const state = await loadSQLiteState(file);
  const result = applyStateOperation(state, operation, input);
  if (result.ok) {
    await saveSQLiteState(file, result.state);
    delete result.state;
  }
  return result;
}

export async function readSQLiteModel(file) {
  return readModel(await loadSQLiteState(file));
}
