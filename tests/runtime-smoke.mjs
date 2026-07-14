import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const {
  CLAWD_ACCESSORIES,
  CLAWD_PROFESSIONS,
  CLAWD_ACTIONS,
  CLAWD_SUBPETS,
  CLAWD_SUBPET_ACTIONS,
  CLAWD_SHOP,
  CLAWD_ACHIEVEMENTS
} = require('../src/shared/catalog.js');
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

async function findWorkerTarget(port) {
  return retry(async () => {
    const current = await listTargets(port);
    return current.find(target => target.type === 'service_worker'
      && target.url.includes('/src/background/background.js'));
  }, 10_000);
}

async function sendToActivePet(worker, message) {
  const payload = JSON.stringify(message);
  return worker.evaluate(`(async () => {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!tab?.id) throw new Error('Aba ativa indisponível.');
    return chrome.tabs.sendMessage(tab.id, ${payload});
  })()`);
}

async function validatePopupRuntime(port, worker) {
  const popupUrl = await worker.evaluate(`chrome.runtime.getURL('src/popup/popup.html')`);
  const tabId = await worker.evaluate(`(async () => {
    const tab = await chrome.tabs.create({ url: ${JSON.stringify(popupUrl)}, active: false });
    return tab.id;
  })()`);
  let popup;

  try {
    const popupTarget = await retry(async () => {
      const current = await listTargets(port);
      return current.find(target => target.type === 'page' && target.url.startsWith(popupUrl));
    }, 8_000, 100);
    popup = await new CdpClient(popupTarget.webSocketDebuggerUrl).connect();
    await popup.send('Runtime.enable');
    await popup.send('Log.enable');

    const expectedHead = Object.values(CLAWD_ACCESSORIES).filter(item => item.slot === 'head').length + 1;
    const expectedFace = Object.values(CLAWD_ACCESSORIES).filter(item => item.slot === 'face').length + 1;
    const snapshot = await retry(async () => {
      const value = await popup.evaluate(`(() => {
        const ids = [...document.querySelectorAll('[id]')].map(element => element.id);
        const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
        return {
          readyState: document.readyState,
          tabs: document.querySelectorAll('.tabs .tab').length,
          professions: document.querySelector('#profession-grid')?.children.length || 0,
          actions: document.querySelector('#actions-grid')?.children.length || 0,
          headAccessories: document.querySelector('#acc-head-grid')?.children.length || 0,
          faceAccessories: document.querySelector('#acc-face-grid')?.children.length || 0,
          subpets: document.querySelector('#subpet-grid')?.children.length || 0,
          subpetActions: document.querySelector('#subpet-action-grid')?.children.length || 0,
          subpetEyeColorInput: !!document.querySelector('#input-subpet-eye-color'),
          shopItems: document.querySelector('#shop-grid')?.children.length || 0,
          achievements: document.querySelector('#ach-list')?.children.length || 0,
          mouthToggleChecked: document.querySelector('#toggle-mouth')?.checked ?? null,
          duplicateIds
        };
      })()`);
      return value.readyState === 'complete'
        && value.professions === Object.keys(CLAWD_PROFESSIONS).length
        && value.actions === Object.keys(CLAWD_ACTIONS).length
        ? value
        : null;
    }, 8_000, 100);

    assert.equal(snapshot.tabs, 8, 'O popup deve renderizar as oito abas.');
    assert.equal(snapshot.headAccessories, expectedHead, 'Catálogo de acessórios de cabeça incompleto no popup.');
    assert.equal(snapshot.faceAccessories, expectedFace, 'Catálogo de acessórios de rosto incompleto no popup.');
    assert.equal(snapshot.subpets, Object.keys(CLAWD_SUBPETS).length, 'Catálogo de sub-pets incompleto no popup.');
    assert.equal(snapshot.subpetActions, Object.keys(CLAWD_SUBPET_ACTIONS).length, 'Ações do sub-pet incompletas no popup.');
    assert.equal(snapshot.subpetEyeColorInput, true, 'O popup deve oferecer cor independente para os olhos do sub-pet.');
    assert.equal(snapshot.shopItems, Object.keys(CLAWD_SHOP).length, 'Loja incompleta no popup.');
    assert.equal(snapshot.achievements, Object.keys(CLAWD_ACHIEVEMENTS).length, 'Conquistas incompletas no popup.');
    assert.equal(snapshot.mouthToggleChecked, true, 'A opção de boca deve iniciar ativada.');
    assert.deepEqual(snapshot.duplicateIds, [], `IDs duplicados no popup: ${snapshot.duplicateIds.join(', ')}`);
    await popup.evaluate(`document.querySelector('#toggle-mouth').click(); true`);
    await retry(async () => {
      const value = await worker.evaluate(`(async () => (await chrome.storage.local.get('clawdState')).clawdState?.showMouth)()`);
      return value === false;
    }, 3_000, 80);
    await popup.evaluate(`document.querySelector('#toggle-mouth').click(); true`);
    await retry(async () => {
      const value = await worker.evaluate(`(async () => (await chrome.storage.local.get('clawdState')).clawdState?.showMouth)()`);
      return value === true;
    }, 3_000, 80);
    await delay(150);
    assert.deepEqual(runtimeErrors(popup), [], 'O popup gerou erro em runtime real.');
    return snapshot;
  } finally {
    popup?.close();
    await worker.evaluate(`chrome.tabs.remove(${Number(tabId)}).catch(() => {}); true`);
  }
}

