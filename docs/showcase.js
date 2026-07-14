(() => {
  'use strict';

  const professions = globalThis.CLAWD_PROFESSIONS || {};
  const accessories = globalThis.CLAWD_ACCESSORIES || {};
  const actions = globalThis.CLAWD_ACTIONS || {};
  const subpets = globalThis.CLAWD_SUBPETS || {};
  const subpetActions = globalThis.CLAWD_SUBPET_ACTIONS || {};

  const $ = id => document.getElementById(id);

  const capabilities = [
    { icon: '◫', code: 'MOTION / RAF', title: 'Movimento fluido', text: 'Animação sincronizada por requestAnimationFrame, inércia, colisão de bordas e cadência ajustada aos Hz reais do navegador.' },
    { icon: '◉', code: 'STATE / EMOTION', title: 'Personalidade visível', text: 'Felicidade, fome, energia e higiene alteram olhos, boca, balões, falas e comportamentos espontâneos.' },
    { icon: '⌁', code: 'LOCAL / PRIVATE', title: 'Progresso local', text: 'XP, cosméticos e preferências permanecem no dispositivo com migração de schema e sem telemetria.' }
  ];

  const featureLedger = [
    ['🎣', 'Pesca completa', 'Lago pixelado, vara, linha, fisgada, captura e raridade de peixe.'],
    ['⚽', 'Física de bola', 'Chute, gol, embaixadinhas, recordes e busca pelo cachorro.'],
    ['🧠', 'Emoções contextuais', 'Expressões e falas derivadas das necessidades e da atividade.'],
    ['🛝', 'Deslizamento', 'Arraste com inércia sobre a página e desaceleração progressiva.'],
    ['🧳', 'Passeio entre abas', 'Presença coordenada para manter apenas um anfitrião ativo.'],
    ['🏆', 'Gamificação', 'Níveis, PixelCoins, loja, conquistas, streak e missão diária.'],
    ['💤', 'Sono e despertar', 'Pet e subpet descansam e acordam com ações visuais próprias.'],
    ['🎨', 'Render duplo', 'Pixel-art fiel ou silhueta lisa contínua, ambos personalizáveis.'],
    ['⌨️', 'Acessível por entrada', 'Mouse, teclado, touch e preferência de movimento reduzido.'],
    ['🧹', 'Reload seguro', 'Destruição idempotente, token de boot e reconciliação de órfãos.']
  ];

  const subpetSprites = {
    dog:    { body: '#8d5a2b', shade: '#5b3a1a', extra: { W: '#f5e9dc' }, frame: ['D......D', 'DBBBBBBD', 'BKBBBBKB', 'BBBWWBBB', '.B..B.B.'] },
    cat:    { body: '#7f8c8d', shade: '#525c5d', extra: { P: '#e8a0bf' }, frame: ['D..D....', 'DBBBBBB.', 'BKBBKBB.', 'BBPBBBBD', '.B..B...'] },
    bird:   { body: '#f1c40f', shade: '#e67e22', extra: { W: '#ffffff' }, frame: ['..BBB...', '.BKBBB..', 'DBBBBB..', '.BDDB...', '..D.D...'] },
    rabbit: { body: '#ecf0f1', shade: '#bdc3c7', extra: { P: '#fbb1c8' }, frame: ['.D..D...', '.B..B...', 'BBBBBB..', 'BKBBKB..', 'BBPBBB..'] },
    dino:   { body: '#27ae60', shade: '#1e8449', extra: { W: '#f4d03f' }, frame: ['.BBBB...', '.BKBB...', 'DBBBBBB.', '.BBBBBBD', '.B...B..'] },
    dragon: { body: '#8e44ad', shade: '#5b2c6f', extra: { F: '#e74c3c' }, frame: ['D.BBBB..', '.DBKBB..', 'DBBBBBB.', '.BBBBBBD', '.B...B..'] },
    ghost:  { body: '#ecf0f1', shade: '#bdc3c7', extra: {}, frame: ['.BBBBB..', 'BBKBKBB.', 'BBBBBBB.', 'BBBBBBB.', 'B.B.B.B.'] },
    slime:  { body: '#2ecc71', shade: '#27ae60', extra: {}, frame: ['..BBBB..', '.BBBBBB.', 'BBKBBKBB', 'BDBBBBDB', 'BBBBBBBB'] }
  };

  const subpetSpecialSpeech = {
    dog: 'Au au! Eu busco a bola! 🦴',
    cat: 'Miau... talvez eu coopere. 😼',
    bird: 'Piu piu! Voo orbital! 🎶',
    rabbit: 'Hop hop! Salto sincronizado! 🐰',
    dino: 'RAWR! Corrida jurássica! 🦖',
    dragon: 'Sopro de fogo pixelado! 🔥',
    ghost: 'Buu! Agora você me vê... 👻',
    slime: 'Blub! Divisão gelatinosa! 🫧'
  };

  const speciesColors = Object.fromEntries(
    Object.entries(subpetSprites).map(([id, sprite]) => [id, { body: sprite.body, eyes: '#111111' }])
  );
  speciesColors.dog.eyes = '#33ff99';

  function makeElement(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function renderCapabilities() {
    const grid = $('capability-grid');
    capabilities.forEach(item => {
      const card = makeElement('article', 'capability-card');
      const icon = makeElement('span', 'capability-icon', item.icon);
      icon.setAttribute('aria-hidden', 'true');
      card.append(icon, makeElement('small', '', item.code), makeElement('h3', '', item.title), makeElement('p', '', item.text));
      grid.appendChild(card);
    });
  }

  function renderProfessions() {
    const grid = $('profession-grid');
    Object.entries(professions).forEach(([id, item], index) => {
      const card = makeElement('article', 'profession-card');
      card.dataset.profession = id;
      card.append(
        makeElement('span', 'catalog-emoji', item.emoji),
        makeElement('small', '', String(index + 1).padStart(2, '0')),
        makeElement('h4', '', item.label),
        makeElement('p', '', item.desc)
      );
      grid.appendChild(card);
    });
    $('profession-count').textContent = String(Object.keys(professions).length).padStart(2, '0');
  }

  function renderAccessories() {
    const grid = $('accessory-grid');
    Object.entries(accessories).forEach(([id, item]) => {
      const card = makeElement('article', 'accessory-card');
      card.dataset.slot = item.slot;
      card.dataset.accessory = id;
      card.append(
        makeElement('small', '', item.slot === 'head' ? 'cabeça' : 'rosto'),
        makeElement('span', 'catalog-emoji', item.emoji),
        makeElement('h4', '', item.label),
        makeElement('p', '', item.desc)
      );
      grid.appendChild(card);
    });
    $('accessory-count').textContent = String(Object.keys(accessories).length).padStart(2, '0');
    $('accessory-filters').addEventListener('click', event => {
      const button = event.target.closest('button[data-filter]');
      if (!button) return;
      const filter = button.dataset.filter;
      $('accessory-filters').querySelectorAll('button').forEach(item => item.classList.toggle('active', item === button));
      grid.querySelectorAll('.accessory-card').forEach(card => {
        card.hidden = filter !== 'all' && card.dataset.slot !== filter;
      });
    });
  }

  function renderActions() {
    const catalog = $('action-catalog');
    Object.values(actions).forEach(item => {
      const pill = makeElement('span', 'action-pill');
      pill.append(makeElement('b', '', item.emoji), document.createTextNode(item.label));
      catalog.appendChild(pill);
    });
    $('action-count').textContent = String(Object.keys(actions).length).padStart(2, '0');
  }

  function renderFeatureLedger() {
    const ledger = $('feature-ledger');
    featureLedger.forEach(([emoji, title, text]) => {
      const item = makeElement('article', 'ledger-item');
      const copy = makeElement('div');
      copy.append(makeElement('b', '', title), makeElement('p', '', text));
      item.append(makeElement('span', '', emoji), copy);
      ledger.appendChild(item);
    });
  }

  function setupMainPetLab() {
    const pet = $('doc-main-pet');
    const emotion = $('lab-emotion');
    const accessory = $('doc-accessory');
    const bodyColor = $('lab-body-color');
    const renderMode = $('lab-render-mode');
    const mouth = $('lab-mouth');
    const accessorySelect = $('lab-accessory');
    let moodTimer = null;
    const accessoryEmoji = { none: '', cap: '🧢', fishhat: '🎣', crown: '👑', sunglasses: '🕶️', headphones: '🎧' };

    bodyColor.addEventListener('input', () => {
      pet.style.setProperty('--agent-color', bodyColor.value);
      pet.setAttribute('aria-label', `Prévia do Claw'd na cor ${bodyColor.value}`);
    });
    renderMode.addEventListener('change', () => {
      const smooth = renderMode.value === 'smooth';
      pet.classList.toggle('smooth', smooth);
      $('lab-mode-label').textContent = smooth ? 'LISO · SEM GRADE' : 'PIXEL';
    });
    mouth.addEventListener('change', () => pet.classList.toggle('mouth-off', !mouth.checked));
    accessorySelect.addEventListener('change', () => {
      accessory.textContent = accessoryEmoji[accessorySelect.value] || '';
      accessory.dataset.item = accessorySelect.value;
    });

    $('lab-main-actions').addEventListener('click', event => {
      const button = event.target.closest('button[data-mood]');
      if (!button) return;
      clearTimeout(moodTimer);
      pet.classList.remove('mood-happy', 'mood-sleep', 'mood-wave', 'mood-love');
      void pet.offsetWidth;
      pet.classList.add(`mood-${button.dataset.mood}`);
      emotion.textContent = button.dataset.emoji;
      emotion.classList.add('visible');
      moodTimer = setTimeout(() => {
        pet.classList.remove('mood-happy', 'mood-sleep', 'mood-wave', 'mood-love');
        emotion.classList.remove('visible');
      }, button.dataset.mood === 'sleep' ? 2400 : 1700);
    });
  }

  function shadeColor(hex, factor = 0.68) {
    const match = String(hex).match(/^#([\da-f]{6})$/i);
    if (!match) return hex;
    const values = match[1].match(/[\da-f]{2}/gi).map(value => Math.round(parseInt(value, 16) * factor));
    return `#${values.map(value => value.toString(16).padStart(2, '0')).join('')}`;
  }

  function paintSubpet(species) {
    const preview = $('subpet-preview');
    const sprite = subpetSprites[species] || subpetSprites.dog;
    const colors = speciesColors[species] || speciesColors.dog;
    const palette = { B: colors.body, D: shadeColor(colors.body), K: colors.eyes, ...sprite.extra };
    preview.replaceChildren();
    sprite.frame.forEach(row => {
      [...row].forEach(symbol => {
        const pixel = document.createElement('span');
        if (palette[symbol]) pixel.style.backgroundColor = palette[symbol];
        preview.appendChild(pixel);
      });
    });
    const nickname = $('subpet-nickname').value.trim();
    const label = subpets[species]?.label || species;
    preview.setAttribute('aria-label', `${nickname || label}, ${label}, olhos ${colors.eyes}`);
    $('subpet-species-label').textContent = `${label.toUpperCase()} · LV. ${subpets[species]?.level || 1}`;
    $('subpet-special').textContent = `Habilidade: ${subpets[species]?.special || 'interação especial'}`;
    $('subpet-roster').querySelectorAll('button').forEach(button => button.classList.toggle('active', button.dataset.species === species));
  }

  function setupSubpetLab() {
    const select = $('subpet-species');
    const roster = $('subpet-roster');
    const actionGrid = $('subpet-actions');
    const preview = $('subpet-preview');
    const bubble = $('subpet-bubble');
    let actionTimer = null;

    Object.entries(subpets).forEach(([id, item]) => {
      const option = document.createElement('option');
      option.value = id;
      option.textContent = `${item.emoji} ${item.label}`;
      select.appendChild(option);

      const button = makeElement('button');
      button.type = 'button';
      button.dataset.species = id;
      button.setAttribute('aria-label', `Selecionar ${item.label}`);
      button.append(makeElement('span', '', item.emoji), makeElement('b', '', item.label));
      roster.appendChild(button);
    });

    Object.entries(subpetActions).forEach(([id, item]) => {
      const button = makeElement('button');
      button.type = 'button';
      button.dataset.action = id;
      button.title = item.feedback;
      button.append(makeElement('span', '', item.emoji), makeElement('b', '', item.label));
      actionGrid.appendChild(button);
    });

    function selectSpecies(species) {
      const sprite = subpetSprites[species] || subpetSprites.dog;
      const colors = speciesColors[species] || { body: sprite.body, eyes: '#111111' };
      select.value = species;
      $('subpet-body-color').value = colors.body;
      $('subpet-eye-color').value = colors.eyes;
      paintSubpet(species);
    }

    select.addEventListener('change', () => selectSpecies(select.value));
    roster.addEventListener('click', event => {
      const button = event.target.closest('button[data-species]');
      if (button) selectSpecies(button.dataset.species);
    });
    $('subpet-body-color').addEventListener('input', event => {
      speciesColors[select.value].body = event.target.value;
      paintSubpet(select.value);
    });
    $('subpet-eye-color').addEventListener('input', event => {
      speciesColors[select.value].eyes = event.target.value;
      paintSubpet(select.value);
      bubble.textContent = `Olhos atualizados para ${event.target.value} ✨`;
    });
    $('subpet-nickname').addEventListener('input', () => paintSubpet(select.value));
    actionGrid.addEventListener('click', event => {
      const button = event.target.closest('button[data-action]');
      if (!button) return;
      const action = button.dataset.action;
      const item = subpetActions[action];
      const nickname = $('subpet-nickname').value.trim() || subpets[select.value]?.label || 'Sub-pet';
      clearTimeout(actionTimer);
      preview.className = 'subpet-preview';
      void preview.offsetWidth;
      preview.classList.add(`is-${action}`);
      bubble.textContent = action === 'special'
        ? `${nickname}: ${subpetSpecialSpeech[select.value]}`
        : `${item.emoji} ${nickname}: ${item.feedback}`;
      actionTimer = setTimeout(() => {
        preview.className = 'subpet-preview';
        bubble.textContent = `${nickname} está acordado e pronto!`;
      }, 2100);
    });

    selectSpecies('dog');
  }

  function setupReveal() {
    const targets = [...document.querySelectorAll('.reveal')];
    if (!('IntersectionObserver' in window)) return;
    targets.forEach(target => target.classList.add('pending'));
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -45px' });
    targets.forEach(target => observer.observe(target));
  }

  function setupReadingProgress() {
    const fill = $('reading-progress-fill');
    let scheduled = false;
    const update = () => {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      fill.style.width = `${Math.min(100, Math.max(0, window.scrollY / max * 100))}%`;
      scheduled = false;
    };
    window.addEventListener('scroll', () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(update);
    }, { passive: true });
    update();
  }

  function syncMetrics() {
    const counts = [Object.keys(actions).length, Object.keys(accessories).length, Object.keys(professions).length, Object.keys(subpets).length, Object.keys(subpetActions).length];
    document.querySelectorAll('.metrics strong').forEach((node, index) => {
      if (counts[index]) node.textContent = counts[index];
    });
  }

  renderCapabilities();
  renderProfessions();
  renderAccessories();
  renderActions();
  renderFeatureLedger();
  setupMainPetLab();
  setupSubpetLab();
  syncMetrics();
  setupReveal();
  setupReadingProgress();
})();
