#!/usr/bin/env node
/**
 * Pré-commit: validação estática do ecossistema Claw'd.
 * Exit 0 = pronto para commit/push.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(import.meta.url);
const cat = require(path.join(root, 'src/shared/catalog.js'));
const fails = [];
const ok = (m) => console.log('  ✓', m);
const bad = (m) => {
  fails.push(m);
  console.log('  ✗', m);
};

process.chdir(root);
console.log('\n=== 1. Manifest + assets ===');
const m = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
const refs = [
  m.background.service_worker,
  ...m.content_scripts.flatMap((c) => [...(c.js || []), ...(c.css || [])]),
  m.action.default_popup,
  ...Object.values(m.icons),
  ...Object.values(m.action.default_icon || {}),
];
for (const f of refs) {
  if (!fs.existsSync(f)) bad(`missing ${f}`);
  else ok(`exists ${f}`);
}
if (!m.host_permissions?.includes('https://api.trello.com/*')) {
  bad('missing host_permissions api.trello.com');
} else ok('trello host_permission');
if (!(m.content_scripts?.[0]?.js || []).includes('src/shared/i18n.js')) {
  bad('i18n.js not in content_scripts');
} else ok('i18n in content_scripts');

console.log('\n=== 2. Subpet sprites PNG ===');
for (const [id, sp] of Object.entries(cat.CLAWD_SUBPET_SPRITES)) {
  const url = sp.image?.url;
  if (!url || !fs.existsSync(url)) bad(`sprite ${id} → ${url}`);
  else ok(`sprite ${id}`);
}

console.log('\n=== 3. Catálogo vivo ===');
ok(`subpets ${Object.keys(cat.CLAWD_SUBPETS).length}`);
ok(`actions ${Object.keys(cat.CLAWD_ACTIONS).length}`);
ok(`accessories ${Object.keys(cat.CLAWD_ACCESSORIES).length}`);
ok(`professions ${Object.keys(cat.CLAWD_PROFESSIONS).length}`);
ok(`achievements ${Object.keys(cat.CLAWD_ACHIEVEMENTS).length}`);
ok(`weekly ${cat.CLAWD_WEEKLY_CHALLENGES.length}`);
ok(`schema v${cat.CLAWD_SCHEMA_VERSION}`);

console.log('\n=== 4. Idle variations ↔ CSS ===');
const css = fs.readFileSync('src/content/style.css', 'utf8');
const content = fs.readFileSync('src/content/content.js', 'utf8');
for (const v of cat.CLAWD_IDLE_VARIATIONS) {
  const kf = v.keyframe.replace('@keyframes ', '');
  if (!css.includes(`@keyframes ${kf}`)) bad(`missing keyframe ${kf}`);
  else ok(`keyframe ${kf}`);
  if (!css.match(new RegExp(`${kf}[\\s\\S]{0,90}!important`))) bad(`${kf} sem !important`);
  else ok(`${kf} !important`);
}

console.log('\n=== 5. Popup IDs ===');
const popupJs = fs.readFileSync('src/popup/popup.js', 'utf8');
const popupHtml = fs.readFileSync('src/popup/popup.html', 'utf8');
if (!popupHtml.includes('i18n-entities.js')) bad('popup missing i18n-entities.js');
else ok('popup loads i18n-entities');
const ids = [...popupJs.matchAll(/getElementById\(['"]([^'"]+)['"]\)/g)].map((x) => x[1]);
const unique = [...new Set(ids)];
const missingIds = unique.filter(
  (id) => !popupHtml.includes(`id="${id}"`) && !popupHtml.includes(`id='${id}'`)
);
if (missingIds.length) bad(`popup ids missing: ${missingIds.join(', ')}`);
else ok(`popup ids ${unique.length}`);

console.log('\n=== 6. Showcase badge ↔ suíte ===');
const suite = fs
  .readdirSync('tests')
  .filter((f) => f.endsWith('.test.js'))
  .reduce(
    (n, f) => n + [...fs.readFileSync(path.join('tests', f), 'utf8').matchAll(/^\s*test\(/gm)].length,
    0
  );
const html = fs.readFileSync('docs/index.html', 'utf8');
if (!html.includes(`${suite}/${suite}`)) bad(`badge esperado ${suite}/${suite}`);
else ok(`badge ${suite}/${suite}`);

console.log('\n=== 7. Contratos críticos content.js ===');
for (const needle of [
  '_reserveFx',
  '_releaseFx',
  '_armSettleWake',
  '_clearSettleWake',
  'aic-tab-hidden',
  '_syncNameTag',
  '_scheduleIdleVariation',
  'clawdHostMatchesDomain',
  '_applyLookAtCursor',
  '_syncMovingHint',
  'onOwnerState(this.state)',
  "_beginInteraction('vanishing', 'vanishing')",
]) {
  if (!content.includes(needle)) bad(needle);
  else ok(needle);
}

console.log('\n=== 8. Contratos críticos style.css ===');
for (const needle of [
  'aic-tab-hidden',
  'aic-moving',
  '.pixel-fx',
  '.pixel-legs',
  ':not(.rolling)',
  ':not(.clawd-idle-look)',
  'animation-play-state: paused',
]) {
  if (!css.includes(needle)) bad(`css ${needle}`);
  else ok(`css ${needle}`);
}

console.log('\n=== 9. Ações do motor ↔ catálogo (100% no map) ===');
const actionIds = Object.keys(cat.CLAWD_ACTIONS);
const handleStart = content.indexOf('_handleAction(action)');
const mapStart = content.indexOf('const map = {', handleStart);
const mapEnd = content.indexOf('};', mapStart);
const handleMap = content.slice(mapStart, mapEnd + 2);
let mapped = 0;
const missing = [];
for (const id of actionIds) {
  if (new RegExp(`\\b${id}\\s*:`).test(handleMap)) mapped += 1;
  else missing.push(id);
}
ok(`ações no map _handleAction ${mapped}/${actionIds.length}`);
if (mapped < actionIds.length) bad(`ações ausentes no map: ${missing.join(', ')}`);
const extras = Object.keys(cat.CLAWD_PET_EXTRA_ACTIONS || {});
for (const id of extras) {
  if (!new RegExp(`\\b${id}\\s*:`).test(handleMap)) bad(`extra ${id} ausente no map`);
  else ok(`extra ${id} no map`);
}

console.log('\n=== 10. Sintaxe JS (node --check) ===');
const { spawnSync } = await import('node:child_process');
for (const file of [
  'src/shared/i18n.js',
  'src/shared/i18n-entities.js',
  'src/shared/catalog.js',
  'src/content/content.js',
  'src/popup/popup.js',
  'src/background/background.js',
  'docs/showcase.js',
]) {
  const r = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (r.status !== 0) bad(`syntax ${file}: ${r.stderr}`);
  else ok(`syntax ${file}`);
}

console.log('\n=== RESULTADO ===');
if (fails.length) {
  console.log(`FALHOU (${fails.length}):`);
  fails.forEach((f) => console.log(' -', f));
  process.exit(1);
}
console.log(`ECOSYSTEM_STATIC_OK · suite ${suite} · version ${m.version}`);
process.exit(0);
