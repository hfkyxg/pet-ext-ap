/**
 * Captura visual de todas as interações do showcase (18 steps + lab + subpets).
 * Sobe HTTP estático local, abre Edge via CDP e grava PNGs em tests/shots/.
 */
import { spawn } from 'node:child_process';
import { createServer as createHttpServer } from 'node:http';
import { createServer as createNetServer } from 'node:net';
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { join, resolve, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const outDir = join(root, 'tests', 'shots');
const edgePath = process.env.EDGE_PATH
  || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
  || 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.md': 'text/markdown; charset=utf-8',
  '.ico': 'image/x-icon',
};

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

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

function startStaticServer(port) {
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
      throw new Error(result.exceptionDetails.text || result.exceptionDetails.exception?.description || 'eval failed');
    }
    return result.result?.value;
  }
  close() {
    this.ws?.close();
  }
}

async function shot(cdp, name, clip = null) {
  const params = { format: 'png' };
  if (clip) {
    params.clip = { ...clip, scale: 1 };
    params.captureBeyondViewport = true;
  }
  const { data } = await cdp.send('Page.captureScreenshot', params);
  const file = join(outDir, name);
  await writeFile(file, Buffer.from(data, 'base64'));
  const info = await stat(file);
  console.log(`wrote ${name} (${info.size} bytes)`);
  return file;
}

