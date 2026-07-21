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

## 3. Popular o board (seed do projeto)

Para deixar o board `8wGr5tiQ` apresentável a novos contribuidores, rode o seed. As credenciais vêm do **ambiente** (nunca do Git) e o script é idempotente (não duplica listas/cards):

```bash
# pré-visualizar sem chamar a API
npm run trello:seed -- --dry

# criar listas (Ideias, Bugs, Backlog, Em progresso, Feito) + cards de apresentação
TRELLO_KEY=xxxx TRELLO_TOKEN=yyyy TRELLO_BOARD=8wGr5tiQ npm run trello:seed
```

No PowerShell (Windows):

```powershell
$env:TRELLO_KEY='xxxx'; $env:TRELLO_TOKEN='yyyy'; $env:TRELLO_BOARD='8wGr5tiQ'; npm run trello:seed
```

## 4. Segurança

- Não commite key/token.
- Textos de card passam por `clawdSanitizePlainText`.
- Ação `createTrelloCard` é allowlisted em `clawdValidateRuntimeMessage`.
- O SW **não** loga tokens.
