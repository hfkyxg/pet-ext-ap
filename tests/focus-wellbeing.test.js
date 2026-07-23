'use strict';

const test = require('node:test');
const assert = require('node:assert');
const C = require('../src/shared/catalog.js');

/* ============================================================
   Pomodoro — máquina de estados (clawdPomodoroNextPhase)
   ============================================================ */

test('pomodoro: idle inicia em work com phaseEndsAt correto', () => {
  const def = C.clawdDefaultState().focus;
  const now = 1_000_000;
  const next = C.clawdPomodoroNextPhase({ ...def, phase: 'idle', workMin: 25 }, now, '2026-07-22');
  assert.equal(next.phase, 'work');
  assert.equal(next.enabled, true);
  assert.equal(next.paused, false);
  assert.equal(next.phaseEndsAt, now + 25 * 60000);
});

test('pomodoro: work → break incrementa ciclo e sessão do dia', () => {
  const def = C.clawdDefaultState().focus;
  const f = { ...def, phase: 'work', cyclesDone: 0, cyclesPerLong: 4, sessionsToday: 2, sessionsDay: '2026-07-22' };
  const next = C.clawdPomodoroNextPhase(f, 0, '2026-07-22');
  assert.equal(next.phase, 'break');
  assert.equal(next.cyclesDone, 1);
  assert.equal(next.sessionsToday, 3);
});

test('pomodoro: 4º work vira longBreak, e longBreak → work zera ciclos', () => {
  const def = C.clawdDefaultState().focus;
  const afterFourth = C.clawdPomodoroNextPhase(
    { ...def, phase: 'work', cyclesDone: 3, cyclesPerLong: 4 }, 0, '2026-07-22');
  assert.equal(afterFourth.phase, 'longBreak');
  assert.equal(afterFourth.cyclesDone, 4);
  const backToWork = C.clawdPomodoroNextPhase(afterFourth, 0, '2026-07-22');
  assert.equal(backToWork.phase, 'work');
  assert.equal(backToWork.cyclesDone, 0);
});

test('pomodoro: troca de dia zera sessionsToday', () => {
  const def = C.clawdDefaultState().focus;
  const f = { ...def, phase: 'work', sessionsToday: 5, sessionsDay: '2026-07-21' };
  const next = C.clawdPomodoroNextPhase(f, 0, '2026-07-22');
  assert.equal(next.sessionsToday, 1); // zerou e somou a sessão que terminou
  assert.equal(next.sessionsDay, '2026-07-22');
});

/* ============================================================
   Doomscroll — classificação e escalada
   ============================================================ */

test('classifyTimeSink: hosts de rolagem infinita', () => {
  assert.equal(C.clawdClassifyTimeSink('www.tiktok.com', '/foryou'), 'social');
  assert.equal(C.clawdClassifyTimeSink('old.reddit.com', '/r/all'), 'social');
  assert.equal(C.clawdClassifyTimeSink('instagram.com', '/'), 'social');
  assert.equal(C.clawdClassifyTimeSink('example.com', '/'), null);
});

test('classifyTimeSink: youtube só conta em /shorts', () => {
  assert.equal(C.clawdClassifyTimeSink('www.youtube.com', '/watch?v=abc'), null);
  assert.equal(C.clawdClassifyTimeSink('www.youtube.com', '/shorts/xyz'), 'video');
});

test('escalationLevel: nudge não incomoda antes de metade do limite', () => {
  assert.equal(C.clawdEscalationLevel(60, 15, 'nudge'), -1);   // 1min de 15
  assert.equal(C.clawdEscalationLevel(8 * 60, 15, 'nudge'), 0); // ~half → fala gentil
  assert.equal(C.clawdEscalationLevel(16 * 60, 15, 'nudge'), 1); // acima → toast
  assert.equal(C.clawdEscalationLevel(60 * 60, 15, 'nudge'), 3); // muito acima → bloqueio
});

test('escalationLevel: firm começa um degrau acima', () => {
  const nudge = C.clawdEscalationLevel(9 * 60, 15, 'nudge');
  const firm = C.clawdEscalationLevel(9 * 60, 15, 'firm');
  assert.ok(firm > nudge);
});

/* ============================================================
   Regras por site
   ============================================================ */

test('siteRuleFor: match exato vence subdomínio', () => {
  const rules = [
    { host: 'reddit.com', level: 'nudge', category: 'social' },
    { host: 'old.reddit.com', level: 'block', category: 'social' }
  ];
  assert.equal(C.clawdSiteRuleFor('old.reddit.com', rules).level, 'block');
  assert.equal(C.clawdSiteRuleFor('www.reddit.com', rules).host, 'reddit.com');
  assert.equal(C.clawdSiteRuleFor('example.com', rules), null);
});

test('blockedFromRules: espelha apenas regras block', () => {
  const rules = [
    { host: 'a.com', level: 'block' },
    { host: 'b.com', level: 'nudge' },
    { host: 'c.com', level: 'block' }
  ];
  assert.deepEqual(C.clawdBlockedFromRules(rules), ['a.com', 'c.com']);
});

/* ============================================================
   Tempo de tela
   ============================================================ */

