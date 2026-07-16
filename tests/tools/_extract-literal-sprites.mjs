/**
 * Extrai pixels LITERAIS do sheet anexado → frames do catálogo.
 * Fonte preferida: assets Subpets-selection…png (ou tests/sprite-out/ref-literal-rgba.png)
 * node tests/tools/_extract-literal-sprites.mjs
 * node tests/tools/_extract-literal-sprites.mjs --inject
 */
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testsDir = path.resolve(__dirname, '..');
const root = path.resolve(__dirname, '../..');
const INJECT = process.argv.includes('--inject');

function decodePng(buf) {
  if (buf[0] !== 137) throw new Error('not png');
  let off = 8;
  let width = 0, height = 0, colorType = 6;
  const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off); off += 4;
    const type = buf.slice(off, off + 4).toString('ascii'); off += 4;
    const data = buf.slice(off, off + len); off += len + 4;
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      colorType = data[9];
      if (data[8] !== 8 || (colorType !== 6 && colorType !== 2)) {
        throw new Error(`need 8-bit rgb/rgba got bit=${data[8]} color=${colorType}`);
      }
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const bpp = colorType === 6 ? 4 : 3;
  const stride = width * bpp + 1;
  const rgba = Buffer.alloc(width * height * 4);
  let prev = Buffer.alloc(width * bpp);
  const paeth = (a, b, c) => {
    const p = a + b - c;
    const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
    if (pa <= pb && pa <= pc) return a;
    if (pb <= pc) return b;
    return c;
  };
  for (let y = 0; y < height; y++) {
    const ft = raw[y * stride];
    const row = raw.slice(y * stride + 1, y * stride + 1 + width * bpp);
    const out = Buffer.alloc(width * bpp);
    for (let i = 0; i < width * bpp; i++) {
      const x = row[i];
      const a = i >= bpp ? out[i - bpp] : 0;
      const b = prev[i];
      const c = i >= bpp ? prev[i - bpp] : 0;
      let v = x;
      if (ft === 1) v = (x + a) & 255;
      else if (ft === 2) v = (x + b) & 255;
      else if (ft === 3) v = (x + ((a + b) >> 1)) & 255;
      else if (ft === 4) v = (x + paeth(a, b, c)) & 255;
      else if (ft !== 0) throw new Error(`filter ${ft}`);
      out[i] = v;
    }
    for (let x = 0; x < width; x++) {
      const si = x * bpp;
      const di = (y * width + x) * 4;
      rgba[di] = out[si]; rgba[di + 1] = out[si + 1]; rgba[di + 2] = out[si + 2];
      rgba[di + 3] = bpp === 4 ? out[si + 3] : 255;
    }
    prev = out;
  }
  return { width, height, rgba };
}

function px(img, x, y) {
  if (x < 0 || y < 0 || x >= img.width || y >= img.height) return null;
  const i = (y * img.width + x) * 4;
  return { r: img.rgba[i], g: img.rgba[i + 1], b: img.rgba[i + 2], a: img.rgba[i + 3] };
}

function isCard(p) {
  if (!p) return false;
  return p.r >= 14 && p.r <= 48 && p.g >= 16 && p.g <= 52 && p.b >= 24 && p.b <= 70
    && Math.abs(p.r - p.g) < 18 && p.b >= p.r - 4;
}

function isPageBg(p) {
  return p && p.r < 14 && p.g < 14 && p.b < 18;
}

/** Texto do card (título/descrição): quase branco ou cinza claro neutro. */
function isLabel(p) {
  if (!p) return false;
  const L = (p.r + p.g + p.b) / 3;
  if (L > 175 && Math.abs(p.r - p.g) < 30 && Math.abs(p.g - p.b) < 30) return true;
  if (L > 120 && L < 190 && Math.abs(p.r - p.g) < 18 && Math.abs(p.g - p.b) < 18 && Math.abs(p.r - p.b) < 22) {
    return true;
  }
  return false;
}

