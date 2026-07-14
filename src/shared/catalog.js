/* ===================================================
   CLAW'D v3 — CATÁLOGO COMPARTILHADO
   Carregado tanto pelo content script quanto pelo popup.
   Zero dependências — apenas globais.
   =================================================== */

var CLAWD_SCHEMA_VERSION = 3;

var CLAWD_DAILY_QUESTS = [
  { type: 'pets', target: 3, label: 'Dê carinho ao Claw\'d 3 vezes', rewardXp: 18, rewardCoins: 4 },
  { type: 'feed', target: 2, label: 'Alimente seu companheiro 2 vezes', rewardXp: 16, rewardCoins: 4 },
  { type: 'play', target: 2, label: 'Brinque com o pet 2 vezes', rewardXp: 16, rewardCoins: 4 },
  { type: 'dance', target: 2, label: 'Dance junto 2 vezes', rewardXp: 18, rewardCoins: 5 },
  { type: 'walk', target: 3, label: 'Faça o pet passear 3 vezes', rewardXp: 20, rewardCoins: 5 },
  { type: 'fish', target: 2, label: 'Pesque 2 vezes', rewardXp: 20, rewardCoins: 5 },
  { type: 'goals', target: 2, label: 'Marque 2 golaços', rewardXp: 22, rewardCoins: 6 }
];

function clawdDailyQuestForDate(date = new Date().toISOString().slice(0, 10)) {
  const hash = String(date).split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return { date, ...CLAWD_DAILY_QUESTS[hash % CLAWD_DAILY_QUESTS.length], progress: 0, claimed: false };
}

function clawdEnsureDailyQuest(state, date = new Date().toISOString().slice(0, 10)) {
  if (!state.daily || state.daily.date !== date) state.daily = clawdDailyQuestForDate(date);
  return state.daily;
}

function clawdRegisterDailyProgress(state, type, amount = 1) {
  const quest = clawdEnsureDailyQuest(state);
  if (quest.type !== type || quest.claimed) return quest;
  quest.progress = Math.min(quest.target, (quest.progress || 0) + amount);
  return quest;
}

/* ---- Curva de XP progressiva ----
   XP necessário para passar do nível n para n+1 = 50 × n^1.3 */
function clawdXpForLevel(n) {
  return Math.round(50 * Math.pow(n, 1.3));
}
function clawdLevelFromXp(xp) {
  let level = 1;
  let remaining = xp;
  while (remaining >= clawdXpForLevel(level) && level < 99) {
    remaining -= clawdXpForLevel(level);
    level++;
  }
  return { level, into: remaining, next: clawdXpForLevel(level) };
}

/* ---- Raridade de conquistas ---- */
var CLAWD_RARITY = {
  common:    { label: 'Comum',   color: '#95a5a6', glow: 'rgba(149,165,166,0.5)', stars: 1 },
  rare:      { label: 'Raro',    color: '#3498db', glow: 'rgba(52,152,219,0.6)',  stars: 2 },
  epic:      { label: 'Épico',   color: '#9b59b6', glow: 'rgba(155,89,182,0.7)',  stars: 3 },
  legendary: { label: 'Lendário', color: '#f1c40f', glow: 'rgba(241,196,15,0.8)', stars: 4 }
};

