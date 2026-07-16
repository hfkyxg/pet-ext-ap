/**
 * Extrai sprites LITERAIS do sheet anexado (6px/célula) e injeta no catálogo.
 * node tests/tools/_literal-to-catalog.mjs
 */
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testsDir = path.resolve(__dirname, '..');
const root = path.resolve(__dirname, '../..');
const CELL = 4, W = 12, H = 10;

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

const isCard = (r, g, b) => r >= 14 && r <= 48 && g >= 16 && g <= 52 && b >= 24 && b <= 70 && Math.abs(r - g) < 18;

const CARDS = [
  { id: 'dog', minX: 15, minY: 81, maxX: 226, maxY: 253 },
  { id: 'cat', minX: 275, minY: 81, maxX: 487, maxY: 253 },
  { id: 'bird', minX: 536, minY: 81, maxX: 748, maxY: 253 },
  { id: 'rabbit', minX: 797, minY: 81, maxX: 1008, maxY: 253 },
  { id: 'dragon', minX: 14, minY: 348, maxX: 226, maxY: 519 },
  { id: 'dino', minX: 275, minY: 348, maxX: 487, maxY: 519 },
  { id: 'ghost', minX: 536, minY: 348, maxX: 748, maxY: 519 },
  { id: 'slime', minX: 797, minY: 348, maxX: 1009, maxY: 519 }
];

const PAL = {
  dog: { B: [180, 105, 40], D: [110, 70, 35], K: [20, 20, 30], P: [255, 120, 160] },
  cat: { B: [176, 184, 192], D: [110, 118, 128], K: [20, 20, 30], P: [242, 160, 184] },
  bird: { B: [74, 163, 255], D: [43, 111, 194], K: [20, 20, 30], Y: [255, 209, 74], R: [255, 138, 43], A: [126, 192, 255] },
  rabbit: { B: [242, 244, 246], D: [168, 176, 186], K: [20, 20, 30], P: [255, 142, 176], I: [255, 194, 214] },
  dragon: { B: [61, 175, 74], D: [37, 122, 48], K: [20, 20, 30], Y: [255, 209, 74] },
  dino: { B: [62, 207, 207], D: [31, 138, 138], K: [20, 20, 30], Y: [184, 240, 240] },
  ghost: { B: [236, 239, 243], D: [168, 176, 186], K: [20, 20, 30], N: [20, 20, 30] },
  slime: { B: [74, 223, 90], D: [42, 154, 56], K: [20, 20, 30], E: [31, 122, 44] }
};

function resolveSource() {
  const candidates = [
    path.join(testsDir, 'sprite-out', 'ref-literal-rgba.png'),
    path.join(process.env.USERPROFILE || '', '.cursor/projects/c-Users-Frank-Desktop-pet-ext-ap-claude-project-validation-polish-7l02nf/assets',
      'c__Users_Frank_AppData_Roaming_Cursor_User_workspaceStorage_e9cc820318043322c28e414f55d2c09c_images_Subpets-selection-1a0cec25-f1be-484b-b966-1844b4e0520d.png')
  ];
  for (const p of candidates) if (fs.existsSync(p)) return p;
  throw new Error('source png missing');
}

const img = decodePng(fs.readFileSync(resolveSource()));
const get = (x, y) => {
  const i = (y * img.w + x) * 4;
  return [img.rgba[i], img.rgba[i + 1], img.rgba[i + 2]];
};

function isBlack(r, g, b) {
  return r < 55 && g < 55 && b < 60;
}

function nearestLetter(rgb, pal) {
  let best = '.', d = 1e9;
  for (const [k, c] of Object.entries(pal)) {
    const dd = Math.abs(rgb[0] - c[0]) + Math.abs(rgb[1] - c[1]) + Math.abs(rgb[2] - c[2]);
    if (dd < d) { d = dd; best = k; }
  }
  return d < 130 ? best : '.';
}

