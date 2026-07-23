const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const catalog = require('../src/shared/catalog.js');
const content = read('src/content/content.js');
const contentCss = read('src/content/style.css');
const popup = read('src/popup/popup.js');
const popupHtml = read('src/popup/popup.html');
const popupCss = read('src/popup/popup.css');

test('valor: catálogo oferece 11 subpets e as três novas espécies têm identidade própria', () => {
  const ids = Object.keys(catalog.CLAWD_SUBPETS);
  assert.equal(ids.length, 11);
  assert.deepEqual(ids.slice(-3), ['fox', 'capybara', 'axolotl']);
  assert.deepEqual(ids.slice(-3).map((id) => catalog.CLAWD_SUBPETS[id].level), [14, 16, 18]);
  for (const id of ids.slice(-3)) {
    const sprite = catalog.CLAWD_SUBPET_SPRITES[id];
    assert.ok(sprite?.frames?.idle?.length >= 2, `${id} precisa de idle animado`);
    assert.ok(sprite?.frames?.walk?.length >= 2, `${id} precisa de caminhada animada`);
    assert.ok(sprite?.frames?.sleep?.length >= 1, `${id} precisa dormir`);
    assert.ok(sprite?.frames?.special?.length >= 1, `${id} precisa de frame especial`);
  }
  /* Silhuetas bem distintas — orelhas+cauda (raposa) ≠ pão+creme (capivara) ≠ brânquias laterais (axo) */
  const foxIdle = catalog.clawdSubPetFrame(catalog.CLAWD_SUBPET_SPRITES.fox, 'idle', 0).join('\n');
  const capyIdle = catalog.clawdSubPetFrame(catalog.CLAWD_SUBPET_SPRITES.capybara, 'idle', 0).join('\n');
  const axoIdle = catalog.clawdSubPetFrame(catalog.CLAWD_SUBPET_SPRITES.axolotl, 'idle', 0).join('\n');
  assert.match(foxIdle, /\.D\.P\.\.\.\.P\.D\./); /* orelhas pontudas com interior rosa */
  assert.match(foxIdle, /\.\.BWWWBBBDD\./); /* focinho branco + cauda */
  assert.match(foxIdle, /\.\.\.BPPBB\.DD\./); /* blush + cauda */
  assert.match(capyIdle, /BBTTTTTTTTBB/); /* focinho creme */
  assert.match(capyIdle, /BKKBBBBBBKKB/); /* olhos nas laterais */
  assert.match(capyIdle, /BBBBBNNBBBBB/); /* nariz largo */
  assert.match(axoIdle, /\.A\.G\.\.\.\.G\.A\./); /* brânquias laterais com pontas aqua */
  assert.match(axoIdle, /A\.GBBBBBG\.A\./);
  assert.match(axoIdle, /\.BBBWPPWBBB\./); /* blush + brilho */
  /* Personalidade interativa no runtime */
  assert.match(content, /species === 'dog' \|\| this\.species === 'fox'/);
  assert.match(content, /capy-sway/);
  assert.match(content, /axo-gills/);
  assert.match(content, /fox-sparkle/);
  assert.match(content, /Caça às estrelas/);
  assert.match(content, /Pausa sem pressa/);
  assert.match(contentCss, /clawd-subpet-capy-sway/);
  assert.match(contentCss, /clawd-subpet-axo-gills/);
  assert.match(contentCss, /data-species="fox"/);
});

test('valor: novos sprites PNG estão empacotados e ligados ao catálogo', () => {
  for (const id of ['fox', 'capybara', 'axolotl']) {
    const target = path.join(root, catalog.CLAWD_SUBPET_SPRITES[id].image.url);
    assert.ok(fs.existsSync(target), `${id}.png ausente`);
    assert.ok(fs.statSync(target).size > 200, `${id}.png parece vazio`);
    assert.match(content, new RegExp(`${id}:\\s*\\(\\)\\s*=>`));
  }
  assert.match(content, /rustle:[\s\S]*cozy:[\s\S]*bubble:/);
});

test('valor: mensagens de grounding e sons calmos são estritamente validadas', () => {
  assert.deepEqual(catalog.clawdValidateRuntimeMessage({ action: 'startGrounding' }), { action: 'startGrounding' });
  for (const kind of ['rain', 'waves', 'forest', 'purr']) {
    assert.deepEqual(catalog.clawdValidateRuntimeMessage({ action: 'playCalmSound', kind }), { action: 'playCalmSound', kind });
  }
  assert.equal(catalog.clawdValidateRuntimeMessage({ action: 'playCalmSound', kind: 'remote-url' }), null);
});

