import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { dirname } from 'node:path';
import {
  DEFAULT_CONFIGURATION,
  DEFAULT_PLAYERS,
  absenceReport,
  fairness,
  generateSchedule,
  isValidDateString,
  normalizeUnavailable,
  validateSchedule
} from '../src/tennis-core.js';

const clone = value => JSON.parse(JSON.stringify(value));

export function normalizeConfiguration(value) {
  const base = clone(DEFAULT_CONFIGURATION);
  return {
    seasonStart: typeof value?.seasonStart === 'string' ? value.seasonStart : base.seasonStart,
    seasonEnd: typeof value?.seasonEnd === 'string' ? value.seasonEnd : base.seasonEnd,
    weekdays: Array.isArray(value?.weekdays) ? value.weekdays.map(Number) : base.weekdays,
    times: Array.isArray(value?.times) ? value.times.map(String) : base.times,
    matchDurationMinutes: Number.isFinite(Number(value?.matchDurationMinutes)) ? Number(value.matchDurationMinutes) : base.matchDurationMinutes,
    matchesPerDay: Number.isFinite(Number(value?.matchesPerDay)) ? Number(value.matchesPerDay) : base.matchesPerDay
  };
}

export function validateConfiguration(configuration) {
  const errors = [];
  if (!isValidDateString(configuration.seasonStart) || !isValidDateString(configuration.seasonEnd)) errors.push('Saisonbeginn und Saisonende müssen gültige ISO-Daten sein.');
  if (configuration.seasonStart > configuration.seasonEnd) errors.push('Saisonbeginn muss vor dem Saisonende liegen.');
  if (!configuration.weekdays.length || configuration.weekdays.some(day => !Number.isInteger(day) || day < 1 || day > 7)) errors.push('Wochentage müssen ganze Zahlen von 1 bis 7 sein.');
  if (!configuration.times.length || configuration.times.some(time => !/^\d{2}:\d{2}$/.test(time))) errors.push('Spielzeiten müssen im Format HH:MM angegeben werden.');
  if (!Number.isInteger(configuration.matchesPerDay) || configuration.matchesPerDay < 1 || configuration.matchesPerDay !== configuration.times.length) errors.push('Spiele pro Tag muss der Anzahl der Spielzeiten entsprechen.');
  if (!Number.isInteger(configuration.matchDurationMinutes) || configuration.matchDurationMinutes < 1) errors.push('Die Spieldauer muss eine positive ganze Zahl sein.');
  return errors;
}

export function emptyState() {
  return { players: clone(DEFAULT_PLAYERS), schedule: [], configuration: clone(DEFAULT_CONFIGURATION), generatedAt: null };
}

function normalizeState(value) {
  const base = emptyState();
  return {
    players: Array.isArray(value?.players) && value.players.length ? value.players : base.players,
    schedule: Array.isArray(value?.schedule) ? value.schedule : [],
    configuration: normalizeConfiguration(value?.configuration),
    generatedAt: typeof value?.generatedAt === 'string' ? value.generatedAt : null
  };
}

export async function loadState(file) {
  try {
    return normalizeState(JSON.parse(await readFile(file, 'utf8')));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return emptyState();
  }
}

