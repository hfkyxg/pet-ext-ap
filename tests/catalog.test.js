const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {
  CLAWD_ACCESSORIES,
  CLAWD_MODELS,
  CLAWD_FACE_STYLES,
  CLAWD_SKINS,
  CLAWD_PROFESSIONS,
  CLAWD_ACTIONS,
  CLAWD_SUBPET_ACTIONS,
  clawdDefaultState,
  clawdDailyQuestForDate,
  clawdEnsureDailyQuest,
  clawdRegisterDailyProgress,
  clawdMigrateState,
  clawdEffectiveAccessories,
  clawdLevelFromXp,
  clawdHasExtensionContext,
  clawdIsExtensionContextError,
  clawdSafeExtensionCall,
  clawdGuardExtensionCallback
} = require('../src/shared/catalog.js');
const styleSource = fs.readFileSync(require.resolve('../src/content/style.css'), 'utf8');
const contentSource = fs.readFileSync(require.resolve('../src/content/content.js'), 'utf8');
const backgroundSource = fs.readFileSync(require.resolve('../src/background/background.js'), 'utf8');
const popupSource = fs.readFileSync(require.resolve('../src/popup/popup.js'), 'utf8');
const popupHtml = fs.readFileSync(require.resolve('../src/popup/popup.html'), 'utf8');
const popupStyle = fs.readFileSync(require.resolve('../src/popup/popup.css'), 'utf8');

test('estado padrão cria uma missão diária válida', () => {
  const state = clawdDefaultState();
  assert.equal(state.daily.progress, 0);
  assert.ok(state.daily.target > 0);
  assert.equal(state.daily.claimed, false);
});

test('progresso diário acumula, limita no alvo e troca no novo dia', () => {
  const state = clawdDefaultState();
  const today = new Date().toISOString().slice(0, 10);
  const nextDay = new Date(`${today}T12:00:00.000Z`);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  const tomorrow = nextDay.toISOString().slice(0, 10);
  state.daily = clawdDailyQuestForDate(today);
  const type = state.daily.type;
  clawdRegisterDailyProgress(state, type);
  clawdRegisterDailyProgress(state, type, 999);
  assert.equal(state.daily.progress, state.daily.target);
  clawdEnsureDailyQuest(state, tomorrow);
  assert.equal(state.daily.date, tomorrow);
  assert.equal(state.daily.progress, 0);
});

test('migração preserva saves antigos e adiciona missão sem corromper sub-pets', () => {
  const state = clawdMigrateState({ schemaVersion: 2, xp: 500, accessory: 'cap', subpets: { active: 'dog' } });
  assert.equal(state.schemaVersion, 5);
  assert.equal(state.accessoryHead, 'cap');
  assert.equal(state.subpets.active, 'dog');
  assert.deepEqual(state.subpets.eyeColors, {});
  assert.equal(state.model, 'classic');
  assert.equal(state.faceStyle, 'classic');
  assert.equal(state.eyeColor, '#08080b');
  assert.ok(state.daily.date);
});

test('modelos, rostos e cor dos olhos são versionados e validados', () => {
  assert.deepEqual(Object.keys(CLAWD_MODELS), ['classic', 'mini', 'claws', 'guardian']);
  assert.deepEqual(Object.keys(CLAWD_FACE_STYLES), ['classic', 'sparkle', 'focused', 'sleepy']);
  assert.deepEqual(Object.keys(CLAWD_SKINS), ['normal', 'droopy', 'robot']);
  const defaults = clawdDefaultState();
  assert.deepEqual(
    { model: defaults.model, faceStyle: defaults.faceStyle, eyeColor: defaults.eyeColor },
    { model: 'classic', faceStyle: 'classic', eyeColor: '#08080b' }
  );
  const customized = clawdMigrateState({ schemaVersion: 4, model: 'claws', faceStyle: 'sparkle', eyeColor: '#33AAFF' });
  assert.deepEqual(
    { model: customized.model, faceStyle: customized.faceStyle, eyeColor: customized.eyeColor },
    { model: 'claws', faceStyle: 'sparkle', eyeColor: '#33aaff' }
  );
  const invalid = clawdMigrateState({ schemaVersion: 4, model: 'blob', faceStyle: 'unknown', eyeColor: 'red', skin: 'slime' });
  assert.deepEqual(
    { model: invalid.model, faceStyle: invalid.faceStyle, eyeColor: invalid.eyeColor, skin: invalid.skin },
    { model: 'classic', faceStyle: 'classic', eyeColor: '#08080b', skin: 'normal' }
  );
});