/* ---- Acessórios (2 slots: head + face) ---- */
var CLAWD_ACCESSORIES = {
  cap:        { slot: 'head', emoji: '🧢', label: 'Boné',            desc: 'Boné esportivo com aba, painéis e botão', unlock: { type: 'free' } },
  tophat:     { slot: 'head', emoji: '🎩', label: 'Cartola',          desc: 'Cartola clássica com faixa violeta', unlock: { type: 'shop', price: 40 } },
  crown:      { slot: 'head', emoji: '👑', label: 'Coroa',            desc: 'Coroa dourada com três joias', unlock: { type: 'level', level: 20 } },
  chefhat:    { slot: 'head', emoji: '👨‍🍳', label: 'Chapéu Chef',     desc: 'Touca de chef com gomos e faixa', unlock: { type: 'shop', price: 35 } },
  ninjaband:  { slot: 'head', emoji: '🥷', label: 'Faixa Ninja',      desc: 'Faixa ninja com nó e pontas ao vento', unlock: { type: 'shop', price: 35 } },
  fishhat:    { slot: 'head', emoji: '🎣', label: 'Chapéu Pescador', desc: 'Chapelão de pesca com aba larga e distintivo', unlock: { type: 'free' } },
  propeller:  { slot: 'head', emoji: '🪖', label: 'Capacete Hélice', desc: 'Capacete colorido com hélice animada', unlock: { type: 'shop', price: 45 } },
  glasses:    { slot: 'face', emoji: '👓', label: 'Óculos',          desc: 'Armação leve com lentes translúcidas', unlock: { type: 'free' } },
  sunglasses: { slot: 'face', emoji: '🕶️', label: 'Óc. de Sol',     desc: 'Óculos escuros com lentes, ponte e reflexo', unlock: { type: 'free' } },
  bow:        { slot: 'face', emoji: '🎀', label: 'Laço',            desc: 'Laço rosa com centro destacado', unlock: { type: 'free' } },
  headphones: { slot: 'face', emoji: '🎧', label: 'Fones',           desc: 'Fones acolchoados sobre a cabeça', unlock: { type: 'free' } },
  scarf:      { slot: 'face', emoji: '🧣', label: 'Cachecol',        desc: 'Cachecol vermelho com ponta animada', unlock: { type: 'shop', price: 30 } },
  backpack:   { slot: 'face', emoji: '🎒', label: 'Mochilinha',      desc: 'Mochila compacta com bolso e fivela', unlock: { type: 'shop', price: 30 } },
  medal:      { slot: 'face', emoji: '🏅', label: 'Medalha',         desc: 'Medalha dourada presa por fita', unlock: { type: 'level', level: 10 } }
};

/* ---- Profissões ---- */
var CLAWD_PROFESSIONS = {
  idle:       { emoji: '🐾', label: 'Livre',     desc: 'Sem profissão específica' },
  footballer: { emoji: '⚽', label: 'Jogador',   desc: 'Embaixadinhas e gols' },
  tutor:      { emoji: '📚', label: 'Tutor',     desc: 'Desafios anti-procrastinação' },
  engineer:   { emoji: '💻', label: 'Dev',       desc: 'Digita e reage a código' },
  musician:   { emoji: '🎸', label: 'Músico',    desc: 'Riffs em sites de música' },
  chef:       { emoji: '🧑‍🍳', label: 'Chef',     desc: 'Alimentar 2× mais eficaz' },
  ninja:      { emoji: '🥷', label: 'Ninja',     desc: 'Se esconde e surpreende' },
  fisher:     { emoji: '🎣', label: 'Pescador',  desc: 'Pesca em um lago pixelado' }
};

/* ---- Ações ---- */
var CLAWD_ACTIONS = {
  wave:       { emoji: '👋', label: 'Acenar' },
  dance:      { emoji: '🕺', label: 'Dançar' },
  happy:      { emoji: '❤️', label: 'Carinho' },
  feed:       { emoji: '🍖', label: 'Alimentar' },
  somersault: { emoji: '🤸', label: 'Cambalhota' },
  play:       { emoji: '🎾', label: 'Brincar' },
  pose:       { emoji: '📸', label: 'Pose' },
  bath:       { emoji: '🫧', label: 'Banho' },
  sleep:      { emoji: '😴', label: 'Dormir' },
  wake:       { emoji: '☀️', label: 'Acordar' },
  fish:       { emoji: '🎣', label: 'Pescar' },
  jump:       { emoji: '🦘', label: 'Pular' },
  stretch:    { emoji: '🤾', label: 'Esticar' },
  roar:       { emoji: '🦁', label: 'Rugir' }
};

