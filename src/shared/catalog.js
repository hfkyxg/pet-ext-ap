/* ===================================================
   CLAW'D v3 — CATÁLOGO COMPARTILHADO
   Carregado tanto pelo content script quanto pelo popup.
   Zero dependências — apenas globais.
   =================================================== */

var CLAWD_SCHEMA_VERSION = 4;

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

/* ---- Modelos do pet (silhuetas na mesma grade 4 px) ---- */
var CLAWD_MODELS = {
  classic:  { label: 'Clássico',  badge: '01', desc: 'O modelo compacto vermelho da referência original.' },
  mini:     { label: 'Mini',      badge: '02', desc: 'Corpo menor e ágil, sem perder o alinhamento dos acessórios.' },
  claws:    { label: 'Pinças',    badge: '03', desc: 'Braços elevados com pinças laterais mais expressivas.' },
  guardian: { label: 'Guardião',  badge: '04', desc: 'Silhueta larga, firme e com pernas robustas.' }
};

/* ---- Rostos independentes da silhueta e das emoções ---- */
var CLAWD_FACE_STYLES = {
  classic: { label: 'Clássico',  badge: '•', desc: 'Olhos quadrados fiéis ao sprite original.' },
  sparkle: { label: 'Brilho',    badge: '✦', desc: 'Reflexos pixelados que deixam o olhar mais vivo.' },
  focused: { label: 'Focado',    badge: '⌁', desc: 'Sobrancelhas angulares para uma expressão determinada.' },
  sleepy:  { label: 'Sonolento', badge: '–', desc: 'Olhos em traço, calmos mesmo durante o repouso.' }
};

var CLAWD_SKINS = {
  normal: { label: 'Normal', desc: 'Silhueta limpa, sem detalhes adicionais.' },
  droopy: { label: 'Orelhas', desc: 'Detalhes laterais caídos em pixel-art.' },
  robot:  { label: 'Robô', desc: 'Antena, luz de status e parafusos metálicos.' }
};

/* ---- Profissões ---- */
var CLAWD_PROFESSIONS = {
  idle:       { emoji: '🐾', label: 'Livre',     desc: 'Sem profissão específica', gear: {} },
  footballer: { emoji: '⚽', label: 'Jogador',   desc: 'Embaixadinhas e gols', gear: { head: 'cap' } },
  tutor:      { emoji: '📚', label: 'Tutor',     desc: 'Desafios anti-procrastinação', gear: { face: 'glasses' } },
  engineer:   { emoji: '💻', label: 'Dev',       desc: 'Digita e reage a código', gear: { face: 'headphones' } },
  musician:   { emoji: '🎸', label: 'Músico',    desc: 'Riffs em sites de música', gear: { face: 'sunglasses' } },
  chef:       { emoji: '🧑‍🍳', label: 'Chef',     desc: 'Alimentar 2× mais eficaz', gear: { head: 'chefhat' } },
  ninja:      { emoji: '🥷', label: 'Ninja',     desc: 'Se esconde e surpreende', gear: { head: 'ninjaband' } },
  fisher:     { emoji: '🎣', label: 'Pescador',  desc: 'Pesca em um lago pixelado', gear: { head: 'fishhat' } }
};

/* O uniforme profissional é apenas visual e temporário. A seleção pessoal
   continua salva para voltar assim que o pet retorna ao modo Livre. */
function clawdEffectiveAccessories(state = {}) {
  const profession = Object.prototype.hasOwnProperty.call(CLAWD_PROFESSIONS, state.profession)
    ? state.profession
    : 'idle';
  const gear = CLAWD_PROFESSIONS[profession].gear || {};
  const validForSlot = (id, slot) => CLAWD_ACCESSORIES[id]?.slot === slot ? id : null;
  const userHead = validForSlot(state.accessoryHead, 'head') || 'none';
  const userFace = validForSlot(state.accessoryFace, 'face') || 'none';
  const autoHead = validForSlot(gear.head, 'head');
  const autoFace = validForSlot(gear.face, 'face');

  return {
    profession,
    head: autoHead || userHead,
    face: autoFace || userFace,
    userHead,
    userFace,
    autoHead,
    autoFace,
    headSource: autoHead ? 'profession' : 'personal',
    faceSource: autoFace ? 'profession' : 'personal'
  };
}

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
  roar:       { emoji: '🦁', label: 'Rugir' },
  spin:       { emoji: '🌀', label: 'Girar' },
  bounce:     { emoji: '⬆️', label: 'Pularzinho' },
  wink:       { emoji: '😉', label: 'Piscadinha' },
  cheer:      { emoji: '🎉', label: 'Torcer' },
  sneak:      { emoji: '🥷', label: 'Esgueirar' },
  clap:       { emoji: '👏', label: 'Bater palma' },
  peek:       { emoji: '👀', label: 'Espiar' },
  roll:       { emoji: '🎱', label: 'Rolar' },
  balloon:    { emoji: '🎈', label: 'Balão' },
  hug:        { emoji: '🤗', label: 'Abraçar' }
};

