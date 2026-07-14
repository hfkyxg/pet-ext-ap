/* ===================================================
   CLAW'D v3 — SERVICE WORKER (MV3)
   PresenceManager: coordena o "passeio entre abas".
   Apenas 1 pet visível no navegador quando o modo
   cross-tab está ligado.
   =================================================== */

const ports = new Map();      // tabId -> Port
let hostTabId = null;         // aba onde o pet está visível
let travelInFlight = null;    // { from, to, timeout }
let travelDebounce = null;

/* ---- Reload seguro: remove instâncias órfãs e reinjeta só na aba ativa ---- */
const RUNTIME_RECONCILE_KEY = 'clawdRuntimeReconciled';
const RUNTIME_ELIGIBLE_URL = /^(https?|file):/i;

function removeClawdDom() {
  const selectors = [
    '#aic-clawd-node', '.aic-subpet', '#aic-footprints', '.aic-toast',
    '.aic-lake', '.aic-fishing-line', '.aic-fish-caught', '.aic-goalpost',
    '.aic-toyball', '.aic-dust', '.aic-particle'
  ].join(',');
  document.querySelectorAll(selectors).forEach(el => el.remove());
}

async function reconcileRuntimeAfterReload() {
  const tabs = await chrome.tabs.query({});
  const eligibleTabs = tabs.filter(tab => tab.id != null && RUNTIME_ELIGIBLE_URL.test(tab.url || ''));
  const [focusedActive] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  const active = eligibleTabs.find(tab => tab.id === focusedActive?.id)
    || eligibleTabs.find(tab => tab.active)
    || null;
  if (!active) return;

  const session = await chrome.storage.session.get([RUNTIME_RECONCILE_KEY]);
  if (session[RUNTIME_RECONCILE_KEY]) {
    const live = await chrome.tabs.sendMessage(active.id, { action: 'healthcheck' })
      .then(response => response?.alive === true)
      .catch(() => false);
    if (live) return;
  }
  await chrome.storage.session.set({ [RUNTIME_RECONCILE_KEY]: true });

  await Promise.all(eligibleTabs.map(tab =>
    chrome.scripting.executeScript({ target: { tabId: tab.id }, func: removeClawdDom }).catch(() => null)
  ));

  await chrome.scripting.insertCSS({
    target: { tabId: active.id },
    files: ['src/content/style.css']
  }).catch(() => null);
  await chrome.scripting.executeScript({
    target: { tabId: active.id },
    files: ['src/shared/catalog.js', 'src/content/content.js']
  }).catch(() => null);
}

reconcileRuntimeAfterReload().catch(() => {});

/* ---- Instalação: NÃO apaga estado existente ---- */
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['clawdState'], (res) => {
    if (!res.clawdState) {
      chrome.storage.local.set({
        clawdState: { schemaVersion: 3, position: { x: null, y: null }, profession: 'idle' }
      });
    }
  });
});

/* ---- Persistência do host em storage.session (sobrevive ao SW dormir) ---- */
function persistHost() {
  try { chrome.storage.session.set({ clawdHostTabId: hostTabId }); } catch (_) {}
}
function restoreHost(cb) {
  try {
    chrome.storage.session.get(['clawdHostTabId'], (res) => {
      if (res && res.clawdHostTabId != null) hostTabId = res.clawdHostTabId;
      cb && cb();
    });
  } catch (_) { cb && cb(); }
}

function send(tabId, msg) {
  const port = ports.get(tabId);
  if (!port) return false;
  try { port.postMessage(msg); return true; } catch (_) { ports.delete(tabId); return false; }
}

function getSettings(cb) {
  chrome.storage.local.get(['clawdState'], (res) => {
    const s = (res.clawdState || {}).settings || {};
    cb({
      crossTab: s.crossTab !== false,
      travelFreq: s.travelFreq || 'sometimes'
    });
  });
}