/* ---- Sub-Pets ---- */
var CLAWD_SUBPETS = {
  dog:    { emoji: '🐶', label: 'Cachorro',  level: 2,  special: 'Busca a bola quando o Claw\'d chuta' },
  cat:    { emoji: '🐱', label: 'Gato',      level: 3,  special: 'Dorme junto; às vezes ignora (é um gato)' },
  bird:   { emoji: '🐦', label: 'Pássaro',   level: 4,  special: 'Voa em círculos e pousa na cabeça' },
  rabbit: { emoji: '🐰', label: 'Coelho',    level: 5,  special: 'Pula junto nas comemorações' },
  dino:   { emoji: '🦖', label: 'Dinossauro', level: 7, special: 'Dispara pela tela com "RAWR!"' },
  dragon: { emoji: '🐉', label: 'Dragão',    level: 10, special: 'Cospe fogo pixel-art' },
  ghost:  { emoji: '👻', label: 'Fantasma',  level: 12, special: 'Aparece e some do nada' },
  slime:  { emoji: '🟢', label: 'Slime',     level: 15, special: 'Se divide ao receber carinho' }
};

/* ---- Loja (PixelCoins) ---- */
var CLAWD_SHOP = {
  tophat:     { emoji: '🎩', label: 'Cartola',       price: 40,  kind: 'accessory' },
  scarf:      { emoji: '🧣', label: 'Cachecol',       price: 30,  kind: 'accessory' },
  backpack:   { emoji: '🎒', label: 'Mochilinha',     price: 30,  kind: 'accessory' },
  chefhat:    { emoji: '👨‍🍳', label: 'Chapéu Chef',   price: 35,  kind: 'accessory' },
  ninjaband:  { emoji: '🥷', label: 'Faixa Ninja',    price: 35,  kind: 'accessory' },
  propeller:  { emoji: '🪖', label: 'Hélice Cabeça',  price: 45,  kind: 'accessory' },
  medal:      { emoji: '🏅', label: 'Medalha',         price: 55,  kind: 'accessory' },
  ball_gold:  { emoji: '🟡', label: 'Bola Dourada',   price: 60,  kind: 'ball' },
  ball_beach: { emoji: '🏖️', label: 'Bola de Praia',  price: 40,  kind: 'ball' },
  cushion:    { emoji: '🛏️', label: 'Almofada',        price: 50,  kind: 'decor' }
};

/* ---- Conquistas ---- */
var CLAWD_ACHIEVEMENTS = {
  first_pet:   { emoji: '🐾', label: 'Primeiro Carinho',  desc: '1º clique no pet',            rarity: 'common',    check: (g) => (g.counters.pets || 0) >= 1,           goal: 1,   counter: 'pets' },
  striker:     { emoji: '⚽', label: 'Artilheiro',        desc: '50 gols',                     rarity: 'rare',      check: (g) => (g.counters.goals || 0) >= 50,          goal: 50,  counter: 'goals' },
  juggler:     { emoji: '🤹', label: 'Malabarista',       desc: '30 embaixadinhas seguidas',   rarity: 'epic',      check: (g) => (g.counters.keepyRecord || 0) >= 30,    goal: 30,  counter: 'keepyRecord' },
  combo_king:  { emoji: '🔥', label: 'Rei do Combo',      desc: '50 embaixadinhas seguidas',   rarity: 'legendary', check: (g) => (g.counters.keepyRecord || 0) >= 50,    goal: 50,  counter: 'keepyRecord' },
  zoo:         { emoji: '🦁', label: 'Zoológico',         desc: 'Desbloquear 4 sub-pets',      rarity: 'rare',      check: (g) => (g.counters.subpetsUnlocked || 0) >= 4, goal: 4,   counter: 'subpetsUnlocked' },
  sleepyhead:  { emoji: '💤', label: 'Dorminhoco',        desc: 'Pet dormiu 100 vezes',        rarity: 'common',    check: (g) => (g.counters.sleeps || 0) >= 100,        goal: 100, counter: 'sleeps' },
  fashionista: { emoji: '👗', label: 'Fashionista',       desc: 'Usar 8 acessórios diferentes', rarity: 'rare',     check: (g) => (g.counters.accessoriesUsed || []).length >= 8, goal: 8, counter: 'accessoriesUsed' },
  explorer:    { emoji: '🗺️', label: 'Explorador',        desc: '10 abas diferentes num dia',  rarity: 'common',    check: (g) => (g.counters.tabsToday || 0) >= 10,      goal: 10,  counter: 'tabsToday' },
  fisherman:   { emoji: '🎣', label: 'Pescador',           desc: 'Pescar 20 vezes',             rarity: 'rare',      check: (g) => (g.counters.fish || 0) >= 20,           goal: 20,  counter: 'fish' },
  bigcatch:    { emoji: '🐟', label: 'Peixe Grande',      desc: 'Pescar 1 peixe raro',         rarity: 'epic',      check: (g) => (g.counters.rareFish || 0) >= 1,        goal: 1,   counter: 'rareFish' },
  marathoner:  { emoji: '🏃', label: 'Maratonista',       desc: 'Passear 500 vezes',           rarity: 'rare',      check: (g) => (g.counters.walks || 0) >= 500,         goal: 500, counter: 'walks' },
  dance_fever: { emoji: '🕺', label: 'Febre de Dança',    desc: 'Dançar 50 vezes',             rarity: 'common',    check: (g) => (g.counters.dances || 0) >= 50,         goal: 50,  counter: 'dances' }
};