function isSpritePixel(p) {
  if (!p || p.a < 120) return false;
  if (isPageBg(p) || isCard(p) || isLabel(p)) return false;
  return true;
}

function findCards(img) {
  const visited = new Uint8Array(img.width * img.height);
  const cards = [];
  const idx = (x, y) => y * img.width + x;
  for (let y = 50; y < img.height - 40; y++) {
    for (let x = 10; x < img.width - 10; x++) {
      if (visited[idx(x, y)]) continue;
      const p = px(img, x, y);
      if (!isCard(p)) continue;
      const stack = [[x, y]];
      visited[idx(x, y)] = 1;
      let minX = x, maxX = x, minY = y, maxY = y, count = 0;
      while (stack.length) {
        const [cx, cy] = stack.pop();
        count++;
        if (cx < minX) minX = cx; if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy; if (cy > maxY) maxY = cy;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cx + dx, ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= img.width || ny >= img.height) continue;
          if (visited[idx(nx, ny)]) continue;
          if (!isCard(px(img, nx, ny))) continue;
          visited[idx(nx, ny)] = 1;
          stack.push([nx, ny]);
        }
      }
      const bw = maxX - minX + 1, bh = maxY - minY + 1;
      if (bw > 150 && bh > 140 && bw < 340 && bh < 340 && count > 8000) {
        cards.push({ minX, minY, maxX, maxY, bw, bh });
      }
    }
  }
  cards.sort((a, b) => (a.minY - b.minY) || (a.minX - b.minX));
  return cards;
}

function isLightSprite(p) {
  if (!p) return false;
  const L = (p.r + p.g + p.b) / 3;
  return L > 195 && Math.abs(p.r - p.g) < 22 && Math.abs(p.g - p.b) < 22;
}

function rowChroma(img, card, y) {
  let n = 0, satSum = 0;
  for (let x = card.minX + 18; x <= card.maxX - 18; x++) {
    const p = px(img, x, y);
    if (!p || isCard(p) || isPageBg(p) || isLabel(p)) continue;
    const sat = Math.max(p.r, p.g, p.b) - Math.min(p.r, p.g, p.b);
    if (sat >= 16 || isLightSprite(p) || (p.r > 180 && p.g < 140 && p.b > 120)) { n++; satSum += Math.max(sat, 8); }
  }
  return { n, avg: n ? satSum / n : 0 };
}

function extractFromCard(img, card) {
  const yScan0 = card.minY + Math.floor(card.bh * 0.42);
  const yScan1 = card.minY + Math.floor(card.bh * 0.9);
  const rowStats = [];
  for (let y = yScan0; y < yScan1; y++) {
    rowStats.push({ y, ...rowChroma(img, card, y) });
  }
  // bloco principal = linhas com bastante cor (sprite), não título/descrição
  const active = rowStats.filter((r) => r.n >= 22);
  if (!active.length) return null;
  const y0 = active[0].y;
  const y1 = active[active.length - 1].y;

  const x0 = card.minX + 12;
  const x1 = card.maxX - 12;
  let minX = 99999, minY = y0, maxX = -1, maxY = y1;
  const pixels = [];
  const chromaAt = new Set();
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const p = px(img, x, y);
      if (!p || isCard(p) || isPageBg(p) || isLabel(p)) continue;
      const sat = Math.max(p.r, p.g, p.b) - Math.min(p.r, p.g, p.b);
      const isDark = p.r < 48 && p.g < 48 && p.b < 55;
      const isPink = p.r > 170 && p.g < 150 && p.b > 110;
      const isSprite = sat >= 14 || isLightSprite(p) || isPink;
      if (isSprite) chromaAt.add(`${x},${y}`);
      if (isSprite || isDark) {
        pixels.push({ x, y, ...p, sat, isDark });
        if (x < minX) minX = x; if (x > maxX) maxX = x;
      }
    }
  }
  // olhos pretos: só mantém se colado a pixel colorido (±2px)
  const kept = pixels.filter((p) => {
    if (!p.isDark) return true;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      if (chromaAt.has(`${p.x + dx},${p.y + dy}`)) return true;
    }
    return false;
  });
  if (maxX < 0 || !kept.length) return null;
  minX = Math.min(...kept.map((p) => p.x));
  maxX = Math.max(...kept.map((p) => p.x));
  minY = Math.min(...kept.map((p) => p.y));
  maxY = Math.max(...kept.map((p) => p.y));
  return {
    minX, minY, maxX, maxY,
    pixels: kept.map(({ x, y, r, g, b, a }) => ({ x, y, r, g, b, a })),
    w: maxX - minX + 1,
    h: maxY - minY + 1
  };
}

function rgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [n >> 16 & 255, n >> 8 & 255, n & 255];
}

const PALETTES = {
  dog: { B: rgb('#c4783a'), D: rgb('#8a4f22'), K: rgb('#1a1a2e'), P: rgb('#ff7aa2') },
  cat: { B: rgb('#b0b8c0'), D: rgb('#6e7680'), K: rgb('#1a1a2e'), P: rgb('#f2a0b8') },
  bird: { B: rgb('#4aa3ff'), D: rgb('#2b6fc2'), K: rgb('#1a1a2e'), Y: rgb('#ffd14a'), R: rgb('#ff8a2b'), A: rgb('#7ec0ff') },
  rabbit: { B: rgb('#f2f4f6'), D: rgb('#a8b0ba'), K: rgb('#1a1a2e'), P: rgb('#ff8eb0'), I: rgb('#ffc2d6') },
  dragon: { B: rgb('#3daf4a'), D: rgb('#257a30'), K: rgb('#1a1a2e'), Y: rgb('#ffd14a') },
  dino: { B: rgb('#3ecfcf'), D: rgb('#1f8a8a'), K: rgb('#1a1a2e'), Y: rgb('#b8f0f0') },
  ghost: { B: rgb('#eceff3'), D: rgb('#a8b0ba'), K: rgb('#1a1a2e'), N: rgb('#1a1a2e') },
  slime: { B: rgb('#4adf5a'), D: rgb('#2a9a38'), K: rgb('#1a1a2e'), E: rgb('#1f7a2c') }
};

const ORDER = ['dog', 'cat', 'bird', 'rabbit', 'dragon', 'dino', 'ghost', 'slime'];

function nearestLetter(p, palette) {
  let best = null, bestD = 1e9;
  for (const [ch, col] of Object.entries(palette)) {
    const d = Math.abs(p.r - col[0]) + Math.abs(p.g - col[1]) + Math.abs(p.b - col[2]);
    if (d < bestD) { bestD = d; best = ch; }
  }
  // tolerância larga (JPEG/AA)
  return bestD < 160 ? best : null;
}

/** Escala modal: comprimento de runs coloridos horizontais na faixa média. */
function estimateScale(ext) {
  // sprites no sheet ≈ 10–11 células de ~6px
  const byW = ext.w / 10;
  const byH = ext.h / 11;
  const guess = Math.round((byW + byH) / 2);
  const candidates = [guess - 1, guess, guess + 1, 5, 6, 7].filter((s) => s >= 5 && s <= 8);
  let pick = 6, pickScore = 1e9;
  for (const s of candidates) {
    const tw = Math.round(ext.w / s);
    const th = Math.round(ext.h / s);
    const score = Math.abs(tw - 10) * 4 + Math.abs(th - 11) * 2;
    if (score < pickScore) { pickScore = score; pick = s; }
  }
  return pick;
}

