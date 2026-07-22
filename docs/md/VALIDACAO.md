# Relatório de Validação — Claw'd v3.8.0

**Data:** 21 de julho de 2026 (revalidação: fluidez pet↔subpet + docs)  
**Ambiente:** Windows · Node.js · Edge/Chromium  
**Marco:** **167/167** contratos — i18n, posições, Trello, layering, animações contagiosas

## Resultado

- Verificações de sintaxe (`npm run check`): **aprovadas**
- Suíte `node:test`: **167/167**
- `validate-ecosystem`: **ECOSYSTEM_STATIC_OK** · version **3.8.0** · badge **167/167**
- `npm run audit`: **AUDIT_PACK_OK** (5 eixos)
- Lint (`eslint src tests`): **0 erros**
- Smoke Chromium: **runtimeErrors: 0** · reloads **3/3** · duo/partículas/props OK

## Contagens vivas

| Entidade | Qtd |
|----------|-----|
| Ações popup / extras | **30** / **3** |
| Acessórios | **31** |
| Rostos / skins / idle | **9** / **7** / **7** |
| Profissões / subpets | **12** / **8** |
| Locales UI | **11** (pt-BR padrão) |
| Contratos | **167** |

## Matriz de auditoria (5 eixos)

| Eixo | Evidências |
|------|------------|
| **Segurança** | `clawdSanitizePlainText`, allowlists de mensagem, Trello sem log de token, secrets em `clawdTrello` (não no export) — ver `tests/pro-i18n-notify.test.js`, `validation-complete` |
| **Performance** | `PARTICLE_MAX` / `_reserveFx`, `performanceMode`, reduced-motion — `quality-fluid.test.js` |
| **Automações** | CI: test + ecosystem + audit (`.github/workflows/validate.yml`) |
| **Integrações** | Trello via SW (`api.trello.com`), i18n (`src/shared/i18n.js`), `docs/TRELLO.md` |
| **Interações** | `toastPosition` / `speechAnchor` / `emotionBadgeSide`, speech pools SSOT, popup selects; fluidez pet↔subpet (`clawdEaseInOutCubic`, eco `_pulseReact`, idle subpet) |

## Novidades v3.8.0

| Item | Status |
|------|--------|
| Posição de toasts (`bl\|br\|tl\|tr\|center`) | ✅ |
| Âncora do balão (`auto\|left\|right\|above\|below`) | ✅ |
| Lado do badge de emoção (`left\|right`) | ✅ |
| `settings.locale` + `clawdT` / speech pools | ✅ |
| UI traduzida (11 locales) | ✅ |
| Pools pt-BR/en 2–3×; demais com núcleo + fallback en | ✅ |
| Trello: settings + `createTrelloCard` no SW | ✅ |
| CONTRIBUTING.md + docs/TRELLO.md + audit-pack | ✅ |
| Pet acima do name-tag (z-index sprite > etiqueta) | ✅ |
| Subpet na frente do name-tag/balão (`z-index` 2147483647 + follow aos pés) | ✅ |
| Board Trello público [pet](https://trello.com/b/8wGr5tiQ/pet) | ✅ |
| Locomoção eased (`clawdEaseInOutCubic` em walk/run) | ✅ |
| Eco contagioso pet→subpet (jump/dance/bath/happy/stretch) | ✅ |
| Micro-idle do subpet (look/hop/wiggle/stretch) + walk CSS `ease-in-out` | ✅ |
| Anticipação de pulo + duo/ações espontâneas mais frequentes | ✅ |
| `summonCheer` na allowlist + feedback de summon no popup | ✅ |

## Comandos

```powershell
npm run check
npm test
npm run ecosystem
npm run audit
node tests/runtime-smoke.mjs
```

## Histórico v3.7.3

Ver CHANGELOG e commits anteriores para polish de timing, profissões e subpets (159 contratos base).
