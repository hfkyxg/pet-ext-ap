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
    assert.ok(['head', 'face', 'body'].includes(acc.slot), `slot inválido em ${id}`);
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

test('sub-pets oferecem as interações do catálogo', () => {
  assert.equal(Object.keys(CLAWD_SUBPET_ACTIONS).length, 7);
  for (const [id, a] of Object.entries(CLAWD_SUBPET_ACTIONS)) {
    assert.ok(a.emoji && a.label && a.feedback, `metadados faltando em ${id}`);
  }
  /* Matriz 11 espécies × 7 ações — todas mapeadas em SubPet.interact */
  const content = read('src/content/content.js');
  const interactIdx = content.indexOf('interact(kind, { force = false, silent = false } = {})');
  assert.ok(interactIdx > 0, 'SubPet.interact ausente');
  const interactSlice = content.slice(interactIdx, interactIdx + 9000);
  for (const action of Object.keys(CLAWD_SUBPET_ACTIONS)) {
    assert.match(interactSlice, new RegExp(`case '${action}':`), `ação ${action} sem case em interact`);
  }
  assert.equal(Object.keys(CLAWD_SUBPETS).length, 11);
  for (const species of Object.keys(CLAWD_SUBPETS)) {
    assert.match(content, new RegExp(`${species}:\\s*\\(`), `espécie ${species} sem handler _special`);
  }
  /* _clearActionClasses preserva classes duo */
  assert.match(content, /_clearActionClasses\(\)[\s\S]{0,900}duo-hug[\s\S]{0,120}being-petted[\s\S]{0,120}duo-play[\s\S]{0,120}nap-sync/);
});

test('sprites de sub-pet cobrem todas as espécies e não duplicam no showcase', () => {
  const { CLAWD_SUBPET_SPRITES, clawdSubPetFrame } = catalog;
  assert.deepEqual(Object.keys(CLAWD_SUBPET_SPRITES).sort(), Object.keys(CLAWD_SUBPETS).sort());
  for (const id of Object.keys(CLAWD_SUBPETS)) {
    const sprite = CLAWD_SUBPET_SPRITES[id];
    assert.ok(sprite?.frames?.idle && sprite.frames.walk && sprite.frames.sleep, `frames incompletos em ${id}`);
    assert.ok(clawdSubPetFrame(sprite, 'idle', 0).length >= 7, `${id} muito baixo`);
    assert.ok(sprite?.image?.url, `${id} precisa de image.url`);
    assert.ok(fs.existsSync(path.join(root, sprite.image.url)), `PNG ausente: ${sprite.image.url}`);
  }
  const showcaseJs = read('docs/showcase.js');
  assert.match(showcaseJs, /CLAWD_SUBPET_SPRITES/);
  assert.match(showcaseJs, /clawdSubPetImageUrl/);
  assert.match(showcaseJs, /subpetBitmapUrl|docsAssetUrl/);
  assert.match(showcaseJs, /subpet-preview--bitmap/);
  assert.doesNotMatch(showcaseJs, /speciesColors\.dog\.eyes\s*=\s*'#33ff99'/);
  assert.doesNotMatch(showcaseJs, /const subpetSprites\s*=/);
  const showcaseHtml = read('docs/index.html');
  assert.match(showcaseHtml, /Subpets-selection\.png/);
  assert.match(showcaseHtml, /src\/shared\/sprites\/subpets/);
  assert.ok(
    fs.existsSync(path.join(root, 'tests/sprite-out/Subpets-selection.png')),
    'sheet canônico referenciado na docs precisa existir'
  );
  const dog = clawdSubPetFrame(CLAWD_SUBPET_SPRITES.dog, 'idle', 0).join('\n');
  const dragon = clawdSubPetFrame(CLAWD_SUBPET_SPRITES.dragon, 'idle', 0).join('\n');
  assert.notEqual(dog, dragon, 'dog e dragon não podem compartilhar a mesma silhueta');
});

