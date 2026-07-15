import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { join } from 'node:path';

const edgePath = process.env.EDGE_PATH
  || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const out = join('tests', '_shots', '16-credits-faixa.png');

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

async function main() {
  await mkdir(join('tests', '_shots'), { recursive: true });
  const port = await freePort();
  const child = spawn(edgePath, [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=tests/_shots/edge-cf-${port}`,
    '--no-first-run',
    '--window-size=1200,900',
    'about:blank',
  ], { stdio: 'ignore' });

  let list;
  for (let i = 0; i < 50; i++) {
    try {
      list = await fetch(`http://127.0.0.1:${port}/json/list`).then((r) => r.json());
      if (list?.length) break;
    } catch {}
    await delay(200);
  }
  const page = list.find((t) => t.type === 'page') || list[0];
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.addEventListener('open', res, { once: true });
    ws.addEventListener('error', rej, { once: true });
  });

  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(String(event.data));
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
    }
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const next = ++id;
    pending.set(next, { resolve, reject });
    ws.send(JSON.stringify({ id: next, method, params }));
  });

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Page.navigate', { url: 'http://localhost:63654/docs/index.html' });
  await delay(1400);
  await send('Runtime.evaluate', {
    expression: "document.getElementById('creditos').scrollIntoView({block:'center'}); true",
    returnByValue: true,
  });
  await delay(500);
  const clip = (await send('Runtime.evaluate', {
    expression: `(() => {
      const el = document.querySelector('.credits-footnote');
      const r = el.getBoundingClientRect();
      return { x: Math.max(0, r.x - 8), y: Math.max(0, r.y - 8), width: r.width + 16, height: r.height + 16, scale: 1 };
    })()`,
    returnByValue: true,
  })).result.value;

  const { data } = await send('Page.captureScreenshot', {
    format: 'png',
    clip,
    captureBeyondViewport: true,
  });
  await writeFile(out, Buffer.from(data, 'base64'));
  console.log('wrote', out, clip);
  ws.close();
  child.kill();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
