import { applyOperation, loadState } from './tennis-service.mjs';
import { applySQLiteOperation, loadSQLiteState } from './sqlite-authority.mjs';

export function authorityBackend(environment = process.env) {
  const backend = String(environment.TENNIS_STATE_BACKEND || 'json').toLowerCase();
  if (!['json', 'sqlite'].includes(backend)) throw new Error(`Unsupported Tennis state backend: ${backend}`);
  return backend;
}

export function createTennisAuthority({ stateFile, sqliteFile, environment = process.env }) {
  const backend = authorityBackend(environment);
  if (backend === 'sqlite' && !sqliteFile) throw new Error('SQLite Tennis state backend requires TENNIS_SQLITE_FILE.');
  return {
    backend,
    load: () => backend === 'sqlite' ? loadSQLiteState(sqliteFile) : loadState(stateFile),
    apply: (operation, input) => backend === 'sqlite' ? applySQLiteOperation(sqliteFile, operation, input) : applyOperation(stateFile, operation, input)
  };
}
