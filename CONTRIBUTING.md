# Contribuindo com o Claw'd

Obrigado por contribuir! Esta extensão é **Chrome MV3**, vanilla JS, **sem bundler**.

## Setup

1. Clone o repositório
2. (Opcional) `npm ci` — só para lint/testes Node
3. Abra `chrome://extensions` → **Modo do desenvolvedor** → **Carregar sem compactação** → pasta raiz do repo
4. Após editar `content.js` / CSS / `catalog.js` / `i18n.js`: **Recarregar** a extensão **e** a aba de teste

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
- [ ] Docs (README / MANUAL / CHANGELOG / VALIDACAO) atualizados se o comportamento mudou

## Arquitetura rápida

- SSOT: `src/shared/catalog.js` + `src/shared/i18n.js` + `src/shared/i18n-entities.js`
- Content: `src/content/content.js` + `style.css`
- Popup: `src/popup/*`
- Service worker: `src/background/background.js` (presença cross-tab + Trello API)
- Schema de settings: v5 (`toastPosition`, `speechAnchor`, `emotionBadgeSide`, `locale`, `trelloBoardUrl`, `trelloBoardId`)
- Gate atual: **197/197** contratos (`npm test`)

## Feedback / Trello

Board público: [https://trello.com/b/8wGr5tiQ/pet](https://trello.com/b/8wGr5tiQ/pet) (ID `8wGr5tiQ`). Veja [docs/TRELLO.md](./docs/TRELLO.md) para configurar a API (Key/Token só em `chrome.storage.local`).

## Idiomas

Padrão: **pt-BR**. Outros: `en`, `es`, `zh-CN`, `ja`, `fr`, `de`, `ko`, `hi`, `ar`, `ru` — seletor em ⚙️ Configurações.
