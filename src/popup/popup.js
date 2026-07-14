// popup.js — Claw'd v2.0

function sendMsg(message) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;
    chrome.tabs.sendMessage(tabs[0].id, message).catch(() => {
      const pill = document.getElementById('status-pill');
      pill.classList.add('error');
      document.getElementById('status-text').textContent = 'Abra em um site real!';
    });
  });
}

// ---- Carregar estado salvo ----
chrome.storage.local.get(['clawdState'], (result) => {
  const s = result.clawdState || {};

  if (s.name)  document.getElementById('input-name').value = s.name;

  if (s.color) {
    document.getElementById('input-color').value = s.color;
    document.getElementById('color-hex').textContent = s.color;
    document.querySelector('.header-pet').style.borderColor = s.color;
    document.querySelector('.header-pet').style.boxShadow = `0 0 16px ${s.color}55`;
    document.getElementById('mini-sprite').style.setProperty('--preview-color', s.color);
    // Marca o swatch correspondente
    document.querySelectorAll('.color-swatch').forEach(sw => {
      if (sw.dataset.color === s.color) sw.classList.add('selected');
    });
  }

  if (s.scale !== undefined) {
    document.getElementById('range-scale').value = s.scale;
    document.getElementById('scale-badge').textContent = `${parseFloat(s.scale).toFixed(1)}×`;
  }

  if (s.animSpeed !== undefined) {
    document.getElementById('range-speed').value = s.animSpeed;
    document.getElementById('speed-badge').textContent = `${parseFloat(s.animSpeed).toFixed(2)}×`;
  }

  if (s.showSpeech !== undefined)
    document.getElementById('toggle-speech').checked = !!s.showSpeech;

  if (s.autoWalk !== undefined)
    document.getElementById('toggle-walk').checked = !!s.autoWalk;

  if (s.sleepEnabled !== undefined)
    document.getElementById('toggle-sleep').checked = !!s.sleepEnabled;
});

// ---- TABS ----
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
  });
});

// ---- APARÊNCIA ----

// Nome
document.getElementById('input-name').addEventListener('input', (e) => {
  const val = e.target.value || "Claw'd";
  sendMsg({ action: 'updateConfig', key: 'name', value: val });
});

// Swatches de cor predefinidos
document.querySelectorAll('.color-swatch').forEach(sw => {
  sw.addEventListener('click', () => {
    const color = sw.dataset.color;
    document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
    sw.classList.add('selected');
    document.getElementById('input-color').value = color;
    applyColor(color);
  });
});

// Input de cor customizada
document.getElementById('input-color').addEventListener('input', (e) => {
  document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
  applyColor(e.target.value);
});

function applyColor(color) {
  document.getElementById('color-hex').textContent = color;
  document.querySelector('.header-pet').style.borderColor = color;
  document.querySelector('.header-pet').style.boxShadow = `0 0 16px ${color}55`;
  document.getElementById('mini-sprite').style.setProperty('--preview-color', color);
  sendMsg({ action: 'updateConfig', key: 'color', value: color });
}

// Escala
document.getElementById('range-scale').addEventListener('input', (e) => {
  const val = parseFloat(e.target.value);
  document.getElementById('scale-badge').textContent = `${val.toFixed(1)}×`;
  sendMsg({ action: 'updateConfig', key: 'scale', value: val });
});

// Velocidade
document.getElementById('range-speed').addEventListener('input', (e) => {
  const val = parseFloat(e.target.value);
  document.getElementById('speed-badge').textContent = `${val.toFixed(2)}×`;
  sendMsg({ action: 'updateConfig', key: 'animSpeed', value: val });
});

// ---- COMPORTAMENTO ----

document.getElementById('toggle-speech').addEventListener('change', (e) => {
  sendMsg({ action: 'updateConfig', key: 'showSpeech', value: e.target.checked });
});
document.getElementById('toggle-walk').addEventListener('change', (e) => {
  sendMsg({ action: 'updateConfig', key: 'autoWalk', value: e.target.checked });
});
document.getElementById('toggle-sleep').addEventListener('change', (e) => {
  sendMsg({ action: 'updateConfig', key: 'sleepEnabled', value: e.target.checked });
});

// ---- PROFISSÃO ----

const profLabels = {
  idle:       { icon: '🐾', text: 'Modo livre — sem profissão ativa' },
  footballer: { icon: '⚽', text: 'Jogador ativo — celebra em sites esportivos' },
  tutor:      { icon: '📚', text: 'Tutor ativo — monitorando foco de estudo' },
  engineer:   { icon: '💻', text: 'Dev ativo — reagindo a repositórios e docs' }
};

function applyProfession(profession) {
  document.querySelectorAll('.profession-card').forEach(c => c.classList.remove('active'));
  const card = document.querySelector(`.profession-card[data-profession="${profession}"]`);
  if (card) card.classList.add('active');
  const label = profLabels[profession] || profLabels.idle;
  document.querySelector('.prof-status-icon').textContent = label.icon;
  document.getElementById('prof-status-text').textContent = label.text;
  sendMsg({ action: 'updateConfig', key: 'profession', value: profession });
}

// Carregar profissão salva
chrome.storage.local.get(['clawdState'], (r) => {
  const prof = (r.clawdState || {}).profession || 'idle';
  applyProfession(prof);
});

document.querySelectorAll('.profession-card').forEach(card => {
  card.addEventListener('click', () => applyProfession(card.dataset.profession));
});

// ---- AÇÕES ----

document.querySelectorAll('.action-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    sendMsg({ action: 'triggerAction', value: btn.dataset.action });
    btn.style.transform = 'scale(0.93)';
    setTimeout(() => btn.style.transform = '', 200);
  });
});

document.getElementById('btn-toggle').addEventListener('click', () => {
  sendMsg({ action: 'toggleVisibility' });
});
document.getElementById('btn-reset').addEventListener('click', () => {
  sendMsg({ action: 'resetPosition' });
});