/* ---- Cores padrão ---- */
var CLAWD_COLORS = ['#c71515', '#e67e22', '#f1c40f', '#2ecc71', '#3498db', '#9b59b6', '#e84393', '#1abc9c'];

/* ---- Cores de camisa (Jogador) ---- */
var CLAWD_JERSEYS = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#ffffff', '#111111', '#9b59b6', '#e67e22'];

/* ---- Estado padrão v3 ---- */
function clawdDefaultState() {
  return {
    schemaVersion: CLAWD_SCHEMA_VERSION,
    position: { x: null, y: null },
    name: "Claw'd",
    color: '#c71515',
    scale: 1.5,
    showSpeech: true,
    showMouth: true,
    autoWalk: true,
    sleepEnabled: true,
    animSpeed: 1,
    profession: 'idle',
    smooth: false,
    outline: false,
    accessoryHead: 'none',
    accessoryFace: 'none',
    skin: 'normal',          // normal | droopy | robot
    tagTheme: 'light',       // light | dark | neon | invisible
    jerseyColor: '#e74c3c',
    ballSkin: 'classic',     // classic | ball_gold | ball_beach
    xp: 0,
    stats: { happiness: 80, hunger: 80, energy: 90, hygiene: 85, lastStatsUpdate: 0 },
    game: {
      coins: 0, coinFrac: 0,
      streak: { days: 0, lastDay: '' },
      achievements: {},
      counters: { pets: 0, goals: 0, keepyRecord: 0, sleeps: 0, tabsToday: 0, tabsDay: '', tabsSeen: [], subpetsUnlocked: 0, accessoriesUsed: [], fish: 0, rareFish: 0, walks: 0, dances: 0 },
      inventory: []
    },
    favorites: { actions: [], professions: [], accessories: [], colors: [], nicknames: [], subpets: [] },
    nicknameHistory: [],
    subpets: { active: null, unlocked: [], names: {}, colors: {} },
    daily: clawdDailyQuestForDate(),
    settings: {
      crossTab: true,
      travelFreq: 'sometimes',   // rarely | sometimes | always
      footprints: false,
      sounds: false,
      soundVolume: 0.4,
      quietStart: '',            // "09:00"
      quietEnd: '',
      blockedSites: [],
      startCorner: 'br',         // br | bl | tr | tl
      performanceMode: false
    }
  };
}

