class ClawdCompanion {
  constructor() {
    this.node = null;
    this.bodyNode = null;
    this.nameNode = null;
    this.speechNode = null;
    this.spriteNode = null;
    this.shadowNode = null;

    this.isDragging = false;
    this.startX = 0;
    this.startY = 0;
    this.offsetX = 0;
    this.offsetY = 0;

    this.state = 'idle';
    this.lastActivity = Date.now();
    this.isVisible = true;
    this.isAutoWalking = false;
    this._speechTimer = null;
    this._stateTimer = null;

    this.config = {
      name: "Claw'd",
      color: '#c71515',
      scale: 1.5,
      showSpeech: true,
      autoWalk: true,
      sleepEnabled: true,
      animSpeed: 1,
      profession: 'idle'
    };

    this.messages = {
      idle:     ["Oi! 👋", "Bora navegar! 🌐", "Me arraste! ✨", "Aqui pra ajudar 🐾", "Clique em mim! 💫"],
      happy:    ["❤️ Obrigado!", "Uhuuu! 🎉", "Que bom! ✨", "Adoro carinho! 💕", "Yay! 🌟"],
      sleeping: ["ZzZz... 💤", "😴 Shh...", "Descansando... 💤"],
      excited:  ["Wow! 🤩", "Olha isso! 👀", "Nova página! 🚀", "Uau! ⚡"]
    };

    // Mapa de domínios por profissão
    this._contextMap = {
      footballer: ['ge.globo', 'espn', 'lance', 'goal.com', 'sofascore', 'futbol', 'football', 'sport'],
      tutor:      ['youtube', 'twitter', 'x.com', 'instagram', 'facebook', 'tiktok', 'reddit'],
      engineer:   ['github', 'gitlab', 'stackoverflow', 'developer.', 'docs.', 'mdn', 'npmjs', 'pypi']
    };

    this._profMessages = {
      footballer: ["Goool! ⚽", "Vamos time! 🏆", "Assistindo futebol? ⚽", "Partida boa? 🏟️"],
      tutor:      ["Foca nos estudos! 📚", "Sem distrações! 🎯", "Hora de estudar! ✏️", "Que tal uma pausa produtiva? 🧠"],
      engineer:   ["Código limpo! 💻", "PR aprovado? 🚀", "Git push! 📦", "Stack overflow aberto 👀"]
    };

    this.init();
  }

  init() {
    this.createNode();
    this.loadState();
    this.bindEvents();
    this.listenToMessages();
    this.startBehaviorLoop();
    this._detectPageContext();
  }

  createNode() {
    this.node = document.createElement('div');
    this.node.id = 'aic-clawd-node';
    this.node.innerHTML = `
      <div class="speech-bubble" id="aic-speech"></div>
      <div class="pet-body" id="aic-pet-body">
        <div class="pixel-sprite" id="aic-sprite"></div>
        <div class="name-tag" id="aic-name-tag">${this.config.name}</div>
      </div>
      <div class="ground-shadow" id="aic-shadow"></div>
    `;
    document.body.appendChild(this.node);
    this.bodyNode   = document.getElementById('aic-pet-body');
    this.nameNode   = document.getElementById('aic-name-tag');
    this.speechNode = document.getElementById('aic-speech');
    this.spriteNode = document.getElementById('aic-sprite');
    this.shadowNode = document.getElementById('aic-shadow');

    // Pop-in
    this.node.style.animation = 'clawd-pop-in 0.5s cubic-bezier(0.34,1.56,0.64,1) both';
  }

  loadState() {
    chrome.storage.local.get(['clawdState'], (result) => {
      const state = result.clawdState || {};
      if (state.position?.x != null && state.position?.y != null) {
        this.updatePosition(state.position.x, state.position.y);
      }
      const keys = ['name', 'color', 'scale', 'showSpeech', 'autoWalk', 'sleepEnabled', 'animSpeed'];
      keys.forEach(k => { if (state[k] !== undefined) this.applyConfig(k, state[k]); });

      // Welcome back message
      setTimeout(() => this.showSpeech(this.getRandom('idle')), 1200);
    });
  }

  applyConfig(key, value) {
    this.config[key] = value;
    switch (key) {
      case 'name':
        this.nameNode.innerText = value;
        break;
      case 'color':
        this.node.style.setProperty('--agent-color', value);
        break;
      case 'scale': {
        const s = parseFloat(value);
        this.node.style.setProperty('--agent-scale', s);
        this.bodyNode.style.transform = `scale(${s})`;
        break;
      }
      case 'animSpeed': {
        const dur = (0.55 / parseFloat(value)).toFixed(2);
        this.spriteNode.style.animationDuration = `${dur}s`;
        break;
      }
    }
    this._saveKey(key, value);
  }

  _saveKey(key, value) {
    chrome.storage.local.get(['clawdState'], (result) => {
      const state = result.clawdState || {};
      state[key] = value;
      chrome.storage.local.set({ clawdState: state });
    });
  }

