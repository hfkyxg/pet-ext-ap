'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const catalog = require(path.join(root, 'src/shared/catalog.js'));
const i18n = require(path.join(root, 'src/shared/i18n.js'));

const {
  CLAWD_TOAST_POSITIONS, CLAWD_SPEECH_ANCHORS, CLAWD_EMOTION_BADGE_SIDES,
  CLAWD_LOCALES, CLAWD_SETTING_KEYS, CLAWD_RUNTIME_ACTIONS,
  clawdSanitizeSettingValue, clawdValidateRuntimeMessage, clawdDefaultState
} = catalog;

const { clawdT, clawdSpeechMessages, CLAWD_SPEECH_POOLS, CLAWD_I18N_UI } = i18n;

test('pro: settings de notificação e locale na allowlist + defaults', () => {
  assert.ok(CLAWD_SETTING_KEYS.includes('toastPosition'));
  assert.ok(CLAWD_SETTING_KEYS.includes('speechAnchor'));
  assert.ok(CLAWD_SETTING_KEYS.includes('emotionBadgeSide'));
  assert.ok(CLAWD_SETTING_KEYS.includes('locale'));
  assert.ok(CLAWD_SETTING_KEYS.includes('trelloBoardId'));
  const def = clawdDefaultState().settings;
  assert.equal(def.toastPosition, 'center');
  assert.equal(def.speechAnchor, 'auto');
  assert.equal(def.emotionBadgeSide, 'left');
  assert.equal(def.locale, 'pt-BR');
});

test('pro: sanitize toast/speech/emotion/locale rejeita lixo', () => {
  assert.equal(clawdSanitizeSettingValue('toastPosition', 'br'), 'br');
  assert.equal(clawdSanitizeSettingValue('toastPosition', 'xx'), null);
  assert.equal(clawdSanitizeSettingValue('toastPosition', 'l'), 'l');
  assert.equal(clawdSanitizeSettingValue('toastPosition', 'r'), 'r');
  assert.equal(clawdSanitizeSettingValue('speechAnchor', 'below'), 'below');
  assert.equal(clawdSanitizeSettingValue('speechAnchor', 'middle'), null);
  assert.equal(clawdSanitizeSettingValue('emotionBadgeSide', 'right'), 'right');
  assert.equal(clawdSanitizeSettingValue('locale', 'zh-CN'), 'zh-CN');
  assert.equal(clawdSanitizeSettingValue('locale', 'mandarin'), null);
  assert.deepEqual(CLAWD_TOAST_POSITIONS, ['bl', 'br', 'tl', 'tr', 'center', 'l', 'r']);
  assert.ok(CLAWD_SPEECH_ANCHORS.includes('auto'));
  assert.ok(CLAWD_EMOTION_BADGE_SIDES.includes('left'));
  assert.ok(CLAWD_LOCALES.includes('pt-BR') && CLAWD_LOCALES.includes('en'));
});

test('pro: i18n clawdT fallback selected→en→pt-BR; UI em todos os locales', () => {
  assert.equal(clawdT('lang_label', 'pt-BR'), 'Idioma');
  assert.equal(clawdT('lang_label', 'en'), 'Language');
  assert.ok(clawdT('tab_config', 'ja').length > 0);
  for (const loc of CLAWD_LOCALES) {
    assert.ok(CLAWD_I18N_UI[loc], `UI pack ausente: ${loc}`);
    assert.ok(CLAWD_I18N_UI[loc].tab_config, `tab_config ausente: ${loc}`);
    assert.ok(CLAWD_I18N_UI[loc].trello_idea, `trello_idea ausente: ${loc}`);
    assert.ok(CLAWD_I18N_UI[loc].pos_l, `pos_l ausente: ${loc}`);
    assert.ok(CLAWD_I18N_UI[loc].pos_r, `pos_r ausente: ${loc}`);
  }
  // chave inexistente cai no próprio key após fallbacks
  assert.equal(clawdT('__no_such_key__', 'en'), '__no_such_key__');
});

test('pro: speech pools pt-BR/en expandidos; outros com núcleo ou fallback', () => {
  const pt = clawdSpeechMessages('pt-BR');
  const en = clawdSpeechMessages('en');
  assert.ok(pt.idle.length >= 12, `pt idle=${pt.idle.length}`);
  assert.ok(en.idle.length >= 12, `en idle=${en.idle.length}`);
  assert.ok(pt.happy.length >= 10);
  const allStates = ['idle', 'happy', 'sleeping', 'excited', 'hungry', 'sad', 'joyful', 'ecstatic', 'peppy', 'grubby', 'curious'];
  for (const loc of ['es', 'zh-CN', 'ja', 'fr', 'de', 'ko', 'hi', 'ar', 'ru']) {
    const m = clawdSpeechMessages(loc);
    for (const k of ['idle', 'happy', 'hungry', 'sad', 'curious']) {
      assert.ok(Array.isArray(m[k]) && m[k].length >= 3, `${loc}.${k}`);
    }
    // paridade: cada idioma agora traz as 11 categorias NATIVAS (sem fallback)
    for (const k of allStates) {
      const native = CLAWD_SPEECH_POOLS[loc][k];
      assert.ok(Array.isArray(native) && native.length >= 3, `native ${loc}.${k}`);
    }
  }
  assert.ok(CLAWD_SPEECH_POOLS['pt-BR'].curious.length >= 6);
});