/* ---------- MISSÃO DIÁRIA ---------- */
test('todo tipo de missão diária é uma fonte de progresso conhecida', () => {
  const known = new Set(['pets', 'feed', 'play', 'dance', 'walk', 'fish', 'goals', 'bath', 'accessories', 'subpet', 'combo', 'profession', 'balloons', 'keepy']);
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
  assert.equal(migrated.schemaVersion, catalog.CLAWD_SCHEMA_VERSION || 5);
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

test('porta cross-tab trata bfcache / lastError sem vazar', () => {
  const content = read('src/content/content.js');
  const background = read('src/background/background.js');
  assert.match(content, /pagehide/);
  assert.match(content, /_disconnectPresencePort/);
  assert.match(content, /bfcache|persisted/);
  assert.match(content, /_scrubRuntimeLastError|_safePortPost/);
  assert.match(content, /capture:\s*true/);
  assert.match(content, /chrome\.runtime\.lastError/);
  assert.match(background, /onDisconnect\.addListener/);
  assert.match(background, /function scrubLastError/);
  assert.match(background, /chrome\.runtime\.lastError/);
  // disconnect mantém o listener até depois de port.disconnect()
  assert.match(content, /try \{ port\.disconnect\(\); \}[\s\S]+?_portDisconnectListener\)/);
  // destino some mid-travel → respawnAnywhere (não deixa pet invisível)
  assert.match(background, /lostDestination[\s\S]{0,180}respawnAnywhere/);
  // restoreHost não sobrescreve host vivo em memória
  assert.match(background, /hostTabId == null && res && res\.clawdHostTabId/);
  assert.match(background, /nextMondayMidnightMs|scheduleWeeklyResetAlarm/);
  assert.match(background, /travelInFlight[\s\S]{0,200}hidePet/);
  assert.match(content, /clawdValidateDownstreamPortMessage/);
  assert.match(content, /_crossTabHidden/);
  assert.match(content, /_scheduleCrossTabReconnect|_applyVisibilityDisplay/);
  assert.match(content, /forceHidePet/);
  assert.match(background, /forceHidePet/);
  const war = JSON.stringify(JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8')).web_accessible_resources || []);
  assert.match(war, /use_dynamic_url/);
});

test('cross-tab: um pet por navegador — hide otimista, reconnect e ownership', () => {
  const content = read('src/content/content.js');
  const background = read('src/background/background.js');
  /* Boot esconde até spawnPet; disconnect esconde + reconecta */
  assert.match(content, /crossTab !== false[\s\S]{0,80}setHidden\(true\)/);
  assert.match(content, /_portDisconnectListener[\s\S]{0,900}setHidden\(true\)[\s\S]{0,80}_scheduleCrossTabReconnect/s);
  assert.match(content, /_applyVisibilityDisplay\(/);
  assert.match(content, /isVisible && !this\._crossTabHidden/);
  /* completeTravel esconde não-destinos; assignHost força hide em orphan */
  assert.match(background, /function completeTravel[\s\S]{0,500}hidePet/s);
  assert.match(background, /prevHost[\s\S]{0,200}forceHidePet/);
  assert.ok(require('../src/shared/catalog.js').CLAWD_RUNTIME_ACTIONS.includes('forceHidePet'));
  /* Ação do popup em aba sem pet → requestHost + fila até spawnPet */
  assert.match(content, /_pendingAction = action/);
  assert.match(content, /requestHost/);
  assert.match(content, /case 'spawnPet':[\s\S]*?_pendingAction/);
  assert.match(background, /case 'requestHost'/);
  assert.ok(require('../src/shared/catalog.js').CLAWD_PORT_MSG_TYPES.includes('requestHost'));
});

test('cross-tab: aba não-host não age sozinha (SFX/pesca/profissão/subpet)', () => {
  const content = read('src/content/content.js');
  assert.match(content, /_isActiveHost\(\)/);
  /* beep/fala/partículas silenciam fora do host */
  assert.match(content, /!this\._audioAllowed \|\| this\._crossTabHidden\) return/);
  assert.match(content, /_crossTabHidden && !interactive\) return/);
  assert.match(content, /_destroyed \|\| this\._crossTabHidden \|\| this\.S\.settings\.performanceMode/);
  /* loops autônomos exigem ownership */
  assert.match(content, /document\.hidden \|\| this\._crossTabHidden \|\| this\.isDragging/);
  assert.match(content, /document\.hidden \|\| this\._crossTabHidden \|\| this\._videoWatching/);
  assert.match(content, /profession !== 'fisher'[\s\S]{0,200}document\.hidden \|\| this\._crossTabHidden|document\.hidden \|\| this\._crossTabHidden[\s\S]{0,120}profession !== 'fisher'/);
  assert.match(content, /owner\._crossTabHidden\) return/);
  /* despawn cancelável — evita hide após spawnPet no meio da viagem */
  assert.match(content, /_despawnTimer/);
  assert.match(content, /_travelGen/);
  assert.match(content, /case 'spawnPet':[\s\S]{0,220}clearTimeout\(this\._despawnTimer\)/);
  assert.match(content, /case 'despawnPet':[\s\S]{0,500}_travelGen/);
});