async function validateSubpetRuntime(worker, page) {
  await worker.evaluate(`(async () => {
    const loaded = await chrome.storage.local.get('clawdState');
    const state = loaded.clawdState;
    state.settings.performanceMode = false;
    state.subpets.unlocked = [...new Set([...(state.subpets.unlocked || []), 'dog'])];
    state.subpets.names.dog = 'Rex';
    state.subpets.colors.dog = '#4a90e2';
    state.subpets.eyeColors = state.subpets.eyeColors || {};
    state.subpets.eyeColors.dog = '#33ff99';
    state.subpets.active = 'dog';
    await chrome.storage.local.set({ clawdState: state });
    return true;
  })()`);
  await delay(250);
  await sendToActivePet(worker, { action: 'setSubpet', value: 'dog' });

  const snapshot = await retry(async () => {
    const value = await page.evaluate(`(() => {
      const subpet = document.querySelector('.aic-subpet');
      const sprite = subpet?.querySelector('.subpet-sprite');
      return subpet ? {
        count: document.querySelectorAll('.aic-subpet').length,
        label: subpet.getAttribute('aria-label'),
        visible: getComputedStyle(subpet).display !== 'none',
        boxShadow: sprite ? getComputedStyle(sprite).boxShadow : 'none'
      } : null;
    })()`);
    return value?.visible ? value : null;
  }, 5_000, 100);

  assert.equal(snapshot.count, 1, 'Apenas um sub-pet ativo deve ser renderizado.');
  assert.match(snapshot.label, /^Rex,/, 'O apelido customizado do sub-pet não foi aplicado.');
  assert.match(snapshot.boxShadow, /rgb\(74, 144, 226\)/, 'A cor customizada do sub-pet não foi aplicada.');
  assert.match(snapshot.boxShadow, /rgb\(51, 255, 153\)/, 'A cor customizada dos olhos do sub-pet não foi aplicada.');

  await page.evaluate(`document.querySelector('.aic-subpet').click()`);
  await retry(() => page.evaluate(`document.querySelector('.aic-subpet')?.classList.contains('cuddling')`), 2_000, 50);
  await retry(() => page.evaluate(`document.querySelector('.aic-subpet')?.dataset.state === 'following'`), 3_000, 60);

  await sendToActivePet(worker, { action: 'triggerSubpetAction', value: 'play' });
  await retry(() => page.evaluate(`document.querySelector('.aic-subpet')?.dataset.state === 'playing'`), 2_000, 50);
  await sendToActivePet(worker, { action: 'triggerSubpetAction', value: 'spin' });
  await retry(() => page.evaluate(`document.querySelector('.aic-subpet')?.dataset.state === 'spinning'`), 2_000, 50);
  await retry(() => page.evaluate(`document.querySelector('.aic-subpet')?.dataset.state === 'following'`), 4_000, 80);

  const interactions = ['explore', 'celebrate', 'special'];
  const expectedStates = {
    explore: 'exploring', celebrate: 'celebrating', special: 'special'
  };
  for (const action of interactions) {
    await sendToActivePet(worker, { action: 'triggerSubpetAction', value: action });
    await retry(
      () => page.evaluate(`document.querySelector('.aic-subpet')?.dataset.state === ${JSON.stringify(expectedStates[action])}`),
      2_000,
      50
    );
    await retry(() => page.evaluate(`document.querySelector('.aic-subpet')?.dataset.state === 'following'`), 5_000, 80);
  }

  await sendToActivePet(worker, { action: 'setSubpet', value: null });
  await worker.evaluate(`(async () => {
    const loaded = await chrome.storage.local.get('clawdState');
    loaded.clawdState.subpets.active = null;
    await chrome.storage.local.set({ clawdState: loaded.clawdState });
    return true;
  })()`);
  await retry(() => page.evaluate(`!document.querySelector('.aic-subpet')`), 3_000, 80);

  return {
    ...snapshot,
    eyeColor: '#33ff99',
    interactions: ['cuddle', 'play', 'spin', ...interactions],
    forcedOverride: 'play→spin',
    removedCleanly: true
  };
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

async function visualSnapshot(page) {
  return page.evaluate(`(() => {
    const pet = document.querySelector('#aic-clawd-node');
    const pixel = pet?.querySelector('.pixel-sprite');
    const smooth = pet?.querySelector('.smooth-sprite');
    const core = pet?.querySelector('.smooth-core');
    const mouth = pet?.querySelector('.emotion-mouth');
    const transparent = value => value === 'rgba(0, 0, 0, 0)' || value === 'transparent';
    const style = element => element ? getComputedStyle(element) : null;
    const pixelStyle = style(pixel);
    const smoothStyle = style(smooth);
    const coreStyle = style(core);
    const mouthStyle = style(mouth);
    const mouthAfter = mouth ? getComputedStyle(mouth, '::after') : null;
    return {
      smoothClass: !!pet?.classList.contains('smooth'),
      pixelDisplay: pixelStyle?.display || null,
      pixelBoxShadow: pixelStyle?.boxShadow || null,
      smoothDisplay: smoothStyle?.display || null,
      smoothBackgroundImage: smoothStyle?.backgroundImage || null,
      coreColor: coreStyle?.backgroundColor || null,
      coreIsTransparent: !coreStyle || transparent(coreStyle.backgroundColor),
      mouthDisplay: mouthStyle?.display || null,
      mouthBackground: mouthStyle?.backgroundColor || null,
      mouthBorderBottom: mouthStyle?.borderBottomWidth || null,
      mouthAfterOpacity: mouthAfter?.opacity || null
    };
  })()`);
}

async function accessorySnapshot(page, slot) {
  return page.evaluate(`(() => {
    const element = document.querySelector('.acc-${slot}');
    if (!element) return null;
    const styles = [getComputedStyle(element), getComputedStyle(element, '::before'), getComputedStyle(element, '::after')];
    const transparent = value => value === 'rgba(0, 0, 0, 0)' || value === 'transparent';
    const painted = styles.some(style => {
      const border = ['Top', 'Right', 'Bottom', 'Left'].some(side => parseFloat(style['border' + side + 'Width']) > 0);
      return style.display !== 'none' && (
        !transparent(style.backgroundColor)
        || style.backgroundImage !== 'none'
        || style.boxShadow !== 'none'
        || border
      );
    });
    return { painted, boxShadow: styles[0].boxShadow, display: styles[0].display };
  })()`);
}

async function capturePetScreenshot(page, outputPath, { head = 'none', face = 'none' } = {}) {
  await page.send('Page.enable');
  await page.evaluate(`(() => {
    let proofStyle = document.querySelector('#clawd-visual-proof-style');
    if (!proofStyle) {
      proofStyle = document.createElement('style');
      proofStyle.id = 'clawd-visual-proof-style';
      document.documentElement.appendChild(proofStyle);
    }
    proofStyle.textContent = [
      '.aic-particle,.aic-toast,.aic-toyball,.aic-fish-caught,.aic-lake,.aic-fishing-line,',
      '.pet-ball,.aic-dust,.aic-goalpost,.speech-bubble,.emotion-badge,.name-tag {',
      'display: none !important;',
      '}'
    ].join('');
    document.querySelectorAll(
      '.aic-particle,.aic-toast,.aic-toyball,.aic-fish-caught,.aic-lake,.aic-fishing-line,' +
      '.pet-ball,.aic-dust,.aic-goalpost'
    ).forEach(element => element.remove());

    const pet = document.querySelector('#aic-clawd-node');
    if (!pet) throw new Error('Pet ausente durante a captura visual.');

    pet.setAttribute('data-acc-head', ${JSON.stringify(head)});
    pet.setAttribute('data-acc-face', ${JSON.stringify(face)});
    pet.setAttribute('data-emotion', 'joyful');
    pet.classList.remove(
      'shiny', 'walking', 'running', 'keepy-uppy', 'sleeping', 'excited', 'waving',
      'celebrate', 'dance-1', 'dance-2', 'dance-3', 'jumping', 'roaring', 'highfive',
      'eating', 'yawning', 'shy', 'tantrum', 'bathing', 'fishing', 'reeling', 'stretching'
    );
    pet.classList.add('smooth', 'happy');

    const hide = selector => {
      const element = pet.querySelector(selector);
      if (element) element.style.setProperty('display', 'none', 'important');
    };
    hide('.speech-bubble');
    hide('.emotion-badge');
    hide('.name-tag');

    const body = pet.querySelector('.pet-body');
    const stack = pet.querySelector('.sprite-stack');
    body?.style.setProperty('animation', 'none', 'important');
    stack?.style.setProperty('transform', 'none', 'important');
    return true;
  })()`);
  await delay(100);

  const clip = await page.evaluate(`(() => {
    const rect = document.querySelector('#aic-clawd-node').getBoundingClientRect();
    const x = Math.max(0, rect.left - 72);
    const y = Math.max(0, rect.top - 86);
    return {
      x,
      y,
      width: Math.min(innerWidth - x, rect.width + 144),
      height: Math.min(innerHeight - y, rect.height + 132),
      scale: 3
    };
  })()`);
  const capture = await page.send('Page.captureScreenshot', {
    format: 'png',
    clip,
    captureBeyondViewport: true
  });
  const screenshot = resolve(outputPath);
  await writeFile(screenshot, Buffer.from(capture.data, 'base64'));
  return screenshot;
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
  let controlWorker;

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

    controlWorker = await new CdpClient((await findWorkerTarget(port)).webSocketDebuggerUrl).connect();
    const popupRuntime = await validatePopupRuntime(port, controlWorker);
    const subpetRuntime = await validateSubpetRuntime(controlWorker, page);

    await sendToActivePet(controlWorker, { action: 'updateConfig', key: 'smooth', value: true });
    const smoothVisual = await retry(async () => {
      const snapshot = await visualSnapshot(page);
      return snapshot.smoothClass && snapshot.smoothDisplay === 'block' && snapshot.pixelDisplay === 'none'
        ? snapshot
        : null;
    }, 3_000, 80);
    assert.equal(smoothVisual.pixelBoxShadow, 'none', 'O modo liso não pode preservar a grade de box-shadow.');
    assert.equal(smoothVisual.smoothBackgroundImage, 'none', 'A silhueta lisa não pode ter textura de grade.');
    assert.equal(smoothVisual.coreIsTransparent, false, 'A silhueta contínua precisa estar visível.');

    const smoothAccessories = [];
    for (const [id, definition] of Object.entries(CLAWD_ACCESSORIES)) {
      const key = definition.slot === 'head' ? 'accessoryHead' : 'accessoryFace';
      await sendToActivePet(controlWorker, { action: 'updateConfig', key, value: id });
      await retry(() => page.evaluate(`document.querySelector('#aic-clawd-node')?.getAttribute('data-acc-${definition.slot}') === ${JSON.stringify(id)}`), 2_000, 50);
      const snapshot = await accessorySnapshot(page, definition.slot);
      assert.equal(snapshot?.painted, true, `Acessório liso invisível: ${id}`);
      smoothAccessories.push(id);
    }

    await sendToActivePet(controlWorker, { action: 'updateConfig', key: 'smooth', value: false });
    const pixelAccessories = [];
    for (const [id, definition] of Object.entries(CLAWD_ACCESSORIES)) {
      const key = definition.slot === 'head' ? 'accessoryHead' : 'accessoryFace';
      await sendToActivePet(controlWorker, { action: 'updateConfig', key, value: id });
      await retry(() => page.evaluate(`document.querySelector('#aic-clawd-node')?.getAttribute('data-acc-${definition.slot}') === ${JSON.stringify(id)}`), 2_000, 50);
      const snapshot = await accessorySnapshot(page, definition.slot);
      assert.notEqual(snapshot?.boxShadow, 'none', `Pixel-art ausente: ${id}`);
      pixelAccessories.push(id);
    }

    const professions = [];
    for (const profession of Object.keys(CLAWD_PROFESSIONS)) {
      await sendToActivePet(controlWorker, { action: 'updateConfig', key: 'profession', value: profession });
      await retry(() => page.evaluate(`document.querySelector('#aic-clawd-node')?.dataset.profession === ${JSON.stringify(profession)}`), 2_000, 50);
      professions.push(profession);
    }

    const actions = [];
    for (const action of Object.keys(CLAWD_ACTIONS)) {
      await sendToActivePet(controlWorker, { action: 'triggerAction', value: action });
      actions.push(action);
      await delay(25);
    }
    await retry(() => page.evaluate(`!!document.querySelector('.aic-lake')`), 3_000, 80);

    await sendToActivePet(controlWorker, { action: 'updateConfig', key: 'profession', value: 'idle' });
    await sendToActivePet(controlWorker, { action: 'updateConfig', key: 'smooth', value: true });
    await sendToActivePet(controlWorker, { action: 'updateConfig', key: 'accessoryHead', value: 'cap' });
    await sendToActivePet(controlWorker, { action: 'updateConfig', key: 'accessoryFace', value: 'sunglasses' });
    await sendToActivePet(controlWorker, { action: 'updateConfig', key: 'showSpeech', value: false });

    await page.evaluate(`document.querySelector('#aic-clawd-node').click()`);
    const affectionate = await retry(async () => {
      const snapshot = await petSnapshot(page);
      return /happy/.test(snapshot.state) ? snapshot : null;
    }, 3_000, 100);
    assert.match(affectionate.state, /happy/);
    const mouthVisual = await visualSnapshot(page);
    assert.equal(mouthVisual.mouthBackground, 'rgba(0, 0, 0, 0)', 'A boca não deve ser um bloco preenchido.');
    assert.equal(mouthVisual.mouthBorderBottom, '2px', 'O sorriso deve usar um traço arredondado.');
    assert.notEqual(mouthVisual.mouthAfterOpacity, '0', 'A expressão feliz deve ter detalhe de língua.');

    await sendToActivePet(controlWorker, { action: 'updateConfig', key: 'showMouth', value: false });
    const hiddenMouth = await retry(async () => {
      const snapshot = await visualSnapshot(page);
      return snapshot.mouthDisplay === 'none' ? snapshot : null;
    }, 3_000, 80);
    assert.equal(hiddenMouth.mouthDisplay, 'none', 'Desativar a boca deve ocultar toda a camada de expressão.');

    await sendToActivePet(controlWorker, { action: 'updateConfig', key: 'showMouth', value: true });
    const restoredMouth = await retry(async () => {
      const snapshot = await visualSnapshot(page);
      return snapshot.mouthDisplay !== 'none' ? snapshot : null;
    }, 3_000, 80);
    assert.equal(restoredMouth.mouthBorderBottom, '2px', 'Reativar a boca deve restaurar o sorriso atual.');

    const headwearMotion = await page.evaluate(`(() => {
      const pet = document.querySelector('#aic-clawd-node');
      const headwear = pet?.querySelector('.acc-head');
      pet?.classList.remove('walking', 'running');
      pet?.classList.add('walking');
      const moving = headwear ? getComputedStyle(headwear).animationName : null;
      pet?.classList.remove('walking', 'running');
      const idle = headwear ? getComputedStyle(headwear).animationName : null;
      return { moving, idle };
    })()`);
    assert.match(headwearMotion.moving || '', /clawd-headwear-step/, 'O chapéu deve acompanhar o passo do pet.');
    assert.equal(headwearMotion.idle, 'none', 'O chapéu deve permanecer assentado quando o pet está parado.');

    let screenshot = null;
    let accessoryScreenshot = null;
    if (process.env.CLAWD_SCREENSHOT) {
      screenshot = await capturePetScreenshot(page, process.env.CLAWD_SCREENSHOT);
    }
    if (process.env.CLAWD_ACCESSORY_SCREENSHOT) {
      accessoryScreenshot = await capturePetScreenshot(page, process.env.CLAWD_ACCESSORY_SCREENSHOT, {
        head: 'cap',
        face: 'sunglasses'
      });
    }

    controlWorker.close();
    controlWorker = null;

    const reloadSnapshots = [];
    for (let cycle = 1; cycle <= 3; cycle++) {
      const workerTarget = await findWorkerTarget(port);
      const worker = await new CdpClient(workerTarget.webSocketDebuggerUrl).connect();
      try {
        await worker.evaluate('chrome.runtime.reload(); true');
      } catch (_) {
        // O websocket do service worker fecha durante o próprio reload.
      } finally {
        worker.close();
      }
      try {
        reloadSnapshots.push(await waitForSinglePet(page));
      } catch (error) {
        const snapshot = await petSnapshot(page).catch(() => null);
        const targetsAfterReload = await listTargets(port).catch(() => []);
        let manualReconcile = null;
        try {
          const currentWorkerTarget = await findWorkerTarget(port);
          const currentWorker = await new CdpClient(currentWorkerTarget.webSocketDebuggerUrl).connect();
          manualReconcile = await currentWorker.evaluate(`(async () => {
            const tabs = await chrome.tabs.query({});
            await reconcileRuntimeAfterReload();
            return tabs.map(tab => ({ id: tab.id, active: tab.active, url: tab.url, lastAccessed: tab.lastAccessed }));
          })()`);
          currentWorker.close();
          await delay(2_500);
        } catch (manualError) {
          manualReconcile = { error: manualError.message };
        }
        const snapshotAfterManual = await petSnapshot(page).catch(() => null);
        throw new Error(
          `Reload ${cycle} não reconciliou o pet: ${error.message}; `
          + `snapshot=${JSON.stringify(snapshot)}; `
          + `manual=${JSON.stringify(manualReconcile)}; `
          + `afterManual=${JSON.stringify(snapshotAfterManual)}; `
          + `targets=${JSON.stringify(targetsAfterReload.map(target => ({ type: target.type, url: target.url })))}`
        );
      }
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
      smooth: smoothVisual,
      mouth: mouthVisual,
      mouthToggle: { hidden: hiddenMouth.mouthDisplay, restored: restoredMouth.mouthDisplay },
      headwearMotion,
      accessories: { smooth: smoothAccessories.length, pixel: pixelAccessories.length },
      professions: professions.length,
      actions: actions.length,
      popup: popupRuntime,
      subpet: subpetRuntime,
      screenshot,
      accessoryScreenshot,
      reloads: reloadSnapshots.map(snapshot => snapshot.count),
      invalidContextErrors: invalidContextErrors.length,
      runtimeErrors: errors.length,
      runtimeErrorMessages: errors
    };
    console.log(JSON.stringify(result, null, 2));
  } finally {
    controlWorker?.close();
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
