#!/usr/bin/env node
/**
 * Audit pack — lista os 5 eixos de validação e aponta evidências.
 * Exit 0 se os arquivos-chave existem; não substitui npm test.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
process.chdir(root);

const axes = [
  {
    id: 'security',
    label: 'Segurança',
    checks: [
      'src/shared/catalog.js → clawdSanitizePlainText / clawdValidateRuntimeMessage',
      'src/background/background.js → createTrelloCard (sem log de token)',
      'tests/*.test.js → allowlists, blocked sites, XSS',
    ],
    files: ['src/shared/catalog.js', 'src/background/background.js'],
  },
  {
    id: 'performance',
    label: 'Performance',
    checks: [
      'CLAWD_TIMINGS.PARTICLE_MAX / _reserveFx',
      'performanceMode / reduced-motion / noParticles',
      'tests/quality-fluid.test.js',
    ],
    files: ['src/content/content.js', 'tests/quality-fluid.test.js'],
  },
  {
    id: 'automations',
    label: 'Automações',
    checks: [
      '.github/workflows/validate.yml → test + ecosystem',
      'npm run ecosystem / npm run audit',
    ],
    files: ['.github/workflows/validate.yml', 'tests/tools/validate-ecosystem.mjs'],
  },
  {
    id: 'integrations',
    label: 'Integrações',
    checks: [
      'Trello API via SW (host_permissions api.trello.com)',
      'docs/TRELLO.md',
      'i18n: src/shared/i18n.js',
    ],
    files: ['docs/TRELLO.md', 'src/shared/i18n.js', 'manifest.json'],
  },
  {
    id: 'interactions',
    label: 'Interações',
    checks: [
      'toastPosition / speechAnchor / emotionBadgeSide',
      'speech pools SSOT em i18n.js',
      'tests/validation-complete.test.js + catalog.test.js',
    ],
    files: ['src/shared/i18n.js', 'src/content/style.css', 'src/popup/popup.html'],
  },
];

let fails = 0;
console.log('\n=== Claw\'d audit pack (5 eixos) ===\n');
for (const axis of axes) {
  console.log(`## ${axis.label} (${axis.id})`);
  axis.checks.forEach((c) => console.log(`  • ${c}`));
  for (const f of axis.files) {
    if (fs.existsSync(f)) console.log(`  ✓ ${f}`);
    else {
      console.log(`  ✗ missing ${f}`);
      fails += 1;
    }
  }
  console.log('');
}

if (fails) {
  console.log(`AUDIT_PACK_FAIL (${fails} arquivos ausentes)`);
  process.exit(1);
}
console.log('AUDIT_PACK_OK · 5 eixos documentados');
process.exit(0);
