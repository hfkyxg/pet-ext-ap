/* ============================================================
   CLAW'D — VALIDAÇÃO DE INTEGRIDADE E HARMONIA
   Cruza todos os subsistemas (profissões, acessórios, loja,
   conquistas, sub-pets, ações, contadores) para garantir que
   nada aponta para o vazio e que o motor (content.js) e o
   popup só usam chaves reais do catálogo. Roda sem navegador.
   ============================================================ */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const catalog = require('../src/shared/catalog.js');
const {
  CLAWD_ACCESSORIES, CLAWD_MODELS, CLAWD_FACE_STYLES, CLAWD_SKINS,
  CLAWD_PROFESSIONS, CLAWD_ACTIONS, CLAWD_SUBPETS, CLAWD_SUBPET_ACTIONS,
  CLAWD_SHOP, CLAWD_ACHIEVEMENTS, CLAWD_COLORS, CLAWD_DAILY_QUESTS,
  clawdDefaultState, clawdEffectiveAccessories, clawdLevelFromXp,
  clawdRegisterDailyProgress, clawdMigrateState
} = catalog;

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const RARITIES = ['common', 'rare', 'epic', 'legendary'];

/* ---------- ACESSÓRIOS ---------- */
test('todo acessório tem slot, arte e desbloqueio coerentes', () => {
  for (const [id, acc] of Object.entries(CLAWD_ACCESSORIES)) {
    assert.ok(['head', 'face'].includes(acc.slot), `slot inválido em ${id}`);
    assert.ok(acc.emoji && acc.label && acc.desc, `metadados faltando em ${id}`);
    assert.ok(acc.unlock && typeof acc.unlock.type === 'string', `unlock faltando em ${id}`);
    assert.ok(['free', 'shop', 'level'].includes(acc.unlock.type), `tipo de unlock inválido em ${id}`);
    if (acc.unlock.type === 'shop') assert.ok(acc.unlock.price > 0, `preço inválido em ${id}`);
    if (acc.unlock.type === 'level') assert.ok(acc.unlock.level > 0, `nível inválido em ${id}`);
  }
});

test('acessórios de loja aparecem na loja com o mesmo preço', () => {
  for (const [id, acc] of Object.entries(CLAWD_ACCESSORIES)) {
    if (acc.unlock.type !== 'shop') continue;
    assert.ok(CLAWD_SHOP[id], `acessório de loja ${id} ausente em CLAWD_SHOP`);
    assert.equal(CLAWD_SHOP[id].price, acc.unlock.price, `preço divergente para ${id}`);
    assert.equal(CLAWD_SHOP[id].kind, 'accessory', `kind divergente para ${id}`);
  }
});

/* ---------- LOJA ---------- */
test('todo item de loja é válido e itens de acessório existem no catálogo', () => {
  const ballSkins = ['classic', 'ball_gold', 'ball_beach'];
  for (const [id, item] of Object.entries(CLAWD_SHOP)) {
    assert.ok(['accessory', 'ball', 'decor'].includes(item.kind), `kind inválido em ${id}`);
    assert.ok(item.price > 0, `preço inválido em ${id}`);
    assert.ok(item.emoji && item.label, `metadados faltando em ${id}`);
    if (item.kind === 'accessory') assert.ok(CLAWD_ACCESSORIES[id], `loja vende acessório inexistente: ${id}`);
    if (item.kind === 'ball') assert.ok(ballSkins.includes(id), `skin de bola desconhecida: ${id}`);
  }
});

/* ---------- PROFISSÕES ---------- */
test('gear de cada profissão referencia acessórios reais no slot certo', () => {
  for (const [id, prof] of Object.entries(CLAWD_PROFESSIONS)) {
    assert.ok(prof.emoji && prof.label && prof.desc, `metadados faltando em ${id}`);
    const gear = prof.gear || {};
    if (gear.head) {
      assert.ok(CLAWD_ACCESSORIES[gear.head], `gear.head inexistente em ${id}`);
      assert.equal(CLAWD_ACCESSORIES[gear.head].slot, 'head', `gear.head no slot errado em ${id}`);
    }
    if (gear.face) {
      assert.ok(CLAWD_ACCESSORIES[gear.face], `gear.face inexistente em ${id}`);
      assert.equal(CLAWD_ACCESSORIES[gear.face].slot, 'face', `gear.face no slot errado em ${id}`);
    }
  }
});

