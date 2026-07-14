/* ===================================================
   CLAW'D POPUP v2.1
   A configuração flui num sentido único:
   popup → ClawdStore (chrome.storage) → todas as abas
   reagem via Observer. Ações imediatas (acenar, dançar,
   mostrar/ocultar…) continuam indo por mensagem à aba
   ativa. O ping na abertura valida a conexão.
   =================================================== */

'use strict';

const { PROFESSIONS, levelForXp, levelProgress, ClawdStore } = CLAWD;
const store = new ClawdStore();

const $ = (id) => document.getElementById(id);

/* ---- Status / mensagens à aba ativa ---- */

function setStatus(connected) {
  $('status-pill').classList.toggle('error', !connected);
  $('status-text').textContent = connected ? 'Conectado' : 'Abra em um site real!';
}

function sendToActiveTab(message) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]?.id) { setStatus(false); return; }
    chrome.tabs.sendMessage(tabs[0].id, message)
      .then((response) => {
        if (message.action === 'ping') setStatus(!!response?.ok);
      })
      .catch(() => setStatus(false));
  });
}

function setConfig(key, value) {
  store.set(key, value); // as abas aplicam via storage.onChanged
}

/* ---- Renderização ---- */

function renderColor(color) {
  $('input-color').value = color;
  $('color-hex').textContent = color;
  const headerPet = document.querySelector('.header-pet');
  headerPet.style.borderColor = color;
  headerPet.style.boxShadow = `0 0 16px ${color}55`;
  $('mini-sprite').style.setProperty('--preview-color', color);
  document.querySelectorAll('.color-swatch').forEach((sw) => {
    sw.classList.toggle('selected', sw.dataset.color === color);
  });
}

function renderXp(xp) {
  $('xp-level').textContent = `Lv. ${levelForXp(xp)}`;
  $('xp-count').textContent = `${xp || 0} XP`;
  $('xp-fill').style.width = `${levelProgress(xp) * 100}%`;
}

function renderAccessory(accessory) {
  document.querySelectorAll('.accessory-card').forEach((card) => {
    card.classList.toggle('active', card.dataset.accessory === (accessory || 'none'));
  });
}

function renderProfession(profession) {
  document.querySelectorAll('.profession-card').forEach((card) => {
    card.classList.toggle('active', card.dataset.profession === profession);
  });
  const prof = PROFESSIONS[profession] || PROFESSIONS.idle;
  document.querySelector('.prof-status-icon').textContent = prof.icon;
  $('prof-status-text').textContent = prof.status;
}

function renderAll(state) {
  $('input-name').value = state.name;
  renderColor(state.color);
  $('range-scale').value = state.scale;
  $('scale-badge').textContent = `${Number(state.scale).toFixed(1)}×`;
  $('range-speed').value = state.animSpeed;
  $('speed-badge').textContent = `${Number(state.animSpeed).toFixed(2)}×`;
  $('toggle-speech').checked = !!state.showSpeech;
  $('toggle-walk').checked = !!state.autoWalk;
  $('toggle-sleep').checked = !!state.sleepEnabled;
  $('toggle-smooth').checked = !!state.smooth;
  $('toggle-outline').checked = !!state.outline;
  renderAccessory(state.accessory);
  renderProfession(state.profession);
  renderXp(state.xp);
}

/* ---- Boot ---- */

store.load().then((state) => {
  renderAll(state);
  // Barra de XP anima a partir de 0 na abertura
  $('xp-fill').style.width = '0%';
  setTimeout(() => renderXp(store.get('xp')), 150);
  sendToActiveTab({ action: 'ping' });
});

// Live-update enquanto o popup está aberto (XP ganho na página, etc.)
store.subscribe((key) => {
  if (key === 'xp') renderXp(store.get('xp'));
  else if (key === 'accessory') renderAccessory(store.get('accessory'));
});

// Garante que a última mudança não se perca ao fechar o popup
window.addEventListener('pagehide', () => store.flushNow());

/* ---- Tabs ---- */

document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t === tab));
    document.querySelectorAll('.tab-panel').forEach((p) => {
      p.classList.toggle('active', p.id === `tab-${tab.dataset.tab}`);
    });
  });
});

/* ---- Aparência ---- */

$('input-name').addEventListener('input', (e) => {
  setConfig('name', e.target.value.trim() || "Claw'd");
});

document.querySelectorAll('.color-swatch').forEach((sw) => {
  sw.addEventListener('click', () => {
    renderColor(sw.dataset.color);
    setConfig('color', sw.dataset.color);
  });
});

$('input-color').addEventListener('input', (e) => {
  renderColor(e.target.value);
  setConfig('color', e.target.value);
});

$('range-scale').addEventListener('input', (e) => {
  const value = parseFloat(e.target.value);
  $('scale-badge').textContent = `${value.toFixed(1)}×`;
  setConfig('scale', value);
});

$('range-speed').addEventListener('input', (e) => {
  const value = parseFloat(e.target.value);
  $('speed-badge').textContent = `${value.toFixed(2)}×`;
  setConfig('animSpeed', value);
});

$('toggle-smooth').addEventListener('change', (e) => setConfig('smooth', e.target.checked));
$('toggle-outline').addEventListener('change', (e) => setConfig('outline', e.target.checked));

document.querySelectorAll('.accessory-card').forEach((card) => {
  card.addEventListener('click', () => {
    renderAccessory(card.dataset.accessory);
    setConfig('accessory', card.dataset.accessory);
  });
});

/* ---- Comportamento ---- */

$('toggle-speech').addEventListener('change', (e) => setConfig('showSpeech', e.target.checked));
$('toggle-walk').addEventListener('change', (e) => setConfig('autoWalk', e.target.checked));
$('toggle-sleep').addEventListener('change', (e) => setConfig('sleepEnabled', e.target.checked));

/* ---- Profissão ---- */

document.querySelectorAll('.profession-card').forEach((card) => {
  card.addEventListener('click', () => {
    const profession = card.dataset.profession;
    renderProfession(profession);
    setConfig('profession', profession);
    // Regra de negócio: a profissão pode trazer um acessório automático
    const autoAccessory = PROFESSIONS[profession]?.accessory;
    if (autoAccessory) {
      renderAccessory(autoAccessory);
      setConfig('accessory', autoAccessory);
    }
  });
});

/* ---- Ações ---- */

document.querySelectorAll('.action-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    sendToActiveTab({ action: 'triggerAction', value: btn.dataset.action });
    btn.style.transform = 'scale(0.93)';
    setTimeout(() => { btn.style.transform = ''; }, 200);
  });
});

$('btn-toggle').addEventListener('click', () => sendToActiveTab({ action: 'toggleVisibility' }));
$('btn-reset').addEventListener('click', () => sendToActiveTab({ action: 'resetPosition' }));
