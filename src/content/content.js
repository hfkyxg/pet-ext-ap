/* ===================================================
   CLAW'D v3.2 — CONTENT SCRIPT
   Pet interativo: stats/emoções, gamificação, favoritos,
   sub-pets, profissões 2.0, pescador, passeio entre abas.
   Requer: src/shared/catalog.js (carregado antes).
   =================================================== */

(function clawdContentScope() {

/* =====================================================
   SUB-PET — sprites pixel-art gerados por mapa de pixels
   ===================================================== */
const SUBPET_SPRITES = {
  dog: {
    colors: { B: '#8d5a2b', D: '#5b3a1a', K: '#111', W: '#f5e9dc' },
    frames: [
      ['D......D', 'DBBBBBBD', 'BKBBBBKB', 'BBBWWBBB', '.B..B.B.'],
      ['D......D', 'DBBBBBBD', 'BKBBBBKB', 'BBBWWBBB', 'B..B..B.']
    ]
  },
  cat: {
    colors: { B: '#7f8c8d', D: '#525c5d', K: '#111', P: '#e8a0bf' },
    frames: [
      ['D..D....', 'DBBBBBB.', 'BKBBKBB.', 'BBPBBBBD', '.B..B...'],
      ['D..D....', 'DBBBBBB.', 'BKBBKBB.', 'BBPBBBBD', 'B....B..']
    ]
  },
  bird: {
    colors: { B: '#f1c40f', D: '#e67e22', K: '#111', W: '#fff' },
    frames: [
      ['..BBB...', '.BKBBB..', 'DBBBBB..', '.BDDB...', '..D.D...'],
      ['..BBB...', '.BKBBB..', 'DBBDDB..', '.BBBB...', '..D.D...']
    ]
  },
  rabbit: {
    colors: { B: '#ecf0f1', D: '#bdc3c7', K: '#111', P: '#fbb1c8' },
    frames: [
      ['.D..D...', '.B..B...', 'BBBBBB..', 'BKBBKB..', 'BBPBBB..'],
      ['.D..D...', '.B..B...', 'BBBBBB..', 'BKBBKB..', '.BPBB...']
    ]
  },
  dino: {
    colors: { B: '#27ae60', D: '#1e8449', K: '#111', W: '#f4d03f' },
    frames: [
      ['.BBBB...', '.BKBB...', 'DBBBBBB.', '.BBBBBBD', '.B...B..'],
      ['.BBBB...', '.BKBB...', 'DBBBBBB.', '.BBBBBBD', '..B.B...']
    ]
  },
  dragon: {
    colors: { B: '#8e44ad', D: '#5b2c6f', K: '#111', F: '#e74c3c' },
    frames: [
      ['D.BBBB..', '.DBKBB..', 'DBBBBBB.', '.BBBBBBD', '.B...B..'],
      ['.DBBBB..', 'D.BKBB..', 'DBBBBBB.', '.BBBBBBD', '..B.B...']
    ]
  },
  ghost: {
    colors: { B: 'rgba(236,240,241,0.92)', K: '#111' },
    frames: [
      ['.BBBBB..', 'BBKBKBB.', 'BBBBBBB.', 'BBBBBBB.', 'B.B.B.B.'],
      ['.BBBBB..', 'BBKBKBB.', 'BBBBBBB.', 'BBBBBBB.', '.B.B.B..']
    ]
  },
  slime: {
    colors: { B: '#2ecc71', D: '#27ae60', K: '#111' },
    frames: [
      ['..BBBB..', '.BBBBBB.', 'BBKBBKBB', 'BDBBBBDB', 'BBBBBBBB'],
      ['........', '.BBBBBB.', 'BBKBBKBB', 'BDBBBBDB', 'BBBBBBBB']
    ]
  }
};

function buildPixelShadow(frame, colors, cell) {
  const out = [];
  frame.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const c = colors[row[x]];
      if (c) out.push(`${x * cell}px ${y * cell}px 0 ${c}`);
    }
  });
  return out.join(',');
}

function shadePixelColor(hex, factor = 0.7) {
  const value = String(hex || '').match(/^#([\da-f]{6})$/i);
  if (!value) return hex;
  const rgb = value[1].match(/[\da-f]{2}/gi).map(part => Math.round(parseInt(part, 16) * factor));
  return `#${rgb.map(part => part.toString(16).padStart(2, '0')).join('')}`;
}

function subPetPalette(sprite, customColor, customEyeColor) {
  const primary = /^#[\da-f]{6}$/i.test(customColor || '') ? customColor : sprite.colors.B;
  const eyes = /^#[\da-f]{6}$/i.test(customEyeColor || '') ? customEyeColor : (sprite.colors.K || '#111111');
  return { ...sprite.colors, B: primary, D: shadePixelColor(primary, 0.68), K: eyes };
}

class SubPet {
  constructor(owner, species) {
    this.owner = owner;
    this.species = species;
    this.def = CLAWD_SUBPETS[species] || CLAWD_SUBPETS.dog;
    this.sprite = SUBPET_SPRITES[species] || SUBPET_SPRITES.dog;
    this.color = this.sprite.colors.B;
    this.eyeColor = this.sprite.colors.K || '#111111';
    this.setColor(owner.S.subpets.colors?.[species]);
    this.setEyeColor(owner.S.subpets.eyeColors?.[species]);
    this.state = 'following';
    this.x = 0; this.y = 0;
    this.frame = 0;
    this._raf = null;
    this._lastPaint = 0;
    this._interactTimer = null;
    this._sleepTimer = null;
    this._wakeTimer = null;
    this._interactionEndTimer = null;
    this._actionTimers = new Set();
    this._interactionBusy = false;
    this.node = null;
    this.create();
  }

  create() {
    const rect = this.owner.node.getBoundingClientRect();
    this.x = rect.left - 50;
    this.y = rect.top + 20;
    this.node = document.createElement('div');
    this.node.className = 'aic-subpet';
    this.node.dataset.state = this.state;
    this.node.setAttribute('role', 'button');
    this.node.setAttribute('tabindex', '0');
    this.node.setAttribute('aria-label', `${this.owner.S.subpets.names?.[this.species] || this.def.label}, sub-pet interativo`);
    this.node.innerHTML = `
      <div class="subpet-bubble"></div>
      <div class="subpet-sprite"></div>`;
    document.body.appendChild(this.node);
    this.spriteNode = this.node.querySelector('.subpet-sprite');
    this.bubbleNode = this.node.querySelector('.subpet-bubble');
    const scale = Math.max(0.9, (this.owner.S.scale || 1.5) * 0.6);
    this.node.style.setProperty('--subpet-scale', scale);
    this._paint();
    this.node.addEventListener('click', (event) => {
      event.stopPropagation();
      if (this.state === 'sleeping') this.wakeUp('Acordei com seu carinho! ✨');
      else this.interact('cuddle');
    });
    this.node.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (this.state === 'sleeping') this.wakeUp('Acordei! ✨');
        else this.interact('cuddle');
      }
    });
    this._loop();
    this._scheduleInteraction();
  }

  _paint() {
    this.frame = (this.frame + 1) % this.sprite.frames.length;
    this.spriteNode.style.boxShadow = buildPixelShadow(
      this.sprite.frames[this.state === 'sleeping' ? 0 : this.frame],
      this.colors, 3
    );
  }

  say(text, dur = 2200) {
    this.bubbleNode.textContent = text;
    this.bubbleNode.classList.add('visible');
    clearTimeout(this._sayTimer);
    this._sayTimer = dur > 0
      ? setTimeout(() => this.bubbleNode?.classList.remove('visible'), dur)
      : null;
  }

  setColor(color) {
    this.color = /^#[\da-f]{6}$/i.test(color || '') ? color : this.sprite.colors.B;
    this.colors = subPetPalette(this.sprite, this.color, this.eyeColor);
    if (this.spriteNode) this._paint();
  }

  setEyeColor(color) {
    this.eyeColor = /^#[\da-f]{6}$/i.test(color || '') ? color : (this.sprite.colors.K || '#111111');
    this.colors = subPetPalette(this.sprite, this.color, this.eyeColor);
    if (this.spriteNode) this._paint();
  }

  _later(callback, delay) {
    const timer = setTimeout(() => {
      this._actionTimers.delete(timer);
      if (this.node) callback();
    }, delay);
    this._actionTimers.add(timer);
    return timer;
  }

  _cancelInteractionTimer() {
    if (!this._interactionEndTimer) return;
    clearTimeout(this._interactionEndTimer);
    this._actionTimers.delete(this._interactionEndTimer);
    this._interactionEndTimer = null;
  }

  _clearActionClasses() {
    this.node?.classList.remove(
      'playing', 'cuddling', 'racing', 'spinning', 'celebrating',
      'exploring', 'vanishing', 'fire', 'split'
    );
  }

  _setState(state) {
    this.state = state;
    if (this.node) this.node.dataset.state = state;
  }

  _beginInteraction(state, className) {
    this._cancelInteractionTimer();
    this._clearActionClasses();
    this.node?.classList.remove('sleeping', 'waking');
    this._setState(state);
    this._interactionBusy = true;
    if (className) this.node?.classList.add(className);
  }

  _finishInteractionAfter(delay, onFinish) {
    this._cancelInteractionTimer();
    this._interactionEndTimer = this._later(() => {
      if (onFinish) onFinish();
      this._setState('following');
      this._clearActionClasses();
      this._interactionBusy = false;
      this._interactionEndTimer = null;
    }, delay);
  }

  _startRace(message = 'Corrida! 🏁', duration = 3600) {
    this._beginInteraction('racing', 'racing');
    this._raceX = Math.random() < 0.5 ? 10 : window.innerWidth - 60;
    this.say(message);
    this.owner.startRun(this._raceX);
    this.owner.addXp(2);
    this._finishInteractionAfter(duration);
  }

  sleep() {
    if (this.state === 'sleeping') return;
    clearTimeout(this._wakeTimer);
    this._cancelInteractionTimer();
    this._setState('sleeping');
    this._clearActionClasses();
    this.node.classList.remove('waking');
    this.node.classList.add('sleeping');
    this._interactionBusy = true;
    this.say('💤', 0);
  }

  wakeUp(message = 'Bom dia, pequenino! ☀️') {
    if (this.state !== 'sleeping') return;
    clearTimeout(this._sleepTimer);
    this._setState('following');
    this.node.classList.remove('sleeping');
    this._clearActionClasses();
    this.node.classList.add('waking');
    this._interactionBusy = false;
    this.say(message, 2200);
    clearTimeout(this._wakeTimer);
    this._wakeTimer = setTimeout(() => this.node && this.node.classList.remove('waking'), 1100);
    this.owner.addXp(1);
  }

  _loop() {
    const tick = () => {
      if (!this.node) return;
      const now = performance.now();
      if (now - this._lastPaint >= 150) {
        this._paint();
        this._lastPaint = now;
      }
      const rect = this.owner.node.getBoundingClientRect();
      let tx = rect.left - 46;
      let ty = rect.top + rect.height * 0.35;
      if (this.species === 'bird' && this.state === 'following') {
        // pássaro circula sobre o dono
        const t = performance.now() / 900;
        tx = rect.left + rect.width / 2 + Math.cos(t) * 55 - 12;
        ty = rect.top - 40 + Math.sin(t) * 18;
      }
      if (this.state === 'racing') { tx = this._raceX; ty = this.y; }
      if (this.state === 'exploring') { tx = this._exploreX; ty = this._exploreY; }
      // lerp suave (~300ms de atraso)
      const k = this.state === 'racing' ? 0.16 : this.state === 'exploring' ? 0.11 : 0.07;
      this.x += (tx - this.x) * k;
      this.y += (ty - this.y) * k;
      this.node.style.left = `${Math.max(0, Math.min(window.innerWidth - 30, this.x))}px`;
      this.node.style.top = `${Math.max(0, Math.min(window.innerHeight - 30, this.y))}px`;
      this.node.classList.toggle('flipped', tx < this.x - 1);
      this._raf = requestAnimationFrame(tick);
    };
    this._raf = requestAnimationFrame(tick);
  }

  _scheduleInteraction() {
    this._interactTimer = setInterval(() => {
      if (!this.owner.isVisible || this.owner.isQuiet()) return;
      if (this.owner.state === 'sleeping') {
        this.sleep();
        return;
      }
      if (this.state === 'sleeping') this.wakeUp();
      if (this.owner.state !== 'idle') return;
      const chance = this.owner.emotion === 'joyful' ? 0.75 : 0.45;
      if (Math.random() > chance) return;
      const pool = ['play', 'cuddle', 'nap', 'race', 'explore', 'spin', 'celebrate', 'special'];
      const pick = pool[Math.floor(Math.random() * pool.length)];
      this.interact(pick);
    }, 30000);
  }

  interact(kind, { force = false } = {}) {
    if (!this.node) return false;
    if (this.state === 'sleeping') {
      if (kind === 'nap') return false;
      this.wakeUp('Acordei para brincar! ✨');
    }
    if (this._interactionBusy && kind !== 'cuddle' && !force) return false;
    switch (kind) {
      case 'play':
        this._beginInteraction('playing', 'playing');
        this.owner.showSpeech('Vem brincar! 🎾', 2000);
        this.say('Ual! ✨');
        this.owner.addXp(2);
        this._finishInteractionAfter(2800);
        break;
      case 'cuddle':
        this._beginInteraction('cuddling', 'cuddling');
        this.say('❤️');
        this.owner.setStateFor('happy', 2000);
        this.owner.showSpeech('Que fofo! 💕', 2200);
        this.owner.spawnParticles();
        this.owner.addXp(2);
        this._finishInteractionAfter(1200);
        break;
      case 'nap':
        this._interactionBusy = true;
        this.sleep();
        this._sleepTimer = setTimeout(() => this.wakeUp('Já descansei! ☀️'), 8000);
        break;
      case 'race':
        this._startRace();
        break;
      case 'explore': {
        this._beginInteraction('exploring', 'exploring');
        this._exploreX = 20 + Math.random() * Math.max(20, window.innerWidth - 80);
        this._exploreY = 30 + Math.random() * Math.max(20, window.innerHeight - 100);
        this.say('Explorando! 🔎');
        this.owner.showSpeech('Vai, pequeno explorador! 🗺️', 2200);
        this.owner.addXp(1);
        this._finishInteractionAfter(3200);
        break;
      }
      case 'spin':
        this._beginInteraction('spinning', 'spinning');
        this.say('Uhuuu! 🌀');
        this.owner.spawnParticles(['✨', '⭐']);
        this.owner.addXp(1);
        this._finishInteractionAfter(1300);
        break;
      case 'celebrate':
        this._beginInteraction('celebrating', 'celebrating');
        this.say('Nós conseguimos! 🎉');
        this.owner.setStateFor('celebrate', 1900);
        this.owner.spawnParticles(['🎉', '✨', '⭐']);
        this.owner.addXp(2);
        this._finishInteractionAfter(1900);
        break;
      case 'special':
        this._beginInteraction('special', null);
        this._special();
        break;
      default:
        this._interactionBusy = false;
        return false;
    }
    return true;
  }

  _special() {
    const map = {
      dog:    () => { this.say('Au au! 🦴'); this._finishInteractionAfter(2200); },
      cat:    () => { this.say(Math.random() < 0.4 ? '...😼 (te ignorando)' : 'Miau~'); this._finishInteractionAfter(2200); },
      bird:   () => { this.say('Piu piu! 🎶'); this._beginInteraction('spinning', 'spinning'); this._finishInteractionAfter(1500); },
      rabbit: () => { this._beginInteraction('playing', 'playing'); this.say('Hop hop! 🐰'); this._finishInteractionAfter(2200); },
      dino:   () => { this._startRace('RAWR! 🦖', 3200); },
      dragon: () => { this._beginInteraction('celebrating', 'celebrating'); this.node.classList.add('fire'); this.say('🔥🔥🔥', 2200); this._finishInteractionAfter(2200); },
      ghost:  () => { this._beginInteraction('vanishing', 'vanishing'); this.say('Buu! 👻', 1900); this._finishInteractionAfter(1900); },
      slime:  () => { this._beginInteraction('splitting', 'split'); this.say('blub blub 🫧'); this._finishInteractionAfter(1800); }
    };
    (map[this.species] || map.dog)();
  }

  fetchBall(ballRect) {
    // Cachorro busca a bola chutada
    this._beginInteraction('racing', 'racing');
    this._raceX = ballRect.left;
    this.say('Eu pego! 🎾');
    this._finishInteractionAfter(1800, () => this.say('Trouxe! 🐶'));
  }

  destroy() {
    cancelAnimationFrame(this._raf);
    clearInterval(this._interactTimer);
    clearTimeout(this._sayTimer);
    clearTimeout(this._sleepTimer);
    clearTimeout(this._wakeTimer);
    this._actionTimers.forEach(clearTimeout);
    this._actionTimers.clear();
    this._interactionEndTimer = null;
    if (this.node) this.node.remove();
    this.node = null;
  }
}

