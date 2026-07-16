/**
 * Sprites LITERAIS do sheet Subpets-selection.png.
 *
 * 1) Detecta os 8 cards
 * 2) Extrai pixels do personagem (card → transparente)
 * 3) Recupera olhos: buracos cor-de-card/escuros ENCAIXADOS entre corpo → #111111
 * 4) Quantiza na grade nativa (16px/célula) — cores literais do PNG
 * 5) Upscale NN → src/shared/sprites/subpets/<id>.png
 * 6) Gera tests/sprite-out/_literal-proof.png (sheet vs pacote)
 *
 * Ordem no sheet: dog, cat, bird, rabbit, dragon, dino, ghost, slime
 *
 * node tests/tools/_crop-literal-sprites.mjs
 */
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testsDir = path.resolve(__dirname, '..');
const root = path.resolve(__dirname, '../..');
const ORDER = ['dog', 'cat', 'bird', 'rabbit', 'dragon', 'dino', 'ghost', 'slime'];
const GRID_W = 12;
const GRID_H = 10;
const CELL_SRC = 16;
const PACK_SCALE = 8;
const EYE = [0x11, 0x11, 0x11];

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
    const rowB = raw.slice(y * stride + 1, y * stride + 1 + w * bpp);
    const out = Buffer.alloc(w * bpp);
    for (let i = 0; i < w * bpp; i++) {
      const x = rowB[i];
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
    chunk('IDAT', zlib.deflateSync(raw, { level: 6 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

const isCard = (r, g, b) =>
  r >= 14 && r <= 55 && g >= 16 && g <= 60 && b >= 24 && b <= 80 && Math.abs(r - g) < 22;

/** Fundo de card OU quase-preto (buraco de olho no sheet). */
function isHoleColor(r, g, b) {
  if (isCard(r, g, b)) return true;
  const L = (r + g + b) / 3;
  const sat = Math.max(r, g, b) - Math.min(r, g, b);
  return sat < 30 && L < 72;
}

function findCards(img) {
  const rowHas = Array(img.h).fill(false);
  for (let y = 0; y < img.h; y++) {
    let n = 0;
    for (let x = 0; x < img.w; x += 4) {
      const i = (y * img.w + x) * 4;
      if (isCard(img.rgba[i], img.rgba[i + 1], img.rgba[i + 2])) n++;
    }
    rowHas[y] = n > img.w / 20;
  }
  const yRanges = [];
  let start = -1;
  for (let y = 0; y < img.h; y++) {
    if (rowHas[y] && start < 0) start = y;
    if ((!rowHas[y] || y === img.h - 1) && start >= 0) {
      const end = rowHas[y] ? y : y - 1;
      if (end - start > 80) yRanges.push([start, end]);
      start = -1;
    }
  }
  const cards = [];
  for (const [y0, y1] of yRanges) {
    const col = [];
    for (let x = 0; x < img.w; x++) {
      let n = 0;
      for (let y = y0; y <= y1; y += 3) {
        const i = (y * img.w + x) * 4;
        if (isCard(img.rgba[i], img.rgba[i + 1], img.rgba[i + 2])) n++;
      }
      col[x] = n > ((y1 - y0) / 3) * 0.4;
    }
    let s = -1;
    for (let x = 0; x < img.w; x++) {
      if (col[x] && s < 0) s = x;
      if ((!col[x] || x === img.w - 1) && s >= 0) {
        const e = col[x] ? x : x - 1;
        if (e - s > 100) cards.push({ minX: s, maxX: e, minY: y0, maxY: y1 });
        s = -1;
      }
    }
  }
  return cards;
}

function px(img, x, y) {
  const i = (y * img.w + x) * 4;
  return [img.rgba[i], img.rgba[i + 1], img.rgba[i + 2], img.rgba[i + 3]];
}

/**
 * Corpo = não-card na faixa do sprite.
 * Olhos = runs de hole-color ENCAIXADOS entre corpo (≤2.5 células), ou boca curta no centro.
 */
function collectSprite(img, card) {
  const bh = card.maxY - card.minY + 1;
  const bw = card.maxX - card.minX + 1;
  const yA = card.minY + Math.floor(bh * 0.36);
  const yB = card.minY + Math.floor(bh * 0.74);
  const xA = card.minX + Math.floor(bw * 0.10);
  const xB = card.minX + Math.floor(bw * 0.90);

  const body = new Set();
  let minX = 1e9, minY = 1e9, maxX = -1, maxY = -1;

  for (let y = yA; y <= yB; y++) {
    for (let x = xA; x <= xB; x++) {
      const [r, g, b, a] = px(img, x, y);
      if (a < 40 || isHoleColor(r, g, b)) continue;
      body.add(`${x},${y}`);
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) return null;

  const eyes = new Set();
  const maxHole = Math.floor(CELL_SRC * 2.25);
  const minHole = Math.floor(CELL_SRC * 0.7);
  // olhos na faixa média — evita crista do dino e vão entre patas
  const faceY0 = minY + Math.floor((maxY - minY) * 0.28);
  const faceY1 = minY + Math.floor((maxY - minY) * 0.58);

  for (let y = faceY0; y <= faceY1; y++) {
    let x = minX;
    while (x <= maxX) {
      const [r, g, b] = px(img, x, y);
      if (!isHoleColor(r, g, b) || body.has(`${x},${y}`)) { x++; continue; }
      const x0 = x;
      while (x <= maxX) {
        const [rr, gg, bb] = px(img, x, y);
        if (!isHoleColor(rr, gg, bb) || body.has(`${x},${y}`)) break;
        x++;
      }
      const x1 = x - 1;
      const len = x1 - x0 + 1;
      if (x <= x0) x = x0 + 1;
      if (len < minHole || len > maxHole) continue;
      const leftBody = body.has(`${x0 - 1},${y}`) || body.has(`${x0 - 2},${y}`);
      const rightBody = body.has(`${x1 + 1},${y}`) || body.has(`${x1 + 2},${y}`);
      if (leftBody && rightBody) {
        for (let hx = x0; hx <= x1; hx++) eyes.add(`${hx},${y}`);
      }
    }
  }

  // inclui olhos no bbox
  for (const key of eyes) {
    const [xs, ys] = key.split(',').map(Number);
    if (xs < minX) minX = xs; if (xs > maxX) maxX = xs;
    if (ys < minY) minY = ys; if (ys > maxY) maxY = ys;
  }

  // alinha grade aos olhos (1 célula de altura) — evita KK empilhados por offset
  let originX = Math.floor(minX / CELL_SRC) * CELL_SRC;
  let originY = Math.floor(minY / CELL_SRC) * CELL_SRC;
  if (eyes.size) {
    const eyeYs = [...eyes].map((k) => Number(k.split(',')[1]));
    const eyeXs = [...eyes].map((k) => Number(k.split(',')[0]));
    const alignY = Math.min(...eyeYs);
    const alignX = Math.min(...eyeXs);
    const snap = (align, minV) => {
      const k = Math.ceil((align - minV) / CELL_SRC);
      return align - k * CELL_SRC;
    };
    originY = snap(alignY, minY);
    originX = snap(alignX, minX);
  }

  const cellsW = Math.ceil((maxX - originX + 1) / CELL_SRC);
  const cellsH = Math.ceil((maxY - originY + 1) / CELL_SRC);

  return {
    body,
    eyes,
    originX,
    originY,
    cellsW,
    cellsH,
    minX: originX,
    minY: originY,
    maxX: originX + cellsW * CELL_SRC - 1,
    maxY: originY + cellsH * CELL_SRC - 1
  };
}

function quantizeCell(img, ox, oy, body, eyes) {
  let bodyN = 0, eyeN = 0;
  const votes = new Map();
  for (let dy = 0; dy < CELL_SRC; dy++) {
    for (let dx = 0; dx < CELL_SRC; dx++) {
      const x = ox + dx, y = oy + dy;
      const key = `${x},${y}`;
      if (eyes.has(key)) { eyeN++; continue; }
      if (!body.has(key)) continue;
      bodyN++;
      const [r, g, b] = px(img, x, y);
      const q = ((r >> 3) << 16) | ((g >> 3) << 8) | (b >> 3);
      const cur = votes.get(q) || { n: 0, r: 0, g: 0, b: 0 };
      cur.n++; cur.r += r; cur.g += g; cur.b += b;
      votes.set(q, cur);
    }
  }
  const n = bodyN + eyeN;
  if (n < CELL_SRC * CELL_SRC * 0.16) return null;
  // prioriza olho se a célula for majoritariamente buraco de olho
  if (eyeN >= CELL_SRC * CELL_SRC * 0.4) return [...EYE, 255];
  if (eyeN >= Math.max(12, n * 0.35) && eyeN >= bodyN) return [...EYE, 255];
  if (!bodyN) return eyeN > 0 ? [...EYE, 255] : null;
  let best = null, bestN = 0;
  let accent = null, accentN = 0;
  for (const v of votes.values()) {
    if (v.n > bestN) { bestN = v.n; best = v; }
    const ar = v.r / v.n, ag = v.g / v.n, ab = v.b / v.n;
    const sat = Math.max(ar, ag, ab) - Math.min(ar, ag, ab);
    const pink = ar > 175 && ag < 175 && ab > 95 && ab < 220 && ar > ag + 25;
    const yellow = ar > 190 && ag > 140 && ab < 130 && sat > 40;
    const orange = ar > 190 && ag > 90 && ag < 170 && ab < 100;
    if ((pink || yellow || orange) && v.n > accentN) {
      accent = v; accentN = v.n;
    }
  }
  // orelha/bico/língua: acento cromático não pode sumir no voto do corpo
  if (accent && accentN >= Math.max(18, bodyN * 0.16)) best = accent;
  if (!best) return null;
  return [
    Math.round(best.r / best.n),
    Math.round(best.g / best.n),
    Math.round(best.b / best.n),
    255
  ];
}

function trimCells(cells) {
  if (!cells.length || !cells[0]?.length) return { cells: [[]], gw: 0, gh: 0 };
  let top = 0, bot = cells.length - 1;
  while (top <= bot && cells[top].every((c) => !c)) top++;
  while (bot >= top && cells[bot].every((c) => !c)) bot--;
  if (top > bot) return { cells: [[]], gw: 0, gh: 0 };
  const width = cells[top].length;
  let left = 0, right = width - 1;
  const rows = cells.slice(top, bot + 1);
  while (left <= right && rows.every((row) => !row[left])) left++;
  while (right >= left && rows.every((row) => !row[right])) right--;
  if (left > right) return { cells: [[]], gw: 0, gh: 0 };
  const sliced = rows.map((row) => row.slice(left, right + 1));
  return { cells: sliced, gw: sliced[0].length, gh: sliced.length };
}

function buildGrid(img, box) {
  const cells = Array.from({ length: box.cellsH }, () => Array(box.cellsW).fill(null));
  for (let gy = 0; gy < box.cellsH; gy++) {
    for (let gx = 0; gx < box.cellsW; gx++) {
      cells[gy][gx] = quantizeCell(
        img,
        box.originX + gx * CELL_SRC,
        box.originY + gy * CELL_SRC,
        box.body,
        box.eyes
      );
    }
  }
  return trimCells(cells);
}

function padToCanvas(grid) {
  let { cells, gw, gh } = grid;
  // se maior que canvas, corta centro (preserva face)
  if (gw > GRID_W) {
    const ox = Math.floor((gw - GRID_W) / 2);
    cells = cells.map((row) => row.slice(ox, ox + GRID_W));
    gw = GRID_W;
  }
  if (gh > GRID_H) {
    const oy = Math.floor((gh - GRID_H) / 2);
    cells = cells.slice(oy, oy + GRID_H);
    gh = GRID_H;
  }
  const out = Buffer.alloc(GRID_W * GRID_H * 4);
  const ox = Math.max(0, Math.floor((GRID_W - gw) / 2));
  const oy = Math.max(0, Math.floor((GRID_H - gh) / 2));
  for (let y = 0; y < gh; y++) {
    for (let x = 0; x < gw; x++) {
      const c = cells[y][x];
      if (!c) continue;
      const di = ((y + oy) * GRID_W + (x + ox)) * 4;
      out[di] = c[0]; out[di + 1] = c[1]; out[di + 2] = c[2]; out[di + 3] = c[3];
    }
  }
  return { w: GRID_W, h: GRID_H, rgba: out, ox, oy, gw, gh };
}

/** Garante olhos #111 opacos — sem inventar buracos novos agressivos. */
function reinforceEyes(src) {
  const { w, h, rgba } = src;
  const out = Buffer.from(rgba);
  const isEyeRGB = (di) =>
    out[di + 3] > 40 &&
    Math.abs(out[di] - EYE[0]) < 12 &&
    Math.abs(out[di + 1] - EYE[1]) < 12 &&
    Math.abs(out[di + 2] - EYE[2]) < 12;

  // escuros residuais → EYE exato
  for (let i = 0; i < w * h; i++) {
    const di = i * 4;
    if (out[di + 3] < 40) continue;
    const L = (out[di] + out[di + 1] + out[di + 2]) / 3;
    const sat = Math.max(out[di], out[di + 1], out[di + 2]) - Math.min(out[di], out[di + 1], out[di + 2]);
    if (sat < 30 && L < 85) {
      out[di] = EYE[0]; out[di + 1] = EYE[1]; out[di + 2] = EYE[2]; out[di + 3] = 255;
    }
  }

  let eyes = 0;
  for (let i = 0; i < w * h; i++) if (isEyeRGB(i * 4)) eyes++;
  return { w, h, rgba: out, eyes };
}

function upscale(src, scale) {
  const w = src.w * scale, h = src.h * scale;
  const rgba = Buffer.alloc(w * h * 4);
  for (let y = 0; y < src.h; y++) {
    for (let x = 0; x < src.w; x++) {
      const si = (y * src.w + x) * 4;
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          const di = ((y * scale + dy) * w + (x * scale + dx)) * 4;
          rgba[di] = src.rgba[si];
          rgba[di + 1] = src.rgba[si + 1];
          rgba[di + 2] = src.rgba[si + 2];
          rgba[di + 3] = src.rgba[si + 3];
        }
      }
    }
  }
  return { w, h, rgba };
}

function cropSheetThumb(img, box, outW, outH) {
  const rgba = Buffer.alloc(outW * outH * 4);
  const srcW = box.maxX - box.minX + 1;
  const srcH = box.maxY - box.minY + 1;
  for (let y = 0; y < outH; y++) {
    for (let x = 0; x < outW; x++) {
      const sx = box.minX + Math.floor((x + 0.5) * srcW / outW);
      const sy = box.minY + Math.floor((y + 0.5) * srcH / outH);
      const key = `${sx},${sy}`;
      const di = (y * outW + x) * 4;
      if (box.body.has(key) || box.eyes.has(key)) {
        if (box.eyes.has(key)) {
          rgba[di] = EYE[0]; rgba[di + 1] = EYE[1]; rgba[di + 2] = EYE[2]; rgba[di + 3] = 255;
        } else {
          const [r, g, b] = px(img, sx, sy);
          rgba[di] = r; rgba[di + 1] = g; rgba[di + 2] = b; rgba[di + 3] = 255;
        }
      }
    }
  }
  return { w: outW, h: outH, rgba };
}

function blit(dst, src, dx, dy, bg) {
  for (let y = 0; y < src.h; y++) {
    for (let x = 0; x < src.w; x++) {
      const si = (y * src.w + x) * 4;
      const tx = dx + x, ty = dy + y;
      if (tx < 0 || ty < 0 || tx >= dst.w || ty >= dst.h) continue;
      const di = (ty * dst.w + tx) * 4;
      if (src.rgba[si + 3] < 40) {
        if (bg) {
          dst.rgba[di] = bg[0]; dst.rgba[di + 1] = bg[1]; dst.rgba[di + 2] = bg[2]; dst.rgba[di + 3] = 255;
        }
        continue;
      }
      dst.rgba[di] = src.rgba[si];
      dst.rgba[di + 1] = src.rgba[si + 1];
      dst.rgba[di + 2] = src.rgba[si + 2];
      dst.rgba[di + 3] = 255;
    }
  }
}

function fitInto(src, tw, th) {
  // letterbox packed sprite into tw×th
  const rgba = Buffer.alloc(tw * th * 4);
  const scale = Math.min(tw / src.w, th / src.h);
  const dw = Math.round(src.w * scale);
  const dh = Math.round(src.h * scale);
  const ox = Math.floor((tw - dw) / 2);
  const oy = Math.floor((th - dh) / 2);
  for (let y = 0; y < dh; y++) {
    for (let x = 0; x < dw; x++) {
      const sx = Math.min(src.w - 1, Math.floor(x / scale));
      const sy = Math.min(src.h - 1, Math.floor(y / scale));
      const si = (sy * src.w + sx) * 4;
      const di = ((oy + y) * tw + (ox + x)) * 4;
      rgba[di] = src.rgba[si];
      rgba[di + 1] = src.rgba[si + 1];
      rgba[di + 2] = src.rgba[si + 2];
      rgba[di + 3] = src.rgba[si + 3];
    }
  }
  return { w: tw, h: th, rgba };
}

function makeProof(img, boxes, packed) {
  const thumb = 96;
  const gap = 12;
  const labelH = 10;
  const rowH = thumb + gap + labelH;
  const cols = 8;
  const tw = gap + cols * (thumb + gap);
  const th = gap + 2 * rowH + gap;
  const rgba = Buffer.alloc(tw * th * 4);
  for (let y = 0; y < th; y++) {
    for (let x = 0; x < tw; x++) {
      const i = (y * tw + x) * 4;
      const c = ((x >> 3) ^ (y >> 3)) & 1 ? 28 : 36;
      rgba[i] = c; rgba[i + 1] = c; rgba[i + 2] = c + 8; rgba[i + 3] = 255;
    }
  }
  const canvas = { w: tw, h: th, rgba };
  const light = [236, 238, 242];
  ORDER.forEach((id, i) => {
    const x = gap + i * (thumb + gap);
    blit(canvas, cropSheetThumb(img, boxes[id], thumb, thumb), x, gap, light);
    blit(canvas, fitInto(packed[id], thumb, thumb), x, gap + rowH, light);
  });
  return canvas;
}

// --- main ---
const sheetCandidates = [
  path.join(testsDir, 'sprite-out', 'Subpets-selection.png'),
  path.join(
    process.env.USERPROFILE || '',
    '.cursor/projects/c-Users-Frank-Desktop-pet-ext-ap-claude-project-validation-polish-7l02nf/assets',
    'c__Users_Frank_AppData_Roaming_Cursor_User_workspaceStorage_e9cc820318043322c28e414f55d2c09c_images_Subpets-selection-3ac1f79c-ad9a-4163-9340-3d5e5fdb21ad.png'
  )
];
const sheetPath = sheetCandidates.find((p) => fs.existsSync(p));
if (!sheetPath) throw new Error('Subpets-selection.png not found');

const img = decodePng(fs.readFileSync(sheetPath));
const cards = findCards(img);
if (cards.length < 8) throw new Error(`need 8 cards, got ${cards.length}`);

const outDir = path.join(root, 'src/shared/sprites/subpets');
const previewDir = path.join(testsDir, 'sprite-out');
fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(previewDir, { recursive: true });

const meta = {};
const boxes = {};
const packedMap = {};

ORDER.forEach((id, i) => {
  const box = collectSprite(img, cards[i]);
  if (!box) throw new Error(`empty crop for ${id}`);
  boxes[id] = box;
  const grid = buildGrid(img, box);
  if (!grid.gw) throw new Error(`empty grid for ${id}`);
  let canvas = padToCanvas(grid);
  canvas = reinforceEyes(canvas);
  const packed = upscale(canvas, PACK_SCALE);
  packedMap[id] = packed;

  const png = pngRGBA(packed.w, packed.h, packed.rgba);
  fs.writeFileSync(path.join(outDir, `${id}.png`), png);
  fs.writeFileSync(path.join(previewDir, `${id}-literal.png`), png);

  meta[id] = {
    packedW: packed.w,
    packedH: packed.h,
    width: GRID_W * 4,
    height: GRID_H * 4,
    gridW: GRID_W,
    gridH: GRID_H,
    cellsW: grid.gw,
    cellsH: grid.gh,
    eyes: canvas.eyes
  };
  console.log(id, `${grid.gw}x${grid.gh} → ${packed.w}x${packed.h}`, `eyes=${canvas.eyes}`);
});

const proof = makeProof(img, boxes, packedMap);
fs.writeFileSync(path.join(previewDir, '_literal-proof.png'), pngRGBA(proof.w, proof.h, proof.rgba));
fs.writeFileSync(path.join(previewDir, 'literal-crop-meta.json'), JSON.stringify(meta, null, 2));

console.log('OK literal crops →', outDir);
console.log('proof →', path.join(previewDir, '_literal-proof.png'));
console.log('Próximo: node tests/tools/_inject-image-meta.mjs');
console.log('NÃO rode _make-sprites.mjs para PNGs do pacote — WRITE_PKG_SPRITES=1 sobrescreve.');
