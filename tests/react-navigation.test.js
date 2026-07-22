/* ============================================================
   CLAW'D — REAÇÕES À NAVEGAÇÃO DO USUÁRIO
   Trava as interações contextuais enquanto se navega:
   digitar (sustentado) e assistir vídeo. Ambas com throttle,
   cleanup por AbortSignal e guardas de visibilidade/quiet/perf.
   ============================================================ */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const content = fs.readFileSync(path.join(root, 'src/content/content.js'), 'utf8');

test('digitar: _bindTypingCompanion é registrado e ligado ao AbortSignal', () => {
  assert.match(content, /this\._bindTypingCompanion\(signal\);/);
  assert.match(content, /\n {2}_bindTypingCompanion\(signal\)\s*\{/);
  /* só reage em campos editáveis */
  const idx = content.indexOf('_bindTypingCompanion(signal) {');
  const slice = content.slice(idx, idx + 2600);
  assert.match(slice, /INPUT\|TEXTAREA/);
  assert.match(slice, /isContentEditable/);
  /* keydown em captura, passivo e com signal (cleanup automático) */
  assert.match(slice, /addEventListener\('keydown'/);
  assert.match(slice, /\{ capture: true, passive: true, signal \}/);
  /* ignora atalhos (ctrl/meta/alt) — não é "digitar" */
  assert.match(slice, /e\.ctrlKey \|\| e\.metaKey \|\| e\.altKey\) return/);
});

test('digitar: reage em rajadas espaçadas e volta à calma quando para', () => {
  const idx = content.indexOf('_bindTypingCompanion(signal) {');
  const slice = content.slice(idx, idx + 2600);
  /* throttle da reação visível (não pisca a cada tecla) */
  assert.match(slice, /_lastTypingBurst \|\| 0\) < 2600/);
  /* timer que encerra o "digitar junto" quando as teclas cessam */
  assert.match(slice, /_typingStopTimer = setTimeout\(endTyping, 1500\)/);
  /* respeita visível/quiet/cross-tab/performanceMode */
  assert.match(slice, /!this\.isVisible \|\| this\.isQuiet\(\) \|\| this\._crossTabHidden \|\| this\.S\.settings\.performanceMode\) return/);
  /* Dev digita ("typing"); demais ficam curiosos — estado sustentado (não setStateFor) */
  assert.match(slice, /setState\('typing'\)/);
  assert.match(slice, /setState\('curious'\)/);
  assert.match(slice, /endTyping/);
  assert.doesNotMatch(slice, /setStateFor\('typing'/);
  assert.doesNotMatch(slice, /setStateFor\('curious'/);
});

test('assistir: _bindMediaWatching + _tickWatch registrados e ligados ao AbortSignal', () => {
  assert.match(content, /this\._bindMediaWatching\(signal\);/);
  assert.match(content, /\n {2}_bindMediaWatching\(signal\)\s*\{/);
  assert.match(content, /\n {2}_tickWatch\(\)\s*\{/);
  const idx = content.indexOf('_bindMediaWatching(signal) {');
  const slice = content.slice(idx, idx + 2400);
  /* só vídeos grandes e visíveis disparam o "assistir" */
  assert.match(slice, /HTMLVideoElement/);
  assert.match(slice, /r\.width < 220 \|\| r\.height < 140/);
  /* play em captura (evento não borbulha); pause/ended encerram */
  assert.match(slice, /addEventListener\('play'[\s\S]{0,120}capture: true/);
  assert.match(slice, /\['pause', 'ended'\]\.forEach/);
  /* cooldown de reengate */
  assert.match(slice, /_lastWatchStart \|\| 0\) < 20000/);
  /* loop calmo enquanto assiste */
  assert.match(slice, /setInterval\(\(\) => this\._tickWatch\(\), 13000\)/);
});

test('assistir: pet fica por perto — auto-walk e dwell suspensos durante o vídeo', () => {
  assert.match(content, /document\.hidden \|\| this\._crossTabHidden \|\| this\._videoWatching\) return/);
  assert.match(content, /if \(this\._videoWatching\) return; \/\/ assistindo/);
});

test('assistir: _tickWatch sai do modo se o vídeo pausa/some/aba oculta', () => {
  const idx = content.indexOf('_tickWatch() {');
  const slice = content.slice(idx, idx + 900);
  assert.match(slice, /v\.paused \|\| v\.ended \|\| offscreen \|\| document\.hidden/);
  assert.match(slice, /r\.bottom < 40 \|\| r\.top > window\.innerHeight/);
  assert.match(slice, /this\._videoWatching = false/);
  assert.match(slice, /clearInterval\(this\._watchTimer\)/);
});

test('limpeza: timers de digitar/assistir são cancelados no destroy', () => {
  const idx = content.indexOf('destroy({ skipExtensionApis = false');
  assert.ok(idx > 0);
  const slice = content.slice(idx, idx + 3200);
  assert.match(slice, /_typingStopTimer/);
  assert.match(slice, /clearInterval\(this\._watchTimer\)/);
  assert.match(slice, /_navContextTimer/);
  assert.match(slice, /_scrollSoftTimer/);
});

test('navegar SPA: _bindBrowseNavigation patch History + popstate/hashchange', () => {
  assert.match(content, /this\._bindBrowseNavigation\(signal\);/);
  assert.match(content, /\n {2}_bindBrowseNavigation\(signal\)\s*\{/);
  assert.match(content, /\n {2}_onBrowseNavigate\(_reason\)\s*\{/);
  const idx = content.indexOf('_bindBrowseNavigation(signal) {');
  const slice = content.slice(idx, idx + 2200);
  assert.match(slice, /addEventListener\('popstate'/);
  assert.match(slice, /addEventListener\('hashchange'/);
  assert.match(slice, /\['pushState', 'replaceState'\]\.forEach/);
  assert.match(slice, /history\[method\] = wrapped/);
  assert.match(slice, /signal\.addEventListener\('abort'/);
  assert.match(slice, /queueMicrotask\(\(\) => fire\(method\)\)/);
});

test('navegar SPA: _onBrowseNavigate anima, acorda e reavalia contexto', () => {
  const idx = content.indexOf('_onBrowseNavigate(_reason) {');
  const slice = content.slice(idx, idx + 1800);
  assert.match(slice, /this\.lastActivity = Date\.now\(\)/);
  assert.match(slice, /this\.state === 'sleeping'\) this\.wakeUp\(\)/);
  assert.match(slice, /_lastNavReactAt/);
  assert.match(slice, /setStateFor\('curious'/);
  assert.match(slice, /setStateFor\('waving'/);
  assert.match(slice, /_handleAction\('lookAround'\)/);
  assert.match(slice, /_detectPageContext\(\)/);
  assert.match(slice, /subpet\.interact\('explore'/);
});

test('scroll de leitura: micro-reação além do scroll rápido', () => {
  const idx = content.indexOf('_setupScrollReaction() {');
  const slice = content.slice(idx, idx + 2800);
  assert.match(slice, /speed > 1200/);
  assert.match(slice, /speed > 380/);
  assert.match(slice, /_scrollSoftReacting/);
  assert.match(slice, /_pulseAnimClass\('page-peeking'/);
});

test('clique em link/botão: reação mais frequente e variada', () => {
  const idx = content.indexOf('_bindPagePlayfulness(signal) {');
  const slice = content.slice(idx, idx + 3200);
  assert.match(slice, /a\[href\], button, \[role="button"\]/);
  assert.match(slice, /interactive \? 0\.34 : 0\.14/);
  assert.match(slice, /setStateFor\('curious'/);
  assert.match(slice, /setStateFor\('excited'/);
});
