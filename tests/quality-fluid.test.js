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

/* ---------- PERFORMANCE ---------- */

test('qualidade: FX com teto, pause em aba oculta e modo desempenho', () => {
  assert.match(content, /_canSpawnFx\(/);
  assert.match(content, /\+\s*count\s*<=\s*18|count\s*<=\s*18/);
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
  assert.match(content, /setTimeout\(\(\) => this\._flushSave\(\),\s*350\)/);
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
});

test('qualidade: contexto reage com throttle (sem spam ao trocar abas)', () => {
  assert.match(content, /_lastContextReactAt/);
  assert.match(content, /<\s*8000/);
  assert.match(content, /performanceMode\) return/);
  assert.match(content, /isQuiet\(\).*return|_onContextChange[\s\S]*isQuiet/s);
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
  assert.match(popupCss, /\.action-btn:hover/);
  assert.match(popupCss, /\.action-btn:active/);
  assert.match(popupCss, /\.accessory-card:hover|\.profession-card:hover/);
  assert.match(popupJs, /showOnboarding|onboardingDone/);
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

test('qualidade: FX ao vestir acessório + ambient propeller/asas/capa', () => {
  assert.match(content, /_pulseAccessoryEquipFx/);
  assert.match(content, /_tickAccessoryAmbientFx/);
  assert.match(content, /accessory-equip-pop/);
  assert.match(content, /has-propeller/);
  assert.match(style, /clawd-acc-equip-pop/);
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
});

test('qualidade: contagens vivas batem com onboarding (harmonia UX)', () => {
  const acc = Object.keys(catalog.CLAWD_ACCESSORIES).length;
  const ach = Object.keys(catalog.CLAWD_ACHIEVEMENTS).length;
  const weekly = catalog.CLAWD_WEEKLY_CHALLENGES.length;
  assert.match(popupHtml, new RegExp(`${acc} itens`));
  assert.match(popupHtml, new RegExp(`${ach} conquistas`));
  assert.match(popupHtml, new RegExp(`${weekly} desafios`));
});