function buildGrid(ext, id) {
  const palette = PALETTES[id];
  const s = estimateScale(ext);
  const tw = Math.max(6, Math.round(ext.w / s));
  const th = Math.max(6, Math.round(ext.h / s));
  const buckets = Array.from({ length: th }, () => Array.from({ length: tw }, () => ({})));
  const counts = Array.from({ length: th }, () => Array.from({ length: tw }, () => 0));

  // amostragem no centro de cada célula (nearest-neighbor real)
  for (let gy = 0; gy < th; gy++) {
    for (let gx = 0; gx < tw; gx++) {
      const cx = Math.min(ext.maxX, Math.max(ext.minX, ext.minX + Math.floor((gx + 0.5) * s)));
      const cy = Math.min(ext.maxY, Math.max(ext.minY, ext.minY + Math.floor((gy + 0.5) * s)));
      // voto na janela  s/2
      const pad = Math.max(1, Math.floor(s * 0.35));
      for (let dy = -pad; dy <= pad; dy++) {
        for (let dx = -pad; dx <= pad; dx++) {
          const p = ext.pixels.find((q) => q.x === cx + dx && q.y === cy + dy);
          if (!p) continue;
          const ch = nearestLetter(p, palette);
          if (!ch) continue;
          buckets[gy][gx][ch] = (buckets[gy][gx][ch] || 0) + 1;
          counts[gy][gx]++;
        }
      }
    }
  }

  // fallback: todos os pixels nos buckets floored
  for (const p of ext.pixels) {
    const gx = Math.min(tw - 1, Math.max(0, Math.floor((p.x - ext.minX) / s)));
    const gy = Math.min(th - 1, Math.max(0, Math.floor((p.y - ext.minY) / s)));
    const ch = nearestLetter(p, palette);
    if (!ch) continue;
    buckets[gy][gx][ch] = (buckets[gy][gx][ch] || 0) + 1;
    counts[gy][gx]++;
  }

  const grid = [];
  for (let y = 0; y < th; y++) {
    let row = '';
    for (let x = 0; x < tw; x++) {
      const bag = buckets[y][x];
      let bestCh = '.', n = 0;
      for (const [ch, c] of Object.entries(bag)) {
        if (c > n) { n = c; bestCh = ch; }
      }
      // prioriza detalhes pequenos
      if (bag.K && bag.K >= Math.max(1, n * 0.22)) bestCh = 'K';
      else if (bag.E && bag.E >= Math.max(1, n * 0.22)) bestCh = 'E';
      else if (bag.N && bag.N >= Math.max(1, n * 0.22)) bestCh = 'N';
      else if (bag.P && bag.P >= Math.max(1, n * 0.28)) bestCh = 'P';
      else if (bag.I && bag.I >= Math.max(1, n * 0.28)) bestCh = 'I';
      else if (bag.Y && bag.Y >= Math.max(1, n * 0.28)) bestCh = 'Y';
      else if (bag.R && bag.R >= Math.max(1, n * 0.28)) bestCh = 'R';
      const minVotes = Math.max(2, Math.floor(s * 0.4));
      row += n >= minVotes || (bestCh !== '.' && (bestCh === 'K' || bestCh === 'P' || bestCh === 'Y' || bestCh === 'E' || bestCh === 'N'))
        ? bestCh
        : (n > 0 ? bestCh : '.');
    }
    grid.push(row);
  }
  let trimmed = trimGrid(grid);
  trimmed = trimmed.filter((row) => {
    const k = (row.match(/K/g) || []).length;
    const filled = row.replace(/\./g, '').length;
    return filled > 0 && k / Math.max(1, filled) < 0.45;
  });
  if (!trimmed.length) trimmed = trimGrid(grid);
  return { grid: trimGrid(trimmed), scale: s, tw, th };
}

function trimGrid(rows) {
  if (!rows.length) return rows;
  let top = 0, bot = rows.length - 1;
  while (top < rows.length && /^\.+$/.test(rows[top])) top++;
  while (bot > top && /^\.+$/.test(rows[bot])) bot--;
  const slice = rows.slice(top, bot + 1);
  let left = 0, right = slice[0].length - 1;
  while (left < right && slice.every((r) => r[left] === '.')) left++;
  while (right > left && slice.every((r) => r[right] === '.')) right--;
  return slice.map((r) => r.slice(left, right + 1));
}

