# Contribuindo com o Claw'd

Obrigado por contribuir! Esta extensão é **Chrome MV3**, vanilla JS, **sem bundler**.

## Setup

1. Clone o repositório
2. (Opcional) `npm ci` — só para lint/testes Node
3. Abra `chrome://extensions` → **Modo do desenvolvedor** → **Carregar sem compactação** → pasta raiz do repo
4. Após editar `content.js` / CSS / `catalog.js` / `i18n.js`: **Recarregar** a extensão **e** a aba de teste

> Cross-tab: hide visual usa a classe `.aic-presence-hidden` — ao mexer em display do pet/subpet, preserve `display: none !important` nessa classe (`style.display` sozinho perde para `display: block !important`).

## Scripts

| Comando | Função |
|---------|--------|
| `npm test` | Suíte de contratos (`tests/*.test.js`) |
| `npm run ecosystem` | Validação estática do ecossistema |
| `npm run lint` | ESLint em `src/` e `tests/` |
| `npm run check` | `node --check` nos scripts principais |
| `npm run audit` | Checklist dos 5 eixos (segurança, perf, automations, integrations, interactions) |
| `npm run smoke` | Smoke em Edge/Chromium (opcional) |

## Checklist de PR

- [ ] `npm test` verde
- [ ] `npm run ecosystem` verde
- [ ] Badge em `docs/index.html` alinhado ao número de `test(` (ex.: `N/N`)
- [ ] Sem secrets (API keys, tokens Trello, `.env`) no diff
- [ ] Credenciais Trello só em `chrome.storage.local` (`clawdTrello`) — nunca no código
- [ ] XSS: preferir `textContent` / `clawdSanitizePlainText`
- [ ] Mensagens runtime passam por `clawdValidateRuntimeMessage`
- [ ] Movimento segue [`docs/MOTION.md`](./docs/MOTION.md): sem `transition: all`, sem disputa de `animation`, reduced-motion e cleanup de rAF/timers
- [ ] Interações novas funcionam com teclado, foco visível e atributos ARIA coerentes
- [ ] Docs (README / MANUAL / CHANGELOG / VALIDACAO) atualizados se o comportamento mudou

## Arquitetura rápida

- SSOT: `src/shared/catalog.js` + `src/shared/i18n.js` + `src/shared/i18n-entities.js`
- Content: `src/content/content.js` + `style.css`
- Popup: `src/popup/*`
- Service worker: `src/background/background.js` (presença cross-tab + Trello API)
- Schema: v6 (`focus`, `wellbeing`, `screenTime`, regras por site e settings de foco; preserva os campos v5)
- Gate atual: **253/253** contratos (`npm test`)
- Não versionar arquivos/pastas com nome começando em `_` na raiz do pacote (exceto `_locales` / `_metadata`) — o Chromium recusa o load unpacked

## Feedback / Trello

Board público: [https://trello.com/b/8wGr5tiQ/pet](https://trello.com/b/8wGr5tiQ/pet) (ID `8wGr5tiQ`). Veja [docs/TRELLO.md](./docs/TRELLO.md) para configurar a API (Key/Token só em `chrome.storage.local`).

## Idiomas

Padrão: **pt-BR**. Outros: `en`, `es`, `zh-CN`, `ja`, `fr`, `de`, `ko`, `hi`, `ar`, `ru` — seletor em ⚙️ Configurações.
