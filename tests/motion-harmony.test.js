'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const content = read('src/content/content.js');
const contentCss = read('src/content/style.css');
const popup = read('src/popup/popup.js');
const popupCss = read('src/popup/popup.css');
const popupHtml = read('src/popup/popup.html');
const showcase = read('docs/showcase.js');
const showcaseCss = read('docs/showcase.css');
const catalog = require('../src/shared/catalog.js');

test('movimento: runtime, popup e showcase compartilham tokens de duração e easing', () => {
  assert.match(contentCss, /--clawd-ease-standard:/);
  assert.match(contentCss, /--clawd-ease-emphasized:/);
  assert.match(popupCss, /--motion-ease-standard:/);
  assert.match(popupCss, /--motion-ease-emphasized:/);
  assert.match(showcaseCss, /--motion-ease-standard:/);
  assert.match(showcaseCss, /--motion-ease-emphasized:/);
});

test('movimento: nenhuma superfície usa transition all', () => {
  for (const [name, css] of Object.entries({ contentCss, popupCss, showcaseCss })) {
    assert.doesNotMatch(css, /transition(?:-property)?\s*:\s*all\b/i, `${name} repinta propriedades sem necessidade`);
  }
});

test('movimento reduzido: popup e showcase zeram animações e transições', () => {
  for (const [name, css] of Object.entries({ popupCss, showcaseCss })) {
    const block = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
    assert.match(block, /animation:\s*none !important/, `${name} mantém animação com reduce`);
    assert.match(block, /transition:\s*none !important/, `${name} mantém transição com reduce`);
  }
  assert.match(contentCss, /\.clawd-breathe[\s\S]{0,500}transition:\s*none !important/);
  assert.match(popup, /_clawdPopupMotionQuery[\s\S]{0,500}document\.hidden \|\| _clawdPopupMotionQuery\?\.matches/);
});

test('foco: halo não sobrescreve animation do corpo ou do sprite', () => {
  const focusCss = contentCss.slice(contentCss.indexOf('FOCO & BEM-ESTAR'));
  assert.match(focusCss, /clawd-focus-glow \.sprite-stack::after/);
  assert.match(focusCss, /@keyframes clawd-focus-halo/);
  assert.doesNotMatch(focusCss, /clawd-focus-glow \.pet-body/);
  assert.doesNotMatch(focusCss, /clawd-focus-glow \.smooth-sprite/);
});

test('respiração: relógios JS usam a fonte única de timings', () => {
  assert.equal(catalog.CLAWD_TIMINGS.FOCUS_TICK_MS, 1000);
  assert.equal(catalog.CLAWD_TIMINGS.BREATH_PHASE_MS, 4000);
  assert.equal(catalog.CLAWD_TIMINGS.MOTION_EXIT_MS, 400);
  assert.equal(catalog.CLAWD_TIMINGS.AUTONOMY_GRACE_MS, 5000);
  assert.match(content, /const phaseMs = CLAWD_TIMINGS\.BREATH_PHASE_MS/);
  assert.match(content, /_removeAfterMotion\(el, fallbackMs = CLAWD_TIMINGS\.MOTION_EXIT_MS\)/);
  assert.match(content, /this\._focusBreakTimer = setTimeout/);
  assert.match(content, /clearTimeout\(this\._focusBreakTimer\)/);
  assert.match(content, /_autonomyReady\(\)[\s\S]{0,180}CLAWD_TIMINGS\.AUTONOMY_GRACE_MS/);
  assert.match(content, /_maybePlayDuoScene\(\)[\s\S]{0,300}!this\._autonomyReady\(\)/);
  assert.match(popup, /CLAWD_TIMINGS\.FOCUS_TICK_MS/);
});

test('overlays: modal, foco preso, Escape e cleanup pelo fim visual', () => {
  assert.match(content, /setAttribute\('aria-modal', 'true'\)/);
  assert.match(content, /_trapDialogFocus\(event, dialog\)/);
  assert.match(content, /event\.key === 'Escape'[\s\S]{0,160}_trapDialogFocus/);
  assert.match(content, /addEventListener\('transitionend', onEnd\)/);
  assert.match(content, /restore\?\.isConnected/);
  assert.match(content, /_closeBreathing\(\{ silent: true, immediate: true \}\)/);
});

test('popup: tabs expõem semântica e navegação de teclado completa', () => {
  assert.match(popupHtml, /role="tablist"/);
  assert.match(popupHtml, /role="tabpanel"/);
  assert.match(popupHtml, /aria-controls="tab-focus"/);
  assert.match(popupHtml, /data-i18n-aria="tab-focus"|data-i18n-aria="tab_focus"/);
  assert.match(popup, /event\.key === 'ArrowRight'/);
  assert.match(popup, /event\.key === 'ArrowLeft'/);
  assert.match(popup, /event\.key === 'Home'/);
  assert.match(popup, /event\.key === 'End'/);
  assert.match(popup, /panel\.hidden = !active/);
  assert.match(popup, /window\.addEventListener\('pagehide'/);
});

test('popup: Pomodoro e humor sincronizam estados visuais e assistivos', () => {
  assert.match(popupHtml, /id="focus-clock" role="timer"/);
  assert.match(popupHtml, /id="focus-pause"[\s\S]{0,180}aria-pressed="false" disabled/);
  assert.match(popupHtml, /id="mood-row" role="group"/);
  assert.match(popup, /setAttribute\('aria-pressed', String\(selected\)\)/);
  assert.match(popup, /\[pauseBtn, skipBtn, stopBtn\]/);
});

test('showcase: preview autônomo usa rAF e pausa oculto ou com reduce', () => {
  assert.match(showcase, /requestAnimationFrame\(animateSubpet\)/);
  assert.match(showcase, /document\.hidden \|\| motionQuery\.matches/);
  assert.doesNotMatch(showcase, /__clawdShowcaseSubpetAnim = setInterval/);
  assert.match(showcase, /nav\.addEventListener\('keydown'[\s\S]{0,900}event\.key === 'End'/);
});
