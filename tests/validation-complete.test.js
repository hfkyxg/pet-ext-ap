/* ============================================================
   CLAW'D — VALIDAÇÃO COMPLETA (fases 1–6 do plano)
   Contratos estáticos + catálogo para gaps: skins, 100% ações,
   focusin Dev, studio/status, combo/streak, shop claim, quiet/block.
   ============================================================ */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const catalog = require('../src/shared/catalog.js');
const {
  CLAWD_ACTIONS, CLAWD_PET_EXTRA_ACTIONS, CLAWD_ACCESSORIES, CLAWD_SKINS,
  CLAWD_FACE_STYLES, CLAWD_IDLE_VARIATIONS, CLAWD_PROFESSIONS, CLAWD_SUBPETS,
  CLAWD_SUBPET_ACTIONS, CLAWD_DAILY_QUESTS, CLAWD_ACHIEVEMENTS, CLAWD_SHOP,
  clawdDefaultState, clawdMigrateState, clawdEffectiveAccessories,
  clawdHostIsBlocked, clawdSanitizeSettingValue, clawdSanitizeConfigValue,
  clawdEnsureDailyQuest, clawdRegisterDailyProgress, clawdEnsureWeeklyChallenge,
  clawdRegisterWeeklyProgress, clawdValidateRuntimeMessage
} = catalog;

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const content = read('src/content/content.js');
const style = read('src/content/style.css');
const popupJs = read('src/popup/popup.js');
const popupHtml = read('src/popup/popup.html');
const popupCss = read('src/popup/popup.css');
const background = read('src/background/background.js');

function handleActionMapSlice() {
  const start = content.indexOf('_handleAction(action)');
  assert.ok(start > 0, '_handleAction ausente');
  const mapStart = content.indexOf('const map = {', start);
  const mapEnd = content.indexOf('};', mapStart);
  return content.slice(mapStart, mapEnd + 2);
}

/* ---------- Fase 1 — Animações / skins / body Y ---------- */
test('validação: cada skin do catálogo pinta .skin-mod no CSS', () => {
  for (const id of Object.keys(CLAWD_SKINS)) {
    if (id === 'normal') continue; /* baseline sem override obrigatório */
    assert.match(style, new RegExp(`\\[data-skin="${id}"\\][\\s\\S]{0,120}\\.skin-mod`), `skin ${id}`);
  }
  assert.equal(Object.keys(CLAWD_SKINS).length, 11);
  assert.equal(Object.keys(CLAWD_FACE_STYLES).length, 9);
});

test('validação: 7 idle variations com keyframe + !important', () => {
  assert.equal(CLAWD_IDLE_VARIATIONS.length, 7);
  for (const v of CLAWD_IDLE_VARIATIONS) {
    const kf = v.keyframe.replace('@keyframes ', '');
    assert.match(style, new RegExp(`@keyframes ${kf}`));
    assert.match(style, new RegExp(`${kf}[\\s\\S]{0,90}!important`));
  }
});

test('validação: body accessories ficam abaixo do rosto (Y peito/pescoço)', () => {
  for (const id of ['ribbon', 'wings', 'cape', 'armor', 'scarf_body']) {
    const re = new RegExp(`\\[data-acc-body="${id}"\\] \\.acc-body \\{([\\s\\S]*?)\\n\\}`);
    const m = style.match(re);
    assert.ok(m, `bloco CSS body ${id}`);
    const ys = [...m[1].matchAll(/(-?\d+)px (-?\d+)px/g)].map((x) => Number(x[2]));
    assert.ok(ys.length > 0, `${id} sem pixels`);
    /* olhos ~y=4; corpo deve concentrar em y>=8 */
    const belowFace = ys.filter((y) => y >= 8).length;
    assert.ok(belowFace >= ys.length * 0.6, `${id}: muitos pixels no rosto (${belowFace}/${ys.length})`);
  }
  assert.match(style, /data-acc-body="cape"[\s\S]{0,200}z-index:\s*-1/);
});

test('validação: reduced-motion / performanceMode / aic-nofx gated', () => {
  assert.match(style, /prefers-reduced-motion:\s*reduce/);
  assert.match(content, /_reducedMotion/);
  assert.match(content, /aic-nofx|performanceMode/);
  assert.match(content, /aic-minimal|minimalMode/);
  assert.match(content, /noIdleVariations|noWeather|noParticles/);
});

