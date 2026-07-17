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
const styleSource = read('src/content/style.css');
const catalogSource = read('src/shared/catalog.js');
const showcaseHtml = read('docs/index.html');
const showcaseCss = read('docs/showcase.css');
const showcaseJs = read('docs/showcase.js');

test('manifest v3.2 referencia apenas arquivos existentes', () => {
  assert.equal(manifest.manifest_version, 3);
  assert.ok(['3.2.0', '3.3.0', '3.3.1'].includes(manifest.version), `versão inesperada: ${manifest.version}`);

  const files = [
    manifest.background.service_worker,
    manifest.action.default_popup,
    ...manifest.content_scripts.flatMap(entry => [...entry.css, ...entry.js]),
    ...Object.values(manifest.icons || {}),
    ...Object.values(manifest.action.default_icon || {})
  ];
  for (const file of files) {
    assert.ok(fs.existsSync(path.join(root, file)), `${file} precisa existir`);
  }
});

test('manifest declara ícones PNG do Claw’d (16/48/128)', () => {
  assert.ok(manifest.icons, 'icons no top-level');
  assert.ok(manifest.action.default_icon, 'action.default_icon');
  for (const size of ['16', '48', '128']) {
    assert.ok(manifest.icons[size], `icons.${size}`);
    assert.match(manifest.icons[size], /\.png$/);
  }
  for (const size of ['16', '48']) {
    assert.ok(manifest.action.default_icon[size], `action.default_icon.${size}`);
  }
  for (const file of new Set([
    ...Object.values(manifest.icons),
    ...Object.values(manifest.action.default_icon)
  ])) {
    const buf = fs.readFileSync(path.join(root, file));
    assert.equal(buf[0], 0x89, `${file} deve ser PNG`);
    assert.ok(buf.length > 50, `${file} não pode estar vazio`);
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
  // Freestyle / embaixadinhas fancy + bola pixel (sem emoji nas partículas)
  assert.match(contentSource, /_playFreestyleMove\(/);
  assert.match(contentSource, /freestyle-heel/);
  assert.match(contentSource, /freestyle-rabona/);
  assert.match(contentSource, /spawnPixelSparks\(/);
  assert.match(styleSource, /--clawd-ball-shadow/);
  assert.match(styleSource, /@keyframes clawd-ball-heel/);
  assert.match(styleSource, /\.aic-pixel-spark/);
});

test('README e documentação identificam a versão e o ano atuais', () => {
  const readme = read('README.md');
  const docs = `${read('docs/md/DOCUMENTACAO.md')}\n${read('docs/md/MANUAL.md')}`;
  const banner = read('src/assets/pet-banner.svg');
  const modelGallery = read('src/assets/pet-states.svg');
  assert.match(readme, /version-3\.[23]/);
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
  assert.match(showcaseHtml, /(?:src="\.\.\/src\/shared\/catalog\.js"|src="\/src\/shared\/catalog\.js")/);
  assert.match(showcaseHtml, /(?:href="\.\.\/src\/content\/style\.css"|href="\/src\/content\/style\.css")/);
  assert.match(showcaseHtml, /(?:src="\.\/showcase\.js"|src="\/docs\/showcase\.js")/);
  assert.match(showcaseHtml, /(?:href="\.\/showcase\.css"|href="\/docs\/showcase\.css")/);
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
  /* contagem viva: todos os tests/*.test.js */
  const testDir = path.join(__dirname);
  const suiteCount = fs.readdirSync(testDir)
    .filter((f) => f.endsWith('.test.js'))
    .reduce((n, f) => n + [...fs.readFileSync(path.join(testDir, f), 'utf8').matchAll(/^\s*test\(/gm)].length, 0);
  assert.match(showcaseHtml, new RegExp(`${suiteCount}/${suiteCount}</b> contratos automatizados`));
  assert.match(showcaseHtml, /não é um vídeo pré-gravado/);
  assert.doesNotMatch(showcaseHtml, /<video\b/i);
  assert.match(showcaseCss, /\.evidence-card-grid/);
  assert.match(showcaseCss, /clawd-doc-demo-glide/);
  assert.match(showcaseCss, /@media \(max-width: 520px\)/);
  assert.match(showcaseCss, /@media \(prefers-reduced-motion: reduce\)/);
});

test('showcase e schema batem com o catálogo vivo', () => {
  const catalog = require('../src/shared/catalog.js');
  const actionCount = Object.keys(catalog.CLAWD_ACTIONS).length;
  const subpetActionCount = Object.keys(catalog.CLAWD_SUBPET_ACTIONS).length;
  const subpetCount = Object.keys(catalog.CLAWD_SUBPETS).length;
  assert.ok(actionCount >= 24, `esperado ≥ 24 ações, encontrado ${actionCount}`);
  assert.equal(subpetActionCount, 7);
  assert.equal(subpetCount, 8);
  assert.match(catalogSource, /var CLAWD_SCHEMA_VERSION = [45]/);
  assert.match(showcaseHtml, new RegExp(`data-count="${actionCount}"[^>]*>${actionCount}</strong><span>ações do pet</span>`));
  assert.match(showcaseHtml, new RegExp(`data-count="${subpetActionCount}"[^>]*>${subpetActionCount}</strong><span>ações do subpet</span>`));
  assert.match(showcaseHtml, /Schema v[45]/);
  assert.doesNotMatch(showcaseHtml, /Schema v3/);
});

test('cada sub-pet tem PNG empacotado e image.url coerente', () => {
  const catalog = require('../src/shared/catalog.js');
  const zlib = require('zlib');
  const war = JSON.stringify(manifest.web_accessible_resources || []);
  assert.match(war, /src\/shared\/sprites\/subpets\/\*\.png/);

  function decodePng(buf) {
    let off = 8, w = 0, h = 0, ct = 6;
    const idat = [];
    while (off < buf.length) {
      const len = buf.readUInt32BE(off); off += 4;
      const type = buf.slice(off, off + 4).toString('ascii'); off += 4;
      const data = buf.slice(off, off + len); off += len + 4;
      if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); ct = data[9]; }
      else if (type === 'IDAT') idat.push(data);
      else if (type === 'IEND') break;
    }
    const raw = zlib.inflateSync(Buffer.concat(idat));
    const bpp = ct === 6 ? 4 : 3;
    const stride = w * bpp + 1;
    const rgba = Buffer.alloc(w * h * 4);
    let prev = Buffer.alloc(w * bpp);
    const paeth = (a, b, c) => {
      const p = a + b - c;
      const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
      if (pa <= pb && pa <= pc) return a;
      if (pb <= pc) return b;
      return c;
    };
    for (let y = 0; y < h; y++) {
      const ft = raw[y * stride];
      const row = raw.slice(y * stride + 1, y * stride + 1 + w * bpp);
      const out = Buffer.alloc(w * bpp);
      for (let i = 0; i < w * bpp; i++) {
        const x = row[i];
        const a = i >= bpp ? out[i - bpp] : 0;
        const b = prev[i];
        const c = i >= bpp ? prev[i - bpp] : 0;
        let v = x;
        if (ft === 1) v = (x + a) & 255;
        else if (ft === 2) v = (x + b) & 255;
        else if (ft === 3) v = (x + ((a + b) >> 1)) & 255;
        else if (ft === 4) v = (x + paeth(a, b, c)) & 255;
        out[i] = v;
      }
      for (let x = 0; x < w; x++) {
        const si = x * bpp, di = (y * w + x) * 4;
        rgba[di] = out[si]; rgba[di + 1] = out[si + 1]; rgba[di + 2] = out[si + 2];
        rgba[di + 3] = bpp === 4 ? out[si + 3] : 255;
      }
      prev = out;
    }
    return { w, h, rgba };
  }

  for (const id of Object.keys(catalog.CLAWD_SUBPETS)) {
    const sprite = catalog.CLAWD_SUBPET_SPRITES[id];
    assert.ok(sprite?.image?.url, `${id} precisa de image.url`);
    assert.equal(sprite.image.url, `src/shared/sprites/subpets/${id}.png`);
    assert.equal(sprite.image.gridW, 12);
    assert.equal(sprite.image.gridH, 10);
    const pngPath = path.join(root, sprite.image.url);
    assert.ok(fs.existsSync(pngPath), `${sprite.image.url} precisa existir`);
    const buf = fs.readFileSync(pngPath);
    assert.equal(buf[0], 0x89, `${id} deve ser PNG`);
    const img = decodePng(buf);
    assert.ok(img.w >= 48 && img.h >= 40, `${id} PNG muito pequeno`);
    let eyes = 0;
    for (let i = 0; i < img.rgba.length; i += 4) {
      if (img.rgba[i + 3] > 40 && img.rgba[i] === 0x11 && img.rgba[i + 1] === 0x11 && img.rgba[i + 2] === 0x11) eyes++;
    }
    assert.ok(eyes >= 64, `${id} precisa de olhos #111111 opacos (got ${eyes})`);
  }
  assert.ok(
    fs.existsSync(path.join(root, 'tests/sprite-out/Subpets-selection.png')),
    'sheet canônico Subpets-selection.png precisa existir'
  );
});

test('_make-sprites não sobrescreve PNGs do pacote sem WRITE_PKG_SPRITES=1', () => {
  const makeSprites = read('tests/tools/_make-sprites.mjs');
  assert.match(makeSprites, /WRITE_PKG_SPRITES\s*=\s*process\.env\.WRITE_PKG_SPRITES\s*===\s*'1'/);
  assert.match(makeSprites, /if\s*\(\s*WRITE_PKG_SPRITES\s*\)/);
  assert.match(makeSprites, /skip package PNGs/);
  assert.match(makeSprites, /_crop-literal-sprites/);
});

test('popup.html contém elementos de onboarding e context-bar (v3.4)', () => {
  assert.match(popupHtml, /id="clawd-onboarding"/, 'overlay de onboarding deve existir');
  assert.match(popupHtml, /id="clawd-context-bar"/, 'barra de contexto deve existir');
  assert.match(popupHtml, /id="onboarding-start"/, 'botão de início do onboarding deve existir');
  assert.match(popupHtml, /role="progressbar"/, 'barras de stat devem ter role progressbar');
  assert.match(popupHtml, /aria-label="Felicidade"/, 'barra de felicidade deve ter aria-label');
});

test('content.js contém handlers de interação v3.4', () => {
  assert.match(contentSource, /_setupScrollReaction/, 'reação ao scroll deve existir');
  assert.match(contentSource, /visibilitychange/, 'reação ao retorno de aba deve existir');
  assert.match(contentSource, /_doIdleVariation/, 'variações de idle devem existir');
  assert.match(contentSource, /clawd-summon-drop/, 'animação de summon drop deve existir');
});

test('catálogo exporta CLAWD_IDLE_VARIATIONS e CLAWD_KEYBOARD_SHORTCUTS (v3.4)', () => {
  const catalog = require('../src/shared/catalog.js');
  assert.ok(Array.isArray(catalog.CLAWD_IDLE_VARIATIONS), 'CLAWD_IDLE_VARIATIONS deve ser array');
  assert.ok(catalog.CLAWD_IDLE_VARIATIONS.length >= 3, 'deve ter ao menos 3 variações de idle');
  assert.ok(typeof catalog.CLAWD_KEYBOARD_SHORTCUTS === 'object', 'CLAWD_KEYBOARD_SHORTCUTS deve ser objeto');
  const shortcuts = Object.keys(catalog.CLAWD_KEYBOARD_SHORTCUTS || {});
  assert.ok(shortcuts.length >= 4, 'deve ter ao menos 4 atalhos de teclado');
});