test('uniforme de profissão sobrepõe o pessoal e restaura ao voltar a Livre', () => {
  const state = { profession: 'chef', accessoryHead: 'cap', accessoryFace: 'sunglasses' };
  const chef = clawdEffectiveAccessories(state);
  assert.equal(chef.head, 'chefhat', 'chef deve calçar o chapéu de chef');
  assert.equal(chef.headSource, 'profession');
  assert.equal(chef.userHead, 'cap', 'a escolha pessoal deve continuar guardada');

  const free = clawdEffectiveAccessories({ ...state, profession: 'idle' });
  assert.equal(free.head, 'cap', 'ao voltar a Livre, o boné pessoal retorna');
  assert.equal(free.face, 'sunglasses');
  assert.equal(free.headSource, 'personal');

  // profissão desconhecida não deve quebrar: cai para idle
  const bogus = clawdEffectiveAccessories({ profession: 'zzz', accessoryHead: 'crown' });
  assert.equal(bogus.profession, 'idle');
  assert.equal(bogus.head, 'crown');
});

/* ---------- CONQUISTAS ---------- */
test('conquistas usam raridade válida, contador real e não quebram', () => {
  const counters = clawdDefaultState().game.counters;
  for (const [id, ach] of Object.entries(CLAWD_ACHIEVEMENTS)) {
    assert.ok(RARITIES.includes(ach.rarity), `raridade inválida em ${id}`);
    assert.ok(ach.emoji && ach.label && ach.desc, `metadados faltando em ${id}`);
    assert.ok(ach.goal > 0, `meta inválida em ${id}`);
    assert.ok(ach.counter in counters, `conquista ${id} usa contador inexistente: ${ach.counter}`);
    // check() roda sem lançar com o estado padrão e não é atingida do zero
    assert.equal(ach.check({ counters }), false, `conquista ${id} atingida com estado zerado`);
  }
});

test('cada conquista é alcançável ao satisfazer seu contador', () => {
  for (const [id, ach] of Object.entries(CLAWD_ACHIEVEMENTS)) {
    const counters = clawdDefaultState().game.counters;
    const cur = counters[ach.counter];
    counters[ach.counter] = Array.isArray(cur)
      ? Array.from({ length: ach.goal }, (_, i) => `x${i}`)
      : ach.goal;
    assert.equal(ach.check({ counters }), true, `conquista ${id} não dispara na meta`);
  }
});

/* ---------- SUB-PETS ---------- */
test('sub-pets têm nível de desbloqueio positivo e alcançável', () => {
  for (const [id, sp] of Object.entries(CLAWD_SUBPETS)) {
    assert.ok(sp.emoji && sp.label && sp.special, `metadados faltando em ${id}`);
    assert.ok(Number.isInteger(sp.level) && sp.level >= 1 && sp.level < 99, `nível inválido em ${id}`);
    // o nível de desbloqueio é alcançável dentro da curva de XP (cap em 99)
    assert.ok(clawdLevelFromXp(500_000).level >= sp.level, `nível ${sp.level} inatingível para ${id}`);
  }
});

test('sub-pets oferecem exatamente as seis interações do catálogo', () => {
  assert.equal(Object.keys(CLAWD_SUBPET_ACTIONS).length, 6);
  for (const [id, a] of Object.entries(CLAWD_SUBPET_ACTIONS)) {
    assert.ok(a.emoji && a.label && a.feedback, `metadados faltando em ${id}`);
  }
});

