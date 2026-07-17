/** Injeta/atualiza image:{} de literal-crop-meta.json em CLAWD_SUBPET_SPRITES. */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testsDir = path.resolve(__dirname, '..');
const root = path.resolve(__dirname, '../..');
const meta = JSON.parse(fs.readFileSync(path.join(testsDir, 'sprite-out', 'literal-crop-meta.json'), 'utf8'));
const catalogPath = path.join(root, 'src/shared/catalog.js');
let catalog = fs.readFileSync(catalogPath, 'utf8');

for (const [id, m] of Object.entries(meta)) {
  m.width = m.gridW * 4;
  m.height = m.gridH * 4;
  const line = `    image: { url: 'src/shared/sprites/subpets/${id}.png', width: ${m.width}, height: ${m.height}, gridW: ${m.gridW}, gridH: ${m.gridH} },`;
  const reExisting = new RegExp(`^[ \\t]*image:\\s*\\{[^\\n]*subpets/${id}\\.png[^\\n]*\\},\\r?\\n`, 'm');
  if (reExisting.test(catalog)) {
    catalog = catalog.replace(reExisting, `${line}\n`);
    console.log('updated', id);
    continue;
  }
  // inserir após colors do bloco de sprites (não do CLAWD_SUBPETS)
  const blockRe = new RegExp(
    `(${id}:\\s*\\{\\r?\\n\\s*colors:\\s*\\{[^\\n]*\\},)\\r?\\n`,
    'm'
  );
  if (!blockRe.test(catalog)) {
    console.warn('missing block', id);
    continue;
  }
  catalog = catalog.replace(blockRe, `$1\n${line}\n`);
  console.log('inserted', id);
}

fs.writeFileSync(catalogPath, catalog);
fs.writeFileSync(path.join(testsDir, 'sprite-out', 'literal-crop-meta.json'), JSON.stringify(meta, null, 2));
console.log('OK');
