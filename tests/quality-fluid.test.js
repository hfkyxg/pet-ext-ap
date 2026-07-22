/* ============================================================
   CLAW'D — QUALIDADE: FLUIDEZ · PERFORMANCE · INTERAÇÃO · UX
   Trava contratos que tornam o pet liso, intuitivo e otimizado.
   ============================================================ */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const content = read('src/content/content.js');
const style = read('src/content/style.css');
const popupCss = read('src/popup/popup.css');
const popupHtml = read('src/popup/popup.html');
const popupJs = read('src/popup/popup.js');
const catalog = require('../src/shared/catalog.js');
const catalogSource = read('src/shared/catalog.js');

/* ---------- PERFORMANCE ---------- */

test('qualidade: FX com teto, pause em aba oculta e modo desempenho', () => {
  assert.match(content, /_canSpawnFx\(/);
  assert.match(content, /\+\s*count\s*<=\s*(18|CLAWD_TIMINGS\.PARTICLE_MAX)|count\s*<=\s*(18|CLAWD_TIMINGS\.PARTICLE_MAX)/);
  assert.match(content, /_reserveFx\(/);
  assert.match(content, /_releaseFx\(/);
  assert.match(content, /_trackParticle\([^)]*reserved/);
  assert.match(content, /performanceMode/);
  assert.match(content, /noParticles/);
  assert.match(content, /document\.hidden/);
  assert.match(content, /aic-nofx/);
  /* intervalos idle/ações respeitam hidden */
  assert.match(content, /if \(document\.hidden\) return;/);
});

test('qualidade: movimento via rAF + skip de DOM quando settled', () => {
  assert.match(content, /requestAnimationFrame/);
  assert.match(content, /_writePos\(/);
  assert.match(content, /SETTLE_EPS|_domLeft/);
  assert.match(content, /Spring settled|sem write de posição/i);
  assert.match(content, /cancelAnimationFrame/);
});

test('qualidade: save coalesce (debounce + in-flight + skip unchanged)', () => {
  assert.match(content, /_flushSave\(\)/);
  assert.match(content, /_saveInFlight/);
  assert.match(content, /_saveDirty/);
  assert.match(content, /setTimeout\(\(\) => this\._flushSave\(\),\s*(350|CLAWD_TIMINGS\.STORAGE_DEBOUNCE_MS)\)/);
  assert.match(content, /unchanged/);
});

test('qualidade: progresso semanal sem double-count (só via registerDaily)', () => {
  assert.match(content, /clawdRegisterWeeklyProgress\(this\.S,\s*type/);
  /* chamadas diretas duplicadas em pets/dance/fish/walk devem sumir */
  assert.doesNotMatch(content, /registerDaily\('pets'\);\s*\n\s*clawdRegisterWeeklyProgress/);
  assert.doesNotMatch(content, /registerDaily\('dance'\);\s*\n\s*clawdRegisterWeeklyProgress/);
  assert.doesNotMatch(content, /registerDaily\('fish'\);\s*\n\s*clawdRegisterWeeklyProgress/);
  assert.doesNotMatch(content, /registerDaily\('walk'\);\s*\n\s*clawdRegisterWeeklyProgress/);
});

/* ---------- FLUIDEZ / ACESSIBILIDADE ---------- */

test('qualidade: prefers-reduced-motion no CSS e sync ao vivo no JS', () => {
  assert.match(style, /@media \(prefers-reduced-motion:\s*reduce\)/);
  assert.match(content, /prefers-reduced-motion:\s*reduce/);
  assert.match(content, /aic-reduced-motion/);
  assert.match(content, /mqMotion\.addEventListener/);
  assert.match(style, /\.aic-reduced-motion/);
  assert.match(popupCss, /prefers-reduced-motion:\s*reduce/);
  /* reduce zera legs/fx (não só alonga duração) */
  assert.match(style, /prefers-reduced-motion:\s*reduce[\s\S]{0,400}\.pixel-legs/);
  assert.match(style, /prefers-reduced-motion:\s*reduce[\s\S]{0,500}animation:\s*none !important/);
});

test('qualidade: sprites pet — ações vencem breathe; idle variations !important', () => {
  assert.match(style, /:not\(\.rolling\):not\(\.spinning\).*clawd-idle-look|:not\(\.clawd-idle-look\)/);
  assert.match(style, /clawd-idle-look[\s\S]{0,80}!important/);
  assert.match(style, /#aic-clawd-node\.rolling \.pet-body[\s\S]{0,120}!important/);
  assert.match(style, /#aic-clawd-node\.spinning \.pet-body[\s\S]{0,120}!important/);
  assert.match(style, /#aic-clawd-node\.cheering \.pet-body[\s\S]{0,120}!important/);
  assert.match(style, /\.pixel-fx[\s\S]{0,40}clawd-pixel-fx-wave|clawd-pixel-fx-wave/);
  assert.match(style, /aic-tab-hidden[\s\S]{0,200}animation-play-state:\s*paused/);
  assert.match(style, /aic-nofx \.pixel-legs|aic-reduced-motion \.pixel-legs/);

  /* Regressão de escala: keyframes aplicados ao .pet-body sobrescrevem o transform
     base scale(var(--agent-scale)). Se um frame com translate/rotate/scale esquecer
     de rebaquear o scale, o pet colapsa para 1× ao andar/correr/pular/rolar. */
  const applied = new Set();
  const styleNoComments = style.replace(/\/\*[\s\S]*?\*\//g, ''); // comentários podem citar ".pet-body"
  const ruleRe = /([^{}]*\.pet-body[^{}]*)\{([^}]*)\}/g;
  let mm;
  while ((mm = ruleRe.exec(styleNoComments))) {
    const am = /animation:\s*(clawd-[a-z0-9-]+)/.exec(mm[2]);
    if (am) applied.add(am[1]);
  }
  assert.ok(applied.size >= 20, `esperava muitos estados de .pet-body, achei ${applied.size}`);
  const kf = {};
  const kfRe = /@keyframes\s+(clawd-[a-z0-9-]+)\s*\{([\s\S]*?)\n\}/g;
  while ((mm = kfRe.exec(style))) kf[mm[1]] = mm[2];
  const offenders = [];
  for (const name of applied) {
    const body = kf[name];
    if (!body) continue; // keyframe pode viver noutro arquivo; ignore
    const transforms = body.split('\n').filter((l) => /transform:/.test(l));
    const missing = transforms.filter((l) => !/--agent-scale/.test(l));
    if (missing.length) offenders.push(`${name} (${missing.length}/${transforms.length})`);
  }
  assert.deepEqual(offenders, [], `keyframes de .pet-body que largam o scale: ${offenders.join(', ')}`);
});

test('qualidade: subpet — sync spawn, FX release, settle wake, vanish', () => {
  assert.match(content, /new SubPet\(this,\s*want\);\s*\n\s*this\.subpet\.onOwnerState\(this\.state\)/);
  /* Subpet não pode ficar atrás do name-tag/balão do pet (z-index >= nó do pet) */
  assert.match(style, /\.aic-subpet \{[\s\S]{0,400}z-index:\s*2147483647/);
  assert.match(content, /rect\.bottom\s*-\s*this\.bounds\.height\s*\*\s*0\.72/);
  assert.match(content, /_fxPending/);
  assert.match(content, /_armSettleWake\(/);
  assert.match(content, /_clearSettleWake\(/);
  assert.match(content, /_beginInteraction\('vanishing',\s*'vanishing'\)/);
  assert.match(content, /paintCadence|_useBitmap\(\)/);
  assert.match(content, /being-petted.*duo-play|duo-play.*being-petted/);
  /* giveAffection encadeia petting-subpet + cuddle no subpet */
  const affIdx = content.indexOf('\n  giveAffection() {');
  assert.ok(affIdx > 0);
  const affSlice = content.slice(affIdx, affIdx + 1800);
  assert.match(affSlice, /petting-subpet/);
  assert.match(affSlice, /subpet\.interact\('cuddle'/);
  /* _playDuoScene — cenas cuddle|play|nap|celebrate|pet */
  assert.match(content, /_playDuoScene\(kind\)/);
  for (const scene of ['cuddle', 'play', 'nap', 'celebrate', 'pet']) {
    assert.match(content, new RegExp(`case '${scene}':`));
  }
});

test('qualidade: contexto reage com throttle (sem spam ao trocar abas)', () => {
  assert.match(content, /_lastContextReactAt/);
  assert.match(content, /<\s*8000/);
  assert.match(content, /performanceMode\) return/);
  assert.match(content, /isQuiet\(\).*return|_onContextChange[\s\S]*isQuiet/s);
  /* primeiro load em contexto ≠ idle agenda reação (não silencia para sempre) */
  assert.match(content, /prevCtx === undefined[\s\S]{0,280}_onContextChange\(next\)/s);
});

test('qualidade: idle variation sempre reagenda; visibilidade única por away-time', () => {
  assert.match(content, /_scheduleIdleVariation\(/);
  assert.match(content, /finally\s*\{\s*this\._scheduleIdleVariation\(\)/);
  assert.match(content, /_setupVisibilityReaction\(\)\s*\{\s*\/\* no-op/);
  assert.match(content, /hiddenFor < 45000/);
  assert.match(content, /hiddenFor > 1800000/);
  assert.match(content, /doCheer\(\)/);
  assert.doesNotMatch(content, /doCelebrate\?\.\(\)/);
});

test('qualidade: lookAtCursor rAF+proximidade; will-change só ao mover', () => {
  assert.match(content, /_applyLookAtCursor\(/);
  assert.match(content, /_lookRaf/);
  assert.match(content, /dist > 320/);
  assert.match(content, /_syncMovingHint\(/);
  assert.match(style, /\.aic-moving[\s\S]{0,80}will-change:\s*transform/);
  assert.doesNotMatch(style, /#aic-clawd-node\[data-clawd-owned="true"\]\s*\{[^}]*will-change:\s*transform,\s*left,\s*top/s);
});

/* ---------- INTERATIVO / INTUITIVO ---------- */

test('qualidade: pet é focável, tem aria-label e balão/bola com título', () => {
  assert.match(content, /tabIndex\s*=\s*0/);
  assert.match(content, /role',\s*'img'/);
  assert.match(content, /aria-label.*Claw/);
  assert.match(content, /title="Clique para estourar o balão!|title=.*estourar o balão/);
  assert.match(content, /title="Toque para embaixadinhas/);
});

test('qualidade: atalhos de teclado e ações do catálogo alinhados', () => {
  const { CLAWD_KEYBOARD_SHORTCUTS, CLAWD_ACTIONS } = catalog;
  assert.ok(Object.keys(CLAWD_KEYBOARD_SHORTCUTS).length >= 4);
  for (const actionId of Object.values(CLAWD_KEYBOARD_SHORTCUTS)) {
    assert.ok(CLAWD_ACTIONS[actionId], `atalho → ação inexistente: ${actionId}`);
  }
  assert.match(content, /CLAWD_KEYBOARD_SHORTCUTS|Alt\+/);
});

test('qualidade: onboarding + feedback visual no popup', () => {
  assert.match(popupHtml, /id="clawd-onboarding"/);
  assert.match(popupHtml, /id="onboarding-start"/);
  assert.match(popupHtml, /id="onboarding-locale"/);
  assert.match(popupHtml, /id="onboarding-corner"/);
  assert.match(popupHtml, /data-i18n="onboarding_title"/);
  assert.match(popupCss, /\.onboarding-setup/);
  assert.match(popupCss, /\.action-btn:hover/);
  assert.match(popupCss, /\.action-btn:active/);
  assert.match(popupCss, /\.accessory-card:hover|\.profession-card:hover/);
  assert.match(popupJs, /showOnboarding|onboardingDone/);
  assert.match(popupJs, /applyLocaleChoice|fillLocaleSelect/);
  assert.match(popupJs, /guessBrowserLocale/);
});

/* ---------- ATRATIVO / PRESENÇA ---------- */

test('qualidade: speech/emotion com transição suave e partículas limitadas', () => {
  assert.match(style, /\.speech-bubble\.visible/);
  assert.match(style, /cubic-bezier/);
  assert.match(style, /\.emotion-badge\.visible/);
  assert.match(content, /spawnParticles\(/);
  assert.match(content, /_trackParticle\(/);
  assert.match(content, /_particleTimers/);
});

test('qualidade: idle variations e duo/dwell respeitam performanceMode', () => {
  assert.match(content, /noIdleVariations|CLAWD_IDLE_VARIATIONS/);
  assert.match(content, /_dwellBusy|_duoBusy/);
  assert.match(content, /performanceMode\) return/);
});

test('qualidade: FX ao vestir acessório + motion sparks propeller/asas/capa', () => {
  assert.match(content, /_pulseAccessoryEquipFx/);
  assert.match(content, /_spawnAccessoryMotionFx/);
  assert.doesNotMatch(content, /setInterval\(\(\) => this\._tickAccessoryAmbientFx/);
  assert.match(content, /accessory-equip-pop/);
  assert.match(content, /has-propeller/);
  assert.match(content, /face === 'headphones'/);
  assert.match(content, /ambient:\s*true/);
  assert.match(style, /clawd-acc-equip-pop/);
  assert.match(style, /spark-ambient/);
});

test('qualidade: partículas honram count; volumes actions/ambient; asas planeiam', () => {
  assert.match(content, /opts\.count|requested/);
  assert.match(content, /typeof opts === 'number'/);
  assert.match(content, /soundVolumeActions/);
  assert.match(content, /soundVolumeAmbient/);
  assert.match(content, /hasWings|accBody === 'wings'/);
  assert.match(content, /friction = hasWings/);
  assert.match(style, /clawd-cape-sway[\s\S]*!important/);
  assert.match(style, /clawd-wing-flap[\s\S]*!important/);
});

test('qualidade: hover pet com cooldown; bola coalesce click/dblclick; propeller no popup', () => {
  assert.match(content, /_lastHoverPetAt/);
  assert.match(content, /_ballClickTimer/);
  assert.match(content, /_reducedMotion/);
  assert.match(content, /lookAtCursor[\s\S]{0,200}_reducedMotion/);
  assert.match(popupJs, /has-propeller/);
  assert.match(style, /aic-reduced-motion[\s\S]{0,400}\.acc-body/);
});

test('qualidade: name-tag preserva título + nome (não apaga spans)', () => {
  assert.match(content, /_syncNameTag\(/);
  assert.match(content, /aic-name-label/);
  assert.match(content, /nameNode\.contains\(this\.titleNode\)/);
  assert.doesNotMatch(content, /this\.nameNode\.textContent\s*=/);
  assert.match(popupJs, /syncPopupNameTag/);
  assert.match(popupHtml, /id="popup-name-title"/);
  assert.match(popupHtml, /id="popup-name-label"/);
  assert.match(style, /\.name-label/);
});

/* ---------- OTIMIZAÇÃO / LIMPEZA ---------- */

test('qualidade: destroy limpa timers, rAF, abort e partículas', () => {
  const idx = content.indexOf('destroy({ skipExtensionApis = false');
  assert.ok(idx > 0, 'destroy do companion deve existir');
  const destroySlice = content.slice(idx, idx + 2500);
  assert.match(destroySlice, /_abort\.abort\(/);
  assert.match(destroySlice, /cancelAnimationFrame/);
  assert.match(destroySlice, /_motionRaf|_glideRaf/);
  assert.match(destroySlice, /_particleTimers/);
  assert.match(destroySlice, /clearTimeout|clearInterval/);
  assert.match(destroySlice, /_pettingTimer|_duoPlayTimer/);
  assert.match(destroySlice, /_clearDanceTimers/);
});

test('qualidade: integridade das animações — nenhuma quebrada, sem keyframe legado órfão', () => {
  const cssAll = style + '\n' + popupCss;
  const jsAll = content + '\n' + popupJs;
  const defined = new Set([...cssAll.matchAll(/@keyframes\s+(clawd-[a-z0-9-]+)/g)].map((m) => m[1]));

  /* referências reais: nome do keyframe no shorthand `animation`/`animation-name`
     (ignorando var(--clawd-*) de duração/easing) e animações aplicadas via JS. */
  const used = new Set();
  for (const m of cssAll.matchAll(/animation(?:-name)?\s*:\s*([^;}{]+)/g)) {
    const val = m[1].replace(/var\([^)]*\)/g, '');
    for (const t of val.matchAll(/clawd-[a-z0-9-]+/g)) used.add(t[0]);
  }
  for (const m of jsAll.matchAll(/animation(?:-name)?\s*[:=]\s*[`"']\s*(clawd-[a-z0-9-]+)/g)) used.add(m[1]);

  /* toda animação aplicada precisa ter @keyframes definido (nada quebrado) */
  const broken = [...used].filter((n) => !defined.has(n)).sort();
  assert.deepEqual(broken, [], `animações sem @keyframes: ${broken.join(', ')}`);

  /* ciclos legados removidos (peso morto) não devem voltar */
  for (const legacy of ['clawd-pixel-walk', 'clawd-pixel-keepy', 'clawd-pixel-sleep', 'clawd-zzz']) {
    assert.ok(!defined.has(legacy), `keyframe legado ressuscitou: ${legacy}`);
  }
});

test('interação: vocabulário de movimento — pula, corre, rola, gira, quica, desliza (chain completa)', () => {
  const { CLAWD_ACTIONS } = catalog;

  /* 1. ações discretas de movimento existem no catálogo e no despacho */
  const moveActions = ['jump', 'roll', 'spin', 'bounce', 'somersault', 'flip'];
  for (const a of moveActions) {
    assert.ok(CLAWD_ACTIONS[a], `ação de movimento ausente no catálogo: ${a}`);
    assert.match(content, new RegExp(`\\n\\s*${a}:\\s*\\(\\) =>`), `sem handler em _handleAction: ${a}`);
  }

  /* 2. métodos de movimento no companion */
  for (const m of ['doJump', 'doRoll', 'doSpin', 'doBounce', 'doSomersault', 'doFlip']) {
    assert.match(content, new RegExp(`\\n  ${m}\\(`), `método ausente: ${m}`);
  }

  /* 3. estado → classe → animação → keyframe (o pet realmente se move na tela) */
  const chain = [
    { state: 'jumping', kf: 'clawd-jump' },      // pular
    { state: 'rolling', kf: 'clawd-roll' },      // rolar
    { state: 'spinning', kf: 'clawd-spin-action' }, // girar/rodar
    { state: 'bouncing', kf: 'clawd-bounce-action' }, // quicar (subir ⬆️)
    { state: 'soft-landing', kf: 'clawd-soft-land' }, // pouso do pulo/deslize
  ];
  for (const { state, kf } of chain) {
    assert.match(style, new RegExp(`#aic-clawd-node\\.${state} \\.pet-body[\\s\\S]{0,160}animation:\\s*${kf}`),
      `cadeia CSS quebrada: .${state} deveria animar ${kf}`);
    assert.match(style, new RegExp(`@keyframes ${kf}\\b`), `keyframe ausente: ${kf}`);
  }

  /* 4. correr: estado running move as pernas + FX de corrida (pó/speed-lines) */
  assert.match(content, /setState\('running'\)/);
  assert.match(content, /newState === 'running'[\s\S]{0,120}_spawnWalkDust/);
  assert.match(style, /@keyframes clawd-pixel-leg-cycle\b/);

  /* 5. deslizar: física de arraste com momentum + atrito + pouso suave */
  assert.match(content, /startGlide\(velocityX,\s*velocityY\)/);
  assert.match(content, /const friction = hasWings/);
  assert.match(content, /_pulseAnimClass\('soft-landing'/);
});

test('qualidade: contagens vivas batem com onboarding (harmonia UX)', () => {
  const acc = Object.keys(catalog.CLAWD_ACCESSORIES).length;
  const ach = Object.keys(catalog.CLAWD_ACHIEVEMENTS).length;
  const weekly = catalog.CLAWD_WEEKLY_CHALLENGES.length;
  assert.match(popupHtml, new RegExp(`${acc} itens`));
  assert.match(popupHtml, new RegExp(`${ach} conquistas`));
  assert.match(popupHtml, new RegExp(`${weekly} desafios`));
});

test('qualidade: ações antes mudas têm SFX; pó/clima respeitam reduced-motion', () => {
  const playIdx = content.indexOf('\n  doPlay() {');
  assert.ok(playIdx > 0);
  assert.match(content.slice(playIdx, playIdx + 900), /chime\(/);
  const poseIdx = content.indexOf('\n  doPose() {');
  assert.ok(poseIdx > 0);
  assert.match(content.slice(poseIdx, poseIdx + 400), /beep\(/);
  const bathIdx = content.indexOf('\n  doBath() {');
  assert.ok(bathIdx > 0);
  assert.match(content.slice(bathIdx, bathIdx + 700), /chime\(/);
  const wakeIdx = content.indexOf('\n  wakeUp() {');
  assert.ok(wakeIdx > 0);
  assert.match(content.slice(wakeIdx, wakeIdx + 500), /chime\(/);
  assert.match(content, /_spawnWalkDust\(count[\s\S]{0,160}noParticles[\s\S]{0,80}_reducedMotion|_spawnWalkDust\(count[\s\S]{0,120}_reducedMotion[\s\S]{0,80}noParticles/);
  assert.match(content, /spawnParticles\([\s\S]{0,200}noParticles/);
  assert.match(content, /_spawnAmbientWeather\(\)[\s\S]{0,180}_reducedMotion/);
  assert.match(content, /!this\._reducedMotion && this\._canSpawnFx\(1\)/);
  assert.match(popupJs, /previewVolumeChirp\(v,\s*'actions'\)/);
  assert.match(popupJs, /previewVolumeChirp\(v,\s*'ambient'\)/);
  assert.match(content, /master <= 0\) return/);
});

test('qualidade: nome na etiqueta sem race; rostos/skins/idle novos', () => {
  const flushIdx = content.indexOf('_flushSave()');
  assert.ok(flushIdx > 0);
  const flushSlice = content.slice(flushIdx, flushIdx + 2200);
  assert.match(flushSlice, /nicknameHistory/);
  assert.match(flushSlice, /stored\.name|this\.S\.name = stored\.name/);
  assert.match(flushSlice, /_syncNameTag\(\)/);
  assert.doesNotMatch(flushSlice, /popupOwned/);
  assert.match(popupJs, /syncPopupNameTag\(n\)/);
  assert.match(popupJs, /_nameInputTimer|nameInputTimer/);
  assert.match(style, /data-face-style="wink"/);
  assert.match(style, /data-face-style="cute"/);
  assert.match(style, /data-face-style="drool"/);
  assert.match(style, /data-skin="freckles"/);
  assert.match(style, /data-skin="stripes"/);
  assert.match(style, /clawd-skin-freckle-twinkle|clawd-skin-stripe-shift/);
  assert.match(style, /@keyframes clawd-idle-sway/);
  assert.match(style, /@keyframes clawd-idle-nudge/);
  assert.ok(catalog.CLAWD_IDLE_VARIATIONS.some((v) => v.id === 'sway'));
  assert.ok(catalog.CLAWD_IDLE_VARIATIONS.some((v) => v.id === 'nudge'));
  assert.match(popupHtml, /toggle-no-ambient-sparks/);
  assert.match(content, /noAmbientSparks/);
});

test('qualidade: asas flutuam no idle; limpar particleColor; blush não é pago', () => {
  assert.match(style, /has-wings\[data-state="idle"\]/);
  assert.doesNotMatch(style, /has-wings\.idle /);
  assert.match(catalogSource, /particleColor[\s\S]{0,180}return 'default'/);
  assert.match(popupJs, /setConfig\('particleColor',\s*'default'\)/);
  assert.match(content, /case 'particleColor':[\s\S]{0,120}null/);
  assert.equal(catalog.CLAWD_ACCESSORIES.blush.unlock.type, 'free');
  assert.equal(catalog.CLAWD_SHOP.blush, undefined);
  assert.match(style, /has-cushion/);
  assert.match(content, /has-cushion/);
  assert.match(popupHtml, /max="2"/);
  assert.match(popupHtml, /data-acc-body="none"/);
});

/* ---------- v3.7.3: POLISH — HARMONIA · PROFISSÕES · SUBPETS ---------- */

test('polish: tokens de easing, reduced-motion na boca, hover compõe glow, sem vestígio', () => {
  /* Tokens de timing reaproveitados (harmonia) e realmente aplicados */
  assert.match(style, /--clawd-ease-bounce:\s*cubic-bezier/);
  assert.match(style, /--clawd-ease-snap:\s*cubic-bezier/);
  assert.match(style, /transform 0\.25s var\(--clawd-ease-bounce\)/);
  assert.match(style, /var\(--clawd-ease-snap\)/);
  /* Reduced-motion também zera a animação da boca (idle/talk/chew) */
  assert.match(style, /aic-reduced-motion \.emotion-mouth[\s\S]{0,180}animation:\s*none !important/);
  /* Hover num pet alegre intensifica o glow em vez de sobrescrevê-lo */
  assert.match(style, /emotion-glow:not\(\.smooth\)[\s\S]{0,120}:hover \.pet-body/);
  /* Timer vestigial removido (nunca era atribuído) */
  assert.doesNotMatch(content, /_ambientWeatherTimer/);
});

test('polish: profissões gamer/streamer com assinatura própria; tutor variado', () => {
  assert.match(content, /_gamerCombo\(\)\s*\{[\s\S]{0,500}_tickCombo\(\)/);
  assert.match(content, /_streamerLive\(\)\s*\{[\s\S]{0,400}streaming/);
  /* Pulso de profissão usa as novas cenas (não mais doFlip/doDance genéricos) */
  assert.match(content, /case 'gamer': this\._gamerCombo\(\);/);
  assert.match(content, /case 'streamer': this\._streamerLive\(\);/);
  /* Tutor: operação e prompt variam (não só multiplicação) */
  assert.match(content, /const op = useAdd \? '\+' : '×'/);
});

test('polish: subpet — pool autônomo ponderado por personalidade + dança em duo', () => {
  assert.match(content, /_speciesPool\(\)\.slice\(\)/);
  assert.match(content, /\(p\.playful \?\? 5\) >= 7\) pool\.push\('play', 'celebrate', 'spin', 'mischief'\)/);
  assert.match(content, /\(p\.lazy \?\? 5\) >= 7\) pool\.push\('nap', 'cuddle'\)/);
  /* Nova cena coordenada pet↔subpet */
  assert.match(content, /scenes = \['cuddle'[\s\S]{0,90}'dance'\]/);
  assert.match(content, /case 'dance':[\s\S]{0,180}doDance\(\)/);
});

test('harmonia: ações do grid — ícones distintos, PT-BR, ripple no popup', () => {
  const { CLAWD_ACTIONS } = catalog;
  assert.equal(CLAWD_ACTIONS.sneak.emoji, '🤫');
  assert.equal(CLAWD_ACTIONS.flip.emoji, '💫');
  assert.equal(CLAWD_ACTIONS.highfive.label, 'Toca aqui');
  assert.notEqual(CLAWD_ACTIONS.flip.emoji, CLAWD_ACTIONS.spin.emoji);
  assert.match(popupHtml, /🛟.*Resgatar pet|Resgatar pet/);
  assert.doesNotMatch(popupHtml, /🔄<\/span>\s*Resgatar/);
  assert.match(popupJs, /action-ripple|classList\.add\('playing'/);
  assert.match(popupCss, /\.action-btn\.playing|\.action-btn\.action-ripple/);
  assert.match(content, /Shhh\.\.\. 🤫|Toca aqui!|Acrobacia! 💫/);
});

test('fluidez: pet+subpet animam juntos — ease, eco, idle e anticipação', () => {
  /* Locomoção com ease-in-out (não linear seca) */
  assert.match(content, /function clawdEaseInOutCubic/);
  assert.match(content, /clawdEaseInOutCubic\(linear\)/);
  assert.match(content, /const progress = clawdEaseInOutCubic\(linear\)/);
  assert.ok((content.match(/clawdEaseInOutCubic\(linear\)/g) || []).length >= 2,
    'walk e run devem usar ease cúbico');
  /* Subpet ecoa ações do pet (setState → onOwnerState; dança via passos rastreáveis) */
  assert.match(content, /_pulseReact\(/);
  assert.match(content, /react-jump|react-dance|react-splash/);
  assert.match(content, /setState\('dance-2'\)/);
  assert.match(content, /setState\('dance-3'\)/);
  assert.match(content, /this\.subpet\.onOwnerState\(newState\)/);
  assert.match(content, /_danceTimers\.push\(setTimeout/);
  /* Micro-vida do subpet mesmo em PNG estático */
  assert.match(content, /_scheduleIdleVariation\(/);
  assert.match(content, /subpet-idle-look|subpet-idle-hop|subpet-idle-wiggle/);
  assert.match(style, /@keyframes clawd-subpet-react-jump/);
  assert.match(style, /@keyframes clawd-subpet-idle-look/);
  assert.match(style, /clawd-subpet-run[\s\S]{0,80}ease-in-out/);
  /* Pulo com anticipação + pouso */
  assert.match(content, /jump-anticipate/);
  assert.match(style, /@keyframes clawd-jump-anticipate/);
  assert.match(style, /\.jump-anticipate \.pet-body/);
  /* Duo mais contagiante */
  assert.match(content, /Math\.random\(\) > 0\.72/);
});

test('qualidade: curious vence breathe; shiny nofx; rostos/skins/idle expandidos', () => {
  assert.match(style, /:not\(\.curious\)/);
  assert.match(style, /\.curious \.pet-body[\s\S]{0,200}!important/);
  assert.match(style, /aic-nofx\.shiny|\.aic-nofx\.shiny/);
  assert.match(content, /rainbow-aura/);
  assert.match(style, /data-face-style="angry"/);
  assert.match(style, /data-face-style="heart"/);
  assert.match(style, /data-skin="spots"/);
  assert.match(style, /data-skin="glow"/);
  assert.match(style, /@keyframes clawd-idle-hop/);
  assert.match(style, /@keyframes clawd-idle-shimmy/);
  assert.ok(catalog.CLAWD_FACE_STYLES.angry && catalog.CLAWD_FACE_STYLES.heart);
  assert.ok(catalog.CLAWD_SKINS.spots && catalog.CLAWD_SKINS.glow);
  assert.ok(catalog.CLAWD_IDLE_VARIATIONS.some((v) => v.id === 'hop'));
  assert.ok(catalog.CLAWD_IDLE_VARIATIONS.some((v) => v.id === 'shimmy'));
});