/* ---- Sub-Pets ---- */
var CLAWD_SUBPETS = {
  dog:    { emoji: '🐶', label: 'Cachorro',  level: 1,  special: 'Busca a bola quando o Claw\'d chuta' },
  cat:    { emoji: '🐱', label: 'Gato',      level: 2,  special: 'Dorme junto; às vezes ignora (é um gato)' },
  bird:   { emoji: '🐦', label: 'Pássaro',   level: 3,  special: 'Voa em círculos e pousa na cabeça' },
  rabbit: { emoji: '🐰', label: 'Coelho',    level: 4,  special: 'Pula junto nas comemorações' },
  dino:   { emoji: '🦖', label: 'Dinossauro', level: 6, special: 'Dispara pela tela com "RAWR!"' },
  dragon: { emoji: '🐉', label: 'Dragão',    level: 8,  special: 'Abre as asas, voa pela tela e cospe fogo' },
  ghost:  { emoji: '👻', label: 'Fantasma',  level: 10, special: 'Aparece e some do nada' },
  slime:  { emoji: '🟢', label: 'Slime',     level: 12, special: 'Se divide ao receber carinho' }
};

/* ---- Interações manuais dos Sub-Pets ---- */
var CLAWD_SUBPET_ACTIONS = {
  cuddle:    { emoji: '🫶', label: 'Carinho',   feedback: 'Carinho compartilhado!' },
  play:      { emoji: '🎾', label: 'Brincar',   feedback: 'Hora de brincar!' },
  explore:   { emoji: '🔎', label: 'Explorar',  feedback: 'Explorando a página!' },
  spin:      { emoji: '🌀', label: 'Rodopiar',  feedback: 'Rodopio completo!' },
  celebrate: { emoji: '🎉', label: 'Comemorar', feedback: 'Dupla em festa!' },
  hug:       { emoji: '🤗', label: 'Abraço',    feedback: 'Abraço em dupla!' },
  special:   { emoji: '✨', label: 'Especial',   feedback: 'Habilidade da espécie!' }
};

/* ---- Sprites pixel dos Sub-Pets (grade ~12×9 @ 4px) ----
   Fonte única consumida por content, popup e docs/showcase.
   Letras: B corpo, D sombra, K olhos, + cores extras por espécie. */
var CLAWD_SUBPET_CELL = 4;

