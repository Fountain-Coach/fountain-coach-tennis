import { DEFAULT_CONFIGURATION, DEFAULT_PLAYERS, absenceReport, available, fairness, formatDate, generateSchedule, normalizeUnavailable, validateSchedule } from './tennis-core.js';

const appMode = new URLSearchParams(window.location.search).get('app') === '1'
  || window.location.pathname === '/app/'
  || window.location.pathname === '/app';
document.body.classList.toggle('app-mode', appMode);

const $ = selector => document.querySelector(selector);
const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const localSnapshot = () => ({
  players: JSON.parse(localStorage.getItem('fountain-tennis-players') || 'null') || structuredClone(DEFAULT_PLAYERS),
  schedule: JSON.parse(localStorage.getItem('fountain-tennis-schedule') || 'null') || [],
  configuration: JSON.parse(localStorage.getItem('fountain-tennis-configuration') || 'null') || structuredClone(DEFAULT_CONFIGURATION),
  generatedAt: null
});
let { players, schedule, configuration } = localSnapshot();
let remoteMode = false;
let currentRole = null;

function applyRole(role) {
  currentRole = role;
  const player = role === 'player';
  document.querySelectorAll('#generate, #import-local, #reset, #export-json, #import-json, [data-tab="players"], #players').forEach(element => { element.hidden = player; });
  document.body.classList.toggle('player-mode', player);
  $('#connection').textContent = player ? 'ANGEMELDET · persönlicher Spielplan' : 'ANGEMELDET · gemeinsamer Spielplan';
}

function ensurePortableMigrationControls() {
  const actions = $('.top-actions');
  if (!actions || $('#export-json')) return;
  const exportButton = document.createElement('button');
  exportButton.id = 'export-json';
  exportButton.textContent = 'Daten exportieren';
  const importButton = document.createElement('button');
  importButton.id = 'import-json';
  importButton.textContent = 'Daten importieren';
  const input = document.createElement('input');
  input.id = 'import-json-file';
  input.type = 'file';
  input.accept = 'application/json,.json';
  input.hidden = true;
  actions.append(exportButton, importButton, input);
  exportButton.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(localSnapshot(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = 'fountain-coach-tennisrunde.json'; link.click(); URL.revokeObjectURL(url);
    toast('Tennisdaten exportiert.');
  });
  importButton.addEventListener('click', () => input.click());
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      const imported = JSON.parse(await file.text());
      if (!imported || typeof imported !== 'object' || Array.isArray(imported) || !Array.isArray(imported.players) || !Array.isArray(imported.schedule)) throw new Error('Die JSON-Datei ist kein gültiger Tennis-Spielstand.');
      if (remoteMode) {
        if (!confirm('Exportierte Tennisdaten in den gemeinsamen Spielplan importieren? Vorhandene Online-Daten werden ersetzt.')) return;
        await remoteOperation('import_state', { confirm: true, state: imported });
      } else {
        players = imported.players; schedule = imported.schedule; configuration = imported.configuration || configuration; save(); render();
      }
      toast('Tennisdaten importiert.');
    } catch (error) { toast(error.message || 'JSON-Import fehlgeschlagen.', true); }
  });
}

function save() {
  localStorage.setItem('fountain-tennis-players', JSON.stringify(players));
  localStorage.setItem('fountain-tennis-schedule', JSON.stringify(schedule));
  localStorage.setItem('fountain-tennis-configuration', JSON.stringify(configuration));
}

function useRemoteModel(model) {
  const state = model?.stateJSON ? JSON.parse(model.stateJSON) : (model?.model || model);
  players = state.players || [];
  schedule = (state.schedule || []).map(day => ({ ...day, matches: (day.matches || []).map(match => ({ ...match, a: match.a ?? match.playerA ?? null, b: match.b ?? match.playerB ?? null })) }));
  configuration = state.configuration || configuration;
}

function hasLocalSnapshot() {
  return ['fountain-tennis-players', 'fountain-tennis-schedule', 'fountain-tennis-configuration'].some(key => localStorage.getItem(key) !== null);
}

