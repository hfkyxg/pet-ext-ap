/* ===================================================
   CLAW'D v3 — POPUP
   Requer: ../shared/i18n.js + ../shared/catalog.js
   =================================================== */

let S;
try {
  S = clawdDefaultState();
} catch (err) {
  window.__clawdPopupBootError = 'clawdDefaultState: ' + (err && (err.stack || err.message || err));
  console.error('[Clawd popup] default state failed', err);
  S = {
    name: "Claw'd", color: '#c71515', eyeColor: '#08080b', model: 'classic', faceStyle: 'classic',
    skin: 'normal', scale: 1.5, animSpeed: 1, xp: 0, showMouth: true, showSpeech: true,
    autoWalk: true, sleepEnabled: true, smooth: false, outline: false, petVisible: true,
    profession: 'idle', tagTheme: 'light', jerseyColor: '#e74c3c',
    accessoryHead: 'none', accessoryFace: 'none', accessoryBody: 'none',
    stats: { happiness: 80, hunger: 80, energy: 80, hygiene: 80 },
    game: { coins: 0, streak: { days: 0, lastDay: '' }, counters: {}, achievements: {}, inventory: [] },
    favorites: { actions: [], professions: [], accessories: [], colors: [], nicknames: [], subpets: [] },
    nicknameHistory: [], subpets: { active: null, unlocked: ['dog'], names: {}, colors: {}, eyeColors: {} },
    settings: { locale: 'pt-BR', crossTab: true, travelFreq: 'sometimes', footprints: true, sounds: true,
      soundVolume: 0.4, soundVolumeActions: 1, soundVolumeAmbient: 0.6, startCorner: 'br',
      toastPosition: 'center', speechAnchor: 'auto', emotionBadgeSide: 'left',
      performanceMode: false, minimalMode: false, noParticles: false, noIdleVariations: false,
      noWeather: false, noAmbientSparks: false, quietStart: '', quietEnd: '', blockedSites: [],
      lastPopupTab: 'appearance', trelloBoardUrl: '', trelloBoardId: '' },
    personality: { playful: 5, lazy: 3, curious: 7, social: 5, foodie: 4 },
    customSpeech: [], particleColor: null, position: { x: null, y: null }, onboardingDone: false,
    schemaVersion: 5
  };
}

window.__clawdPopupBootPhase = 'script-parsed';

function $(id) { return document.getElementById(id); }

/* CSS do pet (grande): injeta após o parse para não segurar o boot do menu. */
(function injectContentStyles() {
  try {
    if (document.querySelector('link[data-clawd-content-css]')) return;
    const link = document.createElement('link');
    link.setAttribute('data-clawd-content-css', '1');
    link.rel = 'stylesheet';
    link.href = (typeof chrome !== 'undefined' && chrome.runtime?.getURL)
      ? chrome.runtime.getURL('src/content/style.css')
      : '../content/style.css';
    document.head.appendChild(link);
  } catch (err) {
    console.warn('[Clawd popup] content CSS', err);
  }
})();

function currentLocale() {
  return (typeof clawdNormalizeLocale === 'function')
    ? clawdNormalizeLocale(S?.settings?.locale)
    : (S?.settings?.locale || 'pt-BR');
}

function t(key) {
  return (typeof clawdT === 'function') ? clawdT(key, currentLocale()) : key;
}

function tf(key, ...vals) {
  let s = t(key);
  vals.forEach((v, i) => { s = s.replace(new RegExp(`\\{${i}\\}`, 'g'), String(v)); });
  return s;
}

/** Label de entidade do catálogo (EN+ via i18n-entities; pt-BR = fallback do catálogo). */
function et(kind, id, fallback) {
  return (typeof clawdEntityT === 'function')
    ? clawdEntityT(kind, id, fallback, currentLocale())
    : (fallback != null ? String(fallback) : String(id || ''));
}

/** Preenche selects de idioma (config + onboarding) com CLAWD_LOCALES. */
function fillLocaleSelect(sel) {
  if (!sel) return;
  const current = sel.value;
  if (!sel.options.length) {
    (CLAWD_LOCALES || []).forEach((code) => {
      const opt = document.createElement('option');
      opt.value = code;
      opt.textContent = (CLAWD_LOCALE_LABELS && CLAWD_LOCALE_LABELS[code]) || code;
      sel.appendChild(opt);
    });
  }
  const loc = currentLocale();
  if ([...sel.options].some((o) => o.value === loc)) sel.value = loc;
  else if (current) sel.value = current;
}

/** Reaplica labels i18n no chrome do popup (tabs, config, onboarding, footer). */
function applyPopupI18n() {
  const loc = currentLocale();
  const htmlLang = loc === 'zh-CN' ? 'zh-CN' : loc.split('-')[0];
  document.documentElement.lang = htmlLang;
  document.documentElement.dir = loc === 'ar' ? 'rtl' : 'ltr';
  document.title = t('menu_title');

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (!key) return;
    el.textContent = t(key);
  });
  document.querySelectorAll('[data-i18n-title]').forEach((el) => {
    const key = el.getAttribute('data-i18n-title');
    if (!key) return;
    el.title = t(key);
  });
  document.querySelectorAll('[data-i18n-option]').forEach((el) => {
    const key = el.getAttribute('data-i18n-option');
    if (!key) return;
    el.textContent = t(key);
  });
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
    const key = el.getAttribute('data-i18n-aria');
    if (!key) return;
    el.setAttribute('aria-label', t(key));
  });

  fillLocaleSelect($('select-locale'));
  fillLocaleSelect($('onboarding-locale'));
  syncVisibilityButton(S.petVisible !== false);
}

/** Aplica locale no estado + UI + content script (sem loop nos selects). */
function applyLocaleChoice(rawLocale, { persistSetting = true } = {}) {
  const loc = (typeof clawdNormalizeLocale === 'function')
    ? clawdNormalizeLocale(rawLocale)
    : (rawLocale || 'pt-BR');
  if (!S.settings) S.settings = {};
  S.settings.locale = loc;
  if (persistSetting) setSetting('locale', loc);
  const configSel = $('select-locale');
  const onboardSel = $('onboarding-locale');
  if (configSel && configSel.value !== loc) configSel.value = loc;
  if (onboardSel && onboardSel.value !== loc) onboardSel.value = loc;
  // Reaplica chrome + listas dinâmicas (ações, loja, conquistas, etc.)
  if (typeof renderAll === 'function') renderAll();
  else applyPopupI18n();
}

function guessBrowserLocale() {
  const nav = (typeof navigator !== 'undefined' && (navigator.language || navigator.userLanguage)) || 'pt-BR';
  return (typeof clawdNormalizeLocale === 'function') ? clawdNormalizeLocale(nav) : 'pt-BR';
}

function scrubLastError() {
  try {
    const err = chrome.runtime.lastError;
    return err ? String(err.message || err) : '';
  } catch (_) {
    return '';
  }
}

function sendMsg(message) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (scrubLastError() || !tabs[0]) return;
    chrome.tabs.sendMessage(tabs[0].id, message).catch(() => {
      scrubLastError();
      const pill = $('status-pill');
      if (!pill) return;
      pill.style.display = '';
      pill.classList.add('error');
      $('status-text').textContent = t('status_need_real_site');
      setTimeout(() => { pill.style.display = 'none'; }, 3000);
    });
  });
}

function sendRuntimeMsg(message, onDone) {
  chrome.runtime.sendMessage(message, (res) => {
    scrubLastError();
    if (onDone) onDone(res);
  });
}

function summonPetToCurrentTab() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (scrubLastError() || !tabs[0]) {
      showStatusFeedback(t('status_open_site_first'), { error: true });
      return;
    }
    sendRuntimeMsg({ action: 'summonPetToTab', tabId: tabs[0].id }, (res) => {
      // Dispara a reação de chegada e usa a resposta do content como fonte de verdade:
      // com cross-tab ligado o pet "viaja" (res.ok); desligado ele já está aqui.
      chrome.tabs.sendMessage(tabs[0].id, { action: 'summonCheer' })
        .then(() => showStatusFeedback(res?.ok ? t('status_summoned') : t('status_already_here')))
        .catch(() => {
          scrubLastError();
          showStatusFeedback(t('status_reload'), { error: true });
        });
    });
  });
}

function syncVisibilityButton(visible = S.petVisible !== false) {
  const label = $('btn-toggle-label');
  if (label) {
    label.setAttribute('data-i18n', visible ? 'btn_hide_pet' : 'btn_show_pet');
    label.textContent = t(visible ? 'btn_hide_pet' : 'btn_show_pet');
    return;
  }
  const btn = $('btn-toggle');
  if (!btn) return;
  btn.innerHTML = visible
    ? `<span>👁️</span> <span id="btn-toggle-label" data-i18n="btn_hide_pet">${t('btn_hide_pet')}</span>`
    : `<span>👁️</span> <span id="btn-toggle-label" data-i18n="btn_show_pet">${t('btn_show_pet')}</span>`;
}

/* Persistência segura: read-modify-write */
function persist(mutator) {
  chrome.storage.local.get(['clawdState'], (res) => {
    scrubLastError();
    const fresh = clawdMigrateState(res.clawdState);
    // preserva progresso que o content atualiza em paralelo
    fresh.xp = Math.max(Number(fresh.xp) || 0, Number(S.xp) || 0);
    fresh.game = fresh.game || {};
    const liveCoins = Number(S.game?.coins) || 0;
    fresh.game.coins = Math.max(Number(fresh.game.coins) || 0, liveCoins);
    if (S.game?.counters && typeof S.game.counters === 'object') {
      fresh.game.counters = fresh.game.counters || {};
      Object.keys(S.game.counters).forEach((key) => {
        const a = S.game.counters[key];
        const b = fresh.game.counters[key];
        if (typeof a === 'number' && typeof b === 'number') {
          fresh.game.counters[key] = Math.max(a, b);
        } else if (typeof a === 'number' && (b == null || b === '')) {
          fresh.game.counters[key] = a;
        }
      });
    }
    // stats NÃO usam max: decay no content deve vencer valores stale do popup
    mutator(fresh);
    S = clawdMigrateState(fresh);
    chrome.storage.local.set({ clawdState: S }, () => { scrubLastError(); });
  });
}

function setConfig(key, value) {
  const safe = clawdSanitizeConfigValue(key, value);
  if (safe === null) return;
  const stored = key === 'particleColor' && safe === 'default' ? null : safe;
  S[key] = stored;
  sendMsg({ action: 'updateConfig', key, value: safe });
  persist(st => { st[key] = stored; });
  if (['color', 'eyeColor', 'model', 'faceStyle', 'smooth', 'outline', 'skin', 'jerseyColor', 'profession', 'accessoryHead', 'accessoryFace', 'accessoryBody'].includes(key)) {
    syncHeaderPetPreview();
    renderOutfitPreview();
  }
}

function setSetting(key, value) {
  const safe = clawdSanitizeSettingValue(key, value);
  if (safe === null) return;
  S.settings[key] = safe;
  persist(st => { st.settings[key] = safe; });
  sendMsg({ action: 'updateSetting', key, value: safe });
}

