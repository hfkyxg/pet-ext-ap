# Relatório de Validação — Claw'd v3.1

**Data:** 14 de julho de 2026
**Ambiente:** Windows · Node.js 24 · Edge/Chromium com perfil isolado

## Resultado

- Verificações de sintaxe: **5/5 aprovadas** (incluindo o smoke harness);
- Suíte `node:test`: **28/28 testes aprovados**;
- `git diff --check`: **sem erros de whitespace**;
- Smoke test em navegador Chromium real: **aprovado**;
- Reload MV3 em página `file://`, três ciclos consecutivos: **0 erros e 1 pet por ciclo**;
- Popup, service worker e sub-pet em runtime real: **aprovados**;
- Catálogo exercitado em runtime: **14/14 acessórios em cada modo, 8/8 profissões e 14/14 ações**.

## Comandos reproduzíveis

```powershell
node --check src/shared/catalog.js
node --check src/content/content.js
node --check src/popup/popup.js
node --check src/background/background.js
node --check tests/runtime-smoke.mjs
node --test tests/*.test.js
node tests/runtime-smoke.mjs
git diff --check
```

## Cobertura automatizada

A suíte verifica estado padrão e migração, missões diárias, curva de nível, catálogo/CSS de acessórios nos dois renderizadores, descrições e arte dos 7 chapéus, sprite base, pernas estáticas, movimento por `requestAnimationFrame`, modo liso angular, preferência persistente da boca, emoções, pesca, sincronização e inicialização de sub-pets, ciclo de vida, manifest, referências e IDs do popup, namespace dos keyframes, ano/versão da documentação, contexto MV3 invalidado e reconciliação após reload.

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
| Popup real | 8 abas, 8 profissões, 14 ações, 16 opções cosméticas, 8 sub-pets, 10 itens e 12 conquistas; nenhum ID duplicado |
| Sub-pet real | 1 instância “Rex”, cor `#4a90e2`, interação `cuddling` e remoção limpa |
| Reload da extensão | 3 ciclos consecutivos, sempre 1 instância, sem `Extension context invalidated` |
| Console/runtime | 0 exceções, 0 erros e 0 contextos MV3 inválidos |

## Popup e service worker

- Manifest/runtime: `3.1.0`;
- Marcador `clawdRuntimeReconciled`, healthcheck duplo com DOM conectado, fallback para aba elegível recente e até três tentativas de injeção: ativos;
- Popup: catálogo completo renderizado e inspecionado em uma aba `chrome-extension://` real, sem exceções;
- Sub-pets: corrigida a corrida de storage que podia perder desbloqueios/apelidos/cores e o acesso prematuro ao sprite durante a construção;
- CSS da extensão: nó raiz isolado e todos os keyframes prefixados com `clawd-`, inclusive na página de reprodução que define `.pixel-sprite`, `.name-tag` e `@keyframes walk` próprios.

## Limite do teste

Páginas internas protegidas (`chrome://`, loja de extensões e alguns visualizadores) não aceitam content scripts. O smoke test padrão gera uma página `file://` temporária; também foi executado diretamente em `Novo Documento de Texto.html`, a página local que originou o erro reportado. Gestos físicos de touch e viagem cross-tab entre janelas continuam como validação manual complementar, pois dependem de entrada/disposição reais do usuário.
