/* ============================================================
   CLAW'D — HARMONIA DA FASE SEGUINTE
   Garante que contexto de página, desafios semanais, personalidade
   e onboarding entram no sistema sem quebrar contratos existentes.
   Roda sem navegador (node:test).
   ============================================================ */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const catalog = require('../src/shared/catalog.js');
const {
  CLAWD_ACTIONS,
  CLAWD_ACCESSORIES,
  CLAWD_ACHIEVEMENTS,
  CLAWD_DAILY_QUESTS,
  CLAWD_WEEKLY_CHALLENGES,
  CLAWD_PAGE_CONTEXTS,
  CLAWD_CONTEXT_REACTIONS,
  clawdPageContextFromHost,
  clawdDefaultState,
  clawdMigrateState,
  clawdISOWeek,
  clawdWeeklyChallengeForWeek,
  clawdEnsureWeeklyChallenge,
  clawdRegisterWeeklyProgress,
  clawdRegisterDailyProgress
} = catalog;

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const content = read('src/content/content.js');
const popupHtml = read('src/popup/popup.html');
const popupJs = read('src/popup/popup.js');
const arch = read('docs/ARCHITECTURE.md');

const TRAIT_KEYS = ['playful', 'lazy', 'curious', 'social', 'foodie'];
const KNOWN_PROGRESS = new Set([
  'pets', 'feed', 'play', 'dance', 'walk', 'fish', 'goals', 'bath',
  'accessories', 'subpet', 'combo', 'profession', 'balloons', 'keepy'
]);

/* ---------- CONTEXTO DE PÁGINA (SSOT ↔ MOTOR) ---------- */

test('harmonia: match de host respeita fronteira (x.com ≠ roblox.com)', () => {
  const { clawdHostMatchesDomain, clawdPageContextFromHost } = require('../src/shared/catalog.js');
  assert.equal(clawdHostMatchesDomain('roblox.com', 'x.com'), false);
  assert.equal(clawdHostMatchesDomain('x.com', 'x.com'), true);
  assert.equal(clawdHostMatchesDomain('www.x.com', 'x.com'), true);
  assert.equal(clawdPageContextFromHost('roblox.com'), 'gaming');
  assert.equal(clawdPageContextFromHost('x.com'), 'social');
  assert.equal(clawdPageContextFromHost('music.youtube.com'), 'music');
  assert.equal(clawdPageContextFromHost('www.youtube.com'), 'video');
});

test('harmonia: clawdPageContextFromHost cobre hosts representativos e idle', () => {
  const samples = {
    coding: ['github.com', 'gitlab.com', 'stackoverflow.com', 'developer.mozilla.org'],
    music: ['open.spotify.com', 'soundcloud.com', 'music.youtube.com'],
    video: ['www.youtube.com', 'netflix.com', 'twitch.tv', 'vimeo.com'],
    shopping: ['amazon.com.br', 'mercadolivre.com.br', 'shopee.com.br'],
    social: ['x.com', 'instagram.com', 'linkedin.com', 'reddit.com'],
    news: ['g1.globo.com', 'bbc.com', 'nytimes.com'],
    email: ['mail.google.com', 'outlook.live.com', 'protonmail.com'],
    gaming: ['store.steampowered.com', 'roblox.com', 'itch.io'],
    health: ['healthline.com', 'saude.gov.br'],
    learning: ['coursera.org', 'udemy.com', 'alura.com.br', 'edx.org'],
    idle: ['example.com', 'localhost', 'about:blank', '', 'weird-site.xyz']
  };
  for (const [expected, hosts] of Object.entries(samples)) {
    for (const host of hosts) {
      assert.equal(
        clawdPageContextFromHost(host),
        expected,
        `${host} deveria resolver para ${expected}`
      );
    }
  }
});

test('harmonia: categorias de contexto têm domínios e reações coerentes', () => {
  assert.equal(Object.keys(CLAWD_PAGE_CONTEXTS).length, 10);
  assert.ok(CLAWD_CONTEXT_REACTIONS.idle, 'idle deve ter reação (curious alto)');
  for (const [ctx, domains] of Object.entries(CLAWD_PAGE_CONTEXTS)) {
    assert.ok(Array.isArray(domains) && domains.length >= 3, `${ctx} precisa de ≥3 hosts`);
    assert.ok(CLAWD_CONTEXT_REACTIONS[ctx], `falta reação para ${ctx}`);
  }
  for (const [ctx, reaction] of Object.entries(CLAWD_CONTEXT_REACTIONS)) {
    assert.ok(TRAIT_KEYS.includes(reaction.trait), `${ctx}: trait inválido ${reaction.trait}`);
    assert.ok(Number.isFinite(reaction.min) && reaction.min >= 0 && reaction.min <= 10,
      `${ctx}: min fora de 0–10`);
    assert.ok(typeof reaction.msg === 'string' && reaction.msg.length > 2, `${ctx}: msg vazia`);
    assert.ok(CLAWD_ACTIONS[reaction.action], `${ctx}: action '${reaction.action}' fora do catálogo`);
  }
});

