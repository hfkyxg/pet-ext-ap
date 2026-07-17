/**
 * Demo visual das melhorias recentes (contexto, weekly, personalidade, qualidade).
 * Sobe HTTP local + Edge/CDP → PNGs em tests/shots/improvements/
 */
import { spawn } from 'node:child_process';
import { createServer as createHttpServer } from 'node:http';
import { createServer as createNetServer } from 'node:net';
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const outDir = join(root, 'tests', 'shots', 'improvements');
const chromeCandidates = [
  process.env.EDGE_PATH,
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
].filter(Boolean);
const edgePath = chromeCandidates.find((p) => existsSync(p));
if (!edgePath) throw new Error('Chrome/Edge não encontrado');
console.log('browser', edgePath);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
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
        res.writeHead(403); res.end('Forbidden'); return;
      }
      const data = await readFile(filePath);
      res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] || 'application/octet-stream' });
      res.end(data);
    } catch {
      res.writeHead(404); res.end('Not found');
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
      const t = setTimeout(() => rej(new Error('WebSocket timeout')), 15000);
      this.ws.addEventListener('open', () => { clearTimeout(t); res(); }, { once: true });
      this.ws.addEventListener('error', (e) => { clearTimeout(t); rej(e); }, { once: true });
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
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async eval(expression) {
    const result = await this.send('Runtime.evaluate', {
      expression, awaitPromise: true, returnByValue: true,
    });
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.text || 'eval failed');
    }
    return result.result?.value;
  }
  close() { this.ws?.close(); }
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
    const pad = 16;
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
  const userData = join(root, '.tmp', `edge-${debugPort}`);
  const child = spawn(edgePath, [
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${userData}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--disable-gpu',
    '--headless=new',
    '--window-size=1440,1000',
    'about:blank',
  ], { stdio: 'ignore' });
  console.log('spawned browser pid', child.pid, 'cdp', debugPort);

  let list;
  for (let i = 0; i < 60; i++) {
    try {
      list = await fetch(`http://127.0.0.1:${debugPort}/json/list`).then((r) => r.json());
      if (list?.length) break;
    } catch (e) {
      if (i === 0 || i % 10 === 0) console.log('waiting cdp…', i, String(e.message || e));
    }
    await delay(250);
  }
  if (!list?.length) throw new Error('CDP not ready');
  console.log('cdp pages', list.length);

  const page = list.find((t) => t.type === 'page') || list[0];
  const cdp = new Cdp(page.webSocketDebuggerUrl);
  await cdp.connect();
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Page.navigate', { url: docsUrl });
  await delay(2500);

  await cdp.eval(`(() => new Promise((resolve) => {
    const ready = () => document.querySelector('#demo-stage') && document.querySelector('#validation-snapshot');
    if (ready()) return resolve(true);
    const t = setInterval(() => { if (ready()) { clearInterval(t); resolve(true); } }, 100);
    setTimeout(() => { clearInterval(t); resolve(!!ready()); }, 6000);
  }))()`);

  // 1) Badges de validação (112/112 + contagens)
  await cdp.eval(`document.querySelector('#demonstracao')?.scrollIntoView({behavior:'instant',block:'start'}); true`);
  await delay(500);
  await shot(cdp, '01-validacao-112.png', await clipOf(cdp, '#validation-snapshot'));

  // 2) Demo ao vivo — carinho / happy
  await cdp.eval(`(() => {
    const toggle = document.querySelector('#demo-toggle');
    if (toggle && /Pausar|Ⅱ/.test(toggle.textContent || '')) toggle.click();
    const btn = document.querySelector('#demo-step-nav button[data-step="2"]')
      || [...document.querySelectorAll('#demo-step-nav button')].find(b => /carinho|affection|pet/i.test(b.title || b.textContent || ''));
    btn?.click();
    return true;
  })()`);
  await delay(900);
  await shot(cdp, '02-demo-carinho.png', await clipOf(cdp, '#demo-player'));

  // 3) Demo — dança / ação
  await cdp.eval(`(() => {
    const btn = [...document.querySelectorAll('#demo-step-nav button')].find(b => /danc|acao|ação|wave|dance/i.test(b.title || b.textContent || ''))
      || document.querySelector('#demo-step-nav button[data-step="4"]');
    btn?.click();
    return true;
  })()`);
  await delay(900);
  await shot(cdp, '03-demo-acao.png', await clipOf(cdp, '#demo-player'));

  // 4) Demo — futebol / keepy
  await cdp.eval(`(() => {
    const btn = [...document.querySelectorAll('#demo-step-nav button')].find(b => /futebol|bola|keepy|gol/i.test(b.title || b.textContent || ''))
      || document.querySelector('#demo-step-nav button[data-step="10"]');
    btn?.click();
    return true;
  })()`);
  await delay(900);
  await shot(cdp, '04-demo-futebol.png', await clipOf(cdp, '#demo-player'));

  // 5) Lab — personalidade visual (moods)
  await cdp.eval(`document.querySelector('#laboratorio')?.scrollIntoView({behavior:'instant',block:'center'}); true`);
  await delay(400);
  await cdp.eval(`(() => {
    const pet = document.querySelector('#lab-pet');
    pet?.classList.add('mood-happy');
    const emotion = document.querySelector('#lab-emotion');
    if (emotion) { emotion.textContent = '💖'; emotion.classList.add('visible'); }
    const speech = document.querySelector('#lab-speech');
    if (speech) {
      speech.textContent = 'Voz customizada + traço social! 🐾';
      speech.classList.add('visible');
    }
    return true;
  })()`);
  await delay(600);
  await shot(cdp, '05-lab-personalidade.png', await clipOf(cdp, '#laboratorio'));

  // 6) Lab — subpet duo
  await cdp.eval(`(() => {
    const btn = document.querySelector('#subpet-roster button[data-species="dog"]')
      || document.querySelector('#subpet-roster button');
    btn?.click();
    const speech = document.querySelector('#lab-speech');
    if (speech) {
      speech.textContent = 'Dupla dinâmica — interações duo! 🐕';
      speech.classList.add('visible');
    }
    return true;
  })()`);
  await delay(700);
  await shot(cdp, '06-lab-subpet-duo.png', await clipOf(cdp, '#laboratorio'));

  // 7) Página live: contexto + weekly via catálogo (painel overlay)
  await cdp.send('Page.navigate', {
    url: `http://127.0.0.1:${httpPort}/docs/index.html#ecossistema`,
  });
  await delay(1500);
  const panel = await cdp.eval(`(() => {
    const host = location.hostname;
    const ctx = typeof clawdPageContextFromHost === 'function'
      ? clawdPageContextFromHost(host) : 'idle';
    const weekly = typeof clawdWeeklyChallengeForWeek === 'function'
      ? clawdWeeklyChallengeForWeek(typeof clawdISOWeek === 'function' ? clawdISOWeek() : '2026-W29')
      : null;
    const reactions = typeof CLAWD_CONTEXT_REACTIONS !== 'undefined' ? CLAWD_CONTEXT_REACTIONS : {};
    const nCtx = typeof CLAWD_PAGE_CONTEXTS !== 'undefined' ? Object.keys(CLAWD_PAGE_CONTEXTS).length : 0;
    const nWeekly = typeof CLAWD_WEEKLY_CHALLENGES !== 'undefined' ? CLAWD_WEEKLY_CHALLENGES.length : 0;
    const nAch = typeof CLAWD_ACHIEVEMENTS !== 'undefined' ? Object.keys(CLAWD_ACHIEVEMENTS).length : 0;

    document.querySelector('#clawd-improve-panel')?.remove();
    const el = document.createElement('div');
    el.id = 'clawd-improve-panel';
    el.style.cssText = 'position:fixed;inset:40px 40px auto 40px;z-index:99999;background:#0f1419;color:#e8eef5;padding:28px 32px;border-radius:16px;font:15px/1.5 system-ui;box-shadow:0 20px 60px rgba(0,0,0,.45);border:1px solid #2a3540;max-width:720px';
    el.innerHTML = \`
      <div style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#7dd3c0;margin-bottom:8px">Claw'd · melhorias ao vivo</div>
      <h2 style="margin:0 0 16px;font-size:26px;font-weight:700">Sistema fluido, gamificado e contextual</h2>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div style="background:#1a222c;padding:14px;border-radius:10px"><b style="color:#7dd3c0">Contexto</b><br>\${nCtx} categorias + idle<br>Host → <code>\${ctx}</code><br>Reação: \${reactions[ctx]?.msg || '—'}</div>
        <div style="background:#1a222c;padding:14px;border-radius:10px"><b style="color:#7dd3c0">Weekly</b><br>\${nWeekly} desafios rotativos<br>\${weekly ? weekly.badge + ' ' + weekly.label : '—'}</div>
        <div style="background:#1a222c;padding:14px;border-radius:10px"><b style="color:#7dd3c0">Personalidade</b><br>customSpeech × social<br>idle ponderado por traços</div>
        <div style="background:#1a222c;padding:14px;border-radius:10px"><b style="color:#7dd3c0">Qualidade</b><br>112 contratos<br>\${nAch} conquistas · FX≤18 · throttle 8s</div>
      </div>
    \`;
    document.body.appendChild(el);
    return { ctx, nCtx, nWeekly, nAch, weekly: weekly?.label };
  })()`);
  console.log('panel', panel);
  await delay(400);
  await shot(cdp, '07-painel-melhorias.png');

  // 8) Simular reação de contexto (coding)
  await cdp.eval(`(() => {
    const r = CLAWD_CONTEXT_REACTIONS?.coding;
    const panel = document.querySelector('#clawd-improve-panel');
    if (!panel || !r) return false;
    const tip = document.createElement('div');
    tip.style.cssText = 'margin-top:18px;padding:14px 16px;background:#243044;border-radius:10px;border-left:4px solid #7dd3c0';
    tip.innerHTML = '<b>Reação contextual (coding)</b><br>Traço <code>' + r.trait + '</code> ≥ ' + r.min + ' → fala “' + r.msg + '” + ação <code>' + r.action + '</code>';
    panel.appendChild(tip);
    return true;
  })()`);
  await delay(350);
  await shot(cdp, '08-reacao-contexto.png');

  const summary = {
    docsUrl,
    shots: [
      '01-validacao-112.png',
      '02-demo-carinho.png',
      '03-demo-acao.png',
      '04-demo-futebol.png',
      '05-lab-personalidade.png',
      '06-lab-subpet-duo.png',
      '07-painel-melhorias.png',
      '08-reacao-contexto.png',
    ],
    panel,
  };
  await writeFile(join(outDir, 'summary.json'), JSON.stringify(summary, null, 2));
  console.log('DONE', JSON.stringify(summary, null, 2));

  cdp.close();
  child.kill();
  http.close();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