export async function saveState(file, state) {
  await mkdir(dirname(file), { recursive: true, mode: 0o700 });
  const temporaryFile = `${file}.${randomUUID()}.tmp`;
  await writeFile(temporaryFile, `${JSON.stringify(normalizeState(state), null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
  await rename(temporaryFile, file);
}

export function readModel(state) {
  const configuration = normalizeConfiguration(state.configuration);
  const validation = [...validateConfiguration(configuration), ...validateSchedule(state.schedule, state.players, configuration)];
  return {
    players: clone(state.players),
    schedule: clone(state.schedule),
    configuration,
    analysis: fairness(state.schedule, state.players),
    absences: absenceReport(state.schedule, state.players),
    validation: { valid: validation.length === 0, errors: validation },
    generatedAt: state.generatedAt
  };
}

function fail(message, errors = []) {
  return { ok: false, message, errors };
}

function validateCandidate(state) {
  const errors = [...validateConfiguration(state.configuration), ...validateSchedule(state.schedule, state.players, state.configuration)];
  return errors.length ? fail('Die Änderung würde einen ungültigen Spielplan erzeugen.', errors) : { ok: true };
}

export async function applyOperation(file, operation, input = {}) {
  const state = await loadState(file);
  const next = clone(state);
  let result;

  if (operation === 'generate_schedule') {
    next.schedule = generateSchedule(next.players, next.configuration);
    next.generatedAt = new Date().toISOString();
    result = validateCandidate(next);
    if (!result.ok) return result;
  } else if (operation === 'update_configuration') {
    const configuration = normalizeConfiguration(input.configuration);
    const configurationErrors = validateConfiguration(configuration);
    if (configurationErrors.length) return fail('Die Planregeln sind ungültig.', configurationErrors);
    next.configuration = configuration;
    result = validateCandidate(next);
    if (!result.ok) return result;
  } else if (operation === 'update_player') {
    const player = next.players.find(item => item.id === input.playerId);
    if (!player) return fail(`Unbekannter Spieler: ${input.playerId}`);
    if (input.name !== undefined) {
      const name = String(input.name).trim();
      if (!name) return fail('Der Spielername darf nicht leer sein.');
      player.name = name;
    }
    if (input.active !== undefined) player.active = Boolean(input.active);
    if (input.fixedFirst !== undefined) player.fixedFirst = Boolean(input.fixedFirst);
    if (input.fixedLast !== undefined) player.fixedLast = Boolean(input.fixedLast);
    result = validateCandidate(next);
    if (!result.ok) return result;
  } else if (operation === 'add_player') {
    const name = String(input.name || '').trim();
    if (!name) return fail('Der Spielername darf nicht leer sein.');
    next.players.push({ id: `p-${randomUUID()}`, name, active: true, fixedFirst: false, fixedLast: false, unavailable: [] });
    result = validateCandidate(next);
    if (!result.ok) return result;
  } else if (operation === 'update_availability') {
    const player = next.players.find(item => item.id === input.playerId);
    if (!player) return fail(`Unbekannter Spieler: ${input.playerId}`);
    if (!Array.isArray(input.unavailable)) return fail('unavailable muss ein Array von ISO-Daten sein.');
    const normalized = normalizeUnavailable(input.unavailable.join(','));
    if (normalized.invalid.length) return fail('Mindestens ein Datum ist ungültig.', normalized.invalid);
    player.unavailable = normalized.values;
    result = validateCandidate(next);
    if (!result.ok) return result;
  } else if (operation === 'update_fixed_time') {
    const player = next.players.find(item => item.id === input.playerId);
    if (!player || !['first', 'last'].includes(input.slot)) return fail('Spieler oder feste Zeit ist ungültig.');
    if (input.enabled !== undefined && typeof input.enabled !== 'boolean') return fail('enabled muss boolean sein.');
    if (input.slot === 'first') player.fixedFirst = input.enabled !== false;
    if (input.slot === 'last') player.fixedLast = input.enabled !== false;
    result = validateCandidate(next);
    if (!result.ok) return result;
  } else if (operation === 'edit_match') {
    const day = next.schedule.find(item => item.date === input.date);
    const match = day?.matches.find(item => item.time === input.time);
    if (!match) return fail('Spieltag oder Spielzeit wurde nicht gefunden.');
    if (!input.player1 || !input.player2 || input.player1 === input.player2) return fail('Zwei unterschiedliche Spieler sind erforderlich.');
    match.a = input.player1;
    match.b = input.player2;
    result = validateCandidate(next);
    if (!result.ok) return result;
  } else if (operation === 'reset_schedule') {
    next.schedule = [];
    next.generatedAt = null;
  } else {
    return fail(`Unbekannte Operation: ${operation}`);
  }

  await saveState(file, next);
  return { ok: true, message: 'Änderung gespeichert.', model: readModel(next) };
}