/* =====================================================
   CLAW'D COMPANION
   ===================================================== */
class ClawdCompanion {
  constructor(initialState) {
    this.S = initialState;                 // estado completo (schema v3)
    this.node = null;
    this.isDragging = false;
    this.startX = 0; this.startY = 0;
    this.offsetX = 0; this.offsetY = 0;
    this.state = 'idle';
    this.emotion = 'content';
    this.lastActivity = Date.now();
    this.isVisible = true;
    this.isAutoWalking = false;
    this.subpet = null;
    this._speechTimer = null;
    this._stateTimer = null;
    this._timers = [];
    this._hoverStart = 0;
    this._yawned = false;
    this._lastTantrum = 0;
    this._keepy = null;
    this._challengeShown = 0;
    this._port = null;
    this._audioCtx = null;
    this._clickCount = 0;
    this._clickTimer = null;
    this._holdTimer = null;
    this._wakeStretchTimer = null;
    this._fishing = false;
    this._lakeEl = null;
    this._fishingLineEl = null;
    this._keepyCount = 0;
    this._refreshRate = 60;
    this._refreshSamples = [];
    this._refreshMeasureRaf = null;
    this._motionRaf = null;
    this._glideRaf = null;
    this._glide = null;
    this._destroyed = false;
    this._contextInvalidated = false;
    this._abort = new AbortController();

    this.messages = {
      idle:     ["Oi! 👋", "Bora navegar! 🌐", "Me arraste! ✨", "Aqui pra ajudar 🐾", "Clique em mim! 💫", "O que faremos hoje? 🎯"],
      happy:    ["❤️ Obrigado!", "Uhuuu! 🎉", "Que bom! ✨", "Adoro carinho! 💕", "Yay! 🌟", "Melhor sensação! 🥰"],
      sleeping: ["ZzZz... 💤", "😴 Shh...", "Descansando... 💤"],
      excited:  ["Wow! 🤩", "Olha isso! 👀", "Nova página! 🚀", "Uau! ⚡", "Que incrível! ✨"],
      hungry:   ["Tô com fome... 🍖", "Me alimenta? 🥺", "Barriguinha roncando! 🍽️", "Fome! 😩"],
      sad:      ["Sinto sua falta... 😢", "Um carinho? 🥺", "Tô triste... 💧"],
      joyful:   ["Melhor dia! 🤩", "Amo navegar com você! 💖", "Que aventura! 🚀"]
    };

    this._contextMap = {
      footballer: ['ge.globo', 'espn', 'lance', 'goal.com', 'sofascore', 'futbol', 'football', 'sport'],
      tutor:      ['youtube', 'twitter', 'x.com', 'instagram', 'facebook', 'tiktok', 'reddit'],
      engineer:   ['github', 'gitlab', 'stackoverflow', 'developer.', 'docs.', 'mdn', 'npmjs', 'pypi'],
      musician:   ['spotify', 'music.youtube', 'soundcloud', 'deezer', 'last.fm', 'letras.mus'],
      chef:       ['tudogostoso', 'receitas', 'panelinha', 'allrecipes', 'cybercook', 'recipe'],
      ninja:      [],
      fisher:     ['pesca', 'fishing', 'natureza', 'aquarius', 'peixe', 'lake', 'rio', 'mar', 'oceano', 'aqua']
    };

    this._profMessages = {
      footballer: ["Goool! ⚽", "Vamos time! 🏆", "Assistindo futebol? ⚽", "Partida boa? 🏟️"],
      tutor:      ["Foca nos estudos! 📚", "Sem distrações! 🎯", "Hora de estudar! ✏️"],
      engineer:   ["Código limpo! 💻", "PR aprovado? 🚀", "Git push! 📦"],
      musician:   ["🎸 Que som!", "Aumenta o volume! 🎶", "Riff novo! 🎵"],
      chef:       ["Hmm, que cheirinho! 🍲", "Bora cozinhar? 🧑‍🍳", "Essa receita é boa! 😋"],
      ninja:      ["...🥷", "Você não me viu. 🌫️"],
      fisher:     ["Fisgou! 🎣", "Hoje vai dar peixe! 🐟", "Silêncio... os peixes! 🤫", "Linha na água! 🌊"]
    };

    // Peixes raros com raridade
    this._fishPool = [
      { name: '🐟 Peixinho',   rare: false, msg: 'Pescou um peixinho! 🐟',    xp: 3  },
      { name: '🐡 Baiacu',     rare: false, msg: 'Baiacu capturado! 🐡',       xp: 5  },
      { name: '🦈 Tubarão',    rare: true,  msg: 'OMG! Um tubarão! 🦈',        xp: 20 },
      { name: '🐬 Golfinho',   rare: true,  msg: 'Golfinho amigo! 🐬',         xp: 18 },
      { name: '🐙 Polvo',      rare: true,  msg: 'Polvo 8 braços! 🐙',         xp: 15 },
      { name: '⭐ Estrela',    rare: false, msg: 'Estrela-do-mar! ⭐🌊',        xp: 8  },
      { name: '🪸 Coral',      rare: false, msg: 'Um coral colorido! 🪸',       xp: 6  },
      { name: '🐠 Palhaço',   rare: false, msg: 'Peixe palhaço! 🐠',          xp: 7  },
      { name: '🦐 Camarão',    rare: false, msg: 'Camarão sortudo! 🦐',        xp: 4  },
      { name: '👟 Tênis',     rare: false, msg: 'Opa... um tênis. 👟😅',      xp: 1  }
    ];

    this.init();
  }

  /* ---------- BOOT ---------- */
  init() {
    if (!this._hasExtensionContext()) {
      this._handleExtensionContextInvalidated();
      return;
    }
    this.createNode();
    this.applyAll();
    this.measureRefreshRate();
    this.bindEvents();
    this.listenToMessages();
    if (this._destroyed) return;
    this.listenToStorage();
    if (this._destroyed) return;
    this._startContextHeartbeat();
    this.applyOfflineDecay();
    this.checkStreak();
    this.trackTab();
    this.startBehaviorLoop();
    this.setupCrossTab();
    if (this._destroyed) return;
    this._detectPageContext();
    this.refreshSubpet();
    setTimeout(() => {
      if (!this._destroyed && this.isVisible && !this.isQuiet()) this.showSpeech(this.getRandom('idle'));
    }, 1400);
  }

  _hasExtensionContext() {
    return clawdHasExtensionContext(globalThis.chrome);
  }

  _handleExtensionContextInvalidated() {
    if (this._contextInvalidated) return;
    this._contextInvalidated = true;
    this.destroy({ skipExtensionApis: true });
    if (window.__clawd === this) window.__clawd = null;
  }

  _safeChrome(operation, fallback = null) {
    return clawdSafeExtensionCall(globalThis.chrome, operation, {
      fallback,
      onInvalidated: () => this._handleExtensionContextInvalidated()
    });
  }

  _guardChromeCallback(callback) {
    return clawdGuardExtensionCallback(
      globalThis.chrome,
      callback,
      () => this._handleExtensionContextInvalidated()
    );
  }

  _startContextHeartbeat() {
    this._timers.push(setInterval(() => {
      if (!this._hasExtensionContext()) this._handleExtensionContextInvalidated();
    }, 500));
  }

  createNode() {
    this.node = document.createElement('div');
    this.node.id = 'aic-clawd-node';
    this.node.dataset.clawdOwned = 'true';
    this.node.tabIndex = 0;
    this.node.setAttribute('role', 'img');
    this.node.setAttribute('aria-label', "Claw'd, pet virtual interativo");
    this.node.innerHTML = `
      <div class="speech-bubble" id="aic-speech"></div>
      <div class="emotion-badge" id="aic-emotion"></div>
      <div class="pet-body" id="aic-pet-body">
        <div class="sprite-stack" id="aic-stack">
          <div class="pixel-sprite" id="aic-sprite"></div>
          <div class="pixel-legs" id="aic-pixel-legs" aria-hidden="true"></div>
          <div class="smooth-sprite" id="aic-smooth-sprite" aria-hidden="true">
            <span class="smooth-core"></span>
            <span class="smooth-leg smooth-leg-1"></span>
            <span class="smooth-leg smooth-leg-2"></span>
            <span class="smooth-leg smooth-leg-3"></span>
            <span class="smooth-leg smooth-leg-4"></span>
          </div>
          <div class="pet-eyes" id="aic-pet-eyes" aria-hidden="true"></div>
          <div class="face-detail" id="aic-face-detail" aria-hidden="true"></div>
          <div class="emotion-face" id="aic-emotion-face">
            <span class="blink-cover"></span><span class="blink-line"></span><span class="emotion-mouth"></span>
          </div>
          <div class="jersey" id="aic-jersey"></div>
          <div class="skin-mod" id="aic-skin"></div>
          <div class="accessory acc-head" id="aic-acc-head"></div>
          <div class="accessory acc-face" id="aic-acc-face"></div>
          <div class="laptop" id="aic-laptop"></div>
          <div class="fishing-rod-layer" id="aic-fishing-rod"></div>
        </div>
        <div class="name-tag" id="aic-name-tag"></div>
      </div>
      <div class="pet-ball" id="aic-ball" title="Chuta a bola!"></div>
      <div class="ground-shadow" id="aic-shadow"></div>
    `;
    document.body.appendChild(this.node);
    this.bodyNode    = this.node.querySelector('#aic-pet-body');
    this.nameNode    = this.node.querySelector('#aic-name-tag');
    this.speechNode  = this.node.querySelector('#aic-speech');
    this.spriteNode  = this.node.querySelector('#aic-sprite');
    this.legsNode    = this.node.querySelector('#aic-pixel-legs');
    this.shadowNode  = this.node.querySelector('#aic-shadow');
    this.ballNode    = this.node.querySelector('#aic-ball');
    this.emotionNode = this.node.querySelector('#aic-emotion');
    this.stackNode   = this.node.querySelector('#aic-stack');
    this.node.style.animation = 'clawd-pop-in 0.5s cubic-bezier(0.34,1.56,0.64,1) both';
    this.applyStartCorner();
  }