/* ---- Migração incremental de saves antigos ---- */
function clawdMigrateState(raw) {
  const def = clawdDefaultState();
  if (!raw || typeof raw !== 'object') return def;
  const v = raw.schemaVersion || 1;
  // Merge raso preservando tudo que já existe
  const merged = Object.assign({}, def, raw);
  merged.stats     = Object.assign({}, def.stats, raw.stats || {});
  merged.game      = Object.assign({}, def.game, raw.game || {});
  merged.game.streak       = Object.assign({}, def.game.streak, (raw.game || {}).streak || {});
  merged.game.counters     = Object.assign({}, def.game.counters, (raw.game || {}).counters || {});
  merged.game.achievements = Object.assign({}, (raw.game || {}).achievements || {});
  merged.game.inventory    = ((raw.game || {}).inventory || []).slice();
  merged.favorites = Object.assign({}, def.favorites, raw.favorites || {});
  merged.subpets   = Object.assign({}, def.subpets, raw.subpets || {});
  merged.subpets.names = Object.assign({}, def.subpets.names, (raw.subpets || {}).names || {});
  merged.subpets.colors = Object.assign({}, def.subpets.colors, (raw.subpets || {}).colors || {});
  merged.daily     = Object.assign({}, def.daily, raw.daily || {});
  clawdEnsureDailyQuest(merged);
  merged.settings  = Object.assign({}, def.settings, raw.settings || {});
  if (v < 3) {
    // v1/v2: acessório único → slot correto; nível recalculado pela nova curva mantendo o XP
    if (raw.accessory && raw.accessory !== 'none') {
      const acc = CLAWD_ACCESSORIES[raw.accessory];
      if (acc && acc.slot === 'head') merged.accessoryHead = raw.accessory;
      else merged.accessoryFace = raw.accessory;
    }
    delete merged.accessory;
    merged.xp = raw.xp || 0;
  }
  merged.schemaVersion = CLAWD_SCHEMA_VERSION;
  return merged;
}

/* ---- Ciclo de vida seguro do contexto MV3 ---- */
function clawdHasExtensionContext(api) {
  try {
    return !!(api && api.runtime && api.runtime.id && api.storage && api.storage.local);
  } catch (_) {
    return false;
  }
}

function clawdIsExtensionContextError(error) {
  const message = String(error && (error.message || error) || '');
  return /extension context invalidated|context invalidated/i.test(message);
}

function clawdSafeExtensionCall(api, operation, options = {}) {
  const fallback = Object.prototype.hasOwnProperty.call(options, 'fallback') ? options.fallback : null;
  const invalidate = (error) => {
    if (typeof options.onInvalidated === 'function') {
      try { options.onInvalidated(error); } catch (_) {}
    }
    return fallback;
  };

  if (!clawdHasExtensionContext(api)) return invalidate(new Error('Extension context invalidated.'));
  try {
    const result = operation();
    if (result && typeof result.then === 'function') {
      return result.catch(error => {
        if (clawdIsExtensionContextError(error) || !clawdHasExtensionContext(api)) return invalidate(error);
        throw error;
      });
    }
    return result;
  } catch (error) {
    if (clawdIsExtensionContextError(error) || !clawdHasExtensionContext(api)) return invalidate(error);
    throw error;
  }
}

function clawdGuardExtensionCallback(api, callback, onInvalidated) {
  return (...args) => clawdSafeExtensionCall(api, () => callback(...args), {
    fallback: undefined,
    onInvalidated
  });
}

// Export opcional para validações locais sem alterar o carregamento da extensão.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CLAWD_DAILY_QUESTS,
    CLAWD_ACCESSORIES,
    CLAWD_PROFESSIONS,
    CLAWD_ACTIONS,
    CLAWD_SUBPETS,
    CLAWD_SHOP,
    CLAWD_ACHIEVEMENTS,
    CLAWD_COLORS,
    clawdDailyQuestForDate,
    clawdEnsureDailyQuest,
    clawdRegisterDailyProgress,
    clawdDefaultState,
    clawdLevelFromXp,
    clawdMigrateState,
    clawdHasExtensionContext,
    clawdIsExtensionContextError,
    clawdSafeExtensionCall,
    clawdGuardExtensionCallback
  };
}
