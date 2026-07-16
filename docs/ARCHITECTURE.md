# Arquitetura — Claw'd

Extensão Chrome MV3 **vanilla** (sem bundler, sem `package.json`). Este documento descreve as camadas e os padrões **já presentes** no código — sem forçar reescrita OOP.

## Camadas

| Camada | Onde | Papel |
|--------|------|--------|
| **Catálogo (SSOT)** | `src/shared/catalog.js` | Fonte única de verdade: modelos, rostos, acessórios, profissões, sub-pets, loja, conquistas, migrações e helpers de estado. Carrega **antes** de `content.js` (lista no `manifest.json`). |
| **Runtime** | `src/content/content.js` + `style.css` | Motor do mascote na página: DOM, animação (`rAF`), interações, stats, áudio. |
| **Presença** | `src/background/background.js` | Service worker: bootstrap de storage, reinjeção segura, healthcheck cross-tab. |
| **UI** | `src/popup/*` | Controles e preview; fala com a aba via mensagens tipadas. |
| **Assets** | `src/assets/`, `src/shared/sprites/` | Ícones, banners SVG, PNGs de sub-pets (`web_accessible_resources`). |
| **Docs / Labs** | `docs/` | Vitrine HTML, arquitetura e markdown de produto em `docs/md/`. |
| **Testes** | `tests/*.test.js`, `runtime-smoke.mjs` | Contratos e smoke; geradores one-off em `tests/tools/`. |

```
manifest.json
    │
    ├─ background ──► presença / reinjeção
    ├─ popup ───────► UI ──messaging──► content
    └─ content_scripts (ordem fixa):
           1. catalog.js   ← SSOT
           2. content.js   ← runtime (usa globals do catálogo)
```

## Padrões presentes (nomeados, não inventados)

- **Singleton (companion)** — uma instância `ClawdCompanion` por página; `destroy()` limpa DOM/timers e evita APIs MV3 inválidas após reload.
- **Facade (messaging)** — popup/background não mexem no DOM do pet; enviam ações allowlisted (`chrome.tabs.sendMessage` / `runtime.onMessage`) que o companion interpreta.
- **Strategy (profissões)** — `CLAWD_PROFESSIONS` + `clawdEffectiveAccessories()` escolhem gear/comportamento por contexto sem `if` espalhado de uniforme.
- **SSOT / Shared Kernel** — catálogo compartilhado entre content, popup, docs e testes (`require` / script clássico, não ES modules na injeção).
- **Migration script** — `clawdMigrateState` normaliza saves antigos antes do runtime.

Não há camada de “services” ou DI: o tamanho e o modelo MV3 (scripts clássicos na ordem do manifest) tornam um refactor modular pesado **pior** até existir um plano de carga explícito.

## Contratos que não podem quebrar

1. Paths do `manifest.json` (background, popup, icons, `web_accessible_resources`).
2. Ordem `catalog.js` → `content.js` na injeção e no `scripting.executeScript` do background.
3. Relativos dos testes (`require('../src/shared/catalog.js')`) e da docs (`../src/shared/...`).
4. Zero build step — clonar e carregar a pasta em `chrome://extensions`.

## Onde gerar artefatos

| Tarefa | Comando |
|--------|---------|
| PNGs canônicos dos sub-pets | `node tests/tools/_crop-literal-sprites.mjs` |
| Frames/preview (não sobrescreve pacote) | `node tests/tools/_make-sprites.mjs` |
| Ícones da extensão | `node tests/tools/_make-icons.mjs` |
| Suíte de contratos | `node --test tests/*.test.js` |

Detalhes de uso: [README da pasta tools](../tests/tools/README.md) · índice de docs: [docs/README.md](./README.md).
