const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {
  CLAWD_ACCESSORIES,
  CLAWD_PROFESSIONS,
  CLAWD_ACTIONS,
  clawdDefaultState,
  clawdDailyQuestForDate,
  clawdEnsureDailyQuest,
  clawdRegisterDailyProgress,
  clawdMigrateState,
  clawdLevelFromXp,
  clawdHasExtensionContext,
  clawdIsExtensionContextError,
  clawdSafeExtensionCall,
  clawdGuardExtensionCallback
} = require('../src/shared/catalog.js');
const styleSource = fs.readFileSync(require.resolve('../src/content/style.css'), 'utf8');
const contentSource = fs.readFileSync(require.resolve('../src/content/content.js'), 'utf8');
const backgroundSource = fs.readFileSync(require.resolve('../src/background/background.js'), 'utf8');

test('estado padrão cria uma missão diária válida', () => {
  const state = clawdDefaultState();
  assert.equal(state.daily.progress, 0);
  assert.ok(state.daily.target > 0);
  assert.equal(state.daily.claimed, false);
});

test('progresso diário acumula, limita no alvo e troca no novo dia', () => {
  const state = clawdDefaultState();
  state.daily = clawdDailyQuestForDate('2026-07-14');
  const type = state.daily.type;
  clawdRegisterDailyProgress(state, type);
  clawdRegisterDailyProgress(state, type, 999);
  assert.equal(state.daily.progress, state.daily.target);
  clawdEnsureDailyQuest(state, '2026-07-15');
  assert.equal(state.daily.date, '2026-07-15');
  assert.equal(state.daily.progress, 0);
});

test('migração preserva saves antigos e adiciona missão sem corromper sub-pets', () => {
  const state = clawdMigrateState({ schemaVersion: 2, xp: 500, accessory: 'cap', subpets: { active: 'dog' } });
  assert.equal(state.schemaVersion, 3);
  assert.equal(state.accessoryHead, 'cap');
  assert.equal(state.subpets.active, 'dog');
  assert.ok(state.daily.date);
});

test('curva de nível permanece progressiva', () => {
  const low = clawdLevelFromXp(0);
  const high = clawdLevelFromXp(1000);
  assert.equal(low.level, 1);
  assert.ok(high.level > low.level);
  assert.ok(high.next > 0);
});

