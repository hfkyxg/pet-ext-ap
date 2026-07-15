# Relatório de Validação — Claw'd v3.2

**Data:** 15 de julho de 2026  
**Ambiente:** Windows · Node.js 24 · Edge/Chromium com perfil isolado  
**Marco:** hardening de segurança + performance + docs alinhados aos números reais

## Resultado

- Verificações de sintaxe: **8/8 aprovadas** (fontes, testes, showcase e smoke harness);
- Suíte `node:test`: **61/61 testes aprovados** (catálogo, extensão/documentação e integridade/harmonia cruzada — incluindo allowlist de mensagens, bfcache/`lastError`, AudioContext pós-gesto, sites bloqueados sem substring e anti-poluição de protótipo);
- Smoke test em navegador Chromium real: **aprovado** (`runtimeErrors: 0`, `invalidContextErrors: 0`);
- Reload MV3 em página `file://`, três ciclos consecutivos: **0 erros e 1 pet por ciclo**;
- Popup, service worker e subpet em runtime real: **aprovados**;
- Catálogo exercitado em runtime: **4/4 modelos**, **4/4 rostos**, **14/14 acessórios**, **8/8 profissões**, **24 ações principais** no catálogo e **7/7 ações do subpet**.

## Comandos reproduzíveis

```powershell
node --check src/shared/catalog.js
node --check src/content/content.js
node --check src/popup/popup.js
node --check src/background/background.js
node --check docs/showcase.js
node --check tests/catalog.test.js
node --check tests/extension.test.js
node --check tests/runtime-smoke.mjs
node --test tests/*.test.js
node tests/runtime-smoke.mjs
```

## Cobertura automatizada

A suíte verifica estado padrão, schema v4 e migração (missões sem label XSS, inventário/counters/streak numéricos, merge sem `__proto__`), curva de nível, 4 modelos × 4 rostos, olhos independentes, catálogo/CSS de acessórios, chapéus sem recorte, trajes profissionais temporários, corpo estático, pernas só em movimento, `requestAnimationFrame`, modo liso, boca opcional, emoções, pesca, sub-pets, documentação interativa, popup/manifest, contexto MV3 invalidado, reconciliação após reload, **porta cross-tab/bfcache**, **AudioContext só após gesto**, **`clawdValidateRuntimeMessage`**, **`clawdHostIsBlocked`** (host exato ou subdomínio) e limpeza DOM unificada (`CLAWD_DOM_CLEANUP_SELECTORS`).

## Smoke test no navegador

| Cenário | Evidência observada |
|---------|---------------------|
| Boot da página | `#aic-clawd-node`: 1 instância |
| Subpet | 1 instância com interações do catálogo e remoção limpa |
| Reload da extensão | 3 ciclos consecutivos, sempre 1 instância, sem `Extension context invalidated` |
| Console/runtime | 0 exceções, 0 erros de runtime e 0 contextos MV3 inválidos |

## Segurança e performance (marco 15/07/2026)

| Tema | Garantia |
|------|----------|
| Mensagens | Allowlist de ações + sanitização de config/settings |
| Storage/import | Migração reconstrói missão diária, clamp de números, sem chave `__proto__` |
| DOM | Toast, tutor, streak e missão diária usam `textContent` / nós criados |
| CSS vars | Cores só em hex `#RRGGBB` |
| Sites bloqueados | Match exato ou subdomínio — nunca substring |
| Áudio | Sem `AudioContext` até `pointerdown`/`keydown`/`touchstart` |
| Porta / bfcache | `pagehide` capture + scrub de `lastError` no disconnect/`postMessage` |
| FX | Teto ~28 partículas; loops e RAF ociosos com `document.hidden` |
| Heartbeat | 2,5 s (antes 500 ms), pausável em aba oculta |

## Limite do teste

Páginas internas protegidas (`chrome://`, loja de extensões) não aceitam content scripts. Gestos físicos de touch e viagem cross-tab entre janelas reais continuam como validação manual complementar.