test('harmonia: motor usa SSOT de contexto (sem mapa local duplicado)', () => {
  assert.match(content, /clawdPageContextFromHost\(/);
  assert.match(content, /CLAWD_CONTEXT_REACTIONS/);
  assert.match(content, /_detectGeneralPageContext\(/);
  assert.match(content, /_onContextChange\(/);
  /* não deve reintroduzir o mapa inline antigo */
  assert.doesNotMatch(
    content,
    /coding:\s*\[\s*'github',\s*'gitlab',\s*'stackoverflow'/
  );
  /* reset para idle: next = host helper, não sticky prevCtx */
  assert.match(content, /const next = .*clawdPageContextFromHost/s);
  assert.match(content, /if \(next !== prevCtx\) this\._onContextChange\(next\)/);
  /* profissão: match com fronteira de domínio (não só includes) */
  assert.match(content, /clawdHostMatchesDomain\(url,\s*k\)/);
});

test('harmonia: mudança coding→idle não gruda no contexto anterior (contrato lógico)', () => {
  let current;
  const detect = (hostname) => {
    const prev = current;
    const next = clawdPageContextFromHost(hostname);
    current = next;
    return { prev, next, changed: prev !== undefined && next !== prev };
  };
  assert.deepEqual(detect('github.com'), { prev: undefined, next: 'coding', changed: false });
  assert.deepEqual(detect('example.com'), { prev: 'coding', next: 'idle', changed: true });
  assert.deepEqual(detect('netflix.com'), { prev: 'idle', next: 'video', changed: true });
  assert.deepEqual(detect('example.org'), { prev: 'video', next: 'idle', changed: true });
});

/* ---------- DESAFIOS SEMANAIS ↔ DIÁRIO ↔ MOTOR ---------- */

test('harmonia: pool semanal completa, tipos únicos e recompensas válidas', () => {
  assert.equal(CLAWD_WEEKLY_CHALLENGES.length, 12);
  const types = CLAWD_WEEKLY_CHALLENGES.map((w) => w.type);
  assert.equal(new Set(types).size, types.length, 'tipos semanais devem ser únicos');
  for (const w of CLAWD_WEEKLY_CHALLENGES) {
    assert.ok(KNOWN_PROGRESS.has(w.type), `tipo semanal desconhecido: ${w.type}`);
    assert.ok(w.target >= 5, `${w.type}: target semanal muito baixo`);
    assert.ok(w.rewardXp >= 80 && w.rewardCoins >= 18, `${w.label}: recompensa fraca`);
    assert.ok(w.badge && w.label && w.desc, `${w.type}: metadados incompletos`);
  }
});

test('harmonia: progresso semanal avança, limita e ignora tipo errado', () => {
  const state = clawdDefaultState();
  const challenge = clawdEnsureWeeklyChallenge(state);
  const wrong = CLAWD_WEEKLY_CHALLENGES.find((w) => w.type !== challenge.type)?.type || 'bath';
  clawdRegisterWeeklyProgress(state, wrong, 99);
  assert.equal(state.weekly.progress, 0, 'tipo errado não deve avançar');
  clawdRegisterWeeklyProgress(state, challenge.type, challenge.target + 10);
  assert.equal(state.weekly.progress, challenge.target, 'não pode passar do alvo');
  state.weekly.claimed = true;
  clawdRegisterWeeklyProgress(state, challenge.type, 1);
  assert.equal(state.weekly.progress, challenge.target, 'claimed não deve avançar');
});

test('harmonia: registerDaily do motor alimenta weekly no mesmo type', () => {
  assert.match(content, /clawdRegisterWeeklyProgress\(this\.S,\s*type/);
  for (const w of CLAWD_WEEKLY_CHALLENGES) {
    const re = new RegExp(`registerDaily\\(['"]${w.type}['"]`);
    assert.match(content, re, `motor não registra progresso diário/semanal para '${w.type}'`);
  }
});

test('harmonia: rotação ISO week cobre toda a pool semanal', () => {
  const seen = new Set();
  for (let year = 2024; year <= 2027; year++) {
    for (let week = 1; week <= 53; week++) {
      const key = `${year}-W${String(week).padStart(2, '0')}`;
      seen.add(clawdWeeklyChallengeForWeek(key).type);
    }
  }
  for (const w of CLAWD_WEEKLY_CHALLENGES) {
    assert.ok(seen.has(w.type), `desafio '${w.type}' nunca sorteado na rotação`);
  }
  assert.equal(clawdISOWeek('2026-07-16').startsWith('2026-W'), true);
});

test('harmonia: daily e weekly compartilham o mesmo vocabulário de progresso', () => {
  const dailyTypes = new Set(CLAWD_DAILY_QUESTS.map((q) => q.type));
  const weeklyTypes = new Set(CLAWD_WEEKLY_CHALLENGES.map((w) => w.type));
  for (const t of weeklyTypes) {
    assert.ok(dailyTypes.has(t), `weekly '${t}' sem quest diária correspondente`);
  }
  for (const t of dailyTypes) {
    assert.ok(KNOWN_PROGRESS.has(t), `daily '${t}' fora do vocabulário conhecido`);
  }
  /* simulação: progresso daily do type atual do weekly também move weekly */
  const state = clawdDefaultState();
  const weekly = clawdEnsureWeeklyChallenge(state);
  state.daily = { ...state.daily, type: weekly.type, target: 3, progress: 0, claimed: false };
  clawdRegisterDailyProgress(state, weekly.type, 1);
  clawdRegisterWeeklyProgress(state, weekly.type, 1);
  assert.equal(state.daily.progress, 1);
  assert.equal(state.weekly.progress, 1);
});

/* ---------- PERSONALIDADE ↔ FALA ↔ IDLE ---------- */

test('harmonia: personalidade e customSpeech no estado, migração e sanitize', () => {
  const fresh = clawdDefaultState();
  for (const key of TRAIT_KEYS) {
    assert.ok(key in fresh.personality, `traço ausente: ${key}`);
    assert.ok(fresh.personality[key] >= 0 && fresh.personality[key] <= 10);
  }
  assert.ok(Array.isArray(fresh.customSpeech));

  const migrated = clawdMigrateState({
    schemaVersion: 4,
    xp: 50,
    customSpeech: ['Oi!', '<script>', '  ', 'Bora!'],
    personality: { playful: 99, lazy: -3, curious: 5, social: 'x', foodie: 4, evil: 1 }
  });
  assert.ok(Array.isArray(migrated.customSpeech));
  assert.ok(migrated.customSpeech.every((s) => typeof s === 'string' && !s.includes('<')));
  assert.ok(migrated.personality.playful <= 10);
  assert.ok(migrated.personality.lazy >= 0);
  assert.equal('evil' in migrated.personality, false);
  assert.ok(migrated.weekly && migrated.weekly.type);
});

test('harmonia: content pondera customSpeech e idle por traços', () => {
  assert.match(content, /customSpeech/);
  assert.match(content, /personality\?\.social/);
  /* Rotação embaralhada (_nextPetAction) reforça traços sem traitBoost legado */
  assert.match(content, /_nextPetAction\(\)/);
  assert.match(content, /playful.*>=\s*7[\s\S]*dance/s);
  assert.match(content, /lazy.*>=\s*7[\s\S]*stretch/s);
  assert.match(content, /curious.*>=\s*7[\s\S]*lookAround/s);
  assert.match(content, /social.*>=\s*7[\s\S]*highfive/s);

  const boostActions = [
    'dance', 'jump', 'somersault', 'balloon',
    'wink', 'stretch', 'meditate',
    'lookAround', 'peek', 'clap',
    'wave', 'highfive', 'hug'
  ];
  for (const id of boostActions) {
    assert.ok(CLAWD_ACTIONS[id], `reforço de traço aponta para ação inexistente: ${id}`);
  }
});

test('harmonia: popup persiste personality e customSpeech no allowlist de config', () => {
  assert.match(popupJs, /personality/);
  assert.match(popupJs, /customSpeech/);
  assert.match(content, /'personality',\s*'customSpeech'/);
});

/* ---------- ONBOARDING ↔ CONTADORES VIVOS ---------- */

test('harmonia: onboarding espelha contagens do catálogo vivo', () => {
  const acc = Object.keys(CLAWD_ACCESSORIES).length;
  const ach = Object.keys(CLAWD_ACHIEVEMENTS).length;
  const weekly = CLAWD_WEEKLY_CHALLENGES.length;
  assert.match(popupHtml, new RegExp(`${acc} itens`));
  assert.match(popupHtml, new RegExp(`${ach} conquistas`));
  assert.match(popupHtml, new RegExp(`${weekly} desafios semanais`));
  assert.doesNotMatch(popupHtml, /24 itens|25 conquistas/);
});

/* ---------- DOCS / ARQUITETURA ---------- */

test('harmonia: ARCHITECTURE documenta SSOT de contexto e pool semanal', () => {
  assert.match(arch, /CLAWD_PAGE_CONTEXTS/);
  assert.match(arch, /clawdPageContextFromHost/);
  assert.match(arch, /CLAWD_CONTEXT_REACTIONS|12.*desafios|pool expandido/i);
  assert.match(arch, /Fase seguinte/);
});

/* ---------- EXPORTS OBRIGATÓRIOS PARA A FASE ---------- */

test('harmonia: catálogo exporta símbolos da fase seguinte', () => {
  for (const key of [
    'CLAWD_PAGE_CONTEXTS',
    'CLAWD_CONTEXT_REACTIONS',
    'clawdPageContextFromHost',
    'CLAWD_WEEKLY_CHALLENGES',
    'clawdWeeklyChallengeForWeek',
    'clawdEnsureWeeklyChallenge',
    'clawdRegisterWeeklyProgress',
    'clawdISOWeek'
  ]) {
    assert.ok(catalog[key] != null, `export ausente: ${key}`);
  }
});