function cropSprite(card) {
  const bh = card.maxY - card.minY + 1;
  const y0 = card.minY + Math.floor(bh * 0.48);
  const y1 = card.minY + Math.floor(bh * 0.86);
  let minX = 1e9, minY = 1e9, maxX = -1, maxY = -1;
  for (let y = y0; y <= y1; y++) {
    for (let x = card.minX + 15; x <= card.maxX - 15; x++) {
      const [r, g, b] = get(x, y);
      if (isCard(r, g, b)) continue;
      const sat = Math.max(r, g, b) - Math.min(r, g, b);
      const L = (r + g + b) / 3;
      if (L > 175 && Math.abs(r - g) < 25) continue;
      if (sat < 12 && L < 80) continue;
      if (sat < 8 && L < 190) continue;
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
  }
  return { minX, minY, maxX, maxY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

function digitize(card, S = 6) {
  const box = cropSprite(card);
  const tw = Math.round(box.w / S);
  const th = Math.round(box.h / S);
  const pal = PAL[card.id];
  const grid = [];
  for (let gy = 0; gy < th; gy++) {
    let row = '';
    for (let gx = 0; gx < tw; gx++) {
      const bag = {};
      let black = 0;
      for (let dy = 0; dy < S; dy++) {
        for (let dx = 0; dx < S; dx++) {
          const x = box.minX + gx * S + dx;
          const y = box.minY + gy * S + dy;
          const [r, g, b] = get(x, y);
          if (isCard(r, g, b)) continue;
          if (isBlack(r, g, b)) { black++; bag.K = (bag.K || 0) + 1; continue; }
          const ch = nearestLetter([r, g, b], pal);
          if (ch !== '.') bag[ch] = (bag[ch] || 0) + 1;
        }
      }
      let best = '.', n = 0;
      for (const [k, v] of Object.entries(bag)) {
        if (k === 'K' && black >= 2) { best = 'K'; n = v; break; }
        if (v > n) { n = v; best = k; }
      }
      if (bag.K && bag.K >= Math.max(2, n * 0.35)) best = 'K';
      if (bag.P && bag.P >= Math.max(2, n * 0.35)) best = 'P';
      if (bag.Y && bag.Y >= Math.max(2, n * 0.35)) best = 'Y';
      if (bag.E && bag.E >= Math.max(2, n * 0.35)) best = 'E';
      row += n >= 2 || best === 'K' || best === 'P' || best === 'Y' ? best : '.';
    }
    grid.push(row);
  }
  return trimGrid(grid);
}

function trimGrid(rows) {
  let g = [...rows];
  while (g.length && /^\.*$/.test(g[0])) g = g.slice(1);
  while (g.length && /^\.*$/.test(g[g.length - 1])) g = g.slice(0, -1);
  if (!g.length) return g;
  let left = 0, right = g[0].length - 1;
  while (left < right && g.every((r) => r[left] === '.')) left++;
  while (right > left && g.every((r) => r[right] === '.')) right--;
  return g.map((r) => r.slice(left, right + 1));
}

function normalizeRows(rows) {
  const w = Math.max(0, ...rows.map((r) => r.length));
  return rows.map((r) => (r.length < w ? r + '.'.repeat(w - r.length) : r));
}

function padFrame(rows, gridW, gridH) {
  const norm = normalizeRows(rows);
  const h = norm.length;
  const w = norm[0]?.length || 0;
  const out = [];
  const py = Math.max(0, Math.floor((gridH - h) / 2));
  const px = Math.max(0, Math.floor((gridW - w) / 2));
  for (let y = 0; y < gridH; y++) {
    let row = '';
    for (let x = 0; x < gridW; x++) {
      const sy = y - py;
      const sx = x - px;
      if (sy >= 0 && sy < h && sx >= 0 && sx < w) row += norm[sy][sx];
      else row += '.';
    }
    out.push(row);
  }
  return out;
}

function cleanRow(row) {
  return row.replace(/([BD])K+$/g, '$1').replace(/^K+([BD])/g, '$1');
}

function cleanGrid(id, rows) {
  let g = rows.map(cleanRow);
  if (id === 'dino') {
    g = g.map((row, i) => (i >= 1 && i <= 5 ? row.replace(/D/g, 'B') : row));
  }
  if (id === 'bird') {
    g = g.map((row) => row.replace(/D/g, 'B'));
  }
  if (id === 'ghost' && g.length >= 6) {
    const n = g.length;
    g[n - 1] = g[n - 1].replace(/B/g, (m, off, s) => {
      const i = typeof off === 'number' ? off : s.indexOf(m);
      return (i % 3 === 1) ? '.' : 'B';
    });
    if (g[n - 2]) {
      g[n - 2] = g[n - 2].replace(/B{4,}/g, (m) => 'B'.repeat(Math.ceil(m.length / 2)) + '.'.repeat(Math.floor(m.length / 3)));
    }
  }
  return g;
}

function bob(a, b) { return [a, b]; }

function walkFrom(stand) {
  const w = stand.map((r) => r);
  const last = w.length - 1;
  for (let y = Math.max(0, last - 2); y <= last; y++) {
    const row = w[y].split('');
    const ds = [];
    row.forEach((ch, i) => { if (ch === 'D') ds.push(i); });
    if (ds.length >= 2) {
      row[ds[0]] = '.';
      row[ds[ds.length - 1]] = 'D';
    }
    w[y] = row.join('');
  }
  return w;
}

function sleepFrom(stand) {
  return stand.map((row) => row.replace(/KK/g, '..'));
}

const COLORS = {
  dog: { B: '#c4783a', D: '#8a4f22', K: '#1a1a2e', W: '#fff3e0', P: '#ff7aa2', C: '#e8a050' },
  cat: { B: '#b0b8c0', D: '#6e7680', K: '#1a1a2e', W: '#ffffff', P: '#f2a0b8', C: '#e8eef4' },
  bird: { B: '#4aa3ff', D: '#2b6fc2', K: '#1a1a2e', W: '#ffffff', Y: '#ffd14a', R: '#ff8a2b', A: '#7ec0ff' },
  rabbit: { B: '#f2f4f6', D: '#a8b0ba', K: '#1a1a2e', W: '#ffffff', P: '#ff8eb0', I: '#ffc2d6' },
  dino: { B: '#3ecfcf', D: '#1f8a8a', K: '#1a1a2e', W: '#ffffff', Y: '#b8f0f0' },
  dragon: { B: '#3daf4a', D: '#257a30', K: '#1a1a2e', W: '#ffffff', Y: '#ffd14a', F: '#ff5a52', A: '#6ecf78' },
  ghost: { B: 'rgba(236,240,244,0.96)', D: 'rgba(170,180,195,0.8)', K: '#1a1a2e', W: '#ffffff', N: '#1a1a2e' },
  slime: { B: '#4adf5a', D: '#2a9a38', K: '#1a1a2e', W: '#ffffff', E: '#1f7a2c', C: '#8aef98' }
};

const CLAWD_SUBPET_SPRITES = {};
for (const card of CARDS) {
  const raw = cleanGrid(card.id, digitize(card));
  const stand = padFrame(raw, W, H);
  const walk = padFrame(walkFrom(raw), W, H);
  const sleep = padFrame(sleepFrom(raw), W, H);
  const frames = { idle: bob(stand, stand), walk: bob(walk, stand), sleep: [sleep] };
  if (card.id === 'bird') {
    const fly0 = stand.map((r) => r.replace(/\.A/g, 'A.').replace(/A\./g, 'AA'));
    frames.flying = [fly0, walk, fly0];
  }
  if (card.id === 'dragon') {
    const fly0 = stand.map((r, yi) => (yi < 3 ? r.replace(/\./g, (m, i, s) => (i < s.length / 2 ? 'A' : '.')) : r));
    frames.flying = [fly0, walk, fly0];
    frames.special = bob(stand, stand);
  }
  if (card.id === 'slime') {
    frames.special = [sleepFrom(stand).map((r) => r.replace(/\.\./g, 'BB'))];
  }
  CLAWD_SUBPET_SPRITES[card.id] = { colors: COLORS[card.id], frames };
}

// --- PNG preview + catalog inject (from _make-sprites.mjs) ---
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const typeB = Buffer.from(type);
  const crcB = Buffer.alloc(4); crcB.writeUInt32BE(crc32(Buffer.concat([typeB, data])));
  return Buffer.concat([len, typeB, data, crcB]);
}
function pngRGBA(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}
function parseColor(c) {
  if (!c) return null;
  const hex = String(c).match(/^#([\da-f]{6})$/i);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return [n >> 16 & 255, n >> 8 & 255, n & 255, 255];
  }
  const rgba = String(c).match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i);
  if (rgba) return [+rgba[1], +rgba[2], +rgba[3], Math.round((rgba[4] !== undefined ? +rgba[4] : 1) * 255)];
  return null;
}
function renderSheet(sprites, scale = 14) {
  const ids = Object.keys(sprites);
  const pw = W * scale, ph = H * scale, cols = 4, gap = 22;
  const tw = cols * (pw + gap) + gap;
  const th = Math.ceil(ids.length / cols) * (ph + gap) + gap;
  const rgba = Buffer.alloc(tw * th * 4);
  for (let i = 0; i < tw * th; i++) {
    rgba[i * 4] = 18; rgba[i * 4 + 1] = 20; rgba[i * 4 + 2] = 32; rgba[i * 4 + 3] = 255;
  }
  const put = (x, y, r, g, b, a = 255) => {
    if (x < 0 || y < 0 || x >= tw || y >= th) return;
    const i = (y * tw + x) * 4;
    rgba[i] = r; rgba[i + 1] = g; rgba[i + 2] = b; rgba[i + 3] = a;
  };
  ids.forEach((id, idx) => {
    const fr = sprites[id].frames.idle[0];
    const colors = sprites[id].colors;
    const cx = gap + (idx % cols) * (pw + gap);
    const cy = gap + Math.floor(idx / cols) * (ph + gap);
    for (let yy = cy - 6; yy < cy + ph + 6; yy++) {
      for (let xx = cx - 6; xx < cx + pw + 6; xx++) put(xx, yy, 28, 30, 48);
    }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const col = parseColor(colors[fr[y][x]]);
      if (!col) continue;
      for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
        put(cx + x * scale + dx, cy + y * scale + dy, col[0], col[1], col[2], col[3]);
      }
    }
  });
  return pngRGBA(tw, th, rgba);
}
function framesToJs(frames) {
  return Object.entries(frames).map(([pose, set]) => {
    const body = set.map((fr) =>
      '[\n' + fr.map((r) => `        '${r}'`).join(',\n') + '\n      ]'
    ).join(',\n      ');
    return `      ${pose}: [\n      ${body}\n      ]`;
  }).join(',\n');
}
function spriteToJs(id, sprite) {
  const colorEntries = Object.entries(sprite.colors).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(', ');
  return `  ${id}: {\n    colors: { ${colorEntries} },\n    frames: {\n${framesToJs(sprite.frames)}\n    }\n  }`;
}

