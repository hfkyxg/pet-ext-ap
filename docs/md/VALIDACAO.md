# Relatório de Validação — Claw'd v3.8.0

**Data:** 22 de julho de 2026 (revalidação: sync i18n popup completo + onboarding + polish)  
**Ambiente:** Windows · Node.js · Edge/Chromium  
**Marco:** **194/194** contratos — popup/config sincronizam com o idioma (chrome + entidades + `renderAll`)

## Resultado

- Verificações de sintaxe (`npm run check`): **aprovadas**
- Suíte `node:test`: **194/194**
- `validate-ecosystem`: **ECOSYSTEM_STATIC_OK** · version **3.8.0** · badge **194/194**
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
| Contratos | **187** |

## Matriz de auditoria (5 eixos)

| Eixo | Evidências |
|------|------------|
| **Segurança** | `clawdSanitizePlainText`, allowlists de mensagem, Trello sem log de token, secrets em `clawdTrello` (não no export) — ver `tests/pro-i18n-notify.test.js`, `validation-complete` |
| **Performance** | `PARTICLE_MAX` / `_reserveFx`, `performanceMode`, reduced-motion — `quality-fluid.test.js` |
| **Automações** | CI: test + ecosystem + audit (`.github/workflows/validate.yml`) |
| **Integrações** | Trello via SW (`api.trello.com`), i18n (`src/shared/i18n.js`), `docs/TRELLO.md` |
| **Interações** | toast/speech/emotion positions; fluidez pet↔subpet; **host ativo** (`_isActiveHost` / `_crossTabHidden`); digitar/assistir; mischief |

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
| Contratos novos: mischief, navegação, polish animação, cross-tab/SFX | ✅ |

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
