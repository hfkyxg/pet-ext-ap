/**
 * Atualiza frames/cores no catalog.js + preview em tests/sprite-out/.
 *
 * IMPORTANTE — PNGs do pacote (src/shared/sprites/subpets/*.png):
 *   Fonte canônica = crops do sheet via `node tests/tools/crop-literal-sprites.mjs`
 *   (Subpets-selection.png). Por padrão ESTE script NÃO sobrescreve esses PNGs,
 *   para não destruir a fidelidade ao sheet. Só escreve no pacote se
 *   WRITE_PKG_SPRITES=1 (ou LITERAL_SHEET=0 com WRITE_PKG_SPRITES=1).
 *
 * node tests/tools/make-sprites.mjs
 * WRITE_PKG_SPRITES=1 node tests/tools/make-sprites.mjs   # força PNGs do pacote
 */
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testsDir = path.resolve(__dirname, '..');
const root = path.resolve(__dirname, '../..');
const CELL = 4, W = 12, H = 10;

function row(s) {
  let out = s;
  if (out.length < W) out += '.'.repeat(W - out.length);
  if (out.length > W) out = out.slice(0, W);
  return out;
}
function frame(...rows) {
  if (rows.length !== H) throw new Error(`need ${H} got ${rows.length}`);
  return rows.map(row);
}
function bob(a, b) { return [a, b]; }

/* B=corpo D=sombra/orelha K=olho linha W=branco P=rosa Y=amarelo R=laranja/bico E=olho slime A=asa */

/* ---- CACHORRO (marrom, orelhas escuras, nariz+língua, olhos KK pretos)
   Olhos KK com corpo B entre eles — sem buracos transparentes (viram máscara no fundo escuro). ---- */
const dogStand = frame(
  '............',
  '..D......D..',
  '.DBBBBBBBBD.',
  'BBBBBBBBBBBB',
  'BBBKKBBKKBBB',
  'BBBBBKKBBBBB',
  'BBBBBPPBBBBB',
  '.BB......BB.',
  '..D......D..',
  '............'
);
/* Idle com “abanar”: patinha/rabo se mexendo. */
const dogWag = frame(
  '............',
  '..D......D..',
  '.DBBBBBBBBD.',
  'BBBBBBBBBBBB',
  'BBBKKBBKKBBB',
  'BBBBBKKBBBBB',
  'BBBBBPPBBBBB',
  '.BB......BB.',
  '.D........D.',
  '............'
);
const dogWalk = frame(
  '............',
  '..D......D..',
  '.DBBBBBBBBD.',
  'BBBBBBBBBBBB',
  'BBBKKBBKKBBB',
  'BBBBBKKBBBBB',
  'BBBBBPPBBBBB',
  '.BB......BB.',
  '.D........D.',
  '............'
);
const dogSleep = frame(
  '............',
  '..D......D..',
  '.DBBBBBBBBD.',
  'BBBBBBBBBBBB',
  'BB........BB',
  'BBBBBKKBBBBB',
  'BBBBBPPBBBBB',
  '............',
  '............',
  '............'
);

/* ---- GATO (cinza, orelhas rosa por dentro) ---- */
const catStand = frame(
  '............',
  '.D.P....P.D.',
  '.DPP....PPD.',
  '.BBBBBBBBBB.',
  'BBBKKBBKKBBB',
  'BBBKKBBKKBBB',
  'BBBBBPPBBBBB',
  '.BB......BB.',
  '..D......D..',
  '............'
);
const catWalk = frame(
  '............',
  '.D.P....P.D.',
  '.DPP....PPD.',
  '.BBBBBBBBBB.',
  'BBBKKBBKKBBB',
  'BBBKKBBKKBBB',
  'BBBBBPPBBBBB',
  '.BB......BB.',
  '.D........D.',
  '............'
);
const catSleep = frame(
  '............',
  '.D.P....P.D.',
  '.DPP....PPD.',
  '.BBBBBBBBBB.',
  'BB........BB',
  'BBBBBBBBBBBB',
  'BBBBBPPBBBBB',
  '............',
  '............',
  '............'
);

