/**
 * Captura tour visual da docs: liso, futebol, carinho, créditos.
 * Usa CDP + Edge (mesmo padrão do runtime-smoke).
 */
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const outDir = join(root, 'tests', 'shots');
const edgePath = process.env.EDGE_PATH
  || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const DOCS = process.env.CLAWD_DOCS_URL || 'http://localhost:63654/docs/';

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function freePort() {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolvePort(port));
    });
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
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async eval(expression) {
    const result = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'eval failed');
    return result.result?.value;
  }
  close() {
    this.ws?.close();
  }
}

async function screenshot(cdp, name) {
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
  const file = join(outDir, name);
  await writeFile(file, Buffer.from(data, 'base64'));
  console.log('wrote', name);
}

async function main() {
  await mkdir(outDir, { recursive: true });
  const port = await freePort();
  const userData = join(root, '.tmp', `edge-profile-${port}`);
  const child = spawn(edgePath, [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userData}`,
    '--no-first-run',
    '--disable-extensions',
    '--window-size=1400,1000',
    'about:blank',
  ], { stdio: 'ignore' });

  let list;
  for (let i = 0; i < 40; i++) {
    try {
      list = await fetch(`http://127.0.0.1:${port}/json/list`).then((r) => r.json());
      if (list?.length) break;
    } catch {}
    await delay(250);
  }
  if (!list?.length) throw new Error('CDP not ready');

  const page = list.find((t) => t.type === 'page') || list[0];
  const cdp = new Cdp(page.webSocketDebuggerUrl);
  await cdp.connect();
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Page.navigate', { url: DOCS });
  await delay(1800);

  // Rola para o lab e força modo liso terracotta
  await cdp.eval(`(() => {
    const lab = document.querySelector('#laboratorio') || document.querySelector('.live-lab');
    lab?.scrollIntoView({ behavior: 'instant', block: 'center' });
    const mode = document.querySelector('#lab-render-mode');
    if (mode) { mode.value = 'smooth'; mode.dispatchEvent(new Event('change', { bubbles: true })); }
    const color = document.querySelector('#lab-body-color');
    if (color) { color.value = '#d97757'; color.dispatchEvent(new Event('input', { bubbles: true })); color.dispatchEvent(new Event('change', { bubbles: true })); }
    const pet = document.querySelector('#lab-pet') || document.querySelector('.doc-main-pet');
    pet?.classList.add('smooth');
    return !!pet;
  })()`);
  await delay(600);
  await screenshot(cdp, '10-lab-smooth.png');

  // Happy / carinho
  await cdp.eval(`(() => {
    const pet = document.querySelector('#lab-pet') || document.querySelector('.doc-main-pet');
    pet?.classList.add('mood-happy', 'happy');
    pet?.classList.remove('mood-idle');
    return true;
  })()`);
  await delay(400);
  await screenshot(cdp, '11-lab-happy.png');

  // Profissão jogador se existir
  await cdp.eval(`(() => {
    const prof = document.querySelector('#lab-profession');
    if (prof) {
      const opts = [...prof.options].map(o => o.value);
      const foot = opts.find(v => /foot|jogador|football/i.test(v)) || 'footballer';
      if ([...prof.options].some(o => o.value === foot)) {
        prof.value = foot;
        prof.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
    const pet = document.querySelector('#lab-pet') || document.querySelector('.doc-main-pet');
    pet?.classList.add('has-ball', 'keepy-uppy');
    return true;
  })()`);
  await delay(500);
  await screenshot(cdp, '12-lab-football.png');

  // Demo player scene smooth
  await cdp.eval(`(() => {
    document.querySelector('#demonstracao')?.scrollIntoView({ behavior: 'instant', block: 'center' });
    const pet = document.querySelector('#demo-pet');
    pet?.classList.add('is-smooth', 'is-happy');
    const stage = document.querySelector('[data-scene]') || document.querySelector('.demo-browser-stage');
    if (stage) stage.setAttribute('data-scene', 'smooth');
    return !!pet;
  })()`);
  await delay(500);
  await screenshot(cdp, '13-demo-smooth.png');

  // Créditos
  await cdp.eval(`(() => {
    document.querySelector('#creditos')?.scrollIntoView({ behavior: 'instant', block: 'start' });
    return !!document.querySelector('#creditos');
  })()`);
  await delay(500);
  await screenshot(cdp, '14-creditos.png');

  cdp.close();
  child.kill();
  console.log('done');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
