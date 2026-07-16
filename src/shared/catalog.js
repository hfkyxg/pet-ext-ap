/* ===================================================
   CLAW'D v3 — CATÁLOGO COMPARTILHADO
   Carregado tanto pelo content script quanto pelo popup.
   Zero dependências — apenas globais.
   =================================================== */

var CLAWD_SCHEMA_VERSION = 5;

var CLAWD_DAILY_QUESTS = [
  { type: 'pets',       target: 3, label: 'Dê carinho ao Claw\'d 3 vezes',         rewardXp: 18, rewardCoins: 4 },
  { type: 'feed',       target: 2, label: 'Alimente seu companheiro 2 vezes',        rewardXp: 16, rewardCoins: 4 },
  { type: 'play',       target: 2, label: 'Brinque com o pet 2 vezes',               rewardXp: 16, rewardCoins: 4 },
  { type: 'dance',      target: 2, label: 'Dance junto 2 vezes',                     rewardXp: 18, rewardCoins: 5 },
  { type: 'walk',       target: 3, label: 'Faça o pet passear 3 vezes',              rewardXp: 20, rewardCoins: 5 },
  { type: 'fish',       target: 2, label: 'Pesque 2 vezes',                          rewardXp: 20, rewardCoins: 5 },
  { type: 'goals',      target: 2, label: 'Marque 2 golaços',                        rewardXp: 22, rewardCoins: 6 },
  { type: 'bath',       target: 2, label: 'Dê banho no pet 2 vezes',                 rewardXp: 16, rewardCoins: 4 },
  { type: 'accessories',target: 1, label: 'Troque de acessório pelo menos 1 vez',    rewardXp: 14, rewardCoins: 3 },
  { type: 'subpet',     target: 3, label: 'Interaja com seu sub-pet 3 vezes',        rewardXp: 18, rewardCoins: 5 },
  { type: 'combo',      target: 3, label: 'Faça um combo de 3 ações seguidas',       rewardXp: 22, rewardCoins: 6 },
  { type: 'profession', target: 1, label: 'Use uma profissão por pelo menos 1 ciclo',rewardXp: 20, rewardCoins: 5 }
];

/* ---- Desafios Semanais (rotação por hash da semana ISO) ---- */
var CLAWD_WEEKLY_CHALLENGES = [
  { type: 'fish',    target: 8,  label: 'Pescador da Semana',    desc: 'Pesque 8 vezes nesta semana',          rewardXp: 80, rewardCoins: 20, badge: '🎣' },
  { type: 'dance',   target: 10, label: 'Febre Semanal',         desc: 'Dance 10 vezes nesta semana',           rewardXp: 90, rewardCoins: 22, badge: '🕺' },
  { type: 'pets',    target: 15, label: 'Carinhoso Demais',      desc: 'Dê carinho 15 vezes nesta semana',      rewardXp: 85, rewardCoins: 20, badge: '❤️'  },
  { type: 'walk',    target: 20, label: 'Maratonista Digital',   desc: 'Faça o pet passear 20 vezes',           rewardXp: 95, rewardCoins: 25, badge: '🏃' }
];

function clawdDailyQuestForDate(date = new Date().toISOString().slice(0, 10)) {
  const hash = String(date).split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return { date, ...CLAWD_DAILY_QUESTS[hash % CLAWD_DAILY_QUESTS.length], progress: 0, claimed: false };
}

/* Retorna a semana ISO (YYYY-Www) de uma data */
function clawdISOWeek(date) {
  const d = date ? new Date(date) : new Date();
  const jan4 = new Date(d.getFullYear(), 0, 4);
  const start = new Date(jan4);
  start.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7));
  const diff = d - start;
  const week = Math.floor(diff / 604800000) + 1;
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

function clawdWeeklyChallengeForWeek(weekKey) {
  const hash = String(weekKey).split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return { weekKey, ...CLAWD_WEEKLY_CHALLENGES[hash % CLAWD_WEEKLY_CHALLENGES.length], progress: 0, claimed: false };
}

function clawdEnsureWeeklyChallenge(state) {
  const weekKey = clawdISOWeek();
  if (!state.weekly || state.weekly.weekKey !== weekKey) {
    state.weekly = clawdWeeklyChallengeForWeek(weekKey);
  }
  return state.weekly;
}

