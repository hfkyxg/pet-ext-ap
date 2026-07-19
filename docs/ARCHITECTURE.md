# Arquitetura — Claw'd

Extensão Chrome MV3 **vanilla** (sem bundler). Há um `package.json` só para scripts de **dev** (`check` / `test` / `ecosystem` / `smoke` / eslint) — o runtime da extensão não depende dele.

## Camadas

| Camada | Onde | Papel |
|--------|------|--------|
| **Catálogo (SSOT)** | `src/shared/catalog.js` | Fonte única de verdade: modelos, rostos, acessórios, profissões, sub-pets, loja, conquistas, migrações e helpers de estado. Carrega **antes** de `content.js` (lista no `manifest.json`). |
| **Runtime** | `src/content/content.js` + `style.css` | Motor do mascote na página: DOM, animação (`rAF`), interações, stats, áudio. |
| **Presença** | `src/background/background.js` | Service worker: bootstrap de storage, reinjeção segura, healthcheck cross-tab. |
| **UI** | `src/popup/*` | Controles, preview, studio in-page / janela destacável; messaging tipado. |
| **Assets** | `src/assets/`, `src/shared/sprites/` | Ícones, banners SVG, PNGs de sub-pets (`web_accessible_resources`). |
| **Docs / Labs** | `docs/` | Vitrine HTML, arquitetura e markdown de produto em `docs/md/`. |
| **Testes** | `tests/*.test.js` (**156**), `runtime-smoke.mjs`, `tools/validate-ecosystem.mjs` | Contratos, ecosystem estático e smoke Edge. |

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

SSOT em `CLAWD_PAGE_CONTEXTS` + `clawdPageContextFromHost()` no catálogo. O runtime chama `_detectGeneralPageContext()` e reage via `CLAWD_CONTEXT_REACTIONS` (traço mínimo por categoria). Host sem match → **`idle`** (não gruda no contexto anterior). Categorias: coding, music, video, shopping, social, news, email, gaming, health, learning, idle.

### Desafio Semanal (pool expandido)

`CLAWD_WEEKLY_CHALLENGES` tem **12** desafios (hash ISO week). Progresso via `clawdRegisterWeeklyProgress` nos mesmos `type`s das quests diárias (`pets`, `fish`, `balloons`, `keepy`, …).

Não há camada de “services” ou DI: o tamanho e o modelo MV3 (scripts clássicos na ordem do manifest) tornam um refactor modular pesado **pior** até existir um plano de carga explícito.

## Escalabilidade (vanilla MV3 — o que fazer / o que não fazer)

### Não fatiar `content.js` em ES modules sem plano de injeção

O runtime é um IIFE clássico injetado por `content_scripts` + `scripting.executeScript({ files: [...] })`. Em MV3 **não** há bundler: `import`/`export` no content script exigiria:

1. `type: "module"` no manifest (quebra a ordem atual `catalog.js` → `content.js` e o reinject do background), **ou**
2. um build step (fora do contrato “clonar e carregar a pasta”).

Até existir um plano explícito (lista de arquivos, ordem de carga, smoke de reinjeção e fallback offline), preferir:

- extrair **só** dados/helpers para `src/shared/catalog.js` (já SSOT);
- documentar fronteiras aqui;
- ganhos leves no monólito (timers, debounce, caps de FX).

### Timers e vazamentos

| Mecanismo | Padrão |
|-----------|--------|
| Intervalos de comportamento | `this._timers[]` — `clearInterval` + esvaziar em `destroy()` |
| Timeouts nomeados | lista explícita em `destroy()` (`_saveTimer`, `_idleVarTimer`, `_scrollIdleTimer`, combo, etc.) |
| Sub-pet | `SubPet._later` → `Set` `_actionTimers`, limpo no `destroy()` do sub-pet |
| Partículas | `_trackParticle` registra em `_particleTimers`; cap `_canSpawnFx` ≤ **18** |
| Listeners DOM | `AbortController` (`this._abort`) + remoção manual de scroll/visibility v3.4 |

Reinjeção: boot token + `window.__clawd.destroy()` antes de nova instância.

### Persistência / cross-tab

- `save()` faz **debounce 350 ms** e **coalesce** se um flush `get→set` ainda está em voo (`_saveInFlight` / `_saveDirty`).
- Flush faz read-modify-write (popup dono de favorites/settings/subpets/inventory).
- Skip de `chrome.storage.local.set` quando o estado serializado **não mudou** após o merge — reduz ruído `onChanged` entre abas.
- Presença cross-tab é via Port (`clawd-presence`), não via re-save em loop.

### Caps já em produção

- FX / partículas: teto **18** ativos (`_canSpawnFx`).
- Modo performance (`settings.performanceMode` / `.aic-nofx`) corta FX e idle decorativo.

## Contratos que não podem quebrar

1. Paths do `manifest.json` (background, popup, icons, `web_accessible_resources`).
2. Ordem `catalog.js` → `content.js` na injeção e no `scripting.executeScript` do background.
3. Relativos dos testes (`require('../src/shared/catalog.js')`) e da docs (`../src/shared/...`).
4. Zero build step — clonar e carregar a pasta em `chrome://extensions`.

## Onde gerar artefatos

| Tarefa | Comando |
|--------|---------|
| PNGs canônicos dos sub-pets | `node tests/tools/crop-literal-sprites.mjs` |
| Frames/preview (não sobrescreve pacote) | `node tests/tools/make-sprites.mjs` |
| Ícones da extensão | `node tests/tools/make-icons.mjs` |
| Suíte de contratos | `npm test` (**156**) |
| Ecosystem estático | `npm run ecosystem` |
| Smoke Edge | `npm run smoke` |

Detalhes de uso: [README da pasta tools](../tests/tools/README.md) · índice de docs: [docs/README.md](./README.md).

## Fase seguinte — padrões e produto (pós-validação)

O núcleo (animações, ações, sub-pets, schema v5, suíte de contratos) está **sólido**. Prioridade passa a ser aprofundar, não reescrever:

| Eixo | Padrão / direção | Próximos ganhos |
|------|------------------|-----------------|
| **SSOT** | Dados e regras no `catalog.js`; runtime só orquestra | Novos desafios/quests/reações só no catálogo |
| **Gamificação** | Daily + weekly + combo + achievements | Temporadas, streak visual, recompensas cosméticas |
| **Personalização** | `personality` + `customSpeech` + favoritos | Traços → quests/XP; presets de personalidade |
| **Integração** | Hostname → contexto → reação | Mais hosts; opcional “site packs” sem permissões extras |
| **Segurança** | Allowlist de mensagens + sanitize storage | Manter zero `eval`; revisar WAR ao adicionar assets |
| **Performance** | Caps FX, pause hidden, save coalesce, reduced-motion | Budgets de rAF; ambient acessório leve |
| **Presença** | `.pixel-legs` + `.pixel-fx` + name-tag título/nome | Mais poses por ação; sync popup/live |
| **Escalabilidade** | Monólito content + SSOT compartilhado | Só modularizar com plano de injeção MV3 |
| **UX** | Onboarding + contagens alinhadas ao catálogo | Tours curtos por feature (profissão, sub-pet) |