async function clipOf(cdp, selector) {
  return cdp.eval(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return null;
    el.scrollIntoView({ behavior: 'instant', block: 'center' });
    const r = el.getBoundingClientRect();
    const pad = 12;
    return {
      x: Math.max(0, r.x - pad),
      y: Math.max(0, r.y - pad),
      width: Math.min(window.innerWidth - Math.max(0, r.x - pad), r.width + pad * 2),
      height: Math.min(window.innerHeight - Math.max(0, r.y - pad), r.height + pad * 2)
    };
  })()`);
}

async function main() {
  await mkdir(outDir, { recursive: true });
  const httpPort = await freePort();
  const http = await startStaticServer(httpPort);
  const docsUrl = `http://127.0.0.1:${httpPort}/docs/index.html`;
  console.log('serving', docsUrl);

  const debugPort = await freePort();
  const userData = join(root, '.tmp', `edge-all-${debugPort}`);
  const child = spawn(edgePath, [
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${userData}`,
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
  if (!list?.length) throw new Error('CDP not ready');

  const page = list.find((t) => t.type === 'page') || list[0];
  const cdp = new Cdp(page.webSocketDebuggerUrl);
  await cdp.connect();
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Page.navigate', { url: docsUrl });
  await delay(2200);

  // Wait for showcase boot
  await cdp.eval(`(() => new Promise((resolve) => {
    const ready = () => document.querySelector('#demo-stage') && document.querySelector('#lab-pet');
    if (ready()) return resolve(true);
    const t = setInterval(() => { if (ready()) { clearInterval(t); resolve(true); } }, 100);
    setTimeout(() => { clearInterval(t); resolve(!!ready()); }, 5000);
  }))()`);

  // ── Hero overview ──
  await cdp.eval(`document.querySelector('#inicio')?.scrollIntoView({behavior:'instant',block:'start'}); true`);
  await delay(400);
  await shot(cdp, '00-hero-overview.png');

  // ── 18 demo steps via player ──
  const stepMeta = await cdp.eval(`(() => {
    const nav = document.querySelector('#demo-step-nav');
    const buttons = [...(nav?.querySelectorAll('button[data-step]') || [])];
    // Pause autoplay
    const toggle = document.querySelector('#demo-toggle');
    if (toggle && /Pausar|Ⅱ/.test(toggle.textContent || '')) toggle.click();
    document.querySelector('#demonstracao')?.scrollIntoView({ behavior: 'instant', block: 'center' });
    return buttons.map((b, i) => ({ index: i, title: b.title || b.getAttribute('aria-label') || String(i) }));
  })()`);

  console.log(`demo steps: ${stepMeta.length}`);
  for (const step of stepMeta) {
    await cdp.eval(`(() => {
      const btn = document.querySelector('#demo-step-nav button[data-step="${step.index}"]');
      btn?.click();
      return true;
    })()`);
    await delay(700);
    const clip = await clipOf(cdp, '#demo-stage');
    const n = String(step.index + 1).padStart(2, '0');
    const slug = String(step.title)
      .replace(/^Etapa\s+\d+:\s*/i, '')
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) || `step-${n}`;
    await shot(cdp, `demo-${n}-${slug}.png`, clip);
  }

  // Storyboard evidence cards overview
  await cdp.eval(`document.querySelector('#evidence-groups')?.scrollIntoView({behavior:'instant',block:'start'}); true`);
  await delay(500);
  await shot(cdp, 'demo-storyboard-overview.png');

  // ── Lab main pet moods ──
  await cdp.eval(`document.querySelector('#laboratorio')?.scrollIntoView({behavior:'instant',block:'center'}); true`);
  await delay(400);

  const moods = [
    { mood: 'idle', label: 'idle' },
    { mood: 'happy', label: 'cuddle-happy' },
    { mood: 'wave', label: 'wave' },
    { mood: 'love', label: 'love-hug' },
    { mood: 'sleep', label: 'sleep' },
  ];
  for (const item of moods) {
    await cdp.eval(`(() => {
      const pet = document.querySelector('#lab-pet');
      if (!pet) return false;
      pet.classList.remove('mood-happy','mood-sleep','mood-wave','mood-love');
      void pet.offsetWidth;
      if (${JSON.stringify(item.mood)} !== 'idle') pet.classList.add('mood-${item.mood}');
      const emotion = document.querySelector('#lab-emotion');
      if (emotion) {
        const map = { happy: '💖', wave: '👋', love: '🤗', sleep: '💤', idle: '' };
        emotion.textContent = map[${JSON.stringify(item.mood)}] || '';
        emotion.classList.toggle('visible', ${JSON.stringify(item.mood)} !== 'idle');
      }
      return true;
    })()`);
    await delay(450);
    const clip = await clipOf(cdp, '.live-lab, #laboratorio .lab-stage, #lab-pet');
    await shot(cdp, `lab-main-${item.label}.png`, clip || await clipOf(cdp, '#laboratorio'));
  }

  // Smooth + football lab states
  await cdp.eval(`(() => {
    const mode = document.querySelector('#lab-render-mode');
    if (mode) { mode.value = 'smooth'; mode.dispatchEvent(new Event('change', { bubbles: true })); }
    const pet = document.querySelector('#lab-pet');
    pet?.classList.add('smooth', 'is-smooth');
    return true;
  })()`);
  await delay(400);
  await shot(cdp, 'lab-main-smooth.png', await clipOf(cdp, '#laboratorio'));

  await cdp.eval(`(() => {
    const pet = document.querySelector('#lab-pet');
    pet?.classList.add('has-ball', 'keepy-uppy', 'mood-happy');
    return true;
  })()`);
  await delay(500);
  await shot(cdp, 'lab-main-football-juggle.png', await clipOf(cdp, '#laboratorio'));

  // Reset pixel mode
  await cdp.eval(`(() => {
    const mode = document.querySelector('#lab-render-mode');
    if (mode) { mode.value = 'pixel'; mode.dispatchEvent(new Event('change', { bubbles: true })); }
    const pet = document.querySelector('#lab-pet');
    pet?.classList.remove('smooth','is-smooth','has-ball','keepy-uppy','mood-happy','mood-sleep','mood-wave','mood-love');
    return true;
  })()`);

  // ── Subpet lab: each species idle + specials ──
  const speciesList = await cdp.eval(`(() => {
    const select = document.querySelector('#subpet-species');
    return [...(select?.options || [])].map(o => o.value);
  })()`);
  console.log('subpets:', speciesList);

  for (const species of speciesList) {
    await cdp.eval(`(() => {
      const btn = document.querySelector('#subpet-roster button[data-species="${species}"]');
      if (btn) btn.click();
      else {
        const select = document.querySelector('#subpet-species');
        if (select) { select.value = '${species}'; select.dispatchEvent(new Event('change', { bubbles: true })); }
      }
      document.querySelector('#laboratorio')?.scrollIntoView({ behavior: 'instant', block: 'center' });
      return true;
    })()`);
    await delay(500);
    await shot(cdp, `subpet-${species}-idle.png`, await clipOf(cdp, '.subpet-lab') || await clipOf(cdp, '#laboratorio'));
  }

  // Subpet actions on dog (all 7)
  await cdp.eval(`(() => {
    document.querySelector('#subpet-roster button[data-species="dog"]')?.click();
    return true;
  })()`);
  await delay(300);

  const actions = await cdp.eval(`(() => {
    return [...document.querySelectorAll('#subpet-actions button[data-action]')].map(b => b.dataset.action);
  })()`);
  console.log('subpet actions:', actions);

  for (const action of actions) {
    await cdp.eval(`(() => {
      document.querySelector('#subpet-actions button[data-action="${action}"]')?.click();
      return true;
    })()`);
    await delay(550);
    await shot(cdp, `subpet-dog-${action}.png`, await clipOf(cdp, '.subpet-lab, #subpet-preview'));
  }

  // Species special highlights
  const specials = [
    { species: 'dog', note: 'wag' },
    { species: 'bird', note: 'fly' },
    { species: 'dragon', note: 'fire' },
    { species: 'slime', note: 'split' },
    { species: 'rabbit', note: 'double-hop' },
    { species: 'dino', note: 'stomp' },
    { species: 'ghost', note: 'phase' },
    { species: 'cat', note: 'settle' },
  ];
  for (const item of specials) {
    await cdp.eval(`(() => {
      document.querySelector('#subpet-roster button[data-species="${item.species}"]')?.click();
      setTimeout(() => document.querySelector('#subpet-actions button[data-action="special"]')?.click(), 80);
      return true;
    })()`);
    await delay(700);
    await shot(cdp, `subpet-${item.species}-special-${item.note}.png`, await clipOf(cdp, '.subpet-lab, #subpet-preview'));
  }

  // Credits band
  await cdp.eval(`document.querySelector('#creditos')?.scrollIntoView({behavior:'instant',block:'center'}); true`);
  await delay(400);
  await shot(cdp, 'credits-section.png', await clipOf(cdp, '#creditos'));

  // Manifest inventory JSON for the user
  const inventory = {
    docsUrl,
    generatedAt: new Date().toISOString(),
    demoSteps: stepMeta.length,
    subpets: speciesList,
    subpetActions: actions,
    outDir: 'tests/shots',
  };
  await writeFile(join(outDir, '_inventory.json'), JSON.stringify(inventory, null, 2));
  console.log('inventory written');

  cdp.close();
  child.kill();
  http.close();
  console.log('done — shots in', outDir);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