/* ---- FAVORITOS ---- */
function isFav(category, id) {
  return (S.favorites[category] || []).includes(id);
}
function toggleFavorite(category, id) {
  persist(st => {
    const list = st.favorites[category] || [];
    const i = list.indexOf(id);
    if (i >= 0) list.splice(i, 1); else list.push(id);
    st.favorites[category] = list;
  });
}
function makeStar(category, id, onAfter) {
  const btn = document.createElement('button');
  btn.className = 'fav-star' + (isFav(category, id) ? ' favorited' : '');
  btn.textContent = isFav(category, id) ? '⭐' : '☆';
  btn.title = t('fav_title');
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleFavorite(category, id);
    btn.classList.add('pop');
    setTimeout(() => {
      btn.classList.toggle('favorited');
      btn.textContent = btn.classList.contains('favorited') ? '⭐' : '☆';
      btn.classList.remove('pop');
      if (onAfter) setTimeout(onAfter, 120);
    }, 100);
  });
  return btn;
}
/* Ordena ids: favoritos primeiro */
function favSort(ids, category) {
  return ids.slice().sort((a, b) => (isFav(category, b) ? 1 : 0) - (isFav(category, a) ? 1 : 0));
}

/* =====================================================
   HEADER — XP, coins, medidores
   ===================================================== */
function renderHeader() {
  const { level, into, next } = clawdLevelFromXp(S.xp);
  const title = clawdTitleForLevel(level);
  const pct = next > 0 ? Math.min(100, Math.round((into / next) * 100)) : 100;
  const levelEl = $('xp-level');
  const prevLevel = Number(levelEl.dataset.level || 0);
  levelEl.textContent = `Lv. ${level}`;
  levelEl.title = `${title} · ${into}/${next} XP neste nível`;
  levelEl.dataset.level = String(level);
  if (prevLevel && prevLevel !== level) {
    levelEl.classList.remove('xp-level-bump');
    void levelEl.offsetWidth;
    levelEl.classList.add('xp-level-bump');
    const xpFill = document.querySelector('#xp-bar .stat-fill, .stat-xp-bar .stat-fill, [data-stat="xp"] .stat-fill');
    if (xpFill) {
      xpFill.classList.remove('xp-levelup-flash');
      void xpFill.offsetWidth;
      xpFill.classList.add('xp-levelup-flash');
      setTimeout(() => xpFill.classList.remove('xp-levelup-flash'), 600);
    }
  }

  $('xp-count').textContent = `${S.xp} XP`;
  const barLabel = $('xp-bar-label');
  if (barLabel) barLabel.textContent = `${into}/${next} · ${pct}%`;
  const xpBar = $('xp-bar');
  if (xpBar) {
    xpBar.setAttribute('aria-valuenow', String(pct));
    xpBar.setAttribute('aria-valuetext', `${into} de ${next} XP até o próximo nível (${pct}%)`);
  }

  const coins = S.game.coins || 0;
  const coinsEl = $('coins-count');
  const prevCoins = Number(coinsEl.dataset.prev || coins);
  coinsEl.textContent = coins;
  coinsEl.dataset.prev = String(coins);
  const coinsPill = $('coins-pill');
  if (coinsPill && coins !== prevCoins) {
    coinsPill.classList.remove('coins-bump');
    void coinsPill.offsetWidth;
    coinsPill.classList.add('coins-bump');
  }

  const fill = $('xp-fill');
  requestAnimationFrame(() => {
    fill.style.width = `${pct}%`;
    fill.classList.toggle('xp-near', pct >= 85);
  });
  renderStats(S.stats);
  if (S.color) applyHeaderColor(S.color);
  syncHeaderPetPreview();
  renderOutfitPreview();
}

function syncHeaderPetPreview() {
  const preview = $('mini-sprite');
  if (!preview) return;
  const effective = clawdEffectiveAccessories(S);
  preview.dataset.model = S.model || 'classic';
  preview.dataset.faceStyle = S.faceStyle || 'classic';
  preview.dataset.skin = S.skin || 'normal';
  preview.dataset.accHead = effective.head || 'none';
  preview.dataset.accFace = effective.face || 'none';
  preview.dataset.accBody = effective.body || 'none';
  preview.classList.toggle('has-wings', effective.body === 'wings');
  preview.classList.toggle('has-cape', effective.body === 'cape');
  preview.classList.toggle('has-armor', effective.body === 'armor');
  preview.classList.toggle('has-propeller', effective.head === 'propeller');
  preview.style.setProperty('--agent-color', S.color || '#c71515');
  preview.style.setProperty('--agent-eye-color', S.eyeColor || '#08080b');
  const modelLabel = et('model', S.model, CLAWD_MODELS[S.model]?.label || 'Clássico');
  const faceLabel = et('face', S.faceStyle, CLAWD_FACE_STYLES[S.faceStyle]?.label || 'Clássico');
  preview.setAttribute('aria-label', `${modelLabel}, ${faceLabel}`);
}

function renderStats(stats) {
  const meta = {
    happiness: { id: 'stat-happiness', label: 'Felicidade', hint: 'clique para dar carinho', tone: 'love' },
    hunger: { id: 'stat-hunger', label: 'Saciedade', hint: 'clique para alimentar', tone: 'food' },
    energy: { id: 'stat-energy', label: 'Energia', hint: 'clique para brincar', tone: 'energy' },
    hygiene: { id: 'stat-hygiene', label: 'Higiene', hint: 'clique para banho', tone: 'clean' }
  };
  Object.entries(meta).forEach(([key, info]) => {
    const v = Math.max(0, Math.min(100, Math.round(stats[key] ?? 0)));
    const el = $(info.id);
    if (!el) return;
    const prev = Number(el.dataset.prev ?? v);
    el.style.width = `${v}%`;
    el.dataset.prev = String(v);
    el.classList.toggle('low', v < 30);
    el.classList.toggle('mid', v >= 30 && v < 70);
    el.classList.toggle('high', v >= 70);
    el.classList.toggle(`tone-${info.tone}`, true);
    if (v !== prev) {
      el.classList.remove('stat-fill-flash');
      void el.offsetWidth;
      el.classList.add('stat-fill-flash');
    }
    el.parentElement?.setAttribute('aria-valuenow', String(v));
    el.parentElement?.setAttribute('aria-valuetext', `${info.label} ${v} por cento`);
    const valEl = $(`${info.id}-val`);
    if (valEl) {
      valEl.textContent = `${v}%`;
      valEl.classList.toggle('low', v < 30);
      valEl.classList.toggle('high', v >= 70);
    }
    const btn = el.closest('.stat-action');
    if (btn) {
      const title = `${info.label}: ${v}% — ${info.hint}`;
      btn.title = title;
      btn.setAttribute('aria-label', title);
      btn.classList.toggle('stat-critical', v < 30);
      btn.classList.toggle('stat-good', v >= 70);
      btn.classList.toggle('stat-warn', v >= 30 && v < 50);
    }
  });
}

function showStatDelta(btn) {
  const delta = btn?.querySelector('.stat-delta');
  if (!delta) return;
  const text = btn.dataset.statDelta || '+';
  delta.textContent = text;
  delta.classList.remove('show');
  void delta.offsetWidth;
  delta.classList.add('show');
  clearTimeout(delta._t);
  delta._t = setTimeout(() => delta.classList.remove('show'), 700);
}

function showStatusFeedback(text, { error = false } = {}) {
  const pill = $('status-pill');
  if (!pill) return;
  pill.style.display = '';
  pill.classList.toggle('error', !!error);
  $('status-text').textContent = text;
  clearTimeout(showStatusFeedback._t);
  showStatusFeedback._t = setTimeout(() => { pill.style.display = 'none'; }, 2200);
}

function pulseStatButton(btn) {
  if (!btn) return;
  btn.classList.remove('stat-pulse', 'stat-ripple');
  void btn.offsetWidth;
  btn.classList.add('stat-pulse', 'stat-ripple');
  showStatDelta(btn);
  setTimeout(() => btn.classList.remove('stat-pulse'), 450);
  setTimeout(() => btn.classList.remove('stat-ripple'), 400);
}

function activatePopupTab(tabId) {
  if (!CLAWD_POPUP_TABS.includes(tabId)) tabId = 'appearance';
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tabId));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === `tab-${tabId}`));
}

function openStudioOnPage() {
  sendMsg({ action: 'openStudio' });
  showStatusFeedback(t('status_studio_open'));
}

function detachPopupWindow() {
  const url = chrome.runtime.getURL('src/popup/popup.html?detached=1');
  chrome.windows.create({ url, type: 'popup', width: 380, height: 640, focused: true }, () => {
    scrubLastError();
    if (!new URLSearchParams(location.search).has('detached')) {
      try { window.close(); } catch (_) { /* toolbar popup */ }
    }
  });
}

function applyHeaderColor(color) {
  $('color-hex').textContent = color;
  document.querySelector('.header-pet').style.borderColor = color;
  document.querySelector('.header-pet').style.boxShadow = `0 0 16px ${color}55`;
  $('mini-sprite').style.setProperty('--agent-color', color);
  $('mini-sprite').style.setProperty('--clawd-accent', color);
  $('aic-clawd-node')?.style.setProperty('--agent-color', color);
  $('aic-clawd-node')?.style.setProperty('--clawd-accent', color);
  document.querySelectorAll('.clawd-model-preview').forEach(preview => {
    preview.style.setProperty('--agent-color', color);
    preview.style.setProperty('--clawd-accent', color);
  });
}

function createPetArtPreview({ model, faceStyle, skin, head = 'none', face = 'none', body = 'none', className = '' } = {}) {
  const preview = document.createElement('span');
  preview.className = `clawd-model-preview ${className}`.trim();
  preview.dataset.model = model || S.model || 'classic';
  preview.dataset.faceStyle = faceStyle || S.faceStyle || 'classic';
  preview.dataset.skin = skin || S.skin || 'normal';
  preview.dataset.accHead = head;
  preview.dataset.accFace = face;
  preview.dataset.accBody = body;
  preview.style.setProperty('--agent-color', S.color || '#c71515');
  preview.style.setProperty('--agent-eye-color', S.eyeColor || '#08080b');
  preview.classList.toggle('has-wings', body === 'wings');
  preview.classList.toggle('has-cape', body === 'cape');
  preview.classList.toggle('has-armor', body === 'armor');
  preview.classList.toggle('has-propeller', head === 'propeller');
  preview.innerHTML = `
    <i class="pixel-sprite"></i><i class="pixel-legs"></i><i class="pet-eyes"></i><i class="face-detail"></i>
    <i class="skin-mod"></i><i class="accessory acc-body"></i><i class="accessory acc-head"></i><i class="accessory acc-face"></i>`;
  return preview;
}

function updatePreviewPalette() {
  document.querySelectorAll('.clawd-model-preview').forEach(preview => {
    preview.style.setProperty('--agent-color', S.color || '#c71515');
    preview.style.setProperty('--agent-eye-color', S.eyeColor || '#08080b');
    preview.style.setProperty('--clawd-accent', S.color || '#c71515');
  });
}