async function connectRemote() {
  try {
    const response = await fetch('/auth/session', { credentials: 'same-origin', headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('Anmeldedienst nicht erreichbar.');
    const session = await response.json();
    if (!session.authenticated) { window.location.assign('/auth/login'); return; }
    const stateResponse = await fetch('/api/state', { credentials: 'same-origin' });
    if (!stateResponse.ok) throw new Error('Geschützter Spielplan ist nicht erreichbar.');
    useRemoteModel(await stateResponse.json());
    remoteMode = true;
    $('#import-local').hidden = false;
    $('#connection').textContent = 'ANGEMELDET · gemeinsamer Spielplan';
    render();
    toast('Online-Spielplan verbunden.');
  } catch (error) { toast(error.message, true); }
}

async function enforceAppGate() {
  if (!appMode) return;
  const gate = $('#auth-gate');
  const dashboard = $('.dashboard-shell');
  gate.hidden = false;
  dashboard.setAttribute('aria-hidden', 'true');
  try {
    const response = await fetch('/auth/session', { credentials: 'same-origin', headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('Anmeldedienst nicht erreichbar.');
    const session = await response.json();
    if (!session.authenticated) return;
    applyRole(session.role);
    const stateResponse = await fetch('/api/state', { credentials: 'same-origin' });
    if (!stateResponse.ok) throw new Error('Geschützter Spielplan ist nicht erreichbar.');
    useRemoteModel(await stateResponse.json());
    remoteMode = true;
    $('#import-local').hidden = false;
    dashboard.removeAttribute('aria-hidden');
    gate.hidden = true;
    render();
  } catch (error) {
    $('#auth-gate-message').textContent = `${error.message} Bitte später erneut versuchen.`;
  }
}

async function remoteOperation(operation, input) {
  const request = { operation, input: { ...input, confirm: true } };
  const response = await fetch('/api/operation', {
    method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(result.errors?.[0] || result.message || result.error || 'Online-Änderung abgelehnt.');
  useRemoteModel(result);
  render();
}

function errors() { return schedule.length ? validateSchedule(schedule, players, configuration) : []; }

function render() {
  renderFilters(); renderSchedule(); renderConfiguration(); renderPlayers(); renderAnalysis();
  const currentErrors = errors();
  $('#status').textContent = schedule.length ? (currentErrors.length ? `${currentErrors.length} Regelabweichung(en): ${currentErrors[0]}` : 'Spielplan gültig · alle Regeln erfüllt.') : 'Noch kein Spielplan erzeugt.';
  $('#metrics').innerHTML = schedule.length ? `<div class="metric"><strong>${schedule.length}</strong><span>Spieltage</span></div><div class="metric"><strong>${schedule.length * 5}</strong><span>Spiele</span></div><div class="metric"><strong>${currentErrors.length}</strong><span>Abweichungen</span></div>` : '';
}

function renderConfiguration() {
  if (!$('#configuration-form')) return;
  $('#configuration-start').value = configuration.seasonStart || '';
  $('#configuration-end').value = configuration.seasonEnd || '';
  $('#configuration-weekdays').value = (configuration.weekdays || []).join(', ');
  $('#configuration-times').value = (configuration.times || []).join(', ');
  $('#configuration-matches').value = configuration.matchesPerDay || '';
  $('#configuration-duration').value = configuration.matchDurationMinutes || '';
  const start = configuration.seasonStart || '', end = configuration.seasonEnd || '';
  $('#season-label').textContent = start && end ? `SAISON ${start.slice(0, 4)}/${end.slice(0, 4).slice(-2)}` : 'SAISON';
  $('#season-range').textContent = `${(configuration.weekdays || []).map(day => ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][day - 1] || day).join(', ')} · ${start} – ${end}`;
}

function renderFilters() {
  const playerFilter = $('#player-filter'), dateFilter = $('#date-filter');
  const playerValue = playerFilter.value, dateValue = dateFilter.value;
  playerFilter.innerHTML = '<option value="">Alle</option>' + players.filter(player => player.active).map(player => `<option value="${player.id}">${escapeHtml(player.name)}</option>`).join('');
  dateFilter.innerHTML = '<option value="">Alle Spieltage</option>' + schedule.map(day => `<option value="${day.date}">${formatDate(day.date)}</option>`).join('');
  playerFilter.value = playerValue; dateFilter.value = dateValue;
}

function selectHtml(date, matchIndex, side, value) {
  const options = available(players, date, configuration).map(player => `<option value="${player.id}" ${player.id === value ? 'selected' : ''}>${escapeHtml(player.name)}</option>`).join('');
  return `<label class="sr-only" for="${date}-${matchIndex}-${side}">${side === 'a' ? 'Spieler 1' : 'Spieler 2'}</label><select id="${date}-${matchIndex}-${side}" data-match="${date}|${matchIndex}|${side}"><option value="">— auswählen —</option>${options}</select>`;
}

function renderSchedule() {
  const playerFilter = $('#player-filter').value, dateFilter = $('#date-filter').value;
  const days = schedule.filter(day => (!dateFilter || day.date === dateFilter) && (!playerFilter || day.matches.some(match => match.a === playerFilter || match.b === playerFilter)));
  $('#schedule-list').innerHTML = schedule.length ? days.map(day => {
    const used = day.matches.flatMap(match => [match.a, match.b]);
    const absent = players.filter(player => player.active && player.unavailable.includes(day.date));
    const dayErrors = validateSchedule([day], players, configuration);
    return `<article class="day-card ${dayErrors.length ? 'has-errors' : ''}"><div class="day-head"><h3>${formatDate(day.date)}</h3><span class="badge ${dayErrors.length ? '' : 'valid'}">${dayErrors.length ? `${dayErrors.length} Fehler` : 'gültig'}</span></div><div class="matches">${day.matches.map((match, index) => `<div class="match"><time>${match.time}–${String(Number(match.time.slice(0, 2)) + 1).padStart(2, '0')}:00 Uhr</time>${selectHtml(day.date, index, 'a', match.a)}${selectHtml(day.date, index, 'b', match.b)}</div>`).join('')}</div><p class="bye"><strong>Spielfrei:</strong> ${players.filter(player => player.active && !used.includes(player.id)).map(player => escapeHtml(player.name)).join(', ') || '—'}</p><p class="absence"><strong>Abwesend:</strong> ${absent.map(player => escapeHtml(player.name)).join(', ') || '—'}</p></article>`;
  }).join('') : '<div class="day-card"><h3>Noch kein Spielplan</h3><p>Erzeuge den Plan, um die Spieltage zu sehen.</p></div>';
}

function renderPlayers() {
  $('#players-list').innerHTML = players.map((player, index) => `<article class="player-card"><div class="player-head"><input aria-label="Name von Spieler ${index + 1}" data-player-name="${player.id}" value="${escapeHtml(player.name)}"><label><input type="checkbox" data-player-active="${player.id}" ${player.active ? 'checked' : ''}> aktiv</label></div><div class="checks"><label><input type="checkbox" data-fixed="${player.id}|first" ${player.fixedFirst ? 'checked' : ''}> 12:00 Uhr</label><label><input type="checkbox" data-fixed="${player.id}|last" ${player.fixedLast ? 'checked' : ''}> 16:00 Uhr</label></div><div class="field"><label>Einzelne Abwesenheiten (JJJJ-MM-TT, Komma getrennt)<input aria-label="Abwesenheiten für ${escapeHtml(player.name)}" data-player-unavailable="${player.id}" value="${(player.unavailable || []).join(', ')}" placeholder="2027-01-09"></label><small class="input-help">Nur gültige Datumswerte im Format JJJJ-MM-TT werden übernommen.</small></div><div class="rule-editor"><h4>Flexible Regeln</h4>${(player.availabilityRules || []).map(rule => `<div class="rule-row"><span>${rule.kind === 'available' ? 'verfügbar' : 'nicht verfügbar'} · ${escapeHtml(rule.startDate)}${rule.endDate ? ` – ${escapeHtml(rule.endDate)}` : ''}${rule.weekdays?.length ? ` · ${rule.weekdays.join(', ')}` : ''}</span><button type="button" class="quiet" data-rule-remove="${player.id}|${escapeHtml(rule.id)}">Entfernen</button></div>`).join('')}<div class="rule-form"><select data-rule-kind="${player.id}" aria-label="Regeltyp für ${escapeHtml(player.name)}"><option value="unavailable">nicht verfügbar</option><option value="available">verfügbar</option></select><input type="date" data-rule-start="${player.id}" aria-label="Regelbeginn für ${escapeHtml(player.name)}"><input type="date" data-rule-end="${player.id}" aria-label="Regelende für ${escapeHtml(player.name)}"><input type="text" data-rule-weekdays="${player.id}" placeholder="Wochentage 1–7" aria-label="Wochentage für ${escapeHtml(player.name)}"><button type="button" data-rule-add="${player.id}">Regel hinzufügen</button></div></div></article>`).join('') + '<p class="muted">Regeln können einzelne Zeiträume oder wiederkehrende Wochentage abbilden. Eine feste Regel darf je Spielzeit nur einmal aktiv sein.</p>';
}

function renderAnalysis() {
  if (!schedule.length) { $('#analysis-content').innerHTML = '<div class="analysis-card"><p>Noch keine Daten. Erzeuge zuerst einen Spielplan.</p></div>'; return; }
  const result = fairness(schedule, players), absences = absenceReport(schedule, players);
  $('#analysis-content').innerHTML = `<div class="analysis-card"><h3>Spiele je Spieler</h3><table><tbody>${players.filter(player => player.active).map(player => `<tr><th>${escapeHtml(player.name)}</th><td>${result.games[player.id] || 0}</td><td>${result.daysOff[player.id]} spielfrei</td></tr>`).join('')}</tbody></table></div><div class="analysis-card"><h3>Alle Spielerpaare</h3><p>Min.: <strong>${result.min}</strong> · Max.: <strong>${result.max}</strong> · Abweichung: <strong>${result.delta}</strong></p><table><tbody>${Object.entries(result.pairs).sort().map(([key, count]) => `<tr><th>${key.split('|').map(id => escapeHtml(players.find(player => player.id === id)?.name || id)).join(' · ')}</th><td>${count}</td></tr>`).join('')}</tbody></table></div><div class="analysis-card"><h3>Abwesenheiten</h3>${absences.length ? `<table><tbody>${absences.map(day => `<tr><th>${formatDate(day.date)}</th><td>${day.players.map(escapeHtml).join(', ')}</td></tr>`).join('')}</tbody></table>` : '<p>Keine Abwesenheiten eingetragen.</p>'}</div><div class="analysis-card"><h3>Validierung</h3><p>${errors().length ? escapeHtml(errors().join(' · ')) : 'Der Spielplan ist gültig.'}</p></div>`;
}

function toast(message, isError = false) { const node = $('#toast'); node.textContent = message; node.className = `toast${isError ? ' error' : ''}`; node.hidden = false; setTimeout(() => { node.hidden = true; }, 3200); }

document.addEventListener('click', event => {
  if (event.target.matches('[data-tab]')) { document.querySelectorAll('.tab,.panel').forEach(node => node.classList.remove('active')); event.target.classList.add('active'); $(`#${event.target.dataset.tab}`).classList.add('active'); }
  if (event.target.id === 'connect') { connectRemote(); }
  if (event.target.id === 'import-local') {
    if (!remoteMode) return;
    if (!hasLocalSnapshot()) { toast('Keine lokalen Tennisdaten zum Importieren gefunden.', true); return; }
    if (!confirm('Lokale Tennisdaten in den gemeinsamen Spielplan importieren? Vorhandene Online-Daten werden ersetzt.')) return;
    remoteOperation('import_state', { confirm: true, state: localSnapshot() }).then(() => toast('Lokale Daten importiert.')).catch(error => toast(error.message, true));
  }
  if (event.target.id === 'generate') {
    if (remoteMode) { remoteOperation('generate_schedule', { confirm: true }).then(() => toast('Spielplan online erzeugt.')).catch(error => toast(error.message, true)); return; }
    schedule = generateSchedule(players, configuration); save(); render(); toast(errors().length ? `Plan erzeugt, aber nicht vollständig gültig: ${errors()[0]}` : 'Spielplan erzeugt.');
  }
  if (event.target.id === 'reset' && confirm('Spielplan und lokale Änderungen zurücksetzen?')) {
    if (remoteMode) { remoteOperation('reset_schedule', { confirm: true }).then(() => toast('Online-Spielplan zurückgesetzt.')).catch(error => toast(error.message, true)); return; }
    players = structuredClone(DEFAULT_PLAYERS); schedule = []; save(); render(); toast('Zurückgesetzt.');
  }
  if (event.target.id === 'add-player') {
    if (remoteMode) { remoteOperation('add_player', { confirm: true, name: 'Neue Person' }).then(() => toast('Person online hinzugefügt.')).catch(error => toast(error.message, true)); return; }
    players.push({ id: `p${Date.now()}`, name: 'Neue Person', active: true, fixedFirst: false, fixedLast: false, unavailable: [] }); save(); render();
  }
  if (event.target.matches('[data-rule-remove]')) {
    const [playerId, ruleId] = event.target.dataset.ruleRemove.split('|'), player = players.find(item => item.id === playerId);
    if (!player) return;
    player.availabilityRules = (player.availabilityRules || []).filter(rule => rule.id !== ruleId);
    const saveRules = remoteMode ? remoteOperation('update_availability', { confirm: true, playerId, unavailable: player.unavailable, rules: player.availabilityRules }) : Promise.resolve(save());
    saveRules.then(() => { render(); toast('Verfügbarkeitsregel entfernt.'); }).catch(error => toast(error.message, true));
  }
  if (event.target.matches('[data-rule-add]')) {
    const playerId = event.target.dataset.ruleAdd, player = players.find(item => item.id === playerId);
    const start = $(`[data-rule-start="${playerId}"]`).value, end = $(`[data-rule-end="${playerId}"]`).value || null;
    const weekdays = $(`[data-rule-weekdays="${playerId}"]`).value.split(',').map(value => Number(value.trim())).filter(value => value >= 1 && value <= 7);
    if (!player || !start) { toast('Bitte mindestens ein Regelbeginn-Datum angeben.', true); return; }
    const rule = { id: `rule-${Date.now()}`, kind: $(`[data-rule-kind="${playerId}"]`).value, startDate: start, endDate: end, weekdays, note: null };
    player.availabilityRules = [...(player.availabilityRules || []), rule];
    const saveRules = remoteMode ? remoteOperation('update_availability', { confirm: true, playerId, unavailable: player.unavailable, rules: player.availabilityRules }) : Promise.resolve(save());
    saveRules.then(() => { render(); toast('Verfügbarkeitsregel gespeichert.'); }).catch(error => toast(error.message, true));
  }
});

$('#configuration-form')?.addEventListener('submit', async event => {
  event.preventDefault();
  const next = {
    seasonStart: $('#configuration-start').value,
    seasonEnd: $('#configuration-end').value,
    weekdays: $('#configuration-weekdays').value.split(',').map(value => Number(value.trim())).filter(value => value >= 1 && value <= 7),
    times: $('#configuration-times').value.split(',').map(value => value.trim()).filter(Boolean),
    matchesPerDay: Number($('#configuration-matches').value),
    matchDurationMinutes: Number($('#configuration-duration').value)
  };
  if (!next.weekdays.length || !next.times.length || next.times.length !== next.matchesPerDay || next.seasonStart > next.seasonEnd) { toast('Bitte gültige Planregeln eingeben: Zeiten und Spiele pro Tag müssen übereinstimmen.', true); return; }
  const before = configuration; configuration = next;
  try {
    if (remoteMode) await remoteOperation('update_configuration', { confirm: true, configuration: next }); else save();
    render(); toast('Planregeln gespeichert.');
  } catch (error) { configuration = before; render(); toast(error.message, true); }
});

document.addEventListener('change', async event => {
  if (event.target.matches('[data-match]')) {
    const [date, matchIndex, side] = event.target.dataset.match.split('|');
    const before = structuredClone({ players, schedule });
    const day = schedule.find(item => item.date === date), match = day.matches[Number(matchIndex)], previous = match[side];
    match[side] = event.target.value || null;
    if (remoteMode) {
      try { await remoteOperation('edit_match', { confirm: true, date, time: match.time, player1: match.a, player2: match.b }); toast('Online-Änderung gespeichert.'); }
      catch (error) { players = before.players; schedule = before.schedule; render(); toast(error.message, true); }
      return;
    }
    const currentErrors = validateSchedule(schedule, players, configuration);
    if (currentErrors.length) { match[side] = previous; render(); toast(currentErrors[0], true); } else { save(); render(); toast('Änderung gespeichert.'); }
  }
  if (event.target.matches('[data-player-active]')) {
    const id = event.target.dataset.playerActive, before = structuredClone({ players, schedule });
    players.find(player => player.id === id).active = event.target.checked;
    if (remoteMode) { try { await remoteOperation('update_player', { confirm: true, playerId: id, active: event.target.checked }); toast('Aktivstatus online gespeichert.'); } catch (error) { players = before.players; schedule = before.schedule; render(); toast(error.message, true); } return; }
    save(); render();
  }
  if (event.target.matches('[data-fixed]')) {
    const [id, slot] = event.target.dataset.fixed.split('|'), player = players.find(item => item.id === id), previous = slot === 'first' ? player.fixedFirst : player.fixedLast;
    const before = structuredClone({ players, schedule });
    if (slot === 'first') player.fixedFirst = event.target.checked; else player.fixedLast = event.target.checked;
    if (remoteMode) { try { await remoteOperation('update_fixed_time', { confirm: true, playerId: id, slot, enabled: event.target.checked }); toast('Feste Spielzeit online gespeichert.'); } catch (error) { players = before.players; schedule = before.schedule; render(); toast(error.message, true); } return; }
    const currentErrors = validateSchedule(schedule, players, configuration);
    if (currentErrors.some(error => error.includes('Mehr als ein aktiver Spieler'))) { if (slot === 'first') player.fixedFirst = previous; else player.fixedLast = previous; render(); toast(currentErrors.find(error => error.includes('Mehr als ein aktiver Spieler')), true); } else { save(); render(); toast('Feste Spielzeit gespeichert.'); }
  }
  if (event.target.matches('[data-player-unavailable]')) {
    const player = players.find(item => item.id === event.target.dataset.playerUnavailable), parsed = normalizeUnavailable(event.target.value), before = structuredClone({ players, schedule });
    player.unavailable = parsed.values;
    if (remoteMode) { try { await remoteOperation('update_availability', { confirm: true, playerId: player.id, unavailable: parsed.values }); toast('Abwesenheiten online gespeichert.'); } catch (error) { players = before.players; schedule = before.schedule; render(); toast(error.message, true); } return; }
    save(); render(); if (parsed.invalid.length) toast(`Ungültige Datumswerte: ${parsed.invalid.join(', ')}`, true); else toast('Abwesenheiten gespeichert.');
  }
});

document.addEventListener('input', event => { if (!remoteMode && event.target.matches('[data-player-name]')) { players.find(player => player.id === event.target.dataset.playerName).name = event.target.value; save(); } });
document.addEventListener('change', async event => {
  if (!remoteMode || !event.target.matches('[data-player-name]')) return;
  const id = event.target.dataset.playerName, before = structuredClone({ players, schedule });
  try { await remoteOperation('update_player', { confirm: true, playerId: id, name: event.target.value }); toast('Name online gespeichert.'); }
  catch (error) { players = before.players; schedule = before.schedule; render(); toast(error.message, true); }
});
$('#player-filter').addEventListener('change', renderSchedule); $('#date-filter').addEventListener('change', renderSchedule);
const xml = value => String(value).replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[character]));
const sheetXml = rows => `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows.map((row, index) => `<row r="${index + 1}">${row.map(value => `<c t="inlineStr"><is><t>${xml(value)}</t></is></c>`).join('')}</row>`).join('')}</sheetData></worksheet>`;
$('#export').addEventListener('click', () => {
  if (!schedule.length) return toast('Bitte zuerst einen Spielplan erzeugen.', true);
  const name = id => players.find(player => player.id === id)?.name || '';
  const plan = [['Datum','Uhrzeit','Spieler 1','Spieler 2','Spielfreie Spieler'], ...schedule.flatMap(day => day.matches.map(match => [day.date, match.time, name(match.a), name(match.b), players.filter(player => player.active && !day.matches.flatMap(item => [item.a, item.b]).includes(player.id)).map(player => player.name).join(', ')]))];
  const result = fairness(schedule, players);
  const games = [['Spieler','Spiele','Spielfreie Tage'], ...players.filter(player => player.active).map(player => [player.name, result.games[player.id] || 0, result.daysOff[player.id]])];
  const pairs = [['Spieler 1','Spieler 2','Begegnungen'], ...Object.entries(result.pairs).map(([key, count]) => [name(key.split('|')[0]), name(key.split('|')[1]), count])];
  const files = {'[Content_Types].xml':`<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet3.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`, '_rels/.rels':`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`, 'xl/workbook.xml':`<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Spielplan" sheetId="1" r:id="rId1"/><sheet name="Spiele je Spieler" sheetId="2" r:id="rId2"/><sheet name="Spielerpaare" sheetId="3" r:id="rId3"/></sheets></workbook>`, 'xl/_rels/workbook.xml.rels':`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet3.xml"/></Relationships>`, 'xl/worksheets/sheet1.xml':sheetXml(plan), 'xl/worksheets/sheet2.xml':sheetXml(games), 'xl/worksheets/sheet3.xml':sheetXml(pairs)};
  const bytes = window.fflate.zipSync(Object.fromEntries(Object.entries(files).map(([path, content]) => [path, new TextEncoder().encode(content)])));
  const blob = new Blob([bytes], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}), url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = 'fountain-coach-tennisrunde.xlsx'; link.click(); URL.revokeObjectURL(url); toast('Excel-Datei exportiert.');
});
render();
ensurePortableMigrationControls();
enforceAppGate();