test('screenTimeAdd: acumula e faz reset diário', () => {
  let st = { day: '', byCategory: {}, totalSec: 0, timesinkSec: 0, focusSec: 0 };
  st = C.clawdScreenTimeAdd(st, 'video', 30, '2026-07-22');
  st = C.clawdScreenTimeAdd(st, 'video', 30, '2026-07-22');
  st = C.clawdScreenTimeAdd(st, 'timesink', 15, '2026-07-22');
  assert.equal(st.byCategory.video, 60);
  assert.equal(st.timesinkSec, 15);
  assert.equal(st.totalSec, 75);
  // novo dia zera tudo
  st = C.clawdScreenTimeAdd(st, 'social', 10, '2026-07-23');
  assert.equal(st.day, '2026-07-23');
  assert.equal(st.byCategory.video, undefined);
  assert.equal(st.byCategory.social, 10);
  assert.equal(st.totalSec, 10);
});

/* ============================================================
   Sanitizers
   ============================================================ */

test('sanitizeSiteRules: remove hosts inválidos, dedup e clamp de nível/categoria', () => {
  const out = C.clawdSanitizeSiteRules([
    { host: 'GOOD.com', level: 'block', category: 'social' },
    { host: 'good.com', level: 'nudge' },                 // dedup do anterior
    { host: 'has space', level: 'block' },                // host inválido
    { host: 'weird.com', level: 'xxx', category: 'zzz' }, // fallback nudge/other
    { host: 'phr.com', level: 'nudge', phrases: ['calma aí 🐾', '', 123] }
  ]);
  assert.equal(out.length, 3);
  assert.equal(out[0].host, 'good.com');
  assert.equal(out[0].level, 'block');
  const weird = out.find(r => r.host === 'weird.com');
  assert.equal(weird.level, 'nudge');
  assert.equal(weird.category, 'other');
  const phr = out.find(r => r.host === 'phr.com');
  assert.deepEqual(phr.phrases, ['calma aí 🐾']);
});

test('sanitizeFocusBlock: clampa durações e valida fase', () => {
  const def = C.clawdDefaultState().focus;
  const f = C.clawdSanitizeFocusBlock({ phase: 'hacked', workMin: 9999, breakMin: -3, cyclesDone: -1 }, def);
  assert.equal(f.phase, 'idle');
  assert.equal(f.workMin, 180);
  assert.equal(f.breakMin, 1);
  assert.equal(f.cyclesDone, 0);
});

test('sanitizeWellbeingBlock: normaliza moodLog', () => {
  const def = C.clawdDefaultState().wellbeing;
  const wb = C.clawdSanitizeWellbeingBlock({
    moodLog: [{ day: '2026-07-22', mood: 9 }, { day: 'bad', mood: 3 }, { day: '2026-07-21', mood: 2 }]
  }, def);
  assert.equal(wb.moodLog.length, 2);   // entrada com dia inválido é descartada
  assert.equal(wb.moodLog[0].mood, 5);  // clamp 9→5
  assert.equal(wb.moodLog[1].mood, 2);  // valor válido preservado
});

/* ============================================================
   Migração v5 → v6
   ============================================================ */

test('migração v5→v6: adiciona blocos e converte blockedSites em siteRules(block)', () => {
  const state = C.clawdMigrateState({
    schemaVersion: 5,
    settings: { blockedSites: ['meubanco.com.br', 'secreto.com'] }
  });
  assert.equal(state.schemaVersion, 6);
  assert.ok(state.focus && state.wellbeing && state.screenTime);
  const hosts = state.settings.siteRules.filter(r => r.level === 'block').map(r => r.host);
  assert.ok(hosts.includes('meubanco.com.br'));
  assert.ok(hosts.includes('secreto.com'));
  // espelho preservado
  assert.deepEqual(state.settings.blockedSites.sort(), ['meubanco.com.br', 'secreto.com'].sort());
});

test('migração v6 é idempotente (não duplica regras)', () => {
  const once = C.clawdMigrateState({ schemaVersion: 5, settings: { blockedSites: ['x.com'] } });
  const twice = C.clawdMigrateState(once);
  assert.deepEqual(twice.settings.siteRules, once.settings.siteRules);
  assert.deepEqual(twice.settings.blockedSites, once.settings.blockedSites);
});

test('migração: rejeita poluição de protótipo em siteRules', () => {
  const evil = JSON.parse('{"schemaVersion":6,"settings":{"siteRules":[{"host":"__proto__","level":"block"}]}}');
  const state = C.clawdMigrateState(evil);
  assert.equal(({}).polluted, undefined);
  // host '__proto__' não é hostname DNS válido → descartado
  assert.ok(!state.settings.siteRules.some(r => r.host === '__proto__'));
});

/* ============================================================
   Validação de mensagens runtime
   ============================================================ */

test('validateRuntimeMessage: ações de foco e bem-estar', () => {
  assert.deepEqual(C.clawdValidateRuntimeMessage({ action: 'focusStart' }), { action: 'focusStart' });
  assert.equal(C.clawdValidateRuntimeMessage({ action: 'logMood', mood: 9 }), null);
  assert.deepEqual(C.clawdValidateRuntimeMessage({ action: 'logMood', mood: 4 }), { action: 'logMood', mood: 4 });
  const ping = C.clawdValidateRuntimeMessage({ action: 'wellbeingPing', kind: 'water' });
  assert.equal(ping.kind, 'water');
  const state = C.clawdValidateRuntimeMessage({ action: 'focusState', focus: { phase: 'work', workMin: 25 } });
  assert.equal(state.focus.phase, 'work');
});
