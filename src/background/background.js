/* ===================================================
   CLAW'D v3 — SERVICE WORKER (MV3)
   PresenceManager: coordena o "passeio entre abas".
   Apenas 1 pet visível no navegador quando o modo
   cross-tab está ligado.
   Validadores / selectors: SSOT em catalog.js
   =================================================== */

importScripts('../shared/i18n.js', '../shared/catalog.js');

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
      files: ['src/shared/i18n.js', 'src/shared/catalog.js', 'src/content/content.js']
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

/* ===================================================
   Pomodoro (Foco) — fonte de verdade no service worker.
   Estado ao vivo em storage.local['clawdFocus'] (chave própria,
   para não conflitar com as escritas frequentes de clawdState pelo content).
   =================================================== */
const FOCUS_KEY = 'clawdFocus';
const FOCUS_ALARM = 'clawdPomodoro';

function focusToday() {
  return new Date().toISOString().slice(0, 10);
}

function focusDefaults() {
  return clawdDefaultState().focus;
}

function loadFocus(cb) {
  chrome.storage.local.get([FOCUS_KEY, 'clawdState'], (res) => {
    scrubLastError();
    const def = focusDefaults();
    const focus = clawdSanitizeFocusBlock((res && res[FOCUS_KEY]) || def, def);
    const settings = ((res && res.clawdState) || {}).settings || {};
    cb(focus, settings);
  });
}

function applyFocusAlarm(focus) {
  try { chrome.alarms.clear(FOCUS_ALARM); } catch (_) {}
  if (focus && focus.enabled && !focus.paused && focus.phaseEndsAt > Date.now()) {
    try { chrome.alarms.create(FOCUS_ALARM, { when: focus.phaseEndsAt }); } catch (_) {}
  }
}

function broadcastFocus(focus) {
  chrome.tabs.query({}, (tabs) => {
    scrubLastError();
    tabs.forEach((tab) => {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, { action: 'focusState', focus }).catch(() => {});
      }
    });
  });
}

function commitFocus(focus, respond) {
  chrome.storage.local.set({ [FOCUS_KEY]: focus }, () => {
    scrubLastError();
    applyFocusAlarm(focus);
    broadcastFocus(focus);
    if (respond) respond({ ok: true, focus });
  });
}

/** Semeia durações e autoStart a partir das preferências (settings). */
function seedFocusDurations(focus, settings) {
  const num = (v, lo, hi, dv) => {
    const n = (typeof clawdClampInt === 'function') ? clawdClampInt(v, lo, hi) : null;
    return n == null ? dv : n;
  };
  return {
    ...focus,
    workMin: num(settings.pomodoroWorkMin, 1, 180, 25),
    breakMin: num(settings.pomodoroBreakMin, 1, 60, 5),
    longBreakMin: num(settings.pomodoroLongBreakMin, 1, 120, 15),
    cyclesPerLong: num(settings.pomodoroCyclesPerLong, 1, 12, 4),
    autoStart: settings.pomodoroAutoStart !== false
  };
}

function handleFocusAction(action, respond) {
  loadFocus((focus, settings) => {
    const now = Date.now();
    const day = focusToday();
    let next = focus;
    if (action === 'focusStart') {
      const base = seedFocusDurations({
        ...focusDefaults(),
        sessionsToday: focus.sessionsDay === day ? focus.sessionsToday : 0,
        sessionsDay: day,
        phase: 'idle'
      }, settings);
      next = clawdPomodoroNextPhase(base, now, day); // idle → work
    } else if (action === 'focusSkip') {
      next = focus.enabled ? advanceFocusPhase(focus, now, day) : focus;
    } else if (action === 'focusPause') {
      if (focus.enabled && !focus.paused && focus.phaseEndsAt > now) {
        next = { ...focus, paused: true, pausedRemainingMs: focus.phaseEndsAt - now, phaseEndsAt: 0 };
      }
    } else if (action === 'focusResume') {
      if (focus.enabled && focus.paused && focus.pausedRemainingMs > 0) {
        next = { ...focus, paused: false, phaseEndsAt: now + focus.pausedRemainingMs, pausedRemainingMs: 0 };
      }
    } else if (action === 'focusStop') {
      next = {
        ...focus, enabled: false, paused: false, phase: 'idle',
        phaseEndsAt: 0, pausedRemainingMs: 0, cyclesDone: 0
      };
    }
    commitFocus(next, respond);
  });
}

/** Avança de fase; respeita autoStart=false entrando na próxima fase pausada. */
function advanceFocusPhase(focus, now, day) {
  const next = clawdPomodoroNextPhase(focus, now, day);
  if (focus.autoStart === false) {
    return { ...next, paused: true, pausedRemainingMs: Math.max(0, next.phaseEndsAt - now), phaseEndsAt: 0 };
  }
  return next;
}

function reconcileFocusAlarm() {
  loadFocus((focus) => {
    const now = Date.now();
    if (focus.enabled && !focus.paused && focus.phaseEndsAt > 0 && focus.phaseEndsAt <= now) {
      /* Fase venceu enquanto o SW dormia — avança agora. */
      commitFocus(advanceFocusPhase(focus, now, focusToday()));
    } else {
      applyFocusAlarm(focus);
    }
  });
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== FOCUS_ALARM) return;
  loadFocus((focus) => {
    if (!focus.enabled || focus.paused) return;
    commitFocus(advanceFocusPhase(focus, Date.now(), focusToday()));
  });
});