function renderOutfitPreview() {
  const preview = $('aic-clawd-node');
  if (!preview) return;
  const effective = clawdEffectiveAccessories(S);
  const head = CLAWD_ACCESSORIES[effective.head];
  const face = CLAWD_ACCESSORIES[effective.face];
  const body = CLAWD_ACCESSORIES[effective.body];
  const automatic = [effective.autoHead, effective.autoFace]
    .filter(Boolean)
    .map(id => et('acc', id, CLAWD_ACCESSORIES[id]?.label))
    .filter(Boolean);
  const equipped = [
    head ? et('acc', effective.head, head.label) : null,
    face ? et('acc', effective.face, face.label) : null,
    body ? et('acc', effective.body, body.label) : null
  ].filter(Boolean);

  preview.dataset.accHead = effective.head;
  preview.dataset.accFace = effective.face;
  preview.dataset.accBody = effective.body || 'none';
  preview.dataset.model = S.model || 'classic';
  preview.dataset.faceStyle = S.faceStyle || 'classic';
  preview.dataset.skin = S.skin || 'normal';
  preview.dataset.profession = effective.profession;
  preview.classList.toggle('smooth', !!S.smooth);
  preview.classList.toggle('outlined', !!S.outline);
  preview.classList.toggle('has-jersey', effective.profession === 'footballer');
  preview.classList.toggle('has-wings', effective.body === 'wings');
  preview.classList.toggle('has-cape', effective.body === 'cape');
  preview.classList.toggle('has-armor', effective.body === 'armor');
  preview.classList.toggle('has-propeller', effective.head === 'propeller');
  preview.style.setProperty('--agent-color', S.color || '#c71515');
  preview.style.setProperty('--agent-eye-color', S.eyeColor || '#08080b');
  preview.style.setProperty('--jersey-color', S.jerseyColor || '#e74c3c');
  preview.setAttribute('data-tag-theme', S.tagTheme || 'light');
  syncPopupNameTag();
  preview.setAttribute('aria-label', equipped.length
    ? `Prévia do pet com ${equipped.join(' e ')}`
    : 'Prévia do pet sem acessórios');
  $('outfit-preview-title').textContent = equipped.length ? equipped.join(' + ') : t('outfit_none');
  $('outfit-preview-detail').textContent = automatic.length
    ? `${automatic.join(' + ')} temporário da profissão; sua escolha pessoal está salva.`
    : `${et('model', S.model, CLAWD_MODELS[S.model]?.label || 'Clássico')} · ${et('face', S.faceStyle, CLAWD_FACE_STYLES[S.faceStyle]?.label || 'Clássico')} · ${S.smooth ? t('outfit_smooth') : t('outfit_pixel')} · ${t('outfit_slots')}`;
}

function syncPopupNameTag(name = S.name) {
  const tag = $('popup-name-preview');
  if (!tag) return;
  let titleEl = $('popup-name-title');
  let labelEl = $('popup-name-label');
  if (!titleEl || !tag.contains(titleEl) || !labelEl || !tag.contains(labelEl)) {
    tag.replaceChildren();
    titleEl = document.createElement('span');
    titleEl.className = 'name-title';
    titleEl.id = 'popup-name-title';
    labelEl = document.createElement('span');
    labelEl.className = 'name-label';
    labelEl.id = 'popup-name-label';
    tag.append(titleEl, labelEl);
  }
  const level = clawdLevelFromXp(S.xp || 0).level;
  const title = clawdTitleForLevel(level) || 'Novato';
  const display = (name && String(name).trim()) || "Claw'd";
  titleEl.textContent = title;
  labelEl.textContent = display;
  tag.setAttribute('aria-label', `${display}, ${title}`);
}

/* Busca stats ao vivo do content script */
function pollLiveStats() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (scrubLastError() || !tabs[0]) return;
    chrome.tabs.sendMessage(tabs[0].id, { action: 'getStatus' })
      .then(res => {
        scrubLastError();
        if (!res) return;
        renderStats(res.stats);
        S.stats = res.stats || S.stats;
        if (res.xp != null) S.xp = res.xp;
        if (res.coins != null) S.game.coins = res.coins;
        const { level, into, next } = clawdLevelFromXp(res.xp);
        const pct = next > 0 ? Math.min(100, Math.round((into / next) * 100)) : 100;
        $('xp-level').textContent = `Lv. ${level}`;
        $('xp-level').title = `${clawdTitleForLevel(level)} · ${into}/${next} XP neste nível`;
        $('xp-count').textContent = `${res.xp} XP`;
        $('coins-count').textContent = res.coins;
        $('xp-fill').style.width = `${pct}%`;
        const barLabel = $('xp-bar-label');
        if (barLabel) barLabel.textContent = `${into}/${next} · ${pct}%`;
        const xpBar = $('xp-bar');
        if (xpBar) {
          xpBar.setAttribute('aria-valuenow', String(pct));
          xpBar.setAttribute('aria-valuetext', `${into} de ${next} XP até o próximo nível (${pct}%)`);
        }
        const rec = $('keepy-record');
        if (rec) rec.querySelector('b').textContent = res.keepyRecord;
        if (res.daily) renderDailyQuest(res.daily);
        if (res.weekly) renderWeeklyChallenge(res.weekly);
        updateContextBar(res);
        if (res.streakDays !== undefined) updateStreakPill(res.streakDays);
        if (res.petVisible !== undefined) {
          S.petVisible = !!res.petVisible;
          syncVisibilityButton(S.petVisible);
        }
      })
      .catch(() => { scrubLastError(); });
  });
}

function renderDailyQuest(daily = clawdEnsureDailyQuest(S)) {
  const box = $('daily-quest');
  if (!box || !daily) return;
  const progress = Math.min(daily.progress || 0, daily.target);
  const done = progress >= daily.target;
  const pct = daily.target ? Math.round(progress / daily.target * 100) : 0;
  box.replaceChildren();

  const top = document.createElement('div');
  top.className = 'daily-top';
  const title = document.createElement('span');
  title.textContent = `🎯 ${t('daily_title')}`;
  const progressEl = document.createElement('b');
  progressEl.textContent = `${progress}/${daily.target} · ${pct}%`;
  top.appendChild(title);
  top.appendChild(progressEl);

  const label = document.createElement('div');
  label.className = 'daily-label';
  label.textContent = et('daily', daily.type, daily.label);

  const bar = document.createElement('div');
  bar.className = 'daily-bar';
  bar.setAttribute('role', 'progressbar');
  bar.setAttribute('aria-valuenow', String(pct));
  bar.setAttribute('aria-valuemin', '0');
  bar.setAttribute('aria-valuemax', '100');
  const fill = document.createElement('div');
  fill.style.width = `${pct}%`;
  bar.appendChild(fill);

  const button = document.createElement('button');
  button.className = 'daily-claim';
  button.disabled = !done || !!daily.claimed;
  button.textContent = daily.claimed
    ? `✅ ${t('quest_claimed')}`
    : done
      ? `${tf('quest_claim_coins', daily.rewardCoins)} 🪙`
      : tf('quest_reward_xp', daily.rewardXp);

  box.appendChild(top);
  box.appendChild(label);
  box.appendChild(bar);
  box.appendChild(button);

  if (done && !daily.claimed) button.addEventListener('click', () => {
    sendMsg({ action: 'claimDailyQuest' });
    setTimeout(pollLiveStats, 300);
  });
}

function renderWeeklyChallenge(weekly = clawdEnsureWeeklyChallenge(S)) {
  const box = $('weekly-challenge');
  if (!box || !weekly) return;
  const progress = Math.min(weekly.progress || 0, weekly.target);
  const done = progress >= weekly.target;
  const pct = weekly.target ? Math.round(progress / weekly.target * 100) : 0;
  box.replaceChildren();

  const top = document.createElement('div');
  top.className = 'daily-top';
  const title = document.createElement('span');
  title.textContent = `${weekly.badge || '🏆'} ${t('weekly_title')}`;
  const progressEl = document.createElement('b');
  progressEl.textContent = `${progress}/${weekly.target} · ${pct}%`;
  top.appendChild(title);
  top.appendChild(progressEl);

  const label = document.createElement('div');
  label.className = 'daily-label';
  label.textContent = et('weekly', weekly.type, weekly.label);

  const desc = document.createElement('div');
  desc.className = 'daily-label';
  desc.style.cssText = 'font-size:10px;opacity:0.7;';
  desc.textContent = et('weekly_desc', weekly.type, weekly.desc);

  const bar = document.createElement('div');
  bar.className = 'daily-bar';
  bar.style.background = 'rgba(155,89,182,0.2)';
  bar.setAttribute('role', 'progressbar');
  bar.setAttribute('aria-valuenow', String(pct));
  bar.setAttribute('aria-valuemin', '0');
  bar.setAttribute('aria-valuemax', '100');
  const fill = document.createElement('div');
  fill.style.cssText = `width:${pct}%; background: #9b59b6;`;
  bar.appendChild(fill);

  const button = document.createElement('button');
  button.className = 'daily-claim';
  button.style.borderColor = '#9b59b6';
  button.disabled = !done || !!weekly.claimed;
  button.textContent = weekly.claimed
    ? `✅ ${t('quest_claimed')}`
    : done
      ? `${tf('quest_claim_coins', weekly.rewardCoins)} 🪙`
      : tf('quest_reward_xp', weekly.rewardXp);

  box.appendChild(top);
  box.appendChild(label);
  box.appendChild(desc);
  box.appendChild(bar);
  box.appendChild(button);

  if (done && !weekly.claimed) button.addEventListener('click', () => {
    sendMsg({ action: 'claimWeeklyChallenge' });
    setTimeout(pollLiveStats, 300);
  });
}

/* =====================================================
   APARÊNCIA
   ===================================================== */
function renderNameArea() {
  $('input-name').value = S.name || "Claw'd";
  syncPopupNameTag();
  const dl = $('name-history');
  dl.innerHTML = '';
  (S.nicknameHistory || []).forEach(n => {
    const opt = document.createElement('option');
    opt.value = n;
    dl.appendChild(opt);
  });
  updateNameStar();
  renderFavNicks();
}
function updateNameStar() {
  const cur = $('input-name').value.trim();
  const fav = isFav('nicknames', cur);
  const btn = $('name-star');
  btn.textContent = fav ? '⭐' : '☆';
  btn.classList.toggle('favorited', fav);
}
function renderFavNicks() {
  const box = $('fav-nicks');
  box.innerHTML = '';
  (S.favorites.nicknames || []).forEach(n => {
    const chip = document.createElement('span');
    chip.className = 'nick-chip';
    chip.textContent = `⭐ ${n}`;
    chip.title = t('nick_click_use');
    chip.addEventListener('click', () => {
      $('input-name').value = n;
      setConfig('name', n);
      syncPopupNameTag(n);
      updateNameStar();
    });
    box.appendChild(chip);
  });
}