function clawdRegisterWeeklyProgress(state, type, amount = 1) {
  const challenge = clawdEnsureWeeklyChallenge(state);
  if (challenge.type !== type || challenge.claimed) return challenge;
  challenge.progress = Math.min(challenge.target, (challenge.progress || 0) + amount);
  return challenge;
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

/* ---- Acessórios (3 slots: head + face + body) ---- */
var CLAWD_ACCESSORIES = {
  /* --- Slot HEAD --- */
  cap:        { slot: 'head', emoji: '🧢', label: 'Boné',             desc: 'Boné esportivo com aba, painéis e botão', unlock: { type: 'free' } },
  tophat:     { slot: 'head', emoji: '🎩', label: 'Cartola',           desc: 'Cartola clássica com faixa violeta', unlock: { type: 'shop', price: 40 } },
  crown:      { slot: 'head', emoji: '👑', label: 'Coroa',             desc: 'Coroa dourada com três joias', unlock: { type: 'level', level: 20 } },
  chefhat:    { slot: 'head', emoji: '👨‍🍳', label: 'Chapéu Chef',      desc: 'Touca de chef com gomos e faixa', unlock: { type: 'shop', price: 35 } },
  ninjaband:  { slot: 'head', emoji: '🥷', label: 'Faixa Ninja',       desc: 'Faixa ninja com nó e pontas ao vento', unlock: { type: 'shop', price: 35 } },
  fishhat:    { slot: 'head', emoji: '🎣', label: 'Chapéu Pescador',   desc: 'Chapelão de pesca com aba larga e distintivo', unlock: { type: 'free' } },
  propeller:  { slot: 'head', emoji: '🪖', label: 'Capacete Hélice',  desc: 'Capacete colorido com hélice animada', unlock: { type: 'shop', price: 45 } },
  witch_hat:  { slot: 'head', emoji: '🧙', label: 'Chapéu Bruxa',     desc: 'Chapéu pontudo com fivela e brim largo', unlock: { type: 'shop', price: 55 } },
  bunny_ears: { slot: 'head', emoji: '🐰', label: 'Orelhas de Coelho', desc: 'Orelhinhas cor-de-rosa suaves e fofas', unlock: { type: 'shop', price: 45 } },
  party_hat:  { slot: 'head', emoji: '🎉', label: 'Chapéu de Festa',   desc: 'Chapéu pontudo listrado com pompom', unlock: { type: 'level', level: 5 } },
  visor:      { slot: 'head', emoji: '🎮', label: 'Viseira Gamer',     desc: 'Viseira futurista com LEDs laterais', unlock: { type: 'shop', price: 60 } },
  /* --- Slot FACE --- */
  glasses:    { slot: 'face', emoji: '👓', label: 'Óculos',            desc: 'Armação leve com lentes translúcidas', unlock: { type: 'free' } },
  sunglasses: { slot: 'face', emoji: '🕶️', label: 'Óc. de Sol',       desc: 'Óculos escuros com lentes, ponte e reflexo', unlock: { type: 'free' } },
  bow:        { slot: 'face', emoji: '🎀', label: 'Laço',              desc: 'Laço rosa com centro destacado', unlock: { type: 'free' } },
  headphones: { slot: 'face', emoji: '🎧', label: 'Fones',             desc: 'Fones acolchoados sobre a cabeça', unlock: { type: 'free' } },
  scarf:      { slot: 'face', emoji: '🧣', label: 'Cachecol',          desc: 'Cachecol vermelho com ponta animada', unlock: { type: 'shop', price: 30 } },
  backpack:   { slot: 'face', emoji: '🎒', label: 'Mochilinha',        desc: 'Mochila compacta com bolso e fivela', unlock: { type: 'shop', price: 30 } },
  medal:      { slot: 'face', emoji: '🏅', label: 'Medalha',           desc: 'Medalha dourada presa por fita', unlock: { type: 'level', level: 10 } },
  monocle:    { slot: 'face', emoji: '🧐', label: 'Monóculo',          desc: 'Lente elegante com corrente dourada', unlock: { type: 'level', level: 10 } },
  mustache:   { slot: 'face', emoji: '🥸', label: 'Bigodão',           desc: 'Bigode estiloso para um visual distinto', unlock: { type: 'shop', price: 30 } },
  /* --- Slot HEAD extra (v3.5) --- */
  halo:       { slot: 'head', emoji: '😇', label: 'Auréola',           desc: 'Anel dourado flutuante de anjo pixel', unlock: { type: 'level', level: 25 } },
  horns:      { slot: 'head', emoji: '😈', label: 'Chifrinhos',         desc: 'Chifres vermelhos de diabinho travesso', unlock: { type: 'shop', price: 40 } },
  headband:   { slot: 'head', emoji: '🤸', label: 'Bandana',            desc: 'Bandana colorida de atleta', unlock: { type: 'free' } },
  /* --- Slot FACE extra (v3.5) --- */
  blush:      { slot: 'face', emoji: '🥰', label: 'Blush',             desc: 'Bochechas coradas de animê fofinho', unlock: { type: 'free' } },
  /* --- Slot BODY (v3.3) --- */
  ribbon:     { slot: 'body', emoji: '🎗️', label: 'Laço de Pescoço',  desc: 'Laçinho delicado de seda no pescoço', unlock: { type: 'free' } },
  wings:      { slot: 'body', emoji: '🪶', label: 'Asas',              desc: 'Asas leves que permitem planeio suave', unlock: { type: 'level', level: 15 } },
  cape:       { slot: 'body', emoji: '🦸', label: 'Capa de Herói',     desc: 'Capa esvoaçante de super-herói', unlock: { type: 'shop', price: 80 } },
  armor:      { slot: 'body', emoji: '🛡️', label: 'Armadura',          desc: 'Armadura pixel-art com detalhes metálicos', unlock: { type: 'shop', price: 100 } },
  /* --- Slot BODY extra (v3.5) --- */
  scarf_body: { slot: 'body', emoji: '🧣', label: 'Cachecol Corpo',    desc: 'Cachecol enrolado no pescoço, ponta ao vento', unlock: { type: 'shop', price: 35 } }
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
  idle:       { emoji: '🐾', label: 'Livre',     desc: 'Sem profissão específica',                    gear: {} },
  footballer: { emoji: '⚽', label: 'Jogador',   desc: 'Embaixadinhas e gols',                        gear: { head: 'cap' } },
  tutor:      { emoji: '📚', label: 'Tutor',     desc: 'Desafios anti-procrastinação',                gear: { face: 'glasses' } },
  engineer:   { emoji: '💻', label: 'Dev',       desc: 'Digita e reage a código',                     gear: { face: 'headphones' } },
  musician:   { emoji: '🎸', label: 'Músico',    desc: 'Riffs em sites de música',                    gear: { face: 'sunglasses' } },
  chef:       { emoji: '🧑‍🍳', label: 'Chef',     desc: 'Alimentar 2× mais eficaz',                    gear: { head: 'chefhat' } },
  ninja:      { emoji: '🥷', label: 'Ninja',     desc: 'Se esconde e surpreende',                     gear: { head: 'ninjaband' } },
  fisher:     { emoji: '🎣', label: 'Pescador',  desc: 'Pesca em um lago pixelado',                   gear: { head: 'fishhat' } },
  doctor:     { emoji: '🩺', label: 'Médico',    desc: '+3 higiene por banho, reage a sites de saúde', gear: { face: 'monocle' } },
  artist:     { emoji: '🎨', label: 'Artista',   desc: 'Partículas de estrelas ao posar e meditar',   gear: { face: 'monocle' } },
  gamer:      { emoji: '🎮', label: 'Gamer',     desc: 'Reage a sites de jogos, XP bônus em combos', gear: { head: 'visor', face: 'headphones' } },
  streamer:   { emoji: '📡', label: 'Streamer',  desc: 'Dança em streaming, balão especial na aba',   gear: { head: 'party_hat', face: 'headphones' } }
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
  const userBody = validForSlot(state.accessoryBody, 'body') || 'none';
  const autoHead = validForSlot(gear.head, 'head');
  const autoFace = validForSlot(gear.face, 'face');

  return {
    profession,
    head: autoHead || userHead,
    face: autoFace || userFace,
    body: userBody,
    userHead,
    userFace,
    userBody,
    autoHead,
    autoFace,
    headSource: autoHead ? 'profession' : 'personal',
    faceSource: autoFace ? 'profession' : 'personal',
    bodySource: 'personal'
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
  hug:        { emoji: '🤗', label: 'Abraçar' },
  flip:       { emoji: '🔄', label: 'Acrobacia' },
  meditate:   { emoji: '🧘', label: 'Meditar' },
  electric:   { emoji: '⚡', label: 'Descarga' },
  nap:        { emoji: '💤', label: 'Cochilo' }
};

/* ---- Sub-Pets ---- */
var CLAWD_SUBPETS = {
  dog:    { emoji: '🐶', label: 'Cachorro',   level: 1,  special: 'Leal, abana o rabo quando feliz' },
  cat:    { emoji: '🐱', label: 'Gato',       level: 2,  special: 'Independente, dorme o dia todo' },
  bird:   { emoji: '🐦', label: 'Pássaro',    level: 3,  special: 'Canta e voa pela tela' },
  rabbit: { emoji: '🐰', label: 'Coelho',     level: 4,  special: 'Rápido, pula em saltos duplos' },
  dino:   { emoji: '🦕', label: 'Dinossauro', level: 6,  special: 'Clássico, de pisada pesada' },
  dragon: { emoji: '🐉', label: 'Dragão',     level: 8,  special: 'Raro, cospe fogo no desafio' },
  ghost:  { emoji: '👻', label: 'Fantasma',   level: 10, special: 'Atravessa paredes, aparece à noite' },
  slime:  { emoji: '🟢', label: 'Slime',      level: 12, special: 'Grudento, se divide ao comer' }
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

/* ---- Sub-pet pixel art (shared: content + popup + docs)
   Grade 12×10 @4px. Referência "Subpets — 8 companheiros":
   corpo chapado, olhos em linha (KK), patas soltas, lineless igual ao Claw'd.
   B=corpo, D=sombra/orelha, K=olho, P=rosa, Y=amarelo, R=bico/pé, E=olho slime, +extras. */
var CLAWD_SUBPET_CELL = 4;

var CLAWD_SUBPET_SPRITES = {
  dog: {
    colors: { B: "#c4783a", D: "#8a4f22", K: "#111111", W: "#fff3e0", P: "#ff7aa2", C: "#e8a050" },
    image: { url: 'src/shared/sprites/subpets/dog.png', width: 48, height: 40, gridW: 12, gridH: 10 },
    frames: {
      idle: [
      [
        '............',
        '..D......D..',
        '.DBBBBBBBBD.',
        'BBBBBBBBBBBB',
        'BBBKKBBKKBBB',
        'BBBBBKKBBBBB',
        'BBBBBPPBBBBB',
        '.BB......BB.',
        '..D......D..',
        '............'
      ],
      [
        '............',
        '..D......D..',
        '.DBBBBBBBBD.',
        'BBBBBBBBBBBB',
        'BBBKKBBKKBBB',
        'BBBBBKKBBBBB',
        'BBBBBPPBBBBB',
        '.BB......BB.',
        '.D........D.',
        '............'
      ]
      ],
      walk: [
      [
        '............',
        '..D......D..',
        '.DBBBBBBBBD.',
        'BBBBBBBBBBBB',
        'BBBKKBBKKBBB',
        'BBBBBKKBBBBB',
        'BBBBBPPBBBBB',
        '.BB......BB.',
        '.D........D.',
        '............'
      ],
      [
        '............',
        '..D......D..',
        '.DBBBBBBBBD.',
        'BBBBBBBBBBBB',
        'BBBKKBBKKBBB',
        'BBBBBKKBBBBB',
        'BBBBBPPBBBBB',
        '.BB......BB.',
        '..D......D..',
        '............'
      ]
      ],
      sleep: [
      [
        '............',
        '..D......D..',
        '.DBBBBBBBBD.',
        'BBBBBBBBBBBB',
        'BB........BB',
        'BBBBBKKBBBBB',
        'BBBBBPPBBBBB',
        '............',
        '............',
        '............'
      ]
      ]
    }
  },
  cat: {
    colors: { B: "#b0b8c0", D: "#6e7680", K: "#111111", W: "#ffffff", P: "#f2a0b8", C: "#e8eef4" },
    image: { url: 'src/shared/sprites/subpets/cat.png', width: 48, height: 40, gridW: 12, gridH: 10 },
    frames: {
      idle: [
      [
        '............',
        '.D.P....P.D.',
        '.DPP....PPD.',
        '.BBBBBBBBBB.',
        'BBBKKBBKKBBB',
        'BBBKKBBKKBBB',
        'BBBBBPPBBBBB',
        '.BB......BB.',
        '..D......D..',
        '............'
      ],
      [
        '............',
        '.D.P....P.D.',
        '.DPP....PPD.',
        '.BBBBBBBBBB.',
        'BBBKKBBKKBBB',
        'BBBKKBBKKBBB',
        'BBBBBPPBBBBB',
        '.BB......BB.',
        '..D......D..',
        '............'
      ]
      ],
      walk: [
      [
        '............',
        '.D.P....P.D.',
        '.DPP....PPD.',
        '.BBBBBBBBBB.',
        'BBBKKBBKKBBB',
        'BBBKKBBKKBBB',
        'BBBBBPPBBBBB',
        '.BB......BB.',
        '.D........D.',
        '............'
      ],
      [
        '............',
        '.D.P....P.D.',
        '.DPP....PPD.',
        '.BBBBBBBBBB.',
        'BBBKKBBKKBBB',
        'BBBKKBBKKBBB',
        'BBBBBPPBBBBB',
        '.BB......BB.',
        '..D......D..',
        '............'
      ]
      ],
      sleep: [
      [
        '............',
        '.D.P....P.D.',
        '.DPP....PPD.',
        '.BBBBBBBBBB.',
        'BB........BB',
        'BBBBBBBBBBBB',
        'BBBBBPPBBBBB',
        '............',
        '............',
        '............'
      ]
      ]
    }
  },
  bird: {
    colors: { B: "#4aa3ff", D: "#2b6fc2", K: "#111111", W: "#ffffff", Y: "#ffd14a", R: "#ff8a2b", A: "#7ec0ff" },
    image: { url: 'src/shared/sprites/subpets/bird.png', width: 48, height: 40, gridW: 12, gridH: 10 },
    frames: {
      idle: [
      [
        '............',
        '...BBBBBB...',
        '..BBBBBBBB..',
        '.BBBKKBBKKBB',
        '.BBBBBYYBBB.',
        'A.BBBBBBBB.A',
        '..BBBBBBBB..',
        '...R....R...',
        '............',
        '............'
      ],
      [
        '............',
        '...BBBBBB...',
        '..BBBBBBBB..',
        '.BBBKKBBKKBB',
        '.BBBBBYYBBB.',
        'A.BBBBBBBB.A',
        '..BBBBBBBB..',
        '...R....R...',
        '............',
        '............'
      ]
      ],
      walk: [
      [
        '............',
        '...BBBBBB...',
        '..BBBBBBBB..',
        '.BBBKKBBKKBB',
        '.BBBBBYYBBB.',
        'A.BBBBBBBB.A',
        '..BBBBBBBB..',
        '..R......R..',
        '............',
        '............'
      ],
      [
        '............',
        '...BBBBBB...',
        '..BBBBBBBB..',
        '.BBBKKBBKKBB',
        '.BBBBBYYBBB.',
        'A.BBBBBBBB.A',
        '..BBBBBBBB..',
        '...R....R...',
        '............',
        '............'
      ]
      ],
      flying: [
      [
        '............',
        'AA.BBBBBB.AA',
        'A.BBBBBBBB.A',
        '..BBKKBBKKB.',
        '..BBBBYYBB..',
        '...BBBBBB...',
        '............',
        '............',
        '............',
        '............'
      ],
      [
        '............',
        '.A.BBBBBB.A.',
        'AA.BBBBBB.AA',
        'A.BBKKBBKKBB',
        '..BBBBYYBB..',
        '...BBBBBB...',
        '............',
        '............',
        '............',
        '............'
      ],
      [
        '............',
        'AA.BBBBBB.AA',
        'A.BBBBBBBB.A',
        '..BBKKBBKKB.',
        '..BBBBYYBB..',
        '...BBBBBB...',
        '............',
        '............',
        '............',
        '............'
      ]
      ],
      sleep: [
      [
        '............',
        '...BBBBBB...',
        '..BBBBBBBB..',
        '.BB......BB.',
        '.BBBBBYYBBB.',
        'A.BBBBBBBB.A',
        '..BBBBBBBB..',
        '............',
        '............',
        '............'
      ]
      ]
    }
  },
  rabbit: {
    colors: { B: "#f2f4f6", D: "#a8b0ba", K: "#111111", W: "#ffffff", P: "#ff8eb0", I: "#ffc2d6" },
    image: { url: 'src/shared/sprites/subpets/rabbit.png', width: 48, height: 40, gridW: 12, gridH: 10 },
    frames: {
      idle: [
      [
        '............',
        '.DP......PD.',
        '.DP......PD.',
        '.DBBBBBBBBD.',
        'BBBKKBBKKBBB',
        'BBBBBBBBBBBB',
        'BBBBBPPBBBBB',
        '.BB......BB.',
        '..D......D..',
        '............'
      ],
      [
        '............',
        '.DP......PD.',
        '.DP......PD.',
        '.DBBBBBBBBD.',
        'BBBKKBBKKBBB',
        'BBBBBBBBBBBB',
        'BBBBBPPBBBBB',
        '.BB......BB.',
        '..D......D..',
        '............'
      ]
      ],
      walk: [
      [
        '............',
        '.DP......PD.',
        '.DP......PD.',
        '.DBBBBBBBBD.',
        'BBBKKBBKKBBB',
        'BBBBBBBBBBBB',
        'BBBBBPPBBBBB',
        '.BB......BB.',
        '.D........D.',
        '............'
      ],
      [
        '............',
        '.DP......PD.',
        '.DP......PD.',
        '.DBBBBBBBBD.',
        'BBBKKBBKKBBB',
        'BBBBBBBBBBBB',
        'BBBBBPPBBBBB',
        '.BB......BB.',
        '..D......D..',
        '............'
      ]
      ],
      sleep: [
      [
        '............',
        '.DP......PD.',
        '.DP......PD.',
        '.DBBBBBBBBD.',
        'BB........BB',
        'BBBBBBBBBBBB',
        'BBBBBPPBBBBB',
        '............',
        '............',
        '............'
      ]
      ]
    }
  },
  dino: {
    colors: { B: "#3ecfcf", D: "#1f8a8a", K: "#111111", W: "#ffffff", Y: "#b8f0f0" },
    image: { url: 'src/shared/sprites/subpets/dino.png', width: 48, height: 40, gridW: 12, gridH: 10 },
    frames: {
      idle: [
      [
        '............',
        '...D.D.D....',
        '..BBBBBBB...',
        '.BBBBBBBBB..',
        'BBBKKBBKKBBB',
        'BBBBBBBBBBBB',
        '.BBBBBBBBBB.',
        '..BB....BB..',
        '..D......D..',
        '............'
      ],
      [
        '............',
        '...D.D.D....',
        '..BBBBBBB...',
        '.BBBBBBBBB..',
        'BBBKKBBKKBBB',
        'BBBBBBBBBBBB',
        '.BBBBBBBBBB.',
        '..BB....BB..',
        '..D......D..',
        '............'
      ]
      ],
      walk: [
      [
        '............',
        '...D.D.D....',
        '..BBBBBBB...',
        '.BBBBBBBBB..',
        'BBBKKBBKKBBB',
        'BBBBBBBBBBBB',
        '.BBBBBBBBBB.',
        '..BB....BB..',
        '.D........D.',
        '............'
      ],
      [
        '............',
        '...D.D.D....',
        '..BBBBBBB...',
        '.BBBBBBBBB..',
        'BBBKKBBKKBBB',
        'BBBBBBBBBBBB',
        '.BBBBBBBBBB.',
        '..BB....BB..',
        '..D......D..',
        '............'
      ]
      ],
      sleep: [
      [
        '............',
        '...D.D.D....',
        '..BBBBBBB...',
        '.BBBBBBBBB..',
        'BB........BB',
        'BBBBBBBBBBBB',
        '.BBBBBBBBBB.',
        '............',
        '............',
        '............'
      ]
      ]
    }
  },
  dragon: {
    colors: { B: "#3daf4a", D: "#257a30", K: "#111111", W: "#ffffff", Y: "#ffd14a", F: "#ff5a52", A: "#6ecf78" },
    image: { url: 'src/shared/sprites/subpets/dragon.png', width: 48, height: 40, gridW: 12, gridH: 10 },
    frames: {
      idle: [
      [
        '............',
        '.Y.D....D.Y.',
        '..D......D..',
        '.DBBBBBBBBD.',
        'DBBKKBBKKBBD',
        'BBBBBBBBBBBB',
        '.DBBBBBBBBD.',
        '.BB......BB.',
        '..D......D..',
        '............'
      ],
      [
        '............',
        '.Y.D....D.Y.',
        '..D......D..',
        '.DBBBBBBBBD.',
        'DBBKKBBKKBBD',
        'BBBBBBBBBBBB',
        '.DBBBBBBBBD.',
        '.BB......BB.',
        '..D......D..',
        '............'
      ]
      ],
      walk: [
      [
        '............',
        '.Y.D....D.Y.',
        '..D......D..',
        '.DBBBBBBBBD.',
        'DBBKKBBKKBBD',
        'BBBBBBBBBBBB',
        '.DBBBBBBBBD.',
        '.BB......BB.',
        '.D........D.',
        '............'
      ],
      [
        '............',
        '.Y.D....D.Y.',
        '..D......D..',
        '.DBBBBBBBBD.',
        'DBBKKBBKKBBD',
        'BBBBBBBBBBBB',
        '.DBBBBBBBBD.',
        '.BB......BB.',
        '..D......D..',
        '............'
      ]
      ],
      flying: [
      [
        '............',
        'AA.Y.D..D.YA',
        'A..D....D..A',
        '..DBBBBBBD..',
        '.DBKKBBKKBD.',
        '.BBBBBBBBBB.',
        '..DBBBBBBD..',
        '............',
        '............',
        '............'
      ],
      [
        '............',
        '.A.Y.D..DY.A',
        'AA.D....D.AA',
        '.ADBBBBBBA..',
        '.DBKKBBKKBD.',
        '.BBBBBBBBBB.',
        '..DBBBBBBD..',
        '............',
        '............',
        '............'
      ],
      [
        '............',
        'AA.Y.D..D.YA',
        'A..D....D..A',
        '..DBBBBBBD..',
        '.DBKKBBKKBD.',
        '.BBBBBBBBBB.',
        '..DBBBBBBD..',
        '............',
        '............',
        '............'
      ]
      ],
      sleep: [
      [
        '............',
        '.Y.D....D.Y.',
        '..D......D..',
        '.DBBBBBBBBD.',
        'DB........BD',
        'BBBBBBBBBBBB',
        '.DBBBBBBBBD.',
        '............',
        '............',
        '............'
      ]
      ],
      special: [
      [
        '............',
        '.Y.D....D.Y.',
        '..D......D..',
        '.DBBBBBBBBD.',
        'DBBKKBBKKBBD',
        'BBBBBBBBBBBB',
        '.DBBBFFBBBD.',
        '.BB.FFFF.BB.',
        '..D......D..',
        '............'
      ],
      [
        '............',
        '.Y.D....D.Y.',
        '..D......D..',
        '.DBBBBBBBBD.',
        'DBBKKBBKKBBD',
        'BBBBBBBBBBBB',
        '.DBBBBBBBBD.',
        '.BB......BB.',
        '..D......D..',
        '............'
      ]
      ]
    }
  },
  ghost: {
    colors: { B: "rgba(236,240,244,0.96)", D: "rgba(170,180,195,0.8)", K: "#111111", W: "#ffffff", N: "#111111" },
    image: { url: 'src/shared/sprites/subpets/ghost.png', width: 48, height: 40, gridW: 12, gridH: 10 },
    frames: {
      idle: [
      [
        '............',
        '...BBBBBB...',
        '..BBBBBBBB..',
        '.BBBKKBBKKBB',
        '.BBBBBBBBBB.',
        '.BBBBBNBBBB.',
        '.BBBBBBBBBB.',
        '.B.B.B.B.BB.',
        '............',
        '............'
      ],
      [
        '............',
        '...BBBBBB...',
        '..BBBBBBBB..',
        '.BBBKKBBKKBB',
        '.BBBBBBBBBB.',
        '.BBBBBNBBBB.',
        '.BBBBBBBBBB.',
        '..B.B.B.B.B.',
        '............',
        '............'
      ]
      ],
      walk: [
      [
        '............',
        '...BBBBBB...',
        '..BBBBBBBB..',
        '.BBBKKBBKKBB',
        '.BBBBBBBBBB.',
        '.BBBBBNBBBB.',
        '.BBBBBBBBBB.',
        '.B.B.B.B.BB.',
        '............',
        '............'
      ],
      [
        '............',
        '...BBBBBB...',
        '..BBBBBBBB..',
        '.BBBKKBBKKBB',
        '.BBBBBBBBBB.',
        '.BBBBBNBBBB.',
        '.BBBBBBBBBB.',
        '..B.B.B.B.B.',
        '............',
        '............'
      ]
      ],
      sleep: [
      [
        '............',
        '...BBBBBB...',
        '..BBBBBBBB..',
        '.BB......BB.',
        '.BBBBBBBBBB.',
        '.BBBBBNBBBB.',
        '.BBBBBBBBBB.',
        '.B.B.B.B.BB.',
        '............',
        '............'
      ]
      ]
    }
  },
  slime: {
    colors: { B: "#4adf5a", D: "#2a9a38", K: "#111111", W: "#ffffff", E: "#1f7a2c", N: "#111111", C: "#8aef98" },
    image: { url: 'src/shared/sprites/subpets/slime.png', width: 48, height: 40, gridW: 12, gridH: 10 },
    frames: {
      idle: [
      [
        '............',
        '....BBBB....',
        '...BBBBBB...',
        '..BBBBBBBB..',
        '.BBBKKBBKKB.',
        '.BBBBBNBBBB.',
        '..BBBBBBBB..',
        '...BBBBBB...',
        '............',
        '............'
      ],
      [
        '............',
        '.....BB.....',
        '....BBBB....',
        '...BBBBBB...',
        '..BBKKBBKK.B',
        '..BBBBNBBBB.',
        '...BBBBBB...',
        '....BBBB....',
        '............',
        '............'
      ]
      ],
      walk: [
      [
        '............',
        '....BBBB....',
        '...BBBBBB...',
        '..BBBBBBBB..',
        '.BBBKKBBKKB.',
        '.BBBBBNBBBB.',
        'BBBB....BBBB',
        '.BB......BB.',
        '............',
        '............'
      ],
      [
        '............',
        '....BBBB....',
        '...BBBBBB...',
        '..BBBBBBBB..',
        '.BBBKKBBKKB.',
        '.BBBBBNBBBB.',
        '..BBBBBBBB..',
        '...BBBBBB...',
        '............',
        '............'
      ]
      ],
      sleep: [
      [
        '............',
        '....BBBB....',
        '...BBBBBB...',
        '..BBBBBBBB..',
        '.BB......BB.',
        '.BBBBBNBBBB.',
        '..BBBBBBBB..',
        '...BBBBBB...',
        '............',
        '............'
      ]
      ],
      special: [
      [
        '............',
        '....BBBB....',
        '...BBBBBB...',
        '..BBBBBBBB..',
        '.BBBKKBBKKB.',
        'BBBBBNBBBBB.',
        'BB........BB',
        '.B........B.',
        '............',
        '............'
      ]
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

/** PNGs em src/shared/sprites/subpets/<id>.png (content + popup). */
function clawdSubPetImageUrl(species) {
  const sprite = CLAWD_SUBPET_SPRITES[species];
  if (!sprite) return '';
  const path = sprite.image?.url || `src/shared/sprites/subpets/${species}.png`;
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime && typeof chrome.runtime.getURL === 'function') {
      return chrome.runtime.getURL(path);
    }
  } catch (_) { /* ignore */ }
  return path;
}

function clawdSubPetBounds(sprite) {
  if (sprite?.image?.width && sprite?.image?.height) {
    return {
      cols: sprite.image.gridW || Math.round(sprite.image.width / CLAWD_SUBPET_CELL),
      rows: sprite.image.gridH || Math.round(sprite.image.height / CLAWD_SUBPET_CELL),
      width: sprite.image.width,
      height: sprite.image.height
    };
  }
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
  /* Acessórios originais */
  tophat:     { emoji: '🎩', label: 'Cartola',           price: 40,  kind: 'accessory' },
  scarf:      { emoji: '🧣', label: 'Cachecol',           price: 30,  kind: 'accessory' },
  backpack:   { emoji: '🎒', label: 'Mochilinha',         price: 30,  kind: 'accessory' },
  chefhat:    { emoji: '👨‍🍳', label: 'Chapéu Chef',       price: 35,  kind: 'accessory' },
  ninjaband:  { emoji: '🥷', label: 'Faixa Ninja',        price: 35,  kind: 'accessory' },
  propeller:  { emoji: '🪖', label: 'Hélice Cabeça',      price: 45,  kind: 'accessory' },
  medal:      { emoji: '🏅', label: 'Medalha',             price: 55,  kind: 'accessory' },
  ball_gold:  { emoji: '🟡', label: 'Bola Dourada',       price: 60,  kind: 'ball' },
  ball_beach: { emoji: '🏖️', label: 'Bola de Praia',      price: 40,  kind: 'ball' },
  cushion:    { emoji: '🛏️', label: 'Almofada',            price: 50,  kind: 'decor' },
  /* Novos acessórios v3.3 */
  witch_hat:  { emoji: '🧙', label: 'Chapéu Bruxa',       price: 55,  kind: 'accessory' },
  bunny_ears: { emoji: '🐰', label: 'Orelhas de Coelho',  price: 45,  kind: 'accessory' },
  visor:      { emoji: '🎮', label: 'Viseira Gamer',       price: 60,  kind: 'accessory' },
  monocle:    { emoji: '🧐', label: 'Monóculo',            price: 35,  kind: 'accessory' },
  mustache:   { emoji: '🥸', label: 'Bigodão',             price: 30,  kind: 'accessory' },
  cape:       { emoji: '🦸', label: 'Capa de Herói',       price: 80,  kind: 'accessory' },
  armor:      { emoji: '🛡️', label: 'Armadura',            price: 100, kind: 'accessory' },
  /* Novos acessórios v3.5 */
  horns:      { emoji: '😈', label: 'Chifrinhos',           price: 40,  kind: 'accessory' },
  blush:      { emoji: '🥰', label: 'Blush Animê',          price: 20,  kind: 'accessory' },
  scarf_body: { emoji: '🧣', label: 'Cachecol Corpo',       price: 35,  kind: 'accessory' }
};

/* ---- Conquistas ---- */
var CLAWD_ACHIEVEMENTS = {
  /* Conquistas originais */
  first_pet:    { emoji: '🐾', label: 'Primeiro Carinho',   desc: '1º clique no pet',                  rarity: 'common',    check: (g) => (g.counters.pets || 0) >= 1,              goal: 1,   counter: 'pets' },
  striker:      { emoji: '⚽', label: 'Artilheiro',         desc: '50 gols',                           rarity: 'rare',      check: (g) => (g.counters.goals || 0) >= 50,            goal: 50,  counter: 'goals' },
  juggler:      { emoji: '🤹', label: 'Malabarista',        desc: '30 embaixadinhas seguidas',         rarity: 'epic',      check: (g) => (g.counters.keepyRecord || 0) >= 30,      goal: 30,  counter: 'keepyRecord' },
  combo_keepy:  { emoji: '🔥', label: 'Rei do Keepy',       desc: '50 embaixadinhas seguidas',         rarity: 'legendary', check: (g) => (g.counters.keepyRecord || 0) >= 50,      goal: 50,  counter: 'keepyRecord' },
  zoo:          { emoji: '🦁', label: 'Zoológico',          desc: 'Desbloquear 4 sub-pets',            rarity: 'rare',      check: (g) => (g.counters.subpetsUnlocked || 0) >= 4,   goal: 4,   counter: 'subpetsUnlocked' },
  sleepyhead:   { emoji: '💤', label: 'Dorminhoco',         desc: 'Pet dormiu 100 vezes',              rarity: 'common',    check: (g) => (g.counters.sleeps || 0) >= 100,          goal: 100, counter: 'sleeps' },
  fashionista:  { emoji: '👗', label: 'Fashionista',        desc: 'Usar 8 acessórios diferentes',      rarity: 'rare',      check: (g) => (g.counters.accessoriesUsed || []).length >= 8, goal: 8, counter: 'accessoriesUsed' },
  explorer:     { emoji: '🗺️', label: 'Explorador',         desc: '10 abas diferentes num dia',        rarity: 'common',    check: (g) => (g.counters.tabsToday || 0) >= 10,        goal: 10,  counter: 'tabsToday' },
  fisherman:    { emoji: '🎣', label: 'Pescador',            desc: 'Pescar 20 vezes',                   rarity: 'rare',      check: (g) => (g.counters.fish || 0) >= 20,             goal: 20,  counter: 'fish' },
  bigcatch:     { emoji: '🐟', label: 'Peixe Grande',       desc: 'Pescar 1 peixe raro',               rarity: 'epic',      check: (g) => (g.counters.rareFish || 0) >= 1,          goal: 1,   counter: 'rareFish' },
  marathoner:   { emoji: '🏃', label: 'Maratonista',        desc: 'Passear 500 vezes',                 rarity: 'rare',      check: (g) => (g.counters.walks || 0) >= 500,           goal: 500, counter: 'walks' },
  dance_fever:  { emoji: '🕺', label: 'Febre de Dança',     desc: 'Dançar 50 vezes',                   rarity: 'common',    check: (g) => (g.counters.dances || 0) >= 50,           goal: 50,  counter: 'dances' },
  /* Novas conquistas v3.3 */
  first_level:  { emoji: '🎖️', label: 'Novato Dedicado',   desc: 'Alcançar nível 5',                  rarity: 'common',    check: (g) => (g.counters.level || 0) >= 5,             goal: 5,   counter: 'level' },
  centurion:    { emoji: '💯', label: 'Centurião',           desc: '100 ações realizadas',              rarity: 'common',    check: (g) => (g.counters.totalActions || 0) >= 100,    goal: 100, counter: 'totalActions' },
  shopaholic:   { emoji: '🛍️', label: 'Shopaholic',          desc: 'Comprar 5 itens na loja',           rarity: 'common',    check: (g) => (g.counters.shopPurchases || 0) >= 5,     goal: 5,   counter: 'shopPurchases' },
  gourmet:      { emoji: '🍖', label: 'Gourmet',             desc: 'Alimentar o pet 20 vezes',          rarity: 'rare',      check: (g) => (g.counters.feeds || 0) >= 20,            goal: 20,  counter: 'feeds' },
  dance_machine:{ emoji: '🎶', label: 'Máquina de Dançar',  desc: 'Dançar 15 vezes',                   rarity: 'rare',      check: (g) => (g.counters.dances || 0) >= 15,           goal: 15,  counter: 'dances' },
  fashion_victim:{ emoji: '✨', label: 'Fashion Victim',     desc: 'Ter 6 acessórios desbloqueados',    rarity: 'rare',      check: (g) => (g.counters.accessoriesUsed || []).length >= 6, goal: 6, counter: 'accessoriesUsed' },
  combo_king:   { emoji: '🔥', label: 'Rei do Combo',       desc: 'Combo de 5 ações em 10 segundos',   rarity: 'epic',      check: (g) => (g.counters.maxCombo || 0) >= 5,          goal: 5,   counter: 'maxCombo' },
  legendary_pet:{ emoji: '🌟', label: 'Pet Lendário',       desc: 'Alcançar o nível 30',               rarity: 'legendary', check: (g) => (g.counters.level || 0) >= 30,            goal: 30,  counter: 'level' },
  full_house:   { emoji: '🐾', label: 'Família Completa',   desc: 'Todos os sub-pets desbloqueados',   rarity: 'epic',      check: (g) => (g.counters.subpetsUnlocked || 0) >= 8,   goal: 8,   counter: 'subpetsUnlocked' },
  polyglot:     { emoji: '🌐', label: 'Polivalente',         desc: 'Usar todas as 12 profissões',       rarity: 'epic',      check: (g) => (g.counters.professionsUsed || []).length >= 12, goal: 12, counter: 'professionsUsed' },
  night_owl:    { emoji: '🦉', label: 'Coruja Noturna',     desc: '50 interações fora do horário nobre', rarity: 'rare',    check: (g) => (g.counters.nightInteractions || 0) >= 50, goal: 50, counter: 'nightInteractions' },
  speedrun:     { emoji: '⚡', label: 'Speedrunner',         desc: '10 ações em 30 segundos',           rarity: 'epic',      check: (g) => (g.counters.maxSpeedrun || 0) >= 10,      goal: 10,  counter: 'maxSpeedrun' },
  iron_will:    { emoji: '💎', label: 'Vontade de Ferro',   desc: 'Streak de 30 dias consecutivos',    rarity: 'legendary', check: (g) => (g.counters?.streakDays || 0) >= 30,       goal: 30,  counter: 'streakDays' }
};

/* ---- Cores padrão ---- */
var CLAWD_COLORS = ['#c71515', '#d97757', '#C15F3C', '#e67e22', '#f1c40f', '#2ecc71', '#3498db', '#9b59b6', '#e84393', '#1abc9c'];

/* ---- Cores de camisa (Jogador) ---- */
var CLAWD_JERSEYS = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#ffffff', '#111111', '#9b59b6', '#e67e22'];

var CLAWD_TAG_THEMES = ['light', 'dark', 'neon', 'invisible', 'rainbow', 'holographic', 'minimal'];
var CLAWD_TRAVEL_FREQS = ['rarely', 'sometimes', 'always'];
var CLAWD_START_CORNERS = ['br', 'bl', 'tr', 'tl'];
var CLAWD_BALL_SKINS = ['classic', 'ball_gold', 'ball_beach'];

var CLAWD_CONFIG_KEYS = [
  'name', 'color', 'eyeColor', 'model', 'faceStyle', 'scale', 'animSpeed',
  'smooth', 'outline', 'showMouth', 'showSpeech', 'autoWalk', 'sleepEnabled',
  'skin', 'tagTheme', 'jerseyColor', 'ballSkin', 'accessoryHead', 'accessoryFace',
  'accessoryBody', 'profession', 'particleColor', 'personality'
];

var CLAWD_SETTING_KEYS = [
  'crossTab', 'travelFreq', 'footprints', 'sounds', 'soundVolume',
  'soundVolumeActions', 'soundVolumeAmbient',
  'quietStart', 'quietEnd', 'blockedSites', 'startCorner', 'performanceMode'
];

var CLAWD_RUNTIME_ACTIONS = [
  'healthcheck', 'toggleVisibility', 'resetPosition', 'updateConfig',
  'updateSetting', 'triggerAction', 'setSubpet', 'setSubpetColor',
  'setSubpetEyeColor', 'triggerSubpetAction', 'claimDailyQuest', 'claimWeeklyChallenge',
  'weeklyReset', 'getStatus'
];

/* ---- Variações de Idle (v3.4) ---- */
var CLAWD_IDLE_VARIATIONS = [
  { id: 'look',    keyframe: 'clawd-idle-look',    durationMs: 1800, cooldownMs: 15000 },
  { id: 'scratch', keyframe: 'clawd-idle-scratch',  durationMs: 1200, cooldownMs: 20000 },
  { id: 'taptoe',  keyframe: 'clawd-idle-taptoe',   durationMs:  900, cooldownMs: 25000 }
];

/* ---- Atalhos de Teclado (v3.4) ---- */
var CLAWD_KEYBOARD_SHORTCUTS = {
  'Alt+F': 'feed',
  'Alt+H': 'happy',
  'Alt+P': 'pose',
  'Alt+Z': 'sleep'
};

var CLAWD_PORT_MSG_TYPES = ['register', 'travelComplete'];
/** SW → content (presença): só spawn / despawn / hide. */
var CLAWD_DOWNSTREAM_PORT_MSG_TYPES = ['spawnPet', 'despawnPet', 'hidePet'];
var CLAWD_TRAVEL_DIRECTIONS = ['left', 'right'];

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

/** Hostname de site bloqueado: só labels DNS simples (sem URL, path, porta ou @). */
function clawdSanitizeHostname(value) {
  const s = clawdSanitizePlainText(value, 64).toLowerCase();
  if (!s || s.length > 64) return '';
  if (/[/\\:@\s?#]/.test(s)) return '';
  if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/.test(s)) {
    return '';
  }
  return s;
}

/** Site bloqueado: só hostname exato ou subdomínio (nunca substring solta). */
function clawdHostIsBlocked(hostname, blockedSites) {
  const host = clawdSanitizeHostname(hostname);
  if (!host || !Array.isArray(blockedSites)) return false;
  return blockedSites.some((site) => {
    const s = clawdSanitizeHostname(site);
    if (!s) return false;
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
      // Nome via textContent: permitir apostrofo ('), remover apenas controles e HTML perigoso
      return String(value == null ? '' : value)
        .replace(/[\u0000-\u001F\u007F<>&"`]/g, '')
        .trim()
        .slice(0, 24) || "Claw'd";
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
    case 'accessoryBody':
      if (value === 'none') return 'none';
      return Object.prototype.hasOwnProperty.call(CLAWD_ACCESSORIES, value) ? value : null;
    case 'particleColor':
      if (value === null || value === '') return null;
      return clawdIsHexColor(value) ? value.toLowerCase() : null;
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
    case 'personality': {
      if (!value || typeof value !== 'object') return null;
      const traits = ['playful', 'lazy', 'curious', 'social', 'foodie'];
      const result = {};
      traits.forEach(t => { result[t] = Math.max(0, Math.min(10, Math.round(Number(value[t]) || 0))); });
      return result;
    }
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
    case 'soundVolume':
    case 'soundVolumeActions':
    case 'soundVolumeAmbient': {
      const n = Number(value);
      return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : null;
    }
    case 'quietStart':
    case 'quietEnd':
      return clawdSanitizeTimeHHMM(value);
    case 'blockedSites':
      if (!Array.isArray(value)) return null;
      return value
        .map(s => clawdSanitizeHostname(s))
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
    case 'claimWeeklyChallenge':
    case 'weeklyReset':
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
        && !['kick', 'keepy', 'highfive', 'superdance', 'lookAround'].includes(request.value)) {
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

/** Mensagens do service worker → content (presença). Descarta direction inválida. */
function clawdValidateDownstreamPortMessage(msg) {
  if (!msg || typeof msg !== 'object') return null;
  if (!CLAWD_DOWNSTREAM_PORT_MSG_TYPES.includes(msg.type)) return null;
  const out = { type: msg.type };
  if ((msg.type === 'spawnPet' || msg.type === 'despawnPet')
    && CLAWD_TRAVEL_DIRECTIONS.includes(msg.direction)) {
    out.direction = msg.direction;
  }
  return out;
}

/** Clone raso de `base` + overlay sem poluir protótipo. */
function clawdPlainMerge(base, overlay) {
  return clawdAssignPlain(clawdAssignPlain({}, base || {}), overlay || {});
}

/** Une listas de subpets desbloqueados, filtrando pelo catálogo. */
function clawdMergeUnlockedSubpets(...lists) {
  const out = [];
  lists.forEach((list) => {
    if (!Array.isArray(list)) return;
    list.forEach((id) => {
      if (Object.prototype.hasOwnProperty.call(CLAWD_SUBPETS, id) && !out.includes(id)) {
        out.push(id);
      }
    });
  });
  return out;
}

/* ---- Estado padrão v5 ---- */
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
    showMouth: true,
    autoWalk: true,
    sleepEnabled: true,
    animSpeed: 1,
    profession: 'idle',
    smooth: false,
    outline: false,
    accessoryHead: 'none',
    accessoryFace: 'none',
    accessoryBody: 'none',         // v5: novo slot de corpo
    skin: 'normal',               // normal | droopy | robot
    tagTheme: 'light',            // light | dark | neon | invisible | rainbow | holographic | minimal
    jerseyColor: '#e74c3c',
    ballSkin: 'classic',          // classic | ball_gold | ball_beach
    particleColor: null,          // v5: cor customizada de partículas (hex ou null)
    xp: 0,
    stats: { happiness: 80, hunger: 80, energy: 90, hygiene: 85, lastStatsUpdate: 0 },
    personality: { playful: 5, lazy: 3, curious: 7, social: 5, foodie: 4 }, // v5: traços 0–10
    customSpeech: [],             // v5: frases personalizadas do pet
    game: {
      coins: 0, coinFrac: 0,
      streak: { days: 0, lastDay: '' },
      achievements: {},
      counters: {
        pets: 0, goals: 0, keepyRecord: 0, keepyTotal: 0, sleeps: 0,
        tabsToday: 0, tabsDay: '', tabsSeen: [], subpetsUnlocked: 1,
        accessoriesUsed: [], fish: 0, rareFish: 0, walks: 0, dances: 0,
        /* v5 */
        feeds: 0, totalActions: 0, shopPurchases: 0, maxCombo: 0,
        maxSpeedrun: 0, nightInteractions: 0, professionsUsed: [], level: 1,
        streakDays: 0
      },
      inventory: []
    },
    favorites: { actions: [], professions: [], accessories: [], colors: [], nicknames: [], subpets: [] },
    nicknameHistory: [],
    subpets: { active: 'dog', unlocked: ['dog'], names: {}, colors: {}, eyeColors: {} },
    daily: clawdDailyQuestForDate(),
    weekly: clawdWeeklyChallengeForWeek(clawdISOWeek()), // v5: desafio semanal
    settings: {
      crossTab: true,
      travelFreq: 'sometimes',     // rarely | sometimes | always
      footprints: false,
      sounds: true,
      soundVolume: 0.45,
      soundVolumeActions: 1.0,     // v5: volume de ações
      soundVolumeAmbient: 0.6,     // v5: volume ambiente
      quietStart: '',              // "09:00"
      quietEnd: '',
      blockedSites: [],
      startCorner: 'br',           // br | bl | tr | tl
      performanceMode: false
    },
    onboardingDone: false          // v5: true após primeiro uso do popup
  };
}

/* ---- Migração: helpers puros (SSOT com sanitize/validate) ---- */

function clawdSanitizeFavoritesBlock(rawFav, defFav) {
  const favorites = clawdPlainMerge(defFav, rawFav);
  Object.keys(defFav).forEach((cat) => {
    const list = Array.isArray(favorites[cat]) ? favorites[cat] : [];
    let cleaned = list
      .map(item => clawdSanitizePlainText(item, 48))
      .filter(Boolean)
      .slice(0, 40);
    if (cat === 'colors') {
      cleaned = cleaned.filter(clawdIsHexColor).map(c => c.toLowerCase());
    } else if (cat === 'actions') {
      cleaned = cleaned.filter(id => Object.prototype.hasOwnProperty.call(CLAWD_ACTIONS, id));
    } else if (cat === 'professions') {
      cleaned = cleaned.filter(id => Object.prototype.hasOwnProperty.call(CLAWD_PROFESSIONS, id));
    } else if (cat === 'accessories') {
      cleaned = cleaned.filter(id => id === 'none'
        || Object.prototype.hasOwnProperty.call(CLAWD_ACCESSORIES, id));
    } else if (cat === 'subpets') {
      cleaned = cleaned.filter(id => Object.prototype.hasOwnProperty.call(CLAWD_SUBPETS, id));
    } else if (cat === 'nicknames') {
      cleaned = cleaned.map(n => clawdSanitizePlainText(n, 24)).filter(Boolean);
    }
    favorites[cat] = cleaned.slice(0, 40);
  });
  return favorites;
}

function clawdSanitizeSubpetsBlock(rawSubpets, defSubpets, xp) {
  const src = (rawSubpets && typeof rawSubpets === 'object') ? rawSubpets : {};
  const subpets = clawdPlainMerge(defSubpets, src);
  subpets.names = clawdAssignPlain({}, src.names || {});
  subpets.colors = clawdAssignPlain({}, src.colors || {});
  subpets.eyeColors = clawdAssignPlain({}, src.eyeColors || {});
  Object.keys(subpets.names).forEach((id) => {
    if (!CLAWD_SUBPETS[id]) { delete subpets.names[id]; return; }
    subpets.names[id] = clawdSanitizePlainText(subpets.names[id], 24);
  });
  Object.keys(subpets.colors).forEach((id) => {
    if (!CLAWD_SUBPETS[id] || !clawdIsHexColor(subpets.colors[id])) delete subpets.colors[id];
    else subpets.colors[id] = subpets.colors[id].toLowerCase();
  });
  Object.keys(subpets.eyeColors).forEach((id) => {
    if (!CLAWD_SUBPETS[id] || !clawdIsHexColor(subpets.eyeColors[id])) delete subpets.eyeColors[id];
    else subpets.eyeColors[id] = subpets.eyeColors[id].toLowerCase();
  });
  const levelNow = clawdLevelFromXp(xp || 0).level;
  const levelUnlocks = Object.entries(CLAWD_SUBPETS)
    .filter(([, defPet]) => levelNow >= defPet.level)
    .map(([id]) => id);
  subpets.unlocked = clawdMergeUnlockedSubpets(src.unlocked, levelUnlocks);
  if (!subpets.unlocked.includes('dog')) subpets.unlocked.unshift('dog');
  if (subpets.active && !Object.prototype.hasOwnProperty.call(CLAWD_SUBPETS, subpets.active)) {
    subpets.active = null;
  }
  /* Só ativa o cachorro padrão quando o save nunca escolheu companheiro (campo ausente). */
  if (!Object.prototype.hasOwnProperty.call(src, 'active')
    && !subpets.active
    && subpets.unlocked.includes('dog')) {
    subpets.active = 'dog';
  }
  return subpets;
}

function clawdSanitizeSettingsBlock(rawSettings, defSettings) {
  const settings = clawdPlainMerge(defSettings, rawSettings);
  CLAWD_SETTING_KEYS.forEach((key) => {
    if (!Object.prototype.hasOwnProperty.call(settings, key)) return;
    /* sounds legado não-boolean → true (antes do sanitize genérico). */
    if (key === 'sounds' && rawSettings && typeof rawSettings.sounds !== 'boolean') {
      settings.sounds = true;
      return;
    }
    const safe = clawdSanitizeSettingValue(key, settings[key]);
    if (safe === null) settings[key] = defSettings[key];
    else settings[key] = safe;
  });
  return settings;
}

function clawdSanitizeDailyBlock(rawDaily) {
  const src = (rawDaily && typeof rawDaily === 'object') ? rawDaily : {};
  const date = (typeof src.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(src.date))
    ? src.date
    : new Date().toISOString().slice(0, 10);
  const quest = clawdDailyQuestForDate(date);
  const sameDay = src.date === quest.date;
  return {
    ...quest,
    progress: sameDay ? Math.max(0, Math.min(quest.target, Number(src.progress) || 0)) : 0,
    claimed: sameDay ? !!src.claimed : false
  };
}

function clawdSanitizeGameBlock(rawGame, defGame) {
  const src = (rawGame && typeof rawGame === 'object') ? rawGame : {};
  const game = clawdPlainMerge(defGame, src);
  game.streak = clawdPlainMerge(defGame.streak, src.streak || {});
  game.counters = clawdPlainMerge(defGame.counters, src.counters || {});
  game.achievements = clawdAssignPlain({}, src.achievements || {});
  game.inventory = (src.inventory || [])
    .filter(id => Object.prototype.hasOwnProperty.call(CLAWD_SHOP, id))
    .slice(0, 80);
  game.streak.days = Math.max(0, Math.min(9999, Number(game.streak.days) || 0));
  game.streak.lastDay = (typeof game.streak.lastDay === 'string'
    && /^\d{4}-\d{2}-\d{2}$/.test(game.streak.lastDay))
    ? game.streak.lastDay
    : '';
  Object.keys(defGame.counters).forEach((key) => {
    const cur = game.counters[key];
    if (Array.isArray(defGame.counters[key])) {
      game.counters[key] = Array.isArray(cur)
        ? cur.map(x => clawdSanitizePlainText(x, 64)).filter(Boolean).slice(0, 80)
        : [];
    } else if (typeof defGame.counters[key] === 'number') {
      game.counters[key] = Math.max(0, Math.min(1e9, Number(cur) || 0));
    } else if (typeof defGame.counters[key] === 'string') {
      game.counters[key] = clawdSanitizePlainText(cur, 32);
    }
  });
  /* v5: garante counters novos ausentes em saves antigos */
  ['feeds', 'totalActions', 'shopPurchases', 'maxCombo', 'maxSpeedrun', 'nightInteractions', 'level', 'streakDays'].forEach(k => {
    if (typeof game.counters[k] !== 'number') game.counters[k] = 0;
  });
  if (!Array.isArray(game.counters.professionsUsed)) game.counters.professionsUsed = [];
  game.coins = Math.max(0, Math.min(1e9, Number(game.coins) || 0));
  return game;
}

function clawdApplyLegacyAccessoryMigration(merged, raw, version) {
  if (version >= 3) return;
  if (raw.accessory && raw.accessory !== 'none') {
    const acc = CLAWD_ACCESSORIES[raw.accessory];
    if (acc && acc.slot === 'head') merged.accessoryHead = raw.accessory;
    else merged.accessoryFace = raw.accessory;
  }
  delete merged.accessory;
  merged.xp = Math.max(0, Math.min(5e6, Number(raw.xp) || 0));
}

function clawdSanitizeIdentityFields(merged, raw, def) {
  const pick = (key, table) => (
    Object.prototype.hasOwnProperty.call(table, raw[key]) ? raw[key] : def[key]
  );
  merged.model = pick('model', CLAWD_MODELS);
  merged.faceStyle = pick('faceStyle', CLAWD_FACE_STYLES);
  merged.skin = pick('skin', CLAWD_SKINS);
  if (!Object.prototype.hasOwnProperty.call(CLAWD_PROFESSIONS, merged.profession)) {
    merged.profession = def.profession;
  }
  if (merged.accessoryHead !== 'none' && !CLAWD_ACCESSORIES[merged.accessoryHead]) {
    merged.accessoryHead = 'none';
  }
  if (merged.accessoryFace !== 'none' && !CLAWD_ACCESSORIES[merged.accessoryFace]) {
    merged.accessoryFace = 'none';
  }
  if (merged.accessoryBody !== 'none' && !CLAWD_ACCESSORIES[merged.accessoryBody]) {
    merged.accessoryBody = 'none';
  }
  if (!CLAWD_TAG_THEMES.includes(merged.tagTheme)) merged.tagTheme = def.tagTheme;
  if (!CLAWD_BALL_SKINS.includes(merged.ballSkin)) merged.ballSkin = def.ballSkin;
  const jersey = clawdSanitizeConfigValue('jerseyColor', merged.jerseyColor);
  merged.jerseyColor = jersey == null ? def.jerseyColor : jersey;
  const name = clawdSanitizeConfigValue('name', merged.name);
  merged.name = name == null ? def.name : name;
  const scale = clawdSanitizeConfigValue('scale', merged.scale);
  merged.scale = scale == null ? def.scale : scale;
  const animSpeed = clawdSanitizeConfigValue('animSpeed', merged.animSpeed);
  merged.animSpeed = animSpeed == null ? def.animSpeed : animSpeed;
  const eye = clawdSanitizeConfigValue('eyeColor', raw.eyeColor);
  merged.eyeColor = eye == null ? def.eyeColor : eye;
  const color = clawdSanitizeConfigValue('color', merged.color);
  merged.color = color == null ? def.color : color;
  merged.nicknameHistory = (Array.isArray(merged.nicknameHistory) ? merged.nicknameHistory : [])
    .map(n => clawdSanitizePlainText(n, 24))
    .filter(Boolean)
    .slice(0, 12);
}

/* ---- Migração incremental de saves antigos ---- */
function clawdMigrateState(raw) {
  const def = clawdDefaultState();
  if (!raw || typeof raw !== 'object') return def;
  const v = raw.schemaVersion || 1;
  const merged = clawdPlainMerge(def, raw);
  merged.stats = clawdPlainMerge(def.stats, raw.stats || {});
  merged.game = clawdSanitizeGameBlock(raw.game, def.game);
  merged.favorites = clawdSanitizeFavoritesBlock(raw.favorites, def.favorites);
  merged.xp = Math.max(0, Math.min(5e6, Number(merged.xp) || 0));
  merged.subpets = clawdSanitizeSubpetsBlock(raw.subpets, def.subpets, merged.xp);
  merged.game.counters.subpetsUnlocked = merged.subpets.unlocked.length;
  ['happiness', 'hunger', 'energy', 'hygiene'].forEach((k) => {
    merged.stats[k] = Math.max(0, Math.min(100, Number(merged.stats[k]) || 0));
  });
  if (typeof raw.showMouth !== 'boolean') merged.showMouth = def.showMouth;
  merged.daily = clawdSanitizeDailyBlock(raw.daily);
  clawdEnsureDailyQuest(merged);
  merged.settings = clawdSanitizeSettingsBlock(raw.settings, def.settings);
  clawdApplyLegacyAccessoryMigration(merged, raw, v);
  clawdSanitizeIdentityFields(merged, raw, def);
  /* v5: campos novos com defaults seguros se ausentes */
  if (v < 5) {
    if (!merged.personality || typeof merged.personality !== 'object') {
      merged.personality = { playful: 5, lazy: 3, curious: 7, social: 5, foodie: 4 };
    }
    if (merged.accessoryBody === undefined) merged.accessoryBody = 'none';
    if (!merged.weekly || typeof merged.weekly !== 'object') {
      merged.weekly = clawdWeeklyChallengeForWeek(clawdISOWeek());
    }
    if (!Array.isArray(merged.customSpeech)) merged.customSpeech = [];
    if (merged.particleColor === undefined) merged.particleColor = null;
    if (!merged.settings.soundVolumeActions) merged.settings.soundVolumeActions = 1.0;
    if (!merged.settings.soundVolumeAmbient) merged.settings.soundVolumeAmbient = 0.6;
  }
  /* Garantir campos v5 em qualquer versão (saves corrompidos parciais) */
  if (!merged.personality || typeof merged.personality !== 'object') {
    merged.personality = { playful: 5, lazy: 3, curious: 7, social: 5, foodie: 4 };
  }
  if (merged.accessoryBody === undefined || merged.accessoryBody === null) merged.accessoryBody = 'none';
  if (!merged.weekly || typeof merged.weekly !== 'object') {
    merged.weekly = clawdWeeklyChallengeForWeek(clawdISOWeek());
  }
  clawdEnsureWeeklyChallenge(merged);
  if (!Array.isArray(merged.customSpeech)) merged.customSpeech = [];
  if (merged.particleColor !== null && !clawdIsHexColor(merged.particleColor || '')) merged.particleColor = null;
  if (!merged.settings.soundVolumeActions) merged.settings.soundVolumeActions = 1.0;
  if (!merged.settings.soundVolumeAmbient) merged.settings.soundVolumeAmbient = 0.6;
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
    CLAWD_SCHEMA_VERSION,
    CLAWD_DAILY_QUESTS,
    CLAWD_WEEKLY_CHALLENGES,
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
    clawdSubPetImageUrl,
    CLAWD_SHOP,
    CLAWD_ACHIEVEMENTS,
    CLAWD_RARITY,
    CLAWD_COLORS,
    clawdDailyQuestForDate,
    clawdEnsureDailyQuest,
    clawdRegisterDailyProgress,
    clawdISOWeek,
    clawdWeeklyChallengeForWeek,
    clawdEnsureWeeklyChallenge,
    clawdRegisterWeeklyProgress,
    clawdDefaultState,
    clawdEffectiveAccessories,
    clawdXpForLevel,
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
    CLAWD_DOWNSTREAM_PORT_MSG_TYPES,
    CLAWD_TRAVEL_DIRECTIONS,
    CLAWD_DOM_CLEANUP_SELECTORS,
    clawdIsHexColor,
    clawdSanitizePlainText,
    clawdSanitizeHostname,
    clawdAssignPlain,
    clawdPlainMerge,
    clawdMergeUnlockedSubpets,
    clawdHostIsBlocked,
    clawdSanitizeConfigValue,
    clawdSanitizeSettingValue,
    clawdSanitizeFavoritesBlock,
    clawdSanitizeSubpetsBlock,
    clawdSanitizeSettingsBlock,
    clawdSanitizeDailyBlock,
    clawdValidateRuntimeMessage,
    clawdValidatePortMessage,
    clawdValidateDownstreamPortMessage,
    CLAWD_IDLE_VARIATIONS,
    CLAWD_KEYBOARD_SHORTCUTS
  };
}
