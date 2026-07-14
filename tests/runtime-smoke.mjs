import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const edgePath = process.env.EDGE_PATH
  || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

function delay(ms) {
  return new Promise(resolveDelay => setTimeout(resolveDelay, ms));
}

async function freePort() {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => resolvePort(address.port));
    });
  });
}

async function retry(operation, timeoutMs = 20_000, intervalMs = 150) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const result = await operation();
      if (result) return result;
    } catch (error) {
      lastError = error;
    }
    await delay(intervalMs);
  }
  throw lastError || new Error(`Tempo limite excedido (${timeoutMs} ms).`);
}

class CdpClient {
  constructor(url) {
    this.url = url;
    this.nextId = 1;
    this.pending = new Map();
    this.events = [];
  }

  async connect() {
    this.socket = new WebSocket(this.url);
    this.socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(message.error.message));
        else pending.resolve(message.result);
        return;
      }
      this.events.push(message);
    });
    await new Promise((resolveOpen, reject) => {
      this.socket.addEventListener('open', resolveOpen, { once: true });
      this.socket.addEventListener('error', reject, { once: true });
    });
    return this;
  }

  send(method, params = {}) {
    if (this.socket.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error(`CDP desconectado ao executar ${method}.`));
    }
    const id = this.nextId++;
    return new Promise((resolveCommand, reject) => {
      this.pending.set(id, { resolve: resolveCommand, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const response = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (response.exceptionDetails) {
      throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
    }
    return response.result.value;
  }

  close() {
    if (this.socket?.readyState === WebSocket.OPEN) this.socket.close();
  }
}

async function listTargets(port) {
  const response = await fetch(`http://127.0.0.1:${port}/json/list`);
  if (!response.ok) throw new Error(`CDP HTTP ${response.status}`);
  return response.json();
}

function runtimeErrors(client) {
  return client.events.flatMap(event => {
    if (event.method === 'Runtime.exceptionThrown') {
      const details = event.params.exceptionDetails;
      return [details.exception?.description || details.text || 'Runtime.exceptionThrown'];
    }
    if (event.method === 'Log.entryAdded' && event.params.entry.level === 'error') {
      return [event.params.entry.text];
    }
    return [];
  });
}

async function petSnapshot(page) {
  return page.evaluate(`(() => {
    const pets = [...document.querySelectorAll('#aic-clawd-node')];
    const pet = pets[0];
    const sprite = pet?.querySelector('.pixel-sprite');
    const emotion = pet?.querySelector('.emotion-badge');
    return {
      count: pets.length,
      state: pet?.className || null,
      emotion: pet?.getAttribute('data-emotion') || null,
      emotionLayer: !!emotion,
      spriteAnimation: sprite ? getComputedStyle(sprite).animationName : null,
      visible: pet ? getComputedStyle(pet).display !== 'none' : false
    };
  })()`);
}

async function waitForSinglePet(page) {
  return retry(async () => {
    const snapshot = await petSnapshot(page);
    return snapshot.count === 1 && snapshot.visible ? snapshot : null;
  }, 15_000, 200);
}

async function waitForReadyIdlePet(page) {
  return retry(async () => {
    const snapshot = await petSnapshot(page);
    const moving = /(?:^|\s)(?:walking|running|keepy-uppy)(?:\s|$)/.test(snapshot.state || '');
    return snapshot.count === 1
      && snapshot.visible
      && snapshot.emotionLayer
      && !moving
      && snapshot.spriteAnimation === 'none'
      ? snapshot
      : null;
  }, 15_000, 200);
}

async function main() {
  assert.ok(existsSync(edgePath), `Edge não encontrado: ${edgePath}`);

  const profileDir = await mkdtemp(join(tmpdir(), 'clawd-runtime-smoke-'));
  let generatedPageDir = null;
  let browserProcess;
  let page;

  try {
    let targetUrl;
    const requestedPage = process.argv[2];
    if (requestedPage) {
      const pagePath = resolve(requestedPage);
      assert.ok(existsSync(pagePath), `Página de teste não encontrada: ${pagePath}`);
      targetUrl = pathToFileURL(pagePath).href;
    } else {
      generatedPageDir = await mkdtemp(join(tmpdir(), 'clawd-smoke-page-'));
      const pagePath = join(generatedPageDir, 'index.html');
      await writeFile(pagePath, '<!doctype html><meta charset="utf-8"><title>Clawd smoke</title><main>Runtime smoke</main>');
      targetUrl = pathToFileURL(pagePath).href;
    }

    const port = await freePort();
    browserProcess = spawn(edgePath, [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-background-networking',
      '--allow-file-access-from-files',
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profileDir}`,
      `--disable-extensions-except=${projectRoot}`,
      `--load-extension=${projectRoot}`,
      targetUrl
    ], { stdio: 'ignore', windowsHide: true });

    const targets = await retry(() => listTargets(port), 20_000);
    const pageTarget = await retry(async () => {
      const current = await listTargets(port);
      return current.find(target => target.type === 'page' && target.url === targetUrl);
    }, 20_000);
    assert.ok(targets.length > 0 && pageTarget, 'A página local não abriu no Chromium isolado.');

    page = await new CdpClient(pageTarget.webSocketDebuggerUrl).connect();
    await page.send('Runtime.enable');
    await page.send('Log.enable');

    // O service worker faz uma reconciliação inicial e reinjeta o content script.
    // Aguarda essa troca terminar para interagir com a instância definitiva.
    await delay(800);
    const initial = await waitForReadyIdlePet(page);
    assert.equal(initial.count, 1);
    assert.equal(
      initial.spriteAnimation,
      'none',
      `As pernas devem permanecer paradas em repouso (classes: ${initial.state}).`
    );
    assert.equal(initial.emotionLayer, true, 'A camada visual de emoções deve existir.');

    await page.evaluate(`document.querySelector('#aic-clawd-node').click()`);
    const affectionate = await retry(async () => {
      const snapshot = await petSnapshot(page);
      return /happy/.test(snapshot.state) ? snapshot : null;
    }, 3_000, 100);
    assert.match(affectionate.state, /happy/);

    const reloadSnapshots = [];
    for (let cycle = 1; cycle <= 3; cycle++) {
      const workerTarget = await retry(async () => {
        const current = await listTargets(port);
        return current.find(target => target.type === 'service_worker'
          && target.url.includes('/src/background/background.js'));
      }, 10_000);
      const worker = await new CdpClient(workerTarget.webSocketDebuggerUrl).connect();
      try {
        await worker.evaluate('chrome.runtime.reload(); true');
      } catch (_) {
        // O websocket do service worker fecha durante o próprio reload.
      } finally {
        worker.close();
      }
      reloadSnapshots.push(await waitForSinglePet(page));
      await delay(700);
    }

    const errors = runtimeErrors(page);
    const invalidContextErrors = errors.filter(error => /extension context invalidated/i.test(error));
    assert.deepEqual(invalidContextErrors, [], `Erros de contexto inválido: ${invalidContextErrors.join(' | ')}`);
    assert.deepEqual(errors, [], `Erros de runtime: ${errors.join(' | ')}`);
    assert.ok(reloadSnapshots.every(snapshot => snapshot.count === 1), 'Reload deixou pet ausente ou duplicado.');

    const result = {
      page: targetUrl,
      initial,
      affection: affectionate.state,
      reloads: reloadSnapshots.map(snapshot => snapshot.count),
      invalidContextErrors: invalidContextErrors.length,
      runtimeErrors: errors.length,
      runtimeErrorMessages: errors
    };
    console.log(JSON.stringify(result, null, 2));
  } finally {
    page?.close();
    if (browserProcess?.pid) {
      spawnSync('taskkill', ['/pid', String(browserProcess.pid), '/T', '/F'], {
        stdio: 'ignore',
        windowsHide: true
      });
    }
    await delay(500);
    await rm(profileDir, {
      recursive: true,
      force: true,
      maxRetries: 10,
      retryDelay: 200
    }).catch(() => {});
    if (generatedPageDir) {
      await rm(generatedPageDir, {
        recursive: true,
        force: true,
        maxRetries: 5,
        retryDelay: 100
      }).catch(() => {});
    }
  }
}

main().catch(error => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