var CLAWD_SUBPET_SPRITES = {
  dog: {
    colors: { B: '#8d5a2b', D: '#5b3a1a', K: '#111111', W: '#f5e9dc' },
    frames: {
      idle: [
        ['..DD....DD..', '.DBBBBBBBBD.', 'DBKBBBBKBBBD', 'DBBBBWWBBBBD', '.DBBBBBBBBD.', '..DBBBBBBD..', '...BB..BB...', '...B....B...', '............'],
        ['..DD....DD..', '.DBBBBBBBBD.', 'DBKBBBBKBBBD', 'DBBBBWWBBBBD', '.DBBBBBBBBD.', '..DBBBBBBD..', '...BB..BB...', '....B..B....', '............']
      ],
      walk: [
        ['..DD....DD..', '.DBBBBBBBBD.', 'DBKBBBBKBBBD', 'DBBBBWWBBBBD', '.DBBBBBBBBD.', '..DBBBBBBD..', '..BB....BB..', '.B........B.', '............'],
        ['..DD....DD..', '.DBBBBBBBBD.', 'DBKBBBBKBBBD', 'DBBBBWWBBBBD', '.DBBBBBBBBD.', '..DBBBBBBD..', '...BB..BB...', '....B..B....', '............'],
        ['..DD....DD..', '.DBBBBBBBBD.', 'DBKBBBBKBBBD', 'DBBBBWWBBBBD', '.DBBBBBBBBD.', '..DBBBBBBD..', '....BBBB....', '...B....B...', '............']
      ],
      sleep: [
        ['..DD....DD..', '.DBBBBBBBBD.', 'DB.BBBB.BBBD', 'DBBBBWWBBBBD', '.DBBBBBBBBD.', '..DBBBBBBD..', '...BBBBBB...', '............', '............']
      ]
    }
  },
  cat: {
    colors: { B: '#7f8c8d', D: '#525c5d', K: '#111111', P: '#e8a0bf' },
    frames: {
      idle: [
        ['.D......D...', 'D.BBBBBB.D..', '.BKBBBBKB...', '.BBBPBBBB...', '.DBBBBBBD...', '..BBBBBB....', '..B....B....', '..B....B.D..', '.........D..'],
        ['.D......D...', 'D.BBBBBB.D..', '.BKBBBBKB...', '.BBBPBBBB...', '.DBBBBBBD...', '..BBBBBB....', '..B....B....', '...B..B..D..', '.........D..']
      ],
      walk: [
        ['.D......D...', 'D.BBBBBB.D..', '.BKBBBBKB...', '.BBBPBBBB...', '.DBBBBBBD...', '..BBBBBB....', '.B......B...', 'B........B..', '.........D..'],
        ['.D......D...', 'D.BBBBBB.D..', '.BKBBBBKB...', '.BBBPBBBB...', '.DBBBBBBD...', '..BBBBBB....', '..B....B....', '...B..B.....', '.........D..'],
        ['.D......D...', 'D.BBBBBB.D..', '.BKBBBBKB...', '.BBBPBBBB...', '.DBBBBBBD...', '..BBBBBB....', '...BBBB.....', '..B....B.D..', '.........D..']
      ],
      sleep: [
        ['.D......D...', 'D.BBBBBB.D..', '.B.BBBB.B...', '.BBBPBBBB...', '.DBBBBBBD...', '..BBBBBB....', '..BBBBBB....', '.........D..', '............']
      ]
    }
  },
  bird: {
    colors: { B: '#f1c40f', D: '#e67e22', K: '#111111', W: '#ffffff' },
    frames: {
      idle: [
        ['....BBB.....', '...BKBBB....', '..DBBBBBW...', '..BBBBBB....', '...BDDB.....', '....D.D.....', '............', '............', '............'],
        ['....BBB.....', '...BKBBB....', '..DBBBBBW...', '..BBBBBB....', '...BDDB.....', '.....D.D....', '............', '............', '............']
      ],
      walk: [
        ['....BBB.....', '...BKBBB....', '.D.BBBBBWW..', '..BBDBBB....', '...BBBB.....', '....D.D.....', '............', '............', '............'],
        ['....BBB.....', '...BKBBB....', '..WBBBBBD...', '..BBBBDB....', '...BBBB.....', '....D.D.....', '............', '............', '............']
      ],
      flying: [
        ['..W.BBB.W...', '.W.BKBBBW.W.', '..DBBBBBD...', '..BBBBBB....', '...BDDB.....', '............', '............', '............', '............'],
        ['.W..BBB..W..', 'W..BKBBB..W.', '..DBBBBBD...', '..BBBBBB....', '...BDDB.....', '............', '............', '............', '............'],
        ['W...BBB...W.', '..WBKBBBW...', '..DBBBBBD...', '..BBBBBB....', '...BDDB.....', '............', '............', '............', '............']
      ],
      sleep: [
        ['....BBB.....', '...B.BBB....', '..DBBBBBW...', '..BBBBBB....', '...BDDB.....', '....D.D.....', '............', '............', '............']
      ]
    }
  },
  rabbit: {
    colors: { B: '#ecf0f1', D: '#bdc3c7', K: '#111111', P: '#fbb1c8' },
    frames: {
      idle: [
        ['.D....D.....', '.B....B.....', '.BBBBBB.....', 'BKBBBBKB....', 'BBBBPBBB....', '.DBBBBBD....', '..B....B....', '..B....B....', '............'],
        ['.D....D.....', '.B....B.....', '.BBBBBB.....', 'BKBBBBKB....', 'BBBBPBBB....', '.DBBBBBD....', '..B....B....', '...B..B.....', '............']
      ],
      walk: [
        ['.D....D.....', '.B....B.....', '.BBBBBB.....', 'BKBBBBKB....', 'BBBBPBBB....', '.DBBBBBD....', '.B......B...', 'B........B..', '............'],
        ['.D....D.....', '.B....B.....', '.BBBBBB.....', 'BKBBBBKB....', 'BBBBPBBB....', '.DBBBBBD....', '..B....B....', '...B..B.....', '............']
      ],
      sleep: [
        ['.D....D.....', '.B....B.....', '.BBBBBB.....', 'B.BBBB.B....', 'BBBBPBBB....', '.DBBBBBD....', '..BBBBBB....', '............', '............']
      ]
    }
  },
  dino: {
    colors: { B: '#27ae60', D: '#1e8449', K: '#111111', W: '#f4d03f' },
    frames: {
      idle: [
        ['...W.BBB....', '..WBBKBB....', '.DBBBBBB....', 'DBBBBBBBBD..', '.BBBBBBBB...', '..B....B....', '..B....B....', '..D....D....', '............'],
        ['...W.BBB....', '..WBBKBB....', '.DBBBBBB....', 'DBBBBBBBBD..', '.BBBBBBBB...', '..B....B....', '...B..B.....', '...D..D.....', '............']
      ],
      walk: [
        ['...W.BBB....', '..WBBKBB....', '.DBBBBBB....', 'DBBBBBBBBD..', '.BBBBBBBB...', '.B......B...', 'B........B..', 'D........D..', '............'],
        ['...W.BBB....', '..WBBKBB....', '.DBBBBBB....', 'DBBBBBBBBD..', '.BBBBBBBB...', '..B....B....', '...B..B.....', '...D..D.....', '............']
      ],
      sleep: [
        ['...W.BBB....', '..WBB.BB....', '.DBBBBBB....', 'DBBBBBBBBD..', '.BBBBBBBB...', '..BBBBBB....', '............', '............', '............']
      ]
    }
  },
  dragon: {
    colors: { B: '#8e44ad', D: '#5b2c6f', K: '#111111', F: '#e74c3c', W: '#f39c12', A: '#c39bd3' },
    frames: {
      idle: [
        ['W.A.....D.A.', '.A.BBBBB.ADA', '.A.DBKBBBDD.', '.ADBBBBBBDA.', 'DBBBBBBBBB..', '.BBBB.B.....', '..B....B....', '..B....B....', '............'],
        ['W.A.....D.A.', '.A.BBBBB.ADA', '.A.DBKBBBDD.', '.ADBBBBBBDA.', 'DBBBBBBBBB..', '.BBBB.B.....', '..B....B....', '...B..B.....', '............']
      ],
      walk: [
        ['W.A.....D.A.', '.A.BBBBB.ADA', '.A.DBKBBBDD.', '.ADBBBBBBDA.', 'DBBBBBBBBB..', '.BBBB.B.....', '.B......B...', 'B........B..', '............'],
        ['W.A.....D.A.', '.A.BBBBB.ADA', '.A.DBKBBBDD.', '.ADBBBBBBDA.', 'DBBBBBBBBB..', '.BBBB.B.....', '..B....B....', '...B..B.....', '............'],
        ['W.A.....D.A.', '.A.BBBBB.ADA', '.A.DBKBBBDD.', '.ADBBBBBBDA.', 'DBBBBBBBBB..', '.BBBB.B.....', '...B..B.....', '..B....B....', '............']
      ],
      flying: [
        ['AAW......DAA', 'AAA.BBBBBA.A', 'A.A.DBKBBBD.', '.ADBBBBBBDA.', 'DBBBBBBBBB..', '.BBBB.......', '............', '............', '............'],
        ['A.W......D.A', 'A.A.BBBBBAA.', 'AA..DBKBBBD.', '.ADBBBBBBDA.', 'DBBBBBBBBB..', '.BBBB.......', '............', '............', '............'],
        ['.AW......DA.', 'AA.BBBBB.AA.', 'A.A.DBKBBBD.', 'A.DBBBBBBDA.', 'DBBBBBBBBB..', '.BBBB.......', '............', '............', '............']
      ],
      sleep: [
        ['W.A.....D.A.', '.A.BBBBB.ADA', '.A.DB.BBBDD.', '.ADBBBBBBDA.', 'DBBBBBBBBB..', '.BBBBBB.....', '............', '............', '............']
      ],
      special: [
        ['AAW.F..F.DAA', 'AAA.BBBBBA.A', 'FA.DBKBBBDD.', 'F.DBBBBBBD.A', 'DBBBBBBBBB..', '.BBBB.B.....', '..B....B....', '..B....B....', '............'],
        ['A.W.F....D.A', 'AFA.BBBBBAA.', 'AAF.DBKBBBD.', '.ADBBBBBBDA.', 'DBBBBBBBBB..', '.BBBB.B.....', '..B....B....', '...B..B.....', '............']
      ]
    }
  },
  ghost: {
    colors: { B: 'rgba(236,240,241,0.92)', D: 'rgba(189,195,199,0.75)', K: '#111111' },
    frames: {
      idle: [
        ['...BBBB.....', '..BBKBKBB...', '.BBBBBBBB...', '.BBBBBBBB...', '.BBBBBBBB...', '.B.B.B.B.B..', '............', '............', '............'],
        ['...BBBB.....', '..BBKBKBB...', '.BBBBBBBB...', '.BBBBBBBB...', '.BBBBBBBB...', '..B.B.B.B...', '............', '............', '............']
      ],
      walk: [
        ['...BBBB.....', '..BBKBKBB...', '.BBBBBBBB...', '.BBBBBBBB...', '.BBBBBBBB...', '.B.B.B.B.B..', '............', '............', '............'],
        ['....BBBB....', '...BBKBKBB..', '..BBBBBBBB..', '..BBBBBBBB..', '..BBBBBBBB..', '..B.B.B.B...', '............', '............', '............']
      ],
      sleep: [
        ['...BBBB.....', '..BB.B.BB...', '.BBBBBBBB...', '.BBBBBBBB...', '.BBBBBBBB...', '.B.B.B.B.B..', '............', '............', '............']
      ]
    }
  },
  slime: {
    colors: { B: '#2ecc71', D: '#27ae60', K: '#111111', H: '#a8e6cf' },
    frames: {
      idle: [
        ['....HHHH....', '...BBBBBB...', '..BBKBBKBB..', '.BDBBBBBDB..', '.BBBBBBBBB..', '..BBBBBBBB..', '...BBBBBB...', '............', '............'],
        ['.....HH.....', '...BBBBBB...', '..BBKBBKBB..', '.BDBBBBBDB..', '.BBBBBBBBB..', '..BBBBBBBB..', '...BBBBBB...', '............', '............']
      ],
      walk: [
        ['....HHHH....', '...BBBBBB...', '..BBKBBKBB..', '.BDBBBBBDB..', '.BBBBBBBBB..', '..BBBBBBBB..', '..B.BBB.B...', '............', '............'],
        ['....HHHH....', '...BBBBBB...', '..BBKBBKBB..', '.BDBBBBBDB..', '.BBBBBBBBB..', '..BBBBBBBB..', '...BB.BB....', '............', '............']
      ],
      sleep: [
        ['............', '...BBBBBB...', '..BB.BB.BB..', '.BDBBBBBDB..', '.BBBBBBBBB..', '..BBBBBBBB..', '...BBBBBB...', '............', '............']
      ],
      special: [
        ['....HHHH....', '...BBBBBB...', '..BBKBBKBB..', '.BDBBBBBDB..', 'BBBBBBBBBBBB', '.BBBBBBBBB..', '..BB....BB..', '............', '............']
      ]
    }
  }
};