  updatePosition(x, y) {
    const pad = 10;
    const maxX = window.innerWidth  - 80 - pad;
    const maxY = window.innerHeight - 130 - pad;
    x = Math.max(pad, Math.min(x, maxX));
    y = Math.max(pad, Math.min(y, maxY));
    this.node.style.left   = `${x}px`;
    this.node.style.top    = `${y}px`;
    this.node.style.right  = 'auto';
    this.node.style.bottom = 'auto';
  }

  setState(newState) {
    if (this.state === newState) return;
    this.node.classList.remove(this.state);
    this.state = newState;
    if (newState !== 'idle') this.node.classList.add(newState);
  }

  bindEvents() {
    // --- MOUSE DRAG ---
    this.node.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      this.isDragging = true;
      this.startX = e.clientX;
      this.startY = e.clientY;
      const rect = this.node.getBoundingClientRect();
      this.offsetX = e.clientX - rect.left;
      this.offsetY = e.clientY - rect.top;
      this.lastActivity = Date.now();
      if (this.state === 'sleeping') this.wakeUp();
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        this.updatePosition(e.clientX - this.offsetX, e.clientY - this.offsetY);
        this.lastActivity = Date.now();
      } else {
        this.lookAtCursor(e.clientX, e.clientY);
      }
    });

    document.addEventListener('mouseup', (e) => {
      if (!this.isDragging) return;
      this.isDragging = false;
      const diffX = Math.abs(e.clientX - this.startX);
      const diffY = Math.abs(e.clientY - this.startY);
      if (diffX < 5 && diffY < 5) {
        this.giveAffection();
      } else {
        const rect = this.node.getBoundingClientRect();
        this._saveKey('position', { x: rect.left, y: rect.top });
      }
    });

    // --- TOUCH DRAG ---
    this.node.addEventListener('touchstart', (e) => {
      const t = e.touches[0];
      this.isDragging = true;
      this.startX = t.clientX; this.startY = t.clientY;
      const rect = this.node.getBoundingClientRect();
      this.offsetX = t.clientX - rect.left;
      this.offsetY = t.clientY - rect.top;
      if (this.state === 'sleeping') this.wakeUp();
      e.preventDefault();
    }, { passive: false });

    document.addEventListener('touchmove', (e) => {
      if (!this.isDragging) return;
      const t = e.touches[0];
      this.updatePosition(t.clientX - this.offsetX, t.clientY - this.offsetY);
      this.lastActivity = Date.now();
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
      if (!this.isDragging) return;
      this.isDragging = false;
      const t = e.changedTouches[0];
      if (Math.abs(t.clientX - this.startX) < 10 && Math.abs(t.clientY - this.startY) < 10) {
        this.giveAffection();
      }
    });

    // --- SCROLL REACTION ---
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
    }, { passive: true });
  }

  lookAtCursor(mouseX, mouseY) {
    if (this.isDragging || this.state === 'sleeping' || this.isAutoWalking) return;
    const rect = this.node.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top  + rect.height / 2;
    const rx = Math.max(-12, Math.min(12, (mouseY - cy) * 0.035));
    const ry = Math.max(-12, Math.min(12, (mouseX - cx) * 0.035));
    this.node.style.transform = `perspective(600px) rotateX(${-rx}deg) rotateY(${ry}deg)`;
  }

  giveAffection() {
    if (this.state === 'sleeping') { this.wakeUp(); return; }
    this.setState('happy');
    this.showSpeech(this.getRandom('happy'));
    this.spawnParticles();
    this.lastActivity = Date.now();
    clearTimeout(this._stateTimer);
    this._stateTimer = setTimeout(() => {
      if (this.state === 'happy') this.setState('idle');
    }, 1800);
  }

  spawnParticles() {
    const rect = this.node.getBoundingClientRect();
    const emojis = ['❤️', '💕', '✨', '⭐', '💫', '🌟'];
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        const el = document.createElement('div');
        el.style.cssText = `
          position:fixed;
          left:${rect.left + Math.random() * 50 - 5}px;
          top:${rect.top + Math.random() * 20}px;
          z-index:2147483648;
          font-size:${14 + Math.random() * 8}px;
          pointer-events:none;
          animation:clawd-float-up ${0.8 + Math.random() * 0.4}s ease-out forwards;
        `;
        el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 1400);
      }, i * 90);
    }
  }

  showSpeech(text, duration = 2800) {
    if (!this.config.showSpeech) return;
    this.speechNode.textContent = text;
    this.speechNode.classList.add('visible');
    clearTimeout(this._speechTimer);
    this._speechTimer = setTimeout(() => {
      this.speechNode.classList.remove('visible');
    }, duration);
  }

  getRandom(state) {
    const pool = this.messages[state] || this.messages.idle;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  wakeUp() {
    this.setState('idle');
    this.showSpeech('Bom dia! ☀️');
    this.lastActivity = Date.now();
  }

  startBehaviorLoop() {
    // Sleep check — every 5s
    setInterval(() => {
      if (this.isDragging || !this.isVisible || this.isAutoWalking) return;
      const idle = (Date.now() - this.lastActivity) / 1000;
      if (idle > 28 && this.state === 'idle' && this.config.sleepEnabled) {
        this.setState('sleeping');
        this.showSpeech('ZzZz... 💤', 6000);
      }
    }, 5000);

    // Random speech — every ~40s
    setInterval(() => {
      if (!this.isVisible || !this.config.showSpeech) return;
      if (this.state === 'sleeping') return;
      if (Math.random() < 0.6) this.showSpeech(this.getRandom(this.state));
    }, 40000);

    // Random wave — every ~25s when idle
    setInterval(() => {
      if (this.state !== 'idle' || this.isDragging || !this.isVisible) return;
      if (Math.random() < 0.45) {
        this.setState('waving');
        this.showSpeech('Oi! 👋');
        clearTimeout(this._stateTimer);
        this._stateTimer = setTimeout(() => {
          if (this.state === 'waving') this.setState('idle');
        }, 2200);
      }
    }, 25000);

    // Auto-walk — every ~18s
    setInterval(() => {
      if (
        this.state !== 'idle' || this.isDragging ||
        !this.config.autoWalk || this.isAutoWalking || !this.isVisible
      ) return;
      if (Math.random() < 0.55) this._doAutoWalk();
    }, 18000);
  }

  _doAutoWalk() {
    this.isAutoWalking = true;
    this.setState('walking');
    const rect = this.node.getBoundingClientRect();
    const tx = Math.max(10, Math.min(window.innerWidth - 100, rect.left + (Math.random() - 0.5) * 240));
    const ty = Math.max(10, Math.min(window.innerHeight - 140, rect.top  + (Math.random() - 0.5) * 120));
    const dx = tx - rect.left;
    const dy = ty - rect.top;
    const steps = 70;
    const stepX = dx / steps;
    const stepY = dy / steps;

    // Flip se andando para esquerda
    if (dx < 0) this.bodyNode.style.transform = `scale(${this.config.scale}) scaleX(-1)`;

    let i = 0;
    const tick = setInterval(() => {
      i++;
      const cur = this.node.getBoundingClientRect();
      this.updatePosition(cur.left + stepX, cur.top + stepY);
      if (i >= steps) {
        clearInterval(tick);
        this.isAutoWalking = false;
        this.bodyNode.style.transform = `scale(${this.config.scale})`;
        this.setState('idle');
        this._saveKey('position', {
          x: parseFloat(this.node.style.left),
          y: parseFloat(this.node.style.top)
        });
      }
    }, 16);
  }

  _detectPageContext() {
    if (this.config.profession === 'idle') return;
    const url = window.location.hostname.toLowerCase();
    const keywords = this._contextMap[this.config.profession] || [];
    const match = keywords.some(k => url.includes(k));
    if (match) {
      setTimeout(() => {
        const msgs = this._profMessages[this.config.profession] || [];
        const msg = msgs[Math.floor(Math.random() * msgs.length)];
        this.showSpeech(msg, 3500);
        if (this.config.profession === 'footballer') {
          this.setState('happy');
          this.spawnParticles();
          setTimeout(() => { if (this.state === 'happy') this.setState('idle'); }, 2000);
        }
      }, 2000);
    }
  }

  listenToMessages() {
    chrome.runtime.onMessage.addListener((request) => {
      switch (request.action) {
        case 'toggleVisibility':
          this.isVisible = !this.isVisible;
          this.node.style.display = this.isVisible ? '' : 'none';
          break;
        case 'resetPosition':
          this.node.style.cssText += ';left:auto;top:auto;bottom:20px;right:20px;';
          this._saveKey('position', { x: null, y: null });
          break;
        case 'updateConfig':
          this.applyConfig(request.key, request.value);
          if (request.key === 'profession') this._detectPageContext();
          break;
        case 'triggerAction':
          this._handleAction(request.value);
          break;
      }
    });
  }

  _handleAction(action) {
    const map = {
      wave:  () => { this.setState('waving');  this.showSpeech('Oi! 👋'); },
      dance: () => { this.setState('excited'); this.spawnParticles(); this.showSpeech('Yeahh! 🕺'); },
      sleep: () => { this.setState('sleeping'); this.showSpeech('ZzZz... 💤', 6000); },
      wake:  () => this.wakeUp(),
      happy: () => this.giveAffection()
    };
    if (map[action]) {
      map[action]();
      if (action !== 'sleep') {
        clearTimeout(this._stateTimer);
        this._stateTimer = setTimeout(() => {
          if (this.state !== 'idle') this.setState('idle');
        }, 2200);
      }
    }
  }
}

new ClawdCompanion();
