/* ===================================================
   CLAW'D v3 — POPUP
   Requer: ../shared/catalog.js
   =================================================== */

let S = clawdDefaultState();

function $(id) { return document.getElementById(id); }

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
      $('status-text').textContent = 'Abra em um site real para aplicar ao vivo!';
      setTimeout(() => { pill.style.display = 'none'; }, 3000);
    });
  });
}

/* Persistência segura: read-modify-write */
function persist(mutator) {
  chrome.storage.local.get(['clawdState'], (res) => {
    scrubLastError();
    const fresh = clawdMigrateState(res.clawdState);
    // preserva progresso que o content atualiza em paralelo
    fresh.xp = Math.max(fresh.xp, S.xp);
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
  btn.title = 'Favoritar';
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
  preview.setAttribute('aria-label', `${CLAWD_MODELS[S.model]?.label || 'Clássico'}, ${CLAWD_FACE_STYLES[S.faceStyle]?.label || 'Clássico'}`);
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
  showStatusFeedback('Studio aberto na página — arraste o cabeçalho para mover');
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
    .map(id => CLAWD_ACCESSORIES[id]?.label)
    .filter(Boolean);
  const equipped = [head?.label, face?.label, body?.label].filter(Boolean);

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
  $('outfit-preview-title').textContent = equipped.length ? equipped.join(' + ') : 'Visual sem acessórios';
  $('outfit-preview-detail').textContent = automatic.length
    ? `${automatic.join(' + ')} temporário da profissão; sua escolha pessoal está salva.`
    : `${CLAWD_MODELS[S.model]?.label || 'Clássico'} · ${CLAWD_FACE_STYLES[S.faceStyle]?.label || 'Clássico'} · ${S.smooth ? 'liso sem grade' : 'pixel-art'} · três slots combináveis`;
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
  title.textContent = '🎯 Missão diária';
  const progressEl = document.createElement('b');
  progressEl.textContent = `${progress}/${daily.target} · ${pct}%`;
  top.appendChild(title);
  top.appendChild(progressEl);

  const label = document.createElement('div');
  label.className = 'daily-label';
  label.textContent = String(daily.label || '');

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
    ? '✅ Resgatada'
    : done
      ? `Resgatar +${daily.rewardCoins} 🪙`
      : `+${daily.rewardXp} XP ao concluir`;

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
  title.textContent = `${weekly.badge || '🏆'} Desafio semanal`;
  const progressEl = document.createElement('b');
  progressEl.textContent = `${progress}/${weekly.target} · ${pct}%`;
  top.appendChild(title);
  top.appendChild(progressEl);

  const label = document.createElement('div');
  label.className = 'daily-label';
  label.textContent = String(weekly.label || '');

  const desc = document.createElement('div');
  desc.className = 'daily-label';
  desc.style.cssText = 'font-size:10px;opacity:0.7;';
  desc.textContent = String(weekly.desc || '');

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
    ? '✅ Resgatado'
    : done
      ? `Resgatar +${weekly.rewardCoins} 🪙`
      : `+${weekly.rewardXp} XP ao concluir`;

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
    chip.title = 'Clique para usar';
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
      const chip = document.createElement('button');
      chip.className = 'preset-chip' + (S.color === preset.color ? ' active' : '');
      chip.textContent = preset.label;
      chip.title = `${preset.label}: ${preset.color}`;
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
    label.innerHTML = `<b>${def.badge}</b>${def.label}`;
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
    label.innerHTML = `<b>${def.badge}</b>${def.label}`;
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
    label.textContent = def.label;
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
    noneName.textContent = 'Nenhum';
    noneCard.append(noneArt, noneName);
    const slotName = slot === 'head' ? 'cabeça' : slot === 'face' ? 'rosto' : 'corpo';
    noneCard.title = `Remover acessório de ${slotName}`;
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
      const name = document.createElement('span');
      name.className = 'acc-name';
      name.textContent = def.label;
      card.appendChild(name);
      if (slot === 'body') {
        const slotBadge = document.createElement('span');
        slotBadge.className = 'acc-slot-badge';
        slotBadge.textContent = 'CORPO';
        card.appendChild(slotBadge);
      }
      if (!unlocked) {
        const lock = document.createElement('span');
        lock.className = 'lock-badge';
        lock.textContent = def.unlock.type === 'level' ? `🔒 Lv.${def.unlock.level}` : '🔒 Loja';
        card.appendChild(lock);
      }
      card.setAttribute('aria-pressed', String(current === id));
      if (autoId === id) {
        const badge = document.createElement('span');
        badge.className = 'auto-gear-badge';
        badge.textContent = 'PROF.';
        badge.title = 'Equipado temporariamente pela profissão ativa';
        card.appendChild(badge);
        card.setAttribute('aria-current', 'true');
      }
      if (unlocked) {
        card.title = def.desc;
        card.setAttribute('aria-label', `${def.label}. ${def.desc}`);
        card.appendChild(makeStar('accessories', id, renderAccessories));
        card.addEventListener('click', () => { setConfig(configKey, id); renderAccessories(); });
      } else {
        const unlockHint = def.unlock.type === 'level'
          ? `Desbloqueia no nível ${def.unlock.level}`
          : `Compre na Lojinha por ${def.unlock.price} 🪙`;
        card.title = `${def.desc}. ${unlockHint}`;
        card.setAttribute('aria-label', `${def.label}. ${card.title}`);
      }
      if (autoId === id) {
        card.setAttribute('aria-label', `${card.getAttribute('aria-label')}. Equipado temporariamente pela profissão ativa.`);
      }
      grid.appendChild(card);
    });

    const selected = CLAWD_ACCESSORIES[current];
    const descId = slot === 'head' ? 'acc-head-description' : slot === 'face' ? 'acc-face-description' : 'acc-body-description';
    const description = $(descId);
    if (!description) return;
    const automatic = autoId && CLAWD_ACCESSORIES[autoId];
    description.textContent = automatic
      ? `${automatic.emoji} ${automatic.label} está em uso pela profissão. ${selected ? `Sua escolha ${selected.label}` : 'A opção sem acessório'} volta no modo Livre.`
      : selected
      ? `${selected.emoji} ${selected.label} — ${selected.desc}`
      : slot === 'head'
        ? 'Sem chapéu selecionado.'
        : slot === 'face'
        ? 'Sem acessório de rosto selecionado.'
        : 'Sem acessório de corpo selecionado.';
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
    card.innerHTML = `<span class="prof-icon">${def.emoji}</span><span class="prof-name">${def.label}</span><span class="prof-desc">${def.desc}</span>`;
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
  const gear = Object.values(def.gear || {}).map(id => CLAWD_ACCESSORIES[id]?.label).filter(Boolean);
  document.querySelector('.prof-status-icon').textContent = def.emoji;
  $('prof-status-text').textContent = profession === 'idle'
    ? 'Modo livre — sem profissão ativa'
    : `${def.label} ativo — ${def.desc.toLowerCase()}${gear.length ? ` · traje: ${gear.join(' + ')}` : ''}`;
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
  $('keepy-record').querySelector('b').textContent = S.game.counters.keepyRecord || 0;
}

