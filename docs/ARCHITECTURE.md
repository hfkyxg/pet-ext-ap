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
- **Migration script** — `clawdMigrateState` normaliza saves antigos antes do runtime (suporta v1/v2/v4 → v5 incrementalmente).

## Gamificação 2.0 (v3.3)

### Sistema de Combo
`ClawdCompanion._tickCombo()` — chamado em `_handleAction()`. Rastreia `_comboCount` e `_comboTimer` (janela de 10s). Combo ≥ 3 exibe balão, ≥ 5 multiplica XP. Limpo em `destroy()`.

### Desafio Semanal
`background.js` cria `chrome.alarms.create('clawdWeeklyReset', { periodInMinutes: 10080 })` e faz broadcast `{ type: 'weeklyReset' }` para todas as abas via `chrome.tabs.query`. O content script seleciona o desafio da semana com `clawdWeeklyChallengeForWeek(clawdISOWeek())` — hash determinístico, sem sortear ao acaso.

### Slot de Corpo (3 slots)
`clawdEffectiveAccessories()` retorna três slots: `head/userHead/headSource`, `face/userFace/faceSource`, **`body/userBody/bodySource`**. CSS usa `[data-acc-body="wings"]` etc. Profissões podem sobrepor qualquer slot; acessórios pessoais voltam ao desvestir.

### Schema v5
`CLAWD_SCHEMA_VERSION = 5`. Bloco de migração em `clawdMigrateState()`:
```js
if (v < 5) {
  s.personality = { playful: 5, lazy: 3, curious: 7, social: 5, foodie: 4 };
  s.accessories.body = null;
  s.weekly = { questIndex: 0, progress: 0, claimed: false, weekKey: '' };
  s.customSpeech = []; s.particleColor = null;
  s.soundVolumeActions = 1; s.soundVolumeAmbient = 0.6;
  s.counters.streakDays = s.game?.streak?.days || 0;
}
```

### Detecção de Contexto (11 categorias)
`_detectPageContext()` em `content.js` mapeia hostname para categoria: coding, music, video, shopping, social, news, email, gaming, health, learning. Categoria `idle` é o padrão. Afeta mensagens, XP bônus e reações do pet.

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
