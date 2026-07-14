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

test('manifest v3.1 referencia apenas arquivos existentes', () => {
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.version, '3.1.0');

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

test('README e documentação identificam a versão e o ano atuais', () => {
  const readme = read('README.md');
  const docs = `${read('DOCUMENTACAO.md')}\n${read('MANUAL.md')}`;
  assert.match(readme, /version-3\.1/);
  assert.match(readme, /MIT © 2026/);
  assert.ok(fs.existsSync(path.join(root, 'LICENSE')));
  assert.match(docs, /2026/);
});

test('documentação interativa é local, completa e ligada aos catálogos reais', () => {
  assert.match(showcaseHtml, /<title>Claw'd — Documentação interativa<\/title>/);
  assert.match(showcaseHtml, /id="laboratorio"/);
  assert.match(showcaseHtml, /id="ecossistema"/);
  assert.match(showcaseHtml, /id="arquitetura"/);
  assert.match(showcaseHtml, /id="validacao"/);
  assert.match(showcaseHtml, /id="subpet-eye-color"/);
  assert.match(showcaseHtml, /src="\.\.\/src\/shared\/catalog\.js"/);
  assert.match(showcaseHtml, /src="\.\/showcase\.js"/);
  assert.match(showcaseHtml, /href="\.\/showcase\.css"/);
  assert.doesNotMatch(showcaseHtml, /<(?:script|link)[^>]+(?:src|href)="https?:\/\//i);

  const usedIds = [...showcaseJs.matchAll(/\$\('([^']+)'\)/g)].map(match => match[1]);
  const allHtmlIds = [...showcaseHtml.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
  const htmlIds = new Set(allHtmlIds);
  assert.deepEqual([...new Set(usedIds)].filter(id => !htmlIds.has(id)), []);
  assert.equal(allHtmlIds.length, htmlIds.size, 'A documentação interativa não pode ter IDs duplicados.');
  assert.match(showcaseJs, /globalThis\.CLAWD_ACCESSORIES/);
  assert.match(showcaseJs, /globalThis\.CLAWD_SUBPET_ACTIONS/);
  assert.match(showcaseJs, /speciesColors\[select\.value\]\.eyes/);
  assert.match(showcaseCss, /@media \(max-width: 520px\)/);
  assert.match(showcaseCss, /@media \(prefers-reduced-motion: reduce\)/);
});
