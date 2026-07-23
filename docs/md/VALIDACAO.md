# Relatório de Validação — Claw'd v4.0.0

**Data:** 23 de julho de 2026 (revalidação: load unpacked MV3 + badge 250 + fala/gestos/movimento)
**Ambiente:** Windows · Node.js · Edge/Chromium  
**Marco:** **250/250** contratos — schema v6 + Central de Calma + 11 subpets + harness sem `_` + fala sem colisão + movimento sincronizado + acessibilidade

## Resultado

- Verificações de sintaxe (`npm run check`): **aprovadas** (inclui `i18n-entities.js`)
- Suíte `node:test`: **250/250**
- `validate-ecosystem`: **ECOSYSTEM_STATIC_OK** · version **4.0.0** · badge **250/250**
- `npm run audit`: **AUDIT_PACK_OK** (5 eixos)
- Lint (`eslint src tests`): **0 erros**
- Smoke Chromium: **runtimeErrors: 0** · reloads **3/3** · duo/partículas/props + layout de fala desktop/375 px OK

## Contagens vivas

| Entidade | Qtd |
|----------|-----|
| Ações popup / extras | **30** / **3** |
| Acessórios | **31** |
| Rostos / skins / idle | **9** / **11** / **7** |
| Profissões / subpets | **12** / **11** |
| Locales UI | **11** (pt-BR padrão) |
| Contratos | **250** |

## Matriz de auditoria (5 eixos)

| Eixo | Evidências |
|------|------------|
| **Segurança** | `clawdSanitizePlainText`, allowlists de mensagem, Trello sem log de token, secrets em `clawdTrello` (não no export) — ver `tests/pro-i18n-notify.test.js`, `validation-complete` |
| **Performance** | `PARTICLE_MAX` / `_reserveFx`, `performanceMode`, reduced-motion, subpet `dt` + off-screen pause, rAF no showcase — `quality-fluid.test.js` + `motion-harmony.test.js` |
| **Automações** | CI: test + ecosystem + audit (`.github/workflows/validate.yml`) |
| **Integrações** | Trello via SW (`api.trello.com`), i18n (`src/shared/i18n.js`), `docs/TRELLO.md` |
| **Interações** | tabs ARIA, overlays modais, Pomodoro/humor assistivos, grounding autoguiado, sons curtos, fluidez pet↔subpet; **host ativo** (`_isActiveHost` / `_crossTabHidden`); digitar/assistir; mischief |

## Harmonia de movimento e interação

| Contrato | Evidência | Status |
|----------|-----------|--------|
| Vocabulário comum de timing/easing | tokens em `style.css`, `popup.css`, `showcase.css`; relógios em `CLAWD_TIMINGS` | ✅ |
| Nenhuma transição genérica | busca estática rejeita `transition: all` nas três superfícies | ✅ |
| Ação não disputa animação decorativa | halo de foco em `.sprite-stack::after`, fora de `.pet-body` | ✅ |
| Saída visual sincronizada | `_removeAfterMotion`: `transitionend`/`transitioncancel` + fallback rastreado | ✅ |
| Reduced motion completo | runtime, popup e showcase preservam estado final sem loops decorativos | ✅ |
| Teclado e foco | trap/Escape/restauração nos overlays; tabs ←/→/Home/End; foco visível | ✅ |
| Fala principal/subpet | quatro candidatos, clamp de 8 px, quebra de linha e pontuação de colisão | ✅ |
| Olhar 3D isolado | `.pet-look-layer` movimenta o personagem sem inclinar balão/controles | ✅ |
| Gestos coerentes | clique, duplo, long press e arraste não disparam ações duplicadas; mouse/touch/teclado | ✅ |
| Preview autônomo eficiente | subpet da vitrine usa rAF e pausa hidden/reduced | ✅ |
| Prioridade da interação | `AUTONOMY_GRACE_MS` impede fala/cena/idle/passeio autônomo de sobrepor uma ação recente | ✅ |
| Bem-estar sem pressão | grounding é avançado pelo usuário; humor baixo sugere apoio sem abrir modal à força; dados ficam locais | ✅ |
| Sons e timers | padrões procedurais curtos, AudioContext pós-gesto e `_calmSoundTimers` limpo no teardown | ✅ |

Contratos específicos: `tests/motion-harmony.test.js`. Diretrizes: [`docs/MOTION.md`](../MOTION.md).

## Polish 22/07/2026 (neste marco)

| Item | Status |
|------|--------|
| Idle `!important` limpo no `setState` (não engole ações) | ✅ |
| `doDance` com `_danceTimers` + `setState` por passo | ✅ |
| Digitar sustentado (sem `setStateFor` que corta no meio) | ✅ |
| Hug do subpet só se o dono estiver livre | ✅ |
| Timers de FX/scroll/summon/poof/kickoff limpos no `destroy` | ✅ |
| Aba não-host: silêncio de SFX/fala/partículas + loops gated | ✅ |
| Race `despawnPet` × `spawnPet` (`_despawnTimer` + `_travelGen`) | ✅ |
| SFX sem eco: subpet dblclick, wake silencioso, cheer sem celebrate duplo | ✅ |
| Popup `prefers-reduced-motion` cobre loops infinitos | ✅ |
| Subpet follow com `dt` (60 fps normalizado, cap 3×) | ✅ |
| Subpet `IntersectionObserver` → pause rAF/CSS off-screen | ✅ |
| Keyframes/hover/press do subpet mais suaves + `will-change` | ✅ |
| Popup: `content/style.css` injetado após parse (não bloqueia boot MV3) | ✅ |
| Boot do popup com `__clawdPopupBootError` / fases | ✅ |
| Contratos: mischief, navegação, polish, cross-tab/SFX, subpet dt/observer, gate CSS async | ✅ |

## Novidades v3.8.0 (base)

| Item | Status |
|------|--------|
| Posição de toasts (`bl\|br\|tl\|tr\|center`) | ✅ |
| Âncora do balão (`auto\|left\|right\|above\|below`) | ✅ |
| Lado do badge de emoção (`left\|right`) | ✅ |
| `settings.locale` + `clawdT` / speech pools | ✅ |
| UI traduzida (11 locales) — chrome + listas dinâmicas + titles/aria | ✅ |
| Onboarding: idioma + canto inicial; sync Config | ✅ |
| `clawdNormalizeLocale` (browser `en-US`/`pt`/…) | ✅ |
| RTL (`dir=rtl`) no locale `ar` | ✅ |
| Trello: settings + `createTrelloCard` no SW | ✅ |
| Layering pet/subpet × name-tag/balão | ✅ |
| Locomoção eased + eco contagioso + micro-idle | ✅ |

## Comandos

```powershell
npm run check
npm test
npm run ecosystem
npm run audit
node tests/runtime-smoke.mjs
```

## Histórico

- **v3.8.0 (21/07)** — i18n, Trello, layering, fluidez (marco 169).
- **v3.7.3** — timing, profissões assinatura, subpets (159 contratos base).
