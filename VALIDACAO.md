# Relatório de Validação — Claw'd v3.1

**Data:** 14 de julho de 2026
**Ambiente:** Windows · Node.js 24 · Edge/Chromium com perfil isolado

## Resultado

- Verificações de sintaxe: **4/4 aprovadas**;
- Suíte `node:test`: **19/19 testes aprovados**;
- `git diff --check`: **sem erros de whitespace**;
- Smoke test em navegador Chromium real: **aprovado**;
- Popup e service worker em runtime real: **aprovados**.

## Comandos reproduzíveis

```powershell
node --check src/shared/catalog.js
node --check src/content/content.js
node --check src/popup/popup.js
node --check src/background/background.js
node --test tests/*.test.js
git diff --check
```

## Cobertura automatizada

A suíte verifica estado padrão e migração, missões diárias, curva de nível, catálogo/CSS de acessórios, sprite base, pernas estáticas, movimento por `requestAnimationFrame`, modo liso, emoções, pesca, sub-pets, ciclo de vida, manifest, referências e IDs do popup, ano/versão da documentação e reconciliação após reload.

## Smoke test no navegador

Uma instância unpacked foi carregada em perfil isolado e inspecionada pelo Chrome DevTools Protocol:

| Cenário | Evidência observada |
|---------|---------------------|
| Boot da página | `#aic-clawd-node`: 1 instância |
| Repouso | `animation-name: none` na sprite |
| Arraste | classe `walking` e `animation-name: walk` |
| Carinho | estado `happy` e balão de emoji visível |
| Modo liso | vermelho nítido, `box-shadow` preservado e fundos `transparent`/`none` no nó, corpo, stack e sprite |
| Reload da página | 1 instância após novo carregamento |
| Emoções | `emotion-face` e `emotion-badge` presentes |

## Popup e service worker

- Manifest/runtime: `3.1.0`;
- Marcador `clawdRuntimeReconciled`: ativo;
- Popup: 8 abas, 8 profissões, 14 ações, 8 sub-pets, 16 cards de acessórios (14 itens + opção “nenhum” por slot), 10 itens de loja, 12 conquistas e missão diária renderizada.

## Limite do teste

Páginas internas protegidas (`chrome://`, loja de extensões e alguns visualizadores) não aceitam content scripts. O smoke test usa uma página HTTPS normal, que representa o ambiente suportado pela extensão.
