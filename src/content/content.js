/* ===================================================
   CLAW'D — CONTENT SCRIPT v2.1
   Motor do mascote injetado nas páginas.
   Consome o núcleo compartilhado (CLAWD): o estado
   persistido vive no ClawdStore e é sincronizado entre
   abas via chrome.storage.onChanged (Observer). As
   mensagens do popup são despachadas por um mapa de
   comandos (Command) e as profissões vêm do catálogo
   compartilhado (Strategy).
   =================================================== */

(() => {
  'use strict';

  const { XP_REWARDS, levelForXp, PROFESSIONS, ClawdStore } = CLAWD;

  const TIMING = Object.freeze({
    HEARTBEAT_MS: 1000,
    SLEEP_AFTER_MS: 28000,
    SPEECH_EVERY_MS: 40000,
    WAVE_EVERY_MS: 25000,
    WALK_EVERY_MS: 18000,
    WALK_DURATION_MS: 1150,
    KICK_DURATION_MS: 1400,
    EAT_MS: 1500,
    FLIP_MS: 900,
    QUIZ_AFTER_MS: 40000,     // desafio do tutor após ~40s num site de distração
    COMBO_WINDOW_MS: 4000,    // 3 carinhos dentro da janela = combo
    STREAK_WINDOW_MS: 12000   // 3 gols dentro da janela = hat-trick
  });

  const CHANCE = Object.freeze({ speech: 0.6, wave: 0.45, walk: 0.55 });

  const MESSAGES = Object.freeze({
    idle:     ['Oi! 👋', 'Bora navegar! 🌐', 'Me arraste! ✨', 'Aqui pra ajudar 🐾', 'Clique em mim! 💫'],
    happy:    ['❤️ Obrigado!', 'Uhuuu! 🎉', 'Que bom! ✨', 'Adoro carinho! 💕', 'Yay! 🌟'],
    sleeping: ['ZzZz... 💤', '😴 Shh...', 'Descansando... 💤'],
    excited:  ['Wow! 🤩', 'Olha isso! 👀', 'Nova página! 🚀', 'Uau! ⚡'],
    eating:   ['Nham nham! 😋', 'Delícia! 🤤', 'Que petisco bom! 🍪']
  });

  const PARTICLE_EMOJIS = ['❤️', '💕', '✨', '⭐', '💫', '🌟'];
  const FOOD_EMOJIS = ['🍖', '🍕', '🍪', '🍎', '🧀'];
  const MUSIC_EMOJIS = ['🎵', '🎶', '🎧', '✨'];

  const CONFIG_KEYS = [
    'name', 'color', 'scale', 'animSpeed', 'showSpeech', 'autoWalk',
    'sleepEnabled', 'profession', 'smooth', 'outline', 'accessory'
  ];

  const CLICK_THRESHOLD_PX = 6;
  const VIEWPORT_PAD = 10;

  const randomOf = (list) => list[Math.floor(Math.random() * list.length)];
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  class ClawdCompanion {
    constructor(store) {
      this.store = store;
      this.state = 'idle';
      this.pos = null;               // posição controlada (null = âncora CSS padrão)
      this.isVisible = true;
      this.isAutoWalking = false;
      this.lastActivity = Date.now();
      this.level = levelForXp(store.get('xp'));

      this._drag = null;
      this._speechTimer = null;
      this._stateTimer = null;
      this._cursor = null;
      this._lookScheduled = false;
      this._lastSpeech = Date.now();
      this._lastWave = Date.now();
      this._lastWalk = Date.now();
      this._reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      // Command: mensagens do popup → métodos do companion
      this._commands = {
        ping:             () => ({ ok: true }),
        toggleVisibility: () => this.setVisible(!this.isVisible),
        resetPosition:    () => this.resetPosition(),
        updateConfig:     ({ key, value }) => {
          this.applyConfig(key, value, { persist: true });
          if (key === 'profession') this._detectPageContext();
        },
        triggerAction:    ({ value }) => this.triggerAction(value)
      };

      this._actions = {
        wave:  () => { this.setStateFor('waving', 2200); this.showSpeech('Oi! 👋'); },
        dance: () => { this.setStateFor('excited', 2200); this.spawnParticles(); this.showSpeech('Yeahh! 🕺'); },
        happy: () => this.giveAffection(),
        feed:  () => this.feed(),
        flip:  () => this.doFlip(),
        quiz:  () => this.startQuiz(),
        sleep: () => { this.setState('sleeping'); this.showSpeech('ZzZz... 💤', 6000); },
        wake:  () => this.wakeUp()
      };

      this._petTimes = [];   // janela do combo de carinho
      this._goalTimes = [];  // janela do hat-trick
      this._quizShown = false;
      this._nightMsgShown = false;
    }

    get config() {
      return this.store.state;
    }

    mount() {
      this._createNode();
      CONFIG_KEYS.forEach((key) => this.applyConfig(key, this.config[key]));
      const pos = this.config.position;
      if (pos?.x != null && pos?.y != null) this.updatePosition(pos.x, pos.y);
      this._bindPointerEvents();
      this._bindPageEvents();
      this._listenToMessages();
      this._startHeartbeat();
      this._detectPageContext();
      setTimeout(() => this.showSpeech(randomOf(MESSAGES.idle)), 1200);
    }

    /* Mudanças gravadas por outras abas ou pelo popup */
    onRemoteChange(key, value) {
      if (key === 'xp') {
        this.level = levelForXp(value);
        return;
      }
      if (key === 'position') {
        if (this._drag || this.isAutoWalking) return;
        if (value?.x != null && value?.y != null) {
          this.updatePosition(value.x, value.y);
        } else {
          this.pos = null;
          Object.assign(this.node.style, { left: 'auto', top: 'auto', right: '20px', bottom: '20px' });
        }
        return;
      }
      this.applyConfig(key, value);
      if (key === 'profession') this._detectPageContext();
    }

    /* ---------- DOM ---------- */

    _createNode() {
      document.getElementById('aic-clawd-node')?.remove();
      const node = document.createElement('div');
      node.id = 'aic-clawd-node';
      node.innerHTML = `
        <div class="speech-bubble"></div>
        <div class="pet-body">
          <div class="sprite-stack">
            <div class="pixel-sprite"></div>
            <div class="accessory"></div>
          </div>
          <div class="name-tag"></div>
        </div>
        <div class="pet-ball" title="Chuta a bola!"></div>
        <div class="ground-shadow"></div>
      `;
      document.body.appendChild(node);
      this.node = node;
      this.els = {
        body:   node.querySelector('.pet-body'),
        stack:  node.querySelector('.sprite-stack'),
        sprite: node.querySelector('.pixel-sprite'),
        name:   node.querySelector('.name-tag'),
        speech: node.querySelector('.speech-bubble'),
        ball:   node.querySelector('.pet-ball')
      };

      // Pop-in de entrada; a animação inline precisa ser limpa no fim,
      // senão o fill "both" sobrepõe o transform da perspectiva 3D.
      node.style.animation = 'clawd-pop-in 0.5s cubic-bezier(0.34,1.56,0.64,1) both';
      node.addEventListener('animationend', (e) => {
        if (e.animationName === 'clawd-pop-in') node.style.animation = '';
      });
    }

    applyConfig(key, value, { persist = false } = {}) {
      if (!CONFIG_KEYS.includes(key)) return;
      if (persist) this.store.set(key, value);

      switch (key) {
        case 'name':
          this.els.name.textContent = value;
          break;
        case 'color':
          // Var "base" separada para a cor do estado happy (regra CSS) vencer
          this.node.style.setProperty('--agent-base-color', value);
          break;
        case 'scale': {
          const scale = parseFloat(value);
          if (!Number.isNaN(scale)) {
            this.node.style.setProperty('--agent-scale', scale);
            if (this.pos) this.updatePosition(this.pos.x, this.pos.y); // re-clampa na viewport
          }
          break;
        }
        case 'animSpeed': {
          const duration = (0.55 / (parseFloat(value) || 1)).toFixed(2);
          this.els.sprite.style.animationDuration = `${duration}s`;
          break;
        }
        case 'smooth':
          this.node.classList.toggle('smooth', !!value);
          break;
        case 'outline':
          this.node.classList.toggle('outlined', !!value);
          break;
        case 'accessory':
          this.node.setAttribute('data-accessory', value || 'none');
          break;
        case 'profession':
          this.node.classList.toggle('has-ball', value === 'footballer');
          break;
      }
    }

    /* ---------- Posição ---------- */

    _clampToViewport(x, y) {
      const scale = Number(this.config.scale) || 1;
      const width = Math.max(50, 48 * scale);
      const height = Math.max(50, 72 * scale);
      return {
        x: clamp(x, VIEWPORT_PAD, Math.max(VIEWPORT_PAD, window.innerWidth - width - VIEWPORT_PAD)),
        y: clamp(y, VIEWPORT_PAD, Math.max(VIEWPORT_PAD, window.innerHeight - height - VIEWPORT_PAD))
      };
    }

    updatePosition(x, y) {
      const p = this._clampToViewport(x, y);
      this.pos = p;
      this.node.style.left = `${p.x}px`;
      this.node.style.top = `${p.y}px`;
      this.node.style.right = 'auto';
      this.node.style.bottom = 'auto';
    }

    resetPosition() {
      this._cancelAutoWalk();
      this.pos = null;
      Object.assign(this.node.style, { left: 'auto', top: 'auto', right: '20px', bottom: '20px' });
      this.store.set('position', { x: null, y: null });
    }

    _currentPos() {
      if (this.pos) return { ...this.pos };
      const rect = this.node.getBoundingClientRect();
      return { x: rect.left, y: rect.top };
    }

    _savePosition() {
      if (this.pos) this.store.set('position', { ...this.pos });
    }

    /* ---------- Estados ---------- */

    setState(newState) {
      if (this.state === newState) return;
      this.node.classList.remove(this.state);
      this.state = newState;
      if (newState !== 'idle') this.node.classList.add(newState);
    }

    /* Entra num estado e volta para idle depois de ms (se ninguém mudou antes) */
    setStateFor(state, ms) {
      this.setState(state);
      clearTimeout(this._stateTimer);
      this._stateTimer = setTimeout(() => {
        if (this.state === state) this.setState('idle');
      }, ms);
    }

    markActivity() {
      this.lastActivity = Date.now();
    }

    wakeUp() {
      this.setState('idle');
      this.showSpeech('Bom dia! ☀️');
      this.markActivity();
    }

    setVisible(visible) {
      this.isVisible = visible;
      this.node.style.display = visible ? '' : 'none';
    }

    /* ---------- Interações ---------- */

    _bindPointerEvents() {
      const node = this.node;

      // Bola: clique próprio, não inicia drag
      this.els.ball.addEventListener('pointerdown', (e) => e.stopPropagation());
      this.els.ball.addEventListener('click', (e) => {
        e.stopPropagation();
        this.kickBall();
      });

      // Pointer Events unificam mouse e touch (touch-action: none no CSS)
      node.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        this._cancelAutoWalk();
        const rect = node.getBoundingClientRect();
        this._drag = {
          id: e.pointerId,
          startX: e.clientX,
          startY: e.clientY,
          offsetX: e.clientX - rect.left,
          offsetY: e.clientY - rect.top,
          moved: false
        };
        try { node.setPointerCapture(e.pointerId); } catch { /* pointer já liberado */ }
        this.markActivity();
        if (this.state === 'sleeping') this.wakeUp();
        e.preventDefault();
      });

      node.addEventListener('pointermove', (e) => {
        if (!this._drag || e.pointerId !== this._drag.id) return;
        const dx = e.clientX - this._drag.startX;
        const dy = e.clientY - this._drag.startY;
        if (!this._drag.moved && Math.hypot(dx, dy) < CLICK_THRESHOLD_PX) return;
        this._drag.moved = true;
        this.updatePosition(e.clientX - this._drag.offsetX, e.clientY - this._drag.offsetY);
        this.markActivity();
      });

      const endDrag = (e, cancelled) => {
        if (!this._drag || e.pointerId !== this._drag.id) return;
        const wasDrag = this._drag.moved;
        this._drag = null;
        if (wasDrag || cancelled) this._savePosition();
        else this.giveAffection();
      };
      node.addEventListener('pointerup', (e) => endDrag(e, false));
      node.addEventListener('pointercancel', (e) => endDrag(e, true));
    }

    _bindPageEvents() {
      // Perspectiva 3D seguindo o cursor (throttle por frame)
      document.addEventListener('pointermove', (e) => {
        this._cursor = { x: e.clientX, y: e.clientY };
        if (this._lookScheduled) return;
        this._lookScheduled = true;
        requestAnimationFrame(() => {
          this._lookScheduled = false;
          this._lookAtCursor();
        });
      }, { passive: true });

      document.addEventListener('scroll', () => {
        this.markActivity();
        if (this.state === 'sleeping') { this.wakeUp(); return; }
        if (this.state === 'idle' || this.state === 'excited') this.setStateFor('excited', 900);
      }, { passive: true });

      // Mantém o pet dentro da viewport ao redimensionar a janela
      let resizeTimer;
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          if (this.pos) this.updatePosition(this.pos.x, this.pos.y);
        }, 150);
      });

      // Garante que escritas pendentes (posição/XP) não se percam na navegação
      window.addEventListener('pagehide', () => this.store.flushNow());
    }

    _lookAtCursor() {
      if (!this._cursor || this._drag || this.isAutoWalking || this.state === 'sleeping') return;
      const rect = this.node.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const rx = clamp((this._cursor.y - cy) * 0.035, -12, 12);
      const ry = clamp((this._cursor.x - cx) * 0.035, -12, 12);
      this.node.style.transform = `perspective(600px) rotateX(${-rx}deg) rotateY(${ry}deg)`;
    }

    /* ---------- Gamificação ---------- */

    addXp(amount) {
      const xp = (this.store.get('xp') || 0) + amount;
      this.store.set('xp', xp);
      const newLevel = levelForXp(xp);
      if (newLevel > this.level) {
        this.level = newLevel;
        this.showSpeech(`🎖️ Level ${newLevel}!`, 3500);
        this.spawnParticles(10);
        this.setStateFor('excited', 2500);
      }
    }

    giveAffection() {
      this.markActivity();
      if (this.state === 'sleeping') { this.wakeUp(); return; }
      this.setStateFor('happy', 1800);
      this.showSpeech(randomOf(MESSAGES.happy));
      this.spawnParticles();
      this.addXp(XP_REWARDS.affection);
      this._bumpStat('pets');

      // Combo: 3 carinhos dentro da janela rendem bônus
      const now = Date.now();
      this._petTimes = this._petTimes.filter((t) => now - t < TIMING.COMBO_WINDOW_MS);
      this._petTimes.push(now);
      if (this._petTimes.length >= 3) {
        this._petTimes = [];
        setTimeout(() => {
          this.showSpeech('Combo de carinho! 🥰 +5 XP', 3000);
          this.spawnParticles(8);
          this.addXp(XP_REWARDS.combo);
        }, 600);
      }
    }

    kickBall() {
      if (this.els.ball.classList.contains('kicked')) return;
      this.markActivity();
      this.els.ball.classList.add('kicked');
      this.setStateFor('excited', TIMING.KICK_DURATION_MS);
      this.showSpeech('Gooool! ⚽🥅', 2500);
      this.addXp(XP_REWARDS.goal);
      this._bumpStat('goals');
      setTimeout(() => this.els.ball.classList.remove('kicked'), TIMING.KICK_DURATION_MS);

      // Sequência: 3 gols dentro da janela = hat-trick com bônus
      const now = Date.now();
      this._goalTimes = this._goalTimes.filter((t) => now - t < TIMING.STREAK_WINDOW_MS);
      this._goalTimes.push(now);
      if (this._goalTimes.length >= 3) {
        this._goalTimes = [];
        setTimeout(() => {
          this.showSpeech('HAT-TRICK! 🎩⚽ +20 XP', 3500);
          this.spawnParticles(10);
          this.addXp(XP_REWARDS.hatTrick);
        }, 900);
      }
    }

    feed() {
      if (this.node.classList.contains('eating')) return;
      this.markActivity();
      if (this.state === 'sleeping') this.wakeUp();
      this.node.classList.add('eating');
      this.showSpeech(randomOf(MESSAGES.eating), 2200);
      this.spawnParticles(5, FOOD_EMOJIS);
      this.addXp(XP_REWARDS.feed);
      this._bumpStat('feeds');
      setTimeout(() => this.node.classList.remove('eating'), TIMING.EAT_MS);
    }

    doFlip() {
      this.markActivity();
      if (this.state === 'sleeping') this.wakeUp();
      this.setStateFor('flipping', TIMING.FLIP_MS);
      this.showSpeech('Ihuuu! 🤸', 2000);
    }

    /* ---------- Efeitos ---------- */

    spawnParticles(count = 5, emojis = PARTICLE_EMOJIS) {
      if (this._reducedMotion) return;
      const rect = this.node.getBoundingClientRect();
      for (let i = 0; i < count; i++) {
        setTimeout(() => {
          const el = document.createElement('div');
          el.style.cssText = `
            position:fixed;
            left:${rect.left + Math.random() * 50 - 5}px;
            top:${rect.top + Math.random() * 20}px;
            z-index:2147483647;
            font-size:${14 + Math.random() * 8}px;
            pointer-events:none;
            animation:clawd-float-up ${0.8 + Math.random() * 0.4}s ease-out forwards;
          `;
          el.textContent = randomOf(emojis);
          document.body.appendChild(el);
          setTimeout(() => el.remove(), 1400);
        }, i * 90);
      }
    }

    /* ---------- Estatísticas ---------- */

    _bumpStat(key) {
      const stats = { pets: 0, goals: 0, feeds: 0, quizzes: 0, ...(this.store.get('stats') || {}) };
      stats[key] = (stats[key] || 0) + 1;
      this.store.set('stats', stats);
    }

    /* ---------- Desafio do Tutor (quiz) ---------- */

    _makeQuiz() {
      const rand = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
      const ops = [
        { symbol: '+', apply: (a, b) => a + b },
        { symbol: '−', apply: (a, b) => a - b },
        { symbol: '×', apply: (a, b) => a * b }
      ];
      const op = randomOf(ops);
      let a = rand(2, 9);
      let b = rand(2, 9);
      if (op.symbol === '−' && b > a) [a, b] = [b, a];
      const answer = op.apply(a, b);
      const options = new Set([answer]);
      while (options.size < 3) {
        const wrong = answer + rand(1, 4) * (Math.random() < 0.5 ? -1 : 1);
        if (wrong !== answer && wrong >= 0) options.add(wrong);
      }
      return {
        question: `${a} ${op.symbol} ${b} = ?`,
        answer,
        options: [...options].sort(() => Math.random() - 0.5)
      };
    }

    startQuiz() {
      this.node.querySelector('.quiz-card')?.remove();
      this.markActivity();
      if (this.state === 'sleeping') this.wakeUp();

      const quiz = this._makeQuiz();
      const card = document.createElement('div');
      card.className = 'quiz-card';
      card.innerHTML = `
        <button class="quiz-close" title="Fechar">✕</button>
        <div class="quiz-title">🧠 Desafio do Tutor</div>
        <div class="quiz-question">${quiz.question}</div>
        <div class="quiz-options"></div>
      `;
      // Interações do quiz não devem iniciar drag nem contar como carinho
      card.addEventListener('pointerdown', (e) => e.stopPropagation());
      card.addEventListener('click', (e) => e.stopPropagation());

      const optionsEl = card.querySelector('.quiz-options');
      quiz.options.forEach((value) => {
        const btn = document.createElement('button');
        btn.textContent = value;
        btn.addEventListener('click', () => {
          if (value === quiz.answer) {
            card.remove();
            this.showSpeech(`Mandou bem! 🎓 +${XP_REWARDS.quiz} XP`, 3500);
            this.setStateFor('happy', 2000);
            this.spawnParticles(8);
            this.addXp(XP_REWARDS.quiz);
            this._bumpStat('quizzes');
          } else {
            btn.disabled = true;
            card.classList.remove('wrong');
            void card.offsetWidth; // reinicia a animação de shake
            card.classList.add('wrong');
            this.showSpeech('Quase! Tenta de novo ✏️', 2200);
          }
        });
        optionsEl.appendChild(btn);
      });
      card.querySelector('.quiz-close').addEventListener('click', () => card.remove());

      this.node.appendChild(card);
    }

    showSpeech(text, duration = 2800) {
      if (!this.config.showSpeech) return;
      this.els.speech.textContent = text;
      this.els.speech.classList.add('visible');
      clearTimeout(this._speechTimer);
      this._speechTimer = setTimeout(() => {
        this.els.speech.classList.remove('visible');
      }, duration);
    }

    triggerAction(name) {
      const action = this._actions[name];
      if (!action) return;
      this.markActivity();
      action();
    }

    /* ---------- Comportamento autônomo ---------- */

    _startHeartbeat() {
      this._heartbeat = setInterval(() => this._tick(), TIMING.HEARTBEAT_MS);
    }

    _tick() {
      if (!this.isVisible || document.hidden || this._drag) return;
      const now = Date.now();

      // Recado noturno (uma vez por sessão)
      if (!this._nightMsgShown && this.state === 'idle') {
        const hour = new Date().getHours();
        if (hour >= 22 || hour < 5) {
          this._nightMsgShown = true;
          this.showSpeech('Já é tarde… 🌙 Descansa um pouco!', 4000);
        }
      }

      // Dormir por inatividade
      if (
        this.config.sleepEnabled && this.state === 'idle' &&
        !this.isAutoWalking && now - this.lastActivity > TIMING.SLEEP_AFTER_MS
      ) {
        this.setState('sleeping');
        this.showSpeech(randomOf(MESSAGES.sleeping), 6000);
        return;
      }
      if (this.state === 'sleeping') return;

      // Fala aleatória
      if (now - this._lastSpeech > TIMING.SPEECH_EVERY_MS) {
        this._lastSpeech = now;
        if (Math.random() < CHANCE.speech) {
          this.showSpeech(randomOf(MESSAGES[this.state] || MESSAGES.idle));
        }
      }

      // Aceno aleatório
      if (this.state === 'idle' && now - this._lastWave > TIMING.WAVE_EVERY_MS) {
        this._lastWave = now;
        if (Math.random() < CHANCE.wave) {
          this.setStateFor('waving', 2200);
          this.showSpeech('Oi! 👋');
        }
      }

      // Passeio automático
      if (
        this.state === 'idle' && this.config.autoWalk &&
        !this.isAutoWalking && now - this._lastWalk > TIMING.WALK_EVERY_MS
      ) {
        this._lastWalk = now;
        if (Math.random() < CHANCE.walk) this._autoWalk();
      }
    }

    _autoWalk() {
      if (this._reducedMotion) return;
      const from = this._currentPos();
      const to = this._clampToViewport(
        from.x + (Math.random() - 0.5) * 240,
        from.y + (Math.random() - 0.5) * 120
      );
      if (Math.hypot(to.x - from.x, to.y - from.y) < 12) return;

      this.isAutoWalking = true;
      this.setState('walking');
      if (to.x < from.x) this.els.stack.style.transform = 'scaleX(-1)'; // vira para a esquerda

      const started = performance.now();
      const step = (now) => {
        if (!this.isAutoWalking) return; // cancelado (drag/reset)
        const t = Math.min(1, (now - started) / TIMING.WALK_DURATION_MS);
        this.updatePosition(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t);
        if (t < 1) requestAnimationFrame(step);
        else this._finishAutoWalk(true);
      };
      requestAnimationFrame(step);
    }

    _finishAutoWalk(save) {
      this.isAutoWalking = false;
      this.els.stack.style.transform = '';
      if (this.state === 'walking') this.setState('idle');
      if (save) this._savePosition();
    }

    _cancelAutoWalk() {
      if (this.isAutoWalking) this._finishAutoWalk(false);
    }

    /* ---------- Contexto da página (por profissão) ---------- */

    _detectPageContext() {
      const prof = PROFESSIONS[this.config.profession];
      if (!prof?.keywords?.length) return;
      const host = window.location.hostname.toLowerCase();
      if (!prof.keywords.some((k) => host.includes(k))) return;

      setTimeout(() => {
        this.showSpeech(randomOf(prof.messages), 3500);
        if (prof.celebrates) {
          this.setStateFor('happy', 2000);
          const emojis = this.config.profession === 'musician' ? MUSIC_EMOJIS : PARTICLE_EMOJIS;
          this.spawnParticles(5, emojis);
        }
      }, 2000);

      // Tutor: lança um desafio de lógica após um tempo em site de distração
      if (prof.challenge && !this._quizShown) {
        this._quizShown = true;
        setTimeout(() => {
          if (this.config.profession === 'tutor' && this.isVisible) this.startQuiz();
        }, TIMING.QUIZ_AFTER_MS);
      }
    }

    /* ---------- Mensagens do popup ---------- */

    _listenToMessages() {
      chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
        const command = this._commands[request?.action];
        if (!command) return;
        const response = command(request);
        if (response) sendResponse(response);
      });
    }
  }

  /* ---------- Bootstrap ---------- */

  const store = new ClawdStore();
  store.load().then(() => {
    const mountCompanion = () => {
      const companion = new ClawdCompanion(store);
      companion.mount();
      store.subscribe((key, value) => companion.onRemoteChange(key, value));
      window.__clawdCompanion = companion; // mundo isolado: útil para depuração/testes
    };
    if (document.body) mountCompanion();
    else document.addEventListener('DOMContentLoaded', mountCompanion, { once: true });
  });
})();