/* =====================================================
   AÇÕES
   ===================================================== */
function renderActions() {
  const grid = $('actions-grid');
  grid.innerHTML = '';
  favSort(Object.keys(CLAWD_ACTIONS), 'actions').forEach(id => {
    const def = CLAWD_ACTIONS[id];
    const btn = document.createElement('button');
    btn.className = 'action-btn' + (isFav('actions', id) ? ' favorited' : '');
    btn.innerHTML = `${def.emoji} ${def.label}`;
    btn.appendChild(makeStar('actions', id, renderActions));
    btn.addEventListener('click', () => {
      sendMsg({ action: 'triggerAction', value: id });
      btn.style.transform = 'scale(0.93)';
      setTimeout(() => btn.style.transform = '', 200);
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
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'subpet-action-btn';
    btn.disabled = !active;
    btn.dataset.action = id;
    btn.title = active ? `${def.label}: ${def.feedback}` : 'Ative um sub-pet primeiro';
    btn.innerHTML = `<span aria-hidden="true">${def.emoji}</span><b>${def.label}</b>`;
    btn.addEventListener('click', () => {
      if (!S.subpets.active) return;
      const species = S.subpets.active;
      const petName = (S.subpets.names || {})[species] || CLAWD_SUBPETS[species]?.label || 'Sub-pet';
      sendMsg({ action: 'triggerSubpetAction', value: id });
      status.textContent = `${def.emoji} ${petName}: ${def.feedback}`;
      btn.classList.add('playing');
      setTimeout(() => btn.classList.remove('playing'), 420);
    });
    grid.appendChild(btn);
  });

  if (!active) {
    status.textContent = 'Ative um sub-pet para brincar.';
  } else {
    const petName = (S.subpets.names || {})[active] || CLAWD_SUBPETS[active]?.label || 'Sub-pet';
    status.textContent = `${petName} está acordado e pronto para interagir.`;
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
    nameEl.textContent = name || def.label;
    const descEl = document.createElement('span');
    descEl.className = 'subpet-desc';
    descEl.textContent = unlocked ? def.special : `🔒 Nível ${def.level}`;
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
      <span class="shop-name">${def.label}</span>
      <span class="shop-price">${owned ? '✅ Comprado' : `🪙 ${def.price}`}</span>`;
    const btn = document.createElement('button');
    btn.className = 'shop-btn';
    if (!owned) {
      const afford = (S.game.coins || 0) >= def.price;
      btn.textContent = 'Comprar';
      btn.disabled = !afford;
      if (!afford) btn.title = 'PixelCoins insuficientes';
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
      btn.textContent = 'Equipar';
      btn.addEventListener('click', () => {
        const accSlot = CLAWD_ACCESSORIES[id]?.slot;
        const configKey = accSlot === 'head' ? 'accessoryHead' : accSlot === 'body' ? 'accessoryBody' : 'accessoryFace';
        setConfig(configKey, id);
        renderAccessories();
      });
    } else if (def.kind === 'ball') {
      btn.textContent = equipped ? 'Equipada ✓' : 'Equipar';
      btn.disabled = equipped;
      btn.addEventListener('click', () => { setConfig('ballSkin', id); renderShop(); });
    } else if (def.kind === 'decor') {
      btn.textContent = 'Decoração ativa ✓';
      btn.disabled = true;
      btn.title = id === 'cushion' ? 'Almofada pixel aparece sob o pet na página' : 'Item decorativo ativo';
    } else {
      btn.textContent = 'Decoração ✓';
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
        <span class="ach-name">${def.label}</span>
        <span class="ach-desc">${def.desc}</span>
        <div class="ach-bar"><div class="ach-fill" style="width:${pct}%"></div></div>
      </div>
      <span class="ach-state">${unlocked ? '🏆' : `${Math.min(cur, def.goal)}/${def.goal}`}</span>`;
    list.appendChild(row);
  });
  $('ach-summary').textContent = `${unlockedCount} / ${Object.keys(CLAWD_ACHIEVEMENTS).length} desbloqueadas`;
  const st = S.game.streak || { days: 0 };
  const days = Math.max(0, Math.min(9999, Number(st.days) || 0));
  const streakBox = $('streak-box');
  streakBox.replaceChildren();
  streakBox.append('🔥 Streak: ');
  const streakB = document.createElement('b');
  streakB.textContent = `${days} dia${days === 1 ? '' : 's'}`;
  streakBox.appendChild(streakB);
  streakBox.append(' — volte amanhã para bônus de XP!');
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
  if (pcHex) pcHex.textContent = S.particleColor || '(padrão)';
  /* v3.3: frases customizadas */
  const csEl = $('custom-speech');
  if (csEl) csEl.value = (S.customSpeech || []).join('\n');
  $('quiet-start').value = set.quietStart || '';
  $('quiet-end').value = set.quietEnd || '';
  $('blocked-sites').value = (set.blockedSites || []).join('\n');
  $('select-corner').value = set.startCorner || 'br';
  $('toggle-performance').checked = !!set.performanceMode;
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
    if (hexEl) hexEl.textContent = '(padrão)';
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
  $('toggle-performance').addEventListener('change', e => {
    setSetting('performanceMode', e.target.checked);
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
          alert('❌ Arquivo inválido.');
          return;
        }
        const data = clawdMigrateState(parsed);
        chrome.storage.local.set({ clawdState: data }, () => {
          scrubLastError();
          S = data;
          renderAll();
          alert('✅ Dados importados! Recarregue as páginas abertas para aplicar.');
        });
      } catch (_) {
        alert('❌ Arquivo inválido.');
      }
    };
    reader.readAsText(file);
  });
  $('btn-reset-all').addEventListener('click', () => {
    if (!confirm('Resetar TODO o progresso (XP, moedas, conquistas, favoritos)?')) return;
    if (!confirm('Tem certeza? Essa ação não pode ser desfeita!')) return;
    const fresh = clawdDefaultState();
    chrome.storage.local.set({ clawdState: fresh }, () => {
      scrubLastError();
      S = fresh;
      renderAll();
      alert('🔄 Progresso resetado. Recarregue as páginas abertas.');
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
    happy: 'Carinho enviado ❤️',
    feed: 'Hora do lanche 🍖',
    play: 'Vamos brincar! ⚡',
    bath: 'Banho liberado 🧼'
  };
  document.querySelectorAll('.stat-action').forEach(btn => {
    const run = () => {
      const action = btn.dataset.statAction;
      if (!action) return;
      pulseStatButton(btn);
      sendMsg({ action: 'triggerAction', value: action });
      showStatusFeedback(STAT_FEEDBACK[action] || 'Ação enviada!');
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
    wave: 'Acenando 👋', dance: 'Hora de dançar 🕺', pose: 'Pose! 📸',
    sleep: 'ZzZz… 😴', balloon: 'Balão 🎈', cheer: 'Yeah! 🎉'
  };
  document.querySelectorAll('.btn-quick').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.quickAction;
      if (!action) return;
      btn.classList.remove('quick-pulse');
      void btn.offsetWidth;
      btn.classList.add('quick-pulse');
      sendMsg({ action: 'triggerAction', value: action });
      showStatusFeedback(QUICK_FEEDBACK[action] || 'Ação enviada!');
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
  $('btn-toggle').addEventListener('click', () => sendMsg({ action: 'toggleVisibility' }));
  $('btn-reset').addEventListener('click', () => sendMsg({ action: 'resetPosition' }));

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
  overlay.style.display = 'flex';
  const btn = $('onboarding-start');
  if (btn) btn.addEventListener('click', () => {
    overlay.style.display = 'none';
    persist(st => { st.onboardingDone = true; });
    S.onboardingDone = true;
  }, { once: true });
}

function updateContextBar(status) {
  const bar = $('clawd-context-bar');
  if (!bar) return;
  const prof = status?.profession || S.profession || 'idle';
  const ctx  = status?.pageContext || 'idle';
  const profData = CLAWD_PROFESSIONS[prof] || CLAWD_PROFESSIONS.idle;
  const emoji = profData?.emoji || '💼';
  const label = profData?.label || 'Livre';
  $('context-bar-profession').textContent = `${emoji} ${label}`;
  $('context-bar-page').textContent = ctx;
  bar.style.display = 'flex';
}

chrome.storage.local.get(['clawdState'], (res) => {
  scrubLastError();
  S = clawdMigrateState(res.clawdState);
  bindStatic();
  renderAll();
  activatePopupTab(S.settings?.lastPopupTab || 'appearance');
  if (!S.onboardingDone) showOnboarding();
  updateContextBar(null);
  pollLiveStats();
  setInterval(pollLiveStats, 4000);
});
