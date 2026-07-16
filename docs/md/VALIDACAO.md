# Relatório de Validação — Claw'd v3.2

**Data:** 16 de julho de 2026 (loop M2 — performance)  
**Ambiente:** Windows · Node.js 24 · Edge/Chromium com perfil isolado  
**Marco:** Novo ciclo modular; M1 security fechado; M2 afina rAF/spring, particle caps e idle timers

## Resultado

- Verificações de sintaxe: **aprovadas** (`catalog`, `content`, `popup`, `background`, `showcase`);
- Suíte `node:test`: **65/65 testes aprovados** (catálogo, extensão e integridade);
- Smoke test em navegador Chromium/Edge real: **aprovado** (`runtimeErrors: 0`, `invalidContextErrors: 0`, `reloads: [1,1,1]`, `mouthToggleChecked: true`);
- Assets: **8/8** PNGs em `src/shared/sprites/subpets/` com `image.url` no catálogo.

## Loop de módulos (novo ciclo)

| Módulo | Foco | Status |
|--------|------|--------|
| **M1** | Segurança / privacidade / bugs críticos + micro-perf | **feito** |
| **M2** | Performance (rAF spring skip, particle caps, idle timers) | **feito** (este tick) |
| M3 | Algoritmos (follow spring, dwell targeting) | próximo |
| M4 | UX intuitiva (popup, mouth, grade subpet) | pendente |
| M5 | Animações / efeitos / interações | pendente |
| M6 | Docs sync + suite completa + smoke | pendente |

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

## Achados M2 (este tick)

| Severidade | Achado | Ação |
|------------|--------|------|
| Médio | Subpet escrevia `left`/`top` todo frame mesmo settled | `_writePos` + skip spring quando `dist < SETTLE_EPS` |
| Médio | rAF do subpet girava vazio durante sono | `_pauseRaf` em `sleep()` / `_resumeRaf` em `wakeUp()` |
| Baixo | Cap de FX generoso (28) + poeira fora do contador | Cap 18; drag/run dust via `_canSpawnFx` / `_trackParticle` |
| Baixo | Timers de profissão/fisher/ninja sem guard de aba oculta | Early-return em `document.hidden` |
| Baixo | `updatePosition` / `lookAtCursor` thrash | Skip write se delta irrelevante |

### Residual (não crítico — próximos módulos)

| Tema | Notas |
|------|--------|
| Popup `innerHTML` de catálogo | Só constantes estáticas (`CLAWD_SHOP` / achievements); sem input do usuário |
| `<all_urls>` + WAR | Necessário ao produto; WAR limitado a SVG/PNG |
| `_devComment` | Lê título + meta description (não body) — privacidade consciente |
| Follow spring tuning / dwell targeting | M3 algoritmos |
| UX popup / mouth / grade | M4 |

## Segurança e performance (baseline M1)

| Tema | Garantia |
|------|----------|
| Mensagens | Allowlist + sanitize (SSOT catalog); content em `switch` validado |
| Storage | Migrate em load/save/`setSubpet`; sem `__proto__` via `clawdAssignPlain` |
| DOM | Speech/toast/nome/missão via `textContent` |
| Sites bloqueados | Hostname DNS + match exato/subdomínio |
| Áudio | Sem `AudioContext` até gesto |
| Porta / bfcache | Validators + `travelComplete` só origem + scrub `lastError` |
| FX | Teto 28; sem spawn se hidden / `performanceMode` |
| rAF | Subpet **pausa** com aba oculta (não spin) |

## Limite do teste

Páginas `chrome://` / loja não aceitam content scripts. Após editar JS/CSS: **recarregar a extensão** em `chrome://extensions` (ou `edge://extensions`) e a aba de teste.