  applyStartCorner() {
    if (this.S.position?.x != null && this.S.position?.y != null) {
      this.updatePosition(this.S.position.x, this.S.position.y);
      return;
    }
    const corner = this.S.settings.startCorner || 'br';
    const st = this.node.style;
    st.left = st.top = st.right = st.bottom = 'auto';
    if (corner.includes('b')) st.bottom = '20px'; else st.top = '20px';
    if (corner.includes('r')) st.right = '20px'; else st.left = '20px';
  }

  applyAll() {
    const S = this.S;
    const animationSpeed = Math.max(0.5, parseFloat(S.animSpeed) || 1);
    this.nameNode.innerText = S.name;
    this.node.style.setProperty('--agent-color', S.color);
    this.node.style.setProperty('--agent-eye-color', S.eyeColor || '#08080b');
    this.node.style.setProperty('--agent-scale', parseFloat(S.scale));
    this.node.style.setProperty('--jersey-color', S.jerseyColor);
    this.node.style.setProperty('--clawd-step-duration', `${(0.42 / animationSpeed).toFixed(3)}s`);
    this.node.style.setProperty('--clawd-run-duration', `${(0.18 / animationSpeed).toFixed(3)}s`);
    this.node.classList.toggle('smooth', !!S.smooth);
    this.node.classList.toggle('outlined', !!S.outline);
    this.node.classList.toggle('mouth-hidden', S.showMouth === false);
    this.node.classList.toggle('aic-nofx', !!S.settings.performanceMode);
    this.node.dataset.state = this.state;
    this.node.setAttribute('data-model', S.model || 'classic');
    this.node.setAttribute('data-face-style', S.faceStyle || 'classic');
    this.node.setAttribute('data-skin', S.skin || 'normal');
    this.node.setAttribute('data-tag-theme', S.tagTheme || 'light');
    this.node.setAttribute('data-ball-skin', S.ballSkin || 'classic');
    this._applyProfessionVisuals();
    this.updateEmotion(true);
  }

  measureRefreshRate() {
    const samples = [];
    let last = performance.now();
    const sample = (now) => {
      samples.push(now - last);
      last = now;
      if (samples.length < 30) {
        this._refreshMeasureRaf = requestAnimationFrame(sample);
        return;
      }
      const valid = samples.slice(4).filter(frame => frame >= 4 && frame <= 80);
      const average = valid.reduce((sum, frame) => sum + frame, 0) / Math.max(1, valid.length);
      this._refreshRate = Math.round(Math.max(30, Math.min(240, 1000 / average)));
      this.node.style.setProperty('--clawd-refresh-rate', this._refreshRate);
      this.node.dataset.refreshRate = String(this._refreshRate);
      this.node.classList.toggle('aic-low-refresh', this._refreshRate < 55);
      this._refreshSamples = valid;
      this._refreshMeasureRaf = null;
    };
    this._refreshMeasureRaf = requestAnimationFrame(sample);
  }

