const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const content = fs.readFileSync(path.join(root, 'src', 'content', 'content.js'), 'utf8');
const style = fs.readFileSync(path.join(root, 'src', 'content', 'style.css'), 'utf8');

test('layout: fala principal mede após render e avalia quatro posições', () => {
  assert.match(content, /_scheduleSpeechLayout\(\)[\s\S]{0,260}requestAnimationFrame/);
  assert.match(content, /_layoutSpeechBubble\(\)/);
  for (const placement of ['above', 'left', 'right', 'below']) {
    assert.match(content, new RegExp(`${placement}: \\{ placement: '${placement}'`));
  }
  assert.match(content, /collision \* 10000 \+ overflow \* 1000/);
  assert.match(content, /bubble\.offsetWidth/);
});

test('layout: fala do subpet evita pet, etiqueta e fala principal', () => {
  assert.match(content, /_layoutBubble\(\)[\s\S]{0,1800}owner\.nameNode/s);
  assert.match(content, /ownerSpeech\?\.classList\.contains\('visible'\)/);
  assert.match(content, /collision \* 10000 \+ overflow \* 1000/);
  assert.match(content, /this\.owner\._scheduleSpeechLayout\?\.\(\)/);
  assert.match(content, /this\.subpet\?\._scheduleBubbleLayout\(\)/);
});

test('layout: balões quebram texto, respeitam viewport e têm cauda direcional', () => {
  assert.match(style, /max-width:\s*min\(220px,\s*calc\(100vw - 16px\)\)/);
  assert.match(style, /\.subpet-bubble[\s\S]{0,500}max-width:\s*min\(176px,\s*calc\(100vw - 16px\)\)/);
  assert.match(style, /white-space:\s*normal/);
  assert.match(style, /overflow-wrap:\s*anywhere/);
  for (const placement of ['above', 'left', 'right', 'below']) {
    assert.match(style, new RegExp(`speech-placement-${placement}`));
    assert.match(style, new RegExp(`bubble-placement-${placement}`));
  }
});

test('harmonia: olhar 3D movimenta só o personagem, não balão nem controles', () => {
  assert.match(content, /class="pet-look-layer" id="aic-look-layer"/);
  assert.match(content, /<\/div>\s*<\/div>\s*<div class="name-tag" id="aic-name-tag">/);
  assert.match(content, /this\.lookLayer\.style\.transform = `perspective/);
  assert.doesNotMatch(content, /this\.node\.style\.transform = `perspective/);
  assert.match(style, /\.pet-look-layer[\s\S]{0,220}transform-style:\s*preserve-3d/);
  assert.match(style, /\.name-tag \{[\s\S]{0,160}position:\s*absolute[\s\S]{0,160}translate:\s*-50% 0/);
  assert.match(content, /_trackNotificationMotion\(5000\)/);
  assert.match(content, /timestamp < this\._notificationLayoutUntil[\s\S]{0,160}_scheduleSpeechLayout\(\)/);
  assert.match(content, /performance\.now\(\) < \(this\.owner\?\._notificationLayoutUntil \|\| 0\)[\s\S]{0,160}_scheduleBubbleLayout\(\)/);
});

test('interação: segurar o pet funciona em mouse e toque sem carinho duplicado', () => {
  assert.match(content, /Segurar é um abraço/);
  assert.match(content, /this\._holdTriggered = true;[\s\S]{0,100}this\.doHug\(\)/);
  assert.match(content, /touchstart[\s\S]{0,1500}this\._holdTimer = setTimeout/s);
  assert.match(content, /diffX < 5 && diffY < 5 && !this\._holdTriggered/);
  assert.match(content, /clientX - this\.startX\) < 10[\s\S]{0,100}!this\._holdTriggered/);
});

test('interação: subpet segue o ponteiro, aceita long press e atalho especial', () => {
  assert.match(content, /addEventListener\('pointerdown'[\s\S]{0,900}interact\('special', \{ force: true \}\)/);
  assert.match(content, /--subpet-look-x/);
  assert.match(content, /event\.shiftKey \? 'special' : 'cuddle'/);
  assert.match(style, /\.aic-subpet\.pressing::before/);
  assert.match(style, /@keyframes clawd-subpet-hold-cue/);
  assert.match(style, /@keyframes clawd-subpet-answer/);
});

test('acessibilidade: pet e subpet são botões focáveis com instrução e fala viva', () => {
  assert.match(content, /this\.node\.setAttribute\('role', 'button'\)/);
  assert.match(content, /aria-keyshortcuts/);
  assert.match(content, /subpet-bubble" role="status" aria-live="polite"/);
  assert.match(content, /speechNode\.setAttribute\('aria-hidden', 'false'\)/);
  assert.match(style, /#aic-clawd-node\[data-clawd-owned="true"\]:focus-visible,[\s\S]{0,160}\.aic-subpet:focus-visible/);
});

test('lifecycle: resize, reduced-motion e destroy também cobrem o novo sistema', () => {
  assert.match(content, /window\.addEventListener\('resize'[\s\S]{0,260}_scheduleSpeechLayout\(\)/);
  assert.match(content, /cancelAnimationFrame\(this\._speechLayoutRaf\)/);
  assert.match(content, /cancelAnimationFrame\(this\._bubbleLayoutRaf\)/);
  assert.match(content, /clearTimeout\(this\._longPressTimer\)/);
  assert.match(style, /prefers-reduced-motion:\s*reduce[\s\S]{0,2200}long-pressed/s);
  assert.match(style, /\.duo-speaking \.speech-bubble/);
  assert.match(style, /\.aic-subpet\.duo-speaking \.subpet-bubble/);
});