function padTo(rows, W, H) {
  const h = rows.length, w = rows[0]?.length || 0;
  const out = [];
  const padY = Math.max(0, Math.floor((H - h) / 2));
  const padX = Math.max(0, Math.floor((W - w) / 2));
  for (let y = 0; y < H; y++) {
    let row = '';
    for (let x = 0; x < W; x++) {
      const sy = y - padY, sx = x - padX;
      row += (sy >= 0 && sy < h && sx >= 0 && sx < w) ? rows[sy][sx] : '.';
    }
    out.push(row);
  }
  return out;
}

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

function renderPreview(frames, palettes, scale = 12) {
  const ids = ORDER;
  const maxW = Math.max(...ids.map((id) => frames[id][0].length));
  const maxH = Math.max(...ids.map((id) => frames[id].length));
  const cols = 4, gap = 16;
  const pw = maxW * scale, ph = maxH * scale;
  const tw = cols * (pw + gap) + gap;
  const th = 2 * (ph + gap) + gap;
  const rgba = Buffer.alloc(tw * th * 4);
  for (let i = 0; i < tw * th; i++) {
    rgba[i * 4] = 18; rgba[i * 4 + 1] = 20; rgba[i * 4 + 2] = 32; rgba[i * 4 + 3] = 255;
  }
  const put = (x, y, r, g, b) => {
    if (x < 0 || y < 0 || x >= tw || y >= th) return;
    const i = (y * tw + x) * 4;
    rgba[i] = r; rgba[i + 1] = g; rgba[i + 2] = b; rgba[i + 3] = 255;
  };
  ids.forEach((id, idx) => {
    const fr = frames[id];
    const pal = palettes[id];
    const cx = gap + (idx % cols) * (pw + gap);
    const cy = gap + Math.floor(idx / cols) * (ph + gap);
    for (let y = 0; y < fr.length; y++) {
      for (let x = 0; x < fr[y].length; x++) {
        const ch = fr[y][x];
        if (ch === '.' || !pal[ch]) continue;
        const [r, g, b] = pal[ch];
        for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
          put(cx + x * scale + dx, cy + y * scale + dy, r, g, b);
        }
      }
    }
  });
  return pngRGBA(tw, th, rgba);
}

function resolveSource() {
  const candidates = [
    path.join(testsDir, 'sprite-out', 'ref-literal-rgba.png'),
    path.join(
      process.env.USERPROFILE || '',
      '.cursor/projects/c-Users-Frank-Desktop-pet-ext-ap-claude-project-validation-polish-7l02nf/assets',
      'c__Users_Frank_AppData_Roaming_Cursor_User_workspaceStorage_e9cc820318043322c28e414f55d2c09c_images_Subpets-selection-1a0cec25-f1be-484b-b966-1844b4e0520d.png'
    )
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('source PNG not found');
}

const pngPath = resolveSource();
const img = decodePng(fs.readFileSync(pngPath));
console.log('png', img.width, 'x', img.height, '←', path.basename(pngPath));
const cards = findCards(img);
console.log('cards', cards.length);
if (cards.length < 8) {
  console.error('need 8 cards');
  process.exit(1);
}

const frames = {};
const meta = {};
ORDER.forEach((id, i) => {
  const ext = extractFromCard(img, cards[i]);
  if (!ext) throw new Error(`empty ${id}`);
  const { grid, scale, tw, th } = buildGrid(ext, id);
  if (!grid.length) throw new Error(`empty grid ${id}`);
  console.log(`\n${id} bbox ${ext.w}x${ext.h} scale=${scale} → ${tw}x${th} trimmed ${grid[0].length}x${grid.length}`);
  grid.forEach((r) => console.log(' ', r));
  frames[id] = grid;
  meta[id] = { scale, tw, th, bbox: [ext.w, ext.h] };
});

const outDir = path.join(testsDir, 'sprite-out');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'literal-frames.json'), JSON.stringify({ frames, meta }, null, 2));
fs.writeFileSync(path.join(outDir, '_literal-preview.png'), renderPreview(frames, PALETTES));
console.log('\nwrote literal-frames.json + _literal-preview.png');

if (INJECT) {
  // injeta via _make-sprites pattern: atualiza frames stand + derivados
  console.log('use --inject via _make-sprites after review, or see catalog patch');
}