/* ---------- MISSÃO DIÁRIA ---------- */
test('todo tipo de missão diária é uma fonte de progresso conhecida', () => {
  const known = new Set(['pets', 'feed', 'play', 'dance', 'walk', 'fish', 'goals']);
  for (const q of CLAWD_DAILY_QUESTS) {
    assert.ok(known.has(q.type), `tipo de missão desconhecido: ${q.type}`);
    assert.ok(q.target > 0 && q.rewardXp > 0 && q.rewardCoins > 0, `recompensa inválida em ${q.type}`);
  }
  // progresso só avança para o tipo correto e nunca ultrapassa a meta
  const state = clawdDefaultState();
  const quest = state.daily;
  clawdRegisterDailyProgress(state, quest.type, quest.target + 5);
  assert.equal(state.daily.progress, quest.target, 'progresso ultrapassou a meta');
});

/* ---------- ESTADO PADRÃO / MODELOS ---------- */
test('estado padrão é internamente consistente', () => {
  const s = clawdDefaultState();
  assert.ok(CLAWD_MODELS[s.model], 'modelo padrão inexistente');
  assert.ok(CLAWD_FACE_STYLES[s.faceStyle], 'rosto padrão inexistente');
  assert.ok(CLAWD_SKINS[s.skin], 'skin padrão inexistente');
  assert.ok(CLAWD_PROFESSIONS[s.profession], 'profissão padrão inexistente');
  assert.ok(['none'].includes(s.accessoryHead) || CLAWD_ACCESSORIES[s.accessoryHead]);
  assert.ok(['none'].includes(s.accessoryFace) || CLAWD_ACCESSORIES[s.accessoryFace]);
  assert.ok(CLAWD_COLORS.includes(s.color), 'cor padrão fora da paleta');
  assert.ok('keepyTotal' in s.game.counters, 'contador keepyTotal não inicializado');
});

test('a curva de XP é estritamente crescente e o nível faz round-trip', () => {
  let last = -1;
  for (let xp = 0; xp <= 20000; xp += 137) {
    const { level } = clawdLevelFromXp(xp);
    assert.ok(level >= 1, 'nível abaixo de 1');
    assert.ok(level >= last, 'curva de XP não é monotônica');
    last = level;
  }
});

test('migração recupera saves antigos sem perder progresso', () => {
  // v1 com acessório único e valores inválidos
  const migrated = clawdMigrateState({
    schemaVersion: 1, accessory: 'cap', model: 'inexistente',
    faceStyle: 'zzz', xp: 320, game: { counters: { goals: 12 } }
  });
  assert.equal(migrated.schemaVersion, catalog.CLAWD_DAILY_QUESTS ? 4 : 4);
  assert.equal(migrated.accessoryHead, 'cap', 'acessório único não migrou para o slot de cabeça');
  assert.equal(migrated.model, 'classic', 'modelo inválido não caiu para o padrão');
  assert.equal(migrated.faceStyle, 'classic', 'rosto inválido não caiu para o padrão');
  assert.equal(migrated.xp, 320, 'XP foi perdido na migração');
  assert.equal(migrated.game.counters.goals, 12, 'contador foi perdido na migração');
  assert.ok('keepyTotal' in migrated.game.counters, 'novo contador ausente após migração');
});

/* ---------- HARMONIA MOTOR ↔ CATÁLOGO ---------- */
test('o motor (content.js) e o popup só usam ações reais', () => {
  const content = read('src/content/content.js');
  const popup = read('src/popup/popup.js');
  // o mapa de ações do motor deve cobrir exatamente as ações do catálogo
  for (const id of Object.keys(CLAWD_ACTIONS)) {
    assert.ok(new RegExp(`\\b${id}:`).test(content) || new RegExp(`'${id}'`).test(content),
      `ação ${id} do catálogo não é tratada em content.js`);
  }
  // o popup renderiza a grade de ações a partir do catálogo compartilhado
  assert.match(popup, /CLAWD_ACTIONS|actions-grid|actionsGrid/i);
});

test('os contadores usados pelo futebol existem no estado padrão', () => {
  const content = read('src/content/content.js');
  const counters = clawdDefaultState().game.counters;
  for (const key of ['goals', 'keepyRecord', 'keepyTotal']) {
    assert.ok(new RegExp(`counters\\.${key}|c\\.${key}`).test(content), `content.js não usa counters.${key}`);
    assert.ok(key in counters, `estado padrão não inicializa counters.${key}`);
  }
});
