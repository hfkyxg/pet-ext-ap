/* ===================================================
   CLAW'D — NÚCLEO COMPARTILHADO v2.1
   Carregado pelo content script, popup e service worker.
   Expõe o global CLAWD com constantes, regras de nível,
   o catálogo de profissões (Strategy) e o ClawdStore
   (fonte única de estado persistido, com sincronização
   entre abas via chrome.storage.onChanged — Observer).
   =================================================== */

const CLAWD = (() => {
  'use strict';

  const STORAGE_KEY = 'clawdState';

  /* ---- Gamificação ---- */
  const XP_PER_LEVEL = 50;
  const XP_REWARDS = Object.freeze({ affection: 5, goal: 10 });

  const levelForXp = (xp) => Math.floor((xp || 0) / XP_PER_LEVEL) + 1;
  const levelProgress = (xp) => ((xp || 0) % XP_PER_LEVEL) / XP_PER_LEVEL;

  /* ---- Profissões (Strategy) ----
     Cada profissão descreve seu próprio visual, contexto de
     páginas e reações; o motor apenas consome estes dados. */
  const PROFESSIONS = Object.freeze({
    idle: {
      icon: '🐾',
      status: 'Modo livre — sem profissão ativa',
      accessory: null,
      celebrates: false,
      keywords: [],
      messages: []
    },
    footballer: {
      icon: '⚽',
      status: 'Jogador ativo — celebra em sites esportivos',
      accessory: 'cap',
      celebrates: true,
      keywords: ['ge.globo', 'espn', 'lance', 'goal.com', 'sofascore', 'futbol', 'football', 'sport'],
      messages: ['Goool! ⚽', 'Vamos time! 🏆', 'Assistindo futebol? ⚽', 'Partida boa? 🏟️']
    },
    tutor: {
      icon: '📚',
      status: 'Tutor ativo — monitorando foco de estudo',
      accessory: 'glasses',
      celebrates: false,
      keywords: ['youtube', 'twitter', 'x.com', 'instagram', 'facebook', 'tiktok', 'reddit'],
      messages: ['Foca nos estudos! 📚', 'Sem distrações! 🎯', 'Hora de estudar! ✏️', 'Que tal uma pausa produtiva? 🧠']
    },
    engineer: {
      icon: '💻',
      status: 'Dev ativo — reagindo a repositórios e docs',
      accessory: 'headphones',
      celebrates: false,
      keywords: ['github', 'gitlab', 'stackoverflow', 'developer.', 'docs.', 'mdn', 'npmjs', 'pypi'],
      messages: ['Código limpo! 💻', 'PR aprovado? 🚀', 'Git push! 📦', 'Stack overflow aberto 👀']
    }
  });

  const DEFAULT_STATE = Object.freeze({
    name: "Claw'd",
    color: '#c71515',
    scale: 1.5,
    animSpeed: 1,
    showSpeech: true,
    autoWalk: true,
    sleepEnabled: true,
    profession: 'idle',
    smooth: false,
    outline: false,
    accessory: 'none',
    xp: 0,
    position: { x: null, y: null }
  });

  const sameValue = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  /* ---- Store (Observer + write-behind) ----
     Cache em memória com gravação debounced (read-merge-write)
     e notificação de mudanças vindas de outros contextos
     (outras abas ou o popup). Escritas próprias não geram eco. */
  class ClawdStore {
    constructor() {
      this.state = { ...DEFAULT_STATE };
      this._pending = new Map();
      this._flushTimer = null;
      this._subscribers = new Set();

      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local' || !changes[STORAGE_KEY]) return;
        const next = changes[STORAGE_KEY].newValue || {};
        for (const [key, value] of Object.entries(next)) {
          if (this._pending.has(key)) continue;          // escrita local ainda em trânsito
          if (sameValue(this.state[key], value)) continue; // eco da própria escrita
          this.state[key] = value;
          this._subscribers.forEach((fn) => fn(key, value));
        }
      });
    }

    load() {
      return new Promise((resolve) => {
        chrome.storage.local.get([STORAGE_KEY], (result) => {
          this.state = { ...DEFAULT_STATE, ...(result[STORAGE_KEY] || {}) };
          resolve(this.state);
        });
      });
    }

    get(key) {
      return this.state[key];
    }

    set(key, value) {
      this.state[key] = value;
      this._pending.set(key, value);
      clearTimeout(this._flushTimer);
      this._flushTimer = setTimeout(() => this._flush(), 150);
    }

    /* Mudanças vindas de FORA deste contexto: fn(key, value) */
    subscribe(fn) {
      this._subscribers.add(fn);
    }

    _flush() {
      if (!this._pending.size) return;
      const batch = Object.fromEntries(this._pending);
      this._pending.clear();
      chrome.storage.local.get([STORAGE_KEY], (result) => {
        chrome.storage.local.set({
          [STORAGE_KEY]: { ...(result[STORAGE_KEY] || {}), ...batch }
        });
      });
    }

    /* Gravação de tiro único para sobreviver ao fechamento do
       contexto (pagehide do popup / navegação da aba). */
    flushNow() {
      clearTimeout(this._flushTimer);
      if (!this._pending.size) return;
      const batch = Object.fromEntries(this._pending);
      this._pending.clear();
      chrome.storage.local.set({ [STORAGE_KEY]: { ...this.state, ...batch } });
    }
  }

  return {
    STORAGE_KEY,
    XP_PER_LEVEL,
    XP_REWARDS,
    levelForXp,
    levelProgress,
    PROFESSIONS,
    DEFAULT_STATE,
    ClawdStore
  };
})();