  /* ---------- PERSISTÊNCIA ---------- */
  save() {
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => {
      if (this._destroyed || !this._hasExtensionContext()) {
        this._handleExtensionContextInvalidated();
        return;
      }
      // read-modify-write: preserva mudanças feitas pelo popup em paralelo
      const onState = this._guardChromeCallback((res) => {
        const stored = clawdMigrateState(res.clawdState);
        // popup é dono destes campos — mantém a versão do storage
        this.S.favorites = stored.favorites;
        this.S.settings = Object.assign({}, this.S.settings, stored.settings);
        this.S.subpets = stored.subpets;
        this.S.game.inventory = stored.game.inventory;
        this._safeChrome(() => chrome.storage.local.set({ clawdState: this.S }));
      });
      this._safeChrome(() => chrome.storage.local.get(['clawdState'], onState));
    }, 350);
  }

  listenToStorage() {
    this._storageListener = this._guardChromeCallback((changes, area) => {
      if (area !== 'local' || !changes.clawdState) return;
      const fresh = clawdMigrateState(changes.clawdState.newValue);
      // Sincroniza campos que o popup controla
      this.S.favorites = fresh.favorites;
      this.S.settings = fresh.settings;
      this.S.game.inventory = fresh.game.inventory;
      this.S.game.coins = fresh.game.coins;
      const visualKeys = [
        'name', 'color', 'eyeColor', 'model', 'faceStyle', 'scale', 'animSpeed',
        'smooth', 'outline', 'showMouth', 'showSpeech', 'autoWalk', 'sleepEnabled',
        'skin', 'tagTheme', 'jerseyColor', 'ballSkin', 'accessoryHead',
        'accessoryFace', 'profession'
      ];
      visualKeys.forEach(key => { this.S[key] = fresh[key]; });
      const animationSpeed = Math.max(0.5, parseFloat(fresh.animSpeed) || 1);
      this.nameNode.innerText = fresh.name || "Claw'd";
      this.node.style.setProperty('--agent-color', fresh.color || '#c71515');
      this.node.style.setProperty('--agent-eye-color', fresh.eyeColor || '#08080b');
      this.node.style.setProperty('--agent-scale', parseFloat(fresh.scale) || 1.5);
      this.node.style.setProperty('--jersey-color', fresh.jerseyColor);
      this.node.style.setProperty('--clawd-step-duration', `${(0.42 / animationSpeed).toFixed(3)}s`);
      this.node.style.setProperty('--clawd-run-duration', `${(0.18 / animationSpeed).toFixed(3)}s`);
      this.node.classList.toggle('smooth', !!fresh.smooth);
      this.node.classList.toggle('outlined', !!fresh.outline);
      this.node.classList.toggle('mouth-hidden', fresh.showMouth === false);
      this.node.setAttribute('data-model', fresh.model || 'classic');
      this.node.setAttribute('data-face-style', fresh.faceStyle || 'classic');
      this.node.setAttribute('data-skin', fresh.skin || 'normal');
      this.node.setAttribute('data-tag-theme', fresh.tagTheme || 'light');
      this.node.setAttribute('data-ball-skin', fresh.ballSkin || 'classic');
      this.node.classList.toggle('aic-nofx', !!fresh.settings.performanceMode);
      this._applyProfessionVisuals();
      // Reconciliamos o objeto inteiro: desbloqueios, apelidos, cores e pet ativo
      // podem mudar juntos pelo popup. Atualizações parciais deixavam a lista de
      // desbloqueios antiga e impediam a criação do sub-pet recém-selecionado.
      this.S.subpets = fresh.subpets;
      this.refreshSubpet();
    });
    this._safeChrome(() => chrome.storage.onChanged.addListener(this._storageListener));
  }

  applyConfig(key, value) {
    this.S[key] = value;
    switch (key) {
      case 'name':
        this.nameNode.innerText = value;
        this.node.setAttribute('aria-label', `${value || "Claw'd"}, pet virtual interativo`);
        if (value && !this.S.nicknameHistory.includes(value)) {
          this.S.nicknameHistory.push(value);
          if (this.S.nicknameHistory.length > 12) this.S.nicknameHistory.shift();
        }
        break;
      case 'color':   this.node.style.setProperty('--agent-color', value); break;
      case 'eyeColor': this.node.style.setProperty('--agent-eye-color', value); break;
      case 'model': this.node.setAttribute('data-model', value); break;
      case 'faceStyle': this.node.setAttribute('data-face-style', value); break;
      case 'scale':
        this.node.style.setProperty('--agent-scale', parseFloat(value));
        if (this.subpet) this.subpet.node.style.setProperty('--subpet-scale', Math.max(0.9, parseFloat(value) * 0.6));
        break;
      case 'animSpeed':
        {
          const animationSpeed = Math.max(0.5, parseFloat(value) || 1);
          this.node.style.setProperty('--clawd-step-duration', `${(0.42 / animationSpeed).toFixed(3)}s`);
          this.node.style.setProperty('--clawd-run-duration', `${(0.18 / animationSpeed).toFixed(3)}s`);
        }
        break;
      case 'smooth':  this.node.classList.toggle('smooth', !!value); break;
      case 'outline': this.node.classList.toggle('outlined', !!value); break;
      case 'showMouth': this.node.classList.toggle('mouth-hidden', value === false); break;
      case 'showSpeech':
        if (!value) {
          clearTimeout(this._speechTimer);
          this._speechTimer = null;
          this.speechNode.classList.remove('visible', 'interactive');
        }
        break;
      case 'autoWalk':
        if (!value) this.cancelMovement();
        break;
      case 'sleepEnabled':
        if (!value && this.state === 'sleeping') this.wakeUp();
        break;
      case 'skin':    this.node.setAttribute('data-skin', value); break;
      case 'tagTheme': this.node.setAttribute('data-tag-theme', value); break;
      case 'jerseyColor': this.node.style.setProperty('--jersey-color', value); break;
      case 'ballSkin': this.node.setAttribute('data-ball-skin', value); break;
      case 'accessoryHead':
        this._syncAccessoryVisuals();
        this._trackAccessory(value);
        break;
      case 'accessoryFace':
        this._syncAccessoryVisuals();
        this._trackAccessory(value);
        break;
      case 'profession':
        this._applyProfessionVisuals();
        this._detectPageContext();
        break;
    }
    this.save();
  }

  registerDaily(type, amount = 1) {
    const quest = clawdRegisterDailyProgress(this.S, type, amount);
    if (quest.progress >= quest.target && !quest.claimed && !this._dailyCelebrated) {
      this._dailyCelebrated = true;
      this.showSpeech('Missão diária pronta! Resgate sua recompensa! 🎁', 3200);
      this.spawnParticles(['🎁', '⭐', '✨']);
    }
    this.save();
  }

  claimDailyQuest() {
    const quest = clawdEnsureDailyQuest(this.S);
    if (quest.claimed || quest.progress < quest.target) return false;
    quest.claimed = true;
    this.S.game.coins = (this.S.game.coins || 0) + quest.rewardCoins;
    this.addXp(quest.rewardXp);
    this.showSpeech(`Missão concluída! +${quest.rewardCoins} 🪙`, 3200);
    this.toast('', { rarity: 'rare', icon: '🎁', title: 'Recompensa diária', desc: `+${quest.rewardXp} XP e +${quest.rewardCoins} PixelCoins` });
    this._dailyCelebrated = false;
    this.save();
    return true;
  }

  _trackAccessory(id) {
    if (!id || id === 'none') return;
    const used = this.S.game.counters.accessoriesUsed || [];
    if (!used.includes(id)) {
      used.push(id);
      this.S.game.counters.accessoriesUsed = used;
      this.checkAchievements();
    }
  }

  _syncAccessoryVisuals() {
    const effective = clawdEffectiveAccessories(this.S);
    this.node.dataset.accHead = effective.head;
    this.node.dataset.accFace = effective.face;
    this.node.dataset.userAccHead = effective.userHead;
    this.node.dataset.userAccFace = effective.userFace;
    this.node.dataset.accessoryHeadSource = effective.headSource;
    this.node.dataset.accessoryFaceSource = effective.faceSource;
    this.node.classList.toggle('profession-headwear', !!effective.autoHead);
    this.node.classList.toggle('profession-facewear', !!effective.autoFace);
    return effective;
  }

  _applyProfessionVisuals() {
    const effective = this._syncAccessoryVisuals();
    this.node.dataset.profession = effective.profession;
    if (effective.autoHead) this._trackAccessory(effective.autoHead);
    if (effective.autoFace) this._trackAccessory(effective.autoFace);
    this.node.classList.toggle('has-ball', effective.profession === 'footballer');
    this.node.classList.toggle('has-jersey', effective.profession === 'footballer');
    if (effective.profession !== 'footballer') this.stopKeepyUppy();
    if (effective.profession !== 'fisher') this.stopFishing();
  }

  /* ---------- POSIÇÃO / ESTADOS ---------- */
  updatePosition(x, y) {
    const pad = 10;
    const maxX = window.innerWidth - 80 - pad;
    const maxY = window.innerHeight - 130 - pad;
    x = Math.max(pad, Math.min(x, maxX));
    y = Math.max(pad, Math.min(y, maxY));
    this.node.style.left = `${x}px`;
    this.node.style.top = `${y}px`;
    this.node.style.right = 'auto';
    this.node.style.bottom = 'auto';
  }

  cancelGlide() {
    if (this._glideRaf) cancelAnimationFrame(this._glideRaf);
    this._glideRaf = null;
    this._glide = null;
    this.isAutoWalking = false;
    if (this.state === 'walking') this.setState('idle');
  }

  cancelMovement() {
    if (this._motionRaf) cancelAnimationFrame(this._motionRaf);
    this._motionRaf = null;
    this.cancelGlide();
    this.isAutoWalking = false;
    if (this.stackNode) this.stackNode.style.transform = '';
    if (this.state === 'walking' || this.state === 'running') this.setState('idle');
  }

  startGlide(velocityX, velocityY) {
    if (Math.hypot(velocityX, velocityY) < 0.35) {
      if (this.state === 'walking') this.setState('idle');
      return false;
    }
    this.cancelMovement();
    const rect = this.node.getBoundingClientRect();
    this._glide = { x: rect.left, y: rect.top, vx: velocityX, vy: velocityY, last: performance.now() };
    this.isAutoWalking = true;
    this.setState('walking');
    const tick = (now) => {
      if (!this._glide) return;
      const g = this._glide;
      const dt = Math.min(32, Math.max(1, now - g.last)) / 16.67;
      g.last = now;
      g.x += g.vx * dt;
      g.y += g.vy * dt;
      const maxX = Math.max(10, window.innerWidth - 90);
      const maxY = Math.max(10, window.innerHeight - 140);
      if (g.x <= 10 || g.x >= maxX) { g.x = Math.max(10, Math.min(maxX, g.x)); g.vx *= -0.62; }
      if (g.y <= 10 || g.y >= maxY) { g.y = Math.max(10, Math.min(maxY, g.y)); g.vy *= -0.62; }
      g.vx *= Math.pow(0.93, dt);
      g.vy *= Math.pow(0.93, dt);
      this.stackNode.style.transform = g.vx < -0.2 ? 'scaleX(-1)' : '';
      this.updatePosition(g.x, g.y);
      if (Math.hypot(g.vx, g.vy) < 0.18) {
        this.cancelGlide();
        this.S.position = { x: g.x, y: g.y };
        this.save();
        return;
      }
      this._glideRaf = requestAnimationFrame(tick);
    };
    this._glideRaf = requestAnimationFrame(tick);
    return true;
  }

  setState(newState) {
    if (this.state === newState) return;
    if (newState !== 'idle' && this._wakeStretchTimer) {
      clearTimeout(this._wakeStretchTimer);
      this._wakeStretchTimer = null;
    }
    if (this.state === 'sleeping' && newState !== 'sleeping') this._yawned = false;
    this.node.classList.remove(this.state);
    this.state = newState;
    this.node.dataset.state = newState;
    if (newState !== 'idle') this.node.classList.add(newState);
    const stateEmoji = {
      happy: '🥰', excited: '🤩', sleeping: '😴', waving: '👋', eating: '😋',
      celebrate: '🎉', yawning: '🥱', shy: '🙈', tantrum: '😤', bathing: '🫧',
      fishing: '🎣', reeling: '🐟', jumping: '✨', roaring: '🦁', highfive: '✋'
    }[newState];
    if (stateEmoji) this.showEmotionEmoji(stateEmoji);
    if (newState === 'sleeping') {
      this.S.game.counters.sleeps = (this.S.game.counters.sleeps || 0) + 1;
      this.checkAchievements();
      this.save();
    }
  }

  setStateFor(state, ms) {
    this.setState(state);
    clearTimeout(this._stateTimer);
    this._stateTimer = setTimeout(() => {
      if (this.state === state) this.setState('idle');
    }, ms);
  }

  _queuePetClick() {
    this._clickCount++;
    clearTimeout(this._clickTimer);
    this._clickTimer = setTimeout(() => {
      if (this._clickCount >= 3) this.doSuperDance();
      else if (this._clickCount === 2) this.doSomersault();
      else this.giveAffection();
      this._clickCount = 0;
      this._clickTimer = null;
    }, 260);
  }

  /* ---------- EVENTOS ---------- */
  bindEvents() {
    const signal = this._abort.signal;
    this.node.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        this.giveAffection();
      }
    }, { signal });
    this.ballNode.addEventListener('mousedown', (e) => e.stopPropagation(), { signal });
    this.ballNode.addEventListener('click', (e) => { e.stopPropagation(); this.kickBall(); }, { signal });

    this.node.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      if (e.target.closest('.challenge-opt')) return;
      this.cancelMovement();
      this.isDragging = true;
      this.startX = e.clientX; this.startY = e.clientY;
      const rect = this.node.getBoundingClientRect();
      this.offsetX = e.clientX - rect.left;
      this.offsetY = e.clientY - rect.top;
      this.lastActivity = Date.now();
      if (this.state === 'sleeping') this.wakeUp();
      e.preventDefault();

      this._lastMX = e.clientX;
      this._lastMY = e.clientY;
      this._lastDragAt = performance.now();
      this._dragVelocityX = 0;
      this._dragVelocityY = 0;

      // Segurar por 2s → pose especial
      this._holdTimer = setTimeout(() => {
        if (this.isDragging && Math.abs(this._lastMX - this.startX) < 5 && Math.abs(this._lastMY - this.startY) < 5) {
          this.doPose();
          this.showSpeech('📸 Segurando!', 2000);
          this.addXp(3);
        }
      }, 2000);
    }, { signal });

    // Click sem ponteiro (ex.: element.click()) continua acessível. Cliques físicos
    // são consolidados no mouseup para não depender do click sintético do navegador.
    this.node.addEventListener('click', (e) => {
      if (e.target.closest('.challenge-opt')) return;
      if (e.detail === 0) this._queuePetClick();
    }, { signal });

    let petCount = 0;
    document.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        // arrastar rápido → corrida com poeira
        const speed = Math.sqrt(
          Math.pow(e.clientX - this._lastMX, 2) + Math.pow(e.clientY - this._lastMY, 2)
        );
        if (speed > 18 && !this.S.settings.performanceMode) {
          const rect = this.node.getBoundingClientRect();
          const dust = document.createElement('div');
          dust.className = 'aic-dust';
          dust.style.left = `${rect.left + 20}px`;
          dust.style.top  = `${rect.top + 60}px`;
          document.body.appendChild(dust);
          setTimeout(() => dust.remove(), 600);
        }
        const now = performance.now();
        const dt = Math.max(8, now - (this._lastDragAt || now));
        this._dragVelocityX = ((e.clientX - this._lastMX) / dt) * 16.67;
        this._dragVelocityY = ((e.clientY - this._lastMY) / dt) * 16.67;
        this._lastDragAt = now;
        this._lastMX = e.clientX;
        this._lastMY = e.clientY;
        this.stackNode.style.transform = this._dragVelocityX < -0.2 ? 'scaleX(-1)' : '';
        if (this.state !== 'walking' && this.state !== 'running') this.setState('walking');
        this.updatePosition(e.clientX - this.offsetX, e.clientY - this.offsetY);
        this.lastActivity = Date.now();
      } else {
        this.lookAtCursor(e.clientX, e.clientY);
        this._trackHoverShy(e);

        // Petting mechanic: if mouse moves over pet multiple times quickly
        const rect = this.node.getBoundingClientRect();
        if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
            petCount++;
            if (petCount > 30) {
                petCount = 0;
                if (this.state === 'idle') {
                    this.giveAffection();
                }
            }
        } else {
            petCount = Math.max(0, petCount - 1);
        }
      }
    }, { signal });

    document.addEventListener('mouseup', (e) => {
      clearTimeout(this._holdTimer);
      if (!this.isDragging) return;
      this.isDragging = false;
      const diffX = Math.abs(e.clientX - this.startX);
      const diffY = Math.abs(e.clientY - this.startY);
      if (diffX < 5 && diffY < 5) {
        this._queuePetClick();
      } else {
        this.startGlide(this._dragVelocityX || 0, this._dragVelocityY || 0);
        const rect = this.node.getBoundingClientRect();
        this.S.position = { x: rect.left, y: rect.top };
        this.save();
      }
    }, { signal });

    // Touch
    this.node.addEventListener('touchstart', (e) => {
      const t = e.touches[0];
      this.cancelMovement();
      this.isDragging = true;
      this.startX = t.clientX; this.startY = t.clientY;
      const rect = this.node.getBoundingClientRect();
      this.offsetX = t.clientX - rect.left;
      this.offsetY = t.clientY - rect.top;
      this._lastMX = t.clientX;
      this._lastMY = t.clientY;
      this._lastDragAt = performance.now();
      this._dragVelocityX = 0;
      this._dragVelocityY = 0;
      if (this.state === 'sleeping') this.wakeUp();
      e.preventDefault();
    }, { passive: false, signal });

    document.addEventListener('touchmove', (e) => {
      if (!this.isDragging) return;
      const t = e.touches[0];
      const now = performance.now();
      const dt = Math.max(8, now - (this._lastDragAt || now));
      this._dragVelocityX = ((t.clientX - this._lastMX) / dt) * 16.67;
      this._dragVelocityY = ((t.clientY - this._lastMY) / dt) * 16.67;
      this._lastDragAt = now;
      this._lastMX = t.clientX;
      this._lastMY = t.clientY;
      this.stackNode.style.transform = this._dragVelocityX < -0.2 ? 'scaleX(-1)' : '';
      if (this.state !== 'walking' && this.state !== 'running') this.setState('walking');
      this.updatePosition(t.clientX - this.offsetX, t.clientY - this.offsetY);
      this.lastActivity = Date.now();
    }, { passive: true, signal });

    document.addEventListener('touchend', (e) => {
      if (!this.isDragging) return;
      this.isDragging = false;
      const t = e.changedTouches[0];
      if (Math.abs(t.clientX - this.startX) < 10 && Math.abs(t.clientY - this.startY) < 10) {
        this._queuePetClick();
      } else {
        this.startGlide(this._dragVelocityX || 0, this._dragVelocityY || 0);
      }
    }, { signal });

    // Scroll
    let scrollTimer;
    document.addEventListener('scroll', () => {
      this.lastActivity = Date.now();
      if (this.state === 'sleeping') { this.wakeUp(); return; }
      if (this.state === 'idle') {
        this.setState('excited');
        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(() => {
          if (this.state === 'excited') this.setState('idle');
        }, 900);
      }
    }, { passive: true, signal });

    // "Você voltou!" ao retornar à aba
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.isVisible && !this.isQuiet()) {
        this.lastActivity = Date.now();
        if (this.state === 'sleeping') this.wakeUp();
        this.showSpeech('Você voltou! 🎉', 2200);
        this.setStateFor('waving', 1800);
      }
    }, { signal });

    // Rolar mouse sobre o pet → pisca e sorri
    this.node.addEventListener('wheel', (e) => {
      e.stopPropagation();
      if (this.state === 'idle') {
        this.showSpeech('Uiii! 😵‍💫', 1200);
        this.setStateFor('excited', 800);
      }
    }, { passive: true, signal });
  }

  _trackHoverShy(e) {
    const rect = this.node.getBoundingClientRect();
    const inside = e.clientX >= rect.left && e.clientX <= rect.right &&
                   e.clientY >= rect.top  && e.clientY <= rect.bottom;
    if (inside && this.state === 'idle') {
      if (!this._hoverStart) this._hoverStart = Date.now();
      else if (Date.now() - this._hoverStart > 3000) {
        this._hoverStart = 0;
        this.setStateFor('shy', 2500);
        this.showSpeech('🙈 Que vergonha...', 2200);
      }
    } else {
      this._hoverStart = 0;
    }
  }

  lookAtCursor(mouseX, mouseY) {
    if (this.isDragging || this.state === 'sleeping' || this.isAutoWalking) return;
    if (this.S.settings.performanceMode) return;
    const rect = this.node.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const rx = Math.max(-12, Math.min(12, (mouseY - cy) * 0.035));
    const ry = Math.max(-12, Math.min(12, (mouseX - cx) * 0.035));
    this.node.style.transform = `perspective(600px) rotateX(${-rx}deg) rotateY(${ry}deg)`;
  }

  /* ---------- QUIET HOURS ---------- */
  isQuiet() {
    const { quietStart, quietEnd } = this.S.settings;
    if (!quietStart || !quietEnd) return false;
    const now = new Date();
    const cur = now.getHours() * 60 + now.getMinutes();
    const [sh, sm] = quietStart.split(':').map(Number);
    const [eh, em] = quietEnd.split(':').map(Number);
    const start = sh * 60 + (sm || 0);
    const end = eh * 60 + (em || 0);
    if (start <= end) return cur >= start && cur < end;
    return cur >= start || cur < end; // atravessa a meia-noite
  }

  /* ---------- SONS 8-BIT ---------- */
  beep(freq = 660, dur = 0.07, type = 'square') {
    if (!this.S.settings.sounds || this.isQuiet()) return;
    try {
      if (!this._audioCtx) this._audioCtx = new AudioContext();
      const ctx = this._audioCtx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.value = (this.S.settings.soundVolume || 0.4) * 0.12;
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + dur);
    } catch (_) { /* autoplay policy */ }
  }

  // Som de conquista por raridade
  beepAchievement(rarity) {
    const seqs = {
      common:    [[440,0.06],[550,0.06]],
      rare:      [[440,0.06],[550,0.06],[660,0.1]],
      epic:      [[440,0.06],[550,0.06],[660,0.06],[880,0.12]],
      legendary: [[440,0.06],[550,0.06],[660,0.06],[880,0.06],[1100,0.18]]
    };
    const seq = seqs[rarity] || seqs.common;
    seq.forEach(([f, d], i) => setTimeout(() => this.beep(f, d, 'square'), i * 90));
  }

  /* ---------- GAMIFICAÇÃO ---------- */
  addXp(amount) {
    amount = Math.max(0, Number(amount) || 0);
    const before = clawdLevelFromXp(this.S.xp).level;
    this.S.xp += amount;
    // PixelCoins: ~1 a cada 5 XP
    this.S.game.coinFrac = (this.S.game.coinFrac || 0) + amount / 5;
    const whole = Math.floor(this.S.game.coinFrac);
    if (whole > 0) {
      this.S.game.coins = (this.S.game.coins || 0) + whole;
      this.S.game.coinFrac -= whole;
    }
    const after = clawdLevelFromXp(this.S.xp).level;
    if (after > before) this.onLevelUp(after);
    this.save();
  }

  onLevelUp(level) {
    this.showSpeech(`🎖️ Level ${level}!`, 3500);
    this.spawnParticles(['🎉', '⭐', '✨', '🎊']);
    this.setStateFor('celebrate', 2500);
    this.beep(880, 0.12);
    // Desbloqueio de sub-pets por nível
    let newly = 0;
    Object.entries(CLAWD_SUBPETS).forEach(([id, def]) => {
      if (def.level <= level && !this.S.subpets.unlocked.includes(id)) {
        this.S.subpets.unlocked.push(id);
        newly++;
        this.toast(`${def.emoji} Sub-pet desbloqueado: ${def.label}!`, { rarity: 'rare', icon: def.emoji, title: `${def.label} desbloqueado!`, desc: def.special });
      }
    });
    if (newly) {
      this.S.subpets.unlocked = [...new Set(this.S.subpets.unlocked)];
      this.S.game.counters.subpetsUnlocked = this.S.subpets.unlocked.length;
    }
    // Coroa no nível 20
    if (level >= 20 && !this.S.game.inventory.includes('crown')) {
      this.S.game.inventory.push('crown');
      this.toast('👑 Coroa desbloqueada!', { rarity: 'legendary', icon: '👑', title: 'Coroa Desbloqueada!', desc: 'Você é rei/rainha do nível 20!' });
    }
    this.checkAchievements();
  }

  checkAchievements() {
    Object.entries(CLAWD_ACHIEVEMENTS).forEach(([id, def]) => {
      if (this.S.game.achievements[id]) return;
      if (def.check(this.S.game)) {
        this.S.game.achievements[id] = true;
        const rarity = def.rarity || 'common';
        this.toast('', {
          rarity,
          icon: def.emoji,
          title: `Conquista: ${def.label}`,
          desc: def.desc
        });
        this.spawnParticles(['🏆', '✨', '⭐']);
        this.beepAchievement(rarity);
        this.save();
      }
    });
  }

  /**
   * Toast gamificado com raridade, ícone, barra de progresso e efeito glitch.
   * @param {string} text — texto simples (fallback legado)
   * @param {object} opts — { rarity, icon, title, desc }
   */
  toast(text, opts = {}) {
    const rarity = opts.rarity || 'common';
    const rarityDef = CLAWD_RARITY[rarity] || CLAWD_RARITY.common;
    const icon  = opts.icon  || '🏆';
    const title = opts.title || text;
    const desc  = opts.desc  || '';
    const stars = '★'.repeat(rarityDef.stars) + '☆'.repeat(4 - rarityDef.stars);

    const el = document.createElement('div');
    el.className = 'aic-toast';
    el.style.setProperty('--toast-color', rarityDef.color);
    el.style.setProperty('--toast-glow', `0 0 20px ${rarityDef.glow}`);
    el.innerHTML = `
      <div class="aic-toast-corner tl"></div>
      <div class="aic-toast-corner tr"></div>
      <div class="aic-toast-corner bl"></div>
      <div class="aic-toast-corner br"></div>
      <div class="aic-toast-inner">
        <div class="aic-toast-icon">${icon}</div>
        <div class="aic-toast-text">
          <div class="aic-toast-rarity">${rarityDef.label}</div>
          <div class="aic-toast-title">${title}</div>
          ${desc ? `<div class="aic-toast-desc">${desc}</div>` : ''}
          <div class="aic-toast-stars">${stars}</div>
        </div>
      </div>
      <div class="aic-toast-progress-bar">
        <div class="aic-toast-progress-fill"></div>
      </div>
    `;
    document.body.appendChild(el);
    setTimeout(() => el.classList.add('visible'), 30);
    setTimeout(() => {
      el.classList.add('hiding');
      setTimeout(() => el.remove(), 450);
    }, 3800);
  }

  checkStreak() {
    const today = new Date().toISOString().slice(0, 10);
    const st = this.S.game.streak;
    if (st.lastDay === today) return;
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    st.days = st.lastDay === yesterday ? (st.days || 0) + 1 : 1;
    st.lastDay = today;
    const bonus = Math.min(50, 10 + (st.days - 1) * 7);
    this.addXp(bonus);
    const rarity = st.days >= 7 ? 'epic' : st.days >= 3 ? 'rare' : 'common';
    setTimeout(() => this.toast('', {
      rarity,
      icon: '🔥',
      title: `Streak de ${st.days} dia${st.days > 1 ? 's' : ''}!`,
      desc: `+${bonus} XP de bônus!`
    }), 2500);
    this.save();
  }

  trackTab() {
    const today = new Date().toISOString().slice(0, 10);
    const c = this.S.game.counters;
    if (c.tabsDay !== today) { c.tabsDay = today; c.tabsSeen = []; c.tabsToday = 0; }
    const host = location.hostname;
    if (host && !(c.tabsSeen || []).includes(host)) {
      c.tabsSeen = [...(c.tabsSeen || []), host].slice(0, 50);
      c.tabsToday = c.tabsSeen.length;
      this.checkAchievements();
      this.save();
    }
  }

  /* ---------- STATS & EMOÇÕES ---------- */
  applyOfflineDecay() {
    const now = Date.now();
    const last = this.S.stats.lastStatsUpdate || now;
    const mins = Math.min(480, Math.max(0, (now - last) / 60000)); // cap 8h
    this.decayStats(mins);
    this.S.stats.lastStatsUpdate = now;
    this.save();
  }

  decayStats(mins) {
    const s = this.S.stats;
    s.hunger  = Math.max(0, s.hunger - 0.2 * mins);
    s.hygiene = Math.max(0, s.hygiene - 0.08 * mins);
    if (this.state === 'sleeping') s.energy = Math.min(100, s.energy + 2 * mins);
    else s.energy = Math.max(0, s.energy - 0.06 * mins);
    // felicidade sofre com fome e abandono
    const ignoredMin = (Date.now() - this.lastActivity) / 60000;
    if (s.hunger < 25 || ignoredMin > 10) s.happiness = Math.max(0, s.happiness - 0.25 * mins);
    else s.happiness = Math.max(0, s.happiness - 0.05 * mins);
  }

  bumpStat(key, amount) {
    this.S.stats[key] = Math.max(0, Math.min(100, (this.S.stats[key] || 0) + amount));
  }

  computeEmotion() {
    const s = this.S.stats;
    if (s.energy < 20) return 'sleepy';
    if (s.hunger < 25) return 'hungry';
    if (s.happiness > 80) return 'joyful';
    if (s.happiness < 30) return 'sad';
    return 'content';
  }

  updateEmotion(silent) {
    const prev = this.emotion;
    this.emotion = this.computeEmotion();
    const badges = { sleepy: '🥱', hungry: '🍖', joyful: '🤩', sad: '😢', content: '🙂' };
    this.emotionNode.textContent = badges[this.emotion];
    this.node.setAttribute('data-emotion', this.emotion);
    if (!silent && prev !== this.emotion) this.showEmotionEmoji(badges[this.emotion], 3600);
    if (!silent && prev !== this.emotion && this.isVisible && !this.isQuiet()) {
      if (this.emotion === 'hungry') this.showSpeech(this.getRandom('hungry'), 3000);
      if (this.emotion === 'sad') this.showSpeech(this.getRandom('sad'), 3000);
      if (this.emotion === 'joyful') this.showSpeech(this.getRandom('joyful'), 3000);
    }
  }

  showEmotionEmoji(emoji, duration = 2600) {
    if (!this.emotionNode || this.isQuiet()) return;
    this.emotionNode.textContent = emoji;
    this.emotionNode.classList.remove('visible');
    requestAnimationFrame(() => this.emotionNode && this.emotionNode.classList.add('visible'));
    clearTimeout(this._emotionTimer);
    this._emotionTimer = setTimeout(() => this.emotionNode && this.emotionNode.classList.remove('visible'), duration);
  }

  /* ---------- FAVORITOS: sorteio ponderado ---------- */
  getWeightedRandom(pool, favIds) {
    const weighted = [];
    pool.forEach(item => {
      const id = typeof item === 'string' ? item : item.id;
      const w = (favIds || []).includes(id) ? 3 : 1;
      for (let i = 0; i < w; i++) weighted.push(item);
    });
    return weighted[Math.floor(Math.random() * weighted.length)];
  }

  /* ---------- INTERAÇÕES BÁSICAS ---------- */
  giveAffection() {
    if (this.state === 'sleeping') { this.wakeUp(); return; }
    this.setStateFor('happy', 1800);
    this.showSpeech(this.getRandom('happy'));
    this.spawnParticles();
    this.bumpStat('happiness', 8);
    this.addXp(5);
    this.beep(720);
    this.lastActivity = Date.now();
    const c = this.S.game.counters;
    c.pets = (c.pets || 0) + 1;
    this.registerDaily('pets');
    this.checkAchievements();
    this.updateEmotion(true);
    if (this.subpet && this.subpet.species === 'slime' && Math.random() < 0.35) {
      this.subpet.interact('special');
    }
  }

  spawnParticles(emojis) {
    if (this._destroyed || this.S.settings.performanceMode) return;
    const rect = this.node.getBoundingClientRect();
    const pool = emojis || ['❤️', '💕', '✨', '⭐', '💫', '🌟'];
    for (let i = 0; i < 6; i++) {
      setTimeout(() => {
        if (this._destroyed) return;
        const el = document.createElement('div');
        el.className = 'aic-particle';
        el.style.cssText = `
          position:fixed;
          left:${rect.left + Math.random() * 50 - 5}px;
          top:${rect.top + Math.random() * 20}px;
          z-index:2147483647;
          font-size:${14 + Math.random() * 8}px;
          pointer-events:none;
          animation:clawd-float-up ${0.8 + Math.random() * 0.4}s ease-out forwards;
        `;
        el.textContent = pool[Math.floor(Math.random() * pool.length)];
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 1400);
      }, i * 90);
    }
  }

  showSpeech(text, duration = 2800, html = false) {
    if (!this.S.showSpeech && !html) return;
    if (this.isQuiet() && !html) return;
    if (html) { this.speechNode.innerHTML = text; this.speechNode.classList.add('interactive'); }
    else { this.speechNode.textContent = text; this.speechNode.classList.remove('interactive'); }
    this.speechNode.classList.add('visible');
    clearTimeout(this._speechTimer);
    if (duration > 0) {
      this._speechTimer = setTimeout(() => {
        this.speechNode.classList.remove('visible', 'interactive');
      }, duration);
    }
  }

  getRandom(state) {
    const pool = this.messages[state] || this.messages.idle;
    // apelidos favoritos: às vezes o pet fala de si com outro nome
    const favNicks = this.S.favorites.nicknames || [];
    if (state === 'idle' && favNicks.length > 0 && Math.random() < 0.25) {
      const nick = favNicks[Math.floor(Math.random() * favNicks.length)];
      return `Pode me chamar de ${nick}! 🐾`;
    }
    return pool[Math.floor(Math.random() * pool.length)];
  }

  wakeUp() {
    this.setState('idle');
    this.showSpeech('Bom dia! ☀️');
    if (this.subpet) this.subpet.wakeUp('Acordamos juntos! ✨');
    this.lastActivity = Date.now();
    // estica ao acordar
    clearTimeout(this._wakeStretchTimer);
    this._wakeStretchTimer = setTimeout(() => {
      this._wakeStretchTimer = null;
      if (this.state === 'idle') this.doStretch();
    }, 500);
  }

  /* ---------- AÇÕES ---------- */
  doSomersault() {
    if (this.state === 'sleeping') this.wakeUp();
    this.setStateFor('somersault', 1100);
    this.showSpeech('Cambalhota! 🤸', 1800);
    this.spawnParticles(['✨', '💫', '🌪️']);
    this.bumpStat('energy', -3);
    this.addXp(2);
    this.beep(590);
  }

  doFeed() {
    if (this.state === 'sleeping') this.wakeUp();
    const mult = this.S.profession === 'chef' ? 2 : 1;
    this.setStateFor('eating', 1800);
    this.showSpeech(mult > 1 ? 'Comida de chef! 😋👨‍🍳' : 'Nham nham! 😋', 2200);
    this.bumpStat('hunger', 30 * mult);
    this.registerDaily('feed');
    this.bumpStat('happiness', 5);
    this.addXp(3);
    this.beep(520);
    // migalhas
    this.spawnParticles(['🍖', '🍪', '✨']);
    this.updateEmotion(true);
  }

  doPlay() {
    if (this.state === 'sleeping') this.wakeUp();
    this.setStateFor('excited', 2500);
    this.showSpeech('Bola! 🎾', 2000);
    // bolinha genérica temporária
    const rect = this.node.getBoundingClientRect();
    const ball = document.createElement('div');
    ball.className = 'aic-toyball';
    ball.style.left = `${rect.left + 30}px`;
    ball.style.top = `${rect.top + 20}px`;
    document.body.appendChild(ball);
    setTimeout(() => ball.remove(), 2000);
    this.bumpStat('happiness', 6);
    this.registerDaily('play');
    this.bumpStat('energy', -4);
    this.addXp(3);
    if (this.subpet) this.subpet.interact('play');
  }

  doPose() {
    if (this.state === 'sleeping') this.wakeUp();
    this.setStateFor('pose', 3000);
    this.showSpeech('📸 Diz xis!', 3000);
    this.spawnParticles(['✨', '📸', '⭐']);
  }

  doBath() {
    if (this.state === 'sleeping') this.wakeUp();
    this.setStateFor('bathing', 2500);
    this.showSpeech('Splish splash! 🫧', 2500);
    this.spawnParticles(['🫧', '💧', '🧼', '✨']);
    this.bumpStat('hygiene', 100);
    this.bumpStat('happiness', 8);
    this.addXp(4);
    this.node.classList.add('shiny');
    clearTimeout(this._shinyTimer);
    this._shinyTimer = setTimeout(() => this.node.classList.remove('shiny'), 60000);
    this.updateEmotion(true);
  }

  doDance() {
    // dança melhorada: 3 passos em sequência
    if (this.state === 'sleeping') this.wakeUp();
    this.showSpeech('Yeahh! 🕺', 3200);
    this.spawnParticles(['🎵', '🎶', '✨']);
    this.setState('dance-1');
    this.beep(660);
    setTimeout(() => { if (this.state === 'dance-1') { this.node.classList.remove('dance-1'); this.state = 'dance-2'; this.node.classList.add('dance-2'); this.beep(770); } }, 900);
    setTimeout(() => { if (this.state === 'dance-2') { this.node.classList.remove('dance-2'); this.state = 'dance-3'; this.node.classList.add('dance-3'); this.beep(880); } }, 1800);
    setTimeout(() => { if (this.state === 'dance-3') this.setState('idle'); }, 2800);
    this.bumpStat('happiness', 6);
    this.bumpStat('energy', -4);
    const c = this.S.game.counters;
    c.dances = (c.dances || 0) + 1;
    this.registerDaily('dance');
    this.checkAchievements();
  }

  // Super dança (triplo-clique)
  doSuperDance() {
    if (this.state === 'sleeping') this.wakeUp();
    this.showSpeech('💃 SUPER DANCE! 🕺', 5000);
    this.spawnParticles(['🎵', '🎶', '⚡', '🌟', '✨', '💃']);
    const steps = ['dance-1', 'dance-2', 'dance-3', 'dance-1', 'dance-2', 'somersault'];
    steps.forEach((step, i) => {
      setTimeout(() => {
        if (i > 0 && this.state) this.node.classList.remove(steps[i - 1]);
        this.state = step;
        this.node.classList.add(step);
        this.beep(440 + i * 110, 0.08);
      }, i * 700);
    });
    setTimeout(() => {
      steps.forEach(s => this.node.classList.remove(s));
      this.setState('idle');
    }, steps.length * 700 + 600);
    this.bumpStat('happiness', 15);
    this.bumpStat('energy', -10);
    this.addXp(10);
  }

  doJump() {
    if (this.state === 'sleeping') this.wakeUp();
    this.setStateFor('jumping', 800);
    this.showSpeech('Yaa! 🦘', 1200);
    this.spawnParticles(['💨', '✨']);
    this.bumpStat('energy', -3);
    this.addXp(2);
    this.beep(640, 0.08);
  }

  doStretch() {
    if (this.state === 'sleeping') return;
    this.setStateFor('stretching', 1300);
    this.showSpeech('Ahhh... 🤾', 1500);
    this.bumpStat('energy', 3);
    this.beep(350, 0.1, 'triangle');
  }

  doRoar() {
    if (this.state === 'sleeping') this.wakeUp();
    this.setStateFor('roaring', 1700);
    this.showSpeech('RAAWR! 🦁', 2000);
    this.spawnParticles(['💥', '⚡', '🔥']);
    this.bumpStat('happiness', 5);
    this.addXp(3);
    this.beep(180, 0.2, 'sawtooth');
  }

  doHighFive() {
    if (this.state === 'sleeping') this.wakeUp();
    this.setStateFor('highfive', 900);
    this.showSpeech('✋ HIGH FIVE!', 1500);
    this.spawnParticles(['✋', '⭐', '✨']);
    this.bumpStat('happiness', 6);
    this.addXp(2);
    this.beep(750, 0.06);
    setTimeout(() => this.beep(950, 0.08), 100);
  }

  startRun(targetX) {
    // corrida com poeirinha usando requestAnimationFrame para Hz rate dinâmico
    if (this.isAutoWalking) return;
    this.isAutoWalking = true;
    this.setState('running');
    const rect = this.node.getBoundingClientRect();
    const dx = targetX - rect.left;
    if (dx < 0) this.stackNode.style.transform = 'scaleX(-1)';

    let startTime = null;
    const duration = 600; // ms
    const startX = rect.left;

    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const currentX = startX + dx * progress;

      this.updatePosition(currentX, rect.top);

      if (Math.random() < 0.15 && !this.S.settings.performanceMode) {
        const dust = document.createElement('div');
        dust.className = 'aic-dust';
        dust.style.left = `${currentX + (dx < 0 ? 60 : -6)}px`;
        dust.style.top = `${rect.top + 70}px`;
        document.body.appendChild(dust);
        setTimeout(() => dust.remove(), 600);
      }

      if (progress < 1) {
        this._motionRaf = requestAnimationFrame(step);
      } else {
        this._motionRaf = null;
        this.isAutoWalking = false;
        this.stackNode.style.transform = '';
        this.setState('idle');
      }
    };
    this._motionRaf = requestAnimationFrame(step);
  }

  /* ---------- BOLA / FUTEBOL ---------- */
  kickBall() {
    if (this.ballNode.classList.contains('kicked')) return;
    this.stopKeepyUppy();
    this.ballNode.classList.add('kicked');
    this.setStateFor('celebrate', 2200);
    this.showSpeech('Gooool! ⚽🥅', 2500);
    this.beep(830, 0.14);
    // trave pixel-art aparece na lateral
    const goal = document.createElement('div');
    goal.className = 'aic-goalpost';
    goal.style.top = `${Math.max(20, this.node.getBoundingClientRect().top - 60)}px`;
    document.body.appendChild(goal);
    setTimeout(() => goal.classList.add('visible'), 50);
    setTimeout(() => { goal.classList.remove('visible'); setTimeout(() => goal.remove(), 500); }, 1800);
    this.spawnParticles(['🎉', '⚽', '🏆']);
    this.addXp(10);
    const c = this.S.game.counters;
    c.goals = (c.goals || 0) + 1;
    this.registerDaily('goals');
    this.checkAchievements();
    if (this.subpet && this.subpet.species === 'dog') {
      this.subpet.fetchBall(this.ballNode.getBoundingClientRect());
    }
    setTimeout(() => this.ballNode.classList.remove('kicked'), 1400);
  }

  startKeepyUppy() {
    if (this._keepy || this.S.profession !== 'footballer' || this.state !== 'idle') return;
    if (this.ballNode.classList.contains('kicked')) return;
    this.node.classList.add('keepy');
    this.setState('keepy-uppy');
    this._keepyCount = 0;
    let comboMultiplier = 1;

    const tick = () => {
      this._keepyCount++;
      // Combo multiplier: x1 → x2 a cada 10, x3 a cada 20, x5 a cada 30
      if (this._keepyCount % 10 === 0) {
        comboMultiplier = Math.min(5, Math.floor(this._keepyCount / 10) + 1);
        const msg = this._keepyCount >= 30 ? `x${comboMultiplier} COMBO! 🔥` :
                    this._keepyCount >= 20 ? `${this._keepyCount}! 🔥🔥` :
                    `${this._keepyCount}! ⚽`;
        this.showSpeech(msg, 1500);
        this.beep(700 + this._keepyCount * 4, 0.06);
        this.spawnParticles(['⚽']);
      }
      // Aumenta velocidade progressiva
      const speed = Math.max(0.3, 0.7 - this._keepyCount * 0.005);
      if (this._keepy) {
        clearTimeout(this._keepy);
        this._keepy = setTimeout(tick, speed * 1000);
      }

      // Chance de errar: começa em 8%, aumenta após 40 toques, cap em 60
      const errChance = Math.min(0.25, 0.08 + Math.max(0, this._keepyCount - 40) * 0.005);
      if (Math.random() < errChance || this._keepyCount >= 60) {
        const finalCount = this._keepyCount;
        this.stopKeepyUppy();
        const rec = this.S.game.counters.keepyRecord || 0;
        if (finalCount > rec) {
          this.S.game.counters.keepyRecord = finalCount;
          const rarity = finalCount >= 50 ? 'legendary' : finalCount >= 30 ? 'epic' : 'rare';
          this.toast('', {
            rarity,
            icon: '⚽',
            title: `Novo Recorde: ${finalCount}!`,
            desc: `${finalCount} embaixadinhas seguidas!`
          });
          this.addXp(Math.round(finalCount * comboMultiplier * 0.4));
          this.checkAchievements();
        }
        this.save();
        // bola rola, pet corre atrás
        this.ballNode.classList.add('rolling');
        this.showSpeech('Ops! 😅', 1500);
        const rect = this.node.getBoundingClientRect();
        const dir = Math.random() < 0.5 ? -120 : 120;
        setTimeout(() => {
          this.startRun(Math.max(10, rect.left + dir));
          setTimeout(() => this.ballNode.classList.remove('rolling'), 1200);
        }, 500);
      }
    };
    this._keepy = setTimeout(tick, 700);
  }

  stopKeepyUppy() {
    if (this._keepy) { clearTimeout(this._keepy); this._keepy = null; }
    this.node.classList.remove('keepy');
    if (this.state === 'keepy-uppy') this.setState('idle');
    this._keepyCount = 0;
  }

  /* ---------- PESCARIA ---------- */
  doFish() {
    if (this.state === 'sleeping') this.wakeUp();
    if (this._fishing) { this.stopFishing(); return; }
    this._fishing = true;
    this.setState('fishing');
    this.node.classList.add('fishing');
    this.showSpeech('Pescando... 🎣', 0);

    // Lago pixel-art
    const rect = this.node.getBoundingClientRect();
    this._lakeEl = document.createElement('div');
    this._lakeEl.className = 'aic-lake';
    this._lakeEl.title = 'Clique quando o peixe fisgar para puxar a linha';
    this._lakeEl.addEventListener('click', () => {
      if (this._fishing && this.state === 'fishing') this._catchFish();
    });
    this._lakeEl.innerHTML = '<div class="aic-fish">🐠</div>';
    const lakeX = Math.max(10, Math.min(window.innerWidth - 130, rect.left - 60));
    const lakeY = Math.max(10, Math.min(window.innerHeight - 70, rect.top + 60));
    this._lakeEl.style.left = `${lakeX}px`;
    this._lakeEl.style.top = `${lakeY}px`;
    document.body.appendChild(this._lakeEl);
    setTimeout(() => this._lakeEl && this._lakeEl.classList.add('visible'), 50);

    // Linha de pesca
    this._fishingLineEl = document.createElement('div');
    this._fishingLineEl.className = 'aic-fishing-line';
    const lineX = rect.left + 50;
    const lineY = rect.top + 10;
    const lineH = lakeY + 20 - lineY;
    this._fishingLineEl.style.cssText = `
      left:${lineX}px; top:${lineY}px; height:${Math.max(10, lineH)}px;
    `;
    document.body.appendChild(this._fishingLineEl);
    setTimeout(() => this._fishingLineEl && this._fishingLineEl.classList.add('visible'), 100);

    // Timer para pegar peixe: 3~8 segundos
    const waitTime = 3000 + Math.random() * 5000;
    this._fishTimer = setTimeout(() => {
      if (!this._fishing) return;
      if (this._lakeEl) this._lakeEl.classList.add('bite');
      this.showSpeech('Fisgou! Clique no lago! 🎣', 1800);
      this._fishBiteTimer = setTimeout(() => {
        if (this._fishing && this.state === 'fishing') this._catchFish();
      }, 1800);
    }, waitTime);
  }

  _catchFish() {
    if (!this._fishing || this.state !== 'fishing') return false;
    clearTimeout(this._fishBiteTimer);
    this._fishBiteTimer = null;
    // Anima puxada
    this.setState('reeling');
    this.node.classList.remove('fishing');
    this.node.classList.add('reeling');
    this.showSpeech('Fisgou! 🎣', 1500);
    this.beep(550, 0.08);

    clearTimeout(this._fishCatchTimer);
    this._fishCatchTimer = setTimeout(() => {
      if (!this._fishing || this.state !== 'reeling' || this._destroyed) return;
      this._fishCatchTimer = null;
      // Escolhe peixe
      const isRare = Math.random() < 0.15;
      const pool = isRare ?
        this._fishPool.filter(f => f.rare) :
        this._fishPool.filter(f => !f.rare);
      const fish = pool[Math.floor(Math.random() * pool.length)] || this._fishPool[0];

      // Peixe voando
      const lakeRect = this._lakeEl ? this._lakeEl.getBoundingClientRect() : this.node.getBoundingClientRect();
      const caught = document.createElement('div');
      caught.className = 'aic-fish-caught';
      caught.textContent = fish.name.split(' ')[0]; // só emoji
      caught.style.left = `${lakeRect.left + lakeRect.width / 2}px`;
      caught.style.top = `${lakeRect.top}px`;
      document.body.appendChild(caught);
      setTimeout(() => caught.remove(), 1300);

      this.showSpeech(fish.msg, 3000);
      this.addXp(fish.xp);
      this.spawnParticles([fish.name.split(' ')[0], '💦', '🎣']);

      // Contadores
      const c = this.S.game.counters;
      c.fish = (c.fish || 0) + 1;
      this.registerDaily('fish');
      if (fish.rare) c.rareFish = (c.rareFish || 0) + 1;
      this.checkAchievements();

      // Toast especial para peixe raro
      if (fish.rare) {
        this.toast('', {
          rarity: 'epic',
          icon: fish.name.split(' ')[0],
          title: `Peixe Raro!`,
          desc: fish.msg
        });
      }
      this.beep(isRare ? 880 : 620, isRare ? 0.15 : 0.08);
      this.bumpStat('happiness', isRare ? 15 : 6);
      this.save();
      this.stopFishing();
    }, 800);
    return true;
  }

  stopFishing() {
    this._fishing = false;
    clearTimeout(this._fishTimer);
    clearTimeout(this._fishBiteTimer);
    clearTimeout(this._fishCatchTimer);
    this._fishTimer = null;
    this._fishBiteTimer = null;
    this._fishCatchTimer = null;
    this.node.classList.remove('fishing', 'reeling');
    if (this.state === 'fishing' || this.state === 'reeling') this.setState('idle');
    if (this._lakeEl) {
      this._lakeEl.classList.remove('visible');
      const el = this._lakeEl;
      setTimeout(() => el.remove(), 400);
      this._lakeEl = null;
    }
    if (this._fishingLineEl) {
      this._fishingLineEl.classList.remove('visible');
      const el = this._fishingLineEl;
      setTimeout(() => el.remove(), 300);
      this._fishingLineEl = null;
    }
    this.speechNode.classList.remove('visible', 'interactive');
  }

  /* ---------- DESAFIO DO TUTOR ---------- */
  showTutorChallenge() {
    const a = 2 + Math.floor(Math.random() * 8);
    const b = 2 + Math.floor(Math.random() * 8);
    const answer = a * b;
    const opts = [answer, answer + (1 + Math.floor(Math.random() * 4)), Math.max(1, answer - (1 + Math.floor(Math.random() * 4)))];
    opts.sort(() => Math.random() - 0.5);
    this.setState('holding-sign');
    const html = `
      <div class="challenge">
        <div class="challenge-q">📚 Rapidinho: ${a} × ${b} = ?</div>
        <div class="challenge-opts">
          ${opts.map(o => `<button class="challenge-opt" data-val="${o}">${o}</button>`).join('')}
        </div>
      </div>`;
    this.showSpeech(html, 0, true);
    this.speechNode.querySelectorAll('.challenge-opt').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const val = parseInt(btn.dataset.val, 10);
        if (val === answer) {
          this.showSpeech('Acertou! 🎉 +8 XP', 2600);
          this.addXp(8);
          this.S.game.coins += 3;
          this.spawnParticles(['🎉', '📚', '⭐']);
          this.beep(880, 0.12);
        } else {
          this.showSpeech(`Quase! ${a} × ${b} = ${answer} 😄 Bora focar!`, 3200);
        }
        this.setState('idle');
        this.save();
      });
    });
  }

  /* ---------- CONTEXTO DA PÁGINA / PROFISSÕES ---------- */
  _detectPageContext() {
    // limpa loops contextuais da profissão anterior (evita timers acumulados)
    (this._ctxTimers || []).forEach(clearInterval);
    this._ctxTimers = [];
    const prof = this.S.profession;
    if (prof === 'idle') return;
    const url = location.hostname.toLowerCase();
    const keywords = this._contextMap[prof] || [];
    const match = keywords.some(k => url.includes(k));

    // Easter egg 404 (Dev)
    if (prof === 'engineer' && /404|not found|página não encontrada/i.test(document.title)) {
      setTimeout(() => {
        this.showSpeech('🔍 Procurando a página perdida...', 4000);
        this.setStateFor('excited', 2000);
      }, 2500);
    }

    if (!match) return;
    setTimeout(() => {
      if (this.isQuiet()) return;
      const msgs = this._profMessages[prof] || [];
      this.showSpeech(msgs[Math.floor(Math.random() * msgs.length)], 3500);
      if (prof === 'footballer') {
        this.setStateFor('happy', 2000);
        this.spawnParticles(['⚽', '🎉']);
      }
      if (prof === 'engineer') this._devComment();
      if (prof === 'fisher') {
        setTimeout(() => this.doFish(), 3000);
      }
    }, 2000);

    // Loops contextuais por profissão
    if (prof === 'tutor') {
      this._ctxTimers.push(setInterval(() => {
        if (this.isQuiet() || !this.isVisible || this.state !== 'idle') return;
        if (Date.now() - this._challengeShown < 3 * 60000) return;
        this._challengeShown = Date.now();
        this.showTutorChallenge();
      }, 60000));
    }
    if (prof === 'engineer') {
      this._ctxTimers.push(setInterval(() => {
        if (this.isQuiet() || !this.isVisible || this.state !== 'idle') return;
        if (Math.random() < 0.35) {
          this.setStateFor('typing', 4000);
          this.showSpeech('click clack ⌨️', 2500);
        }
      }, 90000));
    }
    if (prof === 'musician') {
      this._ctxTimers.push(setInterval(() => {
        if (this.isQuiet() || !this.isVisible || this.state !== 'idle') return;
        if (Math.random() < 0.4) {
          this.setStateFor('dance-1', 2500);
          this.showSpeech('🎸 Riff!', 2000);
          this.spawnParticles(['🎵', '🎶', '🎸']);
        }
      }, 60000));
    }
    if (prof === 'chef') {
      this._ctxTimers.push(setInterval(() => {
        if (this.isQuiet() || !this.isVisible || this.state !== 'idle') return;
        if (Math.random() < 0.4) {
          this.showSpeech('Mexendo a panelinha... 🍲', 2500);
          this.spawnParticles(['♨️', '🍲', '✨']);
        }
      }, 75000));
    }
    if (prof === 'fisher') {
      // Pesca automática a cada 3 min
      this._ctxTimers.push(setInterval(() => {
        if (this.isQuiet() || !this.isVisible || this.state !== 'idle') return;
        if (Math.random() < 0.6) this.doFish();
      }, 180000));
    }
  }

  _devComment() {
    const langs = {
      python: '🐍 Python? Boa!', javascript: '⚡ JS! Clássico.', typescript: '🔷 TypeScript, chique!',
      rust: '🦀 Rust! Corajoso.', go: '🐹 Go! Veloz.', java: '☕ Java raiz.', ruby: '💎 Ruby!',
      'c++': '⚙️ C++! Hardcore.', php: '🐘 PHP vive!'
    };
    const hay = (location.pathname + ' ' + document.title + ' ' + (document.body?.innerText || '').slice(0, 3000)).toLowerCase();
    for (const [lang, msg] of Object.entries(langs)) {
      if (hay.includes(lang)) {
        setTimeout(() => this.showSpeech(msg, 3000), 6000);
        break;
      }
    }
  }

  _ninjaTrick() {
    if (this.S.profession !== 'ninja' || this.state !== 'idle' || this.isQuiet()) return;
    if (Math.random() > 0.3) return;
    this.spawnParticles(['💨']);
    this.node.style.opacity = '0';
    setTimeout(() => {
      const x = 20 + Math.random() * (window.innerWidth - 150);
      const y = 20 + Math.random() * (window.innerHeight - 200);
      this.updatePosition(x, y);
      this.node.style.opacity = '';
      this.showSpeech('Surpresa! 🥷', 2000);
      this.spawnParticles(['💨', '⚡']);
    }, 1300);
  }

  /* ---------- LOOP DE COMPORTAMENTO ---------- */
  startBehaviorLoop() {
    // Sono + bocejo + birra — a cada 5s
    this._timers.push(setInterval(() => {
      if (this.isDragging || !this.isVisible || this.isAutoWalking) return;
      const idle = (Date.now() - this.lastActivity) / 1000;
      if (this.S.sleepEnabled && this.state === 'idle') {
        if (idle > 13 && idle <= 28 && !this._yawned) {
          this._yawned = true;
          this.setStateFor('yawning', 2000);
          this.showSpeech('🥱...', 1800);
        }
        if (idle > 28) {
          this.setState('sleeping');
          this.showSpeech('ZzZz... 💤', 6000);
        }
      }
      // Birra: fome alta + ignorado por 2 min
      if (this.state === 'idle' && this.S.stats.hunger < 10 && idle > 120 &&
          Date.now() - this._lastTantrum > 180000) {
        this._lastTantrum = Date.now();
        this.setStateFor('tantrum', 2500);
        this.showSpeech('Hmpf! 😡🍖', 2500);
      }
    }, 5000));

    // Decaimento de stats — a cada 60s
    this._timers.push(setInterval(() => {
      this.decayStats(1);
      this.S.stats.lastStatsUpdate = Date.now();
      this.updateEmotion();
      this.save();
    }, 60000));

    // Fala aleatória — a cada ~40s
    this._timers.push(setInterval(() => {
      if (!this.isVisible || !this.S.showSpeech || this.isQuiet()) return;
      if (this.state === 'sleeping') return;
      const chance = this.emotion === 'sad' ? 0.3 : 0.6;
      if (Math.random() < chance) {
        const pool = this.emotion === 'hungry' ? 'hungry' : this.state;
        this.showSpeech(this.getRandom(this.messages[pool] ? pool : 'idle'));
      }
    }, 40000));

    // Ação aleatória favorita — a cada ~25s
    this._timers.push(setInterval(() => {
      if (this.state !== 'idle' || this.isDragging || !this.isVisible || this.isQuiet()) return;
      const baseChance = this.emotion === 'joyful' ? 0.6 : 0.45;
      if (Math.random() > baseChance) return;
      const pool = ['wave', 'dance', 'somersault', 'keepy', 'jump', 'highfive', 'roar'];
      const pick = this.getWeightedRandom(pool, this.S.favorites.actions);
      if (pick === 'keepy' && this.S.profession === 'footballer') this.startKeepyUppy();
      else if (pick === 'dance') this.doDance();
      else if (pick === 'somersault') this.doSomersault();
      else if (pick === 'jump') this.doJump();
      else if (pick === 'highfive') this.doHighFive();
      else if (pick === 'roar') this.doRoar();
      else {
        this.setStateFor('waving', 2200);
        this.showSpeech('Oi! 👋');
      }
    }, 25000));

    // Auto-walk — a cada ~18s
    this._timers.push(setInterval(() => {
      if (this.state !== 'idle' || this.isDragging || !this.S.autoWalk ||
          this.isAutoWalking || !this.isVisible || this.isQuiet()) return;
      const chance = this.emotion === 'sad' ? 0.25 : 0.55;
      if (Math.random() < chance) this._doAutoWalk();
    }, 18000));

    // Truque ninja — a cada 50s
    this._timers.push(setInterval(() => this._ninjaTrick(), 50000));

    // Pescador: pesca espontânea se idle — ciclos curtos e espaçados
    this._timers.push(setInterval(() => {
      if (this.S.profession !== 'fisher') return;
      if (this.state !== 'idle' || this.isDragging || !this.isVisible || this.isQuiet()) return;
      if (!this._fishing && Math.random() < 0.4) {
        this.doFish();
      }
    }, 90000));

    // Pulso de profissão: cada identidade tem uma micro-interação própria,
    // mesmo fora de um site contextual específico.
    this._timers.push(setInterval(() => {
      if (this.state !== 'idle' || this.isDragging || !this.isVisible || this.isQuiet() || Math.random() > 0.38) return;
      switch (this.S.profession) {
        case 'footballer': this.startKeepyUppy(); break;
        case 'tutor': this.showTutorChallenge(); break;
        case 'engineer': this.setStateFor('typing', 3200); this.showSpeech('click clack... 💻', 2200); break;
        case 'musician': this.doDance(); break;
        case 'chef': this.doFeed(); break;
        case 'fisher': if (!this._fishing) this.doFish(); break;
        case 'ninja': this._ninjaTrick(); break;
      }
    }, 85000));
  }

  _doAutoWalk() {
    this.isAutoWalking = true;
    this.setState('walking');
    const rect = this.node.getBoundingClientRect();
    const tx = Math.max(10, Math.min(window.innerWidth - 100, rect.left + (Math.random() - 0.5) * 240));
    const ty = Math.max(10, Math.min(window.innerHeight - 140, rect.top + (Math.random() - 0.5) * 120));
    const dx = tx - rect.left;
    const dy = ty - rect.top;

    if (dx < 0) this.stackNode.style.transform = 'scaleX(-1)';

    let startTime = null;
    const duration = 1200; // ms
    const startX = rect.left;
    const startY = rect.top;

    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);

      this.updatePosition(startX + dx * progress, startY + dy * progress);

      if (progress < 1) {
        this._motionRaf = requestAnimationFrame(step);
      } else {
        this._motionRaf = null;
        this.isAutoWalking = false;
        this.stackNode.style.transform = '';
        this.setState('idle');
        this.bumpStat('energy', -1);
        const c = this.S.game.counters;
        c.walks = (c.walks || 0) + 1;
        this.registerDaily('walk');
        this.S.position = { x: parseFloat(this.node.style.left), y: parseFloat(this.node.style.top) };
        this.checkAchievements();
        this.save();
      }
    };
    this._motionRaf = requestAnimationFrame(step);
  }

  /* ---------- SUB-PETS ---------- */
  refreshSubpet() {
    const want = this.S.subpets.active;
    const wantedColor = want ? this.S.subpets.colors?.[want] : null;
    const wantedEyeColor = want ? this.S.subpets.eyeColors?.[want] : null;
    if (this.subpet && this.subpet.species !== want) {
      this.subpet.destroy();
      this.subpet = null;
    }
    if (this.subpet && wantedColor && this.subpet.color !== wantedColor) this.subpet.setColor(wantedColor);
    if (this.subpet && wantedEyeColor && this.subpet.eyeColor !== wantedEyeColor) {
      this.subpet.setEyeColor(wantedEyeColor);
    }
    if (this.S.settings.performanceMode) {
      if (this.subpet) { this.subpet.destroy(); this.subpet = null; }
      return;
    }
    const petHidden = this.node.style.display === 'none';
    if (want && !this.subpet && this.S.subpets.unlocked.includes(want) && this.isVisible && !petHidden) {
      this.subpet = new SubPet(this, want);
      const name = this.S.subpets.names[want];
      if (name) setTimeout(() => this.subpet && this.subpet.say(`${name}! 🐾`), 1500);
    }
  }

  /* ---------- CROSS-TAB (passeio entre abas) ---------- */
  setupCrossTab() {
    if (!this.S.settings.crossTab || !this._hasExtensionContext()) return;
    const port = this._safeChrome(() => chrome.runtime.connect({ name: 'clawd-presence' }));
    if (!port) return;

    this._port = port;
    const registered = this._safeChrome(() => {
      port.postMessage({ type: 'register', freq: this.S.settings.travelFreq });
      return true;
    }, false);
    if (!registered) return;

    this._portMessageListener = this._guardChromeCallback((msg) => this._onPresenceMsg(msg));
    this._portDisconnectListener = () => {
      try { void chrome.runtime.lastError; } catch (_) {}
      this._port = null;
      if (!this._hasExtensionContext()) this._handleExtensionContextInvalidated();
    };
    this._safeChrome(() => port.onMessage.addListener(this._portMessageListener));
    this._safeChrome(() => port.onDisconnect.addListener(this._portDisconnectListener));
  }

  _onPresenceMsg(msg) {
    switch (msg.type) {
      case 'spawnPet': {
        this.setHidden(false);
        this.refreshSubpet(); // sub-pet viaja junto
        if (msg.direction) {
          // entra correndo pela borda
          const y = this.node.getBoundingClientRect().top;
          const fromX = msg.direction === 'left' ? -80 : window.innerWidth + 20;
          const toX = msg.direction === 'left' ? 60 : window.innerWidth - 140;
          this.updatePosition(Math.max(10, Math.min(fromX, window.innerWidth - 90)), y);
          this.startRun(toX);
          this.showSpeech('Cheguei! 🧳', 2500);
        }
        break;
      }
      case 'despawnPet': {
        const dir = msg.direction === 'left' ? 10 : window.innerWidth - 90;
        this.showSpeech('Já volto! 🧳', 1500);
        this.startRun(dir);
        setTimeout(() => {
          this.setHidden(true);
          if (this._port) this._safeChrome(() => this._port.postMessage({ type: 'travelComplete' }));
        }, 1300);
        break;
      }
      case 'hidePet':
        this.setHidden(true);
        break;
    }
  }

  setHidden(hidden) {
    this.node.style.display = hidden ? 'none' : '';
    if (this.subpet) this.subpet.node.style.display = hidden ? 'none' : '';
    // pegadas sutis nas abas sem pet
    const old = document.getElementById('aic-footprints');
    if (old) old.remove();
    if (hidden && this.S.settings.footprints) {
      const fp = document.createElement('div');
      fp.id = 'aic-footprints';
      fp.textContent = '🐾';
      document.body.appendChild(fp);
    }
  }

  /* ---------- MENSAGENS DO POPUP ---------- */
  listenToMessages() {
    this._messageListener = this._guardChromeCallback((request, _sender, sendResponse) => {
      if (this._destroyed) return false;
      switch (request.action) {
        case 'healthcheck':
          sendResponse({
            alive: !!(
              this.node?.isConnected
              && this.node.dataset.clawdOwned === 'true'
              && document.getElementById('aic-clawd-node') === this.node
            ),
            bootId: window.__clawdBootId || 0
          });
          break;
        case 'toggleVisibility':
          this.isVisible = !this.isVisible;
          this.node.style.display = this.isVisible ? '' : 'none';
          if (this.subpet) this.subpet.node.style.display = this.isVisible ? '' : 'none';
          break;
        case 'resetPosition':
          this.node.style.cssText += ';left:auto;top:auto;bottom:20px;right:20px;';
          this.S.position = { x: null, y: null };
          this.save();
          break;
        case 'updateConfig':
          this.applyConfig(request.key, request.value);
          break;
        case 'updateSetting':
          this.S.settings[request.key] = request.value;
          if (request.key === 'performanceMode') {
            this.node.classList.toggle('aic-nofx', !!request.value);
            this.refreshSubpet();
          }
          this.save();
          break;
        case 'triggerAction':
          this._handleAction(request.value);
          break;
        case 'setSubpet':
          this.S.subpets.active = request.value;
          this.refreshSubpet();
          break;
        case 'setSubpetColor':
          this.S.subpets.colors = this.S.subpets.colors || {};
          this.S.subpets.colors[request.species] = request.value;
          if (this.subpet && this.subpet.species === request.species) this.subpet.setColor(request.value);
          this.save();
          break;
        case 'setSubpetEyeColor':
          this.S.subpets.eyeColors = this.S.subpets.eyeColors || {};
          this.S.subpets.eyeColors[request.species] = request.value;
          if (this.subpet && this.subpet.species === request.species) this.subpet.setEyeColor(request.value);
          this.save();
          break;
        case 'triggerSubpetAction':
          if (
            this.subpet
            && Object.prototype.hasOwnProperty.call(CLAWD_SUBPET_ACTIONS, request.value)
          ) {
            this.subpet.interact(request.value, { force: true });
          }
          break;
        case 'claimDailyQuest':
          sendResponse({ claimed: this.claimDailyQuest(), daily: this.S.daily });
          return true;
        case 'getStatus':
          sendResponse({
            stats: this.S.stats, emotion: this.emotion, state: this.state,
            xp: this.S.xp, coins: this.S.game.coins,
            keepyRecord: this.S.game.counters.keepyRecord || 0,
            fishCaught: this.S.game.counters.fish || 0,
            fishing: this._fishing,
            profession: this.S.profession,
            daily: clawdEnsureDailyQuest(this.S),
            subpet: this.subpet ? {
              species: this.subpet.species,
              state: this.subpet.state,
              color: this.subpet.color,
              eyeColor: this.subpet.eyeColor
            } : null
          });
          return true;
      }
      return false;
    });
    this._safeChrome(() => chrome.runtime.onMessage.addListener(this._messageListener));
  }

  _handleAction(action) {
    this.lastActivity = Date.now();
    const map = {
      wave:       () => { this.setStateFor('waving', 2200); this.showSpeech('Oi! 👋'); },
      dance:      () => this.doDance(),
      happy:      () => this.giveAffection(),
      feed:       () => this.doFeed(),
      somersault: () => this.doSomersault(),
      play:       () => this.doPlay(),
      pose:       () => this.doPose(),
      bath:       () => this.doBath(),
      sleep:      () => { this.setState('sleeping'); this.showSpeech('ZzZz... 💤', 6000); },
      wake:       () => this.wakeUp(),
      kick:       () => this.kickBall(),
      keepy:      () => this.startKeepyUppy(),
      fish:       () => this.doFish(),
      jump:       () => this.doJump(),
      stretch:    () => this.doStretch(),
      roar:       () => this.doRoar(),
      highfive:   () => this.doHighFive(),
      superdance: () => this.doSuperDance()
    };
    if (!map[action]) return false;
    this.cancelMovement();
    if (this._fishing && action !== 'fish') this.stopFishing();
    if (this._keepy && action !== 'keepy' && action !== 'kick') this.stopKeepyUppy();
    map[action]();
    return true;
  }

  destroy({ skipExtensionApis = false } = {}) {
    if (this._destroyed) return;
    this._destroyed = true;

    this._abort.abort();
    this._timers.forEach(clearInterval);
    (this._ctxTimers || []).forEach(clearInterval);

    [
      '_speechTimer', '_stateTimer', '_saveTimer', '_clickTimer', '_holdTimer',
      '_wakeStretchTimer', '_fishTimer', '_fishBiteTimer', '_fishCatchTimer',
      '_emotionTimer', '_shinyTimer', '_keepy'
    ].forEach(key => {
      clearTimeout(this[key]);
      this[key] = null;
    });

    cancelAnimationFrame(this._refreshMeasureRaf);
    cancelAnimationFrame(this._motionRaf);
    cancelAnimationFrame(this._glideRaf);
    this._refreshMeasureRaf = null;
    this._motionRaf = null;
    this._glideRaf = null;

    if (!skipExtensionApis && this._hasExtensionContext()) {
      if (this._storageListener) {
        clawdSafeExtensionCall(globalThis.chrome, () => chrome.storage.onChanged.removeListener(this._storageListener));
      }
      if (this._messageListener) {
        clawdSafeExtensionCall(globalThis.chrome, () => chrome.runtime.onMessage.removeListener(this._messageListener));
      }
      if (this._port && this._portMessageListener) {
        clawdSafeExtensionCall(globalThis.chrome, () => this._port.onMessage.removeListener(this._portMessageListener));
      }
      if (this._port && this._portDisconnectListener) {
        clawdSafeExtensionCall(globalThis.chrome, () => this._port.onDisconnect.removeListener(this._portDisconnectListener));
      }
    }
    if (this._port) {
      try { this._port.disconnect(); } catch (_) {}
      this._port = null;
    }
    if (this._audioCtx && this._audioCtx.state !== 'closed') {
      try { this._audioCtx.close(); } catch (_) {}
    }

    if (this.subpet) {
      this.subpet.destroy();
      this.subpet = null;
    }

    document.querySelectorAll([
      '#aic-clawd-node', '.aic-subpet', '#aic-footprints', '.aic-toast',
      '.aic-lake', '.aic-fishing-line', '.aic-fish-caught', '.aic-goalpost',
      '.aic-toyball', '.aic-dust', '.aic-particle'
    ].join(',')).forEach(el => el.remove());
  }
}

