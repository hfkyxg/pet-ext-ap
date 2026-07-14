(() => {
  'use strict';

  const professions = globalThis.CLAWD_PROFESSIONS || {};
  const accessories = globalThis.CLAWD_ACCESSORIES || {};
  const models = globalThis.CLAWD_MODELS || {};
  const faceStyles = globalThis.CLAWD_FACE_STYLES || {};
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

  const DEMO_STEP_MS = 2500;
  const DEMO_STEPS = [
    { scene: 'popin', group: 'presence', title: 'Pop-in e boas-vindas', detail: 'O pet entra com animação, anuncia sua presença e permanece fora do fluxo do documento.', speech: 'Aqui para ajudar! 👋', emoji: '✨', featured: true },
    { scene: 'perspective', group: 'presence', title: 'Perspectiva 3D', detail: 'A inclinação acompanha o cursor com suavidade sem deslocar o conteúdo da página.', speech: 'Estou de olho no cursor 👀', emoji: '↔' },
    { scene: 'affection', group: 'presence', title: 'Carinho e emoção', detail: 'Clique, touch ou teclado ativam felicidade, balão de emoji, partículas e progressão.', speech: 'Yay! +5 XP 💖', emoji: '💖' },
    { scene: 'wave', group: 'states', title: 'Acenar', detail: 'Uma ação imediata muda a pose do corpo sem iniciar o ciclo de caminhada das pernas.', speech: 'Oi! 👋', emoji: '👋' },
    { scene: 'dance', group: 'states', title: 'Dançar', detail: 'Sequências curtas combinam balanço, partículas e fala sem bloquear novas interações.', speech: 'Vem dançar! 🕺', emoji: '🎵' },
    { scene: 'scroll', group: 'states', title: 'Reação ao scroll', detail: 'A rolagem deixa o pet animado por um instante e o estado volta ao normal sozinho.', speech: 'Uhuu, página nova!', emoji: '⚡' },
    { scene: 'walk', group: 'states', title: 'Passeio autônomo', detail: 'O pet escolhe um destino, vira para o lado correto e só move as pernas durante o deslocamento.', speech: 'Vou dar uma volta 🐾', emoji: '🐾' },
    { scene: 'glide', group: 'states', title: 'Arrastar e deslizar', detail: 'Pointer Events reposicionam o pet; ao soltar com velocidade, a inércia desacelera e respeita as bordas.', speech: 'Wheee! 🛝', emoji: '💨' },
    { scene: 'sleep', group: 'states', title: 'Dormir', detail: 'Inatividade fecha os olhos, reduz a intensidade visual e exibe o balão de sono.', speech: 'ZzzZ... 💤', emoji: '💤' },
    { scene: 'wake', group: 'states', title: 'Acordar e esticar', detail: 'Uma interação acorda o pet ou subpet primeiro e executa uma animação de alongamento.', speech: 'Bom dia! ☀️', emoji: '☀️' },
    { scene: 'fisher', group: 'professions', title: 'Profissão Pescador', detail: 'Chapéu, vara e lago formam uma cena própria; a linha permanece ativa enquanto ele espera.', speech: 'Silêncio... está mordendo 🎣', emoji: '🎣', accessory: 'fishhat', accessoryEmoji: '🎣', featured: true },
    { scene: 'catch', group: 'professions', title: 'Fisgada e captura', detail: 'A fisgada manual ou automática lança o peixe, registra a raridade e recompensa a brincadeira.', speech: 'Peguei um peixe raro! 🐟', emoji: '🐟' },
    { scene: 'football', group: 'professions', title: 'Bola jogável', detail: 'Na profissão Jogador, a bola responde ao clique, gira, viaja até o gol e concede XP.', speech: 'Chuta essa! ⚽', emoji: '⚽', prop: '⚽', accessory: 'cap', accessoryEmoji: '🧢' },
    { scene: 'hattrick', group: 'professions', title: 'Hat-trick e level up', detail: 'Combos de gols acionam bônus, partículas e celebrações de progressão sem duplicar recompensas.', speech: 'HAT-TRICK! +20 XP 🏆', emoji: '🏆', prop: '⚽ ⭐' },
    { scene: 'tutor', group: 'professions', title: 'Desafio do Tutor', detail: 'O Tutor cria um desafio curto na página, aceita resposta e devolve feedback com recompensa.', speech: 'Quanto é 7 × 3?', emoji: '🧠', prop: '7 × 3 = ?', accessory: 'glasses', accessoryEmoji: '👓' },
    { scene: 'accessory', group: 'customization', title: 'Acessórios em camadas', detail: 'Quatorze itens ocupam slots de cabeça ou rosto e acompanham pose, escala e movimento.', speech: 'Meu visual, minhas regras ✨', emoji: '👑', accessory: 'crown', accessoryEmoji: '👑', featured: true },
    { scene: 'smooth', group: 'customization', title: 'Modo liso real', detail: 'A grade de pixels some e dá lugar à mesma silhueta em superfícies contínuas, sem transformar o pet em slime.', speech: 'Liso, mas ainda sou eu!', emoji: '◉', smooth: true },
    { scene: 'subpet', group: 'customization', title: 'Subpet acordado e especial', detail: 'Apelido, corpo e olhos são independentes; carinho, brincadeira e habilidade especial acordam o companheiro.', speech: 'Rex: pronto para brincar! 🐶', emoji: '✨', subpet: true }
  ];

  const EVIDENCE_SECTIONS = [
    { id: 'presence', label: 'Presença na página', title: 'Entrada, perspectiva e carinho', text: 'Primeiro contato claro, responsivo e sem interferir no layout.' },
    { id: 'states', label: 'Estados', title: 'Reações e comportamento autônomo', text: 'Ações manuais e decisões do pet com início, feedback e retorno ao repouso.' },
    { id: 'professions', label: 'Profissões e gamificação', title: 'Pesca, futebol, desafios e progresso', text: 'Cenas próprias transformam cada profissão em uma atividade reconhecível.' },
    { id: 'customization', label: 'Personalização', title: 'Acessórios, modo liso e subpets', text: 'Camadas independentes preservam identidade, legibilidade e liberdade de escolha.' }
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
      const preview = makeElement('div', 'accessory-catalog-preview');
      const previewPet = $('demo-pet').cloneNode(true);
      const previewAccessory = previewPet.querySelector('.scene-accessory');
      previewPet.removeAttribute('id');
      previewPet.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
      previewPet.className = 'scene-pet accessory-catalog-pet';
      previewPet.removeAttribute('role');
      previewPet.setAttribute('aria-hidden', 'true');
      previewPet.dataset.accHead = item.slot === 'head' ? id : 'none';
      previewPet.dataset.accFace = item.slot === 'face' ? id : 'none';
      previewAccessory.textContent = '';
      previewAccessory.className = `accessory ${item.slot === 'head' ? 'acc-head' : 'acc-face'}`;
      previewAccessory.removeAttribute('data-item');
      preview.appendChild(previewPet);
      card.dataset.slot = item.slot;
      card.dataset.accessory = id;
      card.append(
        makeElement('small', '', item.slot === 'head' ? 'cabeça' : 'rosto'),
        preview,
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

  function formatDemoTime(milliseconds) {
    const seconds = Math.round(milliseconds / 1000);
    return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  }

  function applyDemoScene(container, step, restartAnimation = false) {
    const pet = container.querySelector('.scene-pet');
    const speech = container.querySelector('.scene-speech');
    const emoji = container.querySelector('.scene-emoji');
    const accessory = container.querySelector('.scene-accessory');
    const prop = container.querySelector('.scene-prop');
    const subpet = container.querySelector('.scene-subpet');

    if (restartAnimation) {
      container.removeAttribute('data-scene');
      void container.offsetWidth;
    }
    container.dataset.scene = step.scene;
    pet.classList.toggle('is-smooth', Boolean(step.smooth));
    pet.setAttribute('aria-label', `Claw'd — ${step.title}`);
    speech.textContent = step.speech || '';
    speech.hidden = !step.speech;
    emoji.textContent = step.emoji || '';
    emoji.hidden = !step.emoji;
    emoji.classList.toggle('visible', Boolean(step.emoji));
    accessory.textContent = step.accessoryEmoji || '';
    accessory.dataset.item = step.accessory || 'none';
    accessory.hidden = !step.accessory;
    prop.textContent = step.prop || '';
    prop.hidden = !step.prop && step.scene !== 'fisher' && step.scene !== 'catch';
    subpet.hidden = !step.subpet;
  }

  function renderEvidenceStoryboard() {
    const root = $('evidence-groups');
    const template = $('demo-stage');

    EVIDENCE_SECTIONS.forEach(section => {
      const group = makeElement('section', 'evidence-group reveal');
      const heading = makeElement('div', 'evidence-group-header');
      const grid = makeElement('div', 'evidence-card-grid');
      heading.append(
        makeElement('small', '', section.label),
        makeElement('h4', '', section.title),
        makeElement('p', '', section.text)
      );

      DEMO_STEPS.forEach((step, index) => {
        if (step.group !== section.id) return;
        const number = String(index + 1).padStart(2, '0');
        const card = document.createElement('figure');
        card.className = `evidence-card${step.featured ? ' featured' : ''}`;
        const shot = template.cloneNode(true);
        shot.className = 'evidence-shot';
        shot.removeAttribute('id');
        shot.removeAttribute('tabindex');
        shot.setAttribute('aria-label', `Demonstração visual: ${step.title}`);
        shot.querySelector('.demo-browser-chrome')?.remove();
        shot.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
        shot.querySelectorAll('[aria-live]').forEach(node => node.removeAttribute('aria-live'));
        const pill = makeElement('span', 'evidence-step-pill', `${number} · ${step.title}`);
        shot.prepend(pill);
        applyDemoScene(shot, step);

        const caption = document.createElement('figcaption');
        caption.append(
          makeElement('span', '', `${number} · `),
          makeElement('b', '', step.title),
          document.createTextNode(` — ${step.detail}`)
        );
        card.append(shot, caption);
        grid.appendChild(card);
      });

      group.append(heading, grid);
      root.appendChild(group);
    });
  }

  function setupDemoEvidence() {
    const stage = $('demo-stage');
    const progress = $('demo-progress');
    const toggle = $('demo-toggle');
    const nav = $('demo-step-nav');
    const totalDuration = DEMO_STEPS.length * DEMO_STEP_MS;
    let currentIndex = 0;
    let timer = null;

    progress.max = String(DEMO_STEPS.length - 1);

    DEMO_STEPS.forEach((step, index) => {
      const button = makeElement('button', '', String(index + 1).padStart(2, '0'));
      button.type = 'button';
      button.role = 'tab';
      button.dataset.step = String(index);
      button.title = step.title;
      button.setAttribute('aria-controls', 'demo-stage');
      button.setAttribute('aria-label', `Etapa ${index + 1}: ${step.title}`);
      nav.appendChild(button);
    });

    function syncPlaybackButton() {
      const playing = timer !== null;
      toggle.setAttribute('aria-pressed', String(playing));
      $('demo-toggle-icon').textContent = playing ? 'Ⅱ' : '▶';
      $('demo-toggle-label').textContent = playing ? 'Pausar' : 'Reproduzir';
    }

    function pause() {
      if (timer !== null) clearInterval(timer);
      timer = null;
      syncPlaybackButton();
    }

    function renderStep(index, restartAnimation = true) {
      currentIndex = Math.min(DEMO_STEPS.length - 1, Math.max(0, index));
      const step = DEMO_STEPS[currentIndex];
      const number = String(currentIndex + 1).padStart(2, '0');
      applyDemoScene(stage, step, restartAnimation);
      $('demo-step-pill').textContent = `${number} · ${step.title.toUpperCase()}`;
      $('demo-step-counter').textContent = `ETAPA ${number} / ${DEMO_STEPS.length}`;
      $('demo-step-title').textContent = step.title;
      $('demo-step-detail').textContent = step.detail;
      progress.value = String(currentIndex);
      const elapsed = currentIndex === DEMO_STEPS.length - 1 ? totalDuration : currentIndex * DEMO_STEP_MS;
      $('demo-time').textContent = `${formatDemoTime(elapsed)} / ${formatDemoTime(totalDuration)}`;
      nav.querySelectorAll('button[data-step]').forEach((button, buttonIndex) => {
        const active = buttonIndex === currentIndex;
        button.classList.toggle('active', active);
        button.setAttribute('aria-selected', String(active));
        button.tabIndex = active ? 0 : -1;
      });
    }

    function play() {
      if (timer !== null) return;
      if (currentIndex === DEMO_STEPS.length - 1) renderStep(0);
      timer = setInterval(() => {
        if (currentIndex >= DEMO_STEPS.length - 1) {
          pause();
          return;
        }
        renderStep(currentIndex + 1);
      }, DEMO_STEP_MS);
      syncPlaybackButton();
    }

    function chooseStep(index) {
      pause();
      renderStep(index);
    }

    $('demo-prev').addEventListener('click', () => chooseStep(currentIndex - 1));
    $('demo-next').addEventListener('click', () => chooseStep(currentIndex + 1));
    toggle.addEventListener('click', () => timer === null ? play() : pause());
    progress.addEventListener('input', event => chooseStep(Number(event.target.value)));
    nav.addEventListener('click', event => {
      const button = event.target.closest('button[data-step]');
      if (button) chooseStep(Number(button.dataset.step));
    });
    stage.addEventListener('keydown', event => {
      if (event.key === 'ArrowLeft') chooseStep(currentIndex - 1);
      else if (event.key === 'ArrowRight') chooseStep(currentIndex + 1);
      else if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        timer === null ? play() : pause();
      } else return;
      event.preventDefault();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) pause();
    });

    renderStep(0, false);
    renderEvidenceStoryboard();
  }

  function setupMainPetLab() {
    const pet = $('doc-main-pet');
    const pixelArt = $('doc-pixel-art');
    const emotion = $('lab-emotion');
    const accessory = $('doc-accessory');
    const bodyColor = $('lab-body-color');
    const eyeColor = $('lab-eye-color');
    const modelSelect = $('lab-model');
    const faceStyleSelect = $('lab-face-style');
    const renderMode = $('lab-render-mode');
    const mouth = $('lab-mouth');
    const accessorySelect = $('lab-accessory');
    let moodTimer = null;

    Object.entries(models).forEach(([id, item]) => {
      const option = document.createElement('option');
      option.value = id;
      option.textContent = item.label;
      modelSelect.appendChild(option);
    });
    Object.entries(faceStyles).forEach(([id, item]) => {
      const option = document.createElement('option');
      option.value = id;
      option.textContent = item.label;
      faceStyleSelect.appendChild(option);
    });

    accessorySelect.replaceChildren();
    const noneOption = document.createElement('option');
    noneOption.value = 'none';
    noneOption.textContent = 'Nenhum';
    accessorySelect.appendChild(noneOption);
    Object.entries(accessories).forEach(([id, item]) => {
      const option = document.createElement('option');
      option.value = id;
      option.textContent = `${item.emoji} ${item.label}`;
      accessorySelect.appendChild(option);
    });

    bodyColor.addEventListener('input', () => {
      pet.style.setProperty('--agent-color', bodyColor.value);
      pixelArt.style.setProperty('--agent-color', bodyColor.value);
      pet.setAttribute('aria-label', `Prévia do Claw'd na cor ${bodyColor.value}`);
    });
    eyeColor.addEventListener('input', () => {
      pet.style.setProperty('--agent-eye-color', eyeColor.value);
      pixelArt.style.setProperty('--agent-eye-color', eyeColor.value);
    });
    modelSelect.addEventListener('change', () => {
      pet.dataset.model = modelSelect.value;
      pixelArt.dataset.model = modelSelect.value;
      $('lab-mode-label').textContent = `${renderMode.value === 'smooth' ? 'LISO' : 'PIXEL'} · ${models[modelSelect.value]?.label?.toUpperCase() || 'CLÁSSICO'}`;
    });
    faceStyleSelect.addEventListener('change', () => {
      pet.dataset.faceStyle = faceStyleSelect.value;
      pixelArt.dataset.faceStyle = faceStyleSelect.value;
    });
    renderMode.addEventListener('change', () => {
      const smooth = renderMode.value === 'smooth';
      pet.classList.toggle('smooth', smooth);
      $('lab-mode-label').textContent = `${smooth ? 'LISO · SEM GRADE' : 'PIXEL'} · ${models[modelSelect.value]?.label?.toUpperCase() || 'CLÁSSICO'}`;
    });
    mouth.addEventListener('change', () => pet.classList.toggle('mouth-off', !mouth.checked));
    accessorySelect.addEventListener('change', () => {
      accessory.textContent = accessories[accessorySelect.value]?.emoji || '';
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
    $('evidence-catalog-counts').textContent = `${counts[2]} profissões · ${counts[1]} acessórios · ${counts[0]} ações`;
    $('evidence-subpet-counts').textContent = `${counts[3]} subpets · ${counts[4]} ações`;
  }

  renderCapabilities();
  renderProfessions();
  renderAccessories();
  renderActions();
  renderFeatureLedger();
  setupDemoEvidence();
  setupMainPetLab();
  setupSubpetLab();
  syncMetrics();
  setupReveal();
  setupReadingProgress();
})();
