# Trello — board público e API

O Claw'd pode enviar **sugestões** e **bugs** como cards no Trello. Credenciais **nunca** vão para o Git.

## 1. Board público (README / link)

1. Crie um board em [trello.com](https://trello.com) (ex.: “Claw'd Feedback”).
2. Torne-o **público** (Compartilhar → Visibilidade → Público) se quiser link aberto.
3. Copie a URL (`https://trello.com/b/XXXX/nome`).
4. Substitua o placeholder em `src/shared/catalog.js`:

```js
var CLAWD_TRELLO_BOARD_URL = 'https://trello.com/b/SEU_BOARD';
```

Ou informe a URL no popup → ⚙️ → **URL do board público** (salvo em `settings.trelloBoardUrl`).

## 2. API Key e Token (criar cards)

1. Abra **https://trello.com/app-key** (logado).
2. Copie a **API Key**.
3. Gere um **Token** (link “Token” na mesma página) com permissão de escrever no board.
4. Copie o **Board ID** (na URL do board, o trecho após `/b/`, ou via API `GET /1/members/me/boards`).
5. No popup da extensão → ⚙️ Configurações → seção **Trello**:
   - cole API Key, Token e Board ID (campos senha)
   - use **Enviar sugestão** / **Reportar bug**

Os secrets ficam em `chrome.storage.local` sob a chave `clawdTrello` (fora do JSON exportável de progresso). O service worker chama `https://api.trello.com/1/cards` — o content script **não** precisa da host permission em cada página.

## 3. Segurança

- Não commite key/token.
- Textos de card passam por `clawdSanitizePlainText`.
- Ação `createTrelloCard` é allowlisted em `clawdValidateRuntimeMessage`.
- O SW **não** loga tokens.
