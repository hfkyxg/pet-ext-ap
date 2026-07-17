/**
 * Gera ícones PNG do Claw'd (rosto clássico vermelho) para o Chrome.
 * Fonte: grade do pet-classic em src/assets/pet-banner.svg (14×12 células).
 *
 * node tests/tools/make-icons.mjs
 */
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');
const outDir = path.join(root, 'src', 'assets', 'icons');

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeB = Buffer.from(type);
  const crcB = Buffer.alloc(4);
  crcB.writeUInt32BE(crc32(Buffer.concat([typeB, data])));
  return Buffer.concat([len, typeB, data, crcB]);
}
function pngRGBA(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}
function parseHex(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [n >> 16 & 255, n >> 8 & 255, n & 255, 255];
}

/* Rosto clássico — 14×12 (SVG 56×48 ÷ 4) */
const W = 14;
const H = 12;
const BODY = '#e11920';
const SHADE = '#8f0f16';
const FEET = '#5c0a0e';
const MOUTH = '#7a0c12';
const WHITE = '#ffffff';
const PUPIL = '#10121f';

const grid = Array.from({ length: H }, () => Array(W).fill(null));
function fill(x0, y0, x1, y1, color) {
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      if (x >= 0 && y >= 0 && x < W && y < H) grid[y][x] = color;
    }
  }
}

fill(0, 1, 2, 3, BODY);
fill(12, 1, 14, 3, BODY);
fill(1, 3, 3, 4, BODY);
fill(11, 3, 13, 4, BODY);
fill(4, 2, 10, 5, BODY);
fill(2, 5, 12, 6, BODY);
fill(2, 6, 3, 8, BODY);
fill(5, 6, 9, 8, BODY);
fill(11, 6, 12, 8, BODY);
fill(2, 8, 6, 9, BODY);
fill(8, 8, 12, 9, BODY);
fill(2, 9, 12, 10, BODY);
fill(4, 10, 10, 11, BODY);
fill(2, 10, 4, 11, SHADE);
fill(10, 10, 12, 11, SHADE);
fill(3, 11, 5, 12, FEET);
fill(9, 11, 11, 12, FEET);
fill(6, 8, 8, 9, MOUTH);
fill(3, 6, 5, 7, WHITE);
fill(9, 6, 11, 7, WHITE);
fill(3, 7, 4, 8, WHITE);
fill(9, 7, 10, 8, WHITE);
fill(4, 7, 5, 8, PUPIL);
fill(10, 7, 11, 8, PUPIL);

function renderAt(size) {
  const rgba = Buffer.alloc(size * size * 4);
  const cell = Math.max(1, Math.floor(Math.min(size / W, size / H)));
  const pxW = W * cell;
  const pxH = H * cell;
  const ox = Math.floor((size - pxW) / 2);
  const oy = Math.floor((size - pxH) / 2);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const c = grid[y][x];
      if (!c) continue;
      const [r, g, b, a] = parseHex(c);
      for (let dy = 0; dy < cell; dy++) {
        for (let dx = 0; dx < cell; dx++) {
          const px = ox + x * cell + dx;
          const py = oy + y * cell + dy;
          const i = (py * size + px) * 4;
          rgba[i] = r;
          rgba[i + 1] = g;
          rgba[i + 2] = b;
          rgba[i + 3] = a;
        }
      }
    }
  }
  return rgba;
}

fs.mkdirSync(outDir, { recursive: true });
for (const size of [16, 32, 48, 128]) {
  const buf = pngRGBA(size, size, renderAt(size));
  const file = path.join(outDir, `icon-${size}.png`);
  fs.writeFileSync(file, buf);
  console.log('wrote', path.relative(root, file), `(${buf.length} bytes)`);
}
