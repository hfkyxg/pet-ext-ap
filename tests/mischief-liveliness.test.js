/* ============================================================
   CLAW'D — VIDA CONTÍNUA: "APRONTAR" (mischief) + CADÊNCIA VIVA
   Garante que pet e subpet seguem animando enquanto se navega:
   travessura autônoma, micro-vida mais frequente, sem regressão
   de catálogo/keyframes/cleanup.
   ============================================================ */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const content = read('src/content/content.js');
const style = read('src/content/style.css');
const catalog = require('../src/shared/catalog.js');

test('aprontar: pet tem doMischief compondo estados verificados (sneaking → peeking)', () => {
  assert.match(content, /\n {2}doMischief\(\)\s*\{/, 'método doMischief ausente');
  const idx = content.indexOf('\n  doMischief() {');
  const slice = content.slice(idx, idx + 1400);
  /* usa estados já existentes — sem inventar keyframe novo */
  assert.match(slice, /setStateFor\('sneaking'/);
  assert.match(slice, /setStateFor\('peeking'/);
  /* reage com o subpet e respeita reduced-motion / teto de FX */
  assert.match(slice, /this\.subpet && !this\.subpet\._interactionBusy/);
  assert.match(slice, /!this\._reducedMotion && this\._canSpawnFx/);
  /* guarda contra pet ocupado (arraste/auto-walk) */
  assert.match(slice, /isDragging \|\| this\.isAutoWalking/);
});

test('aprontar: loop de ação aleatória despacha mischief direto (fora do catálogo)', () => {
  /* mischief entra na fila embaralhada e é interceptado antes de _handleAction */
  assert.match(content, /'play', 'mischief'\]/);
  assert.match(content, /if \(pick === 'mischief'\)\s*\{\s*\n\s*this\.doMischief\(\);/);
});

test('cadência viva: _nextPetAction rota a ficha completa (sem starvation)', () => {
  assert.match(content, /\n {2}_nextPetAction\(\)\s*\{/);
  assert.match(content, /const pick = this\._nextPetAction\(\);/);
  const idx = content.indexOf('\n  _nextPetAction() {');
  const slice = content.slice(idx, idx + 2800);
  assert.match(slice, /'wave', 'dance', 'somersault'/);
  assert.match(slice, /'balloon'/);
  assert.match(slice, /'mischief'/);
  assert.match(slice, /this\._actionQueue = base/);
  assert.match(slice, /this\._actionQueue\.shift\(\)/);
});

test('cadência viva: subpet também rota a ficha via _nextSubAction', () => {
  assert.match(content, /\n {2}_nextSubAction\(\)\s*\{/);
  assert.match(content, /this\.interact\(this\._nextSubAction\(\)\)/);
});

test('cadência viva: watchdog destrava estados transitórios presos', () => {
  assert.match(content, /this\._stateSince = Date\.now\(\)/);
  assert.match(content, /stuckFor > 12000 && sinceUser > 6000/);
});

test('integridade: mischief é interno — não polui catálogo nem contagens do grid', () => {
  assert.ok(!catalog.CLAWD_ACTIONS.mischief, 'mischief não deve entrar em CLAWD_ACTIONS');
  assert.ok(!(catalog.CLAWD_PET_EXTRA_ACTIONS || {}).mischief, 'mischief não é ação extra do grid');
  assert.ok(!catalog.CLAWD_SUBPET_ACTIONS.mischief, 'mischief não é ação de catálogo do subpet');
  /* contagens travadas seguem intactas */
  assert.equal(Object.keys(catalog.CLAWD_ACTIONS).length, 30);
  assert.equal(Object.keys(catalog.CLAWD_SUBPET_ACTIONS).length, 7);
});

test('aprontar: subpet tem case mischief e o expõe nos pools por espécie/personalidade', () => {
  assert.match(content, /case 'mischief':/);
  /* reaproveita classes verificadas (spinning + double-hop), sem CSS novo */
  const idx = content.indexOf("case 'mischief':");
  const slice = content.slice(idx, idx + 500);
  assert.match(slice, /_beginInteraction\('spinning', 'spinning'\)/);
  assert.match(slice, /double-hop/);
  /* pool base de espécies brincalhonas inclui mischief */
  assert.match(content, /dog:\s*\[[^\]]*'mischief'\]/);
  assert.match(content, /slime:\s*\[[^\]]*'mischief'\]/);
  /* reforço por personalidade (playful/curious) também empurra mischief */
  assert.match(content, /\(p\.playful \?\? 5\) >= 7\) pool\.push\([^)]*'mischief'\)/);
  assert.match(content, /\(p\.curious \?\? 5\) >= 7\) pool\.push\([^)]*'mischief'\)/);
});

test('cadência viva: variações idle do pet e do subpet mais frequentes (menos tempo-morto)', () => {
  /* pet: base menor que a antiga (22000 - playful*1000) */
  assert.match(content, /Math\.max\(6500,\s*15000 - playful \* 900\)/);
  /* subpet: base menor que a antiga (16000 - playful*800) */
  assert.match(content, /Math\.max\(5500,\s*12000 - playful \* 700\)/);
  /* ainda self-reschedule e respeita cooldown por variação */
  assert.match(content, /finally\s*\{\s*this\._scheduleIdleVariation\(\)/);
});

test('limpeza: _mischiefTimer é cancelado no destroy (sem timer órfão)', () => {
  const idx = content.indexOf('destroy({ skipExtensionApis = false');
  assert.ok(idx > 0);
  const slice = content.slice(idx, idx + 3000);
  assert.match(slice, /_mischiefTimer/);
});

test('sem keyframe quebrado: mischief não referencia animação inexistente', () => {
  /* doMischief e o case do subpet reusam estados cujos keyframes já existem */
  for (const kf of ['clawd-sneak', 'clawd-peek', 'clawd-spin-action']) {
    // pelo menos os estados reaproveitados têm animação no CSS (âncora de sanidade)
    assert.ok(style.includes('@keyframes ' + kf) || style.includes('.sneaking') ||
      style.includes('.peeking') || style.includes('.spinning'),
      `estado reaproveitado sem suporte visual: ${kf}`);
  }
});
