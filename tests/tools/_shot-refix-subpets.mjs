/**
 * Re-captura idles de subpet com clip mais amplo (.subpet-lab).
 */
import { spawn } from 'node:child_process';
import { createServer as createHttpServer } from 'node:http';
import { createServer as createNetServer } from 'node:net';
import { readFile, writeFile, stat } from 'node:fs/promises';
import { join, resolve, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const outDir = join(root, 'tests', '_shots');
const edgePath = process.env.EDGE_PATH
  || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.md': 'text/markdown; charset=utf-8',
};
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function freePort() {
  return new Promise((resolvePort, reject) => {
    const server = createNetServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolvePort(port));
    });
  });
}

function startStatic(port) {
  const server = createHttpServer(async (req, res) => {
    try {
      let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
      if (urlPath === '/') urlPath = '/docs/index.html';
      if (urlPath.endsWith('/')) urlPath += 'index.html';
      const filePath = resolve(root, '.' + urlPath);
      if (!filePath.startsWith(root)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }
      const data = await readFile(filePath);
      res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] || 'application/octet-stream' });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  });
  return new Promise((resolveServer) => {
    server.listen(port, '127.0.0.1', () => resolveServer(server));
  });
}

class Cdp {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.id = 0;
    this.pending = new Map();
  }
  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((res, rej) => {
      this.ws.addEventListener('open', res, { once: true });
      this.ws.addEventListener('error', rej, { once: true });
    });
    this.ws.addEventListener('message', (event) => {
      const msg = JSON.parse(String(event.data));
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve: r, reject: j } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) j(new Error(msg.error.message || JSON.stringify(msg.error)));
        else r(msg.result);
      }
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolveSend, reject) => {
      this.pending.set(id, { resolve: resolveSend, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async eval(expression) {
    const result = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.text || 'eval failed');
    }
    return result.result?.value;
  }
  close() {
    this.ws?.close();
  }
}

async function shot(cdp, name, clip) {
  const params = { format: 'png' };
  if (clip) {
    params.clip = { ...clip, scale: 1 };
    params.captureBeyondViewport = true;
  }
  const { data } = await cdp.send('Page.captureScreenshot', params);
  const file = join(outDir, name);
  await writeFile(file, Buffer.from(data, 'base64'));
  console.log('wrote', name, (await stat(file)).size);
}

async function labClip(cdp) {
  return cdp.eval(`(() => {
    const el = document.querySelector('.subpet-lab')
      || document.querySelector('#subpet-preview')?.closest('section')
      || document.querySelector('#laboratorio');
    el?.scrollIntoView({ behavior: 'instant', block: 'center' });
    const r = el.getBoundingClientRect();
    return {
      x: Math.max(0, r.x - 8),
      y: Math.max(0, r.y - 8),
      width: Math.min(window.innerWidth - 8, r.width + 16),
      height: Math.min(window.innerHeight - 8, r.height + 16)
    };
  })()`);
}

async function main() {
  const httpPort = await freePort();
  const http = await startStatic(httpPort);
  const debugPort = await freePort();
  const child = spawn(edgePath, [
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${join(outDir, `edge-refix-${debugPort}`)}`,
    '--no-first-run',
    '--disable-extensions',
    '--window-size=1440,1100',
    'about:blank',
  ], { stdio: 'ignore' });

  let list;
  for (let i = 0; i < 50; i++) {
    try {
      list = await fetch(`http://127.0.0.1:${debugPort}/json/list`).then((r) => r.json());
      if (list?.length) break;
    } catch { /* retry */ }
    await delay(200);
  }
  const page = list.find((t) => t.type === 'page') || list[0];
  const cdp = new Cdp(page.webSocketDebuggerUrl);
  await cdp.connect();
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Page.navigate', { url: `http://127.0.0.1:${httpPort}/docs/index.html` });
  await delay(2200);
  await cdp.eval(`document.querySelector('#laboratorio')?.scrollIntoView({behavior:'instant',block:'center'}); true`);
  await delay(500);

  const species = ['dog', 'cat', 'bird', 'rabbit', 'dino', 'dragon', 'ghost', 'slime'];
  for (const sp of species) {
    await cdp.eval(`(() => {
      document.querySelector('#subpet-roster button[data-species="${sp}"]')?.click();
      return true;
    })()`);
    await delay(500);
    await shot(cdp, `subpet-${sp}-idle.png`, await labClip(cdp));
  }

  await shot(cdp, 'lab-panel-full.png', await cdp.eval(`(() => {
    const el = document.querySelector('#laboratorio');
    const r = el.getBoundingClientRect();
    return {
      x: Math.max(0, r.x),
      y: Math.max(0, r.y),
      width: Math.min(window.innerWidth, r.width),
      height: Math.min(window.innerHeight, r.height)
    };
  })()`));

  cdp.close();
  child.kill();
  http.close();
  console.log('refix done');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
