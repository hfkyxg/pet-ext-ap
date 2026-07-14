const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const manifest = JSON.parse(read('manifest.json'));
const popupHtml = read('src/popup/popup.html');
const popupJs = read('src/popup/popup.js');
const backgroundSource = read('src/background/background.js');
const contentSource = read('src/content/content.js');
const catalogSource = read('src/shared/catalog.js');
const showcaseHtml = read('docs/index.html');
const showcaseCss = read('docs/showcase.css');
const showcaseJs = read('docs/showcase.js');

test('manifest v3.2 referencia apenas arquivos existentes', () => {
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.version, '3.2.0');

  const files = [
    manifest.background.service_worker,
    manifest.action.default_popup,
    ...manifest.content_scripts.flatMap(entry => [...entry.css, ...entry.js])
  ];
  for (const file of files) {
    assert.ok(fs.existsSync(path.join(root, file)), `${file} precisa existir`);
  }
});

test('todos os IDs estáticos usados pelo popup existem no HTML', () => {
  const usedIds = [...popupJs.matchAll(/\$\('([^']+)'\)/g)].map(match => match[1]);
  const htmlIds = new Set([...popupHtml.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]));
  const missing = [...new Set(usedIds)].filter(id => !htmlIds.has(id));
  assert.deepEqual(missing, []);
});

