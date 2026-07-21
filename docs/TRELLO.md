# Trello — board público e API

O Claw'd pode enviar **sugestões** e **bugs** como cards no Trello. Credenciais **nunca** vão para o Git.

## 1. Board público (README / link)

1. Board do projeto: [https://trello.com/b/8wGr5tiQ/pet](https://trello.com/b/8wGr5tiQ/pet).
2. Visibilidade: público (já configurado no board pet).
3. URL pública / shortlink: `https://trello.com/b/8wGr5tiQ/pet` (ID `8wGr5tiQ`).
4. A constante em `src/shared/catalog.js` já usa essa URL:

```js
var CLAWD_TRELLO_BOARD_URL = 'https://trello.com/b/8wGr5tiQ/pet';
```

Ou informe a URL no popup → ⚙️ → **URL do board público** (salvo em `settings.trelloBoardUrl`).

## 2. API Key e Token (criar cards)

1. Abra **https://trello.com/app-key** (logado).
2. Copie a **API Key**.
3. Gere um **Token** (link “Token” na mesma página) com permissão de escrever no board.
4. Use o **Board ID** `8wGr5tiQ` (trecho após `/b/`, ou via API `GET /1/members/me/boards`).
5. No popup da extensão → ⚙️ Configurações → seção **Trello**:
   - cole API Key, Token e Board ID (campos senha)
   - use **Enviar sugestão** / **Reportar bug**

Os secrets ficam em `chrome.storage.local` sob a chave `clawdTrello` (fora do JSON exportável de progresso). O service worker chama `https://api.trello.com/1/cards` — o content script **não** precisa da host permission em cada página.

## 3. Configurar e personalizar o board (setup completo)

O `trello:seed` faz o **setup completo** do board `8wGr5tiQ`, idempotente e com credenciais só via **ambiente** (nunca no Git). Ele aplica, em ordem:

1. **Descrição** convidativa no cabeçalho do board
2. **Preferências**: `selfJoin`, `cardCovers`, comentários públicos, **votação pública**, card aging
3. **Power-ups** (best-effort via API): **Custom Fields**
4. **Custom fields**: `Prioridade` (Alta/Média/Baixa), `Área` (Core/UI/i18n/Infra/Docs), `Esforço (pts)`
5. **Labels coloridas**: `bug`, `feature`, `i18n`, `security`, `performance`, `docs`, `good first issue`
6. **Listas**: 📥 Ideias · 🐛 Bugs · 📋 Backlog · 🚧 Em progresso · ✅ Feito
7. **Cards** de apresentação (com labels e checklist de onboarding)

```bash
npm run trello:seed -- --dry        # pré-visualiza o plano, sem tocar na API

# aplicar (bash/zsh)
TRELLO_KEY=xxxx TRELLO_TOKEN=yyyy TRELLO_BOARD=8wGr5tiQ npm run trello:seed
```

```powershell
# aplicar (PowerShell / Windows)
$env:TRELLO_KEY='xxxx'; $env:TRELLO_TOKEN='yyyy'; $env:TRELLO_BOARD='8wGr5tiQ'; npm run trello:seed
```

### Power-ups recomendados

| Power-up | Para quê | Como ativar |
|---|---|---|
| **Custom Fields** | Prioridade / Área / Esforço por card | Automático pelo script (best-effort) |
| **Voting** | Comunidade vota nas ideias 👍 | `prefs/voting` pelo script |
| **Card Aging** | Cards parados "envelhecem" (visível) | `prefs/cardAging` pelo script |
| **GitHub** | Vincular PRs/commits/issues aos cards | Manual — precisa de OAuth (UI → Power-Ups → GitHub) |
| **Calendar** | Datas/marcos no calendário | Manual — UI → Power-Ups → Calendar |

> Passos "best-effort" (power-ups, custom fields, prefs de power-up) são **não-fatais**: se a API do seu plano recusar, o script avisa com `~` e segue. Ative esses pela UI (**Power-Ups**) quando necessário. GitHub e Calendar exigem vínculo OAuth e por isso são sempre manuais.

## 4. Segurança

- Não commite key/token.
- Textos de card passam por `clawdSanitizePlainText`.
- Ação `createTrelloCard` é allowlisted em `clawdValidateRuntimeMessage`.
- O SW **não** loga tokens.