test('pro: createTrelloCard allowlist + CSS data-pos / popup selects', () => {
  assert.ok(CLAWD_RUNTIME_ACTIONS.includes('createTrelloCard'));
  const ok = clawdValidateRuntimeMessage({
    action: 'createTrelloCard', kind: 'idea', name: 'Melhoria X', desc: 'detalhe'
  });
  assert.equal(ok?.action, 'createTrelloCard');
  assert.equal(ok?.kind, 'idea');
  const bad = clawdValidateRuntimeMessage({
    action: 'createTrelloCard', kind: 'hack', name: 'x'
  });
  assert.equal(bad, null);
  const xss = clawdValidateRuntimeMessage({
    action: 'createTrelloCard', kind: 'bug', name: '<script>alert(1)</script>Hi', desc: 'ok'
  });
  assert.ok(xss?.name && !xss.name.includes('<'));

  const css = fs.readFileSync(path.join(root, 'src/content/style.css'), 'utf8');
  assert.match(css, /\.aic-toast\[data-pos="center"\]/);
  assert.match(css, /\.aic-toast\[data-pos="l"\]/);
  assert.match(css, /\.aic-toast\[data-pos="r"\]/);
  assert.match(css, /@keyframes clawd-toast-slide-in-x/);
  assert.match(css, /@keyframes clawd-toast-slide-out-x/);
  assert.match(css, /data-speech-anchor="left"/);
  assert.match(css, /data-emotion-side="right"/);

  const html = fs.readFileSync(path.join(root, 'src/popup/popup.html'), 'utf8');
  assert.match(html, /id="select-toast-pos"/);
  assert.match(html, /<option value="l" data-i18n-option="pos_l"/);
  assert.match(html, /<option value="r" data-i18n-option="pos_r"/);
  assert.match(html, /id="select-speech-pos"/);
  assert.match(html, /id="select-emotion-side"/);
  assert.match(html, /id="select-locale"/);
  assert.match(html, /id="onboarding-locale"/);
  assert.match(html, /id="onboarding-corner"/);
  assert.match(html, /data-i18n="onboarding_title"/);
  assert.match(html, /data-i18n="onboarding_start"/);
  assert.match(html, /data-i18n-option="corner_br"/);
  assert.match(html, /id="btn-trello-idea"/);
  assert.match(html, /i18n\.js/);

  const popupJs = fs.readFileSync(path.join(root, 'src/popup/popup.js'), 'utf8');
  assert.match(popupJs, /function applyPopupI18n/);
  assert.match(popupJs, /function applyLocaleChoice/);
  assert.match(popupJs, /function fillLocaleSelect/);
  assert.match(popupJs, /onboarding-locale/);
  assert.match(popupJs, /guessBrowserLocale/);
  assert.match(popupJs, /document\.documentElement\.dir/);
  assert.match(popupJs, /menu_title/);

  assert.equal(clawdT('onboarding_title', 'pt-BR').includes("Claw'd"), true);
  assert.equal(clawdT('onboarding_setup', 'en'), 'Initial setup');
  assert.ok(clawdT('btn_hide_pet', 'en').length > 0);
  assert.ok(clawdT('corner_br', 'ja').length > 0);
  for (const loc of CLAWD_LOCALES) {
    assert.ok(clawdT('onboarding_start', loc).length > 0, `onboarding_start ${loc}`);
    assert.ok(clawdT('btn_show_pet', loc).length > 0, `btn_show_pet ${loc}`);
  }

  // normalização de locale do browser (en-US → en, pt → pt-BR)
  assert.equal(i18n.clawdNormalizeLocale('en-US'), 'en');
  assert.equal(i18n.clawdNormalizeLocale('pt'), 'pt-BR');
  assert.equal(i18n.clawdNormalizeLocale('zh-TW'), 'zh-CN');
  assert.equal(i18n.clawdNormalizeLocale('ar'), 'ar');

  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
  assert.equal(manifest.version, '3.8.0');
  assert.ok(manifest.host_permissions.includes('https://api.trello.com/*'));
  assert.ok(manifest.content_scripts[0].js.includes('src/shared/i18n.js'));

  const bg = fs.readFileSync(path.join(root, 'src/background/background.js'), 'utf8');
  assert.match(bg, /createTrelloCard/);
  assert.match(bg, /api\.trello\.com\/1\/cards/);
  assert.doesNotMatch(bg, /console\.log\([^)]*token/i);
});