function clawdShadePixelColor(color, factor = 0.7) {
  const hex = String(color || '').match(/^#([\da-f]{6})$/i);
  if (hex) {
    const rgb = hex[1].match(/[\da-f]{2}/gi).map(part => Math.round(parseInt(part, 16) * factor));
    return `#${rgb.map(part => part.toString(16).padStart(2, '0')).join('')}`;
  }
  const rgba = String(color || '').match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i);
  if (rgba) {
    const r = Math.round(Number(rgba[1]) * factor);
    const g = Math.round(Number(rgba[2]) * factor);
    const b = Math.round(Number(rgba[3]) * factor);
    const a = rgba[4] !== undefined ? Number(rgba[4]) : 1;
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
  return color;
}

function clawdBuildPixelShadow(frame, colors, cell = CLAWD_SUBPET_CELL) {
  const out = [];
  (frame || []).forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const c = colors[row[x]];
      if (c) out.push(`${x * cell}px ${y * cell}px 0 ${c}`);
    }
  });
  return out.join(',');
}

function clawdSubPetPalette(sprite, customColor, customEyeColor) {
  const base = sprite?.colors || {};
  const primary = /^#[\da-f]{6}$/i.test(customColor || '') ? customColor : base.B;
  const eyes = /^#[\da-f]{6}$/i.test(customEyeColor || '') ? customEyeColor : (base.K || '#111111');
  const shaded = /^#[\da-f]{6}$/i.test(customColor || '')
    ? clawdShadePixelColor(primary, 0.68)
    : (base.D || clawdShadePixelColor(primary, 0.68));
  return {
    ...base,
    B: primary,
    D: shaded,
    K: eyes
  };
}