test('cada acessório catalogado possui uma camada pixel-art CSS', () => {
  for (const [id, accessory] of Object.entries(CLAWD_ACCESSORIES)) {
    const selector = `[data-acc-${accessory.slot}="${id}"]`;
    assert.match(styleSource, new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('todos os acessórios também possuem variante contínua para o modo liso', () => {
  assert.equal(Object.keys(CLAWD_ACCESSORIES).length, 14);
  for (const [id, accessory] of Object.entries(CLAWD_ACCESSORIES)) {
    const selector = `.smooth[data-acc-${accessory.slot}="${id}"]`;
    assert.match(
      styleSource,
      new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
      `variante lisa ausente: ${id}`
    );
  }
});

test('sub-pet e deslocamentos não usam timer fixo para renderizar frames', () => {
  assert.doesNotMatch(contentSource, /_frameTimer\s*=\s*setInterval/);
  assert.match(contentSource, /measureRefreshRate\(\)/);
  assert.match(contentSource, /requestAnimationFrame\(step\)/);
});

test('sprite padrão é estático e pernas só animam durante deslocamento', () => {
  assert.match(styleSource, /@keyframes clawd-pixel-walk/);
  assert.doesNotMatch(styleSource, /@keyframes walk\s*\{/);
  assert.match(styleSource, /#aic-clawd-node\[data-clawd-owned="true"\]\s*\{[\s\S]*all:\s*initial;[\s\S]*animation:\s*none !important;/);
  assert.match(styleSource, /#aic-clawd-node \.pixel-sprite\s*\{[\s\S]*animation:\s*none !important;/);
  assert.match(styleSource, /#aic-clawd-node\.walking \.pixel-sprite/);
  assert.match(styleSource, /#aic-clawd-node\.running \.pixel-sprite/);
  assert.match(contentSource, /startGlide\(velocityX, velocityY\)/);
  assert.match(contentSource, /this\.isDragging[\s\S]{0,1500}this\.setState\('walking'\)/);
  assert.match(contentSource, /Math\.hypot\(velocityX, velocityY\) < 0\.35[\s\S]{0,160}this\.setState\('idle'\)/);
});

test('keyframes internos são isolados do CSS das páginas visitadas', () => {
  const keyframes = [...styleSource.matchAll(/@keyframes\s+([\w-]+)/g)].map(match => match[1]);
  assert.ok(keyframes.length > 20, 'catálogo de animações inesperadamente vazio');
  assert.ok(
    keyframes.every(name => name.startsWith('clawd-')),
    `keyframes sem namespace: ${keyframes.filter(name => !name.startsWith('clawd-')).join(', ')}`
  );
  assert.match(styleSource, /#aic-clawd-node \.(?:smooth-sprite|smooth-core|smooth-leg)/);
});

test('sub-pets suportam apelidos e paletas customizadas por espécie', () => {
  const state = clawdDefaultState();
  state.subpets.names.dog = 'Rex';
  state.subpets.colors.dog = '#4a90e2';
  const migrated = clawdMigrateState(state);
  assert.equal(migrated.subpets.names.dog, 'Rex');
  assert.equal(migrated.subpets.colors.dog, '#4a90e2');
  assert.match(contentSource, /if \(this\.spriteNode\) this\._paint\(\);/);
  assert.match(contentSource, /this\.S\.subpets\s*=\s*stored\.subpets;/);
  assert.doesNotMatch(contentSource, /changes\.clawdState\s*\|\|\s*this\._writing/);
  assert.match(contentSource, /this\.S\.subpets\s*=\s*fresh\.subpets;\s*this\.refreshSubpet\(\);/);
});

test('modo liso troca a grade por uma silhueta contínua do mesmo pet', () => {
  assert.match(styleSource, /#aic-clawd-node\.smooth \.sprite-stack\s*\{[\s\S]*filter:\s*drop-shadow/);
  assert.doesNotMatch(styleSource, /#aic-clawd-node\.smooth \.sprite-stack\s*\{[^}]*blur\(/);
  assert.match(styleSource, /#aic-clawd-node\.smooth,[\s\S]*background-color:\s*transparent !important;[\s\S]*background-image:\s*none !important;/);
  assert.match(contentSource, /class="smooth-sprite" id="aic-smooth-sprite"/);
  assert.match(styleSource, /#aic-clawd-node\.smooth \.pixel-sprite\s*\{[\s\S]*display:\s*none !important;[\s\S]*box-shadow:\s*none !important;/);
  assert.match(styleSource, /#aic-clawd-node\.smooth \.smooth-sprite\s*\{\s*display:\s*block;/);
  assert.match(styleSource, /\.smooth-core\s*\{[\s\S]*width:\s*28px;[\s\S]*height:\s*24px;[\s\S]*background:\s*var\(--agent-color\);[\s\S]*border-radius:\s*0;/);
  assert.match(styleSource, /\.smooth-leg\s*\{[\s\S]*top:\s*24px;[\s\S]*height:\s*8px;[\s\S]*border-radius:\s*0;/);
  assert.match(styleSource, /\.smooth\.walking \.smooth-leg/);
  assert.match(styleSource, /\.smooth:not\(\.walking\):not\(\.running\) \.smooth-leg\s*\{\s*animation:\s*none;/);
});

test('pescador tem lago interativo e personalização de sub-pet ao vivo', () => {
  assert.match(styleSource, /\.aic-lake[\s\S]*pointer-events: auto/);
  assert.match(contentSource, /setSubpetColor/);
  assert.match(contentSource, /_lakeEl\.addEventListener\('click'/);
});

test('emoções combinam balão de emoji, piscada e expressão do sprite', () => {
  assert.match(contentSource, /class="emotion-face" id="aic-emotion-face"/);
  assert.match(contentSource, /showEmotionEmoji\(emoji, duration = 2600\)/);
  assert.match(contentSource, /const stateEmoji = \{[\s\S]*\}\[newState\]/);
  assert.match(styleSource, /\.emotion-badge\.visible/);
  assert.match(styleSource, /@keyframes clawd-eye-cover/);
  assert.match(styleSource, /\.emotion-mouth\s*\{[\s\S]*opacity:\s*0;/);
  assert.match(styleSource, /\[data-emotion="sad"\] \.emotion-mouth/);
  assert.match(styleSource, /\[data-emotion="hungry"\] \.emotion-mouth/);
  assert.match(styleSource, /\[data-emotion="joyful"\] \.emotion-mouth/);
  assert.match(styleSource, /#aic-clawd-node\.happy \.emotion-mouth/);
  assert.match(styleSource, /\.emotion-mouth\s*\{[\s\S]*background:\s*transparent;/);
  assert.doesNotMatch(styleSource, /\[data-emotion="joyful"\] \.emotion-mouth\s*\{[^}]*background:\s*#fff/);
});

test('catálogos de ações e profissões estão ligados ao motor do pet', () => {
  const actionMap = contentSource.slice(contentSource.indexOf('_handleAction(action)'), contentSource.indexOf('destroy(', contentSource.indexOf('_handleAction(action)')));
  for (const action of Object.keys(CLAWD_ACTIONS)) {
    assert.match(actionMap, new RegExp(`\\b${action}:\\s*\\(`), `ação sem handler: ${action}`);
  }
  for (const profession of Object.keys(CLAWD_PROFESSIONS)) {
    assert.ok(contentSource.includes(`'${profession}'`) || contentSource.includes(`${profession}:`), `profissão ausente: ${profession}`);
  }
  assert.match(contentSource, /--clawd-step-duration/);
  assert.match(contentSource, /--clawd-run-duration/);
});

test('reinjeção destrói a instância anterior e remove pets órfãos', () => {
  assert.match(contentSource, /window\.__clawd\.destroy\(\)/);
  assert.match(contentSource, /window\.__clawdBootId !== bootId/);
  assert.match(contentSource, /case 'healthcheck':[\s\S]{0,260}this\.node\?\.isConnected[\s\S]{0,180}document\.getElementById\('aic-clawd-node'\) === this\.node/);
  assert.match(contentSource, /chrome\.storage\.onChanged\.removeListener/);
  assert.match(contentSource, /chrome\.runtime\.onMessage\.removeListener/);
  assert.match(contentSource, /document\.querySelectorAll\(\[/);
  assert.match(backgroundSource, /RUNTIME_CONTEXT_SETTLE_MS\s*=\s*900/);
  assert.match(backgroundSource, /async function hasStableLiveContent\(tabId\)/);
  assert.match(backgroundSource, /if \(!await pingLiveContent\(tabId\)\) return false;\s*await waitForContextSettlement\(\);\s*return pingLiveContent\(tabId\);/);
  assert.match(backgroundSource, /const mostRecentEligible = eligibleTabs\.reduce/);
  assert.match(backgroundSource, /async function injectClawdIntoTab\(tabId\)[\s\S]*attempt < 3[\s\S]*await pingLiveContent\(tabId\)/);
});

test('contexto MV3 invalidado é detectado sem lançar erro', () => {
  const invalidApi = {
    runtime: { get id() { throw new Error('Extension context invalidated.'); } },
    storage: { local: {} }
  };
  assert.equal(clawdHasExtensionContext(invalidApi), false);
  assert.equal(clawdIsExtensionContextError(new Error('Extension context invalidated.')), true);
});

test('chamada síncrona usa fallback e encerra a instância no contexto inválido', () => {
  const invalidApi = { runtime: { id: '' }, storage: { local: {} } };
  let invalidations = 0;
  const result = clawdSafeExtensionCall(invalidApi, () => { throw new Error('não deveria executar'); }, {
    fallback: 'offline',
    onInvalidated: () => { invalidations++; }
  });
  assert.equal(result, 'offline');
  assert.equal(invalidations, 1);
});

test('rejeição assíncrona por contexto invalidado não fica sem tratamento', async () => {
  const validApi = { runtime: { id: 'test-extension' }, storage: { local: {} } };
  const result = await clawdSafeExtensionCall(
    validApi,
    () => Promise.reject(new Error('Extension context invalidated.')),
    { fallback: null }
  );
  assert.equal(result, null);
});

test('callback tardio não executa depois que o contexto expira', () => {
  const api = { runtime: { id: 'test-extension' }, storage: { local: {} } };
  let calls = 0;
  let invalidations = 0;
  const guarded = clawdGuardExtensionCallback(api, () => { calls++; }, () => { invalidations++; });
  api.runtime.id = '';
  guarded();
  assert.equal(calls, 0);
  assert.equal(invalidations, 1);
});

test('sub-pet tem ciclo explícito de sono, despertar e interação manual', () => {
  assert.match(contentSource, /sleep\(\)\s*\{/);
  assert.match(contentSource, /wakeUp\(message =/);
  assert.match(contentSource, /this\.node\.addEventListener\('click'/);
  assert.match(contentSource, /this\.subpet\.wakeUp\('Acordamos juntos!/);
  assert.match(styleSource, /\.aic-subpet\.waking \.subpet-sprite/);
  assert.match(styleSource, /\.aic-subpet\.cuddling \.subpet-sprite/);
});
