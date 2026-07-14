/* ===================================================
   CLAW'D v3 — POPUP
   Requer: ../shared/catalog.js
   =================================================== */

let S = clawdDefaultState();

function $(id) { return document.getElementById(id); }

function sendMsg(message) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;
    chrome.tabs.sendMessage(tabs[0].id, message).catch(() => {
      const pill = $('status-pill');
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
    const fresh = clawdMigrateState(res.clawdState);
    // preserva progresso que o content atualiza em paralelo
    fresh.xp = Math.max(fresh.xp, S.xp);
    mutator(fresh);
    S = fresh;
    chrome.storage.local.set({ clawdState: fresh });
  });
}

function setConfig(key, value) {
  S[key] = value;
  sendMsg({ action: 'updateConfig', key, value });
  persist(st => { st[key] = value; });
}

function setSetting(key, value) {
  S.settings[key] = value;
  persist(st => { st.settings[key] = value; });
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
  $('xp-level').textContent = `Lv. ${level}`;
  $('xp-count').textContent = `${S.xp} XP`;
  $('coins-count').textContent = S.game.coins || 0;
  setTimeout(() => { $('xp-fill').style.width = `${Math.min(100, (into / next) * 100)}%`; }, 120);
  renderStats(S.stats);
  if (S.color) applyHeaderColor(S.color);
  $('mini-sprite').classList.toggle('smooth', !!S.smooth);
}

function renderStats(stats) {
  const map = { happiness: 'stat-happiness', hunger: 'stat-hunger', energy: 'stat-energy', hygiene: 'stat-hygiene' };
  Object.entries(map).forEach(([key, id]) => {
    const v = Math.round(stats[key] ?? 0);
    const el = $(id);
    el.style.width = `${v}%`;
    el.classList.toggle('low', v < 30);
  });
}

function applyHeaderColor(color) {
  $('color-hex').textContent = color;
  document.querySelector('.header-pet').style.borderColor = color;
  document.querySelector('.header-pet').style.boxShadow = `0 0 16px ${color}55`;
  $('mini-sprite').style.setProperty('--preview-color', color);
}

/* Busca stats ao vivo do content script */
function pollLiveStats() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;
    chrome.tabs.sendMessage(tabs[0].id, { action: 'getStatus' })
      .then(res => {
        if (!res) return;
        renderStats(res.stats);
        $('coins-count').textContent = res.coins;
        const { level, into, next } = clawdLevelFromXp(res.xp);
        $('xp-level').textContent = `Lv. ${level}`;
        $('xp-count').textContent = `${res.xp} XP`;
        $('xp-fill').style.width = `${Math.min(100, (into / next) * 100)}%`;
        const rec = $('keepy-record');
        if (rec) rec.querySelector('b').textContent = res.keepyRecord;
        if (res.daily) renderDailyQuest(res.daily);
      })
      .catch(() => {});
  });
}

function renderDailyQuest(daily = clawdEnsureDailyQuest(S)) {
  const box = $('daily-quest');
  if (!box || !daily) return;
  const progress = Math.min(daily.progress || 0, daily.target);
  const done = progress >= daily.target;
  box.innerHTML = `
    <div class="daily-top"><span>🎯 Missão diária</span><b>${progress}/${daily.target}</b></div>
    <div class="daily-label">${daily.label}</div>
    <div class="daily-bar"><div style="width:${Math.round(progress / daily.target * 100)}%"></div></div>
    <button class="daily-claim" ${!done || daily.claimed ? 'disabled' : ''}>${daily.claimed ? '✅ Resgatada' : done ? `Resgatar +${daily.rewardCoins} 🪙` : `+${daily.rewardXp} XP ao concluir`}</button>`;
  const button = box.querySelector('.daily-claim');
  if (button && done && !daily.claimed) button.addEventListener('click', () => {
    sendMsg({ action: 'claimDailyQuest' });
    setTimeout(pollLiveStats, 300);
  });
}

/* =====================================================
   APARÊNCIA
   ===================================================== */