/* =====================================================
   BOOT — respeita sites bloqueados antes de injetar
   ===================================================== */
(function bootClawd() {
  if (window.top !== window.self) return; // não injeta em iframes
  const bootId = (window.__clawdBootId || 0) + 1;
  window.__clawdBootId = bootId;

  const cleanupStaleDom = () => {
    document.querySelectorAll([
      '#aic-clawd-node', '.aic-subpet', '#aic-footprints', '.aic-toast',
      '.aic-lake', '.aic-fishing-line', '.aic-fish-caught', '.aic-goalpost',
      '.aic-toyball', '.aic-dust', '.aic-particle'
    ].join(',')).forEach(el => el.remove());
  };

  if (window.__clawd && typeof window.__clawd.destroy === 'function') {
    try { window.__clawd.destroy(); } catch (_) { cleanupStaleDom(); }
  }
  cleanupStaleDom();

  if (!clawdHasExtensionContext(globalThis.chrome)) return;

  const onState = clawdGuardExtensionCallback(globalThis.chrome, (result) => {
    if (window.__clawdBootId !== bootId) return;
    const state = clawdMigrateState(result.clawdState);
    const host = location.hostname.toLowerCase();
    const blocked = (state.settings.blockedSites || []).some(site => {
      const s = String(site || '').trim().toLowerCase();
      return s && (host === s || host.endsWith('.' + s) || host.includes(s));
    });
    if (blocked) return;
    // persiste migração, se houve upgrade de schema
    if (!result.clawdState || (result.clawdState.schemaVersion || 1) < CLAWD_SCHEMA_VERSION) {
      clawdSafeExtensionCall(globalThis.chrome, () => chrome.storage.local.set({ clawdState: state }), {
        onInvalidated: cleanupStaleDom
      });
    }
    window.__clawd = new ClawdCompanion(state);
  }, cleanupStaleDom);
  clawdSafeExtensionCall(globalThis.chrome, () => chrome.storage.local.get(['clawdState'], onState), {
    onInvalidated: cleanupStaleDom
  });
})();

})();