test('preferência de boca é persistente, retrocompatível e aplicada ao vivo', () => {
  assert.equal(clawdDefaultState().showMouth, true);
  assert.equal(clawdMigrateState({ schemaVersion: 3 }).showMouth, true);
  assert.equal(clawdMigrateState({ schemaVersion: 3, showMouth: false }).showMouth, false);
  assert.equal(clawdMigrateState({ schemaVersion: 3, showMouth: true }).showMouth, true);
  assert.match(contentSource, /classList\.toggle\('mouth-hidden', S\.showMouth === false\)/);
  assert.match(contentSource, /case 'showMouth':\s*this\.node\.classList\.toggle\('mouth-hidden', value === false\)/);
  assert.match(styleSource, /#aic-clawd-node\.mouth-hidden \.emotion-mouth,[\s\S]{0,140}display:\s*none !important;/);
  assert.doesNotMatch(styleSource, /Boca removida — silhueta Claude/);
  assert.match(popupHtml, /id="toggle-mouth"/);
  assert.match(popupSource, /setConfig\('showMouth', e\.target\.checked\)/);
  assert.match(popupSource, /S\.showMouth !== false/);
});

test('curva de nível permanece progressiva', () => {
  const low = clawdLevelFromXp(0);
  const high = clawdLevelFromXp(1000);
  assert.equal(low.level, 1);
  assert.ok(high.level > low.level);
  assert.ok(high.next > 0);
});

test('cada acessório catalogado possui uma camada pixel-art CSS', () => {
  for (const [id, accessory] of Object.entries(CLAWD_ACCESSORIES)) {
    const selector = `[data-acc-${accessory.slot}="${id}"]`;
    assert.match(styleSource, new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('modo liso mantém acessórios em pixel-sprite (sem variante contínua)', () => {
  assert.ok(Object.keys(CLAWD_ACCESSORIES).length >= 14, `esperado ≥ 14 acessórios, encontrado ${Object.keys(CLAWD_ACCESSORIES).length}`);
  assert.match(styleSource, /Modo liso: acessórios e skins permanecem em PIXEL-SPRITE/);
  assert.match(styleSource, /#aic-clawd-node\.smooth \.accessory[\s\S]*image-rendering:\s*pixelated/);
  assert.doesNotMatch(styleSource, /Base vetorial dos cosméticos/);
  assert.match(styleSource, /clawd-propeller-spin/);
  for (const [id, accessory] of Object.entries(CLAWD_ACCESSORIES)) {
    assert.match(
      styleSource,
      new RegExp(`\\[data-acc-${accessory.slot}="${id}"\\] \\.acc-${accessory.slot}\\s*\\{[\\s\\S]*?box-shadow:`),
      `arte pixel ausente: ${id}`
    );
  }
});

test('chapéus têm descrição, arte refinada e movimento sincronizado ao passo', () => {
  const headAccessories = Object.entries(CLAWD_ACCESSORIES).filter(([, item]) => item.slot === 'head');
  assert.ok(headAccessories.length >= 7, `esperado ≥ 7 chapéus, encontrado ${headAccessories.length}`);
  for (const [id, accessory] of headAccessories) {
    assert.ok(accessory.desc.length >= 20, `descrição insuficiente: ${id}`);
    assert.match(styleSource, new RegExp(`\\[data-acc-head="${id}"\\] \\.acc-head\\s*\\{[\\s\\S]*?box-shadow:`));
  }
  assert.match(styleSource, /@keyframes clawd-headwear-step/);
  assert.match(styleSource, /#aic-clawd-node\.walking \.acc-head[\s\S]{0,150}clawd-headwear-step/);
  assert.match(styleSource, /#aic-clawd-node\.running \.acc-head[\s\S]{0,150}clawd-headwear-step/);
  assert.match(popupSource, /card\.title = def\.desc/);
  assert.match(popupSource, /card\.setAttribute\('aria-pressed'/);
  assert.match(popupSource, /description\.textContent = automatic/);
  assert.match(popupHtml, /id="acc-head-description"/);
});

test('uniformes de profissão são temporários e preservam os acessórios pessoais', () => {
  const state = clawdDefaultState();
  state.accessoryHead = 'tophat';
  state.accessoryFace = 'scarf';

  state.profession = 'footballer';
  assert.deepEqual(clawdEffectiveAccessories(state), {
    profession: 'footballer',
    head: 'cap',
    face: 'scarf',
    body: 'none',
    userHead: 'tophat',
    userFace: 'scarf',
    userBody: 'none',
    autoHead: 'cap',
    autoFace: null,
    headSource: 'profession',
    faceSource: 'personal',
    bodySource: 'personal'
  });
  assert.equal(state.accessoryHead, 'tophat');
  assert.equal(state.accessoryFace, 'scarf');

  state.profession = 'musician';
  assert.equal(clawdEffectiveAccessories(state).head, 'tophat');
  assert.equal(clawdEffectiveAccessories(state).face, 'sunglasses');
  state.profession = 'idle';
  assert.equal(clawdEffectiveAccessories(state).head, 'tophat');
  assert.equal(clawdEffectiveAccessories(state).face, 'scarf');

  for (const profession of Object.values(CLAWD_PROFESSIONS)) {
    for (const [slot, id] of Object.entries(profession.gear || {})) {
      assert.equal(CLAWD_ACCESSORIES[id]?.slot, slot, `${profession.label}: traje inválido ${id}`);
    }
  }
  const applyProfession = contentSource.slice(
    contentSource.indexOf('_applyProfessionVisuals('),
    contentSource.indexOf('/* ---------- POSIÇÃO', contentSource.indexOf('_applyProfessionVisuals('))
  );
  assert.doesNotMatch(applyProfession, /this\.S\.accessory(?:Head|Face)\s*=/);
  assert.match(applyProfession, /_syncAccessoryVisuals\(\)/);
});

test('chapéus externos não são recortados e o popup mostra o traje efetivo', () => {
  const stackRule = styleSource.match(/#aic-clawd-node \.sprite-stack\s*\{([^}]*)\}/)?.[1] || '';
  const previewRule = popupStyle.match(/\.outfit-preview-stage\s*\{([^}]*)\}/)?.[1] || '';
  assert.doesNotMatch(stackRule, /contain:[^;]*paint/);
  assert.match(stackRule, /overflow:\s*visible/);
  assert.doesNotMatch(previewRule, /12px 12px|repeating-linear-gradient/);
  assert.match(styleSource, /#aic-clawd-node \.acc-head\s*\{\s*z-index:\s*4/);
  assert.match(styleSource, /data-acc-face="headphones"[\s\S]{0,180}z-index:\s*3/);
  assert.match(styleSource, /aic-nofx \.acc-head::after[\s\S]{0,260}animation:\s*none !important/);
  assert.match(styleSource, /ninjaband[\s\S]{0,260}preserva os olhos/);
  assert.match(popupHtml, /href="\.\.\/content\/style\.css"/);
  assert.match(popupHtml, /class="outfit-preview-card"/);
  assert.match(popupHtml, /id="aic-clawd-node"/);
  assert.match(popupSource, /function renderOutfitPreview\(\)/);
  assert.match(popupSource, /clawdEffectiveAccessories\(S\)/);
  assert.match(popupSource, /profession-equipped/);
  assert.match(popupSource, /setAttribute\('aria-current', 'true'\)/);
});

test('sub-pet e deslocamentos não usam timer fixo para renderizar frames', () => {
  assert.doesNotMatch(contentSource, /_frameTimer\s*=\s*setInterval/);
  assert.match(contentSource, /measureRefreshRate\(\)/);
  assert.match(contentSource, /requestAnimationFrame\(step\)/);
  // clique enfileirado ainda resolve em carinho (bloco pode crescer com birra/rapid-click)
  assert.match(contentSource, /_queuePetClick\(\)[\s\S]{0,900}this\.giveAffection\(\)/);
  assert.match(contentSource, /if \(diffX < 5 && diffY < 5\) \{\s*this\._queuePetClick\(\)/);
});

test('sprite padrão é estático e pernas só animam durante deslocamento', () => {
  assert.match(styleSource, /@keyframes clawd-pixel-leg-cycle/);
  assert.match(styleSource, /@keyframes clawd-pixel-leg-kick/);
  assert.doesNotMatch(styleSource, /@keyframes walk\s*\{/);
  assert.match(styleSource, /#aic-clawd-node\[data-clawd-owned="true"\]\s*\{[\s\S]*all:\s*initial;[\s\S]*animation:\s*none !important;/);
  assert.match(contentSource, /class="pixel-legs" id="aic-pixel-legs"/);
  assert.match(styleSource, /#aic-clawd-node\[data-clawd-owned="true"\] \.pixel-sprite,[\s\S]{0,120}animation:\s*none !important;/);
  assert.match(styleSource, /#aic-clawd-node\.walking \.pixel-legs/);
  assert.match(styleSource, /#aic-clawd-node\.running \.pixel-legs/);
  assert.match(styleSource, /#aic-clawd-node\.keepy-uppy \.pixel-legs/);
  assert.match(styleSource, /#aic-clawd-node\.jumping \.pixel-legs/);
  assert.match(styleSource, /:not\(\.walking\):not\(\.running\):not\(\.keepy-uppy\):not\(\.jumping\) \.pixel-legs[\s\S]{0,120}animation:\s*none !important;/);
  assert.match(contentSource, /class="pixel-fx" id="aic-pixel-fx"/);
  assert.match(styleSource, /@keyframes clawd-pixel-fx-wave/);
  assert.match(styleSource, /@keyframes clawd-pixel-fx-arms/);
  assert.match(styleSource, /@keyframes clawd-pixel-fx-jump/);
  assert.match(styleSource, /@keyframes clawd-pixel-fx-tuck/);
  assert.match(styleSource, /@keyframes clawd-pixel-fx-dance/);
  assert.match(styleSource, /@keyframes clawd-pixel-fx-highfive/);
  assert.match(styleSource, /@keyframes clawd-pixel-fx-stretch/);
  assert.match(styleSource, /@keyframes clawd-pixel-fx-clap/);
  assert.match(styleSource, /@keyframes clawd-pixel-fx-sleep/);
  assert.match(styleSource, /@keyframes clawd-pixel-fx-roar/);
  assert.match(styleSource, /@keyframes clawd-pixel-fx-peek/);
  assert.match(styleSource, /@keyframes clawd-pixel-fx-sneak/);
  assert.match(styleSource, /@keyframes clawd-pixel-fx-bath/);
  assert.match(styleSource, /@keyframes clawd-pixel-fx-celebrate/);
  assert.match(styleSource, /#aic-clawd-node\.waving \.pixel-fx/);
  assert.match(styleSource, /#aic-clawd-node\.walking \.pixel-fx/);
  assert.match(styleSource, /#aic-clawd-node\.running \.pixel-fx/);
  assert.match(styleSource, /#aic-clawd-node\.rolling \.pixel-fx/);
  assert.match(styleSource, /#aic-clawd-node\.somersault \.pixel-fx/);
  assert.match(styleSource, /#aic-clawd-node\.spinning \.pixel-fx/);
  assert.match(styleSource, /#aic-clawd-node\.dance-1 \.pixel-fx/);
  assert.match(styleSource, /#aic-clawd-node\.highfive \.pixel-fx/);
  assert.match(styleSource, /#aic-clawd-node\.stretching \.pixel-fx/);
  assert.match(styleSource, /#aic-clawd-node\.clapping \.pixel-fx/);
  assert.match(styleSource, /#aic-clawd-node\.sleeping \.pixel-fx/);
  assert.match(styleSource, /#aic-clawd-node\.roaring \.pixel-fx/);
  assert.match(styleSource, /#aic-clawd-node\.peeking \.pixel-fx/);
  assert.match(styleSource, /#aic-clawd-node\.sneaking \.pixel-fx/);
  assert.match(styleSource, /#aic-clawd-node\.bathing \.pixel-fx/);
  assert.match(styleSource, /#aic-clawd-node\.celebrate \.pixel-fx/);
  assert.match(styleSource, /--clawd-fx-wave-a:/);
  assert.match(styleSource, /--clawd-fx-arm-a:/);
  assert.match(styleSource, /--clawd-legs-crouch:/);
  assert.match(contentSource, /startGlide\(velocityX, velocityY\)/);
  assert.match(contentSource, /this\.isDragging[\s\S]{0,1500}this\.setState\('walking'\)/);
  assert.match(contentSource, /const speed = Math\.hypot\(velocityX, velocityY\);[\s\S]{0,160}speed < 0\.35[\s\S]{0,120}this\.setState\('idle'\)/);
});

test('cada modelo possui silhueta pixel, pernas próprias e variante lisa', () => {
  for (const id of Object.keys(CLAWD_MODELS)) {
    assert.match(styleSource, new RegExp(`data-model="${id}"`), `modelo sem CSS: ${id}`);
  }
  assert.match(styleSource, /data-model="classic"[\s\S]*--clawd-pixel-body:/);
  assert.match(styleSource, /data-model="mini"[\s\S]*--clawd-legs-idle:/);
  assert.match(styleSource, /data-model="claws"[\s\S]*--clawd-legs-kick:/);
  assert.match(styleSource, /data-model="guardian"[\s\S]*--clawd-legs-step-a:/);
  assert.match(styleSource, /data-model="mini"\] \.smooth-core/);
  assert.match(styleSource, /data-model="claws"\] \.smooth-core::after/);
  assert.match(styleSource, /data-model="guardian"\] \.smooth-core/);
  assert.match(styleSource, /\.pet-eyes[\s\S]{0,260}var\(--agent-eye-color\)/);
  for (const id of Object.keys(CLAWD_FACE_STYLES).filter(id => id !== 'classic')) {
    assert.match(styleSource, new RegExp(`data-face-style="${id}"`), `rosto sem CSS: ${id}`);
  }
});

test('keyframes internos são isolados do CSS das páginas visitadas', () => {
  const keyframes = [...styleSource.matchAll(/@keyframes\s+([\w-]+)/g)].map(match => match[1]);
  assert.ok(keyframes.length > 20, 'catálogo de animações inesperadamente vazio');
  assert.ok(
    keyframes.every(name => name.startsWith('clawd-')),
    `keyframes sem namespace: ${keyframes.filter(name => !name.startsWith('clawd-')).join(', ')}`
  );
  assert.match(styleSource, /#aic-clawd-node \.(?:smooth-sprite|smooth-core|smooth-leg)/);
});

test('sub-pets suportam apelidos e paletas customizadas por espécie', () => {
  const state = clawdDefaultState();
  state.subpets.names.dog = 'Rex';
  state.subpets.colors.dog = '#4a90e2';
  state.subpets.eyeColors.dog = '#33ff99';
  const migrated = clawdMigrateState(state);
  assert.equal(migrated.subpets.names.dog, 'Rex');
  assert.equal(migrated.subpets.colors.dog, '#4a90e2');
  assert.equal(migrated.subpets.eyeColors.dog, '#33ff99');
  assert.match(contentSource, /if \(this\.spriteNode\) this\._paint\(true\);/);
  assert.match(contentSource, /setEyeColor\(color\)/);
  assert.match(contentSource, /case 'setSubpetEyeColor'/);
  assert.match(popupHtml, /id="input-subpet-eye-color"/);
  assert.match(popupSource, /action: 'setSubpetEyeColor'/);
  assert.match(contentSource, /this\.S\.subpets\s*=\s*stored\.subpets;/);
  assert.doesNotMatch(contentSource, /changes\.clawdState\s*\|\|\s*this\._writing/);
  assert.match(contentSource, /this\.S\.subpets\s*=\s*fresh\.subpets;\s*this\.refreshSubpet\(\);/);
  assert.match(contentSource, /clawdAssignPlain\(\{\}, st\.subpets\.names\)/);
  assert.match(contentSource, /chrome\.storage\.local\.set\(\{\s*clawdState:\s*clawdMigrateState\(st\)\s*\}\)/);
});

test('modo liso troca a grade por uma silhueta contínua do mesmo pet', () => {
  assert.match(styleSource, /#aic-clawd-node\.smooth \.sprite-stack\s*\{[\s\S]*filter:\s*drop-shadow/);
  assert.doesNotMatch(styleSource, /#aic-clawd-node\.smooth \.sprite-stack\s*\{[^}]*blur\(/);
  assert.match(styleSource, /#aic-clawd-node\.smooth,[\s\S]*background-color:\s*transparent !important;[\s\S]*background-image:\s*none !important;/);
  assert.match(contentSource, /class="smooth-sprite" id="aic-smooth-sprite"/);
  assert.match(styleSource, /#aic-clawd-node\.smooth \.pixel-legs,[\s\S]*#aic-clawd-node\.smooth \.pixel-fx\s*\{[\s\S]*display:\s*none !important;[\s\S]*box-shadow:\s*none !important;/);
  assert.match(styleSource, /#aic-clawd-node\.smooth \.pixel-sprite\s*\{[\s\S]*display:\s*none !important;[\s\S]*box-shadow:\s*none !important;/);
  assert.match(styleSource, /#aic-clawd-node\.smooth \.smooth-sprite\s*\{\s*display:\s*block;/);
  assert.match(styleSource, /\.smooth-core\s*\{[\s\S]*width:\s*28px;[\s\S]*height:\s*22px;[\s\S]*background:\s*var\(--agent-color\);[\s\S]*border-radius:\s*0/);
  assert.match(styleSource, /\.smooth-leg\s*\{[\s\S]*top:\s*22px;[\s\S]*height:\s*8px;[\s\S]*border-radius:\s*0/);
  assert.match(styleSource, /\.smooth\.walking \.smooth-leg/);
  assert.match(styleSource, /\.smooth:not\(\.walking\):not\(\.running\)(?::not\(\.keepy-uppy\))? \.smooth-leg\s*\{\s*animation:\s*none;/);
  assert.match(styleSource, /#aic-clawd-node\.smooth \.pet-eyes[\s\S]*border-radius:\s*0/);
  assert.match(styleSource, /\.smooth\.keepy-uppy \.smooth-leg-1/);
  assert.match(styleSource, /clawd-ball-keepy-foot/);
  assert.match(styleSource, /@keyframes clawd-smooth-idle/);
  assert.match(styleSource, /#aic-clawd-node\.smooth \.emotion-mouth\s*\{[\s\S]*opacity:\s*0\.9;/);
  assert.match(contentSource, /_missFish\(/);
  assert.match(styleSource, /\.aic-lake-hint/);
  assert.match(styleSource, /\.aic-fish-caught\.rare/);
});

test('popup oferece estúdio visual com miniaturas da arte real', () => {
  assert.match(popupHtml, /id="model-grid"/);
  assert.match(popupHtml, /id="face-style-grid"/);
  assert.match(popupHtml, /id="input-eye-color"/);
  assert.match(popupHtml, /class="pixel-legs"/);
  assert.match(popupHtml, /class="pet-eyes"/);
  assert.match(popupHtml, /class="clawd-model-preview header-model-preview"/);
  assert.match(popupSource, /function createPetArtPreview\(/);
  assert.match(popupSource, /function syncHeaderPetPreview\(/);
  assert.match(popupSource, /function renderModels\(\)/);
  assert.match(popupSource, /function renderFaceStyles\(\)/);
  assert.match(popupSource, /function renderSkins\(\)/);
  assert.match(popupSource, /setConfig\('eyeColor', color\)/);
  assert.match(popupSource, /className: 'accessory-art-preview'/);
  assert.match(popupStyle, /\.model-grid/);
  assert.match(popupStyle, /\.accessory-art-preview/);
});

test('pescador tem lago interativo e personalização de sub-pet ao vivo', () => {
  assert.match(styleSource, /\.aic-lake[\s\S]*pointer-events: auto/);
  assert.match(contentSource, /setSubpetColor/);
  assert.match(contentSource, /_lakeEl\.addEventListener\('click'/);
});

test('emoções combinam balão de emoji, piscada e expressão do sprite', () => {
  assert.match(contentSource, /class="emotion-face" id="aic-emotion-face"/);
  assert.match(contentSource, /showEmotionEmoji\(emoji, duration = 2600\)/);
  assert.match(contentSource, /const stateEmoji = \{[\s\S]*\}\[newState\]/);
  assert.match(styleSource, /\.emotion-badge\.visible/);
  assert.match(styleSource, /@keyframes clawd-eye-cover/);
  assert.match(styleSource, /\.emotion-mouth\s*\{[\s\S]*opacity:\s*0\.92;/);
  assert.match(styleSource, /\[data-emotion="sad"\] \.emotion-mouth/);
  assert.match(styleSource, /\[data-emotion="hungry"\] \.emotion-mouth/);
  assert.match(styleSource, /\[data-emotion="joyful"\] \.emotion-mouth/);
  assert.match(styleSource, /#aic-clawd-node\.happy \.emotion-mouth/);
  assert.match(styleSource, /\.emotion-mouth\s*\{[\s\S]*background:\s*transparent;/);
  assert.doesNotMatch(styleSource, /\[data-emotion="joyful"\] \.emotion-mouth\s*\{[^}]*background:\s*#fff/);
  assert.match(styleSource, /@keyframes clawd-mouth-talk/);
  assert.match(styleSource, /@keyframes clawd-mouth-chew/);
  assert.match(styleSource, /@keyframes clawd-mouth-idle/);
  assert.match(styleSource, /@keyframes clawd-look-around/);
  assert.match(styleSource, /@keyframes clawd-soft-land/);
  assert.match(styleSource, /@keyframes clawd-tab-greet/);
  assert.match(styleSource, /@keyframes clawd-page-peek/);
  assert.match(contentSource, /_playDuoScene\(/);
  assert.match(contentSource, /_engagePageStructure\(/);
  assert.match(contentSource, /_tickDwellEngage\(/);
  assert.match(contentSource, /doLookAround\(/);
  assert.match(contentSource, /classList\.add\('talking'\)/);
  assert.match(contentSource, /classList\.remove\('talking'\)/);
  assert.match(contentSource, /prop-chef-pan/);
  assert.match(contentSource, /_pulseProfessionFx/);
  assert.match(styleSource, /\.prop-chef-pan/);
  assert.match(styleSource, /\.prop-music-note/);
  assert.match(styleSource, /\.prop-ninja-smoke/);
});

test('catálogos de ações e profissões estão ligados ao motor do pet', () => {
  const actionMap = contentSource.slice(contentSource.indexOf('_handleAction(action)'), contentSource.indexOf('destroy(', contentSource.indexOf('_handleAction(action)')));
  for (const action of Object.keys(CLAWD_ACTIONS)) {
    assert.match(actionMap, new RegExp(`\\b${action}:\\s*\\(`), `ação sem handler: ${action}`);
  }
  for (const profession of Object.keys(CLAWD_PROFESSIONS)) {
    assert.ok(contentSource.includes(`'${profession}'`) || contentSource.includes(`${profession}:`), `profissão ausente: ${profession}`);
  }
  assert.match(contentSource, /--clawd-step-duration/);
  assert.match(contentSource, /--clawd-run-duration/);
});

test('reinjeção destrói a instância anterior e remove pets órfãos', () => {
  assert.match(contentSource, /window\.__clawd\.destroy\(\)/);
  assert.match(contentSource, /window\.__clawdBootId !== bootId/);
  assert.match(contentSource, /case 'healthcheck':[\s\S]{0,320}this\.node\?\.isConnected[\s\S]{0,220}document\.getElementById\('aic-clawd-node'\) === this\.node/);
  assert.match(contentSource, /chrome\.storage\.onChanged\.removeListener/);
  assert.match(contentSource, /chrome\.runtime\.onMessage\.removeListener/);
  assert.match(contentSource, /document\.querySelectorAll\(CLAWD_DOM_CLEANUP_SELECTORS\)/);
  assert.match(contentSource, /CLAWD_DOM_CLEANUP_SELECTORS/);
  assert.match(backgroundSource, /RUNTIME_CONTEXT_SETTLE_MS\s*=\s*900/);
  assert.match(backgroundSource, /async function hasStableLiveContent\(tabId\)/);
  assert.match(backgroundSource, /if \(!await pingLiveContent\(tabId\)\) return false;\s*await waitForContextSettlement\(\);\s*return pingLiveContent\(tabId\);/);
  assert.match(backgroundSource, /const mostRecentEligible = eligibleTabs\.reduce/);
  assert.match(backgroundSource, /async function injectClawdIntoTab\(tabId\)[\s\S]*attempt < 3[\s\S]*await pingLiveContent\(tabId\)/);
});

test('contexto MV3 invalidado é detectado sem lançar erro', () => {
  const invalidApi = {
    runtime: { get id() { throw new Error('Extension context invalidated.'); } },
    storage: { local: {} }
  };
  assert.equal(clawdHasExtensionContext(invalidApi), false);
  assert.equal(clawdIsExtensionContextError(new Error('Extension context invalidated.')), true);
});

test('chamada síncrona usa fallback e encerra a instância no contexto inválido', () => {
  const invalidApi = { runtime: { id: '' }, storage: { local: {} } };
  let invalidations = 0;
  const result = clawdSafeExtensionCall(invalidApi, () => { throw new Error('não deveria executar'); }, {
    fallback: 'offline',
    onInvalidated: () => { invalidations++; }
  });
  assert.equal(result, 'offline');
  assert.equal(invalidations, 1);
});

test('rejeição assíncrona por contexto invalidado não fica sem tratamento', async () => {
  const validApi = { runtime: { id: 'test-extension' }, storage: { local: {} } };
  const result = await clawdSafeExtensionCall(
    validApi,
    () => Promise.reject(new Error('Extension context invalidated.')),
    { fallback: null }
  );
  assert.equal(result, null);
});

test('callback tardio não executa depois que o contexto expira', () => {
  const api = { runtime: { id: 'test-extension' }, storage: { local: {} } };
  let calls = 0;
  let invalidations = 0;
  const guarded = clawdGuardExtensionCallback(api, () => { calls++; }, () => { invalidations++; });
  api.runtime.id = '';
  guarded();
  assert.equal(calls, 0);
  assert.equal(invalidations, 1);
});

test('sub-pet tem ciclo explícito de sono, despertar e interação manual', () => {
  assert.match(contentSource, /sleep\(\)\s*\{/);
  assert.match(contentSource, /wakeUp\(message =/);
  assert.match(contentSource, /this\.node\.addEventListener\('click'/);
  assert.match(contentSource, /this\.subpet\.wakeUp\('Acordamos juntos!/);
  assert.match(styleSource, /\.aic-subpet\.waking \.subpet-sprite/);
  assert.match(styleSource, /\.aic-subpet\.cuddling \.subpet-sprite/);
  // Walk/follow/run não pode sobrescrever carinho/special; dormindo pausa rAF de verdade.
  assert.match(styleSource, /\.aic-subpet\.moving:not\([^\n]*\.cuddling/);
  assert.match(styleSource, /\.aic-subpet\.owner-running:not\([^\n]*\.cuddling/);
  assert.match(styleSource, /@keyframes clawd-sleep-settle/);
  assert.match(contentSource, /_pulseAnimClass\('sleep-settle'/);
  assert.match(contentSource, /if \(this\._interactionBusy\) return false/);
  assert.match(contentSource, /this\._pauseRaf\(\)/);
  assert.match(contentSource, /sleep\(\)[\s\S]*?_pauseRaf\(\)/);
  assert.match(contentSource, /wakeUp\(message[\s\S]*?_resumeRaf\(\)/);
  assert.match(contentSource, /if \(this\.state === 'sleeping'\) return/);
  assert.match(contentSource, /document\.hidden \|\| this\.state === 'sleeping'/);
  assert.match(contentSource, /SETTLE_EPS|_writePos/);
});

test('sub-pet oferece sete ações manuais animadas e habilidade por espécie', () => {
  assert.deepEqual(Object.keys(CLAWD_SUBPET_ACTIONS), [
    'cuddle', 'play', 'explore', 'spin', 'celebrate', 'hug', 'special'
  ]);
  assert.match(popupHtml, /id="subpet-action-grid"/);
  assert.match(popupSource, /function renderSubpetActions\(\)/);
  assert.match(popupSource, /action: 'triggerSubpetAction'/);
  assert.match(contentSource, /case 'triggerSubpetAction'/);
  assert.match(contentSource, /this\.subpet\.interact\(msg\.value, \{ force: true \}\)/);
  assert.match(contentSource, /case 'explore':/);
  assert.match(contentSource, /case 'spin':/);
  assert.match(contentSource, /case 'celebrate':/);
  assert.match(contentSource, /case 'hug':/);
  assert.match(styleSource, /\.aic-subpet\.exploring \.subpet-sprite/);
  assert.match(styleSource, /\.aic-subpet\.spinning \.subpet-sprite/);
  assert.match(styleSource, /\.aic-subpet\.celebrating \.subpet-sprite/);
  assert.match(styleSource, /\.aic-subpet\.duo-hug/);
  assert.match(styleSource, /@keyframes clawd-subpet-vanish/);
});

test('sprites de sub-pet vivem no catálogo com idle/walk/sleep e helpers compartilhados', () => {
  const {
    CLAWD_SUBPETS,
    CLAWD_SUBPET_SPRITES,
    CLAWD_SUBPET_CELL,
    clawdBuildPixelShadow,
    clawdShadePixelColor,
    clawdSubPetFrame,
    clawdSubPetBounds
  } = require('../src/shared/catalog.js');
  assert.equal(CLAWD_SUBPET_CELL, 4);
  assert.deepEqual(Object.keys(CLAWD_SUBPET_SPRITES).sort(), Object.keys(CLAWD_SUBPETS).sort());
  for (const [id, sprite] of Object.entries(CLAWD_SUBPET_SPRITES)) {
    assert.ok(sprite.frames.idle?.length >= 1, `${id} precisa de idle`);
    assert.ok(sprite.frames.walk?.length >= 1, `${id} precisa de walk`);
    assert.ok(sprite.frames.sleep?.length >= 1, `${id} precisa de sleep`);
    const frame = clawdSubPetFrame(sprite, 'idle', 0);
    assert.ok(frame[0].length >= 10, `${id} deve ter grade larga`);
    assert.ok(clawdBuildPixelShadow(frame, sprite.colors).includes('px'), `${id} deve gerar box-shadow`);
    const bounds = clawdSubPetBounds(sprite);
    assert.equal(bounds.width, bounds.cols * CLAWD_SUBPET_CELL);
  }
  assert.match(clawdShadePixelColor('rgba(236, 240, 241, 0.92)', 0.5), /rgba\(/);
  assert.match(contentSource, /CLAWD_SUBPET_SPRITES/);
  assert.match(contentSource, /subpet-motion/);
  assert.match(contentSource, /aic-subpet-clone/);
  assert.match(styleSource, /clawd-subpet-idle/);
  assert.match(styleSource, /clawd-subpet-fly/);
  assert.match(styleSource, /clawd-walk-bob/);
  assert.ok(CLAWD_SUBPET_SPRITES.dragon.frames.flying?.length >= 2, 'dragão precisa de frames de voo');
  assert.ok(CLAWD_SUBPET_SPRITES.dragon.colors.A, 'dragão precisa de cor de asa');
  assert.ok(CLAWD_SUBPET_SPRITES.bird.frames.flying?.length >= 2, 'pássaro precisa de frames de voo');
  assert.match(contentSource, /Asas abertas/);
  assert.match(popupSource, /startSubpetPreviewAnims/);
  assert.match(popupSource, /clawdBuildPixelShadow/);
  assert.doesNotMatch(contentSource, /const SUBPET_SPRITES\s*=/);
});

test('estados estacionários não reativam ciclo legado clawd-pixel-walk no corpo', () => {
  assert.match(styleSource, /#aic-clawd-node\.happy \.pixel-sprite\s*\{[\s\S]*?animation:\s*none !important;/);
  assert.match(styleSource, /#aic-clawd-node\.excited \.pixel-sprite\s*\{[\s\S]*?animation:\s*none !important;/);
  assert.match(styleSource, /#aic-clawd-node\[data-clawd-owned="true"\] \.pixel-sprite/);
  assert.match(styleSource, /\.pixel-legs[\s\S]*clawd-pixel-leg-cycle/);
});

test('catálogo exporta CLAWD_IDLE_VARIATIONS com estrutura correta (v3.4)', () => {
  const { CLAWD_IDLE_VARIATIONS } = require('../src/shared/catalog.js');
  assert.ok(Array.isArray(CLAWD_IDLE_VARIATIONS), 'CLAWD_IDLE_VARIATIONS deve ser array');
  assert.ok(CLAWD_IDLE_VARIATIONS.length >= 3, `esperado ≥ 3 variações, encontrado ${CLAWD_IDLE_VARIATIONS.length}`);
  for (const v of CLAWD_IDLE_VARIATIONS) {
    assert.ok(typeof v.id === 'string' && v.id.length > 0, `variação sem id: ${JSON.stringify(v)}`);
    assert.ok(typeof v.keyframe === 'string' && v.keyframe.startsWith('clawd-'), `keyframe inválido: ${v.keyframe}`);
    assert.ok(typeof v.durationMs === 'number' && v.durationMs > 0, `durationMs inválido: ${v.durationMs}`);
    assert.ok(typeof v.cooldownMs === 'number' && v.cooldownMs > 0, `cooldownMs inválido: ${v.cooldownMs}`);
  }
});

test('catálogo exporta CLAWD_KEYBOARD_SHORTCUTS mapeando Alt+* → action ids válidos (v3.4)', () => {
  const { CLAWD_KEYBOARD_SHORTCUTS, CLAWD_ACTIONS } = require('../src/shared/catalog.js');
  assert.ok(typeof CLAWD_KEYBOARD_SHORTCUTS === 'object' && CLAWD_KEYBOARD_SHORTCUTS !== null, 'deve ser objeto');
  const actionIds = Object.keys(CLAWD_ACTIONS);
  for (const [key, actionId] of Object.entries(CLAWD_KEYBOARD_SHORTCUTS)) {
    assert.match(key, /^Alt\+[A-Z]$/, `atalho com formato inesperado: ${key}`);
    assert.ok(actionIds.includes(actionId), `action id '${actionId}' não existe em CLAWD_ACTIONS`);
  }
  assert.ok(Object.keys(CLAWD_KEYBOARD_SHORTCUTS).length >= 4, 'deve ter ao menos 4 atalhos');
});

test('estado padrão inclui onboardingDone (v3.4)', () => {
  const state = clawdDefaultState();
  assert.ok('onboardingDone' in state, 'estado default deve ter onboardingDone');
  assert.equal(state.onboardingDone, false, 'onboardingDone deve começar false');
});

test('CLAWD_PAGE_CONTEXTS + clawdPageContextFromHost (SSOT de contexto)', () => {
  const {
    CLAWD_PAGE_CONTEXTS,
    CLAWD_CONTEXT_REACTIONS,
    clawdPageContextFromHost
  } = require('../src/shared/catalog.js');
  assert.equal(Object.keys(CLAWD_PAGE_CONTEXTS).length, 10, '10 categorias mapeadas (+ idle implícito)');
  assert.equal(clawdPageContextFromHost('github.com'), 'coding');
  assert.equal(clawdPageContextFromHost('www.youtube.com'), 'video');
  assert.equal(clawdPageContextFromHost('example.com'), 'idle', 'host desconhecido deve ser idle');
  assert.equal(clawdPageContextFromHost(''), 'idle');
  for (const ctx of Object.keys(CLAWD_CONTEXT_REACTIONS)) {
    if (ctx === 'idle') continue;
    assert.ok(CLAWD_PAGE_CONTEXTS[ctx] || ctx === 'idle', `reação sem mapa: ${ctx}`);
  }
  assert.ok(CLAWD_CONTEXT_REACTIONS.video && CLAWD_CONTEXT_REACTIONS.news, 'video/news devem reagir');
});

test('pool semanal expandida (≥10) e tipos alinhados às quests diárias', () => {
  const { CLAWD_WEEKLY_CHALLENGES, CLAWD_DAILY_QUESTS } = require('../src/shared/catalog.js');
  assert.ok(CLAWD_WEEKLY_CHALLENGES.length >= 10, `esperava ≥10 weekly, got ${CLAWD_WEEKLY_CHALLENGES.length}`);
  const dailyTypes = new Set(CLAWD_DAILY_QUESTS.map((q) => q.type));
  for (const w of CLAWD_WEEKLY_CHALLENGES) {
    assert.ok(dailyTypes.has(w.type), `weekly type '${w.type}' deve existir nas quests diárias`);
    assert.ok(w.target > 0 && w.rewardXp > 0, `desafio inválido: ${w.label}`);
  }
});

test('novos acessórios v3.5b (star_clip, goggles) estão no catálogo com slots corretos', () => {
  assert.ok('star_clip' in CLAWD_ACCESSORIES, 'star_clip deve existir em CLAWD_ACCESSORIES');
  assert.ok('goggles'   in CLAWD_ACCESSORIES, 'goggles deve existir em CLAWD_ACCESSORIES');
  assert.equal(CLAWD_ACCESSORIES.star_clip.slot, 'head', 'star_clip deve ser slot head');
  assert.equal(CLAWD_ACCESSORIES.goggles.slot,   'face', 'goggles deve ser slot face');
  assert.ok(CLAWD_ACCESSORIES.star_clip.unlock?.price > 0, 'star_clip deve ter preço');
  assert.ok(CLAWD_ACCESSORIES.goggles.unlock?.price > 0,   'goggles deve ter preço');
});

test('personalidade influencia decayStats — foodie e lazy presentes no content.js', () => {
  assert.match(contentSource, /foodie/, 'decayStats deve usar traço foodie');
  assert.match(contentSource, /hungerRate/, 'decayStats deve ter taxa de fome variável');
  assert.match(contentSource, /energyRate/, 'decayStats deve ter taxa de energia variável');
  assert.match(contentSource, /sleepAt/, 'sleep threshold deve variar por personalidade lazy');
  assert.match(contentSource, /walkChance/, 'chance de walk deve variar por personalidade lazy');
});

test('mecanismo de 5 cliques rápidos → tantrum (v3.5b)', () => {
  assert.match(contentSource, /_rapidClickCount/, '5-click tantrum deve existir no content.js');
  assert.match(contentSource, /_rapidClickAt/,    'timestamp do clique rápido deve existir');
  assert.match(contentSource, /Para!\s*😤/,       'mensagem de birra por clique rápido deve existir');
});

test('CSS pixel-art dos acessórios v3.5b existe no style.css', () => {
  assert.match(styleSource, /data-acc-head="star_clip"/, 'CSS do grampo estrela deve existir');
  assert.match(styleSource, /data-acc-face="goggles"/,   'CSS dos goggles deve existir');
});