function renderNameArea() {
  $('input-name').value = S.name || "Claw'd";
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
}
function updateColorStar() {
  const cur = $('input-color').value;
  const fav = isFav('colors', cur);
  const btn = $('color-star');
  btn.textContent = fav ? '⭐' : '☆';
  btn.classList.toggle('favorited', fav);
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
  ['head', 'face'].forEach(slot => {
    const grid = $(slot === 'head' ? 'acc-head-grid' : 'acc-face-grid');
    grid.innerHTML = '';
    const configKey = slot === 'head' ? 'accessoryHead' : 'accessoryFace';
    const current = S[configKey] || 'none';

    // card "nenhum"
    const noneCard = document.createElement('button');
    noneCard.className = 'accessory-card' + (current === 'none' ? ' active' : '');
    noneCard.innerHTML = `<span class="acc-icon">🚫</span><span class="acc-name">Nenhum</span>`;
    noneCard.title = `Remover acessório de ${slot === 'head' ? 'cabeça' : 'rosto e corpo'}`;
    noneCard.setAttribute('aria-label', noneCard.title);
    noneCard.setAttribute('aria-pressed', String(current === 'none'));
    noneCard.addEventListener('click', () => { setConfig(configKey, 'none'); renderAccessories(); });
    grid.appendChild(noneCard);

    const ids = Object.keys(CLAWD_ACCESSORIES).filter(id => CLAWD_ACCESSORIES[id].slot === slot);
    favSort(ids, 'accessories').forEach(id => {
      const def = CLAWD_ACCESSORIES[id];
      const unlocked = accessoryUnlocked(id);
      const card = document.createElement('button');
      card.className = 'accessory-card'
        + (current === id ? ' active' : '')
        + (isFav('accessories', id) ? ' favorited' : '')
        + (unlocked ? '' : ' locked');
      card.innerHTML = `<span class="acc-icon">${def.emoji}</span><span class="acc-name">${def.label}</span>`
        + (unlocked ? '' : `<span class="lock-badge">${def.unlock.type === 'level' ? `🔒 Lv.${def.unlock.level}` : '🔒 Loja'}</span>`);
      card.setAttribute('aria-pressed', String(current === id));
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
      grid.appendChild(card);
    });

    const selected = CLAWD_ACCESSORIES[current];
    const description = $(slot === 'head' ? 'acc-head-description' : 'acc-face-description');
    description.textContent = selected
      ? `${selected.emoji} ${selected.label} — ${selected.desc}`
      : slot === 'head'
        ? 'Sem chapéu selecionado.'
        : 'Sem acessório de rosto ou corpo selecionado.';
  });
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
}

function updateProfStatus(profession) {
  const def = CLAWD_PROFESSIONS[profession] || CLAWD_PROFESSIONS.idle;
  document.querySelector('.prof-status-icon').textContent = def.emoji;
  $('prof-status-text').textContent = profession === 'idle'
    ? 'Modo livre — sem profissão ativa'
    : `${def.label} ativo — ${def.desc.toLowerCase()}`;
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
    const name = (S.subpets.names || {})[id];
    card.innerHTML = `
      <span class="subpet-emoji">${def.emoji}</span>
      <span class="subpet-name">${name || def.label}</span>
      <span class="subpet-desc">${unlocked ? def.special : `🔒 Nível ${def.level}`}</span>`;
    if (unlocked) {
      card.appendChild(makeStar('subpets', id, renderSubpets));
      card.addEventListener('click', () => {
        const next = active ? null : id;
        persist(st => {
          st.subpets.active = next;
          if (next && !st.subpets.unlocked.includes(next)) st.subpets.unlocked.push(next);
          st.game.counters.subpetsUnlocked = st.subpets.unlocked.length;
        });
        S.subpets.active = next;
        sendMsg({ action: 'setSubpet', value: next });
        renderSubpets();
      });
    }
    grid.appendChild(card);
  });
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
          if (!st.game.inventory.includes(id)) st.game.inventory.push(id);
        });
        setTimeout(() => { renderShop(); renderHeader(); renderAccessories(); }, 120);
      });
    } else if (def.kind === 'accessory') {
      btn.textContent = 'Equipar';
      btn.addEventListener('click', () => {
        const slot = CLAWD_ACCESSORIES[id]?.slot === 'head' ? 'accessoryHead' : 'accessoryFace';
        setConfig(slot, id);
        renderAccessories();
      });
    } else if (def.kind === 'ball') {
      btn.textContent = equipped ? 'Equipada ✓' : 'Equipar';
      btn.disabled = equipped;
      btn.addEventListener('click', () => { setConfig('ballSkin', id); renderShop(); });
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
  $('streak-box').innerHTML = `🔥 Streak: <b>${st.days || 0} dia${(st.days || 0) === 1 ? '' : 's'}</b> — volte amanhã para bônus de XP!`;
  renderDailyQuest(S.daily);
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
  $('quiet-start').value = set.quietStart || '';
  $('quiet-end').value = set.quietEnd || '';
  $('blocked-sites').value = (set.blockedSites || []).join('\n');
  $('select-corner').value = set.startCorner || 'br';
  $('toggle-performance').checked = !!set.performanceMode;
  document.querySelectorAll('#tag-theme-grid .mini-card').forEach(c => {
    c.classList.toggle('active', c.dataset.theme === (S.tagTheme || 'light'));
  });
  document.querySelectorAll('#skin-grid .mini-card').forEach(c => {
    c.classList.toggle('active', c.dataset.skin === (S.skin || 'normal'));
  });
}

