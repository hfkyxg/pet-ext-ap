/* ===================================================
   CLAW'D v3 — SERVICE WORKER (MV3)
   PresenceManager: coordena o "passeio entre abas".
   Apenas 1 pet visível no navegador quando o modo
   cross-tab está ligado.
   Validadores / selectors: SSOT em catalog.js
   =================================================== */

importScripts('../shared/catalog.js');

const ports = new Map();      // tabId -> Port
let hostTabId = null;         // aba onde o pet está visível
let travelInFlight = null;    // { from, to, direction, timeout }
let travelDebounce = null;

/* ---- Reload seguro: remove instâncias órfãs e reinjeta só na aba ativa ---- */
const RUNTIME_RECONCILE_KEY = 'clawdRuntimeReconciled';
const RUNTIME_ELIGIBLE_URL = /^(https?|file):/i;
const RUNTIME_CONTEXT_SETTLE_MS = 900;

function waitForContextSettlement() {
  return new Promise(resolve => setTimeout(resolve, RUNTIME_CONTEXT_SETTLE_MS));
}

function pingLiveContent(tabId) {
  return chrome.tabs.sendMessage(tabId, { action: 'healthcheck' })
    .then(response => response?.alive === true)
    .catch(() => {
      scrubLastError();
      return false;
    });
}

async function hasStableLiveContent(tabId) {
  await waitForContextSettlement();
  if (!await pingLiveContent(tabId)) return false;
  await waitForContextSettlement();
  return pingLiveContent(tabId);
}

function removeClawdDom(selectors) {
  document.querySelectorAll(selectors).forEach(el => el.remove());
}

async function injectClawdIntoTab(tabId) {
  await chrome.scripting.insertCSS({
    target: { tabId },
    files: ['src/content/style.css']
  }).catch(() => null);

  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise(resolve => setTimeout(resolve, 250));
    const injected = await chrome.scripting.executeScript({
      target: { tabId },
      files: ['src/shared/catalog.js', 'src/content/content.js']
    }).then(() => true).catch(() => false);
    if (!injected) continue;
    await new Promise(resolve => setTimeout(resolve, 250));
    if (await pingLiveContent(tabId)) return true;
    await chrome.scripting.executeScript({
      target: { tabId },
      func: removeClawdDom,
      args: [CLAWD_DOM_CLEANUP_SELECTORS]
    }).catch(() => null);
  }
  return false;
}

async function reconcileRuntimeAfterReload() {
  const tabs = await chrome.tabs.query({});
  const eligibleTabs = tabs.filter(tab => tab.id != null && RUNTIME_ELIGIBLE_URL.test(tab.url || ''));
  const [focusedActive] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  const mostRecentEligible = eligibleTabs.reduce((latest, tab) => {
    if (!latest) return tab;
    return (tab.lastAccessed || 0) > (latest.lastAccessed || 0) ? tab : latest;
  }, null);
  const active = eligibleTabs.find(tab => tab.id === focusedActive?.id)
    || eligibleTabs.find(tab => tab.active)
    || mostRecentEligible
    || null;
  if (!active) return;

  const session = await chrome.storage.session.get([RUNTIME_RECONCILE_KEY]);
  if (session[RUNTIME_RECONCILE_KEY]) {
    // Após chrome.runtime.reload(), o content script antigo pode responder por
    // alguns milissegundos antes de perceber que seu contexto expirou. Esperar
    // o heartbeat evita aceitar esse falso positivo e ficar sem pet em seguida.
    const live = await hasStableLiveContent(active.id);
    if (live) return;
  }
  await chrome.storage.session.set({ [RUNTIME_RECONCILE_KEY]: true });

  await Promise.all(eligibleTabs.map(tab =>
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: removeClawdDom,
      args: [CLAWD_DOM_CLEANUP_SELECTORS]
    }).catch(() => null)
  ));

  await injectClawdIntoTab(active.id);
}

reconcileRuntimeAfterReload().catch(() => {});

/* ---- Instalação: NÃO apaga estado existente ---- */
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['clawdState'], (res) => {
    if (!res.clawdState) {
      chrome.storage.local.set({
        clawdState: { schemaVersion: 5, position: { x: null, y: null }, profession: 'idle' }
      });
    }
  });
  scheduleWeeklyResetAlarm();
});

/* Próxima segunda 00:00 local + período de 7 dias (revalida no boot do SW) */
function nextMondayMidnightMs(from = Date.now()) {
  const d = new Date(from);
  d.setSeconds(0, 0);
  d.setMinutes(0);
  d.setHours(0);
  const day = d.getDay(); // 0=dom … 1=seg
  const daysToAdd = day === 1 ? 7 : ((8 - day) % 7);
  d.setDate(d.getDate() + daysToAdd);
  return d.getTime();
}

function scheduleWeeklyResetAlarm() {
  try {
    chrome.alarms.create('clawdWeeklyReset', {
      when: nextMondayMidnightMs(),
      periodInMinutes: 10080
    });
  } catch (_) {}
}

scheduleWeeklyResetAlarm();
try {
  chrome.runtime.onStartup.addListener(() => scheduleWeeklyResetAlarm());
} catch (_) {}

/* v3.3: Processamento do alarm semanal */
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== 'clawdWeeklyReset') return;
  /* Notifica todas as abas para resetar o desafio semanal */
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, { action: 'weeklyReset' }).catch(() => {});
      }
    });
  });
});