function renderColors() {
  const grid = $('color-grid');
  grid.innerHTML = '';
  favSort(CLAWD_COLORS, 'colors').forEach(color => {
    const wrap = document.createElement('div');
    wrap.className = 'swatch-wrap' + (isFav('colors', color) ? ' favorited' : '');
    const sw = document.createElement('button');
    sw.className = 'color-swatch' + (S.color === color ? ' selected' : '');
    sw.style.background = color;
    sw.title = color;
    sw.addEventListener('click', () => {
      document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
      sw.classList.add('selected');
      $('input-color').value = color;
      applyHeaderColor(color);
      setConfig('color', color);
      updateColorStar();
    });
    wrap.appendChild(sw);
    grid.appendChild(wrap);
  });
  // linha "cores favoritas" acima da grid
  const favRow = $('fav-color-row');
  const favs = S.favorites.colors || [];
  favRow.innerHTML = '';
  favRow.style.display = favs.length ? '' : 'none';
  favs.forEach(color => {
    const sw = document.createElement('button');
    sw.className = 'color-swatch fav-color' + (S.color === color ? ' selected' : '');
    sw.style.background = color;
    sw.title = `⭐ ${color}`;
    sw.addEventListener('click', () => {
      $('input-color').value = color;
      applyHeaderColor(color);
      setConfig('color', color);
      renderColors();
    });
    favRow.appendChild(sw);
  });
  updateColorStar();
  // presets de cor
  const presetRow = $('color-presets');
  if (presetRow) {
    presetRow.innerHTML = '';
    CLAWD_COLOR_PRESETS.forEach(preset => {
      const presetLabel = et('color', preset.id, preset.label);
      const chip = document.createElement('button');
      chip.className = 'preset-chip' + (S.color === preset.color ? ' active' : '');
      chip.textContent = presetLabel;
      chip.title = `${presetLabel}: ${preset.color}`;
      chip.addEventListener('click', () => {
        $('input-color').value = preset.color;
        $('input-eye-color').value = preset.eyeColor;
        applyHeaderColor(preset.color);
        setConfig('color', preset.color);
        setConfig('eyeColor', preset.eyeColor);
        $('color-hex').textContent = preset.color;
        $('eye-color-hex').textContent = preset.eyeColor;
        renderColors();
      });
      presetRow.appendChild(chip);
    });
  }
}
function updateColorStar() {
  const cur = $('input-color').value;
  const fav = isFav('colors', cur);
  const btn = $('color-star');
  btn.textContent = fav ? '⭐' : '☆';
  btn.classList.toggle('favorited', fav);
}

function renderModels() {
  const grid = $('model-grid');
  grid.innerHTML = '';
  Object.entries(CLAWD_MODELS).forEach(([id, def]) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'pixel-custom-card' + (S.model === id ? ' active' : '');
    card.dataset.modelId = id;
    card.setAttribute('aria-pressed', String(S.model === id));
    card.title = def.desc;
    card.appendChild(createPetArtPreview({ model: id, className: 'model-art-preview' }));
    const label = document.createElement('span');
    label.innerHTML = `<b>${def.badge}</b>${et('model', id, def.label)}`;
    card.appendChild(label);
    card.addEventListener('click', () => {
      setConfig('model', id);
      renderModels();
      renderFaceStyles();
      renderSkins();
      renderAccessories();
    });
    grid.appendChild(card);
  });
  $('model-description').textContent = CLAWD_MODELS[S.model]?.desc || CLAWD_MODELS.classic.desc;
}

function renderFaceStyles() {
  const grid = $('face-style-grid');
  grid.innerHTML = '';
  Object.entries(CLAWD_FACE_STYLES).forEach(([id, def]) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'face-style-card' + (S.faceStyle === id ? ' active' : '');
    card.dataset.faceStyleId = id;
    card.setAttribute('aria-pressed', String(S.faceStyle === id));
    card.title = def.desc;
    card.appendChild(createPetArtPreview({ faceStyle: id, className: 'face-art-preview' }));
    const label = document.createElement('span');
    label.innerHTML = `<b>${def.badge}</b>${et('face', id, def.label)}`;
    card.appendChild(label);
    card.addEventListener('click', () => {
      setConfig('faceStyle', id);
      renderFaceStyles();
      renderAccessories();
    });
    grid.appendChild(card);
  });
  $('face-style-description').textContent = CLAWD_FACE_STYLES[S.faceStyle]?.desc || CLAWD_FACE_STYLES.classic.desc;
}

function renderSkins() {
  const grid = $('skin-grid');
  grid.innerHTML = '';
  Object.entries(CLAWD_SKINS).forEach(([id, def]) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'skin-art-card' + (S.skin === id ? ' active' : '');
    card.dataset.skin = id;
    card.setAttribute('aria-pressed', String(S.skin === id));
    card.title = def.desc;
    card.appendChild(createPetArtPreview({ skin: id, className: 'skin-art-preview' }));
    const label = document.createElement('span');
    label.textContent = et('skin', id, def.label);
    card.appendChild(label);
    card.addEventListener('click', () => {
      setConfig('skin', id);
      renderSkins();
      renderAccessories();
    });
    grid.appendChild(card);
  });
}

function accessoryUnlocked(id) {
  const def = CLAWD_ACCESSORIES[id];
  if (!def) return false;
  if (def.unlock.type === 'free') return true;
  if (def.unlock.type === 'shop') return (S.game.inventory || []).includes(id);
  if (def.unlock.type === 'level') {
    return clawdLevelFromXp(S.xp).level >= def.unlock.level || (S.game.inventory || []).includes(id);
  }
  return false;
}

function renderAccessories() {
  const effective = clawdEffectiveAccessories(S);
  ['head', 'face', 'body'].forEach(slot => {
    const gridId = slot === 'head' ? 'acc-head-grid' : slot === 'face' ? 'acc-face-grid' : 'acc-body-grid';
    const grid = $(gridId);
    if (!grid) return;
    grid.innerHTML = '';
    const configKey = slot === 'head' ? 'accessoryHead' : slot === 'face' ? 'accessoryFace' : 'accessoryBody';
    const current = S[configKey] || 'none';
    const autoId = slot === 'head' ? effective.autoHead : slot === 'face' ? effective.autoFace : null;

    // card "nenhum"
    const noneCard = document.createElement('button');
    noneCard.className = 'accessory-card' + (current === 'none' ? ' active' : '');
    noneCard.dataset.accessoryId = 'none';
    noneCard.dataset.accessorySlot = slot;
    const noneArt = createPetArtPreview({ className: 'accessory-art-preview no-accessory-art' });
    const removeMark = document.createElement('i');
    removeMark.className = 'remove-accessory-mark';
    noneArt.appendChild(removeMark);
    const noneName = document.createElement('span');
    noneName.className = 'acc-name';
    noneName.textContent = t('acc_none');
    noneCard.append(noneArt, noneName);
    const slotName = slot === 'head' ? t('acc_slot_head') : slot === 'face' ? t('acc_slot_face') : t('acc_slot_body');
    noneCard.title = tf('acc_remove_fmt', slotName);
    noneCard.setAttribute('aria-label', noneCard.title);
    noneCard.setAttribute('aria-pressed', String(current === 'none'));
    noneCard.addEventListener('click', () => { setConfig(configKey, 'none'); renderAccessories(); });
    grid.appendChild(noneCard);

    const ids = Object.keys(CLAWD_ACCESSORIES).filter(id => CLAWD_ACCESSORIES[id].slot === slot);
    favSort(ids, 'accessories').forEach(id => {
      const def = CLAWD_ACCESSORIES[id];
      const unlocked = accessoryUnlocked(id);
      const card = document.createElement('button');
      card.dataset.accessoryId = id;
      card.dataset.accessorySlot = slot;
      card.className = 'accessory-card'
        + (current === id ? ' active' : '')
        + (autoId === id ? ' profession-equipped' : '')
        + (isFav('accessories', id) ? ' favorited' : '')
        + (unlocked ? '' : ' locked');
      card.appendChild(createPetArtPreview({
        head: slot === 'head' ? id : 'none',
        face: slot === 'face' ? id : 'none',
        body: slot === 'body' ? id : 'none',
        className: 'accessory-art-preview'
      }));
      const accLabel = et('acc', id, def.label);
      const accDesc = et('acc_desc', id, def.desc);
      const name = document.createElement('span');
      name.className = 'acc-name';
      name.textContent = accLabel;
      card.appendChild(name);
      if (slot === 'body') {
        const slotBadge = document.createElement('span');
        slotBadge.className = 'acc-slot-badge';
        slotBadge.textContent = t('acc_badge_body');
        card.appendChild(slotBadge);
      }
      if (!unlocked) {
        const lock = document.createElement('span');
        lock.className = 'lock-badge';
        lock.textContent = def.unlock.type === 'level' ? `🔒 Lv.${def.unlock.level}` : t('acc_badge_shop');
        card.appendChild(lock);
      }
      card.setAttribute('aria-pressed', String(current === id));
      if (autoId === id) {
        const badge = document.createElement('span');
        badge.className = 'auto-gear-badge';
        badge.textContent = t('acc_badge_prof');
        badge.title = t('acc_prof_temp');
        card.appendChild(badge);
        card.setAttribute('aria-current', 'true');
      }
      if (unlocked) {
        card.title = accDesc;
        card.setAttribute('aria-label', `${accLabel}. ${accDesc}`);
        card.appendChild(makeStar('accessories', id, renderAccessories));
        card.addEventListener('click', () => { setConfig(configKey, id); renderAccessories(); });
      } else {
        const unlockHint = def.unlock.type === 'level'
          ? tf('acc_unlock_level', def.unlock.level)
          : tf('acc_buy_shop', def.unlock.price);
        card.title = `${accDesc}. ${unlockHint}`;
        card.setAttribute('aria-label', `${accLabel}. ${card.title}`);
      }
      if (autoId === id) {
        card.setAttribute('aria-label', `${card.getAttribute('aria-label')}. ${t('acc_prof_temp')}.`);
      }
      grid.appendChild(card);
    });

    const selected = CLAWD_ACCESSORIES[current];
    const descId = slot === 'head' ? 'acc-head-description' : slot === 'face' ? 'acc-face-description' : 'acc-body-description';
    const description = $(descId);
    if (!description) return;
    const automatic = autoId && CLAWD_ACCESSORIES[autoId];
    if (automatic) {
      const autoLabel = et('acc', autoId, automatic.label);
      const middle = selected
        ? tf('acc_your_choice', et('acc', current, selected.label))
        : t('acc_none_option');
      description.textContent = tf('acc_prof_in_use', automatic.emoji, autoLabel, middle);
    } else if (selected) {
      description.textContent = `${selected.emoji} ${et('acc', current, selected.label)} — ${et('acc_desc', current, selected.desc)}`;
    } else {
      description.textContent = slot === 'head'
        ? t('acc_empty_head')
        : slot === 'face'
        ? t('acc_empty_face')
        : t('acc_empty_body');
    }
  });
  renderOutfitPreview();
}

/* =====================================================
   PROFISSÃO
   ===================================================== */
function renderProfessions() {
  const grid = $('profession-grid');
  grid.innerHTML = '';
  favSort(Object.keys(CLAWD_PROFESSIONS), 'professions').forEach(id => {
    const def = CLAWD_PROFESSIONS[id];
    const card = document.createElement('button');
    card.className = 'profession-card'
      + (S.profession === id ? ' active' : '')
      + (isFav('professions', id) ? ' favorited' : '');
    card.innerHTML = `<span class="prof-icon">${def.emoji}</span><span class="prof-name">${et('prof', id, def.label)}</span><span class="prof-desc">${et('prof_desc', id, def.desc)}</span>`;
    card.appendChild(makeStar('professions', id, renderProfessions));
    card.addEventListener('click', () => {
      setConfig('profession', id);
      renderProfessions();
      updateProfStatus(id);
    });
    grid.appendChild(card);
  });
  updateProfStatus(S.profession);
  renderJersey();
  renderOutfitPreview();
}

function updateProfStatus(profession) {
  const def = CLAWD_PROFESSIONS[profession] || CLAWD_PROFESSIONS.idle;
  const gear = Object.values(def.gear || {}).map(id => et('acc', id, CLAWD_ACCESSORIES[id]?.label)).filter(Boolean);
  document.querySelector('.prof-status-icon').textContent = def.emoji;
  $('prof-status-text').textContent = profession === 'idle'
    ? t('prof_idle_status')
    : tf('prof_active_fmt', et('prof', profession, def.label), et('prof_desc', profession, def.desc).toLowerCase())
      + (gear.length ? tf('prof_gear_fmt', gear.join(' + ')) : '');
  $('jersey-group').style.display = profession === 'footballer' ? '' : 'none';
}

