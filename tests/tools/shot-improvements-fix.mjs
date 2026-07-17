/** Recaptura seletiva: badges + demo player + lab */
import { spawn } from 'node:child_process';
import { createServer as createHttpServer } from 'node:http';
import { createServer as createNetServer } from 'node:net';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const outDir = join(root, 'tests', 'shots', 'improvements');
const browser = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].find((p) => existsSync(p));

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function freePort() {
  return new Promise((res, rej) => {
    const s = createNetServer();
    s.unref();
    s.on('error', rej);
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => res(port));
    });
  });
}

function startHttp(port) {
  const server = createHttpServer(async (req, res) => {
    try {
      let p = decodeURIComponent((req.url || '/').split('?')[0]);
      if (p === '/') p = '/docs/index.html';
      if (p.endsWith('/')) p += 'index.html';
      const fp = resolve(root, '.' + p);
      const data = await readFile(fp);
      res.writeHead(200, { 'Content-Type': MIME[extname(fp)] || 'application/octet-stream' });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end('nf');
    }
  });
  return new Promise((r) => server.listen(port, '127.0.0.1', () => r(server)));
}

class Cdp {
  constructor(url) {
    this.url = url;
    this.id = 0;
    this.pending = new Map();
  }
  async connect() {
    this.ws = new WebSocket(this.url);
    await new Promise((res, rej) => {
      const t = setTimeout(() => rej(new Error('ws timeout')), 15000);
      this.ws.addEventListener('open', () => { clearTimeout(t); res(); }, { once: true });
      this.ws.addEventListener('error', (e) => { clearTimeout(t); rej(e); }, { once: true });
    });
    this.ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(String(ev.data));
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve: r, reject: j } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) j(new Error(msg.error.message));
        else r(msg.result);
      }
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async eval(expression) {
    const result = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'eval fail');
    return result.result?.value;
  }
}

async function shot(cdp, name, clip) {
  const params = { format: 'png' };
  if (clip) {
    params.clip = { ...clip, scale: 1 };
    params.captureBeyondViewport = true;
  }
  const { data } = await cdp.send('Page.captureScreenshot', params);
  await writeFile(join(outDir, name), Buffer.from(data, 'base64'));
  console.log('wrote', name);
}

async function clipSel(cdp, selector) {
  return cdp.eval(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return null;
    el.scrollIntoView({ behavior: 'instant', block: 'center' });
    const r = el.getBoundingClientRect();
    return {
      x: Math.max(0, r.x - 12),
      y: Math.max(0, r.y - 12),
      width: Math.min(window.innerWidth - Math.max(0, r.x - 12), r.width + 24),
      height: Math.min(window.innerHeight - Math.max(0, r.y - 12), r.height + 24)
    };
  })()`);
}

await mkdir(outDir, { recursive: true });
const httpPort = await freePort();
const http = await startHttp(httpPort);
const debugPort = await freePort();
const child = spawn(browser, [
  `--remote-debugging-port=${debugPort}`,
  `--user-data-dir=${join(root, '.tmp', 'edge-fix2')}`,
  '--no-first-run',
  '--headless=new',
  '--disable-gpu',
  '--window-size=1440,1100',
  'about:blank',
], { stdio: 'ignore' });

let list;
for (let i = 0; i < 60; i++) {
  try {
    list = await fetch(`http://127.0.0.1:${debugPort}/json/list`).then((r) => r.json());
    if (list?.length) break;
  } catch { /* */ }
  await delay(250);
}
const page = list.find((t) => t.type === 'page') || list[0];
const cdp = new Cdp(page.webSocketDebuggerUrl);
await cdp.connect();
await cdp.send('Page.enable');
await cdp.send('Runtime.enable');
await cdp.send('Page.navigate', { url: `http://127.0.0.1:${httpPort}/docs/index.html#demonstracao` });
await delay(2800);

await cdp.eval(`document.querySelector('#demonstracao')?.scrollIntoView({behavior:'instant',block:'start'}); true`);
await delay(500);
await shot(cdp, '01b-validacao-badges.png', await clipSel(cdp, '#validation-snapshot'));
await shot(cdp, '01c-demonstracao-header.png', await clipSel(cdp, '#demonstracao .evidence-title-row, #demonstracao > .section-inner > *:first-child'));

await cdp.eval(`(() => {
  const t = document.querySelector('#demo-toggle');
  if (t && /Pausar/.test(t.textContent || '')) t.click();
  document.querySelector('#demo-player')?.scrollIntoView({ behavior: 'instant', block: 'center' });
  const btns = [...document.querySelectorAll('#demo-step-nav button')];
  (btns[2] || btns[0])?.click();
  return btns.length;
})()`);
await delay(1100);
await shot(cdp, '02b-demo-player.png', await clipSel(cdp, '#demo-player'));

await cdp.eval(`(() => {
  const btns = [...document.querySelectorAll('#demo-step-nav button')];
  (btns[9] || btns[5])?.click();
  return true;
})()`);
await delay(1100);
await shot(cdp, '04b-demo-futebol.png', await clipSel(cdp, '#demo-player'));

await cdp.eval(`document.querySelector('#laboratorio')?.scrollIntoView({behavior:'instant',block:'center'}); true`);
await delay(500);
await cdp.eval(`(() => {
  const pet = document.querySelector('#lab-pet');
  pet?.classList.add('mood-happy', 'has-ball');
  const e = document.querySelector('#lab-emotion');
  if (e) { e.textContent = '💖'; e.classList.add('visible'); }
  const s = document.querySelector('#lab-speech');
  if (s) { s.textContent = 'Weekly + personalidade ativos!'; s.classList.add('visible'); }
  return !!pet;
})()`);
await delay(600);
await shot(cdp, '05b-laboratorio.png', await clipSel(cdp, '#laboratorio'));

cdp.ws.close();
child.kill();
http.close();
console.log('OK');
