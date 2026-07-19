/* ===================================================
   CLAW'D v3.2 — CONTENT SCRIPT
   Pet interativo: stats/emoções, gamificação, favoritos,
   sub-pets, profissões 2.0, pescador, passeio entre abas.
   Requer: src/shared/catalog.js (carregado antes).
   =================================================== */

(function clawdContentScope() {

/* Global error handler — graceful degradation, no pet crash */
try {
  window.addEventListener('error', (event) => {
    try {
      if (window.__clawd && typeof window.__clawd.destroy === 'function') {
        window.__clawd.destroy();
      }
    } catch (_) {}
  }, { once: true });
  window.addEventListener('unhandledrejection', (event) => {
    try {
      if (window.__clawd && typeof window.__clawd.destroy === 'function') {
        window.__clawd.destroy();
      }
    } catch (_) {}
  }, { once: true });
} catch (_) {}

/* =====================================================
   SUB-PET — sprites via CLAWD_SUBPET_SPRITES (catalog.js)
   ===================================================== */
class SubPet {
  constructor(owner, species) {
    this.owner = owner;
    this.species = species;
    this.def = CLAWD_SUBPETS[species] || CLAWD_SUBPETS.dog;
    this.sprite = CLAWD_SUBPET_SPRITES[species] || CLAWD_SUBPET_SPRITES.dog;
    this.bounds = clawdSubPetBounds(this.sprite);
    this.color = this.sprite.colors.B;
    this.eyeColor = this.sprite.colors.K || '#111111';
    this.setColor(owner.S.subpets.colors?.[species]);
    this.setEyeColor(owner.S.subpets.eyeColors?.[species]);
    this.state = 'following';
    this.x = 0; this.y = 0;
    this.frame = 0;
    this._pose = 'idle';
    this._raf = null;
    this._rafPaused = false;
    this._lastPaint = 0;
    this._lastX = 0;
    this._domLeft = null;
    this._domTop = null;
    this._interactTimer = null;
    this._sleepTimer = null;
    this._wakeTimer = null;
    this._interactionEndTimer = null;
    this._actionTimers = new Set();
    this._interactionBusy = false;
    this._petMoves = 0;
    this._cloneNode = null;
    this._perch = false;
    this._blinking = false;
    this._blinkTimer = null;
    this._reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.node = null;
    this.create();
  }

  _computeScale() {
    const owner = parseFloat(this.owner?.S?.scale) || 1.5;
    // Companheiro ~40–55% do pet — pixels na mesma ordem de grandeza do Claw'd.
    return Math.max(0.55, Math.min(0.95, owner * 0.42));
  }

  create() {
    const rect = this.owner.node.getBoundingClientRect();
    this.x = rect.left - this.bounds.width - 12;
    this.y = rect.top + 16;
    this._lastX = this.x;
    this.node = document.createElement('div');
    this.node.className = 'aic-subpet';
    this.node.dataset.species = this.species;
    this.node.dataset.state = this.state;
    this.node.setAttribute('role', 'button');
    this.node.setAttribute('tabindex', '0');
    this.node.setAttribute('aria-label', `${this.owner.S.subpets.names?.[this.species] || this.def.label}, sub-pet interativo`);
    this.node.innerHTML = `
      <div class="subpet-bubble"></div>
      <div class="subpet-motion">
        <div class="subpet-sprite"></div>
      </div>`;
    document.body.appendChild(this.node);
    this.spriteNode = this.node.querySelector('.subpet-sprite');
    this.motionNode = this.node.querySelector('.subpet-motion');
    this.bubbleNode = this.node.querySelector('.subpet-bubble');
    const scale = this._computeScale();
    this.node.style.setProperty('--subpet-scale', String(scale));
    this.node.style.setProperty('--subpet-body', this.color || this.sprite.colors.B);
    this.node.style.setProperty('--subpet-eye', this.eyeColor || this.sprite.colors.K || '#111111');
    this.node.style.setProperty('--subpet-eye-gap', `${Math.max(10, Math.round(this.bounds.width * 0.28))}px`);
    this.node.style.width = `${this.bounds.width}px`;
    this.node.style.height = `${this.bounds.height}px`;
    this.node.style.left = `${this.x}px`;
    this.node.style.top = `${this.y}px`;
    this.spriteNode.style.width = `${CLAWD_SUBPET_CELL}px`;
    this.spriteNode.style.height = `${CLAWD_SUBPET_CELL}px`;
    this.spriteNode.style.transformOrigin = `${this.bounds.width / 2}px 0px`;
    // Bitmap literal do sheet; fallback box-shadow se paleta custom.
    this._paint(true);
    this._startBlink();
    this.node.addEventListener('click', (event) => {
      event.stopPropagation();
      this._pulseTap();
      if (this._clickTimer) {
        clearTimeout(this._clickTimer);
        this._clickTimer = null;
        if (this.state === 'sleeping') this.wakeUp('Acordei! ✨');
        else this.interact('special', { force: true });
        this.owner.registerDaily?.('subpet');
        return;
      }
      this._clickTimer = setTimeout(() => {
        this._clickTimer = null;
        if (this.state === 'sleeping') this.wakeUp('Acordei com seu carinho! ✨');
        else this.interact('cuddle');
        this.owner.registerDaily?.('subpet');
      }, 220);
    });
    this.node.addEventListener('dblclick', (event) => {
      event.stopPropagation();
      event.preventDefault();
      this._pulseTap();
      if (this._clickTimer) {
        clearTimeout(this._clickTimer);
        this._clickTimer = null;
      }
      if (this.state === 'sleeping') this.wakeUp('Acordei! ✨');
      else this.interact('special', { force: true });
      this.owner.registerDaily?.('subpet');
    });
    this.node.addEventListener('mouseenter', () => {
      if (!this.node || this.state === 'sleeping') return;
      this.node.classList.add('hovering');
      if (this.species === 'dog' && !this._interactionBusy && !this._reducedMotion) {
        this.node.classList.add('wagging');
        this._sfx('wag');
      }
    });
    this.node.addEventListener('mousemove', () => {
      if (this.state === 'sleeping' || this._interactionBusy) return;
      this._petMoves += 1;
      if (this._petMoves >= 28) {
        this._petMoves = 0;
        this.interact('cuddle');
      }
    });
    this.node.addEventListener('mouseleave', () => {
      this._petMoves = 0;
      this.node?.classList.remove('hovering');
      if (!this._interactionBusy) this.node?.classList.remove('wagging');
    });
    this.node.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        this._pulseTap();
        if (this.state === 'sleeping') this.wakeUp('Acordei! ✨');
        else this.interact('cuddle');
        this.owner.registerDaily?.('subpet');
      }
    });
    this.node.classList.add('summoning');
    this._later(() => this.node?.classList.remove('summoning'), 700);
    this._burst(['✨', '⭐', '💫'], 6);
    this._spark();
    this._sfx('summon');
    this._loop();
    this._scheduleInteraction();
  }

  _pulseTap() {
    if (!this.node || this._reducedMotion) return;
    this.node.classList.remove('tapped');
    // force reflow so re-click retriggers animation
    void this.node.offsetWidth;
    this.node.classList.add('tapped');
    this._later(() => this.node?.classList.remove('tapped'), 300);
  }

  _movingPose() {
    // Interações de deslocamento usam pose walk; carinho/spin/etc. não herdam walk do follow.
    const actionMove = this.state === 'racing' || this.state === 'exploring' || this.state === 'playing'
      || this.state === 'splitting' || this.state === 'flying' || this.state === 'special';
    if (actionMove) return true;
    if (this._interactionBusy) return false;
    return !!this.node?.classList.contains('owner-walking')
      || !!this.node?.classList.contains('owner-running')
      || !!this.node?.classList.contains('moving');
  }

  _hasCustomPalette() {
    const custom = this.owner?.S?.subpets?.colors?.[this.species];
    const customEye = this.owner?.S?.subpets?.eyeColors?.[this.species];
    return /^#[\da-f]{6}$/i.test(custom || '') || /^#[\da-f]{6}$/i.test(customEye || '');
  }

  _useBitmap() {
    return !!(this.sprite?.image?.url || clawdSubPetImageUrl(this.species)) && !this._hasCustomPalette();
  }

  _startBlink() {
    clearInterval(this._blinkTimer);
    if (this._reducedMotion) return;
    // Pisca troca para frame sleep (olhos fechados) e volta — sem overlay que tapava a íris.
    this._blinkTimer = setInterval(() => {
      if (!this.node || document.hidden) return;
      if (this.state === 'sleeping' || this._interactionBusy || this.owner?.isQuiet?.()) return;
      this._blinking = true;
      this.node.classList.add('blinking');
      this._paint(true);
      // ~160ms fecha os olhos com calma (antes 140 — flashia demais em PNG).
      this._later(() => {
        this._blinking = false;
        this.node?.classList.remove('blinking');
        this._paint(true);
      }, 160);
    }, 4800 + Math.floor(Math.random() * 2200));
  }

  /** Sons curtos via o pet dono (respeita settings.sounds / quiet hours). */
  _sfx(kind) {
    const o = this.owner;
    if (!o?.beep || !o.S?.settings?.sounds || o.isQuiet?.()) return;
    const map = {
      blink: () => o.beep(920, 0.02, 'triangle'),
      cuddle: () => o.chime([[620, 0.04], [780, 0.06]]),
      play: () => o.chime([[520, 0.04], [660, 0.05], [820, 0.06]]),
      special: () => o.chime([[440, 0.05], [560, 0.05], [720, 0.08]]),
      wag: () => { o.beep(540, 0.04, 'triangle'); setTimeout(() => o.beep(600, 0.04, 'triangle'), 80); },
      hop: () => o.beep(700, 0.05, 'square'),
      stomp: () => { o.beep(160, 0.1, 'sawtooth'); setTimeout(() => o.beep(120, 0.12, 'triangle'), 90); },
      fire: () => { o.beep(180, 0.08, 'sawtooth'); setTimeout(() => o.beep(320, 0.06, 'sawtooth'), 70); },
      phase: () => o.beep(380, 0.12, 'triangle'),
      split: () => o.chime([[500, 0.05], [500, 0.05], [360, 0.1]]),
      explore: () => o.beep(480, 0.05, 'triangle'),
      spin: () => o.chime([[600, 0.04], [800, 0.05]]),
      celebrate: () => o.chime([[520, 0.05], [660, 0.05], [880, 0.08]]),
      eat: () => o.beep(300, 0.07, 'triangle'),
      sleep: () => o.beep(240, 0.12, 'triangle'),
      wake: () => o.chime([[500, 0.04], [720, 0.06]]),
      summon: () => o.chime([[440, 0.05], [660, 0.06], [880, 0.08]])
    };
    (map[kind] || map.special)();
  }

  _paint(force = false) {
    if (!this.spriteNode) return;
    // Bitmap fica no PNG durante piscada/sono — CSS (.blinking/.sleeping) faz o feedback.
    // Trocar para box-shadow no blink causava flash PNG↔pixel a cada ~5s.
    const wantBitmap = this._useBitmap();
    if (wantBitmap) {
      const url = clawdSubPetImageUrl(this.species);
      const w = this.bounds.width;
      const h = this.bounds.height;
      this.spriteNode.classList.add('subpet-sprite--bitmap');
      this.spriteNode.style.boxShadow = 'none';
      this.spriteNode.style.backgroundImage = `url("${url}")`;
      this.spriteNode.style.backgroundRepeat = 'no-repeat';
      this.spriteNode.style.backgroundPosition = 'center bottom';
      this.spriteNode.style.backgroundSize = 'contain';
      this.spriteNode.style.width = `${w}px`;
      this.spriteNode.style.height = `${h}px`;
      this.spriteNode.style.transformOrigin = `${w / 2}px ${h}px`;
      this._pose = this.state === 'sleeping' ? 'sleep' : (this._blinking ? 'blink' : 'bitmap');
      return;
    }
    // Fallback / paleta custom / piscada: box-shadow lineless.
    this.spriteNode.classList.remove('subpet-sprite--bitmap');
    this.spriteNode.style.backgroundImage = '';
    this.spriteNode.style.backgroundSize = '';
    let pose = 'idle';
    const flying = this.state === 'flying'
      || this.node?.classList.contains('flying')
      || (this.species === 'dragon' && this._perch)
      || (this.species === 'bird' && (this._perch || this.state === 'special'));
    if (this.state === 'sleeping' || this._blinking) pose = 'sleep';
    else if ((this.state === 'special' || this.node?.classList.contains('fire')) && this.sprite.frames.special) pose = 'special';
    else if (flying && this.sprite.frames.flying) pose = 'flying';
    else if (this._movingPose()) pose = 'walk';
    const set = this.sprite.frames[pose] || this.sprite.frames.idle;
    const animatePose = !this._blinking && (pose === 'walk' || pose === 'flying' || pose === 'special' || pose === 'idle');
    if (animatePose && !force) this.frame = (this.frame + 1) % set.length;
    else if (force || this._blinking) this.frame = 0;
    const rows = clawdSubPetFrame(this.sprite, pose, this.frame);
    this.spriteNode.style.width = `${CLAWD_SUBPET_CELL}px`;
    this.spriteNode.style.height = `${CLAWD_SUBPET_CELL}px`;
    this.spriteNode.style.transformOrigin = `${this.bounds.width / 2}px 0px`;
    this.spriteNode.style.boxShadow = clawdBuildPixelShadow(rows, this.colors, CLAWD_SUBPET_CELL);
    this._pose = pose;
  }

  _burst(emojis, count = 5) {
    if (!this.node || this.owner?._destroyed || this.owner?.S?.settings?.performanceMode) return;
    if (this._reducedMotion || document.hidden) return;
    if (!this.owner?._reserveFx?.(count)) return;
    this._fxPending = (this._fxPending || 0) + count;
    const rect = this.node.getBoundingClientRect();
    const pool = emojis || ['✨', '⭐', '💫'];
    for (let i = 0; i < count; i++) {
      this._later(() => {
        this._fxPending = Math.max(0, (this._fxPending || 1) - 1);
        if (!this.node || document.hidden || this.owner?._destroyed) {
          this.owner?._releaseFx?.(1);
          return;
        }
        const el = document.createElement('div');
        el.className = 'aic-particle aic-subpet-particle';
        el.style.cssText = `
          position:fixed;
          left:${rect.left + Math.random() * Math.max(12, rect.width) - 4}px;
          top:${rect.top + Math.random() * Math.max(8, rect.height * 0.5)}px;
          z-index:2147483647;
          font-size:${11 + Math.random() * 7}px;
          pointer-events:none;
          animation:clawd-float-up ${0.7 + Math.random() * 0.35}s ease-out forwards;
        `;
        el.textContent = pool[Math.floor(Math.random() * pool.length)];
        document.body.appendChild(el);
        this.owner._trackParticle(el, 1200, true);
      }, i * 70);
    }
  }

  _spark(colors, count = 6) {
    if (!this.node || this.owner?._destroyed || this.owner?.S?.settings?.performanceMode) return;
    if (this._reducedMotion || document.hidden) return;
    if (!this.owner?._reserveFx?.(count)) return;
    this._fxPending = (this._fxPending || 0) + count;
    const rect = this.node.getBoundingClientRect();
    const palette = colors || [this.color, this.eyeColor, '#f1c40f', '#ffffff'];
    for (let i = 0; i < count; i++) {
      this._later(() => {
        this._fxPending = Math.max(0, (this._fxPending || 1) - 1);
        if (!this.node || document.hidden || this.owner?._destroyed) {
          this.owner?._releaseFx?.(1);
          return;
        }
        const el = document.createElement('div');
        el.className = 'aic-pixel-spark';
        const sx = `${(Math.random() - 0.5) * 36}px`;
        const sy = `${-18 - Math.random() * 28}px`;
        el.style.cssText = `
          left:${rect.left + Math.random() * Math.max(10, rect.width)}px;
          top:${rect.top + Math.random() * Math.max(8, rect.height)}px;
          background:${palette[Math.floor(Math.random() * palette.length)]};
          box-shadow: 2px 0 ${palette[Math.floor(Math.random() * palette.length)]};
          --spark-x:${sx}; --spark-y:${sy};
        `;
        document.body.appendChild(el);
        this.owner._trackParticle(el, 900, true);
      }, i * 35);
    }
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
    this.colors = clawdSubPetPalette(this.sprite, this.color, this.eyeColor);
    this.node?.style.setProperty('--subpet-body', this.color);
    if (this.spriteNode) this._paint(true);
  }

  setEyeColor(color) {
    this.eyeColor = /^#[\da-f]{6}$/i.test(color || '') ? color : (this.sprite.colors.K || '#111111');
    this.colors = clawdSubPetPalette(this.sprite, this.color, this.eyeColor);
    this.node?.style.setProperty('--subpet-eye', this.eyeColor);
    if (this.spriteNode) this._paint(true);
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
      'exploring', 'vanishing', 'fire', 'split', 'perching', 'eating', 'cheering',
      'flying', 'summoning', 'wagging', 'double-hop', 'heavy-stomp', 'phasing', 'singing',
      'watching-balloon', 'duo-hug', 'startled', 'tapped', 'settling', 'sleep-settle',
      'being-petted', 'duo-play', 'nap-sync'
    );
    this._perch = false;
  }

  _isNight() {
    const h = new Date().getHours();
    return h >= 19 || h < 6;
  }

  /** Pool de interações autonômicas por espécie (ficha dos Subpets). */
  _speciesPool() {
    const pools = {
      dog:    ['play', 'cuddle', 'celebrate', 'special', 'hug', 'play', 'cuddle', 'special'],
      cat:    ['nap', 'nap', 'cuddle', 'special', 'nap', 'explore'],
      bird:   ['special', 'explore', 'spin', 'special', 'celebrate', 'play'],
      rabbit: ['play', 'play', 'race', 'special', 'spin', 'celebrate'],
      dino:   ['race', 'race', 'play', 'special', 'explore', 'stomp'],
      dragon: ['special', 'celebrate', 'explore', 'special', 'spin'],
      ghost:  this._isNight()
        ? ['special', 'explore', 'vanish', 'special', 'spin']
        : ['nap', 'explore', 'cuddle', 'nap'],
      slime:  ['play', 'cuddle', 'special', 'explore', 'hug', 'special']
    };
    return pools[this.species] || pools.dog;
  }

  /** Sincroniza animações com o estado do pet dono (passear/correr/comer/dormir/freestyle). */
  onOwnerState(state) {
    if (!this.node) return;
    if (state === 'sleeping' && this.state !== 'sleeping') {
      this.sleep();
      return;
    }
    // Dormindo: fica no lugar — nao herda walk/cheer do dono (so acordar p/ comer).
    if (this.state === 'sleeping') {
      this.node.classList.remove('moving', 'owner-walking', 'owner-running', 'cheering');
      if (state === 'eating') this.interact('eat', { force: true });
      return;
    }
    this.node.classList.toggle('owner-walking', state === 'walking');
    this.node.classList.toggle('owner-running', state === 'running');
    this.node.classList.toggle('cheering', state === 'keepy-uppy' || state === 'celebrate' || state === 'cheering');
    if (state === 'eating') this.interact('eat', { force: true });
    if (state === 'celebrate' && !this._interactionBusy) {
      this.interact('celebrate', { force: false });
    }
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
    this._paint(true);
  }

  _finishInteractionAfter(delay, onFinish) {
    this._cancelInteractionTimer();
    this._interactionEndTimer = this._later(() => {
      this._removeClone();
      this._setState('following');
      this._clearActionClasses();
      this._interactionBusy = false;
      this._interactionEndTimer = null;
      this._paint(true);
      // Callback depois do reset para poder encadear (ex.: gato → nap).
      if (onFinish) onFinish();
    }, delay);
  }

  _startRace(message = 'Corrida! 🏁', duration = 3600) {
    this._beginInteraction('racing', 'racing');
    this._raceX = Math.random() < 0.5 ? 10 : window.innerWidth - this.bounds.width - 10;
    this.say(message);
    this.owner.startRun(this._raceX);
    this.owner.addXp(2);
    this._finishInteractionAfter(duration);
  }

  _spawnClone() {
    this._removeClone();
    if (!this.node || !this.spriteNode) return;
    const clone = document.createElement('div');
    clone.className = 'aic-subpet aic-subpet-clone';
    clone.style.cssText = this.node.style.cssText;
    clone.style.setProperty('--subpet-scale', getComputedStyle(this.node).getPropertyValue('--subpet-scale') || '1');
    clone.innerHTML = '<div class="subpet-motion"><div class="subpet-sprite"></div></div>';
    const sprite = clone.querySelector('.subpet-sprite');
    if (this._useBitmap()) {
      sprite.classList.add('subpet-sprite--bitmap');
      sprite.style.width = `${this.bounds.width}px`;
      sprite.style.height = `${this.bounds.height}px`;
      sprite.style.boxShadow = 'none';
      sprite.style.backgroundImage = this.spriteNode.style.backgroundImage;
      sprite.style.backgroundRepeat = 'no-repeat';
      sprite.style.backgroundPosition = 'center bottom';
      sprite.style.backgroundSize = 'contain';
    } else {
      sprite.style.width = `${CLAWD_SUBPET_CELL}px`;
      sprite.style.height = `${CLAWD_SUBPET_CELL}px`;
      sprite.style.boxShadow = this.spriteNode.style.boxShadow;
      sprite.style.backgroundImage = '';
    }
    clone.style.left = `${this.x + this.bounds.width * 0.55}px`;
    clone.style.top = `${this.y}px`;
    document.body.appendChild(clone);
    this._cloneNode = clone;
    this._later(() => this._removeClone(), 1500);
  }

  _removeClone() {
    if (this._cloneNode) {
      this._cloneNode.remove();
      this._cloneNode = null;
    }
  }

  sleep() {
    if (this.state === 'sleeping') return;
    clearTimeout(this._wakeTimer);
    this._cancelInteractionTimer();
    this._setState('sleeping');
    this._clearActionClasses();
    this.node.classList.remove('waking', 'moving', 'owner-walking', 'owner-running', 'cheering');
    this.node.classList.add('sleeping');
    // Squash curto ao deitar — não compete com walk porque moving já saiu.
    if (!this._reducedMotion) {
      this.node.classList.add('sleep-settle');
      this._later(() => this.node?.classList.remove('sleep-settle'), 420);
    }
    this._interactionBusy = true;
    this.say('💤', 0);
    this._paint(true);
    this._pauseRaf();
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
    this._sfx('wake');
    clearTimeout(this._wakeTimer);
    this._wakeTimer = setTimeout(() => this.node && this.node.classList.remove('waking'), 1100);
    this.owner.addXp(1);
    this._paint(true);
    this._resumeRaf();
    // Re-sincroniza walk/run se o dono já estava em deslocamento (não re-dorme).
    if (this.owner?.state && this.owner.state !== 'sleeping') this.onOwnerState(this.owner.state);
  }

  _pauseRaf() {
    this._rafPaused = true;
    this._clearSettleWake();
    if (this._raf != null) {
      cancelAnimationFrame(this._raf);
      this._raf = null;
    }
  }

  _resumeRaf() {
    if (!this.node || this._raf != null || document.hidden) return;
    if (this.state === 'sleeping') return;
    this._clearSettleWake();
    this._rafPaused = false;
    this._loop();
  }

  _clearSettleWake() {
    if (this._settleWakeTimer) {
      clearInterval(this._settleWakeTimer);
      this._settleWakeTimer = null;
    }
  }

  /* Quando o follow está settled, para o rAF e acorda só se o dono se mover */
  _armSettleWake() {
    if (this._settleWakeTimer || !this.node) return;
    this._settleWakeTimer = setInterval(() => {
      if (!this.node || document.hidden || this.state === 'sleeping') return;
      if (this._interactionBusy
        || this.state === 'racing' || this.state === 'exploring'
        || this.state === 'flying' || this.state === 'special') {
        this._clearSettleWake();
        this._resumeRaf();
        return;
      }
      const ownerRun = this.owner.state === 'running';
      const ownerWalk = this.owner.state === 'walking' || this.owner.state === 'keepy-uppy';
      if (ownerRun || ownerWalk) {
        this._clearSettleWake();
        this._resumeRaf();
        return;
      }
      /* pássaro/dragão em follow orbitam — precisam do rAF contínuo */
      if ((this.species === 'bird' || this.species === 'dragon')
        && this.state === 'following' && !this._reducedMotion && !this.owner.isQuiet?.()) {
        this._clearSettleWake();
        this._resumeRaf();
        return;
      }
      const rect = this.owner.node?.getBoundingClientRect();
      if (!rect) return;
      const tx = rect.left - this.bounds.width - 8;
      const ty = rect.top + rect.height * 0.28;
      if (Math.hypot(tx - this.x, ty - this.y) >= 0.5) {
        this._clearSettleWake();
        this._resumeRaf();
      }
    }, 180);
  }

  _writePos(left, top) {
    const eps = 0.35;
    if (this._domLeft != null && this._domTop != null
        && Math.abs(left - this._domLeft) < eps && Math.abs(top - this._domTop) < eps) {
      return false;
    }
    this._domLeft = left;
    this._domTop = top;
    this.node.style.left = `${left}px`;
    this.node.style.top = `${top}px`;
    return true;
  }

  _loop() {
    if (this._raf != null) return;
    const quiet = () => this._reducedMotion || this.owner.isQuiet?.();
    const SETTLE_EPS = CLAWD_TIMINGS.SETTLE_EPS_PX;
    const tick = () => {
      if (!this.node || !document.body.contains(this.node)) { cancelAnimationFrame(this._raf); this._raf = null; return; }
      if (document.hidden || this.state === 'sleeping') {
        this._rafPaused = true;
        this._raf = null;
        return;
      }
      this._rafPaused = false;
      const now = performance.now();
      const moving = this._movingPose();
      const ownerRun = this.owner.state === 'running';
      const ownerWalk = this.owner.state === 'walking' || this.owner.state === 'keepy-uppy';
      const flyingAnim = this.state === 'flying' || this.node.classList.contains('flying')
        || (this.species === 'dragon' && this.state === 'following' && !quiet() && !this._interactionBusy)
        || (this.species === 'bird' && this.state === 'following' && !quiet());
      const paintGap = this.state === 'flying' || flyingAnim ? 90
        : ownerRun ? 80
        : ownerWalk || moving ? 100
        : 160;
      const paintCadence = !this._useBitmap();
      if (paintCadence && (moving || flyingAnim || this.state === 'special') && now - this._lastPaint >= paintGap) {
        this._paint();
        this._lastPaint = now;
      } else if (paintCadence && !moving && !flyingAnim && this.state === 'following' && now - this._lastPaint >= 520) {
        // pisca idle (2 frames) — só no path pixel/box-shadow
        this._paint();
        this._lastPaint = now;
      }
      const rect = this.owner.node.getBoundingClientRect();
      let tx = rect.left - this.bounds.width - 8;
      let ty = rect.top + rect.height * 0.28;
      if (this.species === 'bird' || this.species === 'dragon') {
        if (this._perch || this.state === 'special' || this.state === 'flying') {
          tx = rect.left + rect.width * (this.species === 'dragon' ? 0.55 : 0.35);
          ty = rect.top - this.bounds.height * (this.species === 'dragon' ? 0.85 : 0.55);
        } else if (this.state === 'following' && !quiet()) {
          const t = now / (this.species === 'dragon' ? 1400 : 1100);
          const orbit = 0.35 + (Math.sin(t) + 1) * 0.25;
          if (this.species === 'dragon') {
            this.node.classList.add('flying');
            tx = rect.left + rect.width / 2 + Math.cos(t * 0.85) * 64 - this.bounds.width / 2;
            ty = rect.top - 42 + Math.sin(t * 1.1) * 18;
          } else if (orbit > 0.72) {
            tx = rect.left + rect.width * 0.35;
            ty = rect.top - this.bounds.height * 0.5;
          } else {
            tx = rect.left + rect.width / 2 + Math.cos(t) * 48 - this.bounds.width / 2;
            ty = rect.top - 36 + Math.sin(t * 1.3) * 14;
          }
        } else if (this.state === 'following' && quiet()) {
          this.node.classList.remove('flying');
          tx = rect.left + rect.width * 0.35;
          ty = rect.top - this.bounds.height * 0.5;
        }
      }
      if (this.state === 'racing') { tx = this._raceX; ty = this.y; }
      if (this.state === 'exploring') { tx = this._exploreX; ty = this._exploreY; }
      const dist = Math.hypot(tx - this.x, ty - this.y);
      const ownerBusy = ownerRun || ownerWalk || moving || flyingAnim
        || this.state === 'racing' || this.state === 'exploring' || this.state === 'special' || this.state === 'flying';
      // Spring settled: sem write de posição — pausa rAF até o dono se mover.
      if (!ownerBusy && dist < SETTLE_EPS) {
        const wasMoving = this.node.classList.contains('moving');
        if (wasMoving) {
          this.node.classList.remove('moving');
          if (!this._interactionBusy && !this._reducedMotion) {
            this.node.classList.add('settling');
            this._later(() => this.node?.classList.remove('settling'), 380);
          }
        }
        this._lastX = this.x;
        this._raf = null;
        this._rafPaused = true;
        this._armSettleWake();
        return;
      }
      const speciesBoost = this.species === 'rabbit' ? 0.055
        : this.species === 'dog' ? 0.025
        : this.species === 'dino' ? -0.025
        : this.species === 'slime' ? -0.02
        : this.species === 'ghost' ? 0.02
        : 0;
      const baseK = this.state === 'racing' ? (this.species === 'dino' ? 0.13 : 0.22)
        : this.state === 'exploring' ? (this.species === 'ghost' ? 0.18 : 0.13)
        : this.state === 'flying' || this.node.classList.contains('flying') ? 0.11
        : ownerRun ? 0.18
        : ownerWalk ? 0.125
        : 0.09;
      // Follow spring: acelera longe, amortece perto (mais fluido).
      const k = Math.min(0.34, Math.max(0.045, baseK + speciesBoost + dist * 0.0022));
      this.x += (tx - this.x) * k;
      this.y += (ty - this.y) * k;
      // Fantasma atravessa bordas suavemente; demais respeitam a viewport.
      const pad = this.species === 'ghost' && (this.state === 'exploring' || this.node.classList.contains('phasing'))
        ? -this.bounds.width * 0.35
        : 4;
      const left = Math.max(pad, Math.min(window.innerWidth - this.bounds.width - pad, this.x));
      const top = Math.max(pad, Math.min(window.innerHeight - this.bounds.height - pad, this.y));
      this._writePos(left, top);
      this.node.classList.toggle('flipped', tx < this.x - 1);
      const wasMoving = this.node.classList.contains('moving');
      const nowMoving = Math.abs(this.x - this._lastX) > 0.4 || moving || flyingAnim;
      this.node.classList.toggle('moving', nowMoving);
      if (wasMoving && !nowMoving && !this._interactionBusy && !this._reducedMotion) {
        this.node.classList.add('settling');
        this._later(() => this.node?.classList.remove('settling'), 380);
      }
      this._lastX = this.x;
      this._raf = requestAnimationFrame(tick);
    };
    this._raf = requestAnimationFrame(tick);
  }

  _scheduleInteraction() {
    this._interactTimer = setInterval(() => {
      if (document.hidden) return;
      if (!this.owner.isVisible || this.owner.isQuiet()) return;
      if (this.owner.state === 'sleeping') {
        this.sleep();
        return;
      }
      if (this.state === 'sleeping') {
        // Gato dorme mais; fantasma de dia também.
        const napBias = this.species === 'cat' ? 0.55
          : (this.species === 'ghost' && !this._isNight()) ? 0.5
          : 0.2;
        if (Math.random() < napBias) return;
        this.wakeUp();
      }
      if (this.owner.state !== 'idle') return;
      const p = this.owner.S?.personality || {};
      const baseChance = this.owner.emotion === 'joyful' ? 0.78 : 0.48;
      const personalityMod = (p.playful ?? 5) >= 7 ? 0.18 : (p.lazy ?? 5) >= 7 ? -0.16 : 0;
      const chance = Math.min(0.92, Math.max(0.18, baseChance + personalityMod));
      if (Math.random() > chance) return;
      const pool = this._speciesPool();
      const pick = pool[Math.floor(Math.random() * pool.length)];
      this.interact(pick);
    }, CLAWD_TIMINGS.SUBPET_INTERACTION_MS);
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
        if (this.species === 'rabbit') this.node?.classList.add('double-hop');
        if (this.species === 'dog') this.node?.classList.add('wagging');
        this.owner.showSpeech('Vem brincar! 🎾', 2000);
        this.say(this.species === 'rabbit' ? 'Hop hop! 🐰' : 'Ual! ✨');
        this._burst(['🎾', '✨', '⭐'], 5);
        this._sfx(this.species === 'rabbit' ? 'hop' : 'play');
        this.owner.addXp(2);
        this._finishInteractionAfter(this.species === 'rabbit' ? 3200 : 2800);
        break;
      case 'cuddle':
        this._beginInteraction('cuddling', 'cuddling');
        if (this.species === 'dog') this.node?.classList.add('wagging');
        this.say(this.species === 'dog' ? 'Au! 🦴❤️' : '❤️');
        this._burst(['💕', '💖', '✨'], 6);
        this._sfx(this.species === 'dog' ? 'wag' : 'cuddle');
        this.owner.setStateFor('happy', 2000);
        this.owner.showSpeech('Que fofo! 💕', 2200);
        this.owner.spawnParticles();
        this.owner.addXp(2);
        this._finishInteractionAfter(1200);
        break;
      case 'stomp':
        this._beginInteraction('racing', 'heavy-stomp');
        this.say('Pisada pesada! 🦕');
        this._burst(['💨', '🪨', '⚡'], 5);
        this._sfx('stomp');
        this.owner.startRun?.(this.x < window.innerWidth / 2 ? window.innerWidth - 80 : 40);
        this.owner.addXp(2);
        this._finishInteractionAfter(2800);
        break;
      case 'vanish':
        this._beginInteraction('vanishing', 'vanishing');
        this.say('Buu~ 👻');
        this._burst(['👻', '✨', '💨'], 5);
        this._sfx('phase');
        this._finishInteractionAfter(2200);
        break;
      case 'nap':
        this._interactionBusy = true;
        this.sleep();
        this._sfx('sleep');
        this._sleepTimer = setTimeout(() => this.wakeUp('Já descansei! ☀️'), 8000);
        break;
      case 'race':
        this._burst(['💨', '⚡'], 4);
        this._sfx('play');
        this._startRace();
        break;
      case 'explore': {
        this._beginInteraction('exploring', 'exploring');
        this._exploreX = 20 + Math.random() * Math.max(20, window.innerWidth - this.bounds.width - 40);
        this._exploreY = 30 + Math.random() * Math.max(20, window.innerHeight - this.bounds.height - 60);
        this.say('Explorando! 🔎');
        this._burst(['🔎', '✨', '🗺️'], 4);
        this._sfx('explore');
        this.owner.showSpeech('Vai, pequeno explorador! 🗺️', 2200);
        this.owner.addXp(1);
        this._finishInteractionAfter(3200);
        break;
      }
      case 'spin':
        this._beginInteraction('spinning', 'spinning');
        this.say('Uhuuu! 🌀');
        this._burst(['✨', '⭐', '🌀'], 5);
        this._sfx('spin');
        this.owner.spawnParticles(['✨', '⭐']);
        this.owner.addXp(1);
        this._finishInteractionAfter(1300);
        break;
      case 'celebrate':
        this._beginInteraction('celebrating', 'celebrating');
        if (this.species === 'dog') this.node?.classList.add('wagging');
        if (this.species === 'dragon') {
          this.node?.classList.add('fire');
          this._burst(['🔥', '🎉', '✨'], 7);
          this._sfx('fire');
        } else {
          this._burst(['🎉', '✨', '⭐', '🎊'], 7);
          this._sfx('celebrate');
        }
        this.say(this.species === 'dog' ? 'Abanando! 🐶🎉' : 'Nós conseguimos! 🎉');
        // Não sobrescreve ações do dono (ex.: cheer → cheering); só sincroniza se ele estiver livre.
        if (!force && (this.owner.state === 'idle' || this.owner.state === 'walking')) {
          this.owner.setStateFor('celebrate', 1900);
        }
        this.owner.spawnParticles(['🎉', '✨', '⭐']);
        if (!force) this.owner.addXp(2);
        this._finishInteractionAfter(1900, () => this.node?.classList.remove('fire', 'wagging'));
        break;
      case 'balloon':
        this._beginInteraction('playing', 'playing');
        this.say('Balãooo! 🎈');
        this._burst(['🎈', '✨'], 4);
        this._sfx('play');
        this.node?.classList.add('watching-balloon');
        setTimeout(() => this.node?.classList.remove('watching-balloon'), 2200);
        this._finishInteractionAfter(2200);
        break;
      case 'hug':
        this._beginInteraction('cuddling', 'cuddling');
        this.say('🤗💕');
        this._burst(['🫶', '💖', '✨'], 5);
        this._sfx('cuddle');
        this.node?.classList.add('duo-hug');
        setTimeout(() => this.node?.classList.remove('duo-hug'), 1800);
        this.owner.setStateFor?.('hugging', 1800);
        this.owner.showSpeech?.('Abraço em duo! 🤗', 1800);
        this.owner.bumpStat('happiness', 4);
        this._finishInteractionAfter(1800);
        break;
      case 'startle':
        this._beginInteraction('playing', 'playing');
        this.say('Eek! 💥');
        this._burst(['💥', '🌀'], 4);
        this._sfx('stomp');
        this.node?.classList.add('startled');
        setTimeout(() => this.node?.classList.remove('startled'), 900);
        this._finishInteractionAfter(900);
        break;
      case 'eat':
        if (this.species === 'slime') {
          this._beginInteraction('splitting', 'split');
          this._paint(true);
          this._spawnClone();
          this.say('blub — se divide! 🫧');
          this._burst(['🫧', '💚', '🍖', '✨'], 7);
          this._sfx('split');
          this._finishInteractionAfter(2000);
          break;
        }
        this._beginInteraction('eating', 'eating');
        this.say('Nham!');
        this._burst(['🍖', '✨'], 3);
        this._sfx('eat');
        this._finishInteractionAfter(1800);
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
      dog: () => {
        this.node?.classList.add('wagging', 'celebrating');
        this.say('Au au! Abanando! 🦴');
        this._burst(['🦴', '✨', '❤️'], 6);
        this._sfx('wag');
        this.owner.showSpeech('Companheiro leal! 🐶', 2000);
        this._finishInteractionAfter(2400);
      },
      cat: () => {
        if (Math.random() < 0.55) {
          this.say('...😼 (te ignorando)');
          this._spark(['#7f8c8d', '#e8a0bf']);
          this._sfx('sleep');
          this._finishInteractionAfter(1600, () => this.interact('nap', { force: true }));
          return;
        }
        this.say('Miau~');
        this._sfx('cuddle');
        this._spark(['#7f8c8d', '#e8a0bf', '#ffffff']);
        this._finishInteractionAfter(2200);
      },
      bird: () => {
        this._perch = true;
        this.node.classList.add('perching', 'flying', 'singing');
        this.say('Piu piu! 🎶 voando!');
        this._burst(['🪶', '✨', '🎵', '🎶'], 6);
        this._sfx('special');
        this.owner.showSpeech('Companheiro no ombro! 🐦', 2000);
        this._finishInteractionAfter(2800);
      },
      rabbit: () => {
        this._beginInteraction('playing', 'double-hop');
        this.say('Salto duplo! 🐰');
        this._burst(['🐰', '✨', '💨'], 5);
        this._sfx('hop');
        this.owner.showSpeech('Rápido demais! 🐰', 1800);
        this._finishInteractionAfter(2600);
      },
      dino: () => {
        this._burst(['🦕', '💨', '🪨', '⚡'], 6);
        this._sfx('stomp');
        this._startRace('RAWR! Pisada! 🦕', 3400);
        this.node?.classList.add('heavy-stomp');
      },
      dragon: () => {
        this._beginInteraction('flying', 'flying');
        this.node.classList.add('fire');
        this._paint(true);
        this.say('Asas abertas! Fogo no desafio! 🔥🐉', 2400);
        this._burst(['🔥', '✨', '💨', '🟠'], 8);
        this._spark(['#e74c3c', '#f39c12', '#8e44ad', '#c39bd3'], 10);
        this._sfx('fire');
        this.owner.spawnParticles(['🔥', '✨', '🐉']);
        this.owner.showSpeech('Dragão no céu! 🐉', 2200);
        this._finishInteractionAfter(3200, () => this.node?.classList.remove('fire'));
      },
      ghost: () => {
        this._beginInteraction('vanishing', 'vanishing');
        this.node?.classList.add('phasing', 'exploring');
        this.say(this._isNight() ? 'Buu da noite! 👻' : 'Buu! 👻', 2000);
        this._burst(['👻', '✨', '💨'], 5);
        this._sfx('phase');
        this._exploreX = -12 + Math.random() * (window.innerWidth + 24);
        this._exploreY = 16 + Math.random() * Math.max(40, window.innerHeight - 80);
        this._setState('exploring');
        this._finishInteractionAfter(2400);
      },
      slime: () => {
        this._beginInteraction('splitting', 'split');
        this._paint(true);
        this._spawnClone();
        this.say('blub blub 🫧');
        this._burst(['🫧', '💚', '✨'], 6);
        this._sfx('split');
        this._finishInteractionAfter(1800);
      }
    };
    (map[this.species] || map.dog)();
  }

  fetchBall(ballRect) {
    this._beginInteraction('racing', 'racing');
    this._raceX = ballRect.left;
    this.say('Eu pego! 🎾');
    this._finishInteractionAfter(1800, () => this.say('Trouxe! 🐶'));
  }

  destroy() {
    this._pauseRaf();
    this._clearSettleWake();
    clearInterval(this._interactTimer);
    clearInterval(this._blinkTimer);
    clearTimeout(this._sayTimer);
    clearTimeout(this._sleepTimer);
    clearTimeout(this._wakeTimer);
    clearTimeout(this._clickTimer);
    this._actionTimers.forEach(clearTimeout);
    this._actionTimers.clear();
    this._interactionEndTimer = null;
    /* Libera slots FX reservados e ainda não spawnados */
    if (this._fxPending && this.owner?._releaseFx) {
      this.owner._releaseFx(this._fxPending);
      this._fxPending = 0;
    }
    this._removeClone();
    if (this.node) this.node.remove();
    this.node = null;
  }
}