test('valor: histórico de práticas é limitado, tipado e retrocompatível', () => {
  const fallback = catalog.clawdDefaultState().wellbeing;
  const raw = {
    breathingCount: 7,
    groundingCount: 4,
    calmSoundCount: 3,
    practiceLog: [
      { day: '2026-07-20', kind: 'breathing' },
      { day: '2026-07-21', kind: 'grounding' },
      { day: '2026-07-22', kind: 'sound' },
      { day: 'javascript:alert(1)', kind: 'sound' },
      { day: '2026-07-22', kind: 'tracking' }
    ],
    healthyStreak: { days: 3, lastDay: '2026-07-22' }
  };
  const safe = catalog.clawdSanitizeWellbeingBlock(raw, fallback);
  assert.equal(safe.breathingCount, 7);
  assert.equal(safe.groundingCount, 4);
  assert.equal(safe.calmSoundCount, 3);
  assert.deepEqual(safe.practiceLog.map((entry) => entry.kind), ['breathing', 'grounding', 'sound']);
  assert.deepEqual(safe.healthyStreak, { days: 3, lastDay: '2026-07-22' });
});

test('valor: grounding é modal acessível, autoguiado e restaurável', () => {
  const block = content.slice(content.indexOf('  startGrounding() {'), content.indexOf('  playCalmSound(kind) {'));
  assert.match(block, /aria-modal/);
  assert.match(block, /aria-labelledby/);
  assert.match(block, /aria-describedby/);
  assert.match(block, /Passo \$\{index \+ 1\} de \$\{steps\.length\}/);
  assert.match(block, /event\.key === 'Escape'/);
  assert.match(block, /_trapDialogFocus\(event, overlay\)/);
  assert.match(block, /restore\?\.isConnected/);
  assert.match(contentCss, /\.clawd-grounding-btn[\s\S]*min-height:\s*44px/);
});

test('valor: práticas alimentam streak local e sons curtos limpam timers', () => {
  const record = content.slice(content.indexOf('  _recordWellbeingPractice(kind) {'), content.indexOf('  startBreathing({'));
  assert.match(record, /practiceLog\.push\(\{ day, kind \}\)/);
  assert.match(record, /streak\.lastDay === yesterday/);
  assert.match(record, /this\.save\(\)/);
  const sound = content.slice(content.indexOf('  playCalmSound(kind) {'), content.indexOf('Bloqueio suave'));
  assert.match(sound, /rain:[\s\S]*waves:[\s\S]*forest:[\s\S]*purr:/);
  assert.match(sound, /_calmSoundTimers\.forEach\(clearTimeout\)/);
  assert.match(content, /_teardownFocusUI\(\)[\s\S]*_calmSoundTimers\.clear\(\)/);
});

test('valor: popup expõe Central de Calma, insights locais e alvos de toque confortáveis', () => {
  for (const id of ['breathe-now', 'grounding-now', 'wellbeing-insights', 'wellbeing-recommendation']) {
    assert.match(popupHtml, new RegExp(`id="${id}"`));
  }
  for (const kind of ['rain', 'waves', 'forest', 'purr']) assert.match(popupHtml, new RegExp(`data-calm-sound="${kind}"`));
  assert.match(popup, /function renderWellbeingInsights\(\)/);
  assert.match(popup, /recentDays[\s\S]*practiceLog[\s\S]*healthyStreak/);
  assert.match(popupCss, /\.calm-action[\s\S]*min-height:\s*48px/);
  assert.match(popupCss, /\.calm-sound-grid button[\s\S]*min-height:\s*44px/);
});

test('valor: comunicação de bem-estar é transparente, local e sem promessa clínica', () => {
  const docs = [read('README.md'), read('docs/md/MANUAL.md'), read('docs/md/DOCUMENTACAO.md')].join('\n');
  assert.match(docs, /Central de Calma/i);
  assert.match(docs, /somente (neste navegador|localmente)|dados locais/i);
  assert.match(docs, /não substitu(?:i|em) (?:avaliação, diagnóstico, tratamento ou )?cuidado profissional/i);
  assert.doesNotMatch(docs, /cura (?:a |sua )?ansiedade/i);
});