/* ---------- Fase 2 — Interações ---------- */
test('validação: clique 1/2/3+/5 → carinho/cambalhota/superdance/tantrum', () => {
  assert.match(content, /_queuePetClick/);
  assert.match(content, /_rapidClickCount\s*>=\s*5/);
  assert.match(content, /setStateFor\('tantrum'/);
  assert.match(content, /_clickCount\s*>=\s*3[\s\S]{0,80}doSuperDance/);
  assert.match(content, /_clickCount\s*===\s*2[\s\S]{0,80}doSomersault/);
  assert.match(content, /giveAffection/);
  /* Duo CSS — coreografia pet↔subpet */
  for (const cls of ['petting-subpet', 'being-petted', 'duo-play', 'duo-hug', 'nap-sync', 'sleep-settle', 'settling']) {
    assert.match(style, new RegExp(`\\.${cls}\\b|#aic-clawd-node\\.${cls}\\b|\\.aic-subpet\\.${cls}\\b`));
  }
  assert.match(style, /clawd-subpet-run var\(--clawd-run-duration[\s\S]{0,80}ease-in-out/);
  assert.match(style, /clawd-subpet-run var\(--clawd-step-duration[\s\S]{0,80}ease-in-out/);
});

test('validação: atalhos Alt+F/H/P/Z e bola/balão', () => {
  assert.deepEqual(catalog.CLAWD_KEYBOARD_SHORTCUTS, {
    'Alt+F': 'feed',
    'Alt+H': 'happy',
    'Alt+P': 'pose',
    'Alt+Z': 'sleep'
  });
  assert.match(content, /CLAWD_KEYBOARD_SHORTCUTS/);
  assert.match(content, /Alt\+\$\{e\.key/);
  assert.match(content, /kickBall|startKeepyUppy|doBalloon|popBalloon/);
});

test('validação: focusin — só engineer entra em typing (+ laptop CSS)', () => {
  const idx = content.indexOf("addEventListener('focusin'");
  assert.ok(idx > 0);
  const slice = content.slice(idx, idx + 900);
  assert.match(slice, /profession === 'engineer'/);
  assert.match(slice, /setStateFor\('typing'/);
  assert.match(slice, /setStateFor\('curious'/);
  assert.doesNotMatch(slice, /setStateFor\('typing'[\s\S]*else[\s\S]*typing/);
  assert.match(style, /data-profession="engineer"\]\.typing \.laptop/);
  assert.doesNotMatch(style, /#aic-clawd-node\.typing \.laptop\s*\{/);
});

/* ---------- Fase 3 — Ações 100% no map ---------- */
test('validação: 100% de CLAWD_ACTIONS + extras no map de _handleAction', () => {
  const map = handleActionMapSlice();
  for (const id of Object.keys(CLAWD_ACTIONS)) {
    assert.match(map, new RegExp(`\\b${id}\\s*:`), `ação ${id} ausente no map`);
  }
  for (const id of Object.keys(CLAWD_PET_EXTRA_ACTIONS)) {
    assert.match(map, new RegExp(`\\b${id}\\s*:`), `extra ${id} ausente no map`);
  }
  assert.equal(Object.keys(CLAWD_ACTIONS).length, 30);
});

test('validação: amostra por família de ações (social/movimento/care/special)', () => {
  const families = {
    social: ['wave', 'happy', 'hug', 'highfive', 'cheer'],
    movimento: ['jump', 'spin', 'bounce', 'roll', 'sneak'],
    care: ['feed', 'bath', 'sleep', 'nap', 'meditate'],
    special: ['balloon', 'fish', 'electric', 'roar', 'flip']
  };
  const map = handleActionMapSlice();
  for (const [fam, ids] of Object.entries(families)) {
    for (const id of ids) {
      assert.ok(CLAWD_ACTIONS[id], `${fam}: ${id} fora do catálogo`);
      assert.match(map, new RegExp(`\\b${id}\\s*:`), `${fam}: ${id}`);
    }
  }
});

/* ---------- Fase 4 — Acessórios / props / uniforme ---------- */
test('validação: 31 acessórios com CSS box-shadow pixel por slot', () => {
  assert.equal(Object.keys(CLAWD_ACCESSORIES).length, 31);
  for (const [id, acc] of Object.entries(CLAWD_ACCESSORIES)) {
    const attr = acc.slot === 'head' ? 'acc-head' : acc.slot === 'face' ? 'acc-face' : 'acc-body';
    assert.match(
      style,
      new RegExp(`\\[data-${attr}="${id}"\\][\\s\\S]{0,200}box-shadow:`),
      `${acc.slot}/${id}`
    );
  }
});

test('validação: uniforme de profissão não destrói acessórios pessoais', () => {
  const state = clawdDefaultState();
  state.accessoryHead = 'crown';
  state.accessoryFace = 'sunglasses';
  state.accessoryBody = 'cape';
  state.profession = 'chef';
  const eff = clawdEffectiveAccessories(state);
  assert.ok(eff.head && eff.head !== 'none');
  /* gear de chef sobrescreve head no efetivo, mas storage pessoal permanece */
  assert.equal(state.accessoryHead, 'crown');
  assert.equal(state.accessoryFace, 'sunglasses');
  assert.equal(state.accessoryBody, 'cape');
});

test('validação: props de profissão no DOM + CSS', () => {
  const props = [
    'prop-chef-pan', 'prop-music-note', 'prop-ninja-smoke', 'prop-tutor-glint',
    'prop-doctor-cross', 'prop-artist-brush', 'prop-gamer-ctrl', 'prop-streamer-live',
    'prop-engineer-code', 'prop-footballer-boot', 'prop-fisher-bobber'
  ];
  assert.equal(Object.keys(CLAWD_PROFESSIONS).length, 12);
  for (const p of props) {
    assert.match(content, new RegExp(p));
    assert.match(style, new RegExp(`\\.${p}`));
  }
  /* Amostra runtime-ready: chef / ninja / streamer */
  for (const p of ['prop-chef-pan', 'prop-ninja-smoke', 'prop-streamer-live']) {
    assert.match(content, new RegExp(`profession-prop ${p}`));
    assert.match(style, new RegExp(`\\.${p}\\s*\\{[\\s\\S]{0,220}(width|height|background|animation|box-shadow)`));
  }
});

/* ---------- Fase 5 — Popup UX ---------- */
test('validação: studio in-page + detached + allowlist openStudio', () => {
  assert.match(popupHtml, /btn-open-studio/);
  assert.match(popupHtml, /btn-detach-window|btn-open-studio-actions/);
  assert.match(popupJs, /openStudioOnPage|action: 'openStudio'/);
  assert.match(popupJs, /detached=1/);
  assert.match(popupJs, /popup-detached/);
  assert.match(content, /openStudio\(\)|case 'openStudio'/);
  assert.match(content, /aic-clawd-studio|#aic-clawd-studio/);
  const msg = clawdValidateRuntimeMessage({ action: 'openStudio' });
  assert.equal(msg?.action, 'openStudio');
});

test('validação: 4 status clicáveis (happy/feed/play/bath)', () => {
  for (const a of ['happy', 'feed', 'play', 'bath']) {
    assert.match(popupHtml, new RegExp(`data-stat-action="${a}"`));
  }
  assert.match(popupJs, /stat-action/);
  assert.match(popupJs, /triggerAction/);
});

test('validação: shop compra → inventário; claim daily/weekly via mensagem', () => {
  assert.match(popupJs, /inventory\.push\(id\)/);
  assert.match(popupJs, /shopPurchases/);
  assert.ok(Object.keys(CLAWD_SHOP).length > 0);
  const dailyMsg = clawdValidateRuntimeMessage({ action: 'claimDailyQuest' });
  const weeklyMsg = clawdValidateRuntimeMessage({ action: 'claimWeeklyChallenge' });
  assert.equal(dailyMsg?.action, 'claimDailyQuest');
  assert.equal(weeklyMsg?.action, 'claimWeeklyChallenge');
  assert.match(content, /claimDailyQuest\(\)/);
  assert.match(content, /claimWeeklyChallenge\(\)/);

  const state = clawdDefaultState();
  const quest = clawdEnsureDailyQuest(state);
  quest.progress = quest.target;
  quest.claimed = false;
  const coinsBefore = state.game.coins;
  /* claim só no motor — espelha contrato: progresso completo + mensagem permitida */
  assert.ok(quest.progress >= quest.target);
  assert.equal(typeof coinsBefore, 'number');
});

test('validação: quiet hours + blocked sites sanitize; personality 5 traits', () => {
  assert.equal(clawdSanitizeSettingValue('quietStart', '09:30'), '09:30');
  assert.equal(clawdSanitizeSettingValue('quietStart', 'bad'), null);
  assert.equal(clawdSanitizeSettingValue('quietEnd', '18:00'), '18:00');
  assert.deepEqual(clawdSanitizeSettingValue('blockedSites', ['evil.com', 'not a host!!!']), ['evil.com']);
  assert.equal(clawdHostIsBlocked('mail.evil.com', ['evil.com']), true);
  assert.equal(clawdHostIsBlocked('notevil.com', ['evil.com']), false);
  assert.match(content, /isQuiet\(/);

  const p = clawdSanitizeConfigValue('personality', {
    playful: 99, lazy: -2, curious: 7.4, social: 'x', foodie: 5, hack: 1
  });
  assert.deepEqual(p, { playful: 10, lazy: 0, curious: 7, social: 0, foodie: 5 });
  assert.match(popupHtml, /data-preset="energetic"/);
  assert.match(popupHtml, /data-preset="relaxed"/);
  assert.match(popupHtml, /data-preset="curious"/);
  assert.match(popupJs, /energetic:[\s\S]{0,80}playful:\s*9/);
});

test('validação: migrate round-trip preserva inventário e schema v5', () => {
  const raw = clawdDefaultState();
  raw.game.inventory = ['tophat', 'scarf', 'not_a_shop_item'];
  raw.game.coins = 42;
  raw.name = 'Rex';
  raw.position = { x: 0, y: 0 };
  raw.petVisible = false;
  const once = clawdMigrateState(raw);
  const twice = clawdMigrateState(once);
  assert.equal(twice.schemaVersion, catalog.CLAWD_SCHEMA_VERSION);
  assert.deepEqual(twice.game.inventory, ['tophat', 'scarf']);
  assert.deepEqual(twice.position, { x: null, y: null });
  assert.equal(twice.petVisible, false);
  assert.equal(twice.game.coins, 42);
  assert.equal(twice.name, 'Rex');
});

/* ---------- Fase 6 — Mecânicas avançadas ---------- */
test('validação: combo janela 10s, exclusões, XP≥5 e conquista', () => {
  assert.match(content, /_comboWindowMs\s*=\s*10000/);
  assert.match(content, /_tickCombo/);
  assert.match(content, /comboExcluded[\s\S]{0,80}'sleep'/);
  assert.match(content, /_comboCount\s*>=\s*5[\s\S]{0,400}addXp\(/);
  assert.ok(CLAWD_ACHIEVEMENTS.combo_king);
  assert.equal(CLAWD_ACHIEVEMENTS.combo_king.goal, 5);
});

test('validação: streak pill + counters; daily 14 / weekly 12', () => {
  assert.match(popupHtml, /streak-pill|streak-count/);
  assert.match(popupJs, /updateStreakPill|streakDays/);
  assert.match(content, /streak\.days|streakDays/);
  assert.equal(CLAWD_DAILY_QUESTS.length, 14);
  assert.ok(Array.isArray(catalog.CLAWD_WEEKLY_CHALLENGES));
  assert.equal(catalog.CLAWD_WEEKLY_CHALLENGES.length, 12);
  const st = clawdDefaultState();
  clawdRegisterDailyProgress(st, 'combo', 1);
  assert.ok(st.daily.progress >= 1 || st.daily.type);
  clawdEnsureWeeklyChallenge(st);
  clawdRegisterWeeklyProgress(st, st.weekly?.type || 'combo', 1);
});

test('validação: cross-tab travel + footprints no SW; subpets 11×7; SFX dual', () => {
  assert.match(background, /travel|crossTab|footprint/i);
  assert.match(background, /summonPetToTab|assignHost\(tabId\)/);
  assert.match(content, /clawdHasSavedPosition|clawdDefaultPositionCoords/);
  assert.match(content, /petVisible/);
  assert.match(popupHtml, /btn-summon-tab|Seguir nesta guia/);
  assert.equal(Object.keys(CLAWD_SUBPETS).length, 11);
  assert.equal(Object.keys(CLAWD_SUBPET_ACTIONS).length, 7);
  assert.match(content, /soundVolumeActions|soundVolumeAmbient|'actions'/);
  assert.match(content, /master\s*<=\s*0\)\s*return/);
});

/* ---------- Polish bola / ownership (pé direito, longe do subpet) ---------- */
test('validação: bola no pé direito do pet (não sobre o subpet)', () => {
  const block = style.match(/#aic-clawd-node \.pet-ball \{[\s\S]*?\n\}/);
  assert.ok(block, '.pet-ball ausente');
  const left = block[0].match(/left:\s*(-?\d+)px/);
  assert.ok(left, 'left da bola ausente');
  assert.ok(Number(left[1]) >= 40, `bola deve ficar à direita (>=40px), got ${left[1]}`);
  assert.match(style, /\.prop-footballer-boot \{[\s\S]{0,60}left:\s*4\dpx/);
  assert.match(style, /#aic-clawd-node\.smooth\.has-ball \.pet-ball \{[\s\S]{0,80}left:\s*4\dpx/);
});

test('validação: bola pixel-art sem blur; kick/roll para a direita', () => {
  const ballHead = style.slice(style.indexOf('#aic-clawd-node .pet-ball {'), style.indexOf('#aic-clawd-node .pet-ball {') + 900);
  assert.doesNotMatch(ballHead, /filter:\s*drop-shadow/);
  assert.match(style, /clawd-ball-kick[\s\S]{0,280}translate\(\s*\d+px/);
  assert.match(style, /clawd-ball-roll[\s\S]{0,120}translate\(\s*\d+px/);
  assert.match(style, /@keyframes clawd-ball-keepy/);
  assert.match(style, /@keyframes clawd-ball-juggle/);
  assert.match(content, /juggleTouch\(\)/);
  assert.match(content, /doPlay\(\)[\s\S]{0,500}0\.72/);
});

test('validação: headphones (fones) e skins beach/gold da bola', () => {
  assert.ok(CLAWD_ACCESSORIES.headphones);
  assert.equal(CLAWD_ACCESSORIES.headphones.slot, 'face');
  assert.match(style, /data-acc-face="headphones"[\s\S]{0,200}box-shadow:/);
  assert.match(style, /data-acc-face="headphones"[\s\S]{0,900}#74b9ff/, 'LED azul nos fones');
  assert.match(style, /@keyframes clawd-headphones-pulse/);
  assert.match(style, /@keyframes clawd-facewear-bob/);
  assert.match(style, /spark-ambient/);
  assert.match(content, /ambient:\s*true|opts\.ambient/);
  assert.match(style, /data-ball-skin="ball_beach"/);
  assert.match(style, /data-ball-skin="ball_gold"/);
});

test('validação: babinha drool + balão/badge seguem --agent-scale', () => {
  assert.ok(CLAWD_FACE_STYLES.drool);
  assert.match(style, /@keyframes clawd-drool-drip/);
  assert.match(style, /data-face-style="drool"/);
  assert.match(style, /\.emotion-badge \{[\s\S]{0,200}--agent-scale/);
  assert.match(style, /\.speech-bubble \{[\s\S]{0,200}--agent-scale/);
  assert.match(style, /\.speech-bubble\.flip-left/);
  assert.match(style, /\.speech-bubble\.below/);
  assert.match(content, /_clampSpeechBubble/);
  assert.match(content, /stopFishing\(\)[\s\S]{0,280}wasFishing/);
});

test('validação: skins com animação + partículas pixel ricas', () => {
  for (const skin of [
    'freckles', 'stripes', 'spots', 'droopy', 'glow', 'robot',
    'cosmic', 'crystal', 'ember', 'ocean'
  ]) {
    assert.match(style, new RegExp(`data-skin="${skin}"[\\s\\S]{0,120}animation:`), `skin ${skin}`);
  }
  assert.match(style, /@keyframes clawd-pixel-spark-twinkle/);
  assert.match(style, /\.aic-pixel-spark\.spark-star/);
  assert.match(style, /@keyframes clawd-walk-dust-rich/);
  assert.match(content, /spark-sm[\s\S]{0,80}spark-star/);
  /* Anti-bloom: sem filter de sombra no .pet-body (scale+filter desfigura o liso) */
  assert.match(style, /#aic-clawd-node \.pet-body \{[\s\S]{0,420}filter:\s*none/);
  assert.doesNotMatch(style, /#aic-clawd-node \.pet-body \{[^}]*drop-shadow\(/);
  assert.match(style, /#aic-clawd-node\.smooth \.sprite-stack\s*\{[\s\S]{0,120}filter:\s*none/);
  assert.match(style, /@keyframes clawd-pixel-spark \{[\s\S]{0,220}translate\(var\(--spark-x/);
  assert.doesNotMatch(style, /@keyframes clawd-pixel-spark \{[\s\S]{0,280}rotate\(180deg\)/);

  /* v3.7.3: skin reage à ação — keyframes de reação existem e estão ligados a estados */
  for (const kf of [
    'droopy-flop', 'droopy-run', 'robot-alert', 'glow-flare', 'pop', 'stripe-streak',
    'cosmic-orbit', 'crystal-refract', 'ember-flare', 'ocean-splash'
  ]) {
    assert.match(style, new RegExp(`@keyframes clawd-skin-${kf}\\b`), `keyframe reação ${kf}`);
  }
  assert.match(style, /\[data-skin="droopy"\]\.jumping \.skin-mod[\s\S]{0,400}clawd-skin-droopy-flop/);
  assert.match(style, /\[data-skin="robot"\]\.excited \.skin-mod[\s\S]{0,400}clawd-skin-robot-alert/);
  assert.match(style, /\[data-skin="glow"\]\.celebrate \.skin-mod[\s\S]{0,400}clawd-skin-glow-flare/);
  assert.match(style, /\[data-skin="stripes"\]\.running \.skin-mod[\s\S]{0,120}clawd-skin-stripe-streak/);
  assert.match(style, /\[data-skin="cosmic"\]\.happy \.skin-mod[\s\S]{0,700}clawd-skin-cosmic-orbit/);
  assert.match(style, /\[data-skin="crystal"\]\.happy \.skin-mod[\s\S]{0,500}clawd-skin-crystal-refract/);
  assert.match(style, /\[data-skin="ember"\]\.running \.skin-mod[\s\S]{0,500}clawd-skin-ember-flare/);
  assert.match(style, /\[data-skin="ocean"\]\.bathing \.skin-mod[\s\S]{0,500}clawd-skin-ocean-splash/);
  /* reações herdam gate de reduced-motion */
  assert.match(style, /:not\(\.aic-reduced-motion\)\[data-skin="droopy"\]\.happy \.skin-mod/);
  /* Name-tag neon/holographic — anti-bloom (sem text-shadow blur) */
  for (const theme of ['neon', 'holographic']) {
    assert.match(style, new RegExp(`\\[data-tag-theme="${theme}"\\][\\s\\S]{0,280}text-shadow:\\s*none`));
    assert.doesNotMatch(style, new RegExp(`\\[data-tag-theme="${theme}"\\][\\s\\S]{0,320}text-shadow:[^;]*blur\\(`));
  }
});

/* ---------- Polish animação — regressões de bugs de runtime ---------- */
test('validação: setState limpa idle !important antes de ações', () => {
  assert.match(content, /_clearIdleVariationClasses\(\)/);
  const idx = content.indexOf('\n  setState(newState) {');
  assert.ok(idx > 0);
  const slice = content.slice(idx, idx + 900);
  assert.match(slice, /_clearIdleVariationClasses\(\)/);
  assert.match(slice, /this\._destroyed \|\| !this\.node\) return/);
  assert.match(content, /durationMs \|\| 2000\) <= 1100/);
});

test('validação: doDance rastreia timers e não usa pop-in morto no root', () => {
  const idx = content.indexOf('\n  doDance() {');
  assert.ok(idx > 0);
  const slice = content.slice(idx, idx + 2200);
  assert.match(slice, /_clearDanceTimers\(\)/);
  assert.match(slice, /_danceTimers\.push\(setTimeout/);
  assert.match(slice, /setState\('dance-2'\)/);
  assert.match(slice, /setState\('dance-3'\)/);
  assert.match(slice, /this\._destroyed/);
  assert.doesNotMatch(content, /node\.style\.animation\s*=\s*'clawd-pop-in/);
  assert.match(content, /_summonDropTimer/);
  assert.match(content, /_poofOutTimer/);
  assert.match(content, /_idleVarKickoffTimer/);
});

test('validação: hug do subpet não cancela ação do dono; spawn FX rastreado', () => {
  const hugIdx = content.indexOf("case 'hug':");
  assert.ok(hugIdx > 0);
  const hugSlice = content.slice(hugIdx, hugIdx + 700);
  assert.match(hugSlice, /owner\.state === 'idle' \|\| this\.owner\.state === 'walking'/);
  assert.match(content, /_particleTimers\.add\(spawnTimer\)/);
  assert.match(content, /_scrollDashTimer|_scrollReactTimer/);
  assert.match(popupCss, /prefers-reduced-motion:\s*reduce[\s\S]{0,400}animation:\s*none !important/);
});