for (const [id, sp] of Object.entries(CLAWD_SUBPET_SPRITES)) {
  for (const [pose, frames] of Object.entries(sp.frames)) {
    frames.forEach((fr, i) => {
      if (fr.length !== H) throw new Error(`${id}.${pose}[${i}] rows=${fr.length}`);
      fr.forEach((r, yi) => {
        if (r.length !== W) throw new Error(`${id}.${pose}[${i}].r${yi} len=${r.length}`);
      });
    });
  }
  console.log(id, CLAWD_SUBPET_SPRITES[id].frames.idle[0].join('\n  '));
  console.log('---');
}

const outDir = path.join(testsDir, 'sprite-out');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, '_all.png'), renderSheet(CLAWD_SUBPET_SPRITES));
fs.writeFileSync(path.join(outDir, 'literal-injected.json'), JSON.stringify(
  Object.fromEntries(Object.entries(CLAWD_SUBPET_SPRITES).map(([id, s]) => [id, s.frames.idle[0]])), null, 2
));

const catalogPath = path.join(root, 'src/shared/catalog.js');
let catalog = fs.readFileSync(catalogPath, 'utf8');
const end = catalog.indexOf('function clawdShadePixelColor');
const markers = [
  catalog.indexOf('/* ---- Sub-pet pixel art'),
  catalog.indexOf('var CLAWD_SUBPET_CELL')
].filter((i) => i >= 0);
const injectFrom = markers.length ? Math.min(...markers) : catalog.indexOf('var CLAWD_SUBPET_SPRITES');
const comment = `/* ---- Sub-pet pixel art (shared: content + popup + docs)
   Grade ${W}×${H} @${CELL}px. Sprites LITERAIS do sheet "Subpets — 8 companheiros"
   (extraídos do PNG anexado @6px/célula, nearest-neighbor).
   B=corpo, D=sombra/orelha, K=olho, P=rosa, Y=amarelo, R=bico/pé, E=olho slime. */
var CLAWD_SUBPET_CELL = ${CELL};\n\n`;
catalog = catalog.slice(0, injectFrom) + comment +
  'var CLAWD_SUBPET_SPRITES = {\n' +
  Object.entries(CLAWD_SUBPET_SPRITES).map(([id, s]) => spriteToJs(id, s)).join(',\n') +
  '\n};\n\n' + catalog.slice(end);
fs.writeFileSync(catalogPath, catalog);
console.log('OK literal subpets injected → catalog.js + sprite-out/_all.png');