/* ---- Escolhe/atribui a aba anfitriã ---- */
function assignHost(tabId) {
  hostTabId = tabId;
  persistHost();
  for (const [id] of ports) {
    if (id === tabId) send(id, { type: 'spawnPet' });
    else send(id, { type: 'hidePet' });
  }
}

/* ---- Viagem animada origem → destino ---- */
function travel(toTabId) {
  if (travelInFlight || toTabId === hostTabId) return;
  const from = hostTabId;
  if (from == null || !ports.has(from)) {
    // sem origem viva — spawn direto
    if (ports.has(toTabId)) assignHost(toTabId);
    return;
  }
  if (!ports.has(toTabId)) return;
  const direction = Math.random() < 0.5 ? 'left' : 'right';
  travelInFlight = { from, to: toTabId, direction };
  send(from, { type: 'despawnPet', direction });
  // fallback: se a origem não confirmar em 3s, conclui mesmo assim
  travelInFlight.timeout = setTimeout(completeTravel, 3000);
}

function completeTravel() {
  if (!travelInFlight) return;
  const { to, direction, timeout } = travelInFlight;
  clearTimeout(timeout);
  travelInFlight = null;
  hostTabId = to;
  persistHost();
  if (!send(to, { type: 'spawnPet', direction: direction === 'left' ? 'right' : 'left' })) {
    // destino morreu no meio do caminho — respawna em qualquer aba viva
    respawnAnywhere();
  }
}

function respawnAnywhere() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeId = tabs[0]?.id;
    if (activeId != null && ports.has(activeId)) { assignHost(activeId); return; }
    const first = ports.keys().next();
    if (!first.done) assignHost(first.value);
    else { hostTabId = null; persistHost(); }
  });
}

/* ---- Conexões dos content scripts ---- */
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'clawd-presence') return;
  const tabId = port.sender?.tab?.id;
  if (tabId == null) return;
  ports.set(tabId, port);

  port.onMessage.addListener((msg) => {
    switch (msg.type) {
      case 'register':
        restoreHost(() => {
          if (hostTabId == null || !ports.has(hostTabId)) {
            assignHost(tabId);
          } else if (tabId === hostTabId) {
            send(tabId, { type: 'spawnPet' });
          } else {
            send(tabId, { type: 'hidePet' });
          }
        });
        break;
      case 'travelComplete':
        completeTravel();
        break;
      case 'stateSync':
        // espelho leve do estado para diagnóstico/resiliência
        try { chrome.storage.session.set({ clawdLastSync: msg.state || null }); } catch (_) {}
        break;
    }
  });

  port.onDisconnect.addListener(() => {
    ports.delete(tabId);
    if (travelInFlight && (travelInFlight.from === tabId || travelInFlight.to === tabId)) {
      clearTimeout(travelInFlight.timeout);
      travelInFlight = null;
    }
    // aba anfitriã fechou → respawn imediato na aba ativa
    if (tabId === hostTabId) {
      hostTabId = null;
      persistHost();
      respawnAnywhere();
    }
  });
});

/* ---- Troca de aba ativa: o pet "sente saudade" e viaja ---- */
chrome.tabs.onActivated.addListener(({ tabId }) => {
  getSettings((settings) => {
    if (!settings.crossTab) return;
    if (settings.travelFreq === 'rarely') return;          // só viaja quando o host fecha
    if (tabId === hostTabId || !ports.has(tabId)) return;
    if (settings.travelFreq === 'sometimes' && Math.random() < 0.5) return;
    clearTimeout(travelDebounce);
    travelDebounce = setTimeout(() => {
      // ainda é a aba ativa e registrada?
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id === tabId && ports.has(tabId)) travel(tabId);
      });
    }, 10000); // 10s depois, sente saudade
  });
});

/* ---- Aba anfitriã removida (redundância ao onDisconnect) ---- */
chrome.tabs.onRemoved.addListener((tabId) => {
  ports.delete(tabId);
  if (tabId === hostTabId) {
    hostTabId = null;
    persistHost();
    respawnAnywhere();
  }
});
