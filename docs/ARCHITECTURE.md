# Arquitetura — Claw'd

Extensão Chrome MV3 **vanilla** (sem bundler). Há um `package.json` só para scripts de **dev** (`check` / `test` / `ecosystem` / `smoke` / eslint) — o runtime da extensão não depende dele.

## Camadas

| Camada | Onde | Papel |
|--------|------|--------|
| **Catálogo (SSOT)** | `src/shared/catalog.js` | Fonte única de verdade: modelos, rostos, acessórios, profissões, sub-pets, loja, conquistas, migrações e helpers de estado. Carrega **depois** de `i18n.js` e **antes** de `content.js` (lista no `manifest.json`). |
| **Runtime** | `src/content/content.js` + `style.css` | Motor do mascote na página: DOM, animação (`rAF`), interações, stats, áudio. Subpet: follow com `dt` + `IntersectionObserver` off-screen. Falas: layout geométrico com quatro candidatos, clamp e colisões. |
| **Presença** | `src/background/background.js` | Service worker: bootstrap de storage, reinjeção segura, healthcheck cross-tab. |
| **UI** | `src/popup/*` + `src/shared/i18n.js` + `i18n-entities.js` | Controles, preview, studio; chrome i18n (11 locales); entidades dinâmicas; onboarding idioma/canto; `content/style.css` injetado pós-parse (boot MV3); messaging tipado. |
| **Assets** | `src/assets/`, `src/shared/sprites/` | Ícones, banners SVG, PNGs de sub-pets (`web_accessible_resources`). |
| **Docs / Labs** | `docs/` | Vitrine HTML, arquitetura e markdown de produto em `docs/md/`. |
| **Testes** | `tests/*.test.js` (**240**), `runtime-smoke.mjs`, `tools/validate-ecosystem.mjs`, `tools/audit-pack.mjs` | Contratos, movimento/interação, ecosystem estático, audit e smoke Edge (inclui fala desktop e 375 px). |

```
manifest.json
    │
    ├─ background ──► presença / reinjeção
    ├─ popup ───────► UI ──messaging──► content
    └─ content_scripts (ordem fixa):
           1. i18n.js      ← locales / speech
           2. catalog.js   ← SSOT
           3. content.js   ← runtime (usa globals do catálogo)
```

## Padrões presentes (nomeados, não inventados)

- **Singleton (companion)** — uma instância `ClawdCompanion` por página; `destroy()` limpa DOM/timers e evita APIs MV3 inválidas após reload.
- **Facade (messaging)** — popup/background não mexem no DOM do pet; enviam ações allowlisted (`chrome.tabs.sendMessage` / `runtime.onMessage`) que o companion interpreta.
- **Strategy (profissões)** — `CLAWD_PROFESSIONS` + `clawdEffectiveAccessories()` escolhem gear/comportamento por contexto sem `if` espalhado de uniforme.
- **SSOT / Shared Kernel** — catálogo compartilhado entre content, popup, docs e testes (`require` / script clássico, não ES modules na injeção).
- **Migration script** — `clawdMigrateState` normaliza saves antigos antes do runtime (suporta v1/v2/v4/v5 → v6 incrementalmente).

## Gamificação 2.0 (v3.3)

### Sistema de Combo
`ClawdCompanion._tickCombo()` — chamado em `_handleAction()`. Rastreia `_comboCount` e `_comboTimer` (janela de 10s). Combo ≥ 3 exibe balão, ≥ 5 multiplica XP. Limpo em `destroy()`.

### Desafio Semanal
`background.js` cria `chrome.alarms.create('clawdWeeklyReset', { periodInMinutes: 10080 })` e faz broadcast `{ type: 'weeklyReset' }` para todas as abas via `chrome.tabs.query`. O content script seleciona o desafio da semana com `clawdWeeklyChallengeForWeek(clawdISOWeek())` — hash determinístico, sem sortear ao acaso.

### Slot de Corpo (3 slots)
`clawdEffectiveAccessories()` retorna três slots: `head/userHead/headSource`, `face/userFace/faceSource`, **`body/userBody/bodySource`**. CSS usa `[data-acc-body="wings"]` etc. Profissões podem sobrepor qualquer slot; acessórios pessoais voltam ao desvestir.

### Schema v6
`CLAWD_SCHEMA_VERSION = 6`. A migração é aditiva: preserva personalização/gamificação do v5 e acrescenta foco, bem-estar, tempo de tela e regras por site.

```js
if (v < 6) {
  // defaults de focus/wellbeing/screenTime já vieram do merge seguro
  // aqui blockedSites legado é convertido em siteRules(level: 'block')
}
```

Sanitizers dedicados (`clawdSanitizeFocusBlock`, `clawdSanitizeWellbeingBlock`, `clawdSanitizeSiteRules`) impedem fases, durações, humor ou hosts inválidos.

### Sistema de movimento

O contrato completo está em [MOTION.md](./MOTION.md). Em resumo: rAF + `dt` para deslocamento; `CLAWD_TIMINGS` para relógios/fallbacks e a janela `AUTONOMY_GRACE_MS`; tokens CSS equivalentes entre runtime, popup e showcase; nenhuma transição genérica; halo de foco em camada própria; movimento reduzido e foco de teclado como requisitos.