/* ---- Persistência do host em storage.session (sobrevive ao SW dormir) ---- */
function persistHost() {
  try { chrome.storage.session.set({ clawdHostTabId: hostTabId }); } catch (_) {}
}
function restoreHost(cb) {
  try {
    chrome.storage.session.get(['clawdHostTabId'], (res) => {
      // Só restaura session se a memória ainda não tem host vivo (evita clobber pós-viagem).
      if (hostTabId == null && res && res.clawdHostTabId != null) {
        hostTabId = res.clawdHostTabId;
      }
      cb && cb();
    });
  } catch (_) { cb && cb(); }
}

function scrubLastError() {
  try {
    const err = chrome.runtime.lastError;
    return err ? String(err.message || err) : '';
  } catch (_) {
    return '';
  }
}

function clearTravelDebounce() {
  if (travelDebounce == null) return;
  clearTimeout(travelDebounce);
  travelDebounce = null;
}

function clearTravelInFlight() {
  if (!travelInFlight) return;
  clearTimeout(travelInFlight.timeout);
  travelInFlight = null;
}

function send(tabId, msg) {
  const port = ports.get(tabId);
  if (!port) return false;
  try {
    port.postMessage(msg);
  } catch (_) {
    scrubLastError();
    ports.delete(tabId);
    return false;
  }
  // postMessage em canal já no bfcache pode setar lastError sem lançar.
  const errMsg = scrubLastError();
  if (errMsg) {
    ports.delete(tabId);
    return false;
  }
  return true;
}

function getSettings(cb) {
  chrome.storage.local.get(['clawdState'], (res) => {
    scrubLastError();
    const s = (res && res.clawdState || {}).settings || {};
    cb({
      crossTab: s.crossTab !== false,
      travelFreq: CLAWD_TRAVEL_FREQS.includes(s.travelFreq) ? s.travelFreq : 'sometimes'
    });
  });
}

/* ---- Escolhe/atribui a aba anfitriã ---- */
function assignHost(tabId) {
  clearTravelInFlight();
  clearTravelDebounce();
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
  clearTravelDebounce();
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
  clearTravelDebounce();
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    scrubLastError();
    const activeId = tabs[0]?.id;
    if (activeId != null && ports.has(activeId)) { assignHost(activeId); return; }
    const first = ports.keys().next();
    if (!first.done) assignHost(first.value);
    else { hostTabId = null; persistHost(); }
  });
}

function handlePresenceMessage(tabId, raw) {
  const msg = clawdValidatePortMessage(raw);
  if (!msg) return;
  switch (msg.type) {
    case 'register':
      restoreHost(() => {
        // Mid-travel: só a porta importa — não reassign/hide (evita pet invisível).
        if (travelInFlight) return;
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
      // Só a origem da viagem em curso pode confirmar (evita spoof de outra aba).
      if (travelInFlight && travelInFlight.from === tabId) {
        completeTravel();
      }
      break;
  }
}

/* ---- Conexões dos content scripts ---- */
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'clawd-presence') return;
  const tabId = port.sender?.tab?.id;
  if (tabId == null) return;
  ports.set(tabId, port);

  port.onMessage.addListener((raw) => {
    handlePresenceMessage(tabId, raw);
  });

  port.onDisconnect.addListener(() => {
    scrubLastError();
    // Só remove se ainda for ESTE port (reconexão rápida pode ter substituído).
    if (ports.get(tabId) === port) ports.delete(tabId);
    else scrubLastError();
    const midTravel = travelInFlight;
    const lostDestination = midTravel && midTravel.to === tabId;
    const lostOrigin = midTravel && midTravel.from === tabId;
    if (midTravel && (lostOrigin || lostDestination)) {
      clearTravelInFlight();
      // Destino caiu no meio: origem já despawnou — respawna em qualquer aba viva.
      if (lostDestination) {
        respawnAnywhere();
        return;
      }
    }
    // aba anfitriã fechou → respawn imediato na aba ativa
    if (tabId === hostTabId && !ports.has(tabId)) {
      hostTabId = null;
      persistHost();
      respawnAnywhere();
    }
  });
});

/* ---- Troca de aba ativa: o pet "sente saudade" e viaja ---- */
chrome.tabs.onActivated.addListener(({ tabId }) => {
  getSettings((settings) => {
    scrubLastError();
    if (!settings.crossTab) return;
    if (settings.travelFreq === 'rarely') return;          // só viaja quando o host fecha
    if (tabId === hostTabId || !ports.has(tabId)) return;
    if (settings.travelFreq === 'sometimes' && Math.random() < 0.5) return;
    clearTravelDebounce();
    travelDebounce = setTimeout(() => {
      travelDebounce = null;
      // ainda é a aba ativa e registrada?
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        scrubLastError();
        if (tabs[0]?.id === tabId && ports.has(tabId)) travel(tabId);
      });
    }, 10000); // 10s depois, sente saudade
  });
});

/* ---- Aba anfitriã removida (redundância ao onDisconnect) ---- */
chrome.tabs.onRemoved.addListener((tabId) => {
  ports.delete(tabId);
  clearTravelDebounce();
  const midTravel = travelInFlight;
  const lostDestination = midTravel && midTravel.to === tabId;
  if (midTravel && (midTravel.from === tabId || lostDestination)) {
    clearTravelInFlight();
    if (lostDestination) {
      respawnAnywhere();
      return;
    }
  }
  if (tabId === hostTabId) {
    hostTabId = null;
    persistHost();
    respawnAnywhere();
  }
});
