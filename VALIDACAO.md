# Relatório de Validação — Claw'd v3.1

**Data:** 14 de julho de 2026
**Ambiente:** Windows · Node.js 24 · Edge/Chromium com perfil isolado

## Resultado

- Verificações de sintaxe: **8/8 aprovadas** (fontes, testes, showcase e smoke harness);
- Suíte `node:test`: **30/30 testes aprovados**;
- `git diff --check`: **sem erros de whitespace**;
- Smoke test em navegador Chromium real: **aprovado**;
- Reload MV3 em página `file://`, três ciclos consecutivos: **0 erros e 1 pet por ciclo**;
- Popup, service worker e subpet em runtime real: **aprovados**;
- Catálogo exercitado em runtime: **14/14 acessórios em cada modo, 8/8 profissões, 14/14 ações principais e 6/6 ações do subpet**.

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
git diff --check
```

## Cobertura automatizada

A suíte verifica estado padrão e migração, missões diárias, curva de nível, catálogo/CSS de acessórios nos dois renderizadores, descrições e arte dos 7 chapéus, sprite base, pernas estáticas, movimento por `requestAnimationFrame`, modo liso angular, preferência persistente da boca, emoções, pesca, sincronização e inicialização de subpets, ciclo de vida, cor independente dos olhos, seis interações, manifest, referências e IDs do popup, documentação interativa local, namespace dos keyframes, ano/versão, contexto MV3 invalidado e reconciliação após reload.

## Smoke test no navegador

Uma instância unpacked foi carregada em perfil isolado e inspecionada pelo Chrome DevTools Protocol:

| Cenário | Evidência observada |
|---------|---------------------|
| Boot da página | `#aic-clawd-node`: 1 instância |
| Repouso | `animation-name: none` na sprite |
| Boca e carinho | estado `happy`; fundo da boca transparente; sorriso em borda curva de 2px |
| Boca opcional | popup persistiu `showMouth`; runtime alternou `display: block → none → block` |
| Modo liso | pixel oculto, `box-shadow: none`, silhueta contínua visível e `background-image: none` |
| Acessórios | 14 variantes lisas e 14 pixel-art pintadas; chapéu usa `clawd-headwear-step` em movimento e `none` parado |
| Profissões e ações | 8 profissões aplicadas e 14 ações disparadas; Pescador criou lago interativo |
| Popup real | 8 abas, 8 profissões, 14 ações, 16 opções cosméticas, 8 subpets, 6 ações do subpet, seletor de olhos, 10 itens e 12 conquistas; nenhum ID duplicado |
| Subpet real | 1 instância “Rex”, corpo `#4a90e2`, olhos `#33ff99`, 6/6 interações (`cuddle`, `play`, `explore`, `spin`, `celebrate`, `special`) e remoção limpa |
| Reload da extensão | 3 ciclos consecutivos, sempre 1 instância, sem `Extension context invalidated` |
| Console/runtime | 0 exceções, 0 erros e 0 contextos MV3 inválidos |

## Popup e service worker

- Manifest/runtime: `3.1.0`;
- Marcador `clawdRuntimeReconciled`, healthcheck duplo com DOM conectado, fallback para aba elegível recente e até três tentativas de injeção: ativos;
- Popup: catálogo completo renderizado e inspecionado em uma aba `chrome-extension://` real, sem exceções;
- Subpets: migração preserva desbloqueios/apelidos/cores, `eyeColors` é independente, timers de ação são descartados e `data-state` permite diagnóstico sem romper o mundo isolado;
- CSS da extensão: nó raiz isolado e todos os keyframes prefixados com `clawd-`, inclusive na página de reprodução que define `.pixel-sprite`, `.name-tag` e `@keyframes walk` próprios.

## Documentação interativa

`docs/index.html` não usa CDN, servidor ou build. Um contrato automatizado valida seções, IDs consumidos pelo JavaScript, referências locais, integração com `CLAWD_ACCESSORIES`/`CLAWD_SUBPET_ACTIONS`, personalização dos olhos e breakpoints/redução de movimento. A abertura visual pela superfície interna do Codex não foi executada porque essa superfície bloqueia URLs `file://`; isso não afeta a extensão nem o arquivo, que pode ser aberto diretamente pelo usuário no navegador.

## Limite do teste

Páginas internas protegidas (`chrome://`, loja de extensões e alguns visualizadores) não aceitam content scripts. O smoke test padrão gera uma página `file://` temporária; também foi executado diretamente em `Novo Documento de Texto.html`, a página local que originou o erro reportado. Gestos físicos de touch e viagem cross-tab entre janelas continuam como validação manual complementar, pois dependem de entrada/disposição reais do usuário.