/* ---- PÁSSARO (azul, bico amarelo, pés laranja) ---- */
const birdStand = frame(
  '............',
  '...BBBBBB...',
  '..BBBBBBBB..',
  '.BBBKKBBKKBB',
  '.BBBBBYYBBB.',
  'A.BBBBBBBB.A',
  '..BBBBBBBB..',
  '...R....R...',
  '............',
  '............'
);
const birdWalk = frame(
  '............',
  '...BBBBBB...',
  '..BBBBBBBB..',
  '.BBBKKBBKKBB',
  '.BBBBBYYBBB.',
  'A.BBBBBBBB.A',
  '..BBBBBBBB..',
  '..R......R..',
  '............',
  '............'
);
const birdFly0 = frame(
  '............',
  'AA.BBBBBB.AA',
  'A.BBBBBBBB.A',
  '..BBKKBBKKB.',
  '..BBBBYYBB..',
  '...BBBBBB...',
  '............',
  '............',
  '............',
  '............'
);
const birdFly1 = frame(
  '............',
  '.A.BBBBBB.A.',
  'AA.BBBBBB.AA',
  'A.BBKKBBKKBB',
  '..BBBBYYBB..',
  '...BBBBBB...',
  '............',
  '............',
  '............',
  '............'
);
const birdSleep = frame(
  '............',
  '...BBBBBB...',
  '..BBBBBBBB..',
  '.BB......BB.',
  '.BBBBBYYBBB.',
  'A.BBBBBBBB.A',
  '..BBBBBBBB..',
  '............',
  '............',
  '............'
);

/* ---- COELHO (branco, orelhas longas + rosa) ---- */
const rabbitStand = frame(
  '............',
  '.DP......PD.',
  '.DP......PD.',
  '.DBBBBBBBBD.',
  'BBBKKBBKKBBB',
  'BBBBBBBBBBBB',
  'BBBBBPPBBBBB',
  '.BB......BB.',
  '..D......D..',
  '............'
);
const rabbitWalk = frame(
  '............',
  '.DP......PD.',
  '.DP......PD.',
  '.DBBBBBBBBD.',
  'BBBKKBBKKBBB',
  'BBBBBBBBBBBB',
  'BBBBBPPBBBBB',
  '.BB......BB.',
  '.D........D.',
  '............'
);
const rabbitSleep = frame(
  '............',
  '.DP......PD.',
  '.DP......PD.',
  '.DBBBBBBBBD.',
  'BB........BB',
  'BBBBBBBBBBBB',
  'BBBBBPPBBBBB',
  '............',
  '............',
  '............'
);

/* ---- DINO (teal, 3 espinhos) ---- */
const dinoStand = frame(
  '............',
  '...D.D.D....',
  '..BBBBBBB...',
  '.BBBBBBBBB..',
  'BBBKKBBKKBBB',
  'BBBBBBBBBBBB',
  '.BBBBBBBBBB.',
  '..BB....BB..',
  '..D......D..',
  '............'
);
const dinoWalk = frame(
  '............',
  '...D.D.D....',
  '..BBBBBBB...',
  '.BBBBBBBBB..',
  'BBBKKBBKKBBB',
  'BBBBBBBBBBBB',
  '.BBBBBBBBBB.',
  '..BB....BB..',
  '.D........D.',
  '............'
);
const dinoSleep = frame(
  '............',
  '...D.D.D....',
  '..BBBBBBB...',
  '.BBBBBBBBB..',
  'BB........BB',
  'BBBBBBBBBBBB',
  '.BBBBBBBBBB.',
  '............',
  '............',
  '............'
);

