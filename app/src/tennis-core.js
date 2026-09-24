export const TIMES = ['12:00', '13:00', '14:00', '15:00', '16:00'];
export const START = '2026-10-03';
export const END = '2027-04-24';
export const DEFAULT_CONFIGURATION = Object.freeze({
  seasonStart: START,
  seasonEnd: END,
  weekdays: Object.freeze([7]),
  times: Object.freeze([...TIMES]),
  matchDurationMinutes: 60,
  matchesPerDay: 5
});

// Public starter data only. Customer data must be supplied through the
// authenticated application backend after the multi-user migration.
const absences = {};

export const DEFAULT_PLAYERS = [
  'Spieler 01', 'Spieler 02', 'Spieler 03', 'Spieler 04', 'Spieler 05', 'Spieler 06',
  'Spieler 07', 'Spieler 08', 'Spieler 09', 'Spieler 10', 'Spieler 11', 'Spieler 12'
].map((name, i) => ({
  id: `p${i + 1}`, name, active: true,
  fixedFirst: i === 0, fixedLast: i === 1,
  unavailable: absences[i] || []
}));

function weekdayNumber(date) { return date.getDay() + 1; }

export function dateRange(start = START, end = END, weekdays = [7]) {
  const dates = [];
  for (let d = new Date(`${start}T12:00:00`); d <= new Date(`${end}T12:00:00`); d.setDate(d.getDate() + 1)) {
    if (weekdays.includes(weekdayNumber(d))) dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

export function formatDate(iso) {
  return new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(`${iso}T12:00:00`));
}

export function isValidDateString(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

export function normalizeUnavailable(value) {
  const values = value.split(',').map(item => item.trim()).filter(Boolean);
  const invalid = values.filter(value => !isValidDateString(value));
  return { values: [...new Set(values.filter(isValidDateString))].sort(), invalid };
}

export function available(players, date, configuration = { weekdays: [7] }) {
  return players.filter(player => {
    if (!player.active || player.unavailable.includes(date)) return false;
    return !(player.availabilityRules || []).some(rule => {
      if (date < rule.startDate || date > (rule.endDate || rule.startDate)) return false;
      if (rule.weekdays?.length && !rule.weekdays.includes(weekdayNumber(new Date(`${date}T12:00:00`)))) return false;
      return rule.kind !== 'available';
    });
  });
}

function pairKey(a, b) { return [a, b].sort().join('|'); }

export function validateSchedule(schedule, players, configuration = { times: TIMES, matchesPerDay: 5 }) {
  const errors = [];
  const activeIds = new Set(players.filter(player => player.active).map(player => player.id));
  for (const day of schedule) {
    const seen = new Set();
    const used = [];
    for (const match of day.matches) {
      if (!(configuration.times || TIMES).includes(match.time)) errors.push(`${day.date}: ungültige Spielzeit`);
      if (!match.a || !match.b || match.a === match.b) errors.push(`${day.date} ${match.time}: zwei unterschiedliche Spieler erforderlich`);
      for (const id of [match.a, match.b]) {
        if (!id) continue;
        if (!activeIds.has(id)) errors.push(`${day.date}: unbekannter oder deaktivierter Spieler`);
        if (seen.has(id)) errors.push(`${day.date}: Spieler doppelt eingesetzt`);
        seen.add(id);
        const player = players.find(item => item.id === id);
        if (player && !available([player], day.date, configuration).length) errors.push(`${day.date}: abwesender Spieler eingeplant`);
        used.push(id);
      }
    }
    if (day.matches.length !== (configuration.matchesPerDay || 5)) errors.push(`${day.date}: es müssen genau ${configuration.matchesPerDay || 5} Spiele sein`);
    if (new Set(day.matches.map(match => match.time)).size !== day.matches.length) errors.push(`${day.date}: Spielzeit doppelt belegt`);
    if (used.length !== (configuration.matchesPerDay || 5) * 2) errors.push(`${day.date}: genau ${(configuration.matchesPerDay || 5) * 2} Einsätze erforderlich`);
    if (available(players, day.date, configuration).length < (configuration.matchesPerDay || 5) * 2) errors.push(`${day.date}: zu wenige verfügbare Spieler (${available(players, day.date, configuration).length})`);
    const first = players.find(player => player.fixedFirst && available([player], day.date, configuration).length);
    const last = players.find(player => player.fixedLast && available([player], day.date, configuration).length);
    if (first && day.matches[0]?.a !== first.id) errors.push(`${day.date}: feste 12:00-Regel nicht erfüllt`);
    if (last && day.matches.at(-1)?.b !== last.id) errors.push(`${day.date}: feste 16:00-Regel nicht erfüllt`);
  }
  const firstCount = players.filter(player => player.active && player.fixedFirst).length;
  const lastCount = players.filter(player => player.active && player.fixedLast).length;
  if (firstCount > 1) errors.push('Mehr als ein aktiver Spieler ist für 12:00 Uhr festgelegt.');
  if (lastCount > 1) errors.push('Mehr als ein aktiver Spieler ist für 16:00 Uhr festgelegt.');
  return [...new Set(errors)];
}

export function fairness(schedule, players) {
  const games = Object.fromEntries(players.map(player => [player.id, 0]));
  const pairs = {};
  for (const day of schedule) for (const match of day.matches) {
    for (const id of [match.a, match.b]) if (games[id] !== undefined) games[id] += 1;
    if (match.a && match.b) pairs[pairKey(match.a, match.b)] = (pairs[pairKey(match.a, match.b)] || 0) + 1;
  }
  const activePairs = [];
  for (const a of players.filter(player => player.active)) for (const b of players.filter(player => player.active)) {
    if (a.id < b.id) activePairs.push([a.id, b.id]);
  }
  const allPairCounts = activePairs.map(([a, b]) => pairs[pairKey(a, b)] || 0);
  const allPairs = Object.fromEntries(activePairs.map(([a, b]) => [pairKey(a, b), pairs[pairKey(a, b)] || 0]));
  return {
    games, pairs: allPairs, min: Math.min(...allPairCounts, 0), max: Math.max(...allPairCounts, 0),
    delta: Math.max(...allPairCounts, 0) - Math.min(...allPairCounts, 0),
    daysOff: Object.fromEntries(players.map(player => [player.id, schedule.filter(day => !day.matches.some(match => match.a === player.id || match.b === player.id)).length]))
  };
}

export function generateSchedule(players = DEFAULT_PLAYERS, configuration = DEFAULT_CONFIGURATION) {
  const schedule = dateRange(configuration.seasonStart, configuration.seasonEnd, configuration.weekdays).map(date => ({ date, matches: configuration.times.map(time => ({ time, a: null, b: null })) }));
  const gameCount = {}, pairCount = {};
  for (const day of schedule) {
    const selected = available(players, day.date, configuration).sort((a, b) => {
      const fixed = player => (player.fixedFirst ? 2 : 0) + (player.fixedLast ? 1 : 0);
      return fixed(b) - fixed(a) || (gameCount[a.id] || 0) - (gameCount[b.id] || 0);
    }).slice(0, (configuration.matchesPerDay || 5) * 2);
    const first = selected.find(player => player.fixedFirst);
    const last = selected.find(player => player.fixedLast);
    if (first) day.matches[0].a = first.id;
    if (last && day.matches.at(-1)) day.matches.at(-1).b = last.id;
    const used = new Set([first?.id, last?.id]);
    const remaining = selected.filter(player => !used.has(player.id));
    const put = (match, side, id) => { match[side] = id; used.add(id); gameCount[id] = (gameCount[id] || 0) + 1; };
    const recordPair = (a, b) => { const key = pairKey(a, b); pairCount[key] = (pairCount[key] || 0) + 1; };
    for (const match of day.matches) {
      if (match.a && match.b) continue;
      const candidates = remaining.filter(player => !used.has(player.id));
      if (!match.a && candidates[0]) put(match, 'a', candidates[0].id);
      const partner = candidates.find(player => match.a && player.id !== match.a && !used.has(player.id) && !pairCount[pairKey(match.a, player.id)]) || candidates.find(player => match.a && player.id !== match.a && !used.has(player.id));
      if (partner) { put(match, 'b', partner.id); recordPair(match.a, partner.id); }
    }
  }
  return schedule;
}

export function absenceReport(schedule, players) {
  return schedule.map(day => ({ date: day.date, players: players.filter(player => player.active && player.unavailable.includes(day.date)).map(player => player.name) })).filter(day => day.players.length);
}