function renderJersey() {
  const grid = $('jersey-grid');
  grid.innerHTML = '';
  CLAWD_JERSEYS.forEach(color => {
    const sw = document.createElement('button');
    sw.className = 'color-swatch' + (S.jerseyColor === color ? ' selected' : '');
    sw.style.background = color;
    sw.addEventListener('click', () => {
      grid.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
      sw.classList.add('selected');
      setConfig('jerseyColor', color);
    });
    grid.appendChild(sw);
  });
  const rec = $('keepy-record');
  rec.replaceChildren(document.createTextNode(`${t('keepy_record_fmt')} `));
  const recB = document.createElement('b');
  recB.textContent = S.game.counters.keepyRecord || 0;
  rec.appendChild(recB);
}

/* =====================================================
   AÇÕES
   ===================================================== */
function renderActions() {
  const grid = $('actions-grid');
  grid.innerHTML = '';
  favSort(Object.keys(CLAWD_ACTIONS), 'actions').forEach(id => {
    const def = CLAWD_ACTIONS[id];
    const label = et('action', id, def.label);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'action-btn' + (isFav('actions', id) ? ' favorited' : '');
    btn.dataset.action = id;
    btn.setAttribute('aria-label', label);
    btn.title = label;
    btn.innerHTML = `<span class="action-emoji" aria-hidden="true">${def.emoji}</span><span class="action-label">${label}</span>`;
    btn.appendChild(makeStar('actions', id, renderActions));
    btn.addEventListener('click', () => {
      sendMsg({ action: 'triggerAction', value: id });
      btn.classList.remove('playing', 'action-ripple');
      void btn.offsetWidth;
      btn.classList.add('playing', 'action-ripple');
      setTimeout(() => btn.classList.remove('playing', 'action-ripple'), 420);
      showStatusFeedback(`${def.emoji} ${label}!`);
      setTimeout(pollLiveStats, 600);
    });
    grid.appendChild(btn);
  });
}

/* =====================================================
   SUB-PETS
   ===================================================== */
function renderSubpetActions() {
  const grid = $('subpet-action-grid');
  const status = $('subpet-action-status');
  const active = S.subpets.active;
  grid.innerHTML = '';

  Object.entries(CLAWD_SUBPET_ACTIONS).forEach(([id, def]) => {
    const label = et('subact', id, def.label);
    const feedback = et('subact_fb', id, def.feedback);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'subpet-action-btn';
    btn.disabled = !active;
    btn.dataset.action = id;
    btn.title = active ? `${label}: ${feedback}` : t('subpet_inactive');
    btn.innerHTML = `<span aria-hidden="true">${def.emoji}</span><b>${label}</b>`;
    btn.addEventListener('click', () => {
      if (!S.subpets.active) return;
      const species = S.subpets.active;
      const petName = (S.subpets.names || {})[species] || et('subpet', species, CLAWD_SUBPETS[species]?.label) || 'Sub-pet';
      sendMsg({ action: 'triggerSubpetAction', value: id });
      status.textContent = `${def.emoji} ${petName}: ${feedback}`;
      btn.classList.add('playing');
      setTimeout(() => btn.classList.remove('playing'), 420);
    });
    grid.appendChild(btn);
  });

  if (!active) {
    status.textContent = t('subpet_inactive');
  } else {
    const petName = (S.subpets.names || {})[active] || et('subpet', active, CLAWD_SUBPETS[active]?.label) || 'Sub-pet';
    status.textContent = `${petName} ${t('subpet_ready')}`;
  }
}

function renderSubpets() {
  const grid = $('subpet-grid');
  grid.innerHTML = '';
  const level = clawdLevelFromXp(S.xp).level;
  favSort(Object.keys(CLAWD_SUBPETS), 'subpets').forEach(id => {
    const def = CLAWD_SUBPETS[id];
    const unlocked = (S.subpets.unlocked || []).includes(id) || level >= def.level;
    const active = S.subpets.active === id;
    const card = document.createElement('button');
    card.className = 'subpet-card'
      + (active ? ' active' : '')
      + (unlocked ? '' : ' locked')
      + (isFav('subpets', id) ? ' favorited' : '');
    card.dataset.species = id;
    const name = (S.subpets.names || {})[id];
    const sprite = CLAWD_SUBPET_SPRITES[id] || CLAWD_SUBPET_SPRITES.dog;
    const previewColor = (S.subpets.colors || {})[id] || sprite.colors.B;
    const previewEyes = (S.subpets.eyeColors || {})[id] || sprite.colors.K || '#111111';
    const hasCustom = /^#[\da-f]{6}$/i.test((S.subpets.colors || {})[id] || '')
      || /^#[\da-f]{6}$/i.test((S.subpets.eyeColors || {})[id] || '');
    const palette = clawdSubPetPalette(sprite, /^#[\da-f]{6}$/i.test(previewColor) ? previewColor : null, previewEyes);
    const preferPose = id === 'dragon' && sprite.frames.flying ? 'flying'
      : id === 'bird' && sprite.frames.flying ? 'flying'
      : 'idle';
    const preview = document.createElement('span');
    preview.className = 'subpet-pixel-preview';
    preview.dataset.species = id;
    preview.dataset.pose = preferPose;
    preview.dataset.frame = '0';
    preview.setAttribute('aria-hidden', 'true');
    const imgUrl = typeof clawdSubPetImageUrl === 'function' ? clawdSubPetImageUrl(id) : '';
    if (imgUrl && !hasCustom) {
      preview.classList.add('subpet-pixel-preview--bitmap');
      preview.style.backgroundImage = `url("${imgUrl}")`;
      preview.style.backgroundRepeat = 'no-repeat';
      preview.style.backgroundPosition = 'center';
      preview.style.backgroundSize = 'contain';
      preview.style.boxShadow = 'none';
    } else {
      const frame = clawdSubPetFrame(sprite, preferPose, 0);
      preview.style.boxShadow = clawdBuildPixelShadow(frame, palette, CLAWD_SUBPET_CELL);
    }
    const stage = document.createElement('div');
    stage.className = 'subpet-art-stage';
    stage.appendChild(preview);
    card.appendChild(stage);
    const nameEl = document.createElement('span');
    nameEl.className = 'subpet-name';
    nameEl.textContent = name || et('subpet', id, def.label);
    const descEl = document.createElement('span');
    descEl.className = 'subpet-desc';
    descEl.textContent = unlocked
      ? et('subpet_desc', id, def.special)
      : tf('level_lock_fmt', def.level);
    card.append(nameEl, descEl);
    if (unlocked) {
      card.appendChild(makeStar('subpets', id, renderSubpets));
      card.addEventListener('click', () => {
        // Clicar no ativo mantém (não desativa por acidente).
        if (active) return;
        const next = id;
        persist(st => {
          st.subpets.active = next;
          const need = CLAWD_SUBPETS[next]?.level || 1;
          const lv = clawdLevelFromXp(st.xp || 0).level;
          if (lv >= need && !st.subpets.unlocked.includes(next)) {
            st.subpets.unlocked.push(next);
          }
          if (!st.subpets.unlocked.includes(next)) st.subpets.active = null;
          else st.game.counters.subpetsUnlocked = st.subpets.unlocked.length;
        });
        S.subpets.active = next;
        sendMsg({ action: 'setSubpet', value: next });
        renderSubpets();
      });
    }
    grid.appendChild(card);
  });
  startSubpetPreviewAnims();
  const group = $('subpet-name-group');
  group.style.display = S.subpets.active ? '' : 'none';
  if (S.subpets.active) {
    $('input-subpet-name').value = (S.subpets.names || {})[S.subpets.active] || '';
    const defaultColor = CLAWD_COLORS[Object.keys(CLAWD_SUBPETS).indexOf(S.subpets.active) % CLAWD_COLORS.length] || '#8d5a2b';
    const color = (S.subpets.colors || {})[S.subpets.active] || defaultColor;
    const eyeColor = (S.subpets.eyeColors || {})[S.subpets.active] || '#111111';
    $('input-subpet-color').value = color;
    $('subpet-color-hex').textContent = color;
    $('input-subpet-eye-color').value = eyeColor;
    $('subpet-eye-color-hex').textContent = eyeColor;
  }
  renderSubpetActions();
}

function startSubpetPreviewAnims() {
  if (window.__clawdSubpetPreviewTimer) clearInterval(window.__clawdSubpetPreviewTimer);
  if (document.hidden) {
    window.__clawdSubpetPreviewTimer = null;
    return;
  }
  window.__clawdSubpetPreviewTimer = setInterval(() => {
    if (document.hidden) return;
    document.querySelectorAll('.subpet-pixel-preview[data-species]').forEach((preview) => {
      if (preview.classList.contains('subpet-pixel-preview--bitmap')) return;
      const id = preview.dataset.species;
      const sprite = CLAWD_SUBPET_SPRITES[id];
      if (!sprite) return;
      const card = preview.closest('.subpet-card');
      const hovering = card?.matches(':hover');
      const active = card?.classList.contains('active');
      let pose = preview.dataset.pose || 'idle';
      if (hovering || active) {
        if (sprite.frames.flying && (id === 'dragon' || id === 'bird')) pose = 'flying';
        else if (sprite.frames.walk) pose = 'walk';
        else if (sprite.frames.special) pose = 'special';
      } else {
        pose = (id === 'dragon' && sprite.frames.flying) ? 'flying' : 'idle';
      }
      const set = sprite.frames[pose] || sprite.frames.idle || [];
      if (!set.length) return;
      const next = (Number(preview.dataset.frame || 0) + 1) % set.length;
      preview.dataset.frame = String(next);
      preview.dataset.pose = pose;
      const color = (S.subpets.colors || {})[id] || sprite.colors.B;
      const eyes = (S.subpets.eyeColors || {})[id] || sprite.colors.K || '#111111';
      const palette = clawdSubPetPalette(sprite, /^#[\da-f]{6}$/i.test(color) ? color : null, eyes);
      preview.style.boxShadow = clawdBuildPixelShadow(set[next], palette, CLAWD_SUBPET_CELL);
    });
  }, 220);
}

if (!window.__clawdPreviewVisibilityBound) {
  window.__clawdPreviewVisibilityBound = true;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (window.__clawdSubpetPreviewTimer) {
        clearInterval(window.__clawdSubpetPreviewTimer);
        window.__clawdSubpetPreviewTimer = null;
      }
    } else if (document.querySelector('.subpet-pixel-preview[data-species]')) {
      startSubpetPreviewAnims();
    }
  });
}

/* =====================================================
   LOJA
   ===================================================== */