/* ---- DRAGÃO (verde irregular/denteado, chifres amarelos) ---- */
const dragonStand = frame(
  '............',
  '.Y.D....D.Y.',
  '..D......D..',
  '.DBBBBBBBBD.',
  'DBBKKBBKKBBD',
  'BBBBBBBBBBBB',
  '.DBBBBBBBBD.',
  '.BB......BB.',
  '..D......D..',
  '............'
);
const dragonWalk = frame(
  '............',
  '.Y.D....D.Y.',
  '..D......D..',
  '.DBBBBBBBBD.',
  'DBBKKBBKKBBD',
  'BBBBBBBBBBBB',
  '.DBBBBBBBBD.',
  '.BB......BB.',
  '.D........D.',
  '............'
);
const dragonFly0 = frame(
  '............',
  'AA.Y.D..D.YA',
  'A..D....D..A',
  '..DBBBBBBD..',
  '.DBKKBBKKBD.',
  '.BBBBBBBBBB.',
  '..DBBBBBBD..',
  '............',
  '............',
  '............'
);
const dragonFly1 = frame(
  '............',
  '.A.Y.D..DY.A',
  'AA.D....D.AA',
  '.ADBBBBBBA..',
  '.DBKKBBKKBD.',
  '.BBBBBBBBBB.',
  '..DBBBBBBD..',
  '............',
  '............',
  '............'
);
const dragonSleep = frame(
  '............',
  '.Y.D....D.Y.',
  '..D......D..',
  '.DBBBBBBBBD.',
  'DB........BD',
  'BBBBBBBBBBBB',
  '.DBBBBBBBBD.',
  '............',
  '............',
  '............'
);
const dragonSpecial = frame(
  '............',
  '.Y.D....D.Y.',
  '..D......D..',
  '.DBBBBBBBBD.',
  'DBBKKBBKKBBD',
  'BBBBBBBBBBBB',
  '.DBBBFFBBBD.',
  '.BB.FFFF.BB.',
  '..D......D..',
  '............'
);

/* ---- FANTASMA (pálido, base ondulada, olhos+boca pretos) ---- */
const ghostStand = frame(
  '............',
  '...BBBBBB...',
  '..BBBBBBBB..',
  '.BBBKKBBKKBB',
  '.BBBBBBBBBB.',
  '.BBBBBNBBBB.',
  '.BBBBBBBBBB.',
  '.B.B.B.B.BB.',
  '............',
  '............'
);
const ghostBob = frame(
  '............',
  '...BBBBBB...',
  '..BBBBBBBB..',
  '.BBBKKBBKKBB',
  '.BBBBBBBBBB.',
  '.BBBBBNBBBB.',
  '.BBBBBBBBBB.',
  '..B.B.B.B.B.',
  '............',
  '............'
);
const ghostSleep = frame(
  '............',
  '...BBBBBB...',
  '..BBBBBBBB..',
  '.BB......BB.',
  '.BBBBBBBBBB.',
  '.BBBBBNBBBB.',
  '.BBBBBBBBBB.',
  '.B.B.B.B.BB.',
  '............',
  '............'
);

/* ---- SLIME (verde-limão, olhos pretos KK, boquinha) ---- */
const slimeIdle0 = frame(
  '............',
  '....BBBB....',
  '...BBBBBB...',
  '..BBBBBBBB..',
  '.BBBKKBBKKB.',
  '.BBBBBNBBBB.',
  '..BBBBBBBB..',
  '...BBBBBB...',
  '............',
  '............'
);
const slimeIdle1 = frame(
  '............',
  '.....BB.....',
  '....BBBB....',
  '...BBBBBB...',
  '..BBKKBBKK.B',
  '..BBBBNBBBB.',
  '...BBBBBB...',
  '....BBBB....',
  '............',
  '............'
);
const slimeWalk = frame(
  '............',
  '....BBBB....',
  '...BBBBBB...',
  '..BBBBBBBB..',
  '.BBBKKBBKKB.',
  '.BBBBBNBBBB.',
  'BBBB....BBBB',
  '.BB......BB.',
  '............',
  '............'
);
const slimeSleep = frame(
  '............',
  '....BBBB....',
  '...BBBBBB...',
  '..BBBBBBBB..',
  '.BB......BB.',
  '.BBBBBNBBBB.',
  '..BBBBBBBB..',
  '...BBBBBB...',
  '............',
  '............'
);
const slimeSpecial = frame(
  '............',
  '....BBBB....',
  '...BBBBBB...',
  '..BBBBBBBB..',
  '.BBBKKBBKKB.',
  'BBBBBNBBBBB.',
  'BB........BB',
  '.B........B.',
  '............',
  '............'
);

