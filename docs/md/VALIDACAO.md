# Relatório de Validação — Claw'd v3.8.0

**Data:** 21 de julho de 2026  
**Ambiente:** Windows · Node.js · Edge/Chromium  
**Marco:** **164/164** contratos — i18n, posições de notificação, Trello API, audit pack

## Resultado

- Verificações de sintaxe (`npm run check`): **aprovadas**
- Suíte `node:test`: **164/164**
- `validate-ecosystem`: **ECOSYSTEM_STATIC_OK** · version **3.8.0**
- `npm run audit`: **AUDIT_PACK_OK** (5 eixos)
- Lint (`eslint src tests`): ver CI

## Contagens vivas

| Entidade | Qtd |
|----------|-----|
| Ações popup / extras | **30** / **3** |
| Acessórios | **31** |
| Rostos / skins / idle | **9** / **7** / **7** |
| Profissões / subpets | **12** / **8** |
| Locales UI | **11** (pt-BR padrão) |
| Contratos | **164** |

## Matriz de auditoria (5 eixos)

| Eixo | Evidências |
|------|------------|
| **Segurança** | `clawdSanitizePlainText`, allowlists de mensagem, Trello sem log de token, secrets em `clawdTrello` (não no export) — ver `tests/pro-i18n-notify.test.js`, `validation-complete` |
| **Performance** | `PARTICLE_MAX` / `_reserveFx`, `performanceMode`, reduced-motion — `quality-fluid.test.js` |
| **Automações** | CI: test + ecosystem + audit (`.github/workflows/validate.yml`) |
| **Integrações** | Trello via SW (`api.trello.com`), i18n (`src/shared/i18n.js`), `docs/TRELLO.md` |
| **Interações** | `toastPosition` / `speechAnchor` / `emotionBadgeSide`, speech pools SSOT, popup selects |

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