function renderShop() {
  const grid = $('shop-grid');
  grid.innerHTML = '';
  Object.entries(CLAWD_SHOP).forEach(([id, def]) => {
    const owned = (S.game.inventory || []).includes(id);
    const equipped = (def.kind === 'ball' && S.ballSkin === id);
    const card = document.createElement('div');
    card.className = 'shop-card' + (owned ? ' owned' : '');
    card.innerHTML = `
      <span class="shop-emoji">${def.emoji}</span>
      <span class="shop-name">${et('shop', id, def.label)}</span>
      <span class="shop-price">${owned ? t('shop_owned') : `🪙 ${def.price}`}</span>`;
    const btn = document.createElement('button');
    btn.className = 'shop-btn';
    if (!owned) {
      const afford = (S.game.coins || 0) >= def.price;
      btn.textContent = t('shop_buy');
      btn.disabled = !afford;
      if (!afford) btn.title = t('shop_cant_afford');
      btn.addEventListener('click', () => {
        persist(st => {
          if ((st.game.coins || 0) < def.price) return;
          st.game.coins -= def.price;
          if (!st.game.inventory.includes(id)) {
            st.game.inventory.push(id);
            /* v3.3: track compras para conquista shopaholic */
            st.game.counters.shopPurchases = (st.game.counters.shopPurchases || 0) + 1;
          }
        });
        setTimeout(() => { renderShop(); renderHeader(); renderAccessories(); }, 120);
      });
    } else if (def.kind === 'accessory') {
      btn.textContent = t('shop_equip');
      btn.addEventListener('click', () => {
        const accSlot = CLAWD_ACCESSORIES[id]?.slot;
        const configKey = accSlot === 'head' ? 'accessoryHead' : accSlot === 'body' ? 'accessoryBody' : 'accessoryFace';
        setConfig(configKey, id);
        renderAccessories();
      });
    } else if (def.kind === 'ball') {
      btn.textContent = equipped ? t('shop_equipped') : t('shop_equip');
      btn.disabled = equipped;
      btn.addEventListener('click', () => { setConfig('ballSkin', id); renderShop(); });
    } else if (def.kind === 'decor') {
      btn.textContent = t('shop_decor_active');
      btn.disabled = true;
      btn.title = id === 'cushion' ? t('shop_cushion_hint') : t('shop_decor_active');
    } else {
      btn.textContent = t('shop_decor_active');
      btn.disabled = true;
    }
    card.appendChild(btn);
    grid.appendChild(card);
  });
}

/* =====================================================
   CONQUISTAS
   ===================================================== */
function renderAchievements() {
  const list = $('ach-list');
  list.innerHTML = '';
  let unlockedCount = 0;
  Object.entries(CLAWD_ACHIEVEMENTS).forEach(([id, def]) => {
    const unlocked = !!S.game.achievements[id];
    if (unlocked) unlockedCount++;
    const raw = S.game.counters[def.counter];
    const cur = Array.isArray(raw) ? raw.length : (raw || 0);
    const pct = unlocked ? 100 : Math.min(100, Math.round((cur / def.goal) * 100));
    const row = document.createElement('div');
    row.className = 'ach-row' + (unlocked ? ' unlocked' : '');
    row.innerHTML = `
      <span class="ach-emoji">${def.emoji}</span>
      <div class="ach-info">
        <span class="ach-name">${et('ach', id, def.label)}</span>
        <span class="ach-desc">${et('ach_desc', id, def.desc)}</span>
        <div class="ach-bar"><div class="ach-fill" style="width:${pct}%"></div></div>
      </div>
      <span class="ach-state">${unlocked ? '🏆' : `${Math.min(cur, def.goal)}/${def.goal}`}</span>`;
    list.appendChild(row);
  });
  $('ach-summary').textContent = tf('ach_unlocked_fmt', unlockedCount, Object.keys(CLAWD_ACHIEVEMENTS).length);
  const st = S.game.streak || { days: 0 };
  const days = Math.max(0, Math.min(9999, Number(st.days) || 0));
  const streakBox = $('streak-box');
  streakBox.replaceChildren();
  streakBox.append(t('streak_box_prefix') + ' ');
  const streakB = document.createElement('b');
  streakB.textContent = days === 1 ? t('streak_days_one') : tf('streak_days_many', days);
  streakBox.appendChild(streakB);
  streakBox.append(t('streak_box_hint'));
  renderDailyQuest(S.daily);
  renderWeeklyChallenge(clawdEnsureWeeklyChallenge(S));
}

/* =====================================================
   CONFIG
   ===================================================== */
function renderConfig() {
  const set = S.settings;
  $('toggle-crosstab').checked = !!set.crossTab;
  $('select-travel').value = set.travelFreq || 'sometimes';
  $('toggle-footprints').checked = !!set.footprints;
  $('toggle-sounds').checked = !!set.sounds;
  $('range-volume').value = set.soundVolume ?? 0.4;
  $('volume-badge').textContent = `${Math.round((set.soundVolume ?? 0.4) * 100)}%`;
  /* v3.3: volumes por categoria */
  const raEl = $('range-volume-actions');
  if (raEl) {
    raEl.value = set.soundVolumeActions ?? 1.0;
    $('volume-actions-badge').textContent = `${Math.round((set.soundVolumeActions ?? 1.0) * 100)}%`;
  }
  const rbEl = $('range-volume-ambient');
  if (rbEl) {
    rbEl.value = set.soundVolumeAmbient ?? 0.6;
    $('volume-ambient-badge').textContent = `${Math.round((set.soundVolumeAmbient ?? 0.6) * 100)}%`;
  }
  /* v3.3: cor de partículas */
  const pcEl = $('input-particle-color');
  if (pcEl && S.particleColor) pcEl.value = S.particleColor;
  const pcHex = $('particle-color-hex');
  if (pcHex) pcHex.textContent = S.particleColor || t('particle_default');
  /* v3.3: frases customizadas */
  const csEl = $('custom-speech');
  if (csEl) csEl.value = (S.customSpeech || []).join('\n');
  $('quiet-start').value = set.quietStart || '';
  $('quiet-end').value = set.quietEnd || '';
  $('blocked-sites').value = (set.blockedSites || []).join('\n');
  $('select-corner').value = set.startCorner || 'br';
  const toastEl = $('select-toast-pos');
  if (toastEl) toastEl.value = set.toastPosition || 'center';
  const speechEl = $('select-speech-pos');
  if (speechEl) speechEl.value = set.speechAnchor || 'auto';
  const emotionEl = $('select-emotion-side');
  if (emotionEl) emotionEl.value = set.emotionBadgeSide || 'left';
  const localeEl = $('select-locale');
  if (localeEl) {
    if (!localeEl.options.length) applyPopupI18n();
    localeEl.value = set.locale || 'pt-BR';
  }
  const boardUrlEl = $('trello-board-url');
  if (boardUrlEl) boardUrlEl.value = set.trelloBoardUrl || '';
  const boardIdEl = $('trello-board-id');
  if (boardIdEl && !boardIdEl.dataset.loadedSecrets) {
    /* board id pode vir de settings; secrets sobrescrevem abaixo */
    boardIdEl.value = set.trelloBoardId || '';
  }
  $('toggle-performance').checked = !!set.performanceMode;
  const minimalEl = $('toggle-minimal');
  if (minimalEl) minimalEl.checked = !!set.minimalMode;
  $('toggle-no-particles').checked = !!set.noParticles;
  $('toggle-no-idle').checked = !!set.noIdleVariations;
  $('toggle-no-weather').checked = !!set.noWeather;
  const ambientEl = $('toggle-no-ambient-sparks');
  if (ambientEl) ambientEl.checked = !!set.noAmbientSparks;
  document.querySelectorAll('#tag-theme-grid .mini-card').forEach(c => {
    c.classList.toggle('active', c.dataset.theme === (S.tagTheme || 'light'));
  });
}

/** Chirp 8-bit no popup ao ajustar volume (feedback imediato do nível). */
let _popupAudioCtx = null;
let _volPreviewTimer = null;
function _popupAudioUserActive() {
  try { return !navigator.userActivation || !!navigator.userActivation.isActive; }
  catch (_) { return true; }
}
/** Cria/resume o AudioContext só durante gesto (input/click) — evita warning de autoplay. */
function unlockPopupAudio() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx || !_popupAudioUserActive()) return;
    if (!_popupAudioCtx || _popupAudioCtx.state === 'closed') _popupAudioCtx = new Ctx();
    if (_popupAudioCtx.state === 'suspended') _popupAudioCtx.resume().catch(() => {});
  } catch (_) { /* ignore */ }
}
function previewVolumeChirp(vol, channel = 'master') {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    if (!_popupAudioCtx || _popupAudioCtx.state === 'closed') {
      if (!_popupAudioUserActive()) return;
      _popupAudioCtx = new Ctx();
    }
    const ctx = _popupAudioCtx;
    if (ctx.state === 'suspended') {
      if (!_popupAudioUserActive()) return;
      ctx.resume().catch(() => {});
    }
    if (ctx.state !== 'running') return;
    const masterRaw = parseFloat($('range-volume')?.value);
    const master = Number.isFinite(masterRaw) ? Math.max(0, Math.min(1, masterRaw)) : 0.4;
    if (master <= 0) return;
    const chRaw = Number(vol);
    const ch = Number.isFinite(chRaw) ? Math.max(0, Math.min(1, chRaw)) : (channel === 'ambient' ? 0.6 : 1);
    if (channel !== 'master' && ch <= 0) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = channel === 'ambient' ? 'sine' : 'triangle';
    const base = channel === 'ambient' ? 420 : (channel === 'actions' ? 700 : 620);
    const span = channel === 'ambient' ? 160 : 280;
    const mix = channel === 'master' ? master : ch;
    osc.frequency.value = base + Math.round(mix * span);
    const level = Math.max(0.0001, master * (channel === 'master' ? 1 : ch) * 0.13);
    gain.gain.setValueAtTime(level, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.09);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.11);
  } catch (_) { /* autoplay / AudioContext policy */ }
}

function bindTrelloControls() {
  const saveSecrets = () => {
    const apiKey = clawdSanitizePlainText($('trello-api-key')?.value || '', 64);
    const token = clawdSanitizePlainText($('trello-token')?.value || '', 128);
    const boardId = clawdSanitizePlainText($('trello-board-id')?.value || '', 64);
    chrome.storage.local.set({ clawdTrello: { apiKey, token, boardId } }, () => scrubLastError());
    if (boardId) setSetting('trelloBoardId', boardId);
  };
  ['trello-api-key', 'trello-token', 'trello-board-id'].forEach((id) => {
    const el = $(id);
    if (el) el.addEventListener('change', saveSecrets);
  });
  const urlEl = $('trello-board-url');
  if (urlEl) {
    urlEl.addEventListener('change', () => {
      const v = urlEl.value.trim();
      setSetting('trelloBoardUrl', v);
    });
  }
  const status = (msg, isErr) => {
    const el = $('trello-status');
    if (!el) return;
    el.textContent = msg;
    el.style.color = isErr ? '#e74c3c' : '#27ae60';
  };
  const submitCard = (kind) => {
    const promptLabel = kind === 'bug' ? t('trello_bug') : t('trello_idea');
    const name = window.prompt(`${promptLabel} ${t('trello_prompt_title')}`, '');
    if (!name || !name.trim()) return;
    const desc = window.prompt(t('trello_prompt_desc'), '') || '';
    status('…');
    sendRuntimeMsg({
      action: 'createTrelloCard',
      kind,
      name: name.trim(),
      desc: desc.trim()
    }, (res) => {
      if (res?.ok) status(t('trello_ok'));
      else if (res?.error === 'missing_credentials') status(t('trello_need'), true);
      else status(t('trello_fail'), true);
    });
  };
  const ideaBtn = $('btn-trello-idea');
  if (ideaBtn) ideaBtn.addEventListener('click', () => submitCard('idea'));
  const bugBtn = $('btn-trello-bug');
  if (bugBtn) bugBtn.addEventListener('click', () => submitCard('bug'));
  const openBtn = $('btn-trello-open');
  if (openBtn) {
    openBtn.addEventListener('click', () => {
      const fromSettings = (S.settings?.trelloBoardUrl || '').trim();
      const url = fromSettings
        || (typeof CLAWD_TRELLO_BOARD_URL === 'string' ? CLAWD_TRELLO_BOARD_URL : '')
        || 'https://trello.com/b/8wGr5tiQ/pet';
      if (/YOUR_BOARD/i.test(url)) {
        status(t('trello_need'), true);
        return;
      }
      chrome.tabs.create({ url });
    });
  }
  chrome.storage.local.get(['clawdTrello'], (res) => {
    scrubLastError();
    const sec = res.clawdTrello || {};
    const keyEl = $('trello-api-key');
    const tokEl = $('trello-token');
    const idEl = $('trello-board-id');
    if (keyEl && sec.apiKey) keyEl.value = sec.apiKey;
    if (tokEl && sec.token) tokEl.value = sec.token;
    if (idEl) {
      idEl.value = sec.boardId || S.settings?.trelloBoardId || '';
      idEl.dataset.loadedSecrets = '1';
    }
  });
}