/* ---- RAPOSA (laranja, orelhas e cauda escuras, brilho de estrela) ---- */
const foxStand = frame(
  '............',
  '.D......D...',
  '.DBBBBBBBBD.',
  'BBBBBBBBBBBB',
  'BBBKKBBKKBBB',
  'BBBBBKKBBBBB',
  '.BBBBPPBBBBD',
  '.BB......BBD',
  '..D......D..',
  '............'
);
const foxWalk = frame(
  '............',
  '.D......D...',
  '.DBBBBBBBBD.',
  'BBBBBBBBBBBB',
  'BBBKKBBKKBBB',
  'BBBBBKKBBBBB',
  'DBBBBPPBBBB.',
  'DBB......BB.',
  '.D........D.',
  '............'
);
const foxSleep = frame(
  '............',
  '.D......D...',
  '.DBBBBBBBBD.',
  'BBBBBBBBBBBB',
  'BB........BB',
  'BBBBBKKBBBBB',
  '.BBBBPPBBBBD',
  '............',
  '............',
  '............'
);
const foxSpecial = frame(
  '.....Y......',
  '.D......D...',
  '.DBBBBBBBBD.',
  'BBBBBBBBBBBB',
  'BBBYYBBYYBBB',
  'BBBBBKKBBBBB',
  '.BBBBPPBBBBD',
  '.BB......BBD',
  '..D......D..',
  '..........Y.'
);

/* ---- CAPIVARA (marrom quente, focinho largo e pausa aconchegante) ---- */
const capybaraStand = frame(
  '............',
  '..D......D..',
  '..BBBBBBBB..',
  '.BBBBBBBBBB.',
  'BBBKKBBKKBBB',
  'BBBBBNBBBBBB',
  'BBBTTTTBBBBB',
  '.BBBBBBBBBB.',
  '..DD....DD..',
  '............'
);
const capybaraWalk = frame(
  '............',
  '..D......D..',
  '..BBBBBBBB..',
  '.BBBBBBBBBB.',
  'BBBKKBBKKBBB',
  'BBBBBNBBBBBB',
  'BBBTTTTBBBBB',
  '.BBBBBBBBBB.',
  '.DD......DD.',
  '............'
);
const capybaraSleep = frame(
  '............',
  '..D......D..',
  '..BBBBBBBB..',
  '.BBBBBBBBBB.',
  'BBB......BBB',
  'BBBBBNBBBBBB',
  'BBBTTTTBBBBB',
  '.BBBBBBBBBB.',
  '............',
  '............'
);
const capybaraSpecial = frame(
  '............',
  '..D......D..',
  '..BBBBBBBB..',
  '.BBBBBBBBBB.',
  'BBBKKBBKKBBB',
  'BBBBBNBBBBBB',
  'BBBTTTTBBBBB',
  '.BBBBBBBBBB.',
  '.LDD....DDL.',
  'L..........L'
);

/* ---- AXOLOTE (rosa-coral, brânquias externas e bolhas) ---- */
const axolotlStand = frame(
  '............',
  'G.G......G.G',
  '.GG.BBBB.GG.',
  '..BBBBBBBB..',
  '.BBBKKBBKKBB',
  '.BBBBPPBBBB.',
  '..BBBBBBBB..',
  '...BB..BB...',
  '..A......A..',
  '............'
);
const axolotlWalk = frame(
  '............',
  'G.G......G.G',
  '.GG.BBBB.GG.',
  '..BBBBBBBB..',
  '.BBBKKBBKKBB',
  '.BBBBPPBBBB.',
  '..BBBBBBBB..',
  '..BB....BB..',
  '.A........A.',
  '............'
);
const axolotlSleep = frame(
  '............',
  'G.G......G.G',
  '.GG.BBBB.GG.',
  '..BBBBBBBB..',
  '.BB......BB.',
  '.BBBBPPBBBB.',
  '..BBBBBBBB..',
  '............',
  '............',
  '............'
);
const axolotlSpecial = frame(
  'A.G......G.A',
  'G.G......G.G',
  '.GG.BBBB.GG.',
  '..BBBBBBBB..',
  '.BBBKKBBKKBB',
  '.BBBBPPBBBB.',
  'A.BBBBBBBB.A',
  '...BB..BB...',
  '..A......A..',
  'A..........A'
);

