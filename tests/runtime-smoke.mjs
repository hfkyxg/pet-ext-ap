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
  CLAWD_MODELS,
  CLAWD_FACE_STYLES,
  CLAWD_SKINS,
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
          models: document.querySelector('#model-grid')?.children.length || 0,
          faceStyles: document.querySelector('#face-style-grid')?.children.length || 0,
          skins: document.querySelector('#skin-grid')?.children.length || 0,
          headAccessories: document.querySelector('#acc-head-grid')?.children.length || 0,
          faceAccessories: document.querySelector('#acc-face-grid')?.children.length || 0,
          subpets: document.querySelector('#subpet-grid')?.children.length || 0,
          subpetActions: document.querySelector('#subpet-action-grid')?.children.length || 0,
          subpetEyeColorInput: !!document.querySelector('#input-subpet-eye-color'),
          mainEyeColorInput: !!document.querySelector('#input-eye-color'),
          accessoryArtPreviews: document.querySelectorAll('.accessory-art-preview').length,
          headerPreview: (() => {
            const preview = document.querySelector('#mini-sprite.header-model-preview');
            return preview ? {
              model: preview.dataset.model,
              faceStyle: preview.dataset.faceStyle,
              bodyPaint: getComputedStyle(preview.querySelector('.pixel-sprite')).boxShadow
            } : null;
          })(),
          shopItems: document.querySelector('#shop-grid')?.children.length || 0,
          achievements: document.querySelector('#ach-list')?.children.length || 0,
          mouthToggleChecked: document.querySelector('#toggle-mouth')?.checked ?? null,
          outfitPreview: !!document.querySelector('#aic-clawd-node.popup-outfit-pet'),
          outfitHead: document.querySelector('#aic-clawd-node.popup-outfit-pet')?.dataset.accHead || null,
          outfitFace: document.querySelector('#aic-clawd-node.popup-outfit-pet')?.dataset.accFace || null,
          outfitDetail: document.querySelector('#outfit-preview-detail')?.textContent || '',
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
    assert.equal(snapshot.models, Object.keys(CLAWD_MODELS).length, 'Catálogo de modelos incompleto no popup.');
    assert.equal(snapshot.faceStyles, Object.keys(CLAWD_FACE_STYLES).length, 'Catálogo de rostos incompleto no popup.');
    assert.equal(snapshot.skins, Object.keys(CLAWD_SKINS).length, 'Catálogo de skins incompleto no popup.');
    assert.equal(snapshot.headAccessories, expectedHead, 'Catálogo de acessórios de cabeça incompleto no popup.');
    assert.equal(snapshot.faceAccessories, expectedFace, 'Catálogo de acessórios de rosto incompleto no popup.');
    assert.equal(snapshot.subpets, Object.keys(CLAWD_SUBPETS).length, 'Catálogo de sub-pets incompleto no popup.');
    assert.equal(snapshot.subpetActions, Object.keys(CLAWD_SUBPET_ACTIONS).length, 'Ações do sub-pet incompletas no popup.');
    assert.equal(snapshot.subpetEyeColorInput, true, 'O popup deve oferecer cor independente para os olhos do sub-pet.');
    assert.equal(snapshot.mainEyeColorInput, true, 'O popup deve oferecer cor independente para os olhos do pet principal.');
    assert.equal(snapshot.accessoryArtPreviews, expectedHead + expectedFace, 'Cada card de acessório deve usar uma miniatura da arte real.');
    assert.equal(snapshot.headerPreview?.model, 'classic', 'O cabeçalho deve usar o modelo clássico real, não a sprite legada.');
    assert.equal(snapshot.headerPreview?.faceStyle, 'classic', 'O rosto do cabeçalho deve seguir o catálogo atual.');
    assert.notEqual(snapshot.headerPreview?.bodyPaint, 'none', 'A miniatura do cabeçalho precisa pintar a arte compartilhada.');
    assert.equal(snapshot.shopItems, Object.keys(CLAWD_SHOP).length, 'Loja incompleta no popup.');
    assert.equal(snapshot.achievements, Object.keys(CLAWD_ACHIEVEMENTS).length, 'Conquistas incompletas no popup.');
    assert.equal(snapshot.mouthToggleChecked, false, 'A opção de boca deve iniciar desativada (silhueta Claude).');
    assert.equal(snapshot.outfitPreview, true, 'O popup deve renderizar o provador com a arte real do pet.');
    assert.equal(snapshot.outfitHead, 'none', 'O provador deve refletir o slot de cabeça inicial.');
    assert.equal(snapshot.outfitFace, 'none', 'O provador deve refletir o slot de rosto inicial.');
    assert.match(snapshot.outfitDetail, /dois slots combináveis/i);
    assert.deepEqual(snapshot.duplicateIds, [], `IDs duplicados no popup: ${snapshot.duplicateIds.join(', ')}`);

    await popup.evaluate(`document.querySelector('[data-model-id="claws"]').click(); true`);
    await popup.evaluate(`document.querySelector('[data-face-style-id="sparkle"]').click(); true`);
    await popup.evaluate(`(() => {
      const input = document.querySelector('#input-eye-color');
      input.value = '#33aaff';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    })()`);
    const customizedModel = await retry(async () => {
      const value = await popup.evaluate(`(() => {
        const preview = document.querySelector('#aic-clawd-node.popup-outfit-pet');
        const eyes = preview?.querySelector('.pet-eyes');
        return {
          model: preview?.dataset.model,
          faceStyle: preview?.dataset.faceStyle,
          eyeColor: eyes ? getComputedStyle(eyes).backgroundColor : null
        };
      })()`);
      return value.model === 'claws' && value.faceStyle === 'sparkle' && value.eyeColor === 'rgb(51, 170, 255)'
        ? value
        : null;
    }, 2_000, 50);
    snapshot.customizedModel = customizedModel;

    await popup.evaluate(`document.querySelector('[data-accessory-id="cap"][data-accessory-slot="head"]').click(); true`);
    await popup.evaluate(`document.querySelector('[data-accessory-id="sunglasses"][data-accessory-slot="face"]').click(); true`);
    const pixelOutfit = await retry(async () => {
      const value = await popup.evaluate(`(() => {
        const preview = document.querySelector('#aic-clawd-node.popup-outfit-pet');
        const head = preview?.querySelector('.acc-head');
        const face = preview?.querySelector('.acc-face');
        return {
          head: preview?.dataset.accHead,
          face: preview?.dataset.accFace,
          headPaint: head ? getComputedStyle(head).boxShadow : 'none',
          facePaint: face ? getComputedStyle(face).boxShadow : 'none'
        };
      })()`);
      return value.head === 'cap' && value.face === 'sunglasses' ? value : null;
    }, 2_000, 50);
    assert.notEqual(pixelOutfit.headPaint, 'none', 'O provador não pintou o boné em pixel-art.');
    assert.notEqual(pixelOutfit.facePaint, 'none', 'O provador não pintou os óculos em pixel-art.');

    await popup.evaluate(`document.querySelector('#toggle-smooth').click(); true`);
    const smoothOutfit = await retry(async () => {
      const value = await popup.evaluate(`(() => {
        const preview = document.querySelector('#aic-clawd-node.popup-outfit-pet');
        const head = preview?.querySelector('.acc-head');
        const face = preview?.querySelector('.acc-face');
        return {
          smooth: !!preview?.classList.contains('smooth'),
          pixelDisplay: getComputedStyle(preview.querySelector('.pixel-sprite')).display,
          headPaint: head ? getComputedStyle(head).boxShadow : 'none',
          facePaint: face ? getComputedStyle(face).boxShadow : 'none'
        };
      })()`);
      return value.smooth && value.pixelDisplay === 'none' ? value : null;
    }, 2_000, 50);
    assert.notEqual(smoothOutfit.headPaint, 'none', 'No modo liso o boné deve permanecer em pixel-sprite.');
    assert.notEqual(smoothOutfit.facePaint, 'none', 'No modo liso os óculos devem permanecer em pixel-sprite.');

    await popup.evaluate(`document.querySelector('#toggle-smooth').click(); true`);
    await popup.evaluate(`document.querySelector('[data-accessory-id="none"][data-accessory-slot="head"]').click(); true`);
    await popup.evaluate(`document.querySelector('[data-accessory-id="none"][data-accessory-slot="face"]').click(); true`);
    await retry(() => popup.evaluate(`(() => {
      const preview = document.querySelector('#aic-clawd-node.popup-outfit-pet');
      return preview?.dataset.accHead === 'none' && preview?.dataset.accFace === 'none';
    })()`), 2_000, 50);
    snapshot.outfitVisuals = { pixel: pixelOutfit, smooth: smoothOutfit, removal: true };

    await popup.evaluate(`document.querySelector('#toggle-mouth').click(); true`);
    await retry(async () => {
      const value = await worker.evaluate(`(async () => (await chrome.storage.local.get('clawdState')).clawdState?.showMouth)()`);
      return value === true;
    }, 3_000, 80);
    await popup.evaluate(`document.querySelector('#toggle-mouth').click(); true`);
    await retry(async () => {
      const value = await worker.evaluate(`(async () => (await chrome.storage.local.get('clawdState')).clawdState?.showMouth)()`);
      return value === false;
    }, 3_000, 80);
    await popup.evaluate(`document.querySelector('[data-model-id="classic"]').click(); true`);
    await popup.evaluate(`document.querySelector('[data-face-style-id="classic"]').click(); true`);
    await popup.evaluate(`(() => {
      const input = document.querySelector('#input-eye-color');
      input.value = '#08080b';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    })()`);
    await delay(150);
    if (process.env.CLAWD_POPUP_SCREENSHOT) {
      await popup.send('Page.enable');
      const metrics = await popup.send('Page.getLayoutMetrics');
      const size = metrics.cssContentSize || metrics.contentSize;
      const capture = await popup.send('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: true,
        clip: { x: 0, y: 0, width: Math.ceil(size.width), height: Math.ceil(size.height), scale: 1.5 }
      });
      snapshot.screenshot = resolve(process.env.CLAWD_POPUP_SCREENSHOT);
      await writeFile(snapshot.screenshot, Buffer.from(capture.data, 'base64'));
    }
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
  await retry(() => page.evaluate(`!document.querySelector('.aic-subpet:not(.aic-subpet-clone)')`), 4_000, 80);

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
    const legs = pet?.querySelector('.pixel-legs');
    const emotion = pet?.querySelector('.emotion-badge');
    return {
      count: pets.length,
      state: pet?.className || null,
      engineState: pet?.dataset.state || null,
      emotion: pet?.getAttribute('data-emotion') || null,
      emotionLayer: !!emotion,
      spriteAnimation: sprite ? getComputedStyle(sprite).animationName : null,
      legsAnimation: legs ? getComputedStyle(legs).animationName : null,
      model: pet?.dataset.model || null,
      faceStyle: pet?.dataset.faceStyle || null,
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
    const legs = pet?.querySelector('.pixel-legs');
    const eyes = pet?.querySelector('.pet-eyes');
    const faceDetail = pet?.querySelector('.face-detail');
    const mouth = pet?.querySelector('.emotion-mouth');
    const transparent = value => value === 'rgba(0, 0, 0, 0)' || value === 'transparent';
    const style = element => element ? getComputedStyle(element) : null;
    const pixelStyle = style(pixel);
    const smoothStyle = style(smooth);
    const coreStyle = style(core);
    const legsStyle = style(legs);
    const eyeStyle = style(eyes);
    const faceDetailBefore = faceDetail ? getComputedStyle(faceDetail, '::before') : null;
    const coreAfter = core ? getComputedStyle(core, '::after') : null;
    const mouthStyle = style(mouth);
    const mouthAfter = mouth ? getComputedStyle(mouth, '::after') : null;
    return {
      smoothClass: !!pet?.classList.contains('smooth'),
      model: pet?.dataset.model || null,
      faceStyle: pet?.dataset.faceStyle || null,
      pixelDisplay: pixelStyle?.display || null,
      pixelBoxShadow: pixelStyle?.boxShadow || null,
      pixelAnimation: pixelStyle?.animationName || null,
      legsDisplay: legsStyle?.display || null,
      legsBoxShadow: legsStyle?.boxShadow || null,
      legsAnimation: legsStyle?.animationName || null,
      smoothDisplay: smoothStyle?.display || null,
      smoothBackgroundImage: smoothStyle?.backgroundImage || null,
      coreColor: coreStyle?.backgroundColor || null,
      coreWidth: coreStyle?.width || null,
      coreAfterBackground: coreAfter?.backgroundImage || null,
      coreIsTransparent: !coreStyle || transparent(coreStyle.backgroundColor),
      eyeColor: eyeStyle?.backgroundColor || null,
      eyeHeight: eyeStyle?.height || null,
      faceDetailPaint: faceDetailBefore?.backgroundColor || null,
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

async function accessoryStateSnapshot(page) {
  return page.evaluate(`(() => {
    const pet = document.querySelector('#aic-clawd-node');
    const head = pet?.querySelector('.acc-head');
    const face = pet?.querySelector('.acc-face');
    return {
      profession: pet?.dataset.profession || null,
      head: pet?.dataset.accHead || null,
      face: pet?.dataset.accFace || null,
      userHead: pet?.dataset.userAccHead || null,
      userFace: pet?.dataset.userAccFace || null,
      headSource: pet?.dataset.accessoryHeadSource || null,
      faceSource: pet?.dataset.accessoryFaceSource || null,
      performanceMode: !!pet?.classList.contains('aic-nofx'),
      headAnimation: head ? getComputedStyle(head).animationName : null,
      headAfterAnimation: head ? getComputedStyle(head, '::after').animationName : null,
      faceAnimation: face ? getComputedStyle(face).animationName : null
    };
  })()`);
}

async function clickPet(page) {
  await page.evaluate(`(() => {
    const pet = document.querySelector('#aic-clawd-node');
    const startedAt = performance.now();
    window.__clawdPointerTrace = [];
    window.__clawdStateTrace = [{ at: 0, state: pet?.dataset.state, classes: pet?.className || '' }];
    const observer = new MutationObserver(records => {
      if (!records.some(record => record.attributeName === 'data-state' || record.attributeName === 'class')) return;
      window.__clawdStateTrace.push({
        at: Math.round(performance.now() - startedAt),
        state: pet?.dataset.state,
        classes: pet?.className || ''
      });
    });
    if (pet) observer.observe(pet, { attributes: true, attributeFilter: ['data-state', 'class'] });
    setTimeout(() => observer.disconnect(), 3500);
    for (const type of ['mousedown', 'mouseup', 'click']) {
      document.addEventListener(type, event => {
        window.__clawdPointerTrace.push({
          type,
          detail: event.detail,
          target: event.target?.className || event.target?.id || event.target?.tagName || ''
        });
      }, { capture: true, once: true });
    }
  })()`);
  const point = await page.evaluate(`(() => {
    const pet = document.querySelector('#aic-clawd-node');
    const rect = pet.querySelector('.sprite-stack').getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    return { x, y, inside: pet.contains(document.elementFromPoint(x, y)) };
  })()`);
  assert.equal(point.inside, true, 'A área pintada do pet precisa aceitar interação do ponteiro.');
  const coords = { x: point.x, y: point.y };
  await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...coords });
  await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...coords, button: 'left', buttons: 1, clickCount: 1 });
  await delay(35);
  await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...coords, button: 'left', buttons: 0, clickCount: 1 });
}