function bindConfig() {
  $('toggle-crosstab').addEventListener('change', e => setSetting('crossTab', e.target.checked));
  $('select-travel').addEventListener('change', e => setSetting('travelFreq', e.target.value));
  $('toggle-footprints').addEventListener('change', e => setSetting('footprints', e.target.checked));

  /* Sliders de personalidade */
  const PERSONALITY_PRESETS = {
    energetic: { playful: 9, lazy: 1, curious: 7, social: 8, foodie: 6 },
    relaxed:   { playful: 3, lazy: 8, curious: 4, social: 4, foodie: 5 },
    curious:   { playful: 6, lazy: 2, curious: 10, social: 5, foodie: 3 }
  };
  ['playful', 'lazy', 'curious', 'social', 'foodie'].forEach(trait => {
    const el = $(`personality-${trait}`);
    if (!el) return;
    el.addEventListener('input', () => {
      const v = parseInt(el.value, 10);
      const valEl = $(`val-${trait}`);
      if (valEl) valEl.textContent = v;
      if (!S.personality) S.personality = { playful: 5, lazy: 3, curious: 7, social: 5, foodie: 4 };
      S.personality[trait] = v;
      persist(st => { if (!st.personality) st.personality = {}; st.personality[trait] = v; });
      sendMsg({ action: 'updateConfig', key: 'personality', value: S.personality });
    });
  });
  document.querySelectorAll('.btn-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      const preset = PERSONALITY_PRESETS[btn.dataset.preset];
      if (!preset) return;
      S.personality = { ...S.personality, ...preset };
      persist(st => { st.personality = { ...(st.personality || {}), ...preset }; });
      sendMsg({ action: 'updateConfig', key: 'personality', value: S.personality });
      renderPersonality();
    });
  });
  $('toggle-sounds').addEventListener('change', e => {
    setSetting('sounds', e.target.checked);
    if (e.target.checked) {
      unlockPopupAudio();
      previewVolumeChirp(parseFloat($('range-volume').value) || 0.4);
    }
  });
  $('range-volume').addEventListener('input', e => {
    const v = parseFloat(e.target.value);
    $('volume-badge').textContent = `${Math.round(v * 100)}%`;
    setSetting('soundVolume', v);
    if (!$('toggle-sounds').checked) return;
    unlockPopupAudio(); /* gesto sync — create/resume sem warning */
    clearTimeout(_volPreviewTimer);
    _volPreviewTimer = setTimeout(() => previewVolumeChirp(v), 50);
  });
  /* v3.3: volumes por categoria */
  const raEl = $('range-volume-actions');
  if (raEl) raEl.addEventListener('input', e => {
    const v = parseFloat(e.target.value);
    $('volume-actions-badge').textContent = `${Math.round(v * 100)}%`;
    setSetting('soundVolumeActions', v);
    if (!$('toggle-sounds').checked) return;
    unlockPopupAudio();
    clearTimeout(_volPreviewTimer);
    _volPreviewTimer = setTimeout(() => previewVolumeChirp(v, 'actions'), 50);
  });
  const rbEl = $('range-volume-ambient');
  if (rbEl) rbEl.addEventListener('input', e => {
    const v = parseFloat(e.target.value);
    $('volume-ambient-badge').textContent = `${Math.round(v * 100)}%`;
    setSetting('soundVolumeAmbient', v);
    if (!$('toggle-sounds').checked) return;
    unlockPopupAudio();
    clearTimeout(_volPreviewTimer);
    _volPreviewTimer = setTimeout(() => previewVolumeChirp(v, 'ambient'), 50);
  });
  /* v3.3: cor de partículas */
  const pcEl = $('input-particle-color');
  if (pcEl) {
    pcEl.addEventListener('input', e => {
      const hex = e.target.value;
      const hexEl = $('particle-color-hex');
      if (hexEl) hexEl.textContent = hex;
      setConfig('particleColor', hex);
    });
  }
  const pcClearEl = $('particle-color-clear');
  if (pcClearEl) pcClearEl.addEventListener('click', () => {
    const pcEl2 = $('input-particle-color');
    if (pcEl2) pcEl2.value = '#f1c40f';
    const hexEl = $('particle-color-hex');
    if (hexEl) hexEl.textContent = t('particle_default');
    setConfig('particleColor', 'default');
  });
  /* v3.3: frases customizadas */
  const csEl = $('custom-speech');
  if (csEl) csEl.addEventListener('change', e => {
    const lines = e.target.value.split('\n').map(s => clawdSanitizePlainText(s.trim(), 100)).filter(Boolean).slice(0, 20);
    persist(st => { st.customSpeech = lines; });
    S.customSpeech = lines;
  });
  $('quiet-start').addEventListener('change', e => setSetting('quietStart', e.target.value));
  $('quiet-end').addEventListener('change', e => setSetting('quietEnd', e.target.value));
  $('quiet-clear').addEventListener('click', () => {
    $('quiet-start').value = ''; $('quiet-end').value = '';
    setSetting('quietStart', ''); setSetting('quietEnd', '');
  });
  $('blocked-sites').addEventListener('change', e => {
    const sites = e.target.value.split('\n').map(s => s.trim()).filter(Boolean);
    setSetting('blockedSites', sites);
  });
  $('select-corner').addEventListener('change', e => setSetting('startCorner', e.target.value));
  const toastPos = $('select-toast-pos');
  if (toastPos) toastPos.addEventListener('change', e => setSetting('toastPosition', e.target.value));
  const speechPos = $('select-speech-pos');
  if (speechPos) speechPos.addEventListener('change', e => setSetting('speechAnchor', e.target.value));
  const emotionSide = $('select-emotion-side');
  if (emotionSide) emotionSide.addEventListener('change', e => setSetting('emotionBadgeSide', e.target.value));
  const localeSel = $('select-locale');
  if (localeSel) {
    localeSel.addEventListener('change', e => {
      applyLocaleChoice(e.target.value);
    });
  }
  bindTrelloControls();
  $('toggle-performance').addEventListener('change', e => {
    setSetting('performanceMode', e.target.checked);
  });
  const minimalToggle = $('toggle-minimal');
  if (minimalToggle) minimalToggle.addEventListener('change', e => {
    setSetting('minimalMode', e.target.checked);
  });
  $('toggle-no-particles').addEventListener('change', e => {
    setSetting('noParticles', e.target.checked);
  });
  $('toggle-no-idle').addEventListener('change', e => {
    setSetting('noIdleVariations', e.target.checked);
  });
  $('toggle-no-weather').addEventListener('change', e => {
    setSetting('noWeather', e.target.checked);
  });
  const ambientToggle = $('toggle-no-ambient-sparks');
  if (ambientToggle) ambientToggle.addEventListener('change', e => {
    setSetting('noAmbientSparks', e.target.checked);
  });
  document.querySelectorAll('#tag-theme-grid .mini-card').forEach(c => {
    c.addEventListener('click', () => { setConfig('tagTheme', c.dataset.theme); renderConfig(); });
  });

  // Export / Import / Reset
  $('btn-export').addEventListener('click', () => {
    chrome.storage.local.get(['clawdState'], (res) => {
      scrubLastError();
      const blob = new Blob([JSON.stringify(res.clawdState || S, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `clawd-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  });
  $('btn-import').addEventListener('click', () => $('import-file').click());
  $('import-file').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          alert(t('import_invalid'));
          return;
        }
        const data = clawdMigrateState(parsed);
        chrome.storage.local.set({ clawdState: data }, () => {
          scrubLastError();
          S = data;
          renderAll();
          alert(t('import_ok'));
        });
      } catch (_) {
        alert(t('import_invalid'));
      }
    };
    reader.readAsText(file);
  });
  $('btn-reset-all').addEventListener('click', () => {
    if (!confirm(t('reset_confirm_1'))) return;
    if (!confirm(t('reset_confirm_2'))) return;
    const fresh = clawdDefaultState();
    chrome.storage.local.set({ clawdState: fresh }, () => {
      scrubLastError();
      S = fresh;
      renderAll();
      alert(t('reset_done'));
    });
  });
}

/* =====================================================
   BINDINGS ESTÁTICOS
   ===================================================== */
function bindStatic() {
  // Tabs + lembrar última aba
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      activatePopupTab(tab.dataset.tab);
      setSetting('lastPopupTab', tab.dataset.tab);
    });
  });

  // Nome + histórico + favorito (debounce evita race storage ↔ content)
  let _nameInputTimer = null;
  $('input-name').addEventListener('input', (e) => {
    const val = e.target.value || "Claw'd";
    syncPopupNameTag(val);
    updateNameStar();
    clearTimeout(_nameInputTimer);
    _nameInputTimer = setTimeout(() => {
      setConfig('name', val);
      persist(st => {
        if (val && !st.nicknameHistory.includes(val)) {
          st.nicknameHistory.push(val);
          if (st.nicknameHistory.length > 12) st.nicknameHistory.shift();
        }
      });
    }, 220);
  });
  $('input-name').addEventListener('change', (e) => {
    const val = e.target.value || "Claw'd";
    clearTimeout(_nameInputTimer);
    setConfig('name', val);
    syncPopupNameTag(val);
  });
  $('name-star').addEventListener('click', () => {
    const cur = $('input-name').value.trim();
    if (!cur) return;
    toggleFavorite('nicknames', cur);
    setTimeout(() => { updateNameStar(); renderFavNicks(); }, 150);
  });

  // Cor customizada + favorito
  $('input-color').addEventListener('input', (e) => {
    document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
    applyHeaderColor(e.target.value);
    setConfig('color', e.target.value);
    updateColorStar();
  });
  $('input-eye-color').addEventListener('input', (e) => {
    const color = e.target.value;
    $('eye-color-hex').textContent = color;
    setConfig('eyeColor', color);
    updatePreviewPalette();
  });
  $('color-star').addEventListener('click', () => {
    toggleFavorite('colors', $('input-color').value);
    setTimeout(renderColors, 150);
  });

  // Sliders
  $('range-scale').addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    $('scale-badge').textContent = `${val.toFixed(1)}×`;
    setConfig('scale', val);
  });
  $('range-speed').addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    $('speed-badge').textContent = `${val.toFixed(2)}×`;
    setConfig('animSpeed', val);
  });

  // Estilo visual
  $('toggle-smooth').addEventListener('change', e => {
    setConfig('smooth', e.target.checked);
  });
  $('toggle-outline').addEventListener('change', e => setConfig('outline', e.target.checked));
  $('toggle-mouth').addEventListener('change', e => setConfig('showMouth', e.target.checked));

  // Comportamento
  $('toggle-speech').addEventListener('change', e => setConfig('showSpeech', e.target.checked));
  $('toggle-walk').addEventListener('change', e => setConfig('autoWalk', e.target.checked));
  $('toggle-sleep').addEventListener('change', e => setConfig('sleepEnabled', e.target.checked));

  // Sub-pet nome
  $('input-subpet-name').addEventListener('input', (e) => {
    const active = S.subpets.active;
    if (!active) return;
    persist(st => { st.subpets.names[active] = e.target.value; });
  });
  $('input-subpet-color').addEventListener('input', (e) => {
    const species = S.subpets.active;
    if (!species) return;
    const color = e.target.value;
    $('subpet-color-hex').textContent = color;
    S.subpets.colors = S.subpets.colors || {};
    S.subpets.colors[species] = color;
    sendMsg({ action: 'setSubpetColor', species, value: color });
    persist(st => {
      st.subpets.colors = st.subpets.colors || {};
      st.subpets.colors[species] = color;
    });
  });
  $('input-subpet-eye-color').addEventListener('input', (e) => {
    const species = S.subpets.active;
    if (!species) return;
    const color = e.target.value;
    $('subpet-eye-color-hex').textContent = color;
    S.subpets.eyeColors = S.subpets.eyeColors || {};
    S.subpets.eyeColors[species] = color;
    sendMsg({ action: 'setSubpetEyeColor', species, value: color });
    persist(st => {
      st.subpets.eyeColors = st.subpets.eyeColors || {};
      st.subpets.eyeColors[species] = color;
    });
  });

  // Status interativos: felicidade / comida / energia / higiene
  const STAT_FEEDBACK = {
    happy: t('status_stat_happy'),
    feed: t('status_stat_feed'),
    play: t('status_stat_play'),
    bath: t('status_stat_bath')
  };
  document.querySelectorAll('.stat-action').forEach(btn => {
    const run = () => {
      const action = btn.dataset.statAction;
      if (!action) return;
      pulseStatButton(btn);
      sendMsg({ action: 'triggerAction', value: action });
      showStatusFeedback(STAT_FEEDBACK[action] || t('status_action_sent'));
      /* otimista: sobe o medidor local até o content sincronizar */
      const key = btn.dataset.statKey;
      const bump = Number(String(btn.dataset.statDelta || '+10').replace('+', '')) || 10;
      if (key && S.stats) {
        S.stats[key] = Math.min(100, (S.stats[key] || 0) + bump * 0.35);
        renderStats(S.stats);
      }
    };
    btn.addEventListener('click', run);
  });

  // Ações rápidas no header
  const QUICK_FEEDBACK = {
    wave: t('status_quick_wave'), dance: t('status_quick_dance'), pose: t('status_quick_pose'),
    sleep: t('status_quick_sleep'), balloon: t('status_quick_balloon'), cheer: t('status_quick_cheer')
  };
  document.querySelectorAll('.btn-quick').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.quickAction;
      if (!action) return;
      btn.classList.remove('quick-pulse');
      void btn.offsetWidth;
      btn.classList.add('quick-pulse');
      sendMsg({ action: 'triggerAction', value: action });
      showStatusFeedback(QUICK_FEEDBACK[action] || t('status_action_sent'));
      setTimeout(() => btn.classList.remove('quick-pulse'), 400);
    });
  });

  // Studio na página + janela destacável
  const openStudioBtns = ['btn-open-studio', 'btn-open-studio-actions']
    .map(id => $(id))
    .filter(Boolean);
  openStudioBtns.forEach(btn => btn.addEventListener('click', openStudioOnPage));
  const detachBtn = $('btn-detach-window');
  if (detachBtn) {
    if (new URLSearchParams(location.search).has('detached')) {
      detachBtn.style.display = 'none';
      document.body.classList.add('popup-detached');
    } else {
      detachBtn.addEventListener('click', detachPopupWindow);
    }
  }

  // Sistema
  $('btn-toggle').addEventListener('click', () => {
    const next = S.petVisible === false;
    sendMsg({ action: 'toggleVisibility' });
    S.petVisible = next;
    persist(st => { st.petVisible = next; });
    syncVisibilityButton(next);
    showStatusFeedback(next ? t('status_pet_shown') : t('status_pet_hidden'));
  });
  const summonBtn = $('btn-summon-tab');
  if (summonBtn) summonBtn.addEventListener('click', summonPetToCurrentTab);
  $('btn-reset').addEventListener('click', () => {
    sendMsg({ action: 'resetPosition' });
    showStatusFeedback(t('status_rescued'));
  });

  bindConfig();
}

/* =====================================================
   RENDER GERAL + BOOT
   ===================================================== */
function renderPersonality() {
  const p = S.personality || { playful: 5, lazy: 3, curious: 7, social: 5, foodie: 4 };
  ['playful', 'lazy', 'curious', 'social', 'foodie'].forEach(trait => {
    const el = $(`personality-${trait}`);
    const valEl = $(`val-${trait}`);
    if (el) el.value = p[trait] ?? 5;
    if (valEl) valEl.textContent = p[trait] ?? 5;
  });
}

function updateStreakPill(days) {
  const pill = $('streak-pill');
  if (!pill) return;
  const count = $('streak-count');
  if (days >= 2) {
    pill.style.display = '';
    if (count) count.textContent = days;
    pill.title = `${days} dia${days !== 1 ? 's' : ''} seguidos — ${days >= 7 ? '+50% XP!' : '+20% XP!'}`;
  } else {
    pill.style.display = 'none';
  }
}

function renderAll() {
  if (typeof clawdDefaultState !== 'function' || typeof CLAWD_ACTIONS !== 'object' || !CLAWD_ACTIONS) {
    throw new Error('Catálogo não carregou (i18n/catalog). Recarregue a extensão em chrome://extensions.');
  }
  applyPopupI18n();
  renderHeader();
  renderNameArea();
  renderPersonality();
  renderColors();
  renderModels();
  renderFaceStyles();
  renderSkins();
  renderAccessories();
  renderProfessions();
  renderActions();
  renderSubpets();
  renderShop();
  renderAchievements();
  renderConfig();
  syncVisibilityButton(S.petVisible !== false);

  $('input-color').value = S.color || '#c71515';
  $('input-eye-color').value = S.eyeColor || '#08080b';
  $('eye-color-hex').textContent = S.eyeColor || '#08080b';
  $('range-scale').value = S.scale ?? 1.5;
  $('scale-badge').textContent = `${parseFloat(S.scale ?? 1.5).toFixed(1)}×`;
  $('range-speed').value = S.animSpeed ?? 1;
  $('speed-badge').textContent = `${parseFloat(S.animSpeed ?? 1).toFixed(2)}×`;
  $('toggle-speech').checked = !!S.showSpeech;
  $('toggle-walk').checked = !!S.autoWalk;
  $('toggle-sleep').checked = !!S.sleepEnabled;
  $('toggle-smooth').checked = !!S.smooth;
  $('toggle-outline').checked = !!S.outline;
  $('toggle-mouth').checked = S.showMouth !== false;
}

function showOnboarding() {
  const overlay = $('clawd-onboarding');
  if (!overlay) return;

  // Primeira abertura: sugere o idioma do navegador se ainda for o default.
  const stored = S.settings?.locale;
  if (!stored || stored === 'pt-BR') {
    const guessed = guessBrowserLocale();
    if (guessed && guessed !== stored) {
      S.settings = S.settings || {};
      S.settings.locale = guessed;
    }
  }

  fillLocaleSelect($('onboarding-locale'));
  fillLocaleSelect($('select-locale'));

  const cornerSel = $('onboarding-corner');
  const configCorner = $('select-corner');
  const startCorner = S.settings?.startCorner || 'br';
  if (cornerSel) cornerSel.value = startCorner;
  if (configCorner) configCorner.value = startCorner;

  applyPopupI18n();
  overlay.style.display = 'flex';

  const onboardLocale = $('onboarding-locale');
  if (onboardLocale && !onboardLocale.dataset.bound) {
    onboardLocale.dataset.bound = '1';
    onboardLocale.addEventListener('change', (e) => {
      applyLocaleChoice(e.target.value);
    });
  }
  if (cornerSel && !cornerSel.dataset.bound) {
    cornerSel.dataset.bound = '1';
    cornerSel.addEventListener('change', (e) => {
      const corner = e.target.value;
      setSetting('startCorner', corner);
      if (configCorner) configCorner.value = corner;
    });
  }

  const btn = $('onboarding-start');
  if (btn) {
    btn.addEventListener('click', () => {
      const loc = onboardLocale?.value || currentLocale();
      const corner = cornerSel?.value || S.settings?.startCorner || 'br';
      applyLocaleChoice(loc);
      setSetting('startCorner', corner);
      if (configCorner) configCorner.value = corner;
      overlay.style.display = 'none';
      persist(st => {
        st.onboardingDone = true;
        st.settings = st.settings || {};
        st.settings.locale = currentLocale();
        st.settings.startCorner = corner;
      });
      S.onboardingDone = true;
    }, { once: true });
  }
}

function updateContextBar(status) {
  const bar = $('clawd-context-bar');
  if (!bar) return;
  const prof = status?.profession || S.profession || 'idle';
  const ctx  = status?.pageContext || 'idle';
  const profData = CLAWD_PROFESSIONS[prof] || CLAWD_PROFESSIONS.idle;
  const emoji = profData?.emoji || '💼';
  const label = et('prof', prof, profData?.label || 'Livre');
  $('context-bar-profession').textContent = `${emoji} ${label}`;
  $('context-bar-page').textContent = ctx;
  bar.style.display = 'flex';
}

chrome.storage.local.get(['clawdState'], (res) => {
  window.__clawdPopupBootPhase = 'storage-cb';
  try {
    scrubLastError();
    window.__clawdPopupBootPhase = 'migrate';
    S = clawdMigrateState(res.clawdState);
    window.__clawdPopupBootPhase = 'bindStatic';
    bindStatic();
    window.__clawdPopupBootPhase = 'renderAll';
    renderAll();
    window.__clawdPopupBootPhase = 'activateTab';
    activatePopupTab(S.settings?.lastPopupTab || 'appearance');
    if (!S.onboardingDone) {
      window.__clawdPopupBootPhase = 'onboarding';
      showOnboarding();
    }
    updateContextBar(null);
    pollLiveStats();
    setInterval(pollLiveStats, 4000);
    window.__clawdPopupBootPhase = 'done';
    window.__clawdPopupBootError = null;
  } catch (err) {
    const msg = `${window.__clawdPopupBootPhase || '?'}: ` + (err && (err.stack || err.message || String(err)));
    window.__clawdPopupBootError = msg;
    console.error('[Clawd popup boot]', window.__clawdPopupBootPhase, err);
    try {
      const pill = $('status-pill');
      const text = $('status-text');
      if (pill && text) {
        pill.style.display = '';
        pill.classList.add('error');
        text.textContent = 'Erro ao abrir o menu — veja o console do popup.';
      }
    } catch (_) { /* ignore */ }
  }
});