const CLAWD_SUBPET_SPRITES = {
  dog: {
    colors: {
      B: '#c4783a', D: '#8a4f22', K: '#111111',
      W: '#fff3e0', P: '#ff7aa2', C: '#e8a050'
    },
    frames: {
      idle: bob(dogStand, dogWag),
      walk: bob(dogWalk, dogStand),
      sleep: [dogSleep]
    }
  },
  cat: {
    colors: {
      B: '#b0b8c0', D: '#6e7680', K: '#111111',
      W: '#ffffff', P: '#f2a0b8', C: '#e8eef4'
    },
    frames: {
      idle: bob(catStand, catStand),
      walk: bob(catWalk, catStand),
      sleep: [catSleep]
    }
  },
  bird: {
    colors: {
      B: '#4aa3ff', D: '#2b6fc2', K: '#111111',
      W: '#ffffff', Y: '#ffd14a', R: '#ff8a2b', A: '#7ec0ff'
    },
    frames: {
      idle: bob(birdStand, birdStand),
      walk: bob(birdWalk, birdStand),
      flying: [birdFly0, birdFly1, birdFly0],
      sleep: [birdSleep]
    }
  },
  rabbit: {
    colors: {
      B: '#f2f4f6', D: '#a8b0ba', K: '#111111',
      W: '#ffffff', P: '#ff8eb0', I: '#ffc2d6'
    },
    frames: {
      idle: bob(rabbitStand, rabbitStand),
      walk: bob(rabbitWalk, rabbitStand),
      sleep: [rabbitSleep]
    }
  },
  dino: {
    colors: {
      B: '#3ecfcf', D: '#1f8a8a', K: '#111111',
      W: '#ffffff', Y: '#b8f0f0'
    },
    frames: {
      idle: bob(dinoStand, dinoStand),
      walk: bob(dinoWalk, dinoStand),
      sleep: [dinoSleep]
    }
  },
  dragon: {
    colors: {
      B: '#3daf4a', D: '#257a30', K: '#111111',
      W: '#ffffff', Y: '#ffd14a', F: '#ff5a52', A: '#6ecf78'
    },
    frames: {
      idle: bob(dragonStand, dragonStand),
      walk: bob(dragonWalk, dragonStand),
      flying: [dragonFly0, dragonFly1, dragonFly0],
      sleep: [dragonSleep],
      special: bob(dragonSpecial, dragonStand)
    }
  },
  ghost: {
    colors: {
      B: 'rgba(236,240,244,0.96)', D: 'rgba(170,180,195,0.8)',
      K: '#111111', W: '#ffffff', N: '#111111'
    },
    frames: {
      idle: bob(ghostStand, ghostBob),
      walk: bob(ghostStand, ghostBob),
      sleep: [ghostSleep]
    }
  },
  slime: {
    colors: {
      B: '#4adf5a', D: '#2a9a38', K: '#111111',
      W: '#ffffff', E: '#1f7a2c', N: '#111111', C: '#8aef98'
    },
    frames: {
      idle: bob(slimeIdle0, slimeIdle1),
      walk: bob(slimeWalk, slimeIdle0),
      sleep: [slimeSleep],
      special: [slimeSpecial]
    }
  },
  fox: {
    colors: {
      B: '#e77d34', D: '#9f4624', K: '#111111',
      W: '#fff2de', P: '#f6b08a', Y: '#ffd166'
    },
    frames: {
      idle: bob(foxStand, foxStand),
      walk: bob(foxWalk, foxStand),
      sleep: [foxSleep],
      special: bob(foxSpecial, foxStand)
    }
  },
  capybara: {
    colors: {
      B: '#9b6b43', D: '#68452d', K: '#111111',
      N: '#4a3022', T: '#f8ead7', L: '#79b86b'
    },
    frames: {
      idle: bob(capybaraStand, capybaraStand),
      walk: bob(capybaraWalk, capybaraStand),
      sleep: [capybaraSleep],
      special: bob(capybaraSpecial, capybaraStand)
    }
  },
  axolotl: {
    colors: {
      B: '#f18da6', G: '#d65a7a', K: '#111111',
      P: '#ffd1dc', A: '#77d9e8', W: '#ffffff'
    },
    frames: {
      idle: bob(axolotlStand, axolotlStand),
      walk: bob(axolotlWalk, axolotlStand),
      sleep: [axolotlSleep],
      special: bob(axolotlSpecial, axolotlStand)
    }
  }
};

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
  const img = `    image: { url: 'src/shared/sprites/subpets/${id}.png', width: ${W * CELL}, height: ${H * CELL}, gridW: ${W}, gridH: ${H} },`;
  return `  ${id}: {\n    colors: { ${colorEntries} },\n${img}\n    frames: {\n${framesToJs(sprite.frames)}\n    }\n  }`;
}