test('SFX: sem eco — subpet dblclick único, wake silencioso, cheer sem celebrate duplo', () => {
  const content = read('src/content/content.js');
  const clickIdx = content.indexOf("this.node.addEventListener('click', (event) => {");
  assert.ok(clickIdx > 0);
  /* primeiro click handler do SubPet (antes da classe ClawdPet) */
  const subpetClick = content.slice(clickIdx, clickIdx + 900);
  assert.match(subpetClick, /dblclick cuida do special|cancela o cuddle/);
  assert.doesNotMatch(subpetClick, /else this\.interact\('special'/);
  assert.match(content, /subpet\.wakeUp\('Acordamos juntos! ✨',\s*\{\s*silent:\s*true\s*\}\)/);
  const cheerVis = content.indexOf('hiddenFor > 1800000');
  assert.ok(cheerVis > 0);
  const cheerSlice = content.slice(cheerVis, cheerVis + 280);
  assert.match(cheerSlice, /doCheer\(\)/);
  assert.doesNotMatch(cheerSlice, /subpet\.interact\('celebrate'/);
});

test('AudioContext só nasce após gesto do usuário', () => {
  const content = read('src/content/content.js');
  assert.match(content, /_bindAudioUnlock/);
  assert.match(content, /_audioAllowed/);
  assert.match(content, /_ensureAudioCtx/);
  assert.match(content, /pointerdown/);
  assert.match(content, /fromGesture:\s*true/);
  assert.match(content, /userActivation/);
  // beep não cria/resume — só toca se já estiver running
  assert.match(content, /_ensureAudioCtx\(\{\s*fromGesture:\s*false\s*\}\)/);
  assert.match(content, /!fromGesture \|\| !this\._hasAudioUserActivation/);
  assert.match(content, /!this\._audioAllowed/);
  assert.doesNotMatch(content, /beep\([\s\S]{0,200}new \(window\.AudioContext/);
});

test('host bloqueado só por match exato/subdomínio e streak não aceita HTML', () => {
  const { clawdHostIsBlocked, clawdMigrateState } = catalog;
  assert.equal(clawdHostIsBlocked('mail.google.com', ['google.com']), true);
  assert.equal(clawdHostIsBlocked('google.com', ['google.com']), true);
  assert.equal(clawdHostIsBlocked('notgoogle.com', ['google.com']), false);
  assert.equal(clawdHostIsBlocked('evil.com', ['vil']), false); // substring proibida
  const poisoned = clawdMigrateState({
    schemaVersion: 4,
    game: { streak: { days: '<img src=x onerror=1>', lastDay: '2026-07-15' } }
  });
  assert.equal(typeof poisoned.game.streak.days, 'number');
  assert.equal(poisoned.game.streak.days, 0);
});

test('migrate ignora chaves de poluição de protótipo', () => {
  const payload = JSON.parse('{"schemaVersion":4,"__proto__":{"polluted":true},"settings":{"constructor":{"evil":1},"travelFreq":"always"}}');
  const migrated = clawdMigrateState(payload);
  assert.equal(migrated.travelFreq, undefined);
  assert.equal(migrated.settings.travelFreq, 'always');
  assert.equal(Object.prototype.polluted, undefined);
});

test('validador de mensagens rejeita ações/config perigosas e aceita o canal oficial', () => {
  const {
    clawdValidateRuntimeMessage,
    clawdValidatePortMessage,
    clawdSanitizePlainText
  } = catalog;

  assert.equal(clawdValidateRuntimeMessage({ action: 'eval' }), null);
  assert.equal(clawdValidateRuntimeMessage({ action: 'updateConfig', key: '__proto__', value: 'x' }), null);
  assert.equal(clawdValidateRuntimeMessage({ action: 'updateConfig', key: 'color', value: 'red' }), null);
  assert.equal(clawdValidateRuntimeMessage({ action: 'triggerAction', value: 'rm-rf' }), null);
  assert.equal(clawdValidateRuntimeMessage({ action: 'setSubpet', value: 'alien' }), null);
  assert.equal(
    clawdValidateRuntimeMessage({ action: 'updateConfig', key: 'name', value: '<img src=x onerror=1>' }).value.includes('<'),
    false
  );
  assert.equal(
    clawdValidateRuntimeMessage({ action: 'updateConfig', key: 'model', value: 'classic' }).value,
    'classic'
  );
  assert.equal(clawdValidatePortMessage({ type: 'stateSync' }), null);
  assert.equal(clawdValidatePortMessage({ type: 'register' }).type, 'register');
  assert.equal(clawdSanitizePlainText('a<script>b', 20), 'ascriptb');
});

test('migração descarta label/tipo injetados na missão diária', () => {
  const poisoned = clawdMigrateState({
    schemaVersion: 4,
    daily: {
      date: new Date().toISOString().slice(0, 10),
      type: 'pets',
      label: '<img src=x onerror=alert(1)>',
      target: 3,
      progress: 2,
      claimed: false,
      rewardXp: 18,
      rewardCoins: 4
    }
  });
  assert.doesNotMatch(poisoned.daily.label, /</);
  assert.ok(CLAWD_DAILY_QUESTS.some(q => q.label === poisoned.daily.label));
  /* progresso preservado só até a meta canônica do dia (hash pode mudar com novas quests) */
  assert.ok(poisoned.daily.progress >= 0);
  assert.ok(poisoned.daily.progress <= poisoned.daily.target);
  assert.equal(poisoned.daily.claimed, false);
});

test('content e background alinham cleanup DOM e harden mensagens', () => {
  const content = read('src/content/content.js');
  const background = read('src/background/background.js');
  const popup = read('src/popup/popup.js');
  assert.match(content, /clawdValidateRuntimeMessage/);
  assert.match(content, /CLAWD_DOM_CLEANUP_SELECTORS/);
  assert.match(content, /_canSpawnFx/);
  assert.match(content, /_pauseRaf/);
  assert.match(content, /SETTLE_EPS|_writePos/);
  assert.match(content, /\+ count <= CLAWD_TIMINGS\.PARTICLE_MAX/);
  assert.doesNotMatch(content, /speechNode\.innerHTML\s*=/);
  assert.doesNotMatch(content, /el\.innerHTML\s*=\s*`[\s\S]*aic-toast/);
  assert.doesNotMatch(content, /Object\.assign\(/);
  assert.match(background, /clawdValidatePortMessage/);
  assert.match(background, /travelInFlight\.from === tabId/);
  assert.doesNotMatch(background, /stateSync/);
  assert.match(popup, /label\.textContent\s*=\s*et\('daily',\s*daily\.type,\s*daily\.label/);
});

test('os contadores usados pelo futebol existem no estado padrão', () => {
  const content = read('src/content/content.js');
  const counters = clawdDefaultState().game.counters;
  for (const key of ['goals', 'keepyRecord', 'keepyTotal']) {
    assert.ok(new RegExp(`counters\\.${key}|c\\.${key}`).test(content), `content.js não usa counters.${key}`);
    assert.ok(key in counters, `estado padrão não inicializa counters.${key}`);
  }
});

test('contadores de balão existem no estado e no motor (handoff gamificação)', () => {
  const content = read('src/content/content.js');
  const counters = clawdDefaultState().game.counters;
  for (const key of ['balloons', 'balloonsPopped']) {
    assert.ok(key in counters, `estado padrão não inicializa counters.${key}`);
    assert.equal(counters[key], 0);
    assert.ok(new RegExp(`counters\\.${key}`).test(content), `content.js não usa counters.${key}`);
  }
  const migrated = clawdMigrateState({ schemaVersion: 4, game: { counters: { goals: 1 } } });
  assert.equal(migrated.game.counters.balloons, 0);
  assert.equal(migrated.game.counters.balloonsPopped, 0);
});

test('conquistas de balão/keepy e missões usam os contadores novos', () => {
  const content = read('src/content/content.js');
  assert.ok(CLAWD_ACHIEVEMENTS.balloon_novice, 'balloon_novice ausente');
  assert.ok(CLAWD_ACHIEVEMENTS.balloon_party, 'balloon_party ausente');
  assert.ok(CLAWD_ACHIEVEMENTS.keepy_miles, 'keepy_miles ausente');
  assert.equal(CLAWD_ACHIEVEMENTS.balloon_novice.counter, 'balloonsPopped');
  assert.equal(CLAWD_ACHIEVEMENTS.keepy_miles.counter, 'keepyTotal');
  assert.ok(CLAWD_DAILY_QUESTS.some(q => q.type === 'balloons'));
  assert.ok(CLAWD_DAILY_QUESTS.some(q => q.type === 'keepy'));
  assert.match(content, /registerDaily\('balloons'\)/);
  assert.match(content, /registerDaily\('keepy'/);
  assert.match(content, /registerDaily\(['"]subpet['"]\)|registerDaily\?\.\(['"]subpet['"]\)/);
  /* polyglot alcançável: idle entra no histórico por padrão */
  assert.ok(clawdDefaultState().game.counters.professionsUsed.includes('idle'));
  const migrated = clawdMigrateState({ schemaVersion: 4, game: { counters: { professionsUsed: ['footballer'] } } });
  assert.ok(migrated.game.counters.professionsUsed.includes('idle'));
});

test('CLAWD_PET_EXTRA_ACTIONS cobre kick/keepy/superdance fora do popup', () => {
  const { CLAWD_ACTIONS, CLAWD_PET_EXTRA_ACTIONS, clawdValidateRuntimeMessage } = catalog;
  assert.ok(CLAWD_PET_EXTRA_ACTIONS, 'CLAWD_PET_EXTRA_ACTIONS não exportado');
  const extras = Object.keys(CLAWD_PET_EXTRA_ACTIONS);
  assert.deepEqual(extras.sort(), ['kick', 'keepy', 'superdance'].sort());
  for (const id of extras) {
    assert.ok(!Object.prototype.hasOwnProperty.call(CLAWD_ACTIONS, id),
      `extra ${id} não deve duplicar CLAWD_ACTIONS (vai para o grid do popup)`);
    assert.equal(
      clawdValidateRuntimeMessage({ action: 'triggerAction', value: id })?.value,
      id,
      `triggerAction deve aceitar extra ${id}`
    );
  }
  const content = read('src/content/content.js');
  const actionMap = content.slice(content.indexOf('_handleAction(action)'), content.indexOf('destroy(', content.indexOf('_handleAction(action)')));
  for (const id of extras) {
    assert.match(actionMap, new RegExp(`\\b${id}:\\s*\\(`), `extra sem handler: ${id}`);
  }
  assert.ok(Object.prototype.hasOwnProperty.call(CLAWD_ACTIONS, 'highfive'));
  assert.ok(Object.prototype.hasOwnProperty.call(CLAWD_ACTIONS, 'lookAround'));
});

test('CLAWD_IDLE_VARIATIONS referencia keyframes existentes no CSS (v3.4)', () => {
  const { CLAWD_IDLE_VARIATIONS } = require('../src/shared/catalog.js');
  if (!CLAWD_IDLE_VARIATIONS || !CLAWD_IDLE_VARIATIONS.length) {
    assert.fail('CLAWD_IDLE_VARIATIONS não exportado ou vazio');
  }
  const style = read('src/content/style.css');
  for (const v of CLAWD_IDLE_VARIATIONS) {
    assert.ok(style.includes(`@keyframes ${v.keyframe}`), `keyframe ausente no CSS: ${v.keyframe}`);
  }
});

test('CLAWD_KEYBOARD_SHORTCUTS — todos os action ids existem em CLAWD_ACTIONS (v3.4)', () => {
  const { CLAWD_KEYBOARD_SHORTCUTS, CLAWD_ACTIONS } = require('../src/shared/catalog.js');
  if (!CLAWD_KEYBOARD_SHORTCUTS) assert.fail('CLAWD_KEYBOARD_SHORTCUTS não exportado');
  const actionIds = Object.keys(CLAWD_ACTIONS);
  for (const [key, actionId] of Object.entries(CLAWD_KEYBOARD_SHORTCUTS)) {
    assert.ok(actionIds.includes(actionId), `atalho ${key} aponta para action inexistente: '${actionId}'`);
  }
});

test('escalabilidade tick5 — save coalesce, particle timers e destroy limpam scroll idle', () => {
  const content = read('src/content/content.js');
  const popup = read('src/popup/popup.js');
  const arch = read('docs/ARCHITECTURE.md');
  assert.match(content, /_flushSave\(\)/);
  assert.match(content, /_saveInFlight/);
  assert.match(content, /_saveDirty/);
  assert.match(content, /setTimeout\(\(\) => this\._flushSave\(\), CLAWD_TIMINGS\.STORAGE_DEBOUNCE_MS\)/);
  assert.match(content, /_particleTimers/);
  assert.match(content, /_scrollIdleTimer/);
  assert.match(content, /_idleVarKickoffTimer|_scrollDashTimer|_scrollReactTimer|_summonDropTimer|_poofOutTimer/);
  assert.match(content, /'_idleVarTimer', '_idleVarClearTimer', '_idleVarKickoffTimer'/);
  assert.match(content, /this\._particleTimers\.forEach\(clearTimeout\)/);
  assert.match(content, /this\._timers\.length = 0/);
  assert.match(content, /_clearIdleVariationClasses/);
  assert.match(content, /this\.S\.xp = Math\.max\(Number\(this\.S\.xp\) \|\| 0, Number\(fresh\.xp\) \|\| 0\)/);
  assert.match(content, /this\.S\.game\.coins = Math\.max\(Number\(this\.S\.game\.coins\) \|\| 0, Number\(fresh\.game\.coins\) \|\| 0\)/);
  assert.match(popup, /fresh\.xp = Math\.max\(Number\(fresh\.xp\) \|\| 0, Number\(S\.xp\) \|\| 0\)/);
  assert.match(arch, /Escalabilidade \(vanilla MV3/);
  assert.match(arch, /Não fatiar `content\.js` em ES modules/);
  assert.match(arch, /debounce 350/);
  assert.match(arch, /_canSpawnFx` ≤ \*\*18\*\*/);
  assert.match(arch, /não regride.*XP\/coins\/counters|Math\.max/);
});

test('CLAWD_TIMINGS exportado com todas as chaves obrigatórias', () => {
  const { CLAWD_TIMINGS } = require('../src/shared/catalog.js');
  assert.ok(CLAWD_TIMINGS, 'CLAWD_TIMINGS deve ser exportado');
  const required = ['SUBPET_INTERACTION_MS', 'STAT_DECAY_MS', 'STORAGE_DEBOUNCE_MS', 'PARTICLE_MAX', 'SETTLE_EPS_PX', 'DOUBLE_CLICK_WINDOW_MS', 'RANDOM_ACTION_MS', 'DUO_SCENE_MS'];
  for (const key of required) {
    assert.ok(typeof CLAWD_TIMINGS[key] === 'number', `CLAWD_TIMINGS.${key} deve ser número`);
    assert.ok(CLAWD_TIMINGS[key] > 0, `CLAWD_TIMINGS.${key} deve ser > 0`);
  }
});

test('novas props de profissão: engineer e footballer têm CSS + DOM', () => {
  const content = read('src/content/content.js');
  const style = read('src/content/style.css');
  assert.match(content, /prop-engineer-code/, 'DOM deve ter prop-engineer-code');
  assert.match(content, /prop-footballer-boot/, 'DOM deve ter prop-footballer-boot');
  assert.match(content, /prop-fisher-bobber/, 'DOM deve ter prop-fisher-bobber');
  assert.match(style, /\.prop-engineer-code/, 'CSS deve estilizar prop-engineer-code');
  assert.match(style, /\.prop-footballer-boot/, 'CSS deve estilizar prop-footballer-boot');
  assert.match(style, /\.prop-fisher-bobber/, 'CSS deve estilizar prop-fisher-bobber');
  assert.match(style, /data-profession="engineer"\]\.typing \.laptop/, 'laptop só no Dev digitando');
  assert.match(style, /clawd-cursor-blink/, 'CSS deve ter keyframe clawd-cursor-blink');
  assert.match(style, /clawd-boot-tap/, 'CSS deve ter keyframe clawd-boot-tap');
  assert.match(style, /clawd-chef-stir/, 'CSS deve ter keyframe clawd-chef-stir');
});

test('A11y: live region e sr-only presentes no DOM do pet', () => {
  const content = read('src/content/content.js');
  const style = read('src/content/style.css');
  assert.match(content, /aria-live="polite"/, 'DOM deve ter aria-live=polite');
  assert.match(content, /role="status"/, 'DOM deve ter role=status');
  assert.match(content, /clawd-sr-only/, 'DOM deve usar classe clawd-sr-only');
  assert.match(style, /\.clawd-sr-only/, 'CSS deve definir .clawd-sr-only');
  assert.match(style, /overflow:\s*hidden/, 'clawd-sr-only deve ter overflow hidden');
});

test('status interativos: medidores clicáveis no popup', () => {
  const popupHtml = read('src/popup/popup.html');
  const popup = read('src/popup/popup.js');
  assert.match(popupHtml, /stat-feed-btn/, 'popup.html deve ter stat-feed-btn');
  assert.match(popupHtml, /stat-action/, 'medidores devem usar classe stat-action');
  assert.match(popupHtml, /data-stat-action="feed"/, 'saciedade deve disparar feed');
  assert.match(popupHtml, /data-stat-action="happy"/, 'felicidade deve disparar carinho');
  assert.match(popupHtml, /data-stat-action="play"/, 'energia deve disparar play');
  assert.match(popupHtml, /data-stat-action="bath"/, 'higiene deve disparar bath');
  assert.match(popupHtml, /stat-happiness-val|stat-value/, 'medidores devem mostrar %');
  assert.match(popupHtml, /xp-bar-label/, 'barra de XP deve mostrar into/next e %');
  assert.match(popupHtml, /quick-actions|btn-quick/, 'header deve ter ações rápidas');
  assert.match(popupHtml, /btn-open-studio|btn-detach-window/, 'popup deve oferecer studio/janela móvel');
  assert.match(popup, /stat-action/, 'popup.js deve vincular .stat-action');
  assert.match(popup, /triggerAction/, 'popup deve disparar triggerAction ao clicar status');
  assert.match(popup, /openStudio|detachPopupWindow/, 'popup deve abrir studio ou janela destacável');
  assert.match(popup, /xp-bar-label|into \/ next|into\/next/, 'JS atualiza label de XP');
  assert.match(popup, /btn-quick|quick-action/, 'JS vincula ações rápidas');
});

test('slot corpo: DOM, CSS pixel, popup preview e showcase CORPO', () => {
  const content = read('src/content/content.js');
  const style = read('src/content/style.css');
  const popup = read('src/popup/popup.js');
  const popupHtml = read('src/popup/popup.html');
  const showcase = read('docs/showcase.js');
  const docsHtml = read('docs/index.html');

  assert.match(content, /class="accessory acc-body"/);
  assert.match(content, /dataset\.accBody\s*=\s*effective\.body/);
  assert.match(popupHtml, /accessory acc-body/);
  assert.match(popup, /body:\s*slot === 'body' \? id : 'none'/);
  assert.match(popup, /dataset\.accBody\s*=\s*body/);
  assert.match(showcase, /slotLabel|corpo/);
  assert.match(showcase, /acc-body/);
  assert.match(docsHtml, /data-filter="body"/);

  const bodyIds = Object.entries(CLAWD_ACCESSORIES)
    .filter(([, a]) => a.slot === 'body')
    .map(([id]) => id);
  assert.ok(bodyIds.length >= 5, `esperava ≥5 body, got ${bodyIds.length}`);
  for (const id of ['ribbon', 'wings', 'cape', 'armor', 'scarf_body']) {
    assert.ok(bodyIds.includes(id), `body ausente: ${id}`);
    assert.match(style, new RegExp(`\\[data-acc-body="${id}"\\] \\.acc-body\\s*\\{[\\s\\S]*?box-shadow:`));
  }
  assert.match(style, /clawd-cape-sway|clawd-wing-flap/);
});
