/**
 * Abre so o popup e reporta bootPhase / bootError / grids.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

const projectRoot = resolve('.');
const browserPath = process.env.EDGE_PATH
  || (existsSync('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe')
    ? 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
    : 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe');

const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const freePort = () => new Promise((res, rej) => {
  const s = createServer();
  s.unref();
  s.on('error', rej);
  s.listen(0, '127.0.0.1', () => {
    const p = s.address().port;
    s.close(() => res(p));
  });
});

class CdpClient {
  constructor(url) {
    this.url = url;
    this.nextId = 1;
    this.pending = new Map();
  }
  async connect() {
    this.socket = new WebSocket(this.url);
    this.socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (!message.id) return;
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message));
      else pending.resolve(message.result);
    });
    await new Promise((resolveOpen, reject) => {
      this.socket.addEventListener('open', resolveOpen, { once: true });
      this.socket.addEventListener('error', reject, { once: true });
    });
    return this;
  }
  send(method, params = {}) {
    const id = this.nextId++;
    this.socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolveSend, reject) => {
      this.pending.set(id, { resolve: resolveSend, reject });
      setTimeout(() => reject(new Error('CDP timeout ' + method)), 20000);
    });
  }
  async evaluate(expression) {
    const result = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true
    });
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.text || JSON.stringify(result.exceptionDetails));
    }
    return result.result && result.result.value;
  }
  close() {
    try { this.socket.close(); } catch (_) {}
  }
}

async function listTargets(port) {
  return (await fetch('http://127.0.0.1:' + port + '/json/list')).json();
}

async function retry(fn, timeoutMs = 30000, intervalMs = 250) {
  const deadline = Date.now() + timeoutMs;
  let last;
  while (Date.now() < deadline) {
    try {
      const v = await fn();
      if (v) return v;
    } catch (e) {
      last = e;
    }
    await delay(intervalMs);
  }
  throw last || new Error('timeout');
}

const profile = await mkdtemp(resolve(tmpdir(), 'clawd-pop-'));
const port = await freePort();
const child = spawn(browserPath, [
  '--user-data-dir=' + profile,
  '--remote-debugging-port=' + port,
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-extensions-except=' + projectRoot,
  '--load-extension=' + projectRoot,
  'about:blank'
], { stdio: 'ignore' });

try {
  await retry(async () => {
    const r = await fetch('http://127.0.0.1:' + port + '/json/version');
    return r.ok || null;
  }, 20000);

  await delay(2000);
  let workerTarget = null;
  for (let i = 0; i < 40; i++) {
    const targets = await listTargets(port);
    workerTarget = targets.find((t) => t.type === 'service_worker' && /background\.js/.test(t.url || ''));
    if (workerTarget) break;
    await delay(500);
  }
  if (!workerTarget) {
    console.log('targets', (await listTargets(port)).map((t) => t.type + ' ' + t.url));
    throw new Error('SW not found');
  }

  const worker = await new CdpClient(workerTarget.webSocketDebuggerUrl).connect();
  await worker.send('Runtime.enable');
  const popupUrl = await worker.evaluate("chrome.runtime.getURL('src/popup/popup.html')");
  console.log('popupUrl', popupUrl);

  await worker.evaluate('chrome.tabs.create({ url: ' + JSON.stringify(popupUrl) + ', active: true })');

  const pageTarget = await retry(async () => {
    const targets = await listTargets(port);
    return targets.find((t) => t.type === 'page' && t.url.startsWith(popupUrl));
  }, 20000);

  const page = await new CdpClient(pageTarget.webSocketDebuggerUrl).connect();
  await page.send('Runtime.enable');

  const snap = await retry(async () => {
    const v = await page.evaluate(`({
      ready: document.readyState,
      bootPhase: window.__clawdPopupBootPhase || null,
      bootError: window.__clawdPopupBootError || null,
      actions: document.querySelector('#actions-grid')?.children.length || 0,
      professions: document.querySelector('#profession-grid')?.children.length || 0,
      models: document.querySelector('#model-grid')?.children.length || 0,
      typeofDefault: typeof clawdDefaultState,
      typeofActions: typeof CLAWD_ACTIONS,
      scripts: [...document.scripts].map(s => (s.src||'').split('/').pop()),
      contentCss: !!document.getElementById('clawd-content-css')
    })`);
    if (v.bootError) return v;
    if (v.ready === 'complete' && v.bootPhase === 'done' && v.actions > 0) return v;
    if (v.ready === 'complete' && v.bootPhase && v.bootPhase !== 'done') return v;
    return null;
  }, 20000, 300);

  console.log(JSON.stringify(snap, null, 2));
  worker.close();
  page.close();
  if (snap.bootError || snap.actions === 0) process.exitCode = 1;
} catch (e) {
  console.error('FAIL', e);
  process.exitCode = 1;
} finally {
  try { child.kill(); } catch (_) {}
  await rm(profile, { recursive: true, force: true }).catch(() => {});
}