### Layout de fala e camada de interação

`_scheduleSpeechLayout()` mede o balão principal em `requestAnimationFrame`, depois que o conteúdo já tem tamanho natural. `_layoutSpeechBubble()` pontua candidatos `above|left|right|below` por overflow e interseção com sprite, etiqueta, badge, subpet e a segunda fala. `SubPet._layoutBubble()` repete o contrato na perspectiva do companheiro. As posições finais usam `left/top` relativos às raízes móveis, então acompanham o deslocamento sem herdar a perspectiva do personagem.

O wrapper `.pet-look-layer` recebe o efeito 3D; fala, badge, bola e hitbox ficam fora dele. O nó principal e o subpet têm semântica de botão, foco visível e atalhos equivalentes. Mouse/touch distinguem clique, duplo clique, long press e arraste; `destroy()` cancela os novos rAF/timers.

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
| Sub-pet | `SubPet._later` → `Set` `_actionTimers`, limpo no `destroy()`; rAF com `dt`; `IntersectionObserver` pausa off-screen |
| Partículas | `_trackParticle` registra em `_particleTimers`; cap `_canSpawnFx` ≤ **18** |
| Saída de overlays | `_removeAfterMotion` espera `transitionend`/`transitioncancel`; fallback em `_motionExitTimers`, limpo no teardown |
| Listeners DOM | `AbortController` (`this._abort`) + remoção manual de scroll/visibility v3.4 |

Reinjeção: boot token + `window.__clawd.destroy()` antes de nova instância.

### Persistência / cross-tab

- `save()` faz **debounce 350 ms** e **coalesce** se um flush `get→set` ainda está em voo (`_saveInFlight` / `_saveDirty`).
- Flush faz read-modify-write (popup dono de favorites/settings/subpets/inventory).
- Skip de `chrome.storage.local.set` quando o estado serializado **não mudou** após o merge — reduz ruído `onChanged` entre abas.
- `onChanged` no content **não regride** XP/coins/counters (`Math.max`); popup `persist` idem.
- Presença cross-tab é via Port (`clawd-presence`), não via re-save em loop.
- **Um host por navegador:** `_isActiveHost()` / `_crossTabHidden` silenciam beep, fala, partículas e loops nas abas não-anfitriãs; `despawnPet` usa `_despawnTimer` + `_travelGen` (cancelável em `spawnPet`/`hidePet`).

### Caps já em produção

- FX / partículas: teto **18** ativos (`_canSpawnFx`).
- Modo performance (`settings.performanceMode` / `.aic-nofx`) corta FX e idle decorativo.

## Contratos que não podem quebrar

1. Paths do `manifest.json` (background, popup, icons, `web_accessible_resources`).
2. Ordem `i18n.js` → `catalog.js` → `content.js` na injeção e no `scripting.executeScript` do background.
3. Relativos dos testes (`require('../src/shared/catalog.js')`) e da docs (`../src/shared/...`).
4. Zero build step — clonar e carregar a pasta em `chrome://extensions`.

## Onde gerar artefatos

| Tarefa | Comando |
|--------|---------|
| PNGs canônicos dos sub-pets | `node tests/tools/crop-literal-sprites.mjs` |
| Frames/preview (não sobrescreve pacote) | `node tests/tools/make-sprites.mjs` |
| Ícones da extensão | `node tests/tools/make-icons.mjs` |
| Suíte de contratos | `npm test` (**240**) |
| Ecosystem estático | `npm run ecosystem` |
| Smoke Edge | `npm run smoke` |

Detalhes de uso: [README da pasta tools](../tests/tools/README.md) · índice de docs: [docs/README.md](./README.md).

## Fase seguinte — padrões e produto (pós-validação)

O núcleo (animações, ações, sub-pets, schema v6, suíte de contratos) está **sólido**. Prioridade passa a ser aprofundar, não reescrever:

| Eixo | Padrão / direção | Próximos ganhos |
|------|------------------|-----------------|
| **SSOT** | Dados e regras no `catalog.js`; runtime só orquestra | Novos desafios/quests/reações só no catálogo |
| **Gamificação** | Daily + weekly + combo + achievements | Temporadas, streak visual, recompensas cosméticas |
| **Personalização** | `personality` + `customSpeech` + favoritos | Traços → quests/XP; presets de personalidade |
| **Integração** | Hostname → contexto → reação | Mais hosts; opcional “site packs” sem permissões extras |
| **Segurança** | Allowlist de mensagens + sanitize storage | Manter zero `eval`; revisar WAR ao adicionar assets |
| **Performance** | Caps FX, pause hidden/off-screen, save coalesce, reduced-motion | Budgets de rAF; ambient acessório leve |
| **Presença** | `.pixel-legs` + `.pixel-fx` + name-tag título/nome | Mais poses por ação; sync popup/live |
| **Escalabilidade** | Monólito content + SSOT compartilhado | Só modularizar com plano de injeção MV3 |
| **UX** | Onboarding + contagens alinhadas ao catálogo | Tours curtos por feature (profissão, sub-pet) |
