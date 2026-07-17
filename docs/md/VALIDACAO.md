# Relatório de Validação — Claw'd v3.3

**Data:** 17 de julho de 2026 (v3.3.1 — polish pixel-fx + name-tag + qualidade)  
**Ambiente:** Windows · Node.js 24 · Edge/Chromium com perfil isolado  
**Marco:** Docs alinhados ao catálogo vivo + suíte de qualidade/fluidez (**117/117**)

## Resultado

- Verificações de sintaxe: **aprovadas** (`catalog`, `content`, `popup`, `background`, `showcase`);
- Suíte `node:test`: **117/117 testes aprovados** (catálogo, extensão, integridade, harmonia e qualidade-fluida);
- Smoke test em navegador Chromium/Edge real: **aprovado** (`runtimeErrors: 0`, `invalidContextErrors: 0`, `reloads: [1,1,1]`, `mouthToggleChecked: true`);
- Assets: **8/8** PNGs em `src/shared/sprites/subpets/` com `image.url` no catálogo.

## Contagens vivas (SSOT `catalog.js`)

| Entidade | Qtd |
|----------|-----|
| Ações no popup (`CLAWD_ACTIONS`) | **30** |
| Extras motor (`CLAWD_PET_EXTRA_ACTIONS`: kick, keepy, superdance) | **3** |
| Acessórios (3 slots) | **31** |
| Profissões | **12** |
| Sub-pets / ações de sub-pet | **8** / **7** |
| Conquistas | **34** |
| Tipos de missão diária (incl. balloons, keepy) | **14** |
| Desafios semanais | **12** |
| Contextos de página | **10** + idle |
| Schema | **v5** |

## Loop polish — ticks 1–6 (roadmap completo)

| Tick | Foco | Entrega |
|------|------|---------|
| **1** | Segurança | Allowlist de mensagens, sanitização storage/DOM, hosts bloqueados sem substring, AudioContext pós-gesto, bfcache/`lastError` |
| **2** | Animações | Idle variations, keyframes flip/meditate/electric/nap, partículas sazonais, presença viva |
| **3** | Ações (30) | Catálogo popup em **30**; extras kick/keepy/superdance fora do popup (`CLAWD_PET_EXTRA_ACTIONS`) |
| **4** | Gamificação | Contadores `balloonsPopped` / `keepyTotal`; conquistas de balão/keepy; quests balloons + keepy |
| **5** | Escalabilidade | Save coalesce, tetos de partículas, destroy limpa scroll/idle timers |
| **6** | Docs alignment | README, md/*, showcase `data-count`/badges e contratos de teste → **81/81** (histórico); suíte atual **99/99** |

## Ciclo v3.3 — módulos entregues

| Módulo | Foco | Status |
|--------|------|--------|
| **M1** | Segurança / privacidade / bugs críticos + micro-perf | **feito** |
| **M2** | Performance (rAF spring skip, particle caps, idle timers) | **feito** |
| **M3** | Gamificação 2.0 (combo, weekly, achievements, quests) | **feito** |
| **M4** | Profissões + Acessórios 2.0 (4 profs, 10 accs, slot body) | **feito** |
| **M5** | Animações / partículas sazonais / detecção de contexto | **feito** |
| **M6** | Docs sync + suíte completa + Schema v5 + smoke | **feito** |

## Checklist v3.3 + polish

| Item | Verificado |
|------|-----------|
| Slot body (ribbon, wings, cape, armor) CSS + JS + popup | ✅ |
| Sistema de combo: janela, balão, XP bônus, conquista | ✅ |
| Desafio semanal: alarm background, hash ISO week, claim | ✅ |
| 34 conquistas — iron_will + balloon/keepy + expansão | ✅ |
| Schema v5: clawdMigrateState bloco v<5 sem perda de dados | ✅ |
| Save coalesce + particle/scroll idle limpos em destroy() | ✅ |
| 4 novas profissões detectam domínio e reagem ao contexto | ✅ |
| Partículas sazonais: neve/folhas/flores/vagalumes por mês | ✅ |
| Showcase metrics: 30 ações · 31 acessórios · 34 conquistas · 117/117 | ✅ |
| Harmonia fase: contexto SSOT, weekly 12, personality sanitize, onboarding vivo | ✅ |
| Qualidade fluida: FX cap, rAF settle, throttle contexto, reduced-motion ao vivo | ✅ |
| Pixel-fx: poses steps(1) em ações + name-tag título/nome | ✅ |

## Comandos reproduzíveis

```powershell
node --check src/shared/catalog.js
node --check src/content/content.js
node --check src/popup/popup.js
node --check src/background/background.js
node --check docs/showcase.js
node --test tests/*.test.js
node tests/runtime-smoke.mjs
```

## Segurança e performance (baseline)

| Tema | Garantia |
|------|----------|
| Mensagens | Allowlist + sanitize (SSOT catalog); content em `switch` validado |
| Storage | Migrate em load/save/`setSubpet`; sem `__proto__` via `clawdAssignPlain`; **save coalesce** |
| DOM | Speech/toast/nome/missão via `textContent` |
| Sites bloqueados | Hostname DNS + match exato/subdomínio |
| Áudio | Sem `AudioContext` até gesto |
| Porta / bfcache | Validators + `travelComplete` só origem + scrub `lastError` |
| FX | Cap de partículas; sem spawn se hidden / `performanceMode` |
| rAF | Subpet **pausa** com aba oculta (não spin) |

## Limite do teste

Páginas `chrome://` / loja não aceitam content scripts. Após editar JS/CSS: **recarregar a extensão** em `chrome://extensions` (ou `edge://extensions`) e a aba de teste.
