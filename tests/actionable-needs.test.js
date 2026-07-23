const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const content = fs.readFileSync(path.join(root, 'src', 'content', 'content.js'), 'utf8');
const style = fs.readFileSync(path.join(root, 'src', 'content', 'style.css'), 'utf8');

test('necessidade acionável: emoção mapeia para o cuidado certo (fome→feed, sono→nap, sujo→bath)', () => {
  assert.match(content, /_careForEmotion\(emotion\)\s*\{[\s\S]{0,160}hungry:\s*'feed'[\s\S]{0,60}sleepy:\s*'nap'[\s\S]{0,60}grubby:\s*'bath'/);
  // As três ações mapeadas existem no despacho central.
  for (const act of ['feed', 'nap', 'bath']) {
    assert.match(content, new RegExp(`${act}:\\s*\\(\\)\\s*=>`), `_handleAction deve tratar '${act}'`);
  }
});

test('necessidade acionável: badge só arma com necessidade real e respeita silêncio/minimal', () => {
  assert.match(content, /_syncCareBadge\(\)\s*\{/);
  assert.match(content, /const care = this\._careForEmotion\(this\.emotion\);/);
  assert.match(content, /const actionable = !!care && !this\.isQuiet\(\) && !this\.S\.settings\?\.minimalMode;/);
  assert.match(content, /node\.classList\.add\('care-actionable'\)/);
  assert.match(content, /node\.dataset\.care = care;/);
  // Desarma e limpa a11y quando a necessidade some.
  assert.match(content, /node\.classList\.remove\('care-actionable', 'care-pop'\)/);
  assert.match(content, /node\.removeAttribute\('role'\)/);
});

test('necessidade acionável: updateEmotion sincroniza o badge e há a11y de botão', () => {
  assert.match(content, /data-emotion', this\.emotion\);\s*\n\s*this\._syncCareBadge\(\);/);
  assert.match(content, /node\.setAttribute\('role', 'button'\)/);
  assert.match(content, /node\.setAttribute\('tabindex', '0'\)/);
  assert.match(content, /node\.setAttribute\('aria-label',[\s\S]{0,40}Claw'd`\)/);
});

test('necessidade acionável: clique/teclado no badge dispara cuidado só quando armado', () => {
  assert.match(content, /const careArmed = \(\) => this\.emotionNode\.classList\.contains\('care-actionable'\);/);
  // mousedown só intercepta quando armado (senão o clique atravessa para carinho)
  assert.match(content, /addEventListener\('mousedown', \(e\) => \{ if \(careArmed\(\)\) e\.stopPropagation\(\); \}/);
  assert.match(content, /addEventListener\('click', \(e\) => \{\s*if \(!careArmed\(\)\) return;[\s\S]{0,120}this\._triggerCareFromBadge\(\);/);
  assert.match(content, /addEventListener\('keydown'[\s\S]{0,200}Enter'[\s\S]{0,120}this\._triggerCareFromBadge\(\)/);
  assert.match(content, /_triggerCareFromBadge\(\)\s*\{[\s\S]{0,500}this\._handleAction\(care\);/);
});

test('necessidade acionável: CSS torna o badge clicável, convidativo e seguro em reduced-motion', () => {
  assert.match(style, /#aic-clawd-node \.emotion-badge\.care-actionable \{[\s\S]{0,140}pointer-events:\s*auto;[\s\S]{0,80}cursor:\s*pointer;/);
  assert.match(style, /\.emotion-badge\.care-actionable::before[\s\S]{0,220}animation:\s*clawd-care-ring/);
  assert.match(style, /@keyframes clawd-care-ring/);
  assert.match(style, /@keyframes clawd-care-pop/);
  // Sem movimento: convite continua legível, sem pulsar.
  assert.match(style, /aic-reduced-motion \.emotion-badge\.care-actionable[\s\S]{0,180}animation:\s*none/);
});

test('polish: doBath leva higiene ao máximo sem código morto e dá vantagem real ao médico', () => {
  // O ternário 100:100 e o bônus capado foram removidos.
  assert.doesNotMatch(content, /bumpStat\('hygiene',\s*isDoctor \? 100 : 100\)/);
  assert.doesNotMatch(content, /if \(isDoctor\) this\.bumpStat\('hygiene', 3\)/);
  assert.match(content, /this\.bumpStat\('hygiene', 100\);/);
  // Médico ganha um benefício mecânico real (mais felicidade no banho).
  assert.match(content, /this\.bumpStat\('happiness', isDoctor \? 11 : 8\);/);
});