test('popup não contém IDs duplicados', () => {
  const ids = [...popupHtml.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  assert.deepEqual([...new Set(duplicates)], []);
});

test('reload limpa todas as abas e reinjeta somente na aba ativa focada', () => {
  assert.match(backgroundSource, /chrome\.storage\.session\.get\(\[RUNTIME_RECONCILE_KEY\]\)/);
  assert.match(backgroundSource, /async function hasStableLiveContent\(tabId\)/);
  assert.match(backgroundSource, /function pingLiveContent\(tabId\)/);
  assert.match(backgroundSource, /chrome\.tabs\.sendMessage\(tabId, \{ action: 'healthcheck' \}\)/);
  assert.match(backgroundSource, /const live = await hasStableLiveContent\(active\.id\)/);
  assert.match(contentSource, /case 'healthcheck':/);
  assert.match(backgroundSource, /Promise\.all\(eligibleTabs\.map/);
  assert.match(backgroundSource, /lastFocusedWindow:\s*true/);
  assert.match(backgroundSource, /\|\| mostRecentEligible/);
  assert.match(backgroundSource, /async function injectClawdIntoTab\(tabId\)/);
  assert.match(backgroundSource, /files:\s*\['src\/shared\/catalog\.js', 'src\/content\/content\.js'\]/);
  assert.match(contentSource, /\(function clawdContentScope\(\)/);
  assert.doesNotMatch(catalogSource, /^const CLAWD_/m);
  assert.match(contentSource, /_startContextHeartbeat\(\)/);
  assert.match(contentSource, /clawdSafeExtensionCall\(globalThis\.chrome/);
  const companionSource = contentSource.slice(contentSource.indexOf('class ClawdCompanion'));
  assert.match(companionSource, /destroy\(\{ skipExtensionApis = false \} = \{\}\)/);
});

test('movimento visual usa requestAnimationFrame e não fixa FPS por intervalo', () => {
  assert.match(contentSource, /measureRefreshRate\(\)/);
  assert.match(contentSource, /startGlide\(velocityX, velocityY\)/);
  assert.doesNotMatch(contentSource, /setInterval\([^)]*16(?:\.6+)?/);
});

test('embaixadinha é interativa: toque mantém no ar, duplo-clique chuta a gol', () => {
  // Handlers de clique/duplo-clique distintos na bola
  assert.match(contentSource, /ballNode\.addEventListener\('click'/);
  assert.match(contentSource, /ballNode\.addEventListener\('dblclick'/);
  // Toque interativo de embaixadinha com watchdog que derruba a bola
  assert.match(contentSource, /juggleTouch\(\)/);
  assert.match(contentSource, /_dropBall\(\)/);
  assert.match(contentSource, /_juggleDrop = setTimeout/);
  // Contagem ao vivo e registro de recorde compartilhado
  assert.match(contentSource, /_showJuggleCount\(/);
  assert.match(contentSource, /_recordKeepy\(/);
  // Finalização: chute após embaixadinhas rende bônus de XP
  assert.match(contentSource, /Golaço!/);
  // Autônoma e interativa não rodam ao mesmo tempo
  assert.match(contentSource, /if \(this\._keepy \|\| this\._juggleActive\) return;/);
});

test('README e documentação identificam a versão e o ano atuais', () => {
  const readme = read('README.md');
  const docs = `${read('DOCUMENTACAO.md')}\n${read('MANUAL.md')}`;
  const banner = read('src/assets/pet-banner.svg');
  const modelGallery = read('src/assets/pet-states.svg');
  assert.match(readme, /version-3\.2/);
  assert.match(readme, /MIT © 2026/);
  assert.ok(fs.existsSync(path.join(root, 'LICENSE')));
  assert.match(docs, /2026/);
  assert.match(banner, /ESTÚDIO VISUAL v3\.2/);
  assert.match(banner, /id="pet-classic"/);
  assert.match(modelGallery, /id="classic"/);
  assert.match(modelGallery, /id="mini"/);
  assert.match(modelGallery, /id="claws"/);
  assert.match(modelGallery, /id="guardian"/);
  assert.doesNotMatch(`${banner}\n${modelGallery}`, /\s(?:w|h)="\d+"/);
});

test('documentação interativa é local, completa e ligada aos catálogos reais', () => {
  assert.match(showcaseHtml, /<title>Claw'd — Documentação interativa<\/title>/);
  assert.match(showcaseHtml, /id="demonstracao"/);
  assert.match(showcaseHtml, /id="demo-player"/);
  assert.match(showcaseHtml, /id="demo-step-nav"/);
  assert.match(showcaseHtml, /id="evidence-groups"/);
  assert.match(showcaseHtml, /id="laboratorio"/);
  assert.match(showcaseHtml, /id="ecossistema"/);
  assert.match(showcaseHtml, /id="arquitetura"/);
  assert.match(showcaseHtml, /id="validacao"/);
  assert.match(showcaseHtml, /id="subpet-eye-color"/);
  assert.match(showcaseHtml, /id="lab-model"/);
  assert.match(showcaseHtml, /id="lab-face-style"/);
  assert.match(showcaseHtml, /id="lab-eye-color"/);
  assert.match(showcaseHtml, /src="\.\.\/src\/shared\/catalog\.js"/);
  assert.match(showcaseHtml, /href="\.\.\/src\/content\/style\.css"/);
  assert.match(showcaseHtml, /src="\.\/showcase\.js"/);
  assert.match(showcaseHtml, /href="\.\/showcase\.css"/);
  assert.doesNotMatch(showcaseHtml, /<(?:script|link)[^>]+(?:src|href)="https?:\/\//i);

  const usedIds = [...showcaseJs.matchAll(/\$\('([^']+)'\)/g)].map(match => match[1]);
  const allHtmlIds = [...showcaseHtml.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
  const htmlIds = new Set(allHtmlIds);
  assert.deepEqual([...new Set(usedIds)].filter(id => !htmlIds.has(id)), []);
  assert.equal(allHtmlIds.length, htmlIds.size, 'A documentação interativa não pode ter IDs duplicados.');
  assert.match(showcaseJs, /globalThis\.CLAWD_ACCESSORIES/);
  assert.match(showcaseJs, /globalThis\.CLAWD_MODELS/);
  assert.match(showcaseJs, /globalThis\.CLAWD_FACE_STYLES/);
  assert.match(showcaseJs, /globalThis\.CLAWD_SUBPET_ACTIONS/);
  assert.match(showcaseJs, /speciesColors\[select\.value\]\.eyes/);
  const demoStepsSource = showcaseJs.slice(showcaseJs.indexOf('const DEMO_STEPS'), showcaseJs.indexOf('const EVIDENCE_SECTIONS'));
  assert.equal([...demoStepsSource.matchAll(/scene:\s*'/g)].length, 18, 'A demonstração deve manter as 18 etapas documentadas.');
  assert.match(showcaseJs, /renderEvidenceStoryboard\(\)/);
  assert.match(showcaseJs, /previewPet\.dataset\.accHead/);
  assert.match(showcaseJs, /previewPet\.dataset\.accFace/);
  assert.match(showcaseJs, /accessorySelect\.replaceChildren\(\)/);
  assert.match(showcaseJs, /Object\.entries\(accessories\)\.forEach/);
  assert.match(showcaseHtml, /51\/51<\/b> contratos automatizados/);
  assert.match(showcaseHtml, /não é um vídeo pré-gravado/);
  assert.doesNotMatch(showcaseHtml, /<video\b/i);
  assert.match(showcaseCss, /\.evidence-card-grid/);
  assert.match(showcaseCss, /clawd-doc-demo-glide/);
  assert.match(showcaseCss, /@media \(max-width: 520px\)/);
  assert.match(showcaseCss, /@media \(prefers-reduced-motion: reduce\)/);
});