for (const [id, sp] of Object.entries(CLAWD_SUBPET_SPRITES)) {
  for (const [pose, frames] of Object.entries(sp.frames)) {
    frames.forEach((fr, i) => {
      if (fr.length !== H) throw new Error(`${id}.${pose}[${i}] rows`);
      fr.forEach((r, yi) => {
        if (r.length !== W) throw new Error(`${id}.${pose}[${i}].r${yi} len=${r.length}`);
      });
    });
  }
}

function renderTransparent(id, sprite, scale = 8) {
  const fr = sprite.frames.idle[0];
  const colors = sprite.colors;
  const pw = W * scale, ph = H * scale;
  const rgba = Buffer.alloc(pw * ph * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const col = parseColor(colors[fr[y][x]]);
    if (!col) continue;
    for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
      const i = ((y * scale + dy) * pw + (x * scale + dx)) * 4;
      rgba[i] = col[0]; rgba[i + 1] = col[1]; rgba[i + 2] = col[2]; rgba[i + 3] = col[3];
    }
  }
  return pngRGBA(pw, ph, rgba);
}

const outDir = path.join(testsDir, 'sprite-out');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'all.png'), renderSheet(CLAWD_SUBPET_SPRITES));

// Preview em sprite-out sempre; pacote só com WRITE_PKG_SPRITES=1.
// WRITE_PKG_SPRITES=missing adiciona apenas espécies ainda sem PNG canônico.
const WRITE_PKG_SPRITES = process.env.WRITE_PKG_SPRITES === '1';
const WRITE_MISSING_PKG_SPRITES = process.env.WRITE_PKG_SPRITES === 'missing';
const pkgDir = path.join(root, 'src/shared/sprites/subpets');
for (const [id, sp] of Object.entries(CLAWD_SUBPET_SPRITES)) {
  const png = renderTransparent(id, sp, 8);
  fs.writeFileSync(path.join(outDir, `${id}.png`), png);
  const packageTarget = path.join(pkgDir, `${id}.png`);
  if (WRITE_PKG_SPRITES || (WRITE_MISSING_PKG_SPRITES && !fs.existsSync(packageTarget))) {
    fs.mkdirSync(pkgDir, { recursive: true });
    fs.writeFileSync(packageTarget, png);
  }
}
if (!WRITE_PKG_SPRITES && !WRITE_MISSING_PKG_SPRITES) {
  console.log('skip package PNGs (canonical = crop-literal-sprites.mjs from Subpets-selection.png)');
  console.log('set WRITE_PKG_SPRITES=1 only if you intentionally want to overwrite sheet crops');
}

const catalogPath = path.join(root, 'src/shared/catalog.js');
let catalog = fs.readFileSync(catalogPath, 'utf8');
const start = catalog.indexOf('var CLAWD_SUBPET_SPRITES = {');
const end = catalog.indexOf('function clawdShadePixelColor');
if (start < 0 || end < 0) throw new Error('catalog markers missing');
const markers = [
  catalog.lastIndexOf('/* ---- Sprites pixel dos Sub-Pets', start),
  catalog.lastIndexOf('/* ---- Sub-pet pixel art', start)
].filter((i) => i >= 0);
const injectFrom = markers.length ? Math.min(...markers) : start;
const comment = `/* ---- Sub-pet pixel art (shared: content + popup + docs)
   Grade ${W}×${H} @${CELL}px. Referência "Subpets — 11 companheiros":
   corpo chapado, olhos em linha (KK), patas soltas, lineless igual ao Claw'd.
   B=corpo, D=sombra/orelha, K=olho, P=rosa, Y=amarelo, R=bico/pé, E=olho slime, +extras. */
var CLAWD_SUBPET_CELL = ${CELL};\n\n`;
catalog = catalog.slice(0, injectFrom) + comment +
  'var CLAWD_SUBPET_SPRITES = {\n' +
  Object.entries(CLAWD_SUBPET_SPRITES).map(([id, s]) => spriteToJs(id, s)).join(',\n') +
  '\n};\n\n' + catalog.slice(end);
fs.writeFileSync(catalogPath, catalog);

console.log('OK catalog frames/colors updated', `${W}x${H}`);
if (WRITE_PKG_SPRITES) console.log('also wrote package PNGs →', pkgDir);