function bindConfig() {
  $('toggle-crosstab').addEventListener('change', e => setSetting('crossTab', e.target.checked));
  $('select-travel').addEventListener('change', e => setSetting('travelFreq', e.target.value));
  $('toggle-footprints').addEventListener('change', e => setSetting('footprints', e.target.checked));
  $('toggle-sounds').addEventListener('change', e => setSetting('sounds', e.target.checked));
  $('range-volume').addEventListener('input', e => {
    const v = parseFloat(e.target.value);
    $('volume-badge').textContent = `${Math.round(v * 100)}%`;
    setSetting('soundVolume', v);
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
    sendMsg({ action: 'updateSetting', key: 'performanceMode', value: e.target.checked });
  });
  document.querySelectorAll('#tag-theme-grid .mini-card').forEach(c => {
    c.addEventListener('click', () => { setConfig('tagTheme', c.dataset.theme); renderConfig(); });
  });
  document.querySelectorAll('#skin-grid .mini-card').forEach(c => {
    c.addEventListener('click', () => { setConfig('skin', c.dataset.skin); renderConfig(); });
  });

  // Export / Import / Reset
  $('btn-export').addEventListener('click', () => {
    chrome.storage.local.get(['clawdState'], (res) => {
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
        const data = clawdMigrateState(JSON.parse(reader.result));
        chrome.storage.local.set({ clawdState: data }, () => {
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
  // Tabs
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      $(`tab-${tab.dataset.tab}`).classList.add('active');
    });
  });

  // Nome + histórico + favorito
  $('input-name').addEventListener('input', (e) => {
    const val = e.target.value || "Claw'd";
    setConfig('name', val);
    persist(st => {
      if (val && !st.nicknameHistory.includes(val)) {
        st.nicknameHistory.push(val);
        if (st.nicknameHistory.length > 12) st.nicknameHistory.shift();
      }
    });
    updateNameStar();
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
    $('mini-sprite').classList.toggle('smooth', e.target.checked);
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

  // Sistema
  $('btn-toggle').addEventListener('click', () => sendMsg({ action: 'toggleVisibility' }));
  $('btn-reset').addEventListener('click', () => sendMsg({ action: 'resetPosition' }));

  bindConfig();
}

/* =====================================================
   RENDER GERAL + BOOT
   ===================================================== */
function renderAll() {
  renderHeader();
  renderNameArea();
  renderColors();
  renderAccessories();
  renderProfessions();
  renderActions();
  renderSubpets();
  renderShop();
  renderAchievements();
  renderConfig();

  $('input-color').value = S.color || '#c71515';
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

chrome.storage.local.get(['clawdState'], (res) => {
  S = clawdMigrateState(res.clawdState);
  bindStatic();
  renderAll();
  pollLiveStats();
  setInterval(pollLiveStats, 4000);
});