function clawdSubPetFrame(sprite, pose = 'idle', index = 0) {
  const frames = sprite?.frames || {};
  const set = frames[pose] || frames.idle || [];
  if (!set.length) return [];
  return set[index % set.length] || set[0] || [];
}

function clawdSubPetBounds(sprite) {
  const frame = clawdSubPetFrame(sprite, 'idle', 0);
  const cols = Math.max(1, ...(frame.map(row => row.length)));
  const rows = Math.max(1, frame.length);
  return {
    cols,
    rows,
    width: cols * CLAWD_SUBPET_CELL,
    height: rows * CLAWD_SUBPET_CELL
  };
}

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
var CLAWD_COLORS = ['#c71515', '#d97757', '#C15F3C', '#e67e22', '#f1c40f', '#2ecc71', '#3498db', '#9b59b6', '#e84393', '#1abc9c'];

/* ---- Cores de camisa (Jogador) ---- */
var CLAWD_JERSEYS = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#ffffff', '#111111', '#9b59b6', '#e67e22'];

var CLAWD_TAG_THEMES = ['light', 'dark', 'neon', 'invisible'];
var CLAWD_TRAVEL_FREQS = ['rarely', 'sometimes', 'always'];
var CLAWD_START_CORNERS = ['br', 'bl', 'tr', 'tl'];
var CLAWD_BALL_SKINS = ['classic', 'ball_gold', 'ball_beach'];

var CLAWD_CONFIG_KEYS = [
  'name', 'color', 'eyeColor', 'model', 'faceStyle', 'scale', 'animSpeed',
  'smooth', 'outline', 'showMouth', 'showSpeech', 'autoWalk', 'sleepEnabled',
  'skin', 'tagTheme', 'jerseyColor', 'ballSkin', 'accessoryHead', 'accessoryFace',
  'profession'
];

var CLAWD_SETTING_KEYS = [
  'crossTab', 'travelFreq', 'footprints', 'sounds', 'soundVolume',
  'quietStart', 'quietEnd', 'blockedSites', 'startCorner', 'performanceMode'
];

var CLAWD_RUNTIME_ACTIONS = [
  'healthcheck', 'toggleVisibility', 'resetPosition', 'updateConfig',
  'updateSetting', 'triggerAction', 'setSubpet', 'setSubpetColor',
  'setSubpetEyeColor', 'triggerSubpetAction', 'claimDailyQuest', 'getStatus'
];

var CLAWD_PORT_MSG_TYPES = ['register', 'travelComplete'];

var CLAWD_DOM_CLEANUP_SELECTORS = [
  '#aic-clawd-node', '.aic-subpet', '#aic-footprints', '.aic-toast',
  '.aic-lake', '.aic-fishing-line', '.aic-fish-caught', '.aic-goalpost',
  '.aic-toyball', '.aic-dust', '.aic-particle', '.aic-pixel-spark',
  '.aic-walk-dust', '.aic-subpet-particle'
].join(',');

function clawdIsHexColor(value) {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value);
}