chrome.runtime.onMessage.addListener((raw, _sender, sendResponse) => {
  const msg = clawdValidateRuntimeMessage(raw);
  if (!msg) return;
  const focusActions = ['focusStart', 'focusPause', 'focusResume', 'focusStop', 'focusSkip'];
  if (focusActions.includes(msg.action)) {
    handleFocusAction(msg.action, sendResponse);
    return true; // resposta assíncrona
  }
});

try {
  chrome.runtime.onStartup.addListener(() => reconcileFocusAlarm());
} catch (_) {}
reconcileFocusAlarm();

/* ---- Escolhe/atribui a aba anfitriã ---- */
function assignHost(tabId) {
  clearTravelInFlight();
  clearTravelDebounce();
  const prevHost = hostTabId;
  hostTabId = tabId;
  persistHost();
  for (const [id] of ports) {
    if (id === tabId) send(id, { type: 'spawnPet' });
    else send(id, { type: 'hidePet' });
  }
  /* Host anterior sem Port vivo (SW dormiu / aba zumbi) — força hide via tabs API. */
  if (prevHost != null && prevHost !== tabId && !ports.has(prevHost)) {
    try {
      chrome.tabs.sendMessage(prevHost, { action: 'forceHidePet' }, () => { scrubLastError(); });
    } catch (_) {
      scrubLastError();
    }
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
  /* Esconde todas as outras abas imediatamente — evita clone durante a animação. */
  for (const [id] of ports) {
    if (id !== from && id !== toTabId) send(id, { type: 'hidePet' });
  }
  send(toTabId, { type: 'hidePet' });
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
  let spawned = false;
  for (const [id] of ports) {
    if (id === to) {
      spawned = send(to, {
        type: 'spawnPet',
        direction: direction === 'left' ? 'right' : 'left'
      });
    } else {
      send(id, { type: 'hidePet' });
    }
  }
  if (!spawned) {
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
        // Mid-travel: origem anima saída; demais abas ficam ocultas (nunca clone).
        if (travelInFlight) {
          if (tabId !== travelInFlight.from) send(tabId, { type: 'hidePet' });
          return;
        }
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
    case 'requestHost':
      /* Aba ativa pediu o pet (ação do popup) — traz ownership imediatamente. */
      if (ports.has(tabId) && tabId !== hostTabId) {
        if (travelInFlight) {
          clearTravelInFlight();
        }
        assignHost(tabId);
      } else if (tabId === hostTabId) {
        send(tabId, { type: 'spawnPet' });
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

/* ---- Popup: convocar pet + Trello ---- */
chrome.runtime.onMessage.addListener((raw, _sender, sendResponse) => {
  const msg = clawdValidateRuntimeMessage(raw);
  if (!msg) return;

  if (msg.action === 'summonPetToTab') {
    const tabId = msg.tabId;
    if (tabId == null || !ports.has(tabId)) {
      sendResponse({ ok: false });
      return;
    }
    assignHost(tabId);
    sendResponse({ ok: true });
    return;
  }

  if (msg.action === 'createTrelloCard') {
    createTrelloCard(msg).then(sendResponse).catch(() => sendResponse({ ok: false, error: 'network' }));
    return true;
  }
});

/**
 * Cria card no Trello via API. Secrets em chrome.storage.local (clawdTrello).
 * Nunca loga key/token.
 */
async function createTrelloCard(msg) {
  const stored = await chrome.storage.local.get(['clawdTrello', 'clawdState']);
  const secrets = stored.clawdTrello || {};
  const settings = (stored.clawdState && stored.clawdState.settings) || {};
  const key = String(secrets.apiKey || '').trim();
  const token = String(secrets.token || '').trim();
  const boardId = String(secrets.boardId || settings.trelloBoardId || '').trim();
  if (!key || !token || !boardId) {
    return { ok: false, error: 'missing_credentials' };
  }
  if (!/^[A-Za-z0-9]{16,64}$/.test(key) || !/^[A-Za-z0-9]{16,128}$/.test(token)) {
    return { ok: false, error: 'invalid_credentials' };
  }
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(boardId)) {
    return { ok: false, error: 'invalid_board' };
  }

  const name = clawdSanitizePlainText(msg.name, 120);
  const desc = clawdSanitizePlainText(msg.desc, 2000);
  if (!name) return { ok: false, error: 'empty_name' };

  const kindLabel = msg.kind === 'bug' ? '[Bug]' : '[Idea]';
  const cardName = `${kindLabel} ${name}`.slice(0, 140);

  const listsUrl = `https://api.trello.com/1/boards/${encodeURIComponent(boardId)}/lists?key=${encodeURIComponent(key)}&token=${encodeURIComponent(token)}&fields=id,name`;
  const listsRes = await fetch(listsUrl);
  if (!listsRes.ok) return { ok: false, error: 'lists_failed', status: listsRes.status };
  const lists = await listsRes.json();
  if (!Array.isArray(lists) || !lists.length || !lists[0].id) {
    return { ok: false, error: 'no_lists' };
  }
  const idList = lists[0].id;

  const body = new URLSearchParams({
    idList,
    name: cardName,
    desc: desc || '',
    key,
    token
  });
  const cardRes = await fetch('https://api.trello.com/1/cards', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });
  if (!cardRes.ok) return { ok: false, error: 'create_failed', status: cardRes.status };
  const card = await cardRes.json();
  return { ok: true, id: card && card.id ? String(card.id) : undefined };
}