/* =====================================================
   CLAW'D COMPANION
   ===================================================== */
class ClawdCompanion {
  constructor(initialState) {
    this.S = initialState;                 // estado completo (schema v4)
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
    this._activeParticles = 0;
    this._hoverStart = 0;
    this._yawned = false;
    this._lastTantrum = 0;
    this._keepy = null;
    this._juggleActive = false;   // sessão interativa de embaixadinhas
    this._juggleDrop = null;      // watchdog: bola cai se o jogador demorar
    this._juggleCombo = 1;
    this._juggleIdleTimer = null; // volta ao idle após parar de tocar
    this._challengeShown = 0;
    this._port = null;
    this._audioCtx = null;
    this._audioAllowed = false;
    this._audioUnlockBound = false;
    this._clickCount = 0;
    this._clickTimer = null;
    this._holdTimer = null;
    this._wakeStretchTimer = null;
    this._fishing = false;
    this._lakeEl = null;
    this._fishingLineEl = null;
    this._balloon = false;
    this._balloonTimer = null;
    this._keepyCount = 0;
    this._refreshRate = 60;
    this._refreshSamples = [];
    this._refreshMeasureRaf = null;
    this._motionRaf = null;
    this._glideRaf = null;
    this._dwellVisibleSince = Date.now();
    this._dwellHiddenAt = 0;
    this._dwellThresholdMs = 45000 + Math.floor(Math.random() * 45000); // 45–90s
    this._lastDwellEngage = 0;
    this._dwellBusy = false;
    this._duoBusy = false;
    this._reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this._glide = null;
    this._destroyed = false;
    this._contextInvalidated = false;
    this._abort = new AbortController();
    /* v3.3: Sistema de combo */
    this._comboCount = 0;
    this._comboTimer = null;
    this._comboWindowMs = 10000;
    this._lastActionTime = 0;
    this._speedrunCount = 0;
    this._speedrunTimer = null;
    /* v3.3: Tempo na aba */
    this._tabStartTime = Date.now();
    this._tabMilestonesFired = [];
    /* v3.3: Clima ambiente */
    this._ambientWeatherTimer = null;
    /* v3.4: Variações idle, scroll e tab visibility */
    this._idleVarTimer = null;
    this._idleVarLastTime = {};
    this._scrollReacting = false;
    this._scrollHandler = null;
    this._scrollIdleTimer = null;
    this._visibilityHandler = null;
    this._tabHiddenAt = null;
    this._saveInFlight = false;
    this._saveDirty = false;
    this._particleTimers = new Set();

    this.messages = {
      idle:     ["Oi! 👋", "Bora navegar! 🌐", "Me arraste! ✨", "Aqui pra ajudar 🐾", "Clique em mim! 💫", "O que faremos hoje? 🎯"],
      happy:    ["❤️ Obrigado!", "Uhuuu! 🎉", "Que bom! ✨", "Adoro carinho! 💕", "Yay! 🌟", "Melhor sensação! 🥰"],
      sleeping: ["ZzZz... 💤", "😴 Shh...", "Descansando... 💤"],
      excited:  ["Wow! 🤩", "Olha isso! 👀", "Nova página! 🚀", "Uau! ⚡", "Que incrível! ✨"],
      hungry:   ["Tô com fome... 🍖", "Me alimenta? 🥺", "Barriguinha roncando! 🍽️", "Fome! 😩"],
      sad:      ["Sinto sua falta... 😢", "Um carinho? 🥺", "Tô triste... 💧"],
      joyful:   ["Melhor dia! 🤩", "Amo navegar com você! 💖", "Que aventura! 🚀"],
      ecstatic: ["Mal cabendo de felicidade! 🥳", "Você é demais! ✨", "Festa! 🎊"],
      peppy:    ["Cheio de energia! ⚡", "Bora brincar! 🏃", "Tô no pique! 🔥"],
      grubby:   ["Preciso de um banho... 🫧", "Tchutchuca sujinha! 🧼", "Banho, por favor? 🛁"],
      curious:  ["Hmm... 🔎", "O que é isso? 👀", "Interessante... 📖"]
    };

    this._contextMap = {
      footballer: ['ge.globo', 'espn', 'lance', 'goal.com', 'sofascore', 'futbol', 'football', 'sport'],
      tutor:      ['youtube', 'twitter', 'x.com', 'instagram', 'facebook', 'tiktok', 'reddit'],
      engineer:   ['github', 'gitlab', 'stackoverflow', 'developer.', 'docs.', 'mdn', 'npmjs', 'pypi'],
      musician:   ['spotify', 'music.youtube', 'soundcloud', 'deezer', 'last.fm', 'letras.mus'],
      chef:       ['tudogostoso', 'receitas', 'panelinha', 'allrecipes', 'cybercook', 'recipe'],
      ninja:      ['hackthebox', 'tryhackme', 'ctftime', 'kali', 'exploit', 'security', 'hacker', 'cybersecurity'],
      fisher:     ['pesca', 'fishing', 'natureza', 'aquarius', 'peixe', 'lake', 'rio', 'mar', 'oceano', 'aqua'],
      /* v3.3: novas profissões */
      doctor:     ['medscape', 'healthline', 'bula.ms', 'saude', 'health', 'medical', 'hospital', 'farmacia', 'clinica'],
      artist:     ['behance', 'dribbble', 'deviantart', 'artstation', 'pinterest', 'canva', 'figma', 'design'],
      gamer:      ['steam', 'roblox', 'epic', 'twitch', 'itch.io', 'gamesradar', 'gamespot', 'ign', 'gamejolt'],
      streamer:   ['twitch', 'kick.com', 'youtube', 'streamlabs', 'obs', 'restream', 'trovo']
    };

    this._profMessages = {
      footballer: ["Goool! ⚽", "Vamos time! 🏆", "Assistindo futebol? ⚽", "Partida boa? 🏟️"],
      tutor:      ["Foca nos estudos! 📚", "Sem distrações! 🎯", "Hora de estudar! ✏️"],
      engineer:   ["Código limpo! 💻", "PR aprovado? 🚀", "Git push! 📦"],
      musician:   ["🎸 Que som!", "Aumenta o volume! 🎶", "Riff novo! 🎵"],
      chef:       ["Hmm, que cheirinho! 🍲", "Bora cozinhar? 🧑‍🍳", "Essa receita é boa! 😋"],
      ninja:      ["...🥷", "Você não me viu. 🌫️"],
      fisher:     ["Fisgou! 🎣", "Hoje vai dar peixe! 🐟", "Silêncio... os peixes! 🤫", "Linha na água! 🌊"],
      /* v3.3 */
      doctor:     ["Tome seus remédios! 💊", "A saúde em dia? 🩺", "Esse site é saudável! 🏥"],
      artist:     ["Que cores lindas! 🎨", "Arte boa! 🖌️", "Criatividade a mil! ✨"],
      gamer:      ["Boa sorte no game! 🎮", "Noob ou pro? 🏆", "GG EZ! 🎯"],
      streamer:   ["Live on! 📡", "Saudações ao chat! 👋", "Clip isso! 🎬"]
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
    this._bindAudioUnlock();
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
    this._setupScrollReaction();
    this._setupVisibilityReaction();
    setTimeout(() => {
      if (!this._destroyed && this.isVisible && !this.isQuiet()) this.showSpeech(this.getRandom('idle'));
    }, 1400);
    /* Summon elaborado — queda com bounce (v3.4) */
    if (this.node && !this._reducedMotion) {
      this.node.classList.add('clawd-summon-drop');
      setTimeout(() => this.node?.classList.remove('clawd-summon-drop'), 750);
    }
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
      if (document.hidden) return;
      if (!this._hasExtensionContext()) this._handleExtensionContextInvalidated();
    }, 2500));
  }

  _canSpawnFx(count = 1) {
    if (this._destroyed || document.hidden || this.S?.settings?.performanceMode || this.S?.settings?.noParticles) return false;
    return (this._activeParticles || 0) + count <= CLAWD_TIMINGS.PARTICLE_MAX;
  }

  /* Reserva slots do teto antes de setTimeouts de spawn (evita overshoot) */
  _reserveFx(count = 1) {
    if (!this._canSpawnFx(count)) return false;
    this._activeParticles = (this._activeParticles || 0) + count;
    return true;
  }

  _releaseFx(count = 1) {
    this._activeParticles = Math.max(0, (this._activeParticles || 0) - count);
  }

  _trackParticle(el, ttl, reserved = false) {
    if (!reserved) {
      if (!this._reserveFx(1)) {
        try { el.remove(); } catch (_) {}
        return;
      }
    }
    if (!this._particleTimers) this._particleTimers = new Set();
    const timer = setTimeout(() => {
      this._particleTimers.delete(timer);
      try { el.remove(); } catch (_) {}
      this._releaseFx(1);
    }, ttl);
    this._particleTimers.add(timer);
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
      <div id="aic-sr-status" role="status" aria-live="polite" aria-atomic="true" class="clawd-sr-only"></div>
      <div class="pet-body" id="aic-pet-body">
        <div class="sprite-stack" id="aic-stack">
          <div class="pixel-sprite" id="aic-sprite"></div>
          <div class="pixel-legs" id="aic-pixel-legs" aria-hidden="true"></div>
          <div class="pixel-fx" id="aic-pixel-fx" aria-hidden="true"></div>
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
          <div class="accessory acc-body" id="aic-acc-body"></div>
          <div class="laptop" id="aic-laptop"></div>
          <div class="fishing-rod-layer" id="aic-fishing-rod"></div>
          <div class="balloon-layer" id="aic-balloon" title="Clique para estourar o balão!"></div>
          <div class="profession-prop prop-chef-pan" aria-hidden="true"></div>
          <div class="profession-prop prop-chef-steam" aria-hidden="true"></div>
          <div class="profession-prop prop-music-note" aria-hidden="true"></div>
          <div class="profession-prop prop-ninja-smoke" aria-hidden="true"></div>
          <div class="profession-prop prop-tutor-glint" aria-hidden="true"></div>
          <div class="profession-prop prop-doctor-cross" aria-hidden="true"></div>
          <div class="profession-prop prop-artist-brush" aria-hidden="true"></div>
          <div class="profession-prop prop-gamer-ctrl" aria-hidden="true"></div>
          <div class="profession-prop prop-streamer-live" aria-hidden="true"></div>
          <div class="profession-prop prop-engineer-code" aria-hidden="true"></div>
          <div class="profession-prop prop-footballer-boot" aria-hidden="true"></div>
          <div class="profession-prop prop-fisher-bobber" aria-hidden="true"></div>
        </div>
        <div class="name-tag" id="aic-name-tag">
          <span class="name-title" id="aic-name-title"></span>
          <span class="name-label" id="aic-name-label"></span>
        </div>
      </div>
      <div class="pet-ball" id="aic-ball" title="Toque para embaixadinhas • duplo-clique para chutar a gol"></div>
      <div class="ground-shadow" id="aic-shadow"></div>
    `;
    document.body.appendChild(this.node);
    this.bodyNode    = this.node.querySelector('#aic-pet-body');
    this.nameNode    = this.node.querySelector('#aic-name-tag');
    this.titleNode   = this.node.querySelector('#aic-name-title');
    this.labelNode   = this.node.querySelector('#aic-name-label');
    this.speechNode  = this.node.querySelector('#aic-speech');
    this.spriteNode  = this.node.querySelector('#aic-sprite');
    this.legsNode    = this.node.querySelector('#aic-pixel-legs');
    this.shadowNode  = this.node.querySelector('#aic-shadow');
    this.ballNode    = this.node.querySelector('#aic-ball');
    this.emotionNode = this.node.querySelector('#aic-emotion');
    this.srStatusNode = this.node.querySelector('#aic-sr-status');
    this.balloonNode = this.node.querySelector('#aic-balloon');
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

  /* Etiqueta: título (nível) + nome — nunca usar textContent no .name-tag (apaga os spans) */
  _syncNameTag() {
    if (!this.nameNode) return;
    if (!this.titleNode || !this.nameNode.contains(this.titleNode)
        || !this.labelNode || !this.nameNode.contains(this.labelNode)) {
      this.nameNode.replaceChildren();
      this.titleNode = document.createElement('span');
      this.titleNode.className = 'name-title';
      this.titleNode.id = 'aic-name-title';
      this.labelNode = document.createElement('span');
      this.labelNode.className = 'name-label';
      this.labelNode.id = 'aic-name-label';
      this.nameNode.append(this.titleNode, this.labelNode);
    }
    const level = clawdLevelFromXp(this.S.xp || 0).level;
    const title = clawdTitleForLevel(level) || 'Novato';
    const name = (this.S.name && String(this.S.name).trim()) || "Claw'd";
    this.titleNode.textContent = title;
    this.labelNode.textContent = name;
    this.nameNode.setAttribute('aria-label', `${name}, ${title}`);
    this.node.setAttribute('aria-label', `${name}, pet virtual interativo`);
  }

  applyAll() {
    const S = this.S;
    const animationSpeed = Math.max(0.5, parseFloat(S.animSpeed) || 1);
    this._syncNameTag();
    if (clawdIsHexColor(S.color)) {
      this.node.style.setProperty('--agent-color', S.color);
      this.node.style.setProperty('--clawd-glow', S.color + '70');
      this.node.style.setProperty('--clawd-accent', S.color);
    }
    if (clawdIsHexColor(S.eyeColor)) this.node.style.setProperty('--agent-eye-color', S.eyeColor || '#08080b');
    this.node.style.setProperty('--agent-scale', parseFloat(S.scale));
    if (clawdIsHexColor(S.jerseyColor)) this.node.style.setProperty('--jersey-color', S.jerseyColor);
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
    this.node.classList.toggle('has-cushion', (S.game?.inventory || []).includes('cushion'));
    this.node.classList.toggle('rainbow-aura', clawdLevelFromXp(S.xp || 0).level >= 30);
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
    // Debounce + coalescing: rajadas (XP/stats/ações) viram um flush.
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => this._flushSave(), CLAWD_TIMINGS.STORAGE_DEBOUNCE_MS);
  }

  _flushSave() {
    if (this._destroyed || !this._hasExtensionContext()) {
      this._handleExtensionContextInvalidated();
      return;
    }
    // Se um get→set ainda está no ar, marca dirty e re-agenda ao terminar.
    if (this._saveInFlight) {
      this._saveDirty = true;
      return;
    }
    this._saveInFlight = true;
    this._saveDirty = false;
    // read-modify-write: preserva mudanças feitas pelo popup em paralelo
    const onState = this._guardChromeCallback((res) => {
      if (this._destroyed) {
        this._saveInFlight = false;
        return;
      }
      const stored = clawdMigrateState(res.clawdState);
      // popup é dono destes campos — mantém a versão do storage
      this.S.favorites = stored.favorites;
      this.S.settings = clawdPlainMerge(this.S.settings, stored.settings);
      this.S.subpets = stored.subpets;
      this.S.game.inventory = stored.game.inventory;
      // Nome: o popup digita e persiste; o motor não deve sobrescrever com valor antigo em memória
      if (Object.prototype.hasOwnProperty.call(stored, 'name')) this.S.name = stored.name;
      if (Array.isArray(stored.nicknameHistory)) this.S.nicknameHistory = stored.nicknameHistory;
      this._syncNameTag();
      const next = clawdMigrateState(this.S);
      let unchanged = false;
      try {
        unchanged = JSON.stringify(stored) === JSON.stringify(next);
      } catch (_) {}
      const finish = () => {
        this._saveInFlight = false;
        if (this._saveDirty && !this._destroyed) this.save();
      };
      // Evita write + onChanged cross-tab quando nada mudou após o merge.
      if (unchanged) {
        finish();
        return;
      }
      const queued = this._safeChrome(() => {
        chrome.storage.local.set({ clawdState: next }, this._guardChromeCallback(finish));
        return true;
      }, false);
      if (!queued) finish();
    });
    this._safeChrome(() => chrome.storage.local.get(['clawdState'], onState));
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
        'accessoryFace', 'accessoryBody', 'profession', 'particleColor',
        'personality', 'customSpeech'
      ];
      visualKeys.forEach(key => { this.S[key] = fresh[key]; });
      const animationSpeed = Math.max(0.5, parseFloat(fresh.animSpeed) || 1);
      this.S.xp = fresh.xp;
      this._syncNameTag();
      if (clawdIsHexColor(fresh.color)) {
        this.node.style.setProperty('--agent-color', fresh.color);
        this.node.style.setProperty('--clawd-glow', fresh.color + '70');
      }
      if (clawdIsHexColor(fresh.eyeColor)) this.node.style.setProperty('--agent-eye-color', fresh.eyeColor);
      this.node.style.setProperty('--agent-scale', parseFloat(fresh.scale) || 1.5);
      if (clawdIsHexColor(fresh.jerseyColor)) this.node.style.setProperty('--jersey-color', fresh.jerseyColor);
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
      this.node.classList.toggle('has-cushion', (fresh.game?.inventory || []).includes('cushion'));
      this.node.classList.toggle('rainbow-aura', clawdLevelFromXp(fresh.xp || 0).level >= 30);
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
        this._syncNameTag();
        if (value && !this.S.nicknameHistory.includes(value)) {
          this.S.nicknameHistory.push(value);
          if (this.S.nicknameHistory.length > 12) this.S.nicknameHistory.shift();
        }
        break;
      case 'color':
        if (clawdIsHexColor(value)) {
          this.node.style.setProperty('--agent-color', value);
          this.node.style.setProperty('--clawd-glow', value + '70');
        }
        break;
      case 'eyeColor': if (clawdIsHexColor(value)) this.node.style.setProperty('--agent-eye-color', value); break;
      case 'model': this.node.setAttribute('data-model', value); break;
      case 'faceStyle': this.node.setAttribute('data-face-style', value); break;
      case 'scale':
        this.node.style.setProperty('--agent-scale', parseFloat(value));
        if (this.subpet) this.subpet.node.style.setProperty('--subpet-scale', this.subpet._computeScale());
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
      case 'jerseyColor': if (clawdIsHexColor(value)) this.node.style.setProperty('--jersey-color', value); break;
      case 'ballSkin': this.node.setAttribute('data-ball-skin', value); break;
      case 'particleColor':
        this.S.particleColor = (value === 'default' || value === '' || value == null) ? null : value;
        break;
      case 'accessoryHead':
        this._syncAccessoryVisuals();
        this._trackAccessory(value);
        this._pulseAccessoryEquipFx(value, 'head');
        this.registerDaily('accessories');
        break;
      case 'accessoryFace':
        this._syncAccessoryVisuals();
        this._trackAccessory(value);
        this._pulseAccessoryEquipFx(value, 'face');
        this.registerDaily('accessories');
        break;
      case 'accessoryBody':
        this._syncAccessoryVisuals();
        this._trackAccessory(value);
        this._pulseAccessoryEquipFx(value, 'body');
        this.registerDaily('accessories');
        break;
      case 'personality':
        if (value && typeof value === 'object') {
          this.S.personality = { ...(this.S.personality || {}), ...value };
        }
        break;
      case 'profession':
        this._applyProfessionVisuals();
        this._detectPageContext();
        /* v3.3: track profissões usadas (inclui idle/Livre — polyglot precisa das 12) */
        if (value && Object.prototype.hasOwnProperty.call(CLAWD_PROFESSIONS, value)) {
          const used = this.S.game.counters.professionsUsed || [];
          if (!used.includes(value)) {
            used.push(value);
            this.S.game.counters.professionsUsed = used;
            this.checkAchievements();
          }
          if (value !== 'idle') this.registerDaily('profession');
        }
        break;
    }
    // Nome: o popup já persiste; salvar aqui causa RMW race e reverte a etiqueta
    if (key === 'name') return;
    this.save();
    if (this._studioEl?.isConnected && ['color', 'faceStyle', 'skin', 'model'].includes(key)) {
      this._refreshStudio();
    }
  }

  registerDaily(type, amount = 1) {
    const quest = clawdRegisterDailyProgress(this.S, type, amount);
    if (quest.progress >= quest.target && !quest.claimed && !this._dailyCelebrated) {
      this._dailyCelebrated = true;
      this.showSpeech('Missão diária pronta! Resgate sua recompensa! 🎁', 3200);
      this.spawnParticles(['🎁', '⭐', '✨']);
    }
    /* v3.3: progresso semanal simultâneo */
    clawdRegisterWeeklyProgress(this.S, type, amount);
    const weekly = clawdEnsureWeeklyChallenge(this.S);
    if (weekly.progress >= weekly.target && !weekly.claimed && !this._weeklyCelebrated) {
      this._weeklyCelebrated = true;
      setTimeout(() => {
        if (!this._destroyed) {
          this.showSpeech('Desafio semanal completo! 🏆 Resgate no popup!', 4000);
          this.spawnParticles(['🏆', '🎊', '⭐', '✨']);
          this._weeklyCelebrated = false;
        }
      }, 2000);
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
    this.spawnParticles(['🪙', '💰', '✨']);
    this.toast('', { rarity: 'rare', icon: '🎁', title: 'Recompensa diária', desc: `+${quest.rewardXp} XP e +${quest.rewardCoins} PixelCoins` });
    this._dailyCelebrated = false;
    this.save();
    return true;
  }

  claimWeeklyChallenge() {
    const challenge = clawdEnsureWeeklyChallenge(this.S);
    if (challenge.claimed || challenge.progress < challenge.target) return false;
    challenge.claimed = true;
    const rewardXp = challenge.rewardXp || 80;
    const rewardCoins = challenge.rewardCoins || 20;
    this.S.game.coins = (this.S.game.coins || 0) + rewardCoins;
    this.addXp(rewardXp);
    this.showSpeech(`Desafio semanal concluído! +${rewardCoins} 🪙`, 4000);
    this.spawnParticles(['🏆', '🎊', '⭐', '🪙', '✨']);
    this.toast('', { rarity: 'epic', icon: challenge.badge || '🏆', title: `${challenge.label}!`, desc: `+${rewardXp} XP e +${rewardCoins} PixelCoins` });
    this.save();
    return true;
  }

  /* ---- Variações de Idle (v3.4) ---- */
  _scheduleIdleVariation() {
    if (this._destroyed) return;
    const playful = (this.S.personality?.playful ?? 5);
    const baseInterval = Math.max(8000, 22000 - playful * 1000);
    const jitter = Math.random() * 6000;
    if (this._idleVarTimer) clearTimeout(this._idleVarTimer);
    this._idleVarTimer = setTimeout(() => this._doIdleVariation(), baseInterval + jitter);
  }

  _doIdleVariation() {
    try {
      if (this._destroyed || this.state !== 'idle' || !this.node || this._reducedMotion) return;
      if (this.S?.settings?.noIdleVariations || this.S?.settings?.performanceMode) return;
      if (!Array.isArray(CLAWD_IDLE_VARIATIONS) || !CLAWD_IDLE_VARIATIONS.length) return;
      const now = Date.now();
      const playful = (this.S.personality?.playful ?? 5);
      const available = CLAWD_IDLE_VARIATIONS.filter(v => {
        const last = this._idleVarLastTime?.[v.id] || 0;
        return (now - last) >= v.cooldownMs;
      });
      if (!available.length) return;
      /* playful alto → prefere variações mais curtas/energéticas */
      let pool = available;
      if (playful >= 7) {
        const energetic = available.filter(v => (v.durationMs || 2000) <= 2200);
        if (energetic.length) pool = energetic.concat(available);
      }
      const pick = pool[Math.floor(Math.random() * pool.length)];
      if (!this._idleVarLastTime) this._idleVarLastTime = {};
      this._idleVarLastTime[pick.id] = now;
      const cls = pick.keyframe.replace('@keyframes ', '');
      this.node.classList.add(cls);
      clearTimeout(this._idleVarClearTimer);
      this._idleVarClearTimer = setTimeout(() => this.node?.classList.remove(cls), pick.durationMs + 200);
    } finally {
      this._scheduleIdleVariation();
    }
  }

  /* ---- Reação ao Scroll (v3.4) — único caminho: velocidade real ---- */
  _setupScrollReaction() {
    let lastScrollY = window.scrollY;
    let lastScrollTime = Date.now();
    this._scrollReacting = false;
    this._scrollHandler = () => {
      if (this._destroyed) return;
      this.lastActivity = Date.now();
      if (this.state === 'sleeping') {
        this.wakeUp();
        return;
      }
      const now = Date.now();
      const dy = Math.abs(window.scrollY - lastScrollY);
      const dt = Math.max(now - lastScrollTime, 1);
      const speed = dy / dt * 1000;
      lastScrollY = window.scrollY;
      lastScrollTime = now;
      if (speed > 1200 && !this._scrollReacting) {
        this._scrollReacting = true;
        if (this.state === 'idle' || this.state === 'walking') {
          this.setState('excited');
          const curious = this.S.personality?.curious ?? 7;
          if (curious >= 5 && this._canSpawnFx(2)) {
            this.spawnParticles(['⚡', '💨'], { count: 2 });
          }
          let dashed = false;
          if (speed > 3000 && (this.S.personality?.playful ?? 5) >= 4) {
            setTimeout(() => {
              if (this._destroyed || this.state === 'idle' || this.isAutoWalking || !this.node) return;
              const rect = this.node.getBoundingClientRect();
              const dir = Math.random() < 0.5 ? -1 : 1;
              const span = 160 + Math.random() * 140;
              const target = Math.max(10, Math.min(window.innerWidth - 90, rect.left + dir * span));
              this.startRun(target);
            }, 200);
            dashed = true;
          }
          if (!dashed) {
            setTimeout(() => { if (!this._destroyed) this.setState('idle'); }, 900);
          }
        }
        setTimeout(() => { this._scrollReacting = false; }, 2000);
      }
    };
    window.addEventListener('scroll', this._scrollHandler, { passive: true });
  }

  /* Visibilidade unificada em bindEvents (AbortController) — evita handler duplicado */
  _setupVisibilityReaction() {
    /* no-op: saudação por away-time vive em bindEvents.visibilitychange */
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
    this.node.dataset.accBody = effective.body;
    this.node.dataset.userAccHead = effective.userHead;
    this.node.dataset.userAccFace = effective.userFace;
    this.node.dataset.userAccBody = effective.userBody;
    this.node.dataset.accessoryHeadSource = effective.headSource;
    this.node.dataset.accessoryFaceSource = effective.faceSource;
    this.node.dataset.accessoryBodySource = effective.bodySource || 'personal';
    /* Asas: habilita animação de flutuação quando ativas */
    this.node.classList.toggle('has-wings', effective.body === 'wings');
    this.node.classList.toggle('has-cape', effective.body === 'cape');
    this.node.classList.toggle('has-armor', effective.body === 'armor');
    this.node.classList.toggle('has-ribbon', effective.body === 'ribbon');
    this.node.classList.toggle('has-scarf-body', effective.body === 'scarf_body');
    this.node.classList.toggle('has-propeller', effective.head === 'propeller');
    this.node.classList.toggle('profession-headwear', !!effective.autoHead);
    this.node.classList.toggle('profession-facewear', !!effective.autoFace);
    return effective;
  }

  /* Feedback ao vestir: pop visual sempre; som só fora do quiet */
  _pulseAccessoryEquipFx(id, slot) {
    if (this._destroyed || !this.node || id === 'none') return;
    this.node.classList.remove('accessory-equip-pop');
    void this.node.offsetWidth;
    this.node.classList.add('accessory-equip-pop');
    clearTimeout(this._accEquipTimer);
    this._accEquipTimer = setTimeout(() => this.node?.classList.remove('accessory-equip-pop'), 420);
    if (!this.isQuiet()) {
      const tones = {
        head: [[720, 0.04], [880, 0.06]],
        face: [[660, 0.04], [820, 0.05]],
        body: [[520, 0.05], [700, 0.06], [880, 0.05]]
      };
      this.chime(tones[slot] || tones.face, 'actions');
    }
    if (this.S.settings.performanceMode || this.S.settings.noParticles) return;
    const sparkMap = {
      wings:      ['#b8d8e8', '#ffffff', '#a8c8dc'],
      cape:       ['#e74c3c', '#c0392b', '#f5f5f5'],
      armor:      ['#95a5a6', '#b2bec3', '#636e72'],
      propeller:  ['#f1c40f', '#3498db', '#e74c3c'],
      ribbon:     ['#ff6b6b', '#e74c3c', '#ffffff'],
      scarf_body: ['#e74c3c', '#c0392b', '#ffffff'],
      crown:      ['#f1c40f', '#ffd700', '#ffffff'],
      halo:       ['#ffeaa7', '#f1c40f', '#ffffff'],
      star_clip:  ['#fdcb6e', '#e17055', '#ffffff'],
      party_hat:  ['#fd79a8', '#74b9ff', '#55efc4'],
      witch_hat:  ['#6c5ce7', '#a29bfe', '#fd79a8'],
      bunny_ears: ['#fd79a8', '#ffffff', '#e84393'],
      medal:      ['#f1c40f', '#e17055', '#ffffff'],
      glasses:    ['#74b9ff', '#0984e3', '#ffffff'],
      headphones: ['#636e72', '#b2bec3', '#74b9ff'],
      scarf:      ['#e74c3c', '#c0392b', '#ffffff'],
      bow:        ['#fd79a8', '#e84393', '#ffffff'],
    };
    this.spawnPixelSparks(sparkMap[id] || ['#f1c40f', '#ffffff', '#fda7df'], { count: 5 });
  }

  /* Detalhe contínuo: hélice/asas/capa/armadura — orçamento baixo de partículas */
  _tickAccessoryAmbientFx() {
    if (this._destroyed || document.hidden || this._reducedMotion || this.S.settings.performanceMode || this.S.settings.noParticles) return;
    if (this.S.settings.noAmbientSparks) return;
    if (!this.isVisible || this.state === 'sleeping') return;
    const head = this.node?.dataset?.accHead;
    const body = this.node?.dataset?.accBody;
    const moving = this.state === 'walking' || this.state === 'running' || this.isAutoWalking;
    if (head === 'propeller' && moving && Math.random() < 0.18) {
      this.spawnPixelSparks(['#f1c40f', '#55a9dd', '#ef6258'], { count: 2 });
    }
    if (body === 'wings' && this.state === 'idle' && Math.random() < 0.1) {
      this.spawnPixelSparks(['#b8d8e8', '#ffffff', '#dfefff'], { count: 2 });
    }
    if (body === 'cape' && moving && Math.random() < 0.1) {
      this.spawnPixelSparks(['#e74c3c', '#c0392b', '#f5f5f5'], { count: 2 });
    }
    if (body === 'armor' && this.state === 'idle' && Math.random() < 0.06) {
      this.spawnPixelSparks(['#b2bec3', '#95a5a6', '#ffffff'], { count: 1 });
    }
    if (body === 'ribbon' && this.state === 'idle' && Math.random() < 0.08) {
      this.spawnPixelSparks(['#ff6b6b', '#e74c3c', '#ffffff'], { count: 1 });
    }
    if (body === 'scarf_body' && moving && Math.random() < 0.08) {
      this.spawnPixelSparks(['#e74c3c', '#c0392b', '#ffffff'], { count: 1 });
    }
  }

  _applyProfessionVisuals() {
    const effective = this._syncAccessoryVisuals();
    this.node.dataset.profession = effective.profession;
    if (effective.autoHead) this._trackAccessory(effective.autoHead);
    if (effective.autoFace) this._trackAccessory(effective.autoFace);
    this.node.classList.toggle('has-ball', effective.profession === 'footballer');
    this.node.classList.toggle('has-jersey', effective.profession === 'footballer');
    this.node.classList.remove('cooking', 'jamming', 'stealthing', 'thinking', 'healing', 'painting', 'gaming', 'streaming');
    if (effective.profession !== 'footballer') this.stopKeepyUppy();
    if (effective.profession !== 'fisher') this.stopFishing();
    if (effective.profession !== 'idle') {
      this.node.classList.add('profession-equip');
      clearTimeout(this._equipFxTimer);
      this._equipFxTimer = setTimeout(() => this.node?.classList.remove('profession-equip'), 480);
    }
  }

  _pulseProfessionFx(className, duration = 1800) {
    if (!this.node) return;
    this.node.classList.add(className);
    clearTimeout(this._profFxTimer);
    this._profFxTimer = setTimeout(() => this.node?.classList.remove(className), duration);
  }

  /* ---------- POSIÇÃO / ESTADOS ---------- */
  updatePosition(x, y) {
    const pad = 10;
    const maxX = window.innerWidth - 80 - pad;
    const maxY = window.innerHeight - 130 - pad;
    x = Math.max(pad, Math.min(x, maxX));
    y = Math.max(pad, Math.min(y, maxY));
    const eps = 0.35;
    if (this._posX != null && this._posY != null
        && Math.abs(x - this._posX) < eps && Math.abs(y - this._posY) < eps) {
      return;
    }
    this._posX = x;
    this._posY = y;
    this.node.style.left = `${x}px`;
    this.node.style.top = `${y}px`;
    if (!this._posSidesCleared) {
      this.node.style.right = 'auto';
      this.node.style.bottom = 'auto';
      this._posSidesCleared = true;
    }
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
    const speed = Math.hypot(velocityX, velocityY);
    if (speed < 0.35) {
      if (this.state === 'walking') this.setState('idle');
      return false;
    }
    this.cancelMovement();
    const hasWings = this.node?.dataset?.accBody === 'wings' || this.node?.classList?.contains('has-wings');
    const friction = hasWings ? 0.965 : 0.93;
    const bounce = hasWings ? -0.72 : -0.62;
    const dizzyAt = hasWings ? 18 : 14;
    const rect = this.node.getBoundingClientRect();
    this._glide = { x: rect.left, y: rect.top, vx: velocityX, vy: velocityY, last: performance.now(), wings: hasWings };
    this.isAutoWalking = true;
    if (speed > dizzyAt) {
      this.setStateFor('dizzy', 1400);
      this.showSpeech(hasWings ? 'Planeiooo! 🪶' : 'Wheee—tontinho! 💫', 1400);
      this.beep(420, 0.06, 'triangle', 'actions');
      setTimeout(() => this.beep(320, 0.08, 'triangle', 'actions'), 90);
      if (hasWings) this.spawnPixelSparks(['#b8d8e8', '#ffffff', '#dfefff'], { count: 4 });
      if (this.subpet && Math.random() < 0.6) this.subpet.interact('startle', { force: true });
    } else {
      this.setState('walking');
      if (hasWings && speed > 6) this.beep(880, 0.04, 'triangle', 'ambient');
    }
    const tick = (now) => {
      if (!this._glide) return;
      if (document.hidden) {
        this.cancelGlide();
        return;
      }
      const g = this._glide;
      const dt = Math.min(32, Math.max(1, now - g.last)) / 16.67;
      g.last = now;
      g.x += g.vx * dt;
      g.y += g.vy * dt;
      const maxX = Math.max(10, window.innerWidth - 90);
      const maxY = Math.max(10, window.innerHeight - 140);
      if (g.x <= 10 || g.x >= maxX) { g.x = Math.max(10, Math.min(maxX, g.x)); g.vx *= bounce; }
      if (g.y <= 10 || g.y >= maxY) { g.y = Math.max(10, Math.min(maxY, g.y)); g.vy *= bounce; }
      g.vx *= Math.pow(friction, dt);
      g.vy *= Math.pow(friction, dt);
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
    clearTimeout(this._stateTimer);
    this._stateTimer = null;
    if (newState !== 'idle' && this._wakeStretchTimer) {
      clearTimeout(this._wakeStretchTimer);
      this._wakeStretchTimer = null;
    }
    if (this.state === 'sleeping' && newState !== 'sleeping') this._yawned = false;
    this.node.classList.remove(this.state);
    this.state = newState;
    this.node.dataset.state = newState;
    if (newState !== 'idle') this.node.classList.add(newState);
    this._syncMovingHint();
    const stateEmoji = {
      happy: '🥰', excited: '🤩', sleeping: '😴', waving: '👋', eating: '😋',
      celebrate: '🎉', yawning: '🥱', shy: '🙈', tantrum: '😤', bathing: '🫧',
      fishing: '🎣', reeling: '🐟', jumping: '✨', roaring: '🦁', highfive: '✋',
      spinning: '🌀', bouncing: '⬆️', winking: '😉', cheering: '🎉', sneaking: '🥷',
      clapping: '👏', peeking: '👀', rolling: '🎱', 'holding-balloon': '🎈', hugging: '🤗',
      curious: '🔎', dizzy: '💫'
    }[newState];
    if (stateEmoji) this.showEmotionEmoji(stateEmoji);
    if (newState === 'walking' || newState === 'running') {
      this._spawnWalkDust(newState === 'running' ? 5 : 3);
    }
    if (newState === 'sleeping') {
      this.S.game.counters.sleeps = (this.S.game.counters.sleeps || 0) + 1;
      this.checkAchievements();
      this.save();
      // Micro: acomoda o corpo ao deitar (respiração de sono assume depois).
      this._pulseAnimClass('sleep-settle', 480);
    }
    if (this.subpet) this.subpet.onOwnerState(newState);
  }

  setStateFor(state, ms) {
    this.setState(state);
    clearTimeout(this._stateTimer);
    this._stateTimer = setTimeout(() => {
      if (this.state === state) this.setState('idle');
    }, ms);
  }

  _queuePetClick() {
    // 5 cliques rápidos em 2s → birra
    const now = Date.now();
    if (now - (this._rapidClickAt || 0) > 2000) this._rapidClickCount = 0;
    this._rapidClickAt = now;
    this._rapidClickCount = (this._rapidClickCount || 0) + 1;
    if (this._rapidClickCount >= 5) {
      this._rapidClickCount = 0;
      clearTimeout(this._clickTimer);
      this._clickTimer = null;
      this._clickCount = 0;
      this.setStateFor('tantrum', 2500);
      this.showSpeech('Para! 😤', 2000);
      this.spawnParticles(['💢', '😤', '⚡'], 4);
      this.beep(160, 0.1, 'sawtooth', 'actions');
      setTimeout(() => this.beep(120, 0.12, 'triangle', 'actions'), 90);
      return;
    }

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

    /* Atalhos de teclado globais (Alt+F/H/P/Z) — v3.4 */
    if (typeof CLAWD_KEYBOARD_SHORTCUTS === 'object' && CLAWD_KEYBOARD_SHORTCUTS) {
      document.addEventListener('keydown', (e) => {
        if (this._destroyed || !e.altKey) return;
        const key = `Alt+${e.key.toUpperCase()}`;
        const actionId = CLAWD_KEYBOARD_SHORTCUTS[key];
        if (!actionId) return;
        e.preventDefault();
        this._handleAction(actionId);
        this.showSpeech(`${key} ✓`, 1200);
      }, { signal });
    }
    this.ballNode.addEventListener('mousedown', (e) => e.stopPropagation(), { signal });
    // Cada clique é um toque de embaixadinha imediato (resposta sem atraso).
    // Duplo-clique finaliza a sequência com um chute a gol (bônus de combo).
    this.ballNode.addEventListener('click', (e) => {
      e.stopPropagation();
      clearTimeout(this._ballClickTimer);
      this._ballClickTimer = setTimeout(() => {
        this._ballClickTimer = null;
        this.juggleTouch();
      }, 220);
    }, { signal });
    this.ballNode.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      clearTimeout(this._ballClickTimer);
      this._ballClickTimer = null;
      this.kickBall();
    }, { signal });
    if (this.balloonNode) {
      this.balloonNode.addEventListener('mousedown', (e) => e.stopPropagation(), { signal });
      this.balloonNode.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this._balloon) this.popBalloon();
      }, { signal });
    }

    this.node.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      if (e.target.closest('.challenge-opt')) return;
      this.cancelMovement();
      this.isDragging = true;
      this.node.classList.add('pressing');
      this.node.style.transform = '';
      this._lookRx = 0;
      this._lookRy = 0;
      this._lookWriteRx = null;
      this._lookWriteRy = null;
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
        if (speed > 18 && !this.S.settings.performanceMode && !this._reducedMotion && this._canSpawnFx(1)) {
          const rect = this.node.getBoundingClientRect();
          const dust = document.createElement('div');
          dust.className = 'aic-dust';
          dust.style.left = `${rect.left + 20}px`;
          dust.style.top  = `${rect.top + 60}px`;
          document.body.appendChild(dust);
          this._trackParticle(dust, 600);
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
        this.node.classList.add('dragging');
        this.node.classList.remove('pressing');
        this._syncMovingHint();
        this.updatePosition(e.clientX - this.offsetX, e.clientY - this.offsetY);
        this.lastActivity = Date.now();
      } else {
        this.lookAtCursor(e.clientX, e.clientY);
        this._trackHoverShy(e);

        // Petting: acumula movimento sobre o pet, com cooldown real (não a cada ~0.5s)
        const rect = this.node.getBoundingClientRect();
        if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
            petCount++;
            if (petCount > 30) {
                petCount = 0;
                const nowPet = Date.now();
                if (this.state === 'idle' && nowPet - (this._lastHoverPetAt || 0) > 2800) {
                    this._lastHoverPetAt = nowPet;
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
      this.node.classList.remove('pressing', 'dragging');
      this._syncMovingHint();
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
      this.node.classList.add('pressing');
      this.node.style.transform = '';
      this._lookRx = 0;
      this._lookRy = 0;
      this._lookWriteRx = null;
      this._lookWriteRy = null;
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
      this.node.classList.add('dragging');
      this.node.classList.remove('pressing');
      this.updatePosition(t.clientX - this.offsetX, t.clientY - this.offsetY);
      this.lastActivity = Date.now();
    }, { passive: true, signal });

    document.addEventListener('touchend', (e) => {
      if (!this.isDragging) return;
      this.isDragging = false;
      this.node.classList.remove('pressing', 'dragging');
      this._syncMovingHint();
      const t = e.changedTouches[0];
      if (Math.abs(t.clientX - this.startX) < 10 && Math.abs(t.clientY - this.startY) < 10) {
        this._queuePetClick();
      } else {
        this.startGlide(this._dragVelocityX || 0, this._dragVelocityY || 0);
      }
    }, { signal });

    // Scroll leve: só marca atividade (reação visual fica no handler por velocidade)
    document.addEventListener('scroll', () => {
      this.lastActivity = Date.now();
    }, { passive: true, signal });

    // "Você voltou!" — saudação conforme tempo fora (único handler)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this._dwellHiddenAt = Date.now();
        this._cancelDwellEngage();
        this.node?.classList.add('aic-tab-hidden');
        this.subpet?.node?.classList.add('aic-tab-hidden');
        if (this.subpet) this.subpet._pauseRaf();
        return;
      }
      this.node?.classList.remove('aic-tab-hidden');
      this.subpet?.node?.classList.remove('aic-tab-hidden');
      if (this.subpet) this.subpet._resumeRaf();
      const hiddenFor = this._dwellHiddenAt ? Date.now() - this._dwellHiddenAt : 0;
      this._dwellHiddenAt = 0;
      this._dwellVisibleSince = Date.now();
      this._dwellThresholdMs = 45000 + Math.floor(Math.random() * 45000);
      if (!this.isVisible || this.isQuiet()) return;
      this.lastActivity = Date.now();
      if (this.state === 'sleeping') this.wakeUp();
      /* < 45s: silêncio; 45s–5min: aceno leve; 5–30min: volta; >30min: celebração */
      if (hiddenFor < 45000) return;
      if (hiddenFor > 1800000) {
        this.showSpeech('Que saudade! 🥺', 3000);
        this.doCheer();
        if (this.subpet) this.subpet.interact('celebrate', { force: true });
      } else if (hiddenFor > 300000) {
        this.showSpeech('Você voltou! 🎉', 2200);
        this._pulseAnimClass('tab-greet', 750);
        this.setStateFor('waving', 1800);
        if (this.subpet) this.subpet.interact('celebrate', { force: true });
      } else {
        this._pulseAnimClass('tab-greet', 600);
        this.setStateFor('waving', 1300);
      }
      if (hiddenFor > 180000) {
        setTimeout(() => {
          if (!document.hidden && this.isVisible && !this.isQuiet()) this._engagePageStructure({ force: true });
        }, 2800);
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

    this._bindPagePlayfulness(signal);
  }

  _bindPagePlayfulness(signal) {
    // Texto selecionado → curiosidade
    document.addEventListener('selectionchange', () => {
      if (!this.isVisible || this.isQuiet() || this.state !== 'idle') return;
      const text = (window.getSelection?.()?.toString() || '').trim();
      if (text.length < 12) return;
      if (Date.now() - (this._lastSelectionReact || 0) < 14000) return;
      this._lastSelectionReact = Date.now();
      this.setStateFor('curious', 1800);
      this.showSpeech(this.getRandom('curious'), 2000);
      this.addXp(1);
      this.beep(710, 0.05, 'triangle');
    }, { signal });

    // Foco em campos → Dev digita; demais só comentam
    document.addEventListener('focusin', (e) => {
      const t = e.target;
      if (!(t instanceof HTMLElement)) return;
      const editable = /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable;
      if (!editable) return;
      if (!this.isVisible || this.isQuiet() || this.state !== 'idle') return;
      if (Date.now() - (this._lastFocusReact || 0) < 22000) return;
      this._lastFocusReact = Date.now();
      if (this.S.profession === 'engineer') {
        this.setStateFor('typing', 2600);
        this.showSpeech('Boa sorte digitando! ⌨️', 2200);
        this.chime([[480, 0.04], [600, 0.05], [720, 0.04]], 'actions');
      } else {
        this.setStateFor('curious', 1400);
        this.showSpeech(this.getRandom('curious') || 'Hmm… ✍️', 1600);
        this.beep(560, 0.04, 'triangle', 'actions');
      }
    }, { signal });

    // Clique na página (fora do pet) → aceno ocasional
    document.addEventListener('click', (e) => {
      if (e.target?.closest?.('#aic-clawd-node, .aic-subpet, .aic-lake, .aic-toyball')) return;
      if (!this.isVisible || this.isQuiet() || this.state !== 'idle') return;
      if (Math.random() > 0.14) return;
      if (Date.now() - (this._lastPageClickReact || 0) < 9000) return;
      this._lastPageClickReact = Date.now();
      this.setStateFor('waving', 1300);
      this.showSpeech('Oi! 👋', 1300);
      this.beep(700, 0.04);
    }, { signal });

    // Tema do SO → atmosfeira na sombra
    try {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const sync = () => this.node?.classList.toggle('page-dark', !!mq.matches);
      sync();
      mq.addEventListener?.('change', sync, { signal });
    } catch (_) { /* ignore */ }

    // Preferência de movimento reduzido ao vivo (SO / acessibilidade)
    try {
      const mqMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
      const syncMotion = () => {
        this._reducedMotion = !!mqMotion.matches;
        if (this.subpet) this.subpet._reducedMotion = this._reducedMotion;
        this.node?.classList.toggle('aic-reduced-motion', this._reducedMotion);
      };
      syncMotion();
      mqMotion.addEventListener?.('change', syncMotion, { signal });
    } catch (_) { /* ignore */ }

    // Mouse sai da janela → "até logo"
    document.addEventListener('mouseleave', () => {
      if (!this.isVisible || this.isQuiet() || this.state !== 'idle') return;
      if (Date.now() - (this._lastLeaveReact || 0) < 30000) return;
      this._lastLeaveReact = Date.now();
      this.showSpeech('Volta logo! 👋', 1800);
      this.setStateFor('waving', 1400);
    }, { signal });
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
      } else if (Date.now() - this._hoverStart > 1800 && !this._peekHint) {
        this._peekHint = true;
        this.showSpeech('Hmm? 👀', 1000);
      }
    } else {
      this._hoverStart = 0;
      this._peekHint = false;
    }
  }

  lookAtCursor(mouseX, mouseY) {
    if (this.isDragging || this.state === 'sleeping' || this.isAutoWalking) return;
    if (this.S.settings.performanceMode || this._reducedMotion) return;
    this._pendingLookX = mouseX;
    this._pendingLookY = mouseY;
    if (this._lookRaf) return;
    this._lookRaf = requestAnimationFrame(() => {
      this._lookRaf = null;
      this._applyLookAtCursor(this._pendingLookX, this._pendingLookY);
    });
  }

  _applyLookAtCursor(mouseX, mouseY) {
    if (this._destroyed || !this.node || this.isDragging) return;
    if (this.state === 'sleeping' || this.isAutoWalking) return;
    const rect = this.node.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dist = Math.hypot(mouseX - cx, mouseY - cy);
    /* Longe demais: só relaxa o olhar (sem write a cada pixel) */
    if (dist > 320) {
      if (!this._lookRx && !this._lookRy) return;
      this._lookRx *= 0.72;
      this._lookRy *= 0.72;
      if (Math.abs(this._lookRx) < 0.15 && Math.abs(this._lookRy) < 0.15) {
        this._lookRx = 0;
        this._lookRy = 0;
        if (this._lookWriteRx !== '0.00' || this._lookWriteRy !== '0.00') {
          this._lookWriteRx = '0.00';
          this._lookWriteRy = '0.00';
          this.node.style.transform = '';
        }
        return;
      }
    } else {
      const targetRx = Math.max(-10, Math.min(10, (mouseY - cy) * 0.028));
      const targetRy = Math.max(-10, Math.min(10, (mouseX - cx) * 0.028));
      this._lookRx = this._lookRx == null ? 0 : this._lookRx;
      this._lookRy = this._lookRy == null ? 0 : this._lookRy;
      this._lookRx += (targetRx - this._lookRx) * 0.22;
      this._lookRy += (targetRy - this._lookRy) * 0.22;
    }
    const rx = (-this._lookRx).toFixed(2);
    const ry = this._lookRy.toFixed(2);
    if (rx === this._lookWriteRx && ry === this._lookWriteRy) return;
    this._lookWriteRx = rx;
    this._lookWriteRy = ry;
    this.node.style.transform = `perspective(600px) rotateX(${rx}deg) rotateY(${ry}deg)`;
  }

  _syncMovingHint() {
    if (!this.node) return;
    const moving = this.isDragging || this.isAutoWalking
      || this.state === 'walking' || this.state === 'running';
    this.node.classList.toggle('aic-moving', !!moving);
  }

  /* ---------- QUIET HOURS ---------- */
  isQuiet() {
    const { quietStart, quietEnd } = this.S.settings || {};
    if (typeof quietStart !== 'string' || typeof quietEnd !== 'string') return false;
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

  /* ---------- SONS 8-BIT (só após gesto do usuário — política de autoplay) ---------- */
  _hasAudioUserActivation() {
    try {
      const ua = navigator.userActivation;
      /* isActive = gesto nesta pilha; hasBeenActive = já houve gesto na página */
      if (ua && typeof ua.isActive === 'boolean') return !!ua.isActive;
    } catch (_) { /* ignore */ }
    return true; /* browsers sem User Activation API */
  }

  _bindAudioUnlock() {
    if (this._audioUnlockBound || !this._abort) return;
    this._audioUnlockBound = true;
    const unlock = () => {
      if (this._destroyed) return;
      this._audioAllowed = true;
      /* create/resume SOMENTE no handler de gesto — evita warning do Chrome */
      this._ensureAudioCtx({ fromGesture: true });
    };
    const opts = { capture: true, passive: true, signal: this._abort.signal };
    /* pointerdown/touchstart/click são activation; keydown também (exceto só modifiers) */
    ['pointerdown', 'keydown', 'touchstart', 'click'].forEach((ev) => {
      document.addEventListener(ev, unlock, opts);
    });
  }

  /**
   * @param {{ fromGesture?: boolean }} [opts]
   * fromGesture=true → pode criar/resume (só chamar de handlers de gesto).
   * Demais caminhos só reutilizam um contexto já running.
   */
  _ensureAudioCtx(opts = {}) {
    const fromGesture = !!opts.fromGesture;
    if (!this._audioAllowed || !this.S?.settings?.sounds) return null;
    try {
      if (!this._audioCtx) {
        if (!fromGesture || !this._hasAudioUserActivation()) return null;
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return null;
        this._audioCtx = new Ctx();
      }
      if (this._audioCtx.state === 'closed') {
        this._audioCtx = null;
        return null;
      }
      if (this._audioCtx.state === 'suspended') {
        /* resume() fora de gesto também dispara o warning de autoplay */
        if (!fromGesture || !this._hasAudioUserActivation()) return this._audioCtx;
        this._audioCtx.resume().catch(() => {});
      }
      return this._audioCtx;
    } catch (_) {
      return null;
    }
  }

  beep(freq = 660, dur = 0.07, type = 'square', channel = 'actions') {
    if (!this.S.settings.sounds || this.isQuiet() || !this._audioAllowed) return;
    try {
      /* Nunca cria/resume aqui — só toca se o ctx já estiver running pós-gesto */
      const ctx = this._ensureAudioCtx({ fromGesture: false });
      if (!ctx || ctx.state === 'closed') return;
      // Ainda suspenso = sem gesto válido; silencia sem avisar no console.
      if (ctx.state !== 'running') return;
      const masterRaw = Number(this.S.settings.soundVolume);
      const master = Number.isFinite(masterRaw) ? Math.max(0, Math.min(1, masterRaw)) : 0.45;
      if (master <= 0) return; /* mute real pelo slider master */
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      const chKey = channel === 'ambient' ? 'soundVolumeAmbient' : 'soundVolumeActions';
      const chVol = Math.max(0, Math.min(1, this.S.settings[chKey] ?? (channel === 'ambient' ? 0.6 : 1)));
      if (chVol <= 0) return;
      const vol = Math.max(0.0001, master * chVol * 0.14);
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + Math.max(0.03, dur));
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + Math.max(0.03, dur) + 0.02);
    } catch (_) { /* autoplay / AudioContext policy */ }
  }

  chime(notes = [[660, 0.06], [880, 0.08]], channel = 'actions') {
    notes.forEach(([f, d], i) => {
      setTimeout(() => this.beep(f, d, i % 2 ? 'triangle' : 'square', channel), i * 70);
    });
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
    /* Bônus de streak: >=3 dias +20%, >=7 dias +50% */
    const streakDays = this.S.game?.streak?.days || 0;
    if (streakDays >= 7)      amount = Math.round(amount * 1.5);
    else if (streakDays >= 3) amount = Math.round(amount * 1.2);
    const before = clawdLevelFromXp(this.S.xp).level;
    this.S.xp += amount;
    /* Feedback visual sutil para XP significativo */
    if (amount >= 5 && !this.S.settings.performanceMode && !this.S.settings.noParticles) {
      this.spawnParticles(['⭐', '✨'], { count: Math.min(4, Math.ceil(amount / 5)) });
    }
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
    this._syncNameTag();
    // Não interrompe animações curtas (spin/sneak/etc.); comemora quando o pet estiver livre.
    const busy = this.state && this.state !== 'idle' && this.state !== 'walking' && this.state !== 'sleeping';
    if (!busy) {
      this.setStateFor('celebrate', 2500);
    } else {
      clearTimeout(this._pendingCelebrate);
      this._pendingCelebrate = setTimeout(() => {
        if (this.state === 'idle' || this.state === 'walking') this.setStateFor('celebrate', 2200);
      }, 1800);
    }
    this.beep(880, 0.12);
    // v3.3: marcos de nível com recompensas específicas
    if (level === 5 && !this.S.game.inventory.includes('party_hat')) {
      this.S.game.inventory.push('party_hat');
      this.toast('', { rarity: 'common', icon: '🎉', title: 'Chapéu de Festa desbloqueado!', desc: 'Nível 5 conquistado! Celebre com estilo.' });
      setTimeout(() => this.spawnParticles(['🎉', '🎊', '🎈', '✨']), 400);
    }
    if (level === 10 && !this.S.game.inventory.includes('monocle')) {
      this.S.game.inventory.push('monocle');
      this.toast('', { rarity: 'rare', icon: '🧐', title: 'Monóculo desbloqueado!', desc: 'Nível 10 — elegância em pixel.' });
    }
    if (level === 15 && !this.S.game.inventory.includes('wings')) {
      this.S.game.inventory.push('wings');
      this.toast('', { rarity: 'rare', icon: '🪶', title: 'Asas desbloqueadas!', desc: 'Nível 15 — agora você pode voar!' });
      setTimeout(() => this.spawnParticles(['🪶', '✨', '🌟', '💫']), 400);
    }
    // Coroa no nível 20
    if (level >= 20 && !this.S.game.inventory.includes('crown')) {
      this.S.game.inventory.push('crown');
      setTimeout(() => this.spawnParticles(['👑', '🌟', '✨', '🎊', '💫']), 400);
      this.toast('', { rarity: 'legendary', icon: '👑', title: 'Coroa Desbloqueada!', desc: 'Você é rei/rainha do nível 20!' });
    }
    // Aura arco-íris permanente a partir do nível 30
    if (level >= 30) {
      this.node?.classList.add('rainbow-aura');
      if (level === 30) {
        this.toast('', { rarity: 'legendary', icon: '🌈', title: 'Aura Arco-íris!', desc: 'Nível 30 — brilho lendário ativado.' });
        setTimeout(() => this.spawnParticles(['🌈', '✨', '🌟', '💫']), 400);
      }
    } else {
      this.node?.classList.remove('rainbow-aura');
    }
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
      if (!this.S.subpets.active && this.S.subpets.unlocked.includes('dog')) {
        this.S.subpets.active = 'dog';
      }
      this.refreshSubpet();
    }
    // v3.3: atualiza counter de level para conquistas
    this.S.game.counters.level = level;
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
    const icon  = clawdSanitizePlainText(opts.icon || '🏆', 8) || '🏆';
    const title = clawdSanitizePlainText(opts.title || text, 80);
    const desc  = clawdSanitizePlainText(opts.desc || '', 120);
    const stars = '★'.repeat(rarityDef.stars) + '☆'.repeat(4 - rarityDef.stars);

    const el = document.createElement('div');
    el.className = 'aic-toast';
    el.style.setProperty('--toast-color', rarityDef.color);
    el.style.setProperty('--toast-glow', `0 0 20px ${rarityDef.glow}`);

    const mk = (tag, cls, content) => {
      const n = document.createElement(tag);
      if (cls) n.className = cls;
      if (content != null) n.textContent = content;
      return n;
    };
    ['tl', 'tr', 'bl', 'br'].forEach(c => el.appendChild(mk('div', `aic-toast-corner ${c}`)));
    const inner = mk('div', 'aic-toast-inner');
    inner.appendChild(mk('div', 'aic-toast-icon', icon));
    const textBox = mk('div', 'aic-toast-text');
    textBox.appendChild(mk('div', 'aic-toast-rarity', rarityDef.label));
    textBox.appendChild(mk('div', 'aic-toast-title', title));
    if (desc) textBox.appendChild(mk('div', 'aic-toast-desc', desc));
    textBox.appendChild(mk('div', 'aic-toast-stars', stars));
    inner.appendChild(textBox);
    el.appendChild(inner);
    const bar = mk('div', 'aic-toast-progress-bar');
    bar.appendChild(mk('div', 'aic-toast-progress-fill'));
    el.appendChild(bar);

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
    /* v3.3: mirror para counter (para a conquista iron_will) */
    this.S.game.counters.streakDays = st.days;
    if (st.days >= 30) this.checkAchievements();
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
    const foodie = this.S.personality?.foodie ?? 4;
    const lazy   = this.S.personality?.lazy   ?? 3;
    // Comilão fica com fome mais rápido
    const hungerRate = 0.2 + (foodie >= 7 ? 0.1 : foodie >= 5 ? 0.05 : 0);
    s.hunger  = Math.max(0, s.hunger - hungerRate * mins);
    s.hygiene = Math.max(0, s.hygiene - 0.08 * mins);
    if (this.state === 'sleeping') s.energy = Math.min(100, s.energy + 2 * mins);
    else {
      // Preguiçoso drena energia mais rápido (esgota-se sem fazer nada)
      const energyRate = 0.06 + (lazy >= 7 ? 0.05 : lazy >= 5 ? 0.02 : 0);
      s.energy = Math.max(0, s.energy - energyRate * mins);
    }
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
    if (s.hygiene < 22) return 'grubby';
    if (s.happiness >= 92 && s.energy >= 55) return 'ecstatic';
    if (s.happiness > 80) return 'joyful';
    if (s.happiness < 30) return 'sad';
    if (s.energy > 78 && s.happiness > 55) return 'peppy';
    return 'content';
  }

  updateEmotion(silent) {
    const prev = this.emotion;
    this.emotion = this.computeEmotion();
    const badges = {
      sleepy: '🥱', hungry: '🍖', joyful: '🤩', sad: '😢', content: '🙂',
      ecstatic: '🥳', peppy: '⚡', grubby: '🫧'
    };
    this.emotionNode.textContent = badges[this.emotion] || '🙂';
    this.node.setAttribute('data-emotion', this.emotion);
    this.node.classList.toggle('emotion-glow', /joyful|ecstatic|peppy/.test(this.emotion));
    if (!silent && prev !== this.emotion) {
      this.showEmotionEmoji(badges[this.emotion] || '🙂', 3600);
      if (this.srStatusNode) {
        const labels = {
          sleepy: 'Com sono', hungry: 'Com fome', joyful: 'Alegre', sad: 'Triste',
          content: 'Contente', ecstatic: 'Extasiado', peppy: 'Animado', grubby: 'Precisando de banho'
        };
        this.srStatusNode.textContent = `Claw'd: ${labels[this.emotion] || this.emotion}`;
      }
    }
    if (!silent && prev !== this.emotion && this.isVisible && !this.isQuiet()) {
      if (this.emotion === 'hungry') this.showSpeech(this.getRandom('hungry'), 3000);
      if (this.emotion === 'sad') this.showSpeech(this.getRandom('sad'), 3000);
      if (this.emotion === 'joyful') this.showSpeech(this.getRandom('joyful'), 3000);
      if (this.emotion === 'ecstatic') this.showSpeech(this.getRandom('ecstatic'), 3000);
      if (this.emotion === 'peppy') this.showSpeech(this.getRandom('peppy'), 2800);
      if (this.emotion === 'grubby') this.showSpeech(this.getRandom('grubby'), 3000);
      if (!this.S.settings.noParticles && !this.S.settings.performanceMode && !this._reducedMotion) {
        const emotionPalettes = {
          joyful:   ['#fd79a8', '#e84393', '#ffffff', '#ffeaa7'],
          ecstatic: ['#f1c40f', '#ffeaa7', '#fd79a8', '#ffffff'],
          peppy:    ['#74b9ff', '#55a9dd', '#ffffff', '#81ecec'],
          sad:      ['#74b9ff', '#0984e3', '#dfe6e9', '#a29bfe'],
          hungry:   ['#e17055', '#fdcb6e', '#ffffff'],
          grubby:   ['#b2bec3', '#81ecec', '#74b9ff'],
        };
        if (emotionPalettes[this.emotion]) {
          this.spawnPixelSparks(emotionPalettes[this.emotion], { count: 5 });
        }
      }
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
    if (this.state === 'sleeping') this.wakeUp();
    this.setStateFor('happy', 1600);
    this.showSpeech(this.getRandom('happy'));
    const body = this.node?.dataset?.accBody;
    if (body === 'wings') this.spawnPixelSparks(['#b8d8e8', '#ffffff', '#fda7df'], { count: 5 });
    else if (body === 'cape') this.spawnPixelSparks(['#e74c3c', '#fda7df', '#ffffff'], { count: 5 });
    else this.spawnPixelSparks(['#ff6b81', '#fda7df', '#f1c40f', '#ffffff'], { count: 5 });
    this.bumpStat('happiness', 8);
    this.addXp(5);
    this.chime([[660, 0.04], [880, 0.06]], 'actions');
    this.lastActivity = Date.now();
    const c = this.S.game.counters;
    c.pets = (c.pets || 0) + 1;
    this.registerDaily('pets');
    this.checkAchievements();
    this.updateEmotion(true);
    if (this.subpet && this.subpet.species === 'slime' && Math.random() < 0.35) {
      this.subpet.interact('special');
    } else if (this.subpet && Math.random() < 0.4) {
      this.subpet.interact('cuddle', { force: true });
    }
  }

  spawnParticles(emojis, opts = {}) {
    if (this._destroyed || this.S.settings.performanceMode || document.hidden || this._reducedMotion) return;
    if (typeof opts === 'number') opts = { count: opts };
    let pool = emojis || ['❤️', '💕', '✨', '⭐', '💫', '🌟'];
    const requested = Number(opts.count);
    const fallback = Math.min(8, Math.max(4, pool.length + 1));
    const count = Number.isFinite(requested)
      ? Math.min(8, Math.max(1, Math.floor(requested)))
      : fallback;
    if (!this._reserveFx(count)) return;
    const rect = this.node.getBoundingClientRect();
    /* v3.3: particleColor — glow colorido customizado nas partículas */
    const pColor = this.S.particleColor;
    const glowStyle = pColor ? `filter:drop-shadow(0 0 4px ${pColor});` : '';
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        if (this._destroyed || document.hidden) {
          this._releaseFx(1);
          return;
        }
        const el = document.createElement('div');
        el.className = 'aic-particle';
        el.style.cssText = `
          position:fixed;
          left:${rect.left + Math.random() * 56 - 8}px;
          top:${rect.top + Math.random() * 28 - 4}px;
          z-index:2147483647;
          font-size:${13 + Math.random() * 9}px;
          pointer-events:none;
          animation:clawd-float-up ${0.75 + Math.random() * 0.45}s ease-out forwards;
          ${glowStyle}
        `;
        el.textContent = pool[Math.floor(Math.random() * pool.length)];
        document.body.appendChild(el);
        this._trackParticle(el, 1400, true);
      }, i * 80);
    }
  }

  _spawnWalkDust(count = 3) {
    if (this._destroyed || this.S.settings.performanceMode || document.hidden || this._reducedMotion) return;
    if (Date.now() - (this._lastWalkDust || 0) < 280) return;
    if (!this._reserveFx(count)) return;
    this._lastWalkDust = Date.now();
    const rect = this.node.getBoundingClientRect();
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        if (this._destroyed || document.hidden) {
          this._releaseFx(1);
          return;
        }
        const el = document.createElement('div');
        el.className = 'aic-walk-dust';
        el.style.cssText = `
          left:${rect.left + 10 + Math.random() * 28}px;
          top:${rect.bottom - 10 + Math.random() * 4}px;
        `;
        if (this.S.particleColor) {
          el.style.background = this.S.particleColor + 'aa';
          el.style.boxShadow = `3px 0 ${this.S.particleColor}77, -2px 1px ${this.S.particleColor}55`;
        }
        document.body.appendChild(el);
        this._trackParticle(el, 520, true);
      }, i * 45);
    }
  }

  /* Partículas pixel (bola/futebol/acessórios — sem emoji). */
  spawnPixelSparks(colors, opts = {}) {
    if (this._destroyed || this.S.settings.performanceMode || document.hidden || this._reducedMotion) return;
    if (typeof opts === 'number') opts = { count: opts };
    const requested = Number(opts.count);
    const count = Number.isFinite(requested)
      ? Math.min(10, Math.max(1, Math.floor(requested)))
      : 5;
    if (!this._reserveFx(count)) return;
    const rect = this.node.getBoundingClientRect();
    let palette = colors || ['#27ae60', '#f5f5f5', '#1a1a2e', '#f1c40f', '#e74c3c'];
    if (this.S.particleColor) palette = [...palette, this.S.particleColor];
    const variants = ['spark-sm', 'spark-md', 'spark-lg', 'spark-star'];
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        if (this._destroyed || document.hidden) {
          this._releaseFx(1);
          return;
        }
        const el = document.createElement('div');
        const variant = variants[i % variants.length];
        const color = palette[Math.floor(Math.random() * palette.length)];
        el.className = `aic-pixel-spark ${variant}`;
        const sx = `${(Math.random() - 0.5) * 56}px`;
        const sy = `${-24 - Math.random() * 48}px`;
        el.style.cssText = `
          left:${rect.left + 6 + Math.random() * 44}px;
          top:${rect.top + 12 + Math.random() * 28}px;
          background:${color};
          color:${color};
          box-shadow: 2px 0 ${palette[Math.floor(Math.random() * palette.length)]};
          --spark-x:${sx}; --spark-y:${sy};
        `;
        document.body.appendChild(el);
        this._trackParticle(el, 1100, true);
      }, i * 36);
    }
  }

  _clearFreestyle() {
    if (!this.node) return;
    this.node.classList.remove('freestyle-heel', 'freestyle-around', 'freestyle-rabona', 'freestyle-knee');
  }

  /* Embaixadinha fancy estilo freestyle (heel / around / rabona / joelho). */
  _playFreestyleMove(forced) {
    if (this._destroyed || !this.node) return null;
    const moves = ['freestyle-heel', 'freestyle-around', 'freestyle-rabona', 'freestyle-knee'];
    const pick = forced || moves[Math.floor(Math.random() * moves.length)];
    this._clearFreestyle();
    this.node.classList.add(pick);
    this.spawnPixelSparks(['#27ae60', '#f5f5f5', '#f1c40f'], { count: 4 });
    clearTimeout(this._freestyleTimer);
    this._freestyleTimer = setTimeout(() => {
      this._freestyleTimer = null;
      this._clearFreestyle();
    }, 560);
    return pick;
  }

  showSpeech(text, duration = 2800, interactive = false) {
    if (!this.S.showSpeech && !interactive) return;
    if (this.isQuiet() && !interactive) return;
    this.speechNode.replaceChildren();
    if (interactive && text instanceof Node) {
      this.speechNode.appendChild(text);
      this.speechNode.classList.add('interactive');
    } else {
      this.speechNode.textContent = typeof text === 'string' ? text : '';
      this.speechNode.classList.remove('interactive');
    }
    this.speechNode.classList.add('visible');
    this.node.classList.add('talking');
    this._clampSpeechBubble();
    clearTimeout(this._speechTimer);
    if (duration > 0) {
      this._speechTimer = setTimeout(() => {
        this.speechNode.classList.remove('visible', 'interactive', 'flip-left', 'below');
        this.node.classList.remove('talking');
      }, duration);
    }
  }

  /* Mantém o balão na viewport: flip na borda esquerda; below se estoura o topo. */
  _clampSpeechBubble() {
    const bubble = this.speechNode;
    if (!bubble) return;
    bubble.classList.remove('flip-left', 'below');
    const rect = bubble.getBoundingClientRect();
    if (rect.left < 4) bubble.classList.add('flip-left');
    if (bubble.getBoundingClientRect().top < 4) bubble.classList.add('below');
  }

  getRandom(state) {
    const pool = this.messages[state] || this.messages.idle;
    // apelidos favoritos: às vezes o pet fala de si com outro nome
    const favNicks = this.S.favorites.nicknames || [];
    if (state === 'idle' && favNicks.length > 0 && Math.random() < 0.25) {
      const nick = favNicks[Math.floor(Math.random() * favNicks.length)];
      return `Pode me chamar de ${nick}! 🐾`;
    }
    /* Voz customizada ponderada pelo traço social (personalização → gameplay) */
    const custom = (this.S.customSpeech || []).filter((t) => typeof t === 'string' && t.trim());
    if (custom.length && (state === 'idle' || state === 'happy' || state === 'curious')) {
      const social = this.S.personality?.social ?? 5;
      const chance = 0.12 + (social / 10) * 0.28; // ~12%…40%
      if (Math.random() < chance) {
        return custom[Math.floor(Math.random() * custom.length)];
      }
    }
    return pool[Math.floor(Math.random() * pool.length)];
  }

  wakeUp() {
    this.setState('idle');
    this.showSpeech('Bom dia! ☀️');
    this.chime([[500, 0.04], [720, 0.06]], 'actions');
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
    this.spawnParticles(['✨', '💫', '🌪️'], { count: 4 });
    this.spawnPixelSparks(['#f1c40f', '#ffffff', '#3498db', this.S.color || '#c71515'], { count: 6 });
    this.bumpStat('energy', -3);
    this.addXp(2);
    this.chime([[520, 0.04], [660, 0.05], [880, 0.06]], 'actions');
  }

  doFeed() {
    if (this.state === 'sleeping') this.wakeUp();
    const mult = this.S.profession === 'chef' ? 2 : 1;
    const isDoctor = this.S.profession === 'doctor';
    this.setStateFor('eating', 1800);
    if (this.S.profession === 'chef') this._pulseProfessionFx('cooking', 2200);
    this.showSpeech(mult > 1 ? 'Comida de chef! 😋👨‍🍳' : (isDoctor ? 'Nutri-dose! 🩺😋' : 'Nham nham! 😋'), 2200);
    this.bumpStat('hunger', 30 * mult);
    this.registerDaily('feed');
    this.bumpStat('happiness', 5);
    const xpBase = 3;
    const xpMult = (this.S.profession === 'chef') ? 1.5 : 1;
    this.addXp(Math.round(xpBase * xpMult));
    this.beep(520);
    this.spawnParticles(mult > 1 ? ['🍖', '🍲', '♨️', '✨'] : ['🍖', '🍪', '✨']);
    this.updateEmotion(true);
    /* v3.3: contadores */
    const c = this.S.game.counters;
    c.feeds = (c.feeds || 0) + 1;
    if (c.feeds >= 20) this.checkAchievements();
  }

  doPlay() {
    if (this.state === 'sleeping') this.wakeUp();
    this.setStateFor('excited', 2500);
    this.showSpeech('Bola! 🎾', 2000);
    // bolinha sai do pé direito do pet (longe do subpet à esquerda)
    const rect = this.node.getBoundingClientRect();
    const ball = document.createElement('div');
    ball.className = 'aic-toyball';
    ball.style.left = `${rect.left + rect.width * 0.72}px`;
    ball.style.top = `${rect.top + rect.height * 0.55}px`;
    document.body.appendChild(ball);
    setTimeout(() => ball.remove(), 2000);
    this.bumpStat('happiness', 6);
    this.registerDaily('play');
    this.bumpStat('energy', -4);
    this.addXp(3);
    this.chime([[520, 0.04], [660, 0.05], [820, 0.06]], 'actions');
    this.spawnParticles(['🎾', '✨', '⭐'], { count: 3 });
    if (this.subpet) this.subpet.interact('play');
  }

  doPose() {
    if (this.state === 'sleeping') this.wakeUp();
    this.setStateFor('pose', 3000);
    this.showSpeech('📸 Diz xis!', 3000);
    this.beep(880, 0.06, 'triangle', 'actions');
    this.spawnParticles(['✨', '📸', '⭐']);
  }

  doBath() {
    if (this.state === 'sleeping') this.wakeUp();
    const isDoctor = this.S.profession === 'doctor';
    this.setStateFor('bathing', 2500);
    this.showSpeech(isDoctor ? 'Banho medicinal! 🩺🫧' : 'Splish splash! 🫧', 2500);
    this.spawnParticles(['🫧', '💧', '🧼', '✨'], { count: 4 });
    this.spawnPixelSparks(['#74b9ff', '#81ecec', '#ffffff', '#a29bfe'], { count: 5 });
    this.chime([[480, 0.04], [600, 0.05], [740, 0.06]], 'actions');
    this.bumpStat('hygiene', isDoctor ? 100 : 100);
    if (isDoctor) this.bumpStat('hygiene', 3); // bônus de médico
    this.bumpStat('happiness', 8);
    const xpBase = 4;
    const xpMult = isDoctor ? 1.5 : 1;
    this.addXp(Math.round(xpBase * xpMult));
    this.node.classList.add('shiny');
    clearTimeout(this._shinyTimer);
    this._shinyTimer = setTimeout(() => this.node.classList.remove('shiny'), 12000);
    this.updateEmotion(true);
    this.registerDaily('bath');
  }

  doDance() {
    // dança melhorada: 3 passos em sequência + poses pixel
    if (this.state === 'sleeping') this.wakeUp();
    const asMusician = this.S.profession === 'musician';
    this.showSpeech(asMusician ? 'Solo improvisado! 🎸' : 'Yeahh! 🕺', 3200);
    this.spawnParticles(asMusician ? ['🎵', '🎶', '✨', '🎸'] : ['🎵', '🎶', '✨'], { count: 4 });
    this.spawnPixelSparks(['#f1c40f', '#e84393', '#74b9ff', '#ffffff'], { count: 5 });
    if (asMusician) this._pulseProfessionFx('jamming', 3000);
    this.setState('dance-1');
    this.beep(660);
    setTimeout(() => { if (this.state === 'dance-1') { this.node.classList.remove('dance-1'); this.state = 'dance-2'; this.node.classList.add('dance-2'); this.beep(770); this.spawnPixelSparks(['#a29bfe', '#ffffff'], { count: 3 }); } }, 900);
    setTimeout(() => { if (this.state === 'dance-2') { this.node.classList.remove('dance-2'); this.state = 'dance-3'; this.node.classList.add('dance-3'); this.beep(880); } }, 1800);
    setTimeout(() => { if (this.state === 'dance-3') this.setState('idle'); }, 2800);
    this.bumpStat('happiness', 6);
    this.bumpStat('energy', -4);
    const c = this.S.game.counters;
    c.dances = (c.dances || 0) + 1;
    this.registerDaily('dance');
    if (c.dances >= 15) this.checkAchievements();
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
    this.setStateFor('jumping', 900);
    this.showSpeech('Pulou! ✨', 1200);
    this.spawnParticles(['✨', '💨'], { count: 3 });
    this.spawnPixelSparks(['#ffffff', '#f1c40f', '#3498db', this.S.color || '#c71515'], { count: 6 });
    this._spawnWalkDust(4);
    this.bumpStat('energy', -3);
    this.bumpStat('happiness', 3);
    this.addXp(2);
    this.chime([[520, 0.05], [780, 0.08]], 'actions');
  }

  doStretch() {
    if (this.state === 'sleeping') return;
    this.setStateFor('stretching', 1300);
    this.showSpeech('Ahhh... 🤾', 1500);
    this.spawnPixelSparks(['#ffeaa7', '#ffffff', this.S.color || '#c71515'], { count: 3 });
    this.bumpStat('energy', 3);
    this.beep(350, 0.1, 'triangle', 'ambient');
  }

  doRoar() {
    if (this.state === 'sleeping') this.wakeUp();
    this.setStateFor('roaring', 1700);
    this.showSpeech('RAAWR! 🦁', 2000);
    this.spawnParticles(['💥', '⚡', '🔥'], { count: 4 });
    this.spawnPixelSparks(['#e74c3c', '#f1c40f', '#ffffff'], { count: 6 });
    this.bumpStat('happiness', 5);
    this.addXp(3);
    this.beep(180, 0.2, 'sawtooth', 'actions');
  }

  doHighFive() {
    if (this.state === 'sleeping') this.wakeUp();
    this.setStateFor('highfive', 900);
    this.showSpeech('✋ HIGH FIVE!', 1500);
    this.spawnParticles(['✋', '⭐', '✨'], { count: 3 });
    this.spawnPixelSparks(['#f1c40f', '#ffffff', '#fd79a8'], { count: 5 });
    this.bumpStat('happiness', 6);
    this.addXp(2);
    this.beep(750, 0.06);
    setTimeout(() => this.beep(950, 0.08), 100);
  }

  doSpin() {
    if (this.state === 'sleeping') this.wakeUp();
    this.setStateFor('spinning', 800);
    this.showSpeech('Wheee! 🌀', 1200);
    this.spawnParticles(['🌀', '✨'], { count: 3 });
    this.spawnPixelSparks(['#a29bfe', '#74b9ff', '#ffffff', this.S.color || '#c71515'], { count: 6 });
    this.bumpStat('happiness', 4);
    this.addXp(2);
    this.chime([[520, 0.05], [720, 0.06], [920, 0.08]], 'actions');
  }

  doBounce() {
    if (this.state === 'sleeping') this.wakeUp();
    this.setStateFor('bouncing', 700);
    this.showSpeech('Boing! ⬆️', 1000);
    this.spawnParticles(['💨']);
    this.bumpStat('energy', -2);
    this.addXp(2);
    this.beep(540, 0.05);
    setTimeout(() => this.beep(780, 0.07), 120);
  }

  doWink() {
    if (this.state === 'sleeping') this.wakeUp();
    this.setStateFor('winking', 800);
    this.showSpeech('😉', 900);
    this.bumpStat('happiness', 3);
    this.addXp(1);
    this.beep(990, 0.05, 'triangle');
  }

  doCheer() {
    if (this.state === 'sleeping') this.wakeUp();
    this.setStateFor('cheering', 1400);
    this.showSpeech('Vamos! 🎉', 1500);
    this.spawnParticles(['🎉', '⭐', '✨']);
    this.bumpStat('happiness', 7);
    this.addXp(3);
    this.chime([[660, 0.06], [770, 0.06], [880, 0.08], [990, 0.1]]);
    if (this.subpet) this.subpet.interact('celebrate', { force: true });
  }

  doSneak() {
    if (this.state === 'sleeping') this.wakeUp();
    this.setStateFor('sneaking', 1600);
    this.showSpeech('Shhh... 🥷', 1400);
    this.spawnPixelSparks(['#2c3e50', '#636e72', '#b2bec3'], { count: 3 });
    this.bumpStat('energy', -2);
    this.addXp(2);
    this.beep(220, 0.12, 'triangle', 'ambient');
  }

  doClap() {
    if (this.state === 'sleeping') this.wakeUp();
    this.setStateFor('clapping', 1100);
    this.showSpeech('👏👏', 1200);
    this.spawnParticles(['👏', '✨'], { count: 3 });
    this.spawnPixelSparks(['#ffffff', '#f1c40f', '#fdcb6e'], { count: 4 });
    this.bumpStat('happiness', 5);
    this.addXp(2);
    this.beep(480, 0.04);
    setTimeout(() => this.beep(480, 0.04), 110);
    setTimeout(() => this.beep(640, 0.05), 220);
  }

  doPeek() {
    if (this.state === 'sleeping') this.wakeUp();
    this.setStateFor('peeking', 900);
    this.showSpeech('Olha só... 👀', 1200);
    this.spawnPixelSparks(['#ffeaa7', '#ffffff', '#fdcb6e'], { count: 3 });
    this.addXp(1);
    this.beep(710, 0.06, 'triangle', 'ambient');
  }

  doRoll() {
    if (this.state === 'sleeping') this.wakeUp();
    this.setStateFor('rolling', 900);
    this.showSpeech('Rolando! 🎱', 1200);
    this.spawnParticles(['💫'], { count: 2 });
    this.spawnPixelSparks(['#636e72', '#b2bec3', '#ffffff', this.S.color || '#c71515'], { count: 5 });
    this._spawnWalkDust(3);
    this.bumpStat('energy', -3);
    this.addXp(3);
    this.chime([[400, 0.05], [500, 0.05], [600, 0.05], [700, 0.08]], 'actions');
  }

  doBalloon() {
    if (this.state === 'sleeping') this.wakeUp();
    if (this._balloon) this.popBalloon({ silent: true });
    const palette = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#a29bfe', '#fd79a8', '#74b9ff', '#55efc4'];
    const color = palette[Math.floor(Math.random() * palette.length)];
    this.node.style.setProperty('--balloon-color', color);
    this.node.style.setProperty('--balloon-dark', color);
    this._balloon = true;
    clearTimeout(this._stateTimer);
    this.setState('holding-balloon');
    this.node.classList.add('holding-balloon');
    this.node.classList.remove('balloon-pop');
    this.showSpeech('Olha meu balão! 🎈', 2400);
    this.chime([[520, 0.05], [660, 0.06], [820, 0.08]]);
    this.bumpStat('happiness', 6);
    this.addXp(2);
    this.S.game.counters.balloons = (this.S.game.counters.balloons || 0) + 1;
    this.save();
    if (this.subpet) this.subpet.interact('balloon', { force: true });
    clearTimeout(this._balloonTimer);
    this._balloonTimer = setTimeout(() => this.popBalloon(), 9000 + Math.random() * 4000);
  }

  popBalloon({ silent = false } = {}) {
    if (!this._balloon && !this.node?.classList.contains('holding-balloon')) return;
    this._balloon = false;
    clearTimeout(this._balloonTimer);
    this._balloonTimer = null;
    this.node.classList.remove('holding-balloon');
    if (silent) {
      if (this.state === 'holding-balloon') this.setState('idle');
      this.node.classList.remove('balloon-pop');
      return;
    }
    this.node.classList.add('balloon-pop');
    this.beepBalloonPop();
    this.spawnParticles(['💥', '✨', '🌀', '💧', '🎉']);
    this.showSpeech('Pow! 💥', 1600);
    this.setStateFor('excited', 1100);
    this.bumpStat('happiness', 4);
    this.addXp(1);
    this.S.game.counters.balloonsPopped = (this.S.game.counters.balloonsPopped || 0) + 1;
    this.registerDaily('balloons');
    this.checkAchievements();
    this.save();
    if (this.subpet) this.subpet.interact('startle', { force: true });
    clearTimeout(this._balloonPopFx);
    this._balloonPopFx = setTimeout(() => this.node?.classList.remove('balloon-pop'), 700);
  }

  beepBalloonPop() {
    this.beep(220, 0.05, 'sawtooth');
    setTimeout(() => this.beep(110, 0.07, 'sawtooth'), 45);
    setTimeout(() => this.beep(55, 0.12, 'triangle'), 95);
    setTimeout(() => this.beep(880, 0.03, 'square'), 140);
  }

  doHug() {
    if (this.state === 'sleeping') this.wakeUp();
    this.setStateFor('hugging', 2000);
    this.showSpeech(this.subpet ? 'Abraço em dupla! 🤗' : 'Abraço virtual! 🤗', 2200);
    this.spawnParticles(['💖', '💕', '✨', '🫶']);
    this.bumpStat('happiness', 12);
    this.addXp(4);
    this.chime([[520, 0.06], [620, 0.06], [780, 0.1]]);
    this.updateEmotion(true);
    if (this.subpet) this.subpet.interact('hug', { force: true });
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

      if (Math.random() < 0.15 && !this.S.settings.performanceMode && !this._reducedMotion && this._canSpawnFx(1)) {
        const dust = document.createElement('div');
        dust.className = 'aic-dust';
        dust.style.left = `${currentX + (dx < 0 ? 60 : -6)}px`;
        dust.style.top = `${rect.top + 70}px`;
        if (this.S.particleColor) dust.style.background = this.S.particleColor + 'aa';
        document.body.appendChild(dust);
        this._trackParticle(dust, 600);
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

  /* ---------- BOLA / FUTEBOL ----------
     Interação: toque simples na bola = embaixadinha (mantém no ar);
     duplo-clique = finaliza com um chute a gol. Quanto mais alto o
     combo, mais valioso o golaço. */
  kickBall() {
    if (this.ballNode.classList.contains('kicked')) return;
    if (this.S.profession && this.S.profession !== 'footballer') return;
    // Finalização: se vinha embaixadinhando, o chute vale a sequência + bônus.
    const streak = this._keepyCount || 0;
    const combo = this._juggleCombo || 1;
    if (streak > 0) this._recordKeepy(streak, combo);
    this._resetJuggle();
    this.ballNode.classList.remove('rolling');
    this.ballNode.classList.add('kicked');
    this.setStateFor('celebrate', 2200);
    const bonus = streak >= 10 ? ` (+${streak} embaixadinhas!)` : '';
    this.showSpeech(streak >= 5 ? `Golaço! ⚽🔥${bonus}` : 'Gooool! ⚽🥅', 2500);
    this.beep(830, 0.14);
    setTimeout(() => this.beep(990, 0.12), 90);
    // trave pixel-art aparece na lateral
    const goal = document.createElement('div');
    goal.className = 'aic-goalpost';
    goal.style.top = `${Math.max(20, this.node.getBoundingClientRect().top - 60)}px`;
    document.body.appendChild(goal);
    setTimeout(() => goal.classList.add('visible'), 50);
    setTimeout(() => { goal.classList.remove('visible'); setTimeout(() => goal.remove(), 500); }, 1800);
    this.spawnPixelSparks(streak >= 10
      ? ['#f1c40f', '#27ae60', '#fff', '#e74c3c', '#3498db']
      : ['#27ae60', '#f5f5f5', '#1a1a2e', '#f1c40f']);
    this.addXp(10 + Math.min(20, Math.round(streak * combo * 0.3)));
    const c = this.S.game.counters;
    c.goals = (c.goals || 0) + 1;
    this.registerDaily('goals');
    this.checkAchievements();
    this.save();
    // Cachorro busca só depois do chute — e mira o destino à direita do pet
    if (this.subpet && this.subpet.species === 'dog') {
      const kickTarget = this.ballNode.getBoundingClientRect();
      setTimeout(() => {
        this.subpet?.fetchBall?.({
          left: kickTarget.left + 220,
          top: kickTarget.top,
          width: kickTarget.width,
          height: kickTarget.height,
          right: kickTarget.left + 220,
          bottom: kickTarget.bottom,
        });
      }, 700);
    }
    setTimeout(() => this.ballNode.classList.remove('kicked'), 1400);
  }

  /* Um toque de embaixadinha (jogador clicou na bola). Freestyle rota a cada toque. */
  juggleTouch() {
    if (this.S.profession !== 'footballer') { this.kickBall(); return; }
    if (this.ballNode.classList.contains('kicked')) return;
    if (this.state === 'sleeping') this.wakeUp();
    // interrompe embaixadinha automática para dar controle ao jogador
    if (this._keepy) { clearTimeout(this._keepy); this._keepy = null; }
    if (this._juggleIdleTimer) { clearTimeout(this._juggleIdleTimer); this._juggleIdleTimer = null; }

    if (!this._juggleActive) {
      this._juggleActive = true;
      this._keepyCount = 0;
      this._juggleCombo = 1;
      this._freestyleIndex = 0;
      this.node.classList.add('keepy');
      this.setState('keepy-uppy');
      if (Math.random() < 0.4) this.showSpeech('Freestyle! Elástico…', 1400);
    }

    this._keepyCount++;
    // Ciclo freestyle estilo Ronaldinho: joelho → calcanhar → around → rabona
    const freestyleCycle = ['freestyle-knee', 'freestyle-heel', 'freestyle-around', 'freestyle-rabona'];
    const fancy = this._keepyCount % 3 === 0 || this._keepyCount === 1;
    if (fancy) {
      const move = freestyleCycle[this._freestyleIndex % freestyleCycle.length];
      this._freestyleIndex = (this._freestyleIndex || 0) + 1;
      this._playFreestyleMove(move);
    } else {
      this.ballNode.classList.remove('rolling');
      void this.ballNode.offsetWidth;
      this.ballNode.classList.add('keepy-pop');
      setTimeout(() => this.ballNode.classList.remove('keepy-pop'), 260);
    }

    // som sobe de tom conforme o combo; bolha flutuante com a contagem
    this.beep(600 + Math.min(600, this._keepyCount * 12), 0.05);
    this._showJuggleCount(this._keepyCount);

    // marcos de combo a cada 10 toques
    if (this._keepyCount % 10 === 0) {
      this._juggleCombo = Math.min(5, Math.floor(this._keepyCount / 10) + 1);
      const msg = this._keepyCount >= 50 ? `x${this._juggleCombo} LENDÁRIO!` :
                  this._keepyCount >= 30 ? `x${this._juggleCombo} COMBO!` :
                  this._keepyCount >= 20 ? `${this._keepyCount} freestyle!` :
                  `${this._keepyCount} embaixadinhas!`;
      this.showSpeech(msg, 1400);
      this.spawnPixelSparks(['#f1c40f', '#27ae60', '#e74c3c', '#fff']);
    }

    // watchdog: se o jogador demorar para o próximo toque, a bola cai.
    // A janela encolhe com o combo — fica mais difícil (e emocionante).
    const dropWindow = Math.max(650, 1500 - this._keepyCount * 22);
    if (this._juggleDrop) clearTimeout(this._juggleDrop);
    this._juggleDrop = setTimeout(() => this._dropBall(), dropWindow);
  }

  /* A bola caiu — encerra a sequência com a penalidade divertida. */
  _dropBall() {
    if (!this._juggleActive) return;
    const finalCount = this._keepyCount;
    const combo = this._juggleCombo;
    this._recordKeepy(finalCount, combo);
    this._resetJuggle();
    // bola rola para a direita (longe do subpet); pet corre atrás
    this.ballNode.classList.remove('kicked');
    this.ballNode.classList.add('rolling');
    this.showSpeech(finalCount >= 10 ? `Ufa! ${finalCount} embaixadinhas! 😅` : 'Ops! 😅', 1600);
    this.beep(240, 0.14);
    const rect = this.node.getBoundingClientRect();
    setTimeout(() => {
      this.startRun(Math.max(10, rect.left + 140));
      setTimeout(() => this.ballNode.classList.remove('rolling'), 1200);
    }, 500);
  }

  /* Guarda recorde, dá XP e dispara conquistas a partir de uma sequência. */
  _recordKeepy(finalCount, combo = 1) {
    if (!finalCount || finalCount < 1) return;
    const c = this.S.game.counters;
    c.keepyTotal = (c.keepyTotal || 0) + finalCount;
    const rec = c.keepyRecord || 0;
    if (finalCount > rec) {
      c.keepyRecord = finalCount;
      const rarity = finalCount >= 50 ? 'legendary' : finalCount >= 30 ? 'epic' :
                     finalCount >= 15 ? 'rare' : 'common';
      this.toast('', {
        rarity,
        icon: '⚽',
        title: `Novo Recorde: ${finalCount}!`,
        desc: `${finalCount} embaixadinhas seguidas!`
      });
    }
    this.registerDaily('keepy', finalCount);
    this.addXp(Math.round(finalCount * combo * 0.4));
    this.checkAchievements();
    this.save();
  }

  /* Bolha flutuante mostrando a contagem ao vivo sobre a bola. */
  _showJuggleCount(n) {
    if (!this.ballNode) return;
    let bubble = this._juggleBubble;
    if (!bubble || !bubble.isConnected) {
      bubble = document.createElement('div');
      bubble.className = 'aic-juggle-count';
      this.node.appendChild(bubble);
      this._juggleBubble = bubble;
    }
    bubble.textContent = String(n);
    bubble.classList.toggle('hot', n >= 20);
    bubble.classList.remove('bump');
    void bubble.offsetWidth;
    bubble.classList.add('bump');
  }

  _resetJuggle() {
    this._juggleActive = false;
    this._keepyCount = 0;
    this._juggleCombo = 1;
    this._freestyleIndex = 0;
    if (this._juggleDrop) { clearTimeout(this._juggleDrop); this._juggleDrop = null; }
    if (this._juggleIdleTimer) { clearTimeout(this._juggleIdleTimer); this._juggleIdleTimer = null; }
    clearTimeout(this._freestyleTimer);
    this._freestyleTimer = null;
    this._clearFreestyle();
    this.node.classList.remove('keepy');
    if (this._juggleBubble) {
      const b = this._juggleBubble; this._juggleBubble = null;
      b.classList.add('fade');
      setTimeout(() => b.remove(), 400);
    }
    if (this.state === 'keepy-uppy') this.setState('idle');
  }

  /* Embaixadinha AUTÔNOMA — freestyle próprio quando ocioso. */
  startKeepyUppy() {
    if (this._keepy || this._juggleActive) return;
    if (this.S.profession !== 'footballer' || this.state !== 'idle') return;
    if (this.ballNode.classList.contains('kicked')) return;
    this.node.classList.add('keepy');
    this.setState('keepy-uppy');
    this._keepyCount = 0;
    this._freestyleIndex = 0;
    let comboMultiplier = 1;
    const freestyleCycle = ['freestyle-knee', 'freestyle-heel', 'freestyle-around', 'freestyle-rabona'];

    const tick = () => {
      this._keepyCount++;
      const move = freestyleCycle[this._freestyleIndex % freestyleCycle.length];
      this._freestyleIndex++;
      if (this._keepyCount % 2 === 0) this._playFreestyleMove(move);
      else {
        this.ballNode.classList.remove('keepy-pop');
        void this.ballNode.offsetWidth;
        this.ballNode.classList.add('keepy-pop');
        setTimeout(() => this.ballNode.classList.remove('keepy-pop'), 260);
      }
      this._showJuggleCount(this._keepyCount);
      if (this._keepyCount % 10 === 0) {
        comboMultiplier = Math.min(5, Math.floor(this._keepyCount / 10) + 1);
        const msg = this._keepyCount >= 30 ? `x${comboMultiplier} COMBO!` :
                    this._keepyCount >= 20 ? `${this._keepyCount} freestyle!` :
                    `${this._keepyCount}!`;
        this.showSpeech(msg, 1500);
        this.beep(700 + this._keepyCount * 4, 0.06);
        this.spawnPixelSparks(['#27ae60', '#f1c40f', '#ffffff'], { count: 5 });
      }
      const speed = Math.max(0.28, 0.68 - this._keepyCount * 0.006);
      if (this._keepy) {
        clearTimeout(this._keepy);
        this._keepy = setTimeout(tick, speed * 1000);
      }
      const errChance = Math.min(0.25, 0.08 + Math.max(0, this._keepyCount - 40) * 0.005);
      if (Math.random() < errChance || this._keepyCount >= 60) {
        const finalCount = this._keepyCount;
        this.stopKeepyUppy();
        this._recordKeepy(finalCount, comboMultiplier);
        this.ballNode.classList.add('rolling');
        this.showSpeech('Ops!', 1500);
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
    this._resetJuggle();
  }

  /* ---------- PESCARIA ---------- */
  doFish() {
    if (this.state === 'sleeping') this.wakeUp();
    if (this._fishing) { this.stopFishing(); return; }
    this._fishing = true;
    this._fishMissed = false;
    this.setState('fishing');
    this.node.classList.add('fishing');
    this.showSpeech('Pescando... espere o nibble', 0);

    const rect = this.node.getBoundingClientRect();
    this._lakeEl = document.createElement('div');
    this._lakeEl.className = 'aic-lake';
    this._lakeEl.title = 'Quando brilhar — clique rápido no lago (ou no pet) para fisgar!';
    this._lakeEl.innerHTML = '<div class="aic-lake-hint">CLIQUE!</div><div class="aic-fish" aria-hidden="true"></div>';
    const reel = () => {
      if (this._fishing && this.state === 'fishing' && this._lakeEl?.classList.contains('bite')) {
        this._catchFish();
      }
    };
    this._lakeEl.addEventListener('click', (e) => { e.stopPropagation(); reel(); });
    this._fishReelOnPet = (e) => {
      if (e.target.closest('.pet-ball')) return;
      reel();
    };
    this.node.addEventListener('click', this._fishReelOnPet);
    const lakeX = Math.max(10, Math.min(window.innerWidth - 140, rect.left - 70));
    const lakeY = Math.max(10, Math.min(window.innerHeight - 80, rect.top + 55));
    this._lakeEl.style.left = `${lakeX}px`;
    this._lakeEl.style.top = `${lakeY}px`;
    document.body.appendChild(this._lakeEl);
    setTimeout(() => this._lakeEl && this._lakeEl.classList.add('visible'), 50);

    this._fishingLineEl = document.createElement('div');
    this._fishingLineEl.className = 'aic-fishing-line';
    const lineX = rect.left + 42;
    const lineY = rect.top + 8;
    const lineH = lakeY + 22 - lineY;
    this._fishingLineEl.style.cssText = `left:${lineX}px; top:${lineY}px; height:${Math.max(12, lineH)}px;`;
    document.body.appendChild(this._fishingLineEl);
    setTimeout(() => this._fishingLineEl && this._fishingLineEl.classList.add('visible'), 100);

    // Mordida entre 2.2s e 6.5s — janela curta para reação
    const waitTime = 2200 + Math.random() * 4300;
    this._fishTimer = setTimeout(() => {
      if (!this._fishing) return;
      if (this._lakeEl) this._lakeEl.classList.add('bite');
      if (this._fishingLineEl) this._fishingLineEl.classList.add('biting');
      this.showSpeech('Nibble! Clique no lago!', 1600);
      this.beep(640, 0.06);
      // Janela de reação ~1.4s; se perder, peixe escapa
      this._fishBiteTimer = setTimeout(() => {
        if (this._fishing && this.state === 'fishing') this._missFish();
      }, 1400);
    }, waitTime);
  }

  _missFish() {
    if (!this._fishing || this.state !== 'fishing') return;
    this._fishMissed = true;
    this.showSpeech('Escapou! Tente de novo', 1800);
    this.beep(220, 0.1);
    this.bumpStat('happiness', -2);
    this.stopFishing();
  }

  _catchFish() {
    if (!this._fishing || this.state !== 'fishing') return false;
    if (this._lakeEl && !this._lakeEl.classList.contains('bite') && !this._fishMissed) {
      this.showSpeech('Ainda não... espere o brilho', 1400);
      return false;
    }
    clearTimeout(this._fishBiteTimer);
    this._fishBiteTimer = null;
    this.setState('reeling');
    this.node.classList.remove('fishing');
    this.node.classList.add('reeling');
    if (this._lakeEl) this._lakeEl.classList.remove('bite');
    if (this._fishingLineEl) this._fishingLineEl.classList.remove('biting');
    this.showSpeech('Isso! Puxando...', 1200);
    this.beep(550, 0.08);

    clearTimeout(this._fishCatchTimer);
    this._fishCatchTimer = setTimeout(() => {
      if (!this._fishing || this.state !== 'reeling' || this._destroyed) return;
      this._fishCatchTimer = null;
      const isRare = Math.random() < 0.15;
      const pool = isRare ?
        this._fishPool.filter(f => f.rare) :
        this._fishPool.filter(f => !f.rare);
      const fish = pool[Math.floor(Math.random() * pool.length)] || this._fishPool[0];

      const lakeRect = this._lakeEl ? this._lakeEl.getBoundingClientRect() : this.node.getBoundingClientRect();
      const caught = document.createElement('div');
      caught.className = 'aic-fish-caught' + (fish.rare ? ' rare' : '');
      caught.style.left = `${lakeRect.left + lakeRect.width / 2}px`;
      caught.style.top = `${lakeRect.top}px`;
      document.body.appendChild(caught);
      setTimeout(() => caught.remove(), 1300);

      this.showSpeech(fish.msg, 2800);
      this.addXp(fish.xp);
      this.spawnPixelSparks(fish.rare
        ? ['#9b59b6', '#f1c40f', '#fff', '#3498db']
        : ['#3498db', '#f39c12', '#fff', '#2ecc71']);

      const c = this.S.game.counters;
      c.fish = (c.fish || 0) + 1;
      this.registerDaily('fish');
      if (fish.rare) c.rareFish = (c.rareFish || 0) + 1;
      this.checkAchievements();

      if (fish.rare) {
        this.toast('', {
          rarity: 'epic',
          icon: '★',
          title: 'Peixe raro!',
          desc: fish.msg
        });
      }
      this.beep(isRare ? 880 : 620, isRare ? 0.15 : 0.08);
      this.bumpStat('happiness', isRare ? 15 : 6);
      this.save();
      this.stopFishing();
    }, 700);
    return true;
  }

  stopFishing() {
    // sem pescaria ativa não há o que limpar — e limpar aqui apagava o balão
    // de fala a cada mudança de config (applyConfig 'profession' chama stopFishing)
    const wasFishing = this._fishing || this._lakeEl || this._fishingLineEl ||
      this.state === 'fishing' || this.state === 'reeling';
    if (!wasFishing) return;
    this._fishing = false;
    clearTimeout(this._fishTimer);
    clearTimeout(this._fishBiteTimer);
    clearTimeout(this._fishCatchTimer);
    clearTimeout(this._pendingCelebrate);
    this._pendingCelebrate = null;
    this._fishTimer = null;
    this._fishBiteTimer = null;
    this._fishCatchTimer = null;
    this.node.classList.remove('fishing', 'reeling');
    if (this._fishReelOnPet) {
      this.node.removeEventListener('click', this._fishReelOnPet);
      this._fishReelOnPet = null;
    }
    if (this.state === 'fishing' || this.state === 'reeling') this.setState('idle');
    if (this._lakeEl) {
      this._lakeEl.classList.remove('visible', 'bite');
      const el = this._lakeEl;
      setTimeout(() => el.remove(), 400);
      this._lakeEl = null;
    }
    if (this._fishingLineEl) {
      this._fishingLineEl.classList.remove('visible', 'biting');
      const el = this._fishingLineEl;
      setTimeout(() => el.remove(), 300);
      this._fishingLineEl = null;
    }
    this.speechNode.classList.remove('visible', 'interactive', 'flip-left', 'below');
    this.node.classList.remove('talking');
  }

  /* ---------- DESAFIO DO TUTOR ---------- */
  showTutorChallenge() {
    const a = 2 + Math.floor(Math.random() * 8);
    const b = 2 + Math.floor(Math.random() * 8);
    const answer = a * b;
    const opts = [answer, answer + (1 + Math.floor(Math.random() * 4)), Math.max(1, answer - (1 + Math.floor(Math.random() * 4)))];
    opts.sort(() => Math.random() - 0.5);
    this.setState('holding-sign');
    this._pulseProfessionFx('thinking', 8000);

    const root = document.createElement('div');
    root.className = 'challenge';
    const q = document.createElement('div');
    q.className = 'challenge-q';
    q.textContent = `📚 Rapidinho: ${a} × ${b} = ?`;
    const optsWrap = document.createElement('div');
    optsWrap.className = 'challenge-opts';
    opts.forEach((o) => {
      const btn = document.createElement('button');
      btn.className = 'challenge-opt';
      btn.type = 'button';
      btn.dataset.val = String(o);
      btn.textContent = String(o);
      optsWrap.appendChild(btn);
    });
    root.appendChild(q);
    root.appendChild(optsWrap);
    this.showSpeech(root, 0, true);
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
  _detectGeneralPageContext() {
    const prevCtx = this._currentPageContext;
    const next = (typeof clawdPageContextFromHost === 'function')
      ? clawdPageContextFromHost(location.hostname)
      : 'idle';
    this._currentPageContext = next;
    /* Primeiro load: reage após settle (desbloqueia CLAWD_CONTEXT_REACTIONS) */
    if (prevCtx === undefined) {
      if (next !== 'idle') {
        setTimeout(() => {
          if (this._destroyed || this._currentPageContext !== next) return;
          this._onContextChange(next);
        }, 1600);
      }
      return;
    }
    if (next !== prevCtx) this._onContextChange(next);
  }

  _onContextChange(ctx) {
    if (this._destroyed || !this.isVisible) return;
    if (this.isQuiet() || this.S?.settings?.performanceMode) return;
    const now = Date.now();
    /* Evita rajada de fala/ações ao pular entre abas — mantém ritmo fluido */
    if (now - (this._lastContextReactAt || 0) < 8000) return;
    const reactions = (typeof CLAWD_CONTEXT_REACTIONS !== 'undefined' && CLAWD_CONTEXT_REACTIONS)
      ? CLAWD_CONTEXT_REACTIONS
      : {};
    const r = reactions[ctx];
    if (!r) return;
    const traitVal = this.S.personality?.[r.trait] ?? 5;
    if (traitVal < r.min) return;
    this._lastContextReactAt = now;
    setTimeout(() => {
      if (this._destroyed || this.state !== 'idle' || this.isQuiet()) return;
      this.showSpeech(r.msg, 2500);
      this._handleAction(r.action);
    }, 1200);
  }

  _detectPageContext() {
    // limpa loops contextuais da profissão anterior (evita timers acumulados)
    (this._ctxTimers || []).forEach(clearInterval);
    this._ctxTimers = [];
    this._detectGeneralPageContext();
    const prof = this.S.profession;
    if (prof === 'idle') return;
    const url = location.hostname.toLowerCase();
    const keywords = this._contextMap[prof] || [];
    const match = keywords.some(k =>
      (typeof clawdHostMatchesDomain === 'function' && clawdHostMatchesDomain(url, k))
      || url.includes(k)
    );

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
        if (Math.random() < 0.42) {
          this._pulseProfessionFx('jamming', 2800);
          this.doDance();
        }
      }, 65000));
    }
    if (prof === 'chef') {
      this._ctxTimers.push(setInterval(() => {
        if (this.isQuiet() || !this.isVisible || this.state !== 'idle') return;
        if (Math.random() < 0.4) {
          this._pulseProfessionFx('cooking', 2600);
          this.setStateFor('eating', 1200);
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
    /* v3.3: novas profissões */
    if (prof === 'doctor') {
      this._ctxTimers.push(setInterval(() => {
        if (this.isQuiet() || !this.isVisible || this.state !== 'idle') return;
        if (Math.random() < 0.4) {
          this._pulseProfessionFx('healing', 2500);
          this.doBath();
          this.showSpeech('Check-up de higiene! 🩺', 2200);
        }
      }, 90000));
    }
    if (prof === 'artist') {
      this._ctxTimers.push(setInterval(() => {
        if (this.isQuiet() || !this.isVisible || this.state !== 'idle') return;
        if (Math.random() < 0.45) {
          this._pulseProfessionFx('painting', 2800);
          this.doMeditate();
          this.showSpeech('Inspiração artística! 🎨', 2400);
          this.spawnParticles(['⭐', '✨', '🌟']);
        }
      }, 70000));
    }
    if (prof === 'gamer') {
      this._ctxTimers.push(setInterval(() => {
        if (this.isQuiet() || !this.isVisible || this.state !== 'idle') return;
        if (Math.random() < 0.4) {
          this._pulseProfessionFx('gaming', 2200);
          this.doFlip();
          this.showSpeech(Math.random() < 0.5 ? 'GG EZ! 🎮' : 'Vita para o Claw\'d! 🏆', 2000);
        }
      }, 80000));
    }
    if (prof === 'streamer') {
      this._ctxTimers.push(setInterval(() => {
        if (this.isQuiet() || !this.isVisible || this.state !== 'idle') return;
        if (Math.random() < 0.5) {
          this._pulseProfessionFx('streaming', 3000);
          this.doDance();
          this.showSpeech('Hype no chat! 📡🎉', 2200);
          this.spawnParticles(['📡', '🎬', '✨', '🎉']);
        }
      }, 65000));
    }
  }

  _devComment() {
    const langs = {
      python: '🐍 Python? Boa!', javascript: '⚡ JS! Clássico.', typescript: '🔷 TypeScript, chique!',
      rust: '🦀 Rust! Corajoso.', go: '🐹 Go! Veloz.', java: '☕ Java raiz.', ruby: '💎 Ruby!',
      'c++': '⚙️ C++! Hardcore.', php: '🐘 PHP vive!'
    };
    // Só URL + título (+ meta) — evita ler o body (privacidade + performance).
    const meta = Array.from(document.querySelectorAll('meta[name="description"], meta[property="og:description"]'))
      .map(m => m.getAttribute('content') || '')
      .join(' ')
      .slice(0, 400);
    const hay = (location.pathname + ' ' + document.title + ' ' + meta).toLowerCase();
    for (const [lang, msg] of Object.entries(langs)) {
      if (hay.includes(lang)) {
        setTimeout(() => this.showSpeech(msg, 3000), 6000);
        break;
      }
    }
  }

  _ninjaTrick() {
    if (document.hidden || this.S.profession !== 'ninja' || this.state !== 'idle' || this.isQuiet()) return;
    if (Math.random() > 0.3) return;
    this._pulseProfessionFx('stealthing', 1400);
    this.spawnParticles(['💨', '🌫️']);
    this.node.style.opacity = '0.15';
    setTimeout(() => {
      const x = 20 + Math.random() * (window.innerWidth - 150);
      const y = 20 + Math.random() * (window.innerHeight - 200);
      this.updatePosition(x, y);
      this.node.style.opacity = '';
      this.node.classList.remove('stealthing');
      this.setStateFor('pose', 900);
      this.showSpeech('Surpresa! 🥷', 2000);
      this.spawnParticles(['💨', '⚡', '✨']);
      this.addXp(2);
    }, 1300);
  }

  /* ---------- LOOP DE COMPORTAMENTO ---------- */
  startBehaviorLoop() {
    // Sono + bocejo + birra — a cada 5s
    this._timers.push(setInterval(() => {
      if (document.hidden || this.isDragging || !this.isVisible || this.isAutoWalking) return;
      const idle = (Date.now() - this.lastActivity) / 1000;
      if (this.S.sleepEnabled && this.state === 'idle') {
        // Preguiçoso dorme mais cedo
        const lazy = this.S.personality?.lazy ?? 3;
        const sleepAt = lazy >= 7 ? 18 : lazy >= 5 ? 23 : 28;
        const yawnAt  = Math.round(sleepAt * 0.46);
        if (idle > yawnAt && idle <= sleepAt && !this._yawned) {
          this._yawned = true;
          this.setStateFor('yawning', 2000);
          this.showSpeech('🥱...', 1800);
        }
        if (idle > sleepAt) {
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
        this.beep(160, 0.1, 'sawtooth', 'actions');
        setTimeout(() => this.beep(120, 0.12, 'triangle', 'actions'), 90);
      }
    }, 5000));

    // Decaimento de stats
    this._timers.push(setInterval(() => {
      if (document.hidden) return;
      this.decayStats(1);
      this.S.stats.lastStatsUpdate = Date.now();
      this.updateEmotion();
      this.save();
    }, CLAWD_TIMINGS.STAT_DECAY_MS));

    // Fala aleatória — a cada ~40s
    this._timers.push(setInterval(() => {
      if (document.hidden || !this.isVisible || !this.S.showSpeech || this.isQuiet()) return;
      if (this.state === 'sleeping') return;
      const social = this.S.personality?.social ?? 5;
      const chance = this.emotion === 'sad' ? 0.3 : (social >= 7 ? 0.8 : 0.6);
      if (Math.random() < chance) {
        const pool = this.emotion === 'hungry' ? 'hungry' : this.state;
        this.showSpeech(this.getRandom(this.messages[pool] ? pool : 'idle'));
      }
    }, 40000));

    // Ação aleatória favorita — a cada ~25s
    this._timers.push(setInterval(() => {
      if (document.hidden) return;
      if (this.state !== 'idle' || this.isDragging || !this.isVisible || this.isQuiet()) return;
      const baseChance = this.emotion === 'joyful' ? 0.6 : 0.45;
      if (Math.random() > baseChance) return;
      /* Pool ponderada por personalidade (playful → dance/jump; lazy → stretch/wink; curious → lookAround) */
      const p = this.S.personality || {};
      const pool = ['wave', 'dance', 'somersault', 'keepy', 'jump', 'highfive', 'roar', 'balloon', 'hug', 'wink', 'clap', 'lookAround'];
      const traitBoost = [];
      if ((p.playful ?? 5) >= 7) traitBoost.push('dance', 'jump', 'somersault', 'balloon');
      if ((p.lazy ?? 5) >= 7) traitBoost.push('wink', 'stretch', 'meditate');
      if ((p.curious ?? 5) >= 7) traitBoost.push('lookAround', 'peek', 'clap');
      if ((p.social ?? 5) >= 7) traitBoost.push('wave', 'highfive', 'hug');
      const weightedPool = traitBoost.length ? pool.concat(traitBoost) : pool;
      const pick = this.getWeightedRandom(weightedPool, this.S.favorites.actions);
      if (pick === 'keepy' && this.S.profession !== 'footballer') {
        this._handleAction('wave');
        return;
      }
      this._handleAction(pick);
    }, CLAWD_TIMINGS.RANDOM_ACTION_MS));

    // Duo pet ↔ subpet — cenas periódicas quando ambos idle
    this._timers.push(setInterval(() => this._maybePlayDuoScene(), CLAWD_TIMINGS.DUO_SCENE_MS));

    // Ambient FX de acessórios (hélice / asas / capa)
    this._timers.push(setInterval(() => this._tickAccessoryAmbientFx(), 9000));

    // Permanência na aba → engaja estrutura da página (45–90s)
    this._timers.push(setInterval(() => this._tickDwellEngage(), 8000));

    // Auto-walk — a cada ~18s
    this._timers.push(setInterval(() => {
      if (document.hidden) return;
      if (this.state !== 'idle' || this.isDragging || !this.S.autoWalk ||
          this.isAutoWalking || !this.isVisible || this.isQuiet()) return;
      const lazy2 = this.S.personality?.lazy ?? 3;
      const walkChance = this.emotion === 'sad' ? 0.25 : (lazy2 >= 7 ? 0.3 : lazy2 >= 5 ? 0.42 : 0.55);
      if (Math.random() < walkChance) this._doAutoWalk();
    }, 18000));

    // Truque ninja — a cada 50s
    this._timers.push(setInterval(() => this._ninjaTrick(), 50000));

    // v3.3: marcos de tempo na aba — a cada 60s
    this._timers.push(setInterval(() => this._checkTabMilestones(), 60000));

    // v3.3: clima ambiente — a cada 30s
    this._timers.push(setInterval(() => this._spawnAmbientWeather(), 30000));

    // v3.4: variação de idle — kickoff inicial após 15s
    setTimeout(() => { if (!this._destroyed) this._doIdleVariation(); }, 15000);

    // Pescador: pesca espontânea se idle — ciclos curtos e espaçados
    this._timers.push(setInterval(() => {
      if (document.hidden) return;
      if (this.S.profession !== 'fisher') return;
      if (this.state !== 'idle' || this.isDragging || !this.isVisible || this.isQuiet()) return;
      if (!this._fishing && Math.random() < 0.4) {
        this.doFish();
      }
    }, 90000));

    // Pulso de profissão: cada identidade tem uma micro-interação própria,
    // mesmo fora de um site contextual específico.
    this._timers.push(setInterval(() => {
      if (document.hidden) return;
      if (this.state !== 'idle' || this.isDragging || !this.isVisible || this.isQuiet() || Math.random() > 0.38) return;
      switch (this.S.profession) {
        case 'footballer': this.startKeepyUppy(); break;
        case 'tutor': this.showTutorChallenge(); break;
        case 'engineer': this.setStateFor('typing', 3200); this.showSpeech('click clack... 💻', 2200); break;
        case 'musician': this.doDance(); break;
        case 'chef': this.doFeed(); break;
        case 'fisher': if (!this._fishing) this.doFish(); break;
        case 'ninja': this._ninjaTrick(); break;
        /* v3.3 */
        case 'doctor': this.doBath(); this.showSpeech('Higiene em dia! 🩺', 2000); break;
        case 'artist': this.doMeditate(); break;
        case 'gamer': this.doFlip(); this.showSpeech('Level up! 🎮', 1800); break;
        case 'streamer': this.doDance(); this.showSpeech('Clip isso! 📡', 2000); break;
      }
    }, 85000));
  }

  /* v3.3: Marcos de tempo na aba */
  _checkTabMilestones() {
    if (!this.isVisible || this.isQuiet() || document.hidden) return;
    const minutesOnTab = Math.floor((Date.now() - this._tabStartTime) / 60000);
    const milestones = [
      { min: 5,  msg: 'Já faz 5 min aqui! ⏱️',   xp: 3,  emoji: ['⏱️', '✨'] },
      { min: 30, msg: 'Maratonando? 🏃 30 min!', xp: 8,  emoji: ['🏃', '⭐', '✨'] },
      { min: 60, msg: 'Foco total! 🎯 1 hora!',  xp: 15, emoji: ['🎯', '🏆', '✨', '⭐'] }
    ];
    for (const m of milestones) {
      if (minutesOnTab >= m.min && !this._tabMilestonesFired.includes(m.min)) {
        this._tabMilestonesFired.push(m.min);
        this.showSpeech(m.msg, 3000);
        this.spawnParticles(m.emoji);
        this.addXp(m.xp);
        break;
      }
    }
  }

  /* v3.3: Clima ambiente sazonal */
  _spawnAmbientWeather() {
    if (!this.isVisible || this.S.settings.performanceMode || this.S.settings.noWeather || document.hidden || this._reducedMotion) return;
    const month = new Date().getMonth() + 1; // 1–12
    let pool = null;
    if (month === 12 || month === 1)  pool = ['❄️', '🌨️', '⛄'];
    else if (month === 10)             pool = ['🍂', '🍃', '🌿'];
    else if (month === 4)              pool = ['🌸', '🌺', '🌼'];
    else if (month >= 6 && month <= 7) pool = ['✨', '🌟', '🔆'];
    if (!pool) return;
    const count = 1 + Math.floor(Math.random() * 2);
    if (!this._reserveFx(count)) return;
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        if (this._destroyed || document.hidden) {
          this._releaseFx(1);
          return;
        }
        const el = document.createElement('div');
        el.className = 'aic-particle';
        el.style.cssText = `
          position:fixed;
          left:${Math.random() * window.innerWidth}px;
          top:${Math.random() * (window.innerHeight * 0.6)}px;
          z-index:2147483644;
          font-size:${10 + Math.random() * 8}px;
          pointer-events:none;
          opacity:0.7;
          animation:clawd-float-up ${1.2 + Math.random() * 0.8}s ease-out forwards;
        `;
        el.textContent = pool[Math.floor(Math.random() * pool.length)];
        document.body.appendChild(el);
        this._trackParticle(el, 2200, true);
      }, i * 400);
    }
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

      if (Math.random() < 0.22 && !this.S.settings.performanceMode && !this._reducedMotion) {
        this._spawnWalkDust(2);
      }
      if (progress < 1) {
        this._motionRaf = requestAnimationFrame(step);
      } else {
        this._motionRaf = null;
        this.isAutoWalking = false;
        this.stackNode.style.transform = '';
        this.setState('idle');
        this._softLand();
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

  /* ---------- ANIMAÇÕES / DUO / DWELL ---------- */
  _pulseAnimClass(className, ms = 700) {
    if (!this.node || this._reducedMotion || this.S.settings.performanceMode) return;
    this.node.classList.remove(className);
    void this.node.offsetWidth;
    this.node.classList.add(className);
    clearTimeout(this._animClassTimers?.[className]);
    this._animClassTimers = this._animClassTimers || {};
    this._animClassTimers[className] = setTimeout(() => {
      this.node?.classList.remove(className);
      delete this._animClassTimers[className];
    }, ms);
  }

  _softLand() {
    this._pulseAnimClass('soft-landing', 520);
    this.beep(420, 0.04, 'triangle');
  }

  doLookAround() {
    if (this.state !== 'idle' && this.state !== 'curious') this.setState('idle');
    this._pulseAnimClass('looking-around', 2500);
    this.setStateFor('curious', 2400);
    this.showSpeech(Math.random() < 0.5 ? 'Hmm... 👀' : 'O que tem por aí?', 2000);
    this.beep(560, 0.05, 'sine');
  }

  _maybePlayDuoScene() {
    if (document.hidden || this._destroyed || this._duoBusy || this._dwellBusy) return;
    if (!this.subpet || !this.isVisible || this.isQuiet()) return;
    if (this.S.settings.performanceMode) return;
    if (this.state !== 'idle' || this.isDragging || this.isAutoWalking) return;
    if (this.subpet.state === 'sleeping' || this.subpet._interactionBusy) return;
    if (Math.random() > 0.55) return;
    const scenes = ['cuddle', 'play', 'nap', 'race', 'celebrate', 'pet'];
    const pick = scenes[Math.floor(Math.random() * scenes.length)];
    this._playDuoScene(pick);
  }

  _playDuoScene(kind) {
    if (!this.subpet || this._duoBusy) return false;
    this._duoBusy = true;
    const species = this.subpet.species;
    const finish = (ms = 2800) => {
      clearTimeout(this._duoTimer);
      this._duoTimer = setTimeout(() => {
        this._duoBusy = false;
        this.node?.classList.remove('duo-play', 'petting-subpet');
        this.subpet?.node?.classList.remove('duo-play', 'nap-sync', 'being-petted');
      }, ms);
    };

    switch (kind) {
      case 'cuddle':
        this.setStateFor('hugging', 2200);
        this.showSpeech(species === 'cat' ? 'Acariciando o gato... 🐱' : 'Abraço em duo! 🤗', 2200);
        this.subpet.interact('hug', { force: true });
        this.spawnParticles(['💕', '✨']);
        this.chime([[520, 0.05], [680, 0.06]]);
        finish(2400);
        break;
      case 'play':
        this.node?.classList.add('duo-play');
        this.setStateFor('bouncing', 1800);
        this.showSpeech(species === 'rabbit' ? 'Hop hop juntos! 🐰' : 'Brincadeira em duo! 🎾', 2000);
        this.subpet.interact('play', { force: true });
        this.subpet.node?.classList.add('duo-play');
        this.spawnParticles(['✨', '⭐']);
        this.beep(700, 0.05);
        finish(3200);
        break;
      case 'nap':
        this.showSpeech('Soneca sincronizada... 💤', 2200);
        this.subpet.node?.classList.add('nap-sync');
        this.subpet.interact('nap', { force: true });
        this.setStateFor('yawning', 1800);
        setTimeout(() => {
          if (!this._destroyed && this.state !== 'sleeping') {
            this.setState('sleeping');
            this.showSpeech('ZzZz... 💤', 5000);
          }
        }, 1900);
        this.beep(260, 0.12, 'triangle');
        finish(9000);
        break;
      case 'race':
        this.showSpeech(species === 'dino' ? 'Corrida com o dino! 🦕' : 'Corridinha! 🏁', 1800);
        this.subpet.interact(species === 'dino' ? 'stomp' : 'race', { force: true });
        this.setStateFor('excited', 1600);
        this.beep(780, 0.05);
        finish(3600);
        break;
      case 'celebrate':
        if (species === 'dog') {
          this.setStateFor('cheering', 1800);
          this.showSpeech('Bom menino! 🦴🎉', 2000);
        } else {
          this.setStateFor('celebrate', 2000);
          this.showSpeech('Comemoração em duo! 🎉', 2200);
        }
        this.subpet.interact('celebrate', { force: true });
        this.spawnParticles(['🎉', '✨', '⭐']);
        this.chime([[600, 0.05], [800, 0.07], [960, 0.06]]);
        finish(2200);
        break;
      case 'pet':
      default:
        this.node?.classList.add('petting-subpet');
        this.setStateFor('happy', 2000);
        this.showSpeech(
          species === 'dog' ? 'Fazendo carinho no doguinho... 🐶'
            : species === 'dragon' ? 'Carinho no dragão! 🐉'
            : 'Carinho no companheiro... ✨',
          2200
        );
        this.subpet.node?.classList.add('being-petted');
        this.subpet.interact('cuddle', { force: true });
        this.spawnParticles(['💖', '✨']);
        this.beep(640, 0.05, 'sine');
        this.addXp(1);
        finish(2200);
        break;
    }
    return true;
  }

  _cancelDwellEngage() {
    this._dwellBusy = false;
    clearTimeout(this._dwellWalkTimer);
    clearTimeout(this._dwellActionTimer);
    this._dwellWalkTimer = null;
    this._dwellActionTimer = null;
    this.node?.classList.remove('page-peeking');
  }

  _tickDwellEngage() {
    if (document.hidden || this._destroyed || this._dwellBusy || this._duoBusy) return;
    if (!this.isVisible || this.isQuiet() || this.S.settings.performanceMode) return;
    if (this.state !== 'idle' || this.isDragging || this.isAutoWalking) return;
    const visibleFor = Date.now() - (this._dwellVisibleSince || Date.now());
    if (visibleFor < (this._dwellThresholdMs || 60000)) return;
    if (Date.now() - (this._lastDwellEngage || 0) < 70000) return;
    this._engagePageStructure();
  }

  _isSafePageTarget(el) {
    if (!(el instanceof HTMLElement)) return false;
    if (el.closest('#aic-clawd-node, .aic-subpet, .aic-lake, .aic-toyball, [data-clawd-owned]')) return false;
    if (el.closest('[aria-hidden="true"]')) return false;
    const tag = el.tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') return false;
    const rect = el.getBoundingClientRect();
    if (rect.width < 28 || rect.height < 14) return false;
    if (rect.bottom < 48 || rect.top > window.innerHeight - 40) return false;
    if (rect.right < 20 || rect.left > window.innerWidth - 20) return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
    return true;
  }

  _findPageEngageTargets() {
    const selectors = [
      'h1', 'h2', 'h3',
      'button:not([disabled])',
      'a[href]',
      'img',
      'input:not([type="hidden"]):not([disabled])',
      'textarea:not([disabled])',
      'article', 'main', 'section', 'footer'
    ];
    const found = [];
    for (const sel of selectors) {
      let nodes;
      try { nodes = document.querySelectorAll(sel); } catch (_) { continue; }
      for (const el of nodes) {
        if (!this._isSafePageTarget(el)) continue;
        found.push({
          el,
          kind: sel.startsWith('h') ? 'heading'
            : sel.startsWith('button') ? 'button'
            : sel.startsWith('a') ? 'link'
            : sel.startsWith('img') ? 'image'
            : sel.startsWith('input') || sel.startsWith('textarea') ? 'input'
            : sel === 'footer' ? 'footer'
            : 'block'
        });
        if (found.length >= 24) break;
      }
      if (found.length >= 24) break;
    }
    return found;
  }

  _engagePageStructure({ force = false } = {}) {
    if (this._dwellBusy && !force) return false;
    if (document.hidden || this._destroyed || !this.isVisible || this.isQuiet()) return false;
    if (this.S.settings.performanceMode) return false;
    if (!force && this.state !== 'idle') return false;

    const targets = this._findPageEngageTargets();
    if (!targets.length) return false;

    const pick = targets[Math.floor(Math.random() * targets.length)];
    const rect = pick.el.getBoundingClientRect();
    const petW = this.node.getBoundingClientRect().width || 64;
    const petH = this.node.getBoundingClientRect().height || 72;

    // Posições relativas — nunca cobrir inputs por muito tempo
    let tx; let ty; let behavior;
    switch (pick.kind) {
      case 'heading':
        behavior = 'peek';
        tx = Math.max(12, Math.min(window.innerWidth - petW - 12, rect.left + rect.width * 0.6));
        ty = Math.max(12, Math.min(window.innerHeight - petH - 12, rect.bottom + 8));
        break;
      case 'button':
      case 'link':
        behavior = 'wave';
        tx = Math.max(12, Math.min(window.innerWidth - petW - 12, rect.right + 10));
        ty = Math.max(12, Math.min(window.innerHeight - petH - 12, rect.top + rect.height / 2 - petH / 2));
        break;
      case 'image':
        behavior = 'sit';
        tx = Math.max(12, Math.min(window.innerWidth - petW - 12, rect.left + rect.width / 2 - petW / 2));
        ty = Math.max(12, Math.min(window.innerHeight - petH - 12, rect.bottom - 18));
        break;
      case 'input':
        behavior = 'encourage';
        tx = Math.max(12, Math.min(window.innerWidth - petW - 12, rect.right + 16));
        ty = Math.max(12, Math.min(window.innerHeight - petH - 12, rect.top - 8));
        break;
      case 'footer':
        behavior = 'sleep';
        tx = Math.max(12, Math.min(window.innerWidth - petW - 12, rect.left + 24));
        ty = Math.max(12, Math.min(window.innerHeight - petH - 12, rect.top - petH - 4));
        break;
      default:
        behavior = 'peek';
        tx = Math.max(12, Math.min(window.innerWidth - petW - 12, rect.left - 8));
        ty = Math.max(12, Math.min(window.innerHeight - petH - 12, rect.bottom - 10));
    }

    this._dwellBusy = true;
    this._lastDwellEngage = Date.now();
    this._dwellThresholdMs = 45000 + Math.floor(Math.random() * 45000);
    this._dwellVisibleSince = Date.now(); // reinicia ciclo após engajar

    this.cancelMovement();
    this.isAutoWalking = true;
    this.setState('walking');
    this.showSpeech(
      behavior === 'wave' ? 'Olha esse botão! 👋'
        : behavior === 'sit' ? 'Deixa eu sentar aqui... 🖼️'
        : behavior === 'encourage' ? 'Pode digitar, eu espero! ⌨️'
        : behavior === 'sleep' ? 'Cantinho do rodapé... 💤'
        : 'Deixa eu espiar... 👀',
      2000
    );

    const from = this.node.getBoundingClientRect();
    const dx = tx - from.left;
    const dy = ty - from.top;
    if (dx < 0) this.stackNode.style.transform = 'scaleX(-1)';
    let startTime = null;
    const duration = Math.min(1600, 700 + Math.hypot(dx, dy) * 1.1);

    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      this.updatePosition(from.left + dx * progress, from.top + dy * progress);
      if (progress < 1 && !this._destroyed && !document.hidden) {
        this._dwellWalkTimer = null;
        this._motionRaf = requestAnimationFrame(step);
      } else {
        this._motionRaf = null;
        this.isAutoWalking = false;
        this.stackNode.style.transform = '';
        this.setState('idle');
        this._softLand();
        this._runDwellBehavior(behavior, pick.kind);
      }
    };
    this._motionRaf = requestAnimationFrame(step);
    return true;
  }

  _runDwellBehavior(behavior) {
    if (this._destroyed || document.hidden) {
      this._dwellBusy = false;
      return;
    }
    const release = (ms) => {
      clearTimeout(this._dwellActionTimer);
      this._dwellActionTimer = setTimeout(() => {
        this._dwellBusy = false;
        this.node?.classList.remove('page-peeking');
        // Se dormiu no rodapé, deixa acordar depois
        if (this.state === 'sleeping') {
          setTimeout(() => {
            if (this.state === 'sleeping' && !document.hidden) this.wakeUp('Explorei a página! ✨');
          }, 6000);
        }
      }, ms);
    };

    switch (behavior) {
      case 'wave':
        this.setStateFor('waving', 1800);
        this.showSpeech('Clica aí! ✨', 1600);
        this.beep(720, 0.04);
        if (this.subpet && Math.random() < 0.45) this.subpet.interact('explore', { force: true });
        release(2200);
        break;
      case 'sit':
        this.setStateFor('pose', 2200);
        this.showSpeech('Que vista! 🖼️', 1800);
        this._pulseAnimClass('page-peeking', 2000);
        release(2600);
        break;
      case 'encourage':
        this.setStateFor('typing', 2400);
        this.showSpeech('Você consegue! ⌨️', 2000);
        this.chime([[480, 0.04], [600, 0.05]]);
        release(2800);
        break;
      case 'sleep':
        this.setState('sleeping');
        this.showSpeech('ZzZz no rodapé... 💤', 4000);
        this.beep(250, 0.1, 'triangle');
        release(500);
        break;
      case 'peek':
      default:
        this._pulseAnimClass('page-peeking', 2200);
        this.setStateFor('curious', 2000);
        this.showSpeech('Interessante... 🔎', 1800);
        this.beep(540, 0.05);
        if (this.subpet && Math.random() < 0.4) this.subpet.interact('explore', { force: true });
        release(2400);
        break;
    }
  }

  /* ---------- SUB-PETS ---------- */
  _syncSubpetUnlocks() {
    const level = clawdLevelFromXp(this.S.xp).level;
    let changed = false;
    this.S.subpets.unlocked = Array.isArray(this.S.subpets.unlocked) ? this.S.subpets.unlocked : [];
    Object.entries(CLAWD_SUBPETS).forEach(([id, def]) => {
      if (level >= def.level && !this.S.subpets.unlocked.includes(id)) {
        this.S.subpets.unlocked.push(id);
        changed = true;
      }
    });
    if (!this.S.subpets.unlocked.includes('dog')) {
      this.S.subpets.unlocked.unshift('dog');
      changed = true;
    }
    if (changed) {
      this.S.game.counters.subpetsUnlocked = this.S.subpets.unlocked.length;
      this.save();
    }
  }

  refreshSubpet() {
    this._syncSubpetUnlocks();
    const want = this.S.subpets.active;
    const wantedColor = want ? this.S.subpets.colors?.[want] : null;
    const wantedEyeColor = want ? this.S.subpets.eyeColors?.[want] : null;
    if (!want) {
      if (this.subpet) {
        this.subpet.destroy();
        this.subpet = null;
      }
      return;
    }
    if (this.subpet && this.subpet.species === want) {
      const labelName = this.S.subpets.names?.[want] || CLAWD_SUBPETS[want]?.label || 'Sub-pet';
      this.subpet.node?.setAttribute('aria-label', `${labelName}, sub-pet interativo`);
      if (wantedColor) this.subpet.setColor(wantedColor);
      if (wantedEyeColor) this.subpet.setEyeColor(wantedEyeColor);
    }
    if (this.subpet && this.subpet.species !== want) {
      this.subpet.destroy();
      this.subpet = null;
    }
    if (this.subpet && wantedColor && this.subpet.color !== wantedColor) this.subpet.setColor(wantedColor);
    if (this.subpet && wantedEyeColor && this.subpet.eyeColor !== wantedEyeColor) {
      this.subpet.setEyeColor(wantedEyeColor);
    }
    // Modo performance só reduz FX do pet; sub-pet continua visível.
    const petHidden = this.node.style.display === 'none';
    const unlocked = want && (
      this.S.subpets.unlocked.includes(want)
      || clawdLevelFromXp(this.S.xp).level >= (CLAWD_SUBPETS[want]?.level || 99)
    );
    if (want && unlocked && !this.S.subpets.unlocked.includes(want)) {
      this.S.subpets.unlocked.push(want);
      this.S.game.counters.subpetsUnlocked = this.S.subpets.unlocked.length;
    }
    if (want && !this.subpet && unlocked && this.isVisible && !petHidden) {
      this.subpet = new SubPet(this, want);
      this.subpet.onOwnerState(this.state);
      const name = this.S.subpets.names[want];
      if (name) setTimeout(() => this.subpet && this.subpet.say(`${name}! 🐾`), 1500);
      else setTimeout(() => this.subpet && this.subpet.say(`${CLAWD_SUBPETS[want]?.label || 'Companheiro'}! 🐾`), 900);
    }
  }

  /* ---------- CROSS-TAB (passeio entre abas) ---------- */
  _scrubRuntimeLastError() {
    try {
      // Ler a propriedade (não só referenciar no void) consome o lastError do Chrome.
      const err = chrome.runtime && chrome.runtime.lastError;
      return err ? String(err.message || err) : '';
    } catch (_) {
      return '';
    }
  }

  _safePortPost(msg) {
    const port = this._port;
    if (!port || this._destroyed) return false;
    try {
      port.postMessage(msg);
      this._scrubRuntimeLastError();
      return true;
    } catch (_) {
      this._scrubRuntimeLastError();
      this._port = null;
      return false;
    }
  }

  setupCrossTab() {
    if (!this.S.settings.crossTab || !this._hasExtensionContext()) return;
    if (this._port) return;
    this._scrubRuntimeLastError();
    const port = this._safeChrome(() => chrome.runtime.connect({ name: 'clawd-presence' }));
    this._scrubRuntimeLastError();
    if (!port) return;

    this._port = port;
    this._portSuspended = false;

    this._portMessageListener = this._guardChromeCallback((msg) => this._onPresenceMsg(msg));
    this._portDisconnectListener = () => {
      // Obrigatório: consumir lastError no disconnect (bfcache fecha o canal).
      this._scrubRuntimeLastError();
      if (this._port === port) this._port = null;
      else this._scrubRuntimeLastError();
      if (!this._destroyed && !this._hasExtensionContext()) {
        this._handleExtensionContextInvalidated();
      }
    };
    this._safeChrome(() => port.onDisconnect.addListener(this._portDisconnectListener));
    this._safeChrome(() => port.onMessage.addListener(this._portMessageListener));

    const registered = this._safePortPost({ type: 'register' });
    if (!registered) {
      this._disconnectPresencePort('register-failed');
      return;
    }
    this._bindPresencePortLifecycle();
  }

  _disconnectPresencePort(_reason = '') {
    const port = this._port;
    this._port = null;
    this._scrubRuntimeLastError();
    if (!port) return;

    // Desconecta COM o listener ainda ativo para o Chrome entregar lastError nele.
    try { port.disconnect(); } catch (_) {}
    this._scrubRuntimeLastError();

    try {
      if (this._portMessageListener) port.onMessage.removeListener(this._portMessageListener);
    } catch (_) {}
    try {
      if (this._portDisconnectListener) port.onDisconnect.removeListener(this._portDisconnectListener);
    } catch (_) {}
    this._scrubRuntimeLastError();
  }

  _bindPresencePortLifecycle() {
    if (this._portLifecycleBound || !this._abort) return;
    this._portLifecycleBound = true;
    const { signal } = this._abort;

    // capture:true — sai do canal antes do Chrome empurrar a página para o bfcache.
    window.addEventListener('pagehide', (event) => {
      this._portSuspended = !!event.persisted;
      this._disconnectPresencePort(event.persisted ? 'bfcache' : 'pagehide');
    }, { capture: true, signal });

    window.addEventListener('pageshow', (event) => {
      if (!event.persisted && !this._portSuspended) return;
      this._portSuspended = false;
      if (!this._destroyed && this.S?.settings?.crossTab && !this._port) {
        this.setupCrossTab();
      }
    }, { capture: true, signal });

    document.addEventListener('freeze', () => {
      this._portSuspended = true;
      this._disconnectPresencePort('freeze');
    }, { capture: true, signal });

    document.addEventListener('resume', () => {
      if (!this._destroyed && this.S?.settings?.crossTab && !this._port) {
        this._portSuspended = false;
        this.setupCrossTab();
      }
    }, { capture: true, signal });
  }

  _onPresenceMsg(msg) {
    if (this._destroyed || !this._port) return;
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
          this._safePortPost({ type: 'travelComplete' });
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
      const msg = clawdValidateRuntimeMessage(request);
      if (!msg) return false;
      switch (msg.action) {
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
          if (this.isVisible) this.refreshSubpet();
          else if (this.subpet) this.subpet.node.style.display = 'none';
          break;
        case 'resetPosition':
          this.node.style.cssText += ';left:auto;top:auto;bottom:20px;right:20px;';
          this.S.position = { x: null, y: null };
          this.save();
          break;
        case 'updateConfig':
          this.applyConfig(msg.key, msg.value);
          break;
        case 'updateSetting':
          this.S.settings[msg.key] = msg.value;
          if (msg.key === 'performanceMode') {
            this.node.classList.toggle('aic-nofx', !!msg.value);
            this.refreshSubpet();
          }
          this.save();
          break;
        case 'triggerAction':
          this._handleAction(msg.value);
          break;
        case 'setSubpet': {
          const id = msg.value;
          if (id) {
            const need = CLAWD_SUBPETS[id]?.level || 1;
            const level = clawdLevelFromXp(this.S.xp || 0).level;
            if (!this.S.subpets.unlocked.includes(id)) {
              if (level < need) break;
              this.S.subpets.unlocked.push(id);
              this.S.game.counters.subpetsUnlocked = this.S.subpets.unlocked.length;
            }
          }
          this.S.subpets.active = id;
          this.refreshSubpet();
          // Persiste sem sobrescrever nomes/cores que o popup acabou de gravar no storage
          this._safeChrome(() => chrome.storage.local.get('clawdState', (data) => {
            const st = clawdMigrateState(data?.clawdState);
            st.subpets.active = id;
            st.subpets.unlocked = clawdMergeUnlockedSubpets(
              st.subpets.unlocked,
              this.S.subpets.unlocked
            );
            this.S.subpets.names = clawdAssignPlain({}, st.subpets.names);
            this.S.subpets.colors = clawdAssignPlain({}, st.subpets.colors);
            this.S.subpets.eyeColors = clawdAssignPlain({}, st.subpets.eyeColors);
            this.S.subpets.active = id;
            this.S.subpets.unlocked = st.subpets.unlocked;
            this.S.game.counters.subpetsUnlocked = st.subpets.unlocked.length;
            this.refreshSubpet();
            chrome.storage.local.set({ clawdState: clawdMigrateState(st) });
          }));
          break;
        }
        case 'setSubpetColor':
          this.S.subpets.colors = this.S.subpets.colors || {};
          this.S.subpets.colors[msg.species] = msg.value;
          if (this.subpet && this.subpet.species === msg.species) this.subpet.setColor(msg.value);
          this.save();
          break;
        case 'setSubpetEyeColor':
          this.S.subpets.eyeColors = this.S.subpets.eyeColors || {};
          this.S.subpets.eyeColors[msg.species] = msg.value;
          if (this.subpet && this.subpet.species === msg.species) this.subpet.setEyeColor(msg.value);
          this.save();
          break;
        case 'triggerSubpetAction':
          if (this.subpet) {
            this.subpet.interact(msg.value, { force: true });
            this.registerDaily('subpet');
          }
          break;
        case 'claimDailyQuest':
          sendResponse({ claimed: this.claimDailyQuest(), daily: this.S.daily });
          return true;
        case 'claimWeeklyChallenge':
          sendResponse({ claimed: this.claimWeeklyChallenge(), weekly: clawdEnsureWeeklyChallenge(this.S) });
          return true;
        case 'weeklyReset':
          this.S.weekly = clawdWeeklyChallengeForWeek(clawdISOWeek());
          this._weeklyCelebrated = false;
          this.save();
          break;
        case 'getStatus':
          sendResponse({
            stats: this.S.stats, emotion: this.emotion, state: this.state,
            xp: this.S.xp, coins: this.S.game.coins,
            keepyRecord: this.S.game.counters.keepyRecord || 0,
            fishCaught: this.S.game.counters.fish || 0,
            balloons: this.S.game.counters.balloons || 0,
            balloonsPopped: this.S.game.counters.balloonsPopped || 0,
            holdingBalloon: !!this._balloon,
            fishing: this._fishing,
            profession: this.S.profession,
            pageContext: this._currentPageContext || 'idle',
            daily: clawdEnsureDailyQuest(this.S),
            weekly: clawdEnsureWeeklyChallenge(this.S),
            combo: this._comboCount,
            personality: this.S.personality,
            streakDays: this.S.game?.streak?.days || 0,
            studioOpen: !!this._studioEl?.isConnected,
            subpet: this.subpet ? {
              species: this.subpet.species,
              state: this.subpet.state,
              color: this.subpet.color,
              eyeColor: this.subpet.eyeColor
            } : null
          });
          return true;
        case 'openStudio':
          this.openStudio();
          sendResponse({ ok: true });
          return true;
        case 'closeStudio':
          this.closeStudio();
          sendResponse({ ok: true });
          return true;
      }
      return false;
    });
    this._safeChrome(() => chrome.runtime.onMessage.addListener(this._messageListener));
  }

  openStudio() {
    if (this._destroyed) return;
    if (this._studioEl?.isConnected) {
      this._refreshStudio();
      this._studioEl.classList.add('aic-studio-flash');
      setTimeout(() => this._studioEl?.classList.remove('aic-studio-flash'), 400);
      return;
    }
    const panel = document.createElement('aside');
    panel.id = 'aic-clawd-studio';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', "Studio de personalização do Claw'd");
    panel.innerHTML = `
      <header class="aic-studio-head" data-drag-handle="1">
        <strong>Studio Claw'd</strong>
        <span class="aic-studio-hint">arraste · cantos</span>
        <button type="button" class="aic-studio-close" title="Fechar" aria-label="Fechar studio">×</button>
      </header>
      <div class="aic-studio-corners" role="group" aria-label="Posição do studio">
        <button type="button" data-corner="tl" title="Canto superior esquerdo">↖</button>
        <button type="button" data-corner="tr" title="Canto superior direito">↗</button>
        <button type="button" data-corner="bl" title="Canto inferior esquerdo">↙</button>
        <button type="button" data-corner="br" title="Canto inferior direito">↘</button>
      </div>
      <div class="aic-studio-stats" aria-label="Status do pet"></div>
      <div class="aic-studio-section">
        <span class="aic-studio-label">Cores</span>
        <div class="aic-studio-swatches" data-studio="colors"></div>
      </div>
      <div class="aic-studio-section">
        <span class="aic-studio-label">Rosto</span>
        <div class="aic-studio-chips" data-studio="faces"></div>
      </div>
      <div class="aic-studio-section">
        <span class="aic-studio-label">Pele</span>
        <div class="aic-studio-chips" data-studio="skins"></div>
      </div>
      <p class="aic-studio-foot">Menu completo: ícone da extensão · Janela solta no popup</p>
    `;
    document.documentElement.appendChild(panel);
    this._studioEl = panel;
    this._bindStudio(panel);
    this._applyStudioPosition(panel);
    this._refreshStudio();
  }

  closeStudio() {
    if (this._studioDragCleanup) {
      this._studioDragCleanup();
      this._studioDragCleanup = null;
    }
    if (this._studioEl) {
      this._studioEl.remove();
      this._studioEl = null;
    }
  }

  _bindStudio(panel) {
    panel.querySelector('.aic-studio-close')?.addEventListener('click', () => this.closeStudio());

    panel.querySelectorAll('[data-corner]').forEach(btn => {
      btn.addEventListener('click', () => {
        const corner = btn.dataset.corner;
        this.S.settings.studioCorner = corner;
        panel.style.left = '';
        panel.style.top = '';
        panel.style.right = '';
        panel.style.bottom = '';
        this._applyStudioPosition(panel);
        this.save();
      });
    });

    const head = panel.querySelector('[data-drag-handle]');
    if (head) {
      let dragging = false;
      let startX = 0;
      let startY = 0;
      let originLeft = 0;
      let originTop = 0;
      const onMove = (e) => {
        if (!dragging || !this._studioEl) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        const left = Math.max(8, Math.min(window.innerWidth - panel.offsetWidth - 8, originLeft + dx));
        const top = Math.max(8, Math.min(window.innerHeight - panel.offsetHeight - 8, originTop + dy));
        panel.style.left = `${left}px`;
        panel.style.top = `${top}px`;
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';
        panel.dataset.corner = 'free';
      };
      const onUp = () => {
        if (!dragging) return;
        dragging = false;
        head.classList.remove('dragging');
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        const rect = panel.getBoundingClientRect();
        const leftPct = Math.round((rect.left / window.innerWidth) * 1000) / 10;
        const topPct = Math.round((rect.top / window.innerHeight) * 1000) / 10;
        this.S.settings.studioCorner = 'free';
        this.S.settings.studioLeft = Math.max(0, Math.min(100, leftPct));
        this.S.settings.studioTop = Math.max(0, Math.min(100, topPct));
        this._applyStudioPosition(panel);
        this.save();
      };
      head.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        if (e.target.closest('button')) return;
        dragging = true;
        head.classList.add('dragging');
        startX = e.clientX;
        startY = e.clientY;
        const rect = panel.getBoundingClientRect();
        originLeft = rect.left;
        originTop = rect.top;
        panel.dataset.corner = 'free';
        panel.style.left = `${rect.left}px`;
        panel.style.top = `${rect.top}px`;
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
      });
      this._studioDragCleanup = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };
    }

    panel.addEventListener('click', (e) => {
      const actionBtn = e.target.closest('[data-studio-action]');
      if (actionBtn) {
        const action = actionBtn.dataset.studioAction;
        actionBtn.classList.add('pulse');
        setTimeout(() => actionBtn.classList.remove('pulse'), 400);
        this._handleAction(action);
        setTimeout(() => this._refreshStudioStats(), 350);
        return;
      }
      const colorBtn = e.target.closest('[data-studio-color]');
      if (colorBtn) {
        this.applyConfig('color', colorBtn.dataset.studioColor);
        this._refreshStudio();
        return;
      }
      const faceBtn = e.target.closest('[data-studio-face]');
      if (faceBtn) {
        this.applyConfig('faceStyle', faceBtn.dataset.studioFace);
        this._refreshStudio();
        return;
      }
      const skinBtn = e.target.closest('[data-studio-skin]');
      if (skinBtn) {
        this.applyConfig('skin', skinBtn.dataset.studioSkin);
        this._refreshStudio();
      }
    });
  }

  _applyStudioPosition(panel) {
    if (!panel) return;
    const corner = CLAWD_STUDIO_CORNERS.includes(this.S.settings.studioCorner)
      ? this.S.settings.studioCorner
      : 'br';
    panel.dataset.corner = corner;
    if (corner === 'free') {
      const left = Number.isFinite(this.S.settings.studioLeft) ? this.S.settings.studioLeft : 72;
      const top = Number.isFinite(this.S.settings.studioTop) ? this.S.settings.studioTop : 18;
      panel.style.left = `${left}%`;
      panel.style.top = `${top}%`;
      panel.style.right = 'auto';
      panel.style.bottom = 'auto';
    } else {
      panel.style.left = '';
      panel.style.top = '';
      panel.style.right = '';
      panel.style.bottom = '';
    }
    panel.querySelectorAll('[data-corner]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.corner === corner);
    });
  }

  _refreshStudio() {
    if (!this._studioEl?.isConnected) return;
    this._refreshStudioStats();
    const colorsHost = this._studioEl.querySelector('[data-studio="colors"]');
    if (colorsHost) {
      colorsHost.innerHTML = CLAWD_COLORS.map(c => `
        <button type="button" class="aic-studio-swatch${(this.S.color || '').toLowerCase() === c.toLowerCase() ? ' active' : ''}"
          data-studio-color="${c}" style="--swatch:${c}" title="${c}" aria-label="Cor ${c}"></button>
      `).join('');
    }
    const facesHost = this._studioEl.querySelector('[data-studio="faces"]');
    if (facesHost) {
      facesHost.innerHTML = Object.entries(CLAWD_FACE_STYLES).map(([id, def]) => `
        <button type="button" class="aic-studio-chip${this.S.faceStyle === id ? ' active' : ''}"
          data-studio-face="${id}" title="${def.label || id}">${def.badge || '•'}</button>
      `).join('');
    }
    const skinsHost = this._studioEl.querySelector('[data-studio="skins"]');
    if (skinsHost) {
      skinsHost.innerHTML = Object.entries(CLAWD_SKINS).map(([id, def]) => `
        <button type="button" class="aic-studio-chip${this.S.skin === id ? ' active' : ''}"
          data-studio-skin="${id}" title="${def.label || id}">${(def.label || id).slice(0, 3)}</button>
      `).join('');
    }
  }

  _refreshStudioStats() {
    const host = this._studioEl?.querySelector('.aic-studio-stats');
    if (!host) return;
    const stats = this.S.stats || {};
    const items = [
      { key: 'happiness', action: 'happy', emoji: '❤️', label: 'Felicidade', hint: 'carinho' },
      { key: 'hunger', action: 'feed', emoji: '🍖', label: 'Saciedade', hint: 'alimentar' },
      { key: 'energy', action: 'play', emoji: '⚡', label: 'Energia', hint: 'brincar' },
      { key: 'hygiene', action: 'bath', emoji: '🧼', label: 'Higiene', hint: 'banho' }
    ];
    host.innerHTML = items.map(item => {
      const v = Math.round(stats[item.key] ?? 0);
      const low = v < 30 ? ' low' : '';
      const crit = v < 30 ? ' critical' : (v >= 70 ? ' good' : '');
      return `
        <button type="button" class="aic-studio-stat${crit}" data-studio-action="${item.action}"
          title="${item.label}: ${v}% — clique para ${item.hint}"
          aria-label="${item.label}: ${v}% — clique para ${item.hint}">
          <span aria-hidden="true">${item.emoji}</span>
          <span class="aic-studio-bar"><i class="aic-studio-fill${low}" style="width:${v}%"></i></span>
          <em>${v}%</em>
        </button>`;
    }).join('');
  }

  _handleAction(action) {
    this.lastActivity = Date.now();
    const map = {
      wave:       () => {
        this.setStateFor('waving', 2200);
        this.showSpeech('Oi! 👋');
        this.chime([[600, 0.05], [800, 0.07]], 'actions');
        this.spawnPixelSparks(['#f1c40f', '#ffffff', '#fda7df'], { count: 4 });
      },
      dance:      () => this.doDance(),
      happy:      () => this.giveAffection(),
      feed:       () => this.doFeed(),
      somersault: () => this.doSomersault(),
      play:       () => this.doPlay(),
      pose:       () => this.doPose(),
      bath:       () => this.doBath(),
      sleep:      () => { this.setState('sleeping'); this.showSpeech('ZzZz... 💤', 6000); this.beep(280, 0.15, 'triangle'); },
      wake:       () => this.wakeUp(),
      kick:       () => this.kickBall(),
      keepy:      () => this.startKeepyUppy(),
      fish:       () => this.doFish(),
      jump:       () => this.doJump(),
      stretch:    () => this.doStretch(),
      roar:       () => this.doRoar(),
      highfive:   () => this.doHighFive(),
      superdance: () => this.doSuperDance(),
      spin:       () => this.doSpin(),
      bounce:     () => this.doBounce(),
      wink:       () => this.doWink(),
      cheer:      () => this.doCheer(),
      sneak:      () => this.doSneak(),
      clap:       () => this.doClap(),
      peek:       () => this.doPeek(),
      roll:       () => this.doRoll(),
      balloon:    () => this.doBalloon(),
      hug:        () => this.doHug(),
      lookAround: () => this.doLookAround(),
      /* v3.3: novas ações */
      flip:       () => this.doFlip(),
      meditate:   () => this.doMeditate(),
      electric:   () => this.doElectric(),
      nap:        () => this.doNap()
    };
    if (!map[action]) return false;
    this.cancelMovement();
    clearTimeout(this._pendingCelebrate);
    this._pendingCelebrate = null;
    if (this._fishing && action !== 'fish') this.stopFishing();
    if (this._keepy && action !== 'keepy' && action !== 'kick') this.stopKeepyUppy();
    if (this._balloon && action !== 'balloon') this.popBalloon({ silent: true });

    /* v3.3: combo system — só conta ações interativas (exclui sleep/wake/nap) */
    const comboExcluded = ['sleep', 'wake', 'nap', 'fish', 'keepy', 'kick'];
    if (!comboExcluded.includes(action)) this._tickCombo();

    /* v3.3: XP multiplicador por profissão */
    map[action]();

    /* v3.3: track total de ações */
    const c = this.S.game.counters;
    c.totalActions = (c.totalActions || 0) + 1;

    /* v3.3: speedrun tracking (10 ações em 30s) */
    const now = Date.now();
    if (!this._speedrunTimer) {
      this._speedrunCount = 0;
      this._speedrunTimer = setTimeout(() => {
        this._speedrunTimer = null;
        this._speedrunCount = 0;
      }, 30000);
    }
    this._speedrunCount = (this._speedrunCount || 0) + 1;
    if (this._speedrunCount > (c.maxSpeedrun || 0)) {
      c.maxSpeedrun = this._speedrunCount;
      if (this._speedrunCount >= 10) this.checkAchievements();
    }

    /* v3.3: interações noturnas */
    const hour = new Date().getHours();
    if (hour >= 22 || hour < 6) {
      c.nightInteractions = (c.nightInteractions || 0) + 1;
      if (c.nightInteractions >= 50) this.checkAchievements();
    }

    return true;
  }

  _tickCombo() {
    clearTimeout(this._comboTimer);
    this._comboCount = (this._comboCount || 0) + 1;
    const c = this.S.game.counters;
    if (this._comboCount > (c.maxCombo || 0)) {
      c.maxCombo = this._comboCount;
      if (c.maxCombo >= 5) this.checkAchievements();
    }
    if (this._comboCount >= 5) {
      const gamer = this.S.profession === 'gamer';
      this.showSpeech(gamer ? `COMBO x${this._comboCount}! 🎮🔥` : `Combo x${this._comboCount}! 🔥`, 2000);
      this.spawnParticles(['🔥', '⭐', '✨', '💥']);
      this.addXp(Math.floor(this._comboCount * 0.5));
      this.chime([[600, 0.05], [800, 0.07], [1000, 0.09]]);
    } else if (this._comboCount >= 3) {
      this.showSpeech(`Combo x${this._comboCount}! ✨`, 1400);
      this.spawnParticles(['✨', '⭐']);
    }
    /* daily/weekly quest de combo — uma vez por tick quando ≥ 3 */
    if (this._comboCount >= 3) this.registerDaily('combo');
    this._comboTimer = setTimeout(() => {
      this._comboCount = 0;
    }, this._comboWindowMs);
  }

  /* ---------- NOVAS AÇÕES v3.3 ---------- */
  doFlip() {
    if (this.state === 'sleeping') this.wakeUp();
    this._pulseAnimClass('flipping', 1000);
    this.setStateFor('somersault', 900);
    this.showSpeech('Acrobacia! 🔄', 1400);
    this.spawnParticles(['🌀', '✨', '💫']);
    this.bumpStat('energy', -3);
    this.bumpStat('happiness', 4);
    this.addXp(3);
    this.chime([[500, 0.05], [750, 0.06], [1000, 0.07]]);
    if (this.subpet && Math.random() < 0.4) this.subpet.interact('spin', { force: true });
  }

  doMeditate() {
    if (this.state === 'sleeping') this.wakeUp();
    this._pulseAnimClass('meditating', 4000);
    this.setStateFor('pose', 4000);
    this.showSpeech('🧘 Concentrando energia...', 4000);
    const isArtist = this.S.profession === 'artist';
    this.spawnParticles(isArtist ? ['⭐', '🌟', '✨', '🎨'] : ['✨', '🌟', '💫', '🌙']);
    this.bumpStat('energy', 12);
    this.bumpStat('happiness', 5);
    this.addXp(isArtist ? 8 : 5);
    this.beep(220, 0.08, 'sine');
    setTimeout(() => {
      if (!this._destroyed) this.beep(330, 0.06, 'sine');
    }, 1000);
    setTimeout(() => {
      if (!this._destroyed) this.beep(440, 0.05, 'sine');
    }, 2000);
  }

  doElectric() {
    if (this.state === 'sleeping') this.wakeUp();
    this._pulseAnimClass('electrified', 800);
    this.setStateFor('excited', 1200);
    this.showSpeech('⚡ Descarga elétrica!', 1600);
    this.spawnParticles(['⚡', '💥', '✨', '🔆']);
    this.spawnPixelSparks(['#f1c40f', '#e67e22', '#3498db', '#ffffff']);
    this.bumpStat('energy', 8);
    this.addXp(3);
    this.beep(800, 0.15, 'square');
    setTimeout(() => { if (!this._destroyed) this.beep(600, 0.1, 'sawtooth'); }, 80);
    setTimeout(() => { if (!this._destroyed) this.beep(400, 0.12, 'square'); }, 160);
    if (this.subpet && Math.random() < 0.5) this.subpet.interact('spin', { force: true });
  }

  doNap() {
    if (this.state === 'sleeping') { this.wakeUp(); return; }
    this.setState('sleeping');
    this.showSpeech('💤 Cochilando rápido...', 5500);
    this.beep(280, 0.12, 'triangle');
    this.bumpStat('energy', 18);
    this.addXp(2);
    /* Acorda automaticamente após 5 segundos */
    setTimeout(() => {
      if (!this._destroyed && this.state === 'sleeping') {
        this.wakeUp();
        this.showSpeech('Descansado! ☀️', 1800);
        this.chime([[500, 0.04], [700, 0.06]]);
      }
    }, 5000);
  }

  destroy({ skipExtensionApis = false } = {}) {
    if (this._destroyed) return;
    this._destroyed = true;

    this._abort.abort();
    this._timers.forEach(clearInterval);
    this._timers.length = 0;
    (this._ctxTimers || []).forEach(clearInterval);
    if (this._ctxTimers) this._ctxTimers.length = 0;

    [
      '_speechTimer', '_stateTimer', '_saveTimer', '_clickTimer', '_holdTimer',
      '_wakeStretchTimer', '_fishTimer', '_fishBiteTimer', '_fishCatchTimer',
      '_emotionTimer', '_shinyTimer', '_keepy', '_juggleDrop', '_juggleIdleTimer',
      '_profFxTimer', '_equipFxTimer', '_accEquipTimer', '_freestyleTimer', '_balloonTimer', '_balloonPopFx',
      '_pendingCelebrate', '_duoTimer', '_dwellWalkTimer', '_dwellActionTimer',
      /* v3.3 */
      '_comboTimer', '_speedrunTimer', '_ambientWeatherTimer',
      /* v3.4 / tick5 */
      '_idleVarTimer', '_idleVarClearTimer', '_scrollIdleTimer', '_ballClickTimer'
    ].forEach(key => {
      clearTimeout(this[key]);
      this[key] = null;
    });
    if (this._particleTimers) {
      this._particleTimers.forEach(clearTimeout);
      this._particleTimers.clear();
    }
    this._activeParticles = 0;
    this._saveInFlight = false;
    this._saveDirty = false;
    if (this._animClassTimers) {
      Object.values(this._animClassTimers).forEach(clearTimeout);
      this._animClassTimers = {};
    }
    this._cancelDwellEngage();
    this._duoBusy = false;

    if (this._balloon) this.popBalloon({ silent: true });

    cancelAnimationFrame(this._refreshMeasureRaf);
    cancelAnimationFrame(this._motionRaf);
    cancelAnimationFrame(this._glideRaf);
    cancelAnimationFrame(this._lookRaf);
    this._refreshMeasureRaf = null;
    this._motionRaf = null;
    this._glideRaf = null;
    this._lookRaf = null;

    if (!skipExtensionApis && this._hasExtensionContext()) {
      if (this._storageListener) {
        clawdSafeExtensionCall(globalThis.chrome, () => chrome.storage.onChanged.removeListener(this._storageListener));
      }
      if (this._messageListener) {
        clawdSafeExtensionCall(globalThis.chrome, () => chrome.runtime.onMessage.removeListener(this._messageListener));
      }
    }
    this._disconnectPresencePort('destroy');
    if (this._audioCtx && this._audioCtx.state !== 'closed') {
      try { this._audioCtx.close(); } catch (_) {}
      this._audioCtx = null;
    }
    this._audioAllowed = false;

    if (this.subpet) {
      this.subpet.destroy();
      this.subpet = null;
    }

    this.closeStudio();

    document.querySelectorAll(CLAWD_DOM_CLEANUP_SELECTORS).forEach(el => el.remove());

    /* v3.4: remover event listeners novos */
    if (this._scrollHandler) {
      window.removeEventListener('scroll', this._scrollHandler, { passive: true });
      this._scrollHandler = null;
    }
    if (this._visibilityHandler) {
      document.removeEventListener('visibilitychange', this._visibilityHandler);
      this._visibilityHandler = null;
    }
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
    document.querySelectorAll(CLAWD_DOM_CLEANUP_SELECTORS).forEach(el => el.remove());
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
    if (clawdHostIsBlocked(host, state.settings.blockedSites)) return;
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