async function capturePetScreenshot(page, outputPath, {
  head = 'none', face = 'none', smooth = true, model = 'classic', faceStyle = 'classic', eyeColor = '#08080b'
} = {}) {
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
    pet.setAttribute('data-model', ${JSON.stringify(model)});
    pet.setAttribute('data-face-style', ${JSON.stringify(faceStyle)});
    pet.style.setProperty('--agent-eye-color', ${JSON.stringify(eyeColor)});
    pet.setAttribute('data-emotion', 'joyful');
    pet.classList.remove(
      'shiny', 'walking', 'running', 'keepy-uppy', 'sleeping', 'excited', 'waving',
      'celebrate', 'dance-1', 'dance-2', 'dance-3', 'jumping', 'roaring', 'highfive',
      'eating', 'yawning', 'shy', 'tantrum', 'bathing', 'fishing', 'reeling', 'stretching'
    );
    pet.classList.remove('smooth', 'happy');
    pet.classList.add('happy');
    if (${JSON.stringify(smooth)}) pet.classList.add('smooth');

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

const SMOKE_VERBOSE = !!process.env.CLAWD_SMOKE_VERBOSE;
function phase(label) { if (SMOKE_VERBOSE) console.error(`[smoke] ${label}`); }

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
    const extraFlags = (process.env.CLAWD_BROWSER_FLAGS || '')
      .split(' ')
      .map(flag => flag.trim())
      .filter(Boolean);
    browserProcess = spawn(edgePath, [
      '--headless=new',
      '--disable-gpu',
      ...extraFlags,
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

    phase('browser spawned, waiting for targets');
    const targets = await retry(() => listTargets(port), 20_000);
    const pageTarget = await retry(async () => {
      const current = await listTargets(port);
      return current.find(target => target.type === 'page' && target.url === targetUrl);
    }, 20_000);
    assert.ok(targets.length > 0 && pageTarget, 'A página local não abriu no Chromium isolado.');

    phase('page target found, connecting CDP');
    page = await new CdpClient(pageTarget.webSocketDebuggerUrl).connect();
    await page.send('Runtime.enable');
    await page.send('Log.enable');

    // O service worker faz uma reconciliação inicial e reinjeta o content script.
    // Aguarda essa troca terminar para interagir com a instância definitiva.
    await delay(800);
    phase('waiting for initial idle pet');
    const initial = await waitForReadyIdlePet(page);
    assert.equal(initial.count, 1);
    assert.equal(
      initial.spriteAnimation,
      'none',
      `O corpo deve permanecer estático em repouso (classes: ${initial.state}).`
    );
    assert.equal(initial.legsAnimation, 'none', 'As pernas devem permanecer paradas em repouso.');
    assert.equal(initial.model, 'classic', 'O modelo clássico da referência deve ser o padrão.');
    assert.equal(initial.faceStyle, 'classic', 'O rosto clássico deve ser o padrão.');
    assert.equal(initial.emotionLayer, true, 'A camada visual de emoções deve existir.');

    phase('initial pet OK; connecting service worker');
    controlWorker = await new CdpClient((await findWorkerTarget(port)).webSocketDebuggerUrl).connect();
    phase('validating popup runtime');
    const popupRuntime = await validatePopupRuntime(port, controlWorker);
    phase('validating subpet runtime');
    const subpetRuntime = await validateSubpetRuntime(controlWorker, page);

    await sendToActivePet(controlWorker, { action: 'updateConfig', key: 'smooth', value: false });
    phase('validating pixel models');
    const pixelModels = {};
    for (const id of Object.keys(CLAWD_MODELS)) {
      await sendToActivePet(controlWorker, { action: 'updateConfig', key: 'model', value: id });
      const modelVisual = await retry(async () => {
        const snapshot = await visualSnapshot(page);
        return snapshot.model === id && snapshot.pixelDisplay !== 'none' ? snapshot : null;
      }, 2_000, 50);
      assert.notEqual(modelVisual.pixelBoxShadow, 'none', `Silhueta pixel invisível: ${id}`);
      assert.notEqual(modelVisual.legsBoxShadow, 'none', `Pernas pixel invisíveis: ${id}`);
      assert.equal(modelVisual.pixelAnimation, 'none', `O corpo do modelo ${id} não pode morphar durante o ciclo.`);
      assert.equal(modelVisual.legsAnimation, 'none', `O modelo ${id} deve ficar com as pernas imóveis em repouso.`);
      pixelModels[id] = modelVisual.pixelBoxShadow;
    }
    assert.equal(new Set(Object.values(pixelModels)).size, Object.keys(CLAWD_MODELS).length, 'Os quatro modelos precisam ter silhuetas distintas.');

    await sendToActivePet(controlWorker, { action: 'updateConfig', key: 'eyeColor', value: '#33aaff' });
    phase('validating face styles');
    const faceStyles = {};
    for (const id of Object.keys(CLAWD_FACE_STYLES)) {
      await sendToActivePet(controlWorker, { action: 'updateConfig', key: 'faceStyle', value: id });
      const faceVisual = await retry(async () => {
        const snapshot = await visualSnapshot(page);
        return snapshot.faceStyle === id && snapshot.eyeColor === 'rgb(51, 170, 255)' ? snapshot : null;
      }, 2_000, 50);
      faceStyles[id] = { eyeHeight: faceVisual.eyeHeight, detail: faceVisual.faceDetailPaint };
    }
    assert.equal(faceStyles.sleepy.eyeHeight, '1px', 'O rosto sonolento deve trocar os olhos por traços pixelados.');
    assert.notEqual(faceStyles.sparkle.detail, 'rgba(0, 0, 0, 0)', 'O rosto Brilho precisa pintar reflexos nos olhos.');
    assert.notEqual(faceStyles.focused.detail, 'rgba(0, 0, 0, 0)', 'O rosto Focado precisa pintar sobrancelhas.');

    await sendToActivePet(controlWorker, { action: 'updateConfig', key: 'smooth', value: true });
    const smoothModelWidths = { classic: '28px', mini: '20px', claws: '28px', guardian: '36px' };
    phase('validating smooth models');
    const smoothModels = {};
    for (const id of Object.keys(CLAWD_MODELS)) {
      await sendToActivePet(controlWorker, { action: 'updateConfig', key: 'model', value: id });
      const modelVisual = await retry(async () => {
        const snapshot = await visualSnapshot(page);
        return snapshot.model === id && snapshot.smoothDisplay === 'block' ? snapshot : null;
      }, 2_000, 50);
      assert.equal(modelVisual.coreWidth, smoothModelWidths[id], `Largura lisa incorreta: ${id}`);
      assert.equal(modelVisual.legsDisplay, 'none', `O modelo liso ${id} não pode exibir pernas em box-shadow.`);
      smoothModels[id] = modelVisual.coreWidth;
      if (id === 'claws') assert.notEqual(modelVisual.coreAfterBackground, 'none', 'O modelo Pinças liso precisa desenhar as pinças.');
    }
    await sendToActivePet(controlWorker, { action: 'updateConfig', key: 'model', value: 'classic' });
    await sendToActivePet(controlWorker, { action: 'updateConfig', key: 'faceStyle', value: 'classic' });
    await sendToActivePet(controlWorker, { action: 'updateConfig', key: 'eyeColor', value: '#08080b' });

    const smoothVisual = await retry(async () => {
      const snapshot = await visualSnapshot(page);
      return snapshot.smoothClass && snapshot.smoothDisplay === 'block' && snapshot.pixelDisplay === 'none'
        ? snapshot
        : null;
    }, 3_000, 80);
    assert.equal(smoothVisual.pixelBoxShadow, 'none', 'O modo liso não pode preservar a grade de box-shadow.');
    assert.equal(smoothVisual.smoothBackgroundImage, 'none', 'A silhueta lisa não pode ter textura de grade.');
    assert.equal(smoothVisual.coreIsTransparent, false, 'A silhueta contínua precisa estar visível.');
    assert.equal(smoothVisual.eyeColor, 'rgb(8, 8, 11)', 'A cor padrão dos olhos deve ser restaurada.');

    phase('validating smooth accessories');
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
    phase('validating pixel accessories');
    const pixelAccessories = [];
    for (const [id, definition] of Object.entries(CLAWD_ACCESSORIES)) {
      const key = definition.slot === 'head' ? 'accessoryHead' : 'accessoryFace';
      await sendToActivePet(controlWorker, { action: 'updateConfig', key, value: id });
      await retry(() => page.evaluate(`document.querySelector('#aic-clawd-node')?.getAttribute('data-acc-${definition.slot}') === ${JSON.stringify(id)}`), 2_000, 50);
      const snapshot = await accessorySnapshot(page, definition.slot);
      assert.notEqual(snapshot?.boxShadow, 'none', `Pixel-art ausente: ${id}`);
      pixelAccessories.push(id);
    }

    // O traje automático não pode apagar as escolhas pessoais do usuário.
    await sendToActivePet(controlWorker, { action: 'updateConfig', key: 'accessoryHead', value: 'cap' });
    await sendToActivePet(controlWorker, { action: 'updateConfig', key: 'accessoryFace', value: 'sunglasses' });
    await sendToActivePet(controlWorker, { action: 'updateConfig', key: 'profession', value: 'chef' });
    const chefGear = await retry(async () => {
      const snapshot = await accessoryStateSnapshot(page);
      return snapshot.head === 'chefhat' && snapshot.face === 'sunglasses' ? snapshot : null;
    }, 2_000, 50);
    assert.equal(chefGear.userHead, 'cap');
    assert.equal(chefGear.userFace, 'sunglasses');
    assert.equal(chefGear.headSource, 'profession');

    await sendToActivePet(controlWorker, { action: 'updateConfig', key: 'profession', value: 'tutor' });
    const tutorGear = await retry(async () => {
      const snapshot = await accessoryStateSnapshot(page);
      return snapshot.head === 'cap' && snapshot.face === 'glasses' ? snapshot : null;
    }, 2_000, 50);
    assert.equal(tutorGear.faceSource, 'profession');

    await sendToActivePet(controlWorker, { action: 'updateConfig', key: 'profession', value: 'idle' });
    const restoredGear = await retry(async () => {
      const snapshot = await accessoryStateSnapshot(page);
      return snapshot.head === 'cap' && snapshot.face === 'sunglasses' ? snapshot : null;
    }, 2_000, 50);
    assert.equal(restoredGear.headSource, 'personal');
    assert.equal(restoredGear.faceSource, 'personal');
    await delay(450);
    const storedGear = await controlWorker.evaluate(`(async () => {
      const state = (await chrome.storage.local.get('clawdState')).clawdState;
      return { head: state?.accessoryHead, face: state?.accessoryFace };
    })()`);
    assert.deepEqual(storedGear, { head: 'cap', face: 'sunglasses' }, 'A profissão sobrescreveu o visual salvo.');
    const professionGear = { chef: chefGear, tutor: tutorGear, restored: restoredGear, stored: storedGear };

    phase('validating professions');
    const professions = [];
    for (const profession of Object.keys(CLAWD_PROFESSIONS)) {
      await sendToActivePet(controlWorker, { action: 'updateConfig', key: 'profession', value: profession });
      await retry(() => page.evaluate(`document.querySelector('#aic-clawd-node')?.dataset.profession === ${JSON.stringify(profession)}`), 2_000, 50);
      professions.push(profession);
    }

    const expectedActionStates = {
      wave: 'waving', dance: 'dance-1', happy: 'happy', feed: 'eating',
      somersault: 'somersault', play: 'excited', pose: 'pose', bathing: 'bathing',
      bath: 'bathing', sleep: 'sleeping', wake: 'idle', fish: 'fishing',
      jump: 'jumping', stretch: 'stretching', roar: 'roaring',
      spin: 'spinning', bounce: 'bouncing', wink: 'winking', cheer: 'cheering',
      sneak: 'sneaking', clap: 'clapping', peek: 'peeking', roll: 'rolling',
      balloon: 'holding-balloon', hug: 'hugging'
    };
    phase('validating actions');
    const actions = [];
    for (const action of Object.keys(CLAWD_ACTIONS)) {
      // Acordar precisa do estado sleeping; demais ações esperam o pet livre.
      if (action !== 'wake') {
        await retry(async () => {
          const snapshot = await petSnapshot(page);
          const s = snapshot.engineState;
          return (!s || s === 'idle' || s === 'walking') ? s || 'idle' : null;
        }, 3_500, 50).catch(() => null);
      }
      await sendToActivePet(controlWorker, { action: 'triggerAction', value: action });
      const expected = expectedActionStates[action];
      let observed;
      try {
        observed = await retry(async () => {
          const snapshot = await petSnapshot(page);
          return snapshot.engineState === expected ? snapshot.engineState : null;
        }, 2_000, 25);
      } catch (error) {
        const snapshot = await petSnapshot(page);
        throw new Error(`Ação ${action}: esperado ${expected}, recebido ${snapshot.engineState}. ${error.message}`);
      }
      actions.push({ id: action, state: observed });
    }

    // Interromper uma ação fecha a cena anterior; pescar valida cancelamento e sucesso.
    await retry(() => page.evaluate(`!document.querySelector('.aic-lake')`), 1_000, 40);
    await sendToActivePet(controlWorker, { action: 'updateConfig', key: 'profession', value: 'fisher' });
    await sendToActivePet(controlWorker, { action: 'triggerAction', value: 'fish' });
    await retry(() => page.evaluate(`!!document.querySelector('.aic-lake') && document.querySelector('#aic-clawd-node')?.dataset.state === 'fishing'`), 3_000, 80);
    const fishBeforeCancel = (await sendToActivePet(controlWorker, { action: 'getStatus' })).fishCaught;
    // Cancela a pesca trocando de profissão (sem precisar fisgar)
    await sendToActivePet(controlWorker, { action: 'updateConfig', key: 'profession', value: 'idle' });
    await delay(450);
    // Estado deve estabilizar em idle (timers residuais de XP/ação não podem invadir).
    const cancelledState = await retry(async () => {
      const snapshot = await petSnapshot(page);
      return snapshot.engineState === 'idle' ? snapshot.engineState : null;
    }, 2_500, 50);
    const cancelledStatus = await sendToActivePet(controlWorker, { action: 'getStatus' });
    const cancelledFishing = await page.evaluate(`({
      state: document.querySelector('#aic-clawd-node')?.dataset.state,
      lake: !!document.querySelector('.aic-lake'),
      caught: !!document.querySelector('.aic-fish-caught')
    })`);
    cancelledFishing.fish = cancelledStatus.fishCaught;
    assert.equal(cancelledFishing.fish, fishBeforeCancel, 'Cancelar a pesca ainda concedeu um peixe.');
    assert.equal(cancelledState, 'idle', 'Uma ação antiga invadiu o estado após cancelar a pesca.');
    assert.equal(cancelledFishing.state, 'idle', 'Uma ação antiga invadiu o estado após cancelar a pesca.');
    assert.equal(cancelledFishing.lake, false, 'Cancelar a pesca deixou o lago na página.');
    assert.equal(cancelledFishing.caught, false, 'Cancelar a pesca deixou a captura voando.');

    await sendToActivePet(controlWorker, { action: 'updateConfig', key: 'profession', value: 'fisher' });
    await sendToActivePet(controlWorker, { action: 'triggerAction', value: 'fish' });
    await retry(() => page.evaluate(`!!document.querySelector('.aic-lake') && document.querySelector('#aic-clawd-node')?.dataset.state === 'fishing'`), 3_000, 80);
    const fishBeforeCatch = (await sendToActivePet(controlWorker, { action: 'getStatus' })).fishCaught;
    // Espera o nibble (classe .bite) e clica na janela de reação
    await retry(() => page.evaluate(`!!document.querySelector('.aic-lake.bite')`), 9_000, 80);
    await page.evaluate(`document.querySelector('.aic-lake').click(); true`);
    const successfulFishing = await retry(async () => {
      const status = await sendToActivePet(controlWorker, { action: 'getStatus' });
      const snapshot = await page.evaluate(`({
        state: document.querySelector('#aic-clawd-node')?.dataset.state,
        lake: !!document.querySelector('.aic-lake')
      })`);
      snapshot.fish = status.fishCaught;
      return snapshot.fish === fishBeforeCatch + 1 && snapshot.state === 'idle' && !snapshot.lake ? snapshot : null;
    }, 3_500, 50);

    await sendToActivePet(controlWorker, { action: 'updateConfig', key: 'profession', value: 'idle' });

    // Efeitos cosméticos respeitam o modo desempenho sem sumir com a arte.
    await sendToActivePet(controlWorker, { action: 'updateConfig', key: 'smooth', value: true });
    await sendToActivePet(controlWorker, { action: 'updateConfig', key: 'accessoryHead', value: 'propeller' });
    await sendToActivePet(controlWorker, { action: 'updateConfig', key: 'accessoryFace', value: 'medal' });
    await sendToActivePet(controlWorker, { action: 'updateSetting', key: 'performanceMode', value: true });
    const effectsDisabled = await retry(async () => {
      const snapshot = await accessoryStateSnapshot(page);
      return snapshot.performanceMode && snapshot.headAfterAnimation === 'none' && snapshot.faceAnimation === 'none'
        ? snapshot
        : null;
    }, 2_000, 50);
    await sendToActivePet(controlWorker, { action: 'updateSetting', key: 'performanceMode', value: false });
    const effectsRestored = await retry(async () => {
      const snapshot = await accessoryStateSnapshot(page);
      return !snapshot.performanceMode
        && /clawd-propeller-spin/.test(snapshot.headAfterAnimation || '')
        && /clawd-accessory-sparkle/.test(snapshot.faceAnimation || '')
        ? snapshot
        : null;
    }, 2_000, 50);
    const accessoryPerformance = { disabled: effectsDisabled, restored: effectsRestored };

    await sendToActivePet(controlWorker, { action: 'updateConfig', key: 'smooth', value: true });
    await sendToActivePet(controlWorker, { action: 'updateConfig', key: 'accessoryHead', value: 'cap' });
    await sendToActivePet(controlWorker, { action: 'updateConfig', key: 'accessoryFace', value: 'sunglasses' });
    await sendToActivePet(controlWorker, { action: 'updateConfig', key: 'autoWalk', value: false });
    await sendToActivePet(controlWorker, { action: 'updateConfig', key: 'showSpeech', value: false });

    const statusBeforeAffection = await sendToActivePet(controlWorker, { action: 'getStatus' });
    await clickPet(page);
    let affectionate;
    try {
      affectionate = await retry(async () => {
        const snapshot = await petSnapshot(page);
        return /happy|celebrate/.test(snapshot.state) ? snapshot : null;
      }, 3_000, 100);
    } catch (error) {
      const snapshot = await petSnapshot(page);
      const statusAfterAffection = await sendToActivePet(controlWorker, { action: 'getStatus' });
      const pointerTrace = await page.evaluate(`window.__clawdPointerTrace || []`);
      const stateTrace = await page.evaluate(`window.__clawdStateTrace || []`);
      throw new Error(
        `Clique de carinho não chegou a happy/celebrate: ${JSON.stringify(snapshot)}; `
        + `xp=${statusBeforeAffection.xp}->${statusAfterAffection.xp}; `
        + `happiness=${statusBeforeAffection.stats.happiness}->${statusAfterAffection.stats.happiness}; `
        + `events=${JSON.stringify(pointerTrace)}; states=${JSON.stringify(stateTrace)}. ${error.message}`
      );
    }
    const statusAfterAffection = await sendToActivePet(controlWorker, { action: 'getStatus' });
    assert.match(affectionate.state, /happy|celebrate/);
    assert.equal(statusAfterAffection.xp, statusBeforeAffection.xp + 5, 'O carinho físico não concedeu +5 XP.');
    const mouthVisual = await visualSnapshot(page);
    assert.equal(mouthVisual.mouthDisplay, 'none', 'Silhueta Claude: boca deve permanecer oculta.');

    await sendToActivePet(controlWorker, { action: 'updateConfig', key: 'showMouth', value: false });
    const hiddenMouth = await retry(async () => {
      const snapshot = await visualSnapshot(page);
      return snapshot.mouthDisplay === 'none' ? snapshot : null;
    }, 3_000, 80);
    assert.equal(hiddenMouth.mouthDisplay, 'none', 'Desativar a boca deve ocultar a camada.');

    await sendToActivePet(controlWorker, { action: 'updateConfig', key: 'showMouth', value: true });
    await delay(120);
    const restoredMouth = await visualSnapshot(page);
    assert.equal(restoredMouth.mouthDisplay, 'none', 'Mesmo com toggle, a silhueta Claude não desenha boca.');

    await sendToActivePet(controlWorker, { action: 'updateConfig', key: 'smooth', value: false });
    await retry(async () => !(await visualSnapshot(page)).smoothClass, 2_000, 50);
    const headwearMotion = await page.evaluate(`(() => {
      const pet = document.querySelector('#aic-clawd-node');
      const headwear = pet?.querySelector('.acc-head');
      const body = pet?.querySelector('.pixel-sprite');
      const legs = pet?.querySelector('.pixel-legs');
      pet?.classList.remove('walking', 'running');
      pet?.classList.add('walking');
      const moving = headwear ? getComputedStyle(headwear).animationName : null;
      const movingBody = body ? getComputedStyle(body).animationName : null;
      const movingLegs = legs ? getComputedStyle(legs).animationName : null;
      pet?.classList.remove('walking', 'running');
      const idle = headwear ? getComputedStyle(headwear).animationName : null;
      const idleLegs = legs ? getComputedStyle(legs).animationName : null;
      return { moving, idle, movingBody, movingLegs, idleLegs };
    })()`);
    assert.match(headwearMotion.moving || '', /clawd-headwear-step/, 'O chapéu deve acompanhar o passo do pet.');
    assert.equal(headwearMotion.idle, 'none', 'O chapéu deve permanecer assentado quando o pet está parado.');
    assert.equal(headwearMotion.movingBody, 'none', 'A caminhada não pode trocar ou deformar a silhueta do corpo.');
    assert.equal(headwearMotion.movingLegs, 'clawd-pixel-leg-cycle', 'Somente a camada das pernas deve entrar no walk cycle.');
    assert.equal(headwearMotion.idleLegs, 'none', 'As pernas devem parar imediatamente ao fim do deslocamento.');

    let screenshot = null;
    let accessoryScreenshot = null;
    let pixelScreenshot = null;
    if (process.env.CLAWD_SCREENSHOT) {
      screenshot = await capturePetScreenshot(page, process.env.CLAWD_SCREENSHOT);
    }
    if (process.env.CLAWD_ACCESSORY_SCREENSHOT) {
      accessoryScreenshot = await capturePetScreenshot(page, process.env.CLAWD_ACCESSORY_SCREENSHOT, {
        head: 'cap',
        face: 'sunglasses'
      });
    }
    if (process.env.CLAWD_PIXEL_SCREENSHOT) {
      pixelScreenshot = await capturePetScreenshot(page, process.env.CLAWD_PIXEL_SCREENSHOT, {
        smooth: false,
        model: 'claws',
        faceStyle: 'sparkle',
        eyeColor: '#33aaff'
      });
    }

    controlWorker.close();
    controlWorker = null;

    phase('validating reloads');
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
      models: { pixel: Object.keys(pixelModels), smooth: smoothModels },
      faceStyles,
      mouth: mouthVisual,
      mouthToggle: { hidden: hiddenMouth.mouthDisplay, restored: restoredMouth.mouthDisplay },
      headwearMotion,
      accessories: { smooth: smoothAccessories.length, pixel: pixelAccessories.length },
      professionGear,
      accessoryPerformance,
      professions: professions.length,
      actions: actions.length,
      actionStates: actions,
      fishing: { cancelled: cancelledFishing, successful: successfulFishing },
      popup: popupRuntime,
      subpet: subpetRuntime,
      screenshot,
      accessoryScreenshot,
      pixelScreenshot,
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