function clawdSanitizePlainText(value, maxLen = 80) {
  return String(value == null ? '' : value)
    .replace(/[\u0000-\u001F\u007F<>&"'`]/g, '')
    .trim()
    .slice(0, maxLen);
}

/** Merge raso sem permitir poluição de protótipo via chaves especiais. */
function clawdAssignPlain(target, source) {
  if (!target || typeof target !== 'object') return target;
  if (!source || typeof source !== 'object' || Array.isArray(source)) return target;
  Object.keys(source).forEach((key) => {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') return;
    target[key] = source[key];
  });
  return target;
}

/** Site bloqueado: só hostname exato ou subdomínio (nunca substring solta). */
function clawdHostIsBlocked(hostname, blockedSites) {
  const host = String(hostname || '').trim().toLowerCase();
  if (!host || !Array.isArray(blockedSites)) return false;
  return blockedSites.some((site) => {
    const s = String(site || '').trim().toLowerCase();
    if (!s || s.includes('/') || s.includes(' ') || s.length > 64) return false;
    return host === s || host.endsWith('.' + s);
  });
}

function clawdSanitizeTimeHHMM(value) {
  if (value == null || value === '') return '';
  const s = String(value).trim();
  return /^\d{2}:\d{2}$/.test(s) ? s : null;
}

function clawdSanitizeConfigValue(key, value) {
  switch (key) {
    case 'name':
      return clawdSanitizePlainText(value, 24) || "Claw'd";
    case 'color':
    case 'eyeColor':
    case 'jerseyColor':
      return clawdIsHexColor(value) ? value.toLowerCase() : null;
    case 'model':
      return Object.prototype.hasOwnProperty.call(CLAWD_MODELS, value) ? value : null;
    case 'faceStyle':
      return Object.prototype.hasOwnProperty.call(CLAWD_FACE_STYLES, value) ? value : null;
    case 'skin':
      return Object.prototype.hasOwnProperty.call(CLAWD_SKINS, value) ? value : null;
    case 'profession':
      return Object.prototype.hasOwnProperty.call(CLAWD_PROFESSIONS, value) ? value : null;
    case 'tagTheme':
      return CLAWD_TAG_THEMES.includes(value) ? value : null;
    case 'ballSkin':
      return CLAWD_BALL_SKINS.includes(value) ? value : null;
    case 'accessoryHead':
    case 'accessoryFace':
      if (value === 'none') return 'none';
      return Object.prototype.hasOwnProperty.call(CLAWD_ACCESSORIES, value) ? value : null;
    case 'scale': {
      const n = Number(value);
      return Number.isFinite(n) ? Math.max(0.5, Math.min(3, n)) : null;
    }
    case 'animSpeed': {
      const n = Number(value);
      return Number.isFinite(n) ? Math.max(0.5, Math.min(2, n)) : null;
    }
    case 'smooth':
    case 'outline':
    case 'showMouth':
    case 'showSpeech':
    case 'autoWalk':
    case 'sleepEnabled':
      return !!value;
    default:
      return null;
  }
}

function clawdSanitizeSettingValue(key, value) {
  switch (key) {
    case 'crossTab':
    case 'footprints':
    case 'sounds':
    case 'performanceMode':
      return !!value;
    case 'travelFreq':
      return CLAWD_TRAVEL_FREQS.includes(value) ? value : null;
    case 'startCorner':
      return CLAWD_START_CORNERS.includes(value) ? value : null;
    case 'soundVolume': {
      const n = Number(value);
      return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : null;
    }
    case 'quietStart':
    case 'quietEnd':
      return clawdSanitizeTimeHHMM(value);
    case 'blockedSites':
      if (!Array.isArray(value)) return null;
      return value
        .map(s => clawdSanitizePlainText(s, 64).toLowerCase())
        .filter(Boolean)
        .slice(0, 40);
    default:
      return null;
  }
}

function clawdValidateRuntimeMessage(request) {
  if (!request || typeof request !== 'object') return null;
  const action = request.action;
  if (!CLAWD_RUNTIME_ACTIONS.includes(action)) return null;

  switch (action) {
    case 'healthcheck':
    case 'toggleVisibility':
    case 'resetPosition':
    case 'claimDailyQuest':
    case 'getStatus':
      return { action };

    case 'updateConfig': {
      if (!CLAWD_CONFIG_KEYS.includes(request.key)) return null;
      const value = clawdSanitizeConfigValue(request.key, request.value);
      if (value === null) return null;
      return { action, key: request.key, value };
    }

    case 'updateSetting': {
      if (!CLAWD_SETTING_KEYS.includes(request.key)) return null;
      const value = clawdSanitizeSettingValue(request.key, request.value);
      if (value === null) return null;
      return { action, key: request.key, value };
    }

    case 'triggerAction': {
      if (!Object.prototype.hasOwnProperty.call(CLAWD_ACTIONS, request.value)
        && !['kick', 'keepy', 'highfive', 'superdance'].includes(request.value)) {
        return null;
      }
      return { action, value: request.value };
    }

    case 'setSubpet': {
      if (request.value == null || request.value === '' || request.value === 'none') {
        return { action, value: null };
      }
      if (!Object.prototype.hasOwnProperty.call(CLAWD_SUBPETS, request.value)) return null;
      return { action, value: request.value };
    }

    case 'setSubpetColor':
    case 'setSubpetEyeColor': {
      if (!Object.prototype.hasOwnProperty.call(CLAWD_SUBPETS, request.species)) return null;
      if (!clawdIsHexColor(request.value)) return null;
      return { action, species: request.species, value: request.value.toLowerCase() };
    }

    case 'triggerSubpetAction': {
      if (!Object.prototype.hasOwnProperty.call(CLAWD_SUBPET_ACTIONS, request.value)) return null;
      return { action, value: request.value };
    }

    default:
      return null;
  }
}

function clawdValidatePortMessage(msg) {
  if (!msg || typeof msg !== 'object') return null;
  if (!CLAWD_PORT_MSG_TYPES.includes(msg.type)) return null;
  return { type: msg.type };
}

/* ---- Estado padrão v4 ---- */
function clawdDefaultState() {
  return {
    schemaVersion: CLAWD_SCHEMA_VERSION,
    position: { x: null, y: null },
    name: "Claw'd",
    color: '#d97757',
    eyeColor: '#08080b',
    model: 'classic',
    faceStyle: 'classic',
    scale: 1.5,
    showSpeech: true,
    showMouth: false,
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
      counters: { pets: 0, goals: 0, keepyRecord: 0, keepyTotal: 0, sleeps: 0, tabsToday: 0, tabsDay: '', tabsSeen: [], subpetsUnlocked: 1, accessoriesUsed: [], fish: 0, rareFish: 0, walks: 0, dances: 0 },
      inventory: []
    },
    favorites: { actions: [], professions: [], accessories: [], colors: [], nicknames: [], subpets: [] },
    nicknameHistory: [],
    subpets: { active: 'dog', unlocked: ['dog'], names: {}, colors: {}, eyeColors: {} },
    daily: clawdDailyQuestForDate(),
    settings: {
      crossTab: true,
      travelFreq: 'sometimes',   // rarely | sometimes | always
      footprints: false,
      sounds: true,
      soundVolume: 0.45,
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
  // Merge raso preservando tudo que já existe (sem poluir protótipo)
  const merged = clawdAssignPlain(Object.assign({}, def), raw);
  merged.stats     = clawdAssignPlain(Object.assign({}, def.stats), raw.stats || {});
  merged.game      = clawdAssignPlain(Object.assign({}, def.game), raw.game || {});
  merged.game.streak       = clawdAssignPlain(Object.assign({}, def.game.streak), (raw.game || {}).streak || {});
  merged.game.counters     = clawdAssignPlain(Object.assign({}, def.game.counters), (raw.game || {}).counters || {});
  merged.game.achievements = clawdAssignPlain({}, (raw.game || {}).achievements || {});
  merged.game.inventory    = ((raw.game || {}).inventory || [])
    .filter(id => Object.prototype.hasOwnProperty.call(CLAWD_SHOP, id))
    .slice(0, 80);
  merged.favorites = clawdAssignPlain(Object.assign({}, def.favorites), raw.favorites || {});
  Object.keys(def.favorites).forEach((cat) => {
    const list = Array.isArray(merged.favorites[cat]) ? merged.favorites[cat] : [];
    merged.favorites[cat] = list
      .map(item => clawdSanitizePlainText(item, 48))
      .filter(Boolean)
      .slice(0, 40);
  });
  merged.subpets   = clawdAssignPlain(Object.assign({}, def.subpets), raw.subpets || {});
  merged.subpets.names = clawdAssignPlain({}, (raw.subpets || {}).names || {});
  merged.subpets.colors = clawdAssignPlain({}, (raw.subpets || {}).colors || {});
  merged.subpets.eyeColors = clawdAssignPlain({}, (raw.subpets || {}).eyeColors || {});
  Object.keys(merged.subpets.names).forEach((id) => {
    if (!CLAWD_SUBPETS[id]) { delete merged.subpets.names[id]; return; }
    merged.subpets.names[id] = clawdSanitizePlainText(merged.subpets.names[id], 24);
  });
  Object.keys(merged.subpets.colors).forEach((id) => {
    if (!CLAWD_SUBPETS[id] || !clawdIsHexColor(merged.subpets.colors[id])) delete merged.subpets.colors[id];
    else merged.subpets.colors[id] = merged.subpets.colors[id].toLowerCase();
  });
  Object.keys(merged.subpets.eyeColors).forEach((id) => {
    if (!CLAWD_SUBPETS[id] || !clawdIsHexColor(merged.subpets.eyeColors[id])) delete merged.subpets.eyeColors[id];
    else merged.subpets.eyeColors[id] = merged.subpets.eyeColors[id].toLowerCase();
  });
  merged.subpets.unlocked = Array.isArray(merged.subpets.unlocked) ? [...merged.subpets.unlocked] : [];
  /* Alinha unlocks com o nível real (popup e content passam a concordar). */
  const levelNow = clawdLevelFromXp(merged.xp || 0).level;
  Object.entries(CLAWD_SUBPETS).forEach(([id, defPet]) => {
    if (levelNow >= defPet.level && !merged.subpets.unlocked.includes(id)) {
      merged.subpets.unlocked.push(id);
    }
  });
  merged.subpets.unlocked = [...new Set((merged.subpets.unlocked || [])
    .filter(id => Object.prototype.hasOwnProperty.call(CLAWD_SUBPETS, id)))];
  if (!merged.subpets.unlocked.includes('dog')) merged.subpets.unlocked.unshift('dog');
  if (merged.subpets.active && !Object.prototype.hasOwnProperty.call(CLAWD_SUBPETS, merged.subpets.active)) {
    merged.subpets.active = null;
  }
  const rawSubpets = raw.subpets || {};
  /* Só ativa o cachorro padrão quando o save nunca escolheu companheiro (campo ausente). */
  if (!Object.prototype.hasOwnProperty.call(rawSubpets, 'active')
    && !merged.subpets.active
    && merged.subpets.unlocked.includes('dog')) {
    merged.subpets.active = 'dog';
  }
  merged.game.counters.subpetsUnlocked = merged.subpets.unlocked.length;
  merged.game.streak.days = Math.max(0, Math.min(9999, Number(merged.game.streak.days) || 0));
  merged.game.streak.lastDay = (typeof merged.game.streak.lastDay === 'string'
    && /^\d{4}-\d{2}-\d{2}$/.test(merged.game.streak.lastDay))
    ? merged.game.streak.lastDay
    : '';
  Object.keys(def.game.counters).forEach((key) => {
    const cur = merged.game.counters[key];
    if (Array.isArray(def.game.counters[key])) {
      merged.game.counters[key] = Array.isArray(cur)
        ? cur.map(x => clawdSanitizePlainText(x, 64)).filter(Boolean).slice(0, 80)
        : [];
    } else if (typeof def.game.counters[key] === 'number') {
      merged.game.counters[key] = Math.max(0, Math.min(1e9, Number(cur) || 0));
    } else if (typeof def.game.counters[key] === 'string') {
      merged.game.counters[key] = clawdSanitizePlainText(cur, 32);
    }
  });
  merged.game.coins = Math.max(0, Math.min(1e9, Number(merged.game.coins) || 0));
  merged.xp = Math.max(0, Math.min(5e6, Number(merged.xp) || 0));
  ['happiness', 'hunger', 'energy', 'hygiene'].forEach((k) => {
    merged.stats[k] = Math.max(0, Math.min(100, Number(merged.stats[k]) || 0));
  });
  if (typeof raw.showMouth !== 'boolean') merged.showMouth = false;
  if (raw.settings && typeof raw.settings.sounds !== 'boolean') merged.settings.sounds = true;
  /* Missão diária: nunca reaproveita label/tipo vindos do storage (evita XSS no popup). */
  {
    const rawDaily = (raw.daily && typeof raw.daily === 'object') ? raw.daily : {};
    const date = (typeof rawDaily.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawDaily.date))
      ? rawDaily.date
      : new Date().toISOString().slice(0, 10);
    const quest = clawdDailyQuestForDate(date);
    const sameDay = rawDaily.date === quest.date;
    merged.daily = {
      ...quest,
      progress: sameDay ? Math.max(0, Math.min(quest.target, Number(rawDaily.progress) || 0)) : 0,
      claimed: sameDay ? !!rawDaily.claimed : false
    };
  }
  clawdEnsureDailyQuest(merged);
  merged.settings  = clawdAssignPlain(Object.assign({}, def.settings), raw.settings || {});
  if (v < 3) {
    // v1/v2: acessório único → slot correto; nível recalculado pela nova curva mantendo o XP
    if (raw.accessory && raw.accessory !== 'none') {
      const acc = CLAWD_ACCESSORIES[raw.accessory];
      if (acc && acc.slot === 'head') merged.accessoryHead = raw.accessory;
      else merged.accessoryFace = raw.accessory;
    }
    delete merged.accessory;
    merged.xp = Math.max(0, Math.min(5e6, Number(raw.xp) || 0));
  }
  merged.model = Object.prototype.hasOwnProperty.call(CLAWD_MODELS, raw.model)
    ? raw.model
    : def.model;
  merged.faceStyle = Object.prototype.hasOwnProperty.call(CLAWD_FACE_STYLES, raw.faceStyle)
    ? raw.faceStyle
    : def.faceStyle;
  merged.skin = Object.prototype.hasOwnProperty.call(CLAWD_SKINS, raw.skin)
    ? raw.skin
    : def.skin;
  if (!Object.prototype.hasOwnProperty.call(CLAWD_PROFESSIONS, merged.profession)) {
    merged.profession = def.profession;
  }
  if (merged.accessoryHead !== 'none' && !CLAWD_ACCESSORIES[merged.accessoryHead]) {
    merged.accessoryHead = 'none';
  }
  if (merged.accessoryFace !== 'none' && !CLAWD_ACCESSORIES[merged.accessoryFace]) {
    merged.accessoryFace = 'none';
  }
  if (!CLAWD_TAG_THEMES.includes(merged.tagTheme)) merged.tagTheme = def.tagTheme;
  if (!CLAWD_BALL_SKINS.includes(merged.ballSkin)) merged.ballSkin = def.ballSkin;
  if (!clawdIsHexColor(merged.jerseyColor)) merged.jerseyColor = def.jerseyColor;
  else merged.jerseyColor = merged.jerseyColor.toLowerCase();
  merged.name = clawdSanitizePlainText(merged.name, 24) || def.name;
  merged.scale = Math.max(0.5, Math.min(3, Number(merged.scale) || def.scale));
  merged.animSpeed = Math.max(0.5, Math.min(2, Number(merged.animSpeed) || def.animSpeed));
  if (!CLAWD_TRAVEL_FREQS.includes(merged.settings.travelFreq)) {
    merged.settings.travelFreq = def.settings.travelFreq;
  }
  if (!CLAWD_START_CORNERS.includes(merged.settings.startCorner)) {
    merged.settings.startCorner = def.settings.startCorner;
  }
  merged.settings.soundVolume = Math.max(0, Math.min(1, Number(merged.settings.soundVolume) || 0));
  if (!Array.isArray(merged.settings.blockedSites)) merged.settings.blockedSites = [];
  else {
    merged.settings.blockedSites = merged.settings.blockedSites
      .map(s => clawdSanitizePlainText(s, 64).toLowerCase())
      .filter(Boolean)
      .slice(0, 40);
  }
  merged.eyeColor = typeof raw.eyeColor === 'string' && /^#[0-9a-f]{6}$/i.test(raw.eyeColor)
    ? raw.eyeColor.toLowerCase()
    : def.eyeColor;
  if (!clawdIsHexColor(merged.color)) merged.color = def.color;
  else merged.color = merged.color.toLowerCase();
  merged.nicknameHistory = (Array.isArray(merged.nicknameHistory) ? merged.nicknameHistory : [])
    .map(n => clawdSanitizePlainText(n, 24))
    .filter(Boolean)
    .slice(0, 12);
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
    CLAWD_MODELS,
    CLAWD_FACE_STYLES,
    CLAWD_SKINS,
    CLAWD_PROFESSIONS,
    CLAWD_ACTIONS,
    CLAWD_SUBPETS,
    CLAWD_SUBPET_ACTIONS,
    CLAWD_SUBPET_CELL,
    CLAWD_SUBPET_SPRITES,
    clawdShadePixelColor,
    clawdBuildPixelShadow,
    clawdSubPetPalette,
    clawdSubPetFrame,
    clawdSubPetBounds,
    CLAWD_SHOP,
    CLAWD_ACHIEVEMENTS,
    CLAWD_COLORS,
    clawdDailyQuestForDate,
    clawdEnsureDailyQuest,
    clawdRegisterDailyProgress,
    clawdDefaultState,
    clawdEffectiveAccessories,
    clawdLevelFromXp,
    clawdMigrateState,
    clawdHasExtensionContext,
    clawdIsExtensionContextError,
    clawdSafeExtensionCall,
    clawdGuardExtensionCallback,
    CLAWD_TAG_THEMES,
    CLAWD_TRAVEL_FREQS,
    CLAWD_START_CORNERS,
    CLAWD_BALL_SKINS,
    CLAWD_CONFIG_KEYS,
    CLAWD_SETTING_KEYS,
    CLAWD_RUNTIME_ACTIONS,
    CLAWD_PORT_MSG_TYPES,
    CLAWD_DOM_CLEANUP_SELECTORS,
    clawdIsHexColor,
    clawdSanitizePlainText,
    clawdAssignPlain,
    clawdHostIsBlocked,
    clawdSanitizeConfigValue,
    clawdSanitizeSettingValue,
    clawdValidateRuntimeMessage,
    clawdValidatePortMessage
  };
}
