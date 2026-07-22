# 📖 Claw'd — Documentação Técnica

> Documentação de arquitetura, código e funcionamento interno da extensão.
> Complementa a [documentação interativa](../index.html), a [arquitetura](../ARCHITECTURE.md), o [README](../../README.md) (visão geral), o [MANUAL.md](./MANUAL.md) (uso) e o [MELHORIAS.md](./MELHORIAS.md) (roadmap v3). Índice: [docs/README.md](../README.md) · [md/README.md](./README.md).

---

## 1. Visão Geral

O **Claw'd** é uma extensão Chrome (Manifest V3) que injeta um mascote pixel-art interativo em qualquer página. Não usa frameworks nem dependências externas: é Vanilla JS + CSS. O pet principal e os acessórios usam células de 4×4px em `box-shadow`, com **quatro modelos** de corpo e **nove rostos**; o modo liso ativa uma segunda silhueta CSS angular e contínua, sem grade ou textura. Os **sub-pets** usam PNGs em `src/shared/sprites/subpets/` (expostos em `web_accessible_resources`), com fallback `box-shadow` quando a paleta de corpo/olhos é customizada. Ambos compartilham cor independente dos olhos, estados, emoções e animações com keyframes isolados pelo prefixo `clawd-`.

**Princípios de design:**

- **Não obstrutivo** — o pet nunca deve atrapalhar a página: `z-index` máximo apenas no nó dele, `pointer-events` restritos ao próprio sprite;
- **Local-first** — todo processamento acontece no navegador; nada sai da máquina do usuário;
- **Zero dependências** — facilita auditoria, mantém o bundle mínimo e a injeção instantânea;
- **Persistente** — configurações e progresso sobrevivem a sessões via `chrome.storage.local`.

---

## 2. Estrutura do Projeto

```
clawd-extension/
├── manifest.json              # Configuração MV3 (permissões, scripts, popup)
├── src/
│   ├── content/
│   │   ├── content.js         # Motor do mascote — classe ClawdCompanion
│   │   └── style.css          # Sprite pixel-art + todos os keyframes
│   ├── popup/
│   │   ├── popup.html         # UI de personalização (8 abas)
│   │   ├── popup.css          # Design system dark da UI
│   │   └── popup.js           # Controles, preview e mensageria com a aba
│   ├── shared/
│   │   └── catalog.js         # Estado, migrações e catálogos compartilhados
│   ├── background/
│   │   └── background.js      # Service worker (inicialização de estado)
│   └── assets/
│       ├── pet-banner.svg     # Banner do README
│       └── pet-states.svg     # Showcase de estados
├── docs/
│   ├── README.md              # Índice da documentação
│   ├── ARCHITECTURE.md        # Camadas e padrões nomeados
│   ├── index.html             # Vitrine, player guiado e laboratórios
│   ├── showcase.css           # Cenas, evidências e layout responsivo
│   ├── showcase.js            # Roteiro, player, catálogos e previews
│   └── md/                    # Markdown de produto
│       ├── DOCUMENTACAO.md    # Este arquivo
│       ├── MANUAL.md          # Manual do usuário
│       ├── VALIDACAO.md       # Evidências de QA
│       ├── MELHORIAS.md       # Registro v3.2
│       └── Documentacao_Projeto_Clawd.md
├── tests/
│   ├── catalog.test.js        # Contratos de estado, arte e mecânicas
│   ├── extension.test.js      # Manifest, popup, docs e ciclo de reload
│   ├── integrity.test.js      # Harmonia catálogo ↔ motor
│   ├── runtime-smoke.mjs      # Smoke real em Edge/Chromium + reload MV3
│   └── tools/                 # Geradores e capturas one-off
├── README.md                  # Visão geral e instalação
├── CHANGELOG.md
└── LICENSE
```


---

## 3. Componentes

### 3.1 `manifest.json`

- `manifest_version: 3`, service worker em `src/background/background.js`;
- **Permissões**: `storage` (persistência), `activeTab` + `scripting` (comunicação com a aba ativa);
- **Content script** injetado em `<all_urls>`: `style.css` + `content.js`;
- **Popup** de ação: `src/popup/popup.html`.

### 3.2 Content Script — `content.js`

Todo o motor vive na classe **`ClawdCompanion`**, instanciada uma vez por página.

**Ciclo de vida (`init()`):**

```
createNode() → applyAll() → bindEvents() → listeners → contextHeartbeat() → startBehaviorLoop() → setupCrossTab()
```

Antes e durante esse ciclo, todas as chamadas a `chrome.runtime`, `chrome.storage` e ao Port cross-tab passam por guardas de contexto. Se um reload invalidar o ambiente MV3, callbacks tardios usam fallback, a instância cancela timers/listeners e remove seu DOM sem voltar a chamar APIs expiradas. Um heartbeat de **2,5 s** (pausado com `document.hidden`) cobre também contextos invalidados quando nenhum callback está pendente. O canal cross-tab desconecta em `pagehide`/`freeze` (capture) e consome `runtime.lastError` de forma explícita para não acumular erros de bfcache.

**DOM criado (`createNode`):**

```html
<div id="aic-clawd-node">              <!-- container posicionado (left/top) -->
  <div class="speech-bubble">          <!-- balão de fala -->
  <div class="pet-body">
    <div class="sprite-stack">         <!-- flip horizontal acontece aqui -->
      <div class="pixel-sprite">       <!-- corpo pixel-art sempre estático -->
      <div class="pixel-legs">         <!-- pernas; animam apenas ao mover/chutar -->
      <div class="smooth-sprite">      <!-- renderizador angular contínuo -->
      <div class="pet-eyes">           <!-- olhos com cor independente -->
      <div class="face-detail">        <!-- brilho, foco ou sono -->
      <div class="accessory">          <!-- camada cosmética compartilhada -->
      <div class="emotion-face">       <!-- piscada e boca em camada própria -->
    </div>
    <div class="name-tag">
      <span class="name-title"></span>  <!-- título por nível (Novato…) -->
      <span class="name-label"></span>  <!-- nome do pet -->
    </div>
    <div class="pixel-fx"></div>       <!-- poses pixel de ação (steps) -->
  </div>
  <div class="pet-ball">               <!-- bola (profissão jogador) -->
  <div class="ground-shadow">          <!-- sombra no chão -->
</div>
```

A separação `node` (posição) → `sprite-stack` (flip) → corpo/pernas/rosto/acessórios evita conflito de `transform` entre camadas. O corpo não troca de frame ao caminhar: `.pixel-legs` recebe o ciclo de passos e `.pixel-fx` as poses de ação (aceno, pulo, dança…). O name-tag guarda título de nível e nome em spans separados (`_syncNameTag`) — nunca use `textContent` no container. O nó recebe `data-clawd-owned="true"` e `all: initial`; seletores críticos são escopados em `#aic-clawd-node` para impedir que estilos genéricos da página contaminem a extensão.

**Máquina de estados (`setState`):**

| Estado | Classe CSS | Trigger |
|--------|-----------|---------|
| `idle` | (nenhuma) | padrão |
| `happy` | `.happy` | clique/carinho; cede a `celebrate` quando o mesmo carinho sobe o nível |
| `sleeping` | `.sleeping` | ~28s de inatividade |
| `excited` | `.excited` | scroll, gol, level up |
| `waving` | `.waving` | aleatório (~25s) ou ação manual |
| `walking` | `.walking` | auto-walk |

O estado é uma classe no `#aic-clawd-node`; o CSS resolve a animação correspondente. Timers (`_stateTimer`) devolvem o pet ao `idle`.

**Loops de comportamento (`startBehaviorLoop`):**

| Loop | Intervalo | Função |
|------|-----------|--------|
| Sleep check | 5s | dorme se `idle > 28s` e `sleepEnabled` |
| Fala aleatória | 40s | 60% de chance de mensagem do pool do estado atual |
| Aceno aleatório | 25s | 45% de chance quando idle |
| Auto-walk | 18s | 55% de chance; caminha até ponto aleatório em 70 ticks de 16ms |

**Interações do usuário:**

- **Drag** (mouse/touch): reposiciona; soltar com deslocamento < 5px conta como clique → `giveAffection()`;
- **Deslizamento** (mouse/touch): ao soltar após um arraste rápido, `startGlide()` continua o movimento com inércia em `requestAnimationFrame`, rebate nas bordas e persiste a posição final;
- **Clique/carinho**: estado `happy` + partículas emoji + `+5 XP`; se os pontos completarem um nível, `celebrate` assume corretamente a animação;
- **Scroll**: estado `excited` por ~900ms;
- **Mousemove**: `lookAtCursor()` aplica `perspective + rotateX/Y` limitado a ±12° (efeito 3D);
- **Bola** (jogador): `kickBall()` — animação de chute, `+10 XP`.

**Gamificação:**

- `addXp(amount)` → nível = `floor(xp / 50) + 1`; level up dispara balão, partículas em dose dupla e estado excited;
- XP persistido em `clawdState.xp`.

**Contexto de página (`_detectPageContext`):**

`_contextMap` mapeia profissão → lista de fragmentos de hostname. Se a URL casa, o pet mostra mensagem da profissão (`_profMessages`) após 2s; jogador também comemora com partículas.

### 3.3 Estilo — `style.css`

- **Pixel-art em camadas**: corpo e pernas usam `box-shadow` de 4×4px; a cor principal vem de `--agent-color` e os olhos de `--agent-eye-color`;
- **Quatro modelos**: `classic` reproduz a referência compacta, `mini` reduz o centro de massa, `claws` amplia as pinças e `guardian` cria uma silhueta mais robusta;
- **Quatro rostos**: `classic`, `sparkle`, `focused` e `sleepy`, combináveis com qualquer modelo, skin, cor e acessório;
- **Renderização adaptativa**: deslocamento e sub-pet usam `requestAnimationFrame`; o content script mede a cadência real em 30 frames e registra `data-refresh-rate`, sem impor 60 Hz artificialmente;
- **Walk cycle localizado**: o corpo permanece estático; `clawd-pixel-leg-cycle` só anima as pernas em `walking`/`running`, e `clawd-pixel-leg-kick` é reservado ao chute/embaixadinha;
- **Emoções em camadas**: o corpo base não é substituído; `emotion-face` desenha piscada/boca (ligada por padrão via `showMouth: true`), `emotion-badge` exibe o emoji e `.mouth-hidden` remove somente a boca;
- **Presença viva**: animações `look-around`, `soft-land`, `tab-greet` e `page-peek`; cenas **duo** pet↔subpet quando ambos idle; após dwell (~45–90 s) o pet pode engajar estrutura da página;
- **Escala**: `--agent-scale` compõe com todos os keyframes (evita sobrescrever `transform`);
- **Modificadores**: `.smooth` alterna para a silhueta contínua; `.outlined` aplica contorno; `[data-acc-head]`/`[data-acc-face]`/`[data-acc-body]` desenham os acessórios do catálogo com variantes pixel-art;
- **Chapéus responsivos**: os 7 itens de cabeça têm detalhes próprios nos dois renderizadores e `clawd-headwear-step` acompanha apenas `walking`/`running`, sem animação ociosa;
- **Isolamento**: todos os keyframes usam namespace `clawd-`, evitando colisões com `walk`, `sleep`, `fish` e outras animações comuns do site;
- Velocidade de animação ajustada pelas variáveis `--clawd-step-duration` e `--clawd-run-duration`, derivadas de `animSpeed`.

### 3.4 Popup — `popup.html/js/css`

UI dark com header (preview do pet, status, barra de XP) e 8 abas: **Aparência**, **Profissão**, **Comportamento**, **Ações**, **Pets**, **Loja**, **Conquistas** e **Configurações**. A aba Aparência funciona como um estúdio: miniaturas CSS reais escolhem modelo, rosto, skin, cor dos olhos e dois slots de acessórios; o provador combina tudo antes de fechar o popup. A aba Conquistas também exibe a missão diária, progresso e resgate.

- Cada controle chama `sendToTab({ action, key, value })` → `chrome.tabs.sendMessage` para a aba ativa;
- Ações do popup usam `{ action: 'triggerAction', value: 'wave'|'dance'|… }`;
- XP/nível lidos do storage ao abrir e refletidos na barra do header.

### 3.5 Service Worker — `background.js`

Coordena a **presença cross-tab**, escolhe a aba anfitriã e persiste o host em `chrome.storage.session`. Na primeira execução de cada runtime, remove DOM órfão das abas elegíveis e reinjeta os scripts somente na aba principal. O healthcheck só é aceito quando o nó pertencente à extensão está conectado e responde em duas verificações separadas; isso diferencia um service worker apenas reativado de um contexto antigo ainda expirando após `chrome.runtime.reload()`. Se a aba ativa for interna (`chrome://`/`edge://`), usa a aba web/file acessada mais recentemente, e a injeção tem até três tentativas verificadas.

---

## 4. Protocolo de Mensagens (popup → content)

```javascript
chrome.runtime.onMessage — ações aceitas pelo content script:
{ action: 'healthcheck' }                            // confirma instância viva ao service worker
{ action: 'toggleVisibility' }                      // mostra/oculta o pet
{ action: 'resetPosition' }                         // volta ao canto inferior direito
{ action: 'updateConfig', key, value }              // qualquer chave de config
{ action: 'triggerAction', value: 'wave'|'dance'|'happy'|'sleep'|'wake' }
{ action: 'setSubpet', value: 'dog'|null }           // ativa ou remove uma espécie
{ action: 'setSubpetColor', species, value: '#rrggbb' }
{ action: 'setSubpetEyeColor', species, value: '#rrggbb' }
{ action: 'triggerSubpetAction', value: 'cuddle'|'play'|'explore'|'spin'|'celebrate'|'special' }
{ action: 'getStatus' }                              // stats, jogo, missão e subpet atual
```

---

## 5. Persistência — `chrome.storage.local`

Tudo vive numa única chave `clawdState`:

```javascript
{
  schemaVersion: 5,         // migrador incremental atual (v1/v2/v4 → v5)
  name: "Claw'd",          // nome exibido no name-tag
  color: '#c71515',        // cor principal (--agent-color)
  eyeColor: '#08080b',     // cor independente dos olhos
  model: 'classic',        // classic | mini | claws | guardian
  faceStyle: 'classic',    // classic | sparkle | focused | sleepy
  skin: 'normal',          // normal | droopy | robot
  scale: 1.5,              // 0.8–3.0 (--agent-scale)
  animSpeed: 1,            // 0.5–3.0
  showSpeech: true,        // balões de fala
  showMouth: true,         // sorriso e expressões da boca
  autoWalk: true,          // passeio automático
  sleepEnabled: true,      // dormir por inatividade
  profession: 'idle',      // idle | footballer | tutor | engineer | musician | chef | ninja | fisher | doctor | artist | gamer | streamer
  smooth: false,           // visual liso
  outline: false,          // contorno
  accessoryHead: 'none',   // slot de cabeça
  accessoryFace: 'none',   // slot de rosto
  accessoryBody: 'none',   // slot de corpo (v3.3) — ribbon | wings | cape | armor
  position: { x, y },      // última posição arrastada
  // Personalização avançada (v3.3)
  personality: { playful: 5, lazy: 3, curious: 7, social: 5, foodie: 4 },
  customSpeech: [],        // frases personalizadas do pet
  particleColor: null,     // hex override para partículas (null = tema padrão)
  soundVolumeActions: 1,   // 0–1, volume de sons de ação
  soundVolumeAmbient: 0.6, // 0–1, volume de sons ambientes
  // Gamificação (v3.3)
  weekly: {
    questIndex: 0,         // índice do desafio semanal ativo
    progress: 0,           // progresso atual no desafio
    claimed: false,        // true se já resgatado esta semana
    weekKey: ''            // chave ISO week (ex.: '2026-W29')
  },
  // Sub-pets
  subpets: {
    active: null,
    unlocked: [],
    names: {},             // apelido por espécie
    colors: {},            // cor do corpo por espécie
    eyeColors: {}          // cor dos olhos por espécie
  },
  // Contadores de gamificação
  counters: {
    feeds: 0, dances: 0, pets: 0, goals: 0, keepyRecord: 0,
    sleeps: 0, tabsToday: 0, totalActions: 0, shopPurchases: 0,
    maxCombo: 0, maxSpeedrun: 0, nightInteractions: 0,
    professionsUsed: 0, level: 0, streakDays: 0  // streakDays: mirror de game.streak.days
  }
}
```

O estado inicial mantém o sprite compacto vermelho de referência (`color: #c71515`, `eyeColor: #08080b`, `model: classic`, `faceStyle: classic`, `skin: normal`, `smooth: false`, `accessoryHead/Face/Body: none`). O sistema não fixa 60 FPS: animações CSS e `requestAnimationFrame` acompanham a cadência do navegador.

Escrita incremental via `save()`/`persist()` (read-modify-write). O schema v5 inclui todos os campos v4 mais: `accessoryBody`, `personality`, `customSpeech`, `particleColor`, `soundVolumeActions`, `soundVolumeAmbient`, `weekly`, `counters.streakDays`; o migrador normaliza saves v1/v2/v4 → v5 sem perder progresso. A missão diária é derivada da data; o desafio semanal é derivado via `clawdISOWeek()` (hash determinístico, reproduzível).

**Runtime actions (v3.3+ / v3.6):**
```javascript
{ action: 'claimWeeklyChallenge' }   // resgata desafio semanal concluído
{ action: 'claimDailyQuest' }        // resgata missão diária
{ action: 'weeklyReset' }            // broadcast do background alarm (nova semana)
{ action: 'getStatus' }              // retorna stats + jogo + missão + weekly + subpet
{ action: 'openStudio' }             // abre studio in-page arrastável
{ action: 'closeStudio' }            // fecha o studio
```

Sub-pets têm `subpets.names`, `subpets.colors` e `subpets.eyeColors` indexados pela espécie. Cada entrada em `CLAWD_SUBPET_SPRITES` inclui frames pixel (`idle`/`walk`/`sleep`/…) e metadados `image: { url, width, height, gridW, gridH }` apontando para `src/shared/sprites/subpets/<id>.png` (crops literais do sheet). Helpers compartilhados: `clawdSubPetImageUrl`, `clawdSubPetBounds`, `clawdSubPetPalette`, `clawdBuildPixelShadow`. Em runtime, `SubPet._paint()` usa o PNG quando não há paleta custom; caso contrário (ou na piscada) cai no `box-shadow`. Regeneração canônica dos PNGs do pacote: `node tests/tools/crop-literal-sprites.mjs`. `node tests/tools/make-sprites.mjs` atualiza frames/preview e o catálogo, mas só sobrescreve os PNGs empacotados com `WRITE_PKG_SPRITES=1`. O popup envia `setSubpetColor` e `setSubpetEyeColor` para atualização ao vivo; cards bloqueados mantêm a arte full-color (sem greyscale); saves antigos recebem `eyeColors: {}` pela migração sem perder os demais dados.

O ciclo do sub-pet usa estados explícitos: `following`, `sleeping`, `waking`, `playing`, `cuddling`, `racing`, `exploring`, `spinning`, `celebrating`, `special`, `vanishing`, `splitting` e `fire`. O estado atual também fica em `data-state`, uma fronteira pública de diagnóstico que não expõe o objeto do content script ao mundo JavaScript da página. `sleep()` e `wakeUp()` cancelam timers opostos; clique/teclado e qualquer uma das **sete** ações manuais despertam o subpet antes de interagir. Timers de ação ficam registrados e são cancelados por `destroy()`.

Cada espécie implementa `special`: cachorro late/busca, gato pode ignorar, pássaro rodopia, coelho salta, dinossauro corre, dragão solta fogo, fantasma desaparece e slime se divide. As animações preservam o flip horizontal por variável CSS e respeitam `prefers-reduced-motion`.

No modo liso, `pixel-sprite` e `pixel-legs` ficam ocultos e sem `box-shadow`; o `smooth-sprite` assume uma variante contínua de cada um dos quatro modelos, com cabeça, braços, base e quatro pernas retas. Não há `background-image`, células internas, blur, cantos arredondados de slime ou textura de grade. Olhos, piscadas e a boca ficam em uma camada independente: o sorriso usa apenas traço curvo transparente e um detalhe mínimo de língua, sem os antigos blocos branco/preto; `showMouth: false` oculta essa camada sem afetar as demais emoções. Os **31** acessórios e as skins especiais também têm variantes contínuas. Os chapéus usam artes, reflexos e volumes próprios, e acompanham o passo apenas durante deslocamento. A `sprite-stack` mantém contenção de layout/estilo, mas não de pintura: isso permite que cartolas, coroas, toucas, hélices, abas e mochilas ultrapassem a caixa de 44×36px sem recorte. Fones usam uma camada atrás do chapéu, e a faixa ninja fica na testa sem cobrir os olhos.

`clawdEffectiveAccessories(state)` separa seleção pessoal e traje profissional. O DOM recebe o item efetivo e a origem (`personal` ou `profession`), mas `accessoryHead`/`accessoryFace` continuam intactos no storage; ao voltar para Livre, o visual pessoal reaparece. O popup reutiliza `style.css` em um provador real que combina os dois slots e reflete pixel/liso, skin, cor, contorno e camisa. O Pescador cria lago, vara/linha e janela de fisgada; cancelamento limpa timers/cena sem conceder peixe, enquanto a captura completa incrementa o contador.

---

## 6. Decisões de Arquitetura

| Decisão | Motivo |
|---------|--------|
| Renderizador CSS + PNG de subpet | Pet/acessórios em `box-shadow`; subpets em PNG com fallback pixel |
| Estado = classe CSS | Anima via GPU, sem JS por frame (exceto auto-walk) |
| CSS vars para cor/escala | Mudança instantânea sem reflow nem re-render |
| Storage único (`clawdState`) | Leitura atômica no boot da página, simples de migrar |
| Sem frameworks | Injeção leve em toda página; auditável; sem supply-chain risk |
| `z-index: 2147483647` | Garante o pet acima de qualquer layout |
| `destroy()` + boot token | Evita listeners, timers e instâncias duplicadas após reinjeção |
| Guardas de contexto MV3 | Encerram a instância antiga sem exceções após reload da extensão |
| Reconciliação com healthcheck estável | Exige DOM conectado, tolera aba interna ativa e repete injeções transitórias sem duplicar o pet |
| Acessório efetivo derivado | Uniformes automáticos não sobrescrevem a personalização persistente do usuário |
| Ações com cancelamento de cena | Passeio, inércia, pesca e embaixadinha anteriores são encerrados antes da nova ação |

**Limitações conhecidas:**

- O cross-tab depende de páginas onde o content script pode ser executado; páginas internas `chrome://`, loja e alguns PDFs continuam bloqueadas pelo navegador;
- O modo desempenho reduz partículas, 3D e sub-pet para preservar fluidez em páginas pesadas;
- Páginas com CSP muito restritivo a inline styles podem afetar partículas (usa `style.cssText`).

---

## 7. Privacidade e Segurança

- **Nenhum dado sai do navegador** — não há servidor, telemetria ou requests externos;
- A detecção de contexto lê apenas o `hostname` da página, nunca o conteúdo;
- Permissões mínimas: `storage`, `activeTab`, `scripting`;
- O content script não intercepta formulários, teclado ou dados da página.

---

## 8. Guia de Desenvolvimento

```bash
# Carregar em modo dev
chrome://extensions → Modo do desenvolvedor → "Carregar sem compactação" → pasta do projeto

# Após editar content.js/style.css: recarregar a extensão E a página de teste
# Após editar popup.*: basta reabrir o popup

# Regenerar crops literais (PNGs do pacote)
node tests/tools/crop-literal-sprites.mjs
# Frames/preview + catálogo (NÃO sobrescreve PNGs do pacote sem WRITE_PKG_SPRITES=1)
node tests/tools/make-sprites.mjs
node --test tests/*.test.js
```

**Convenções:**

- Prefixo `aic-` em todos os IDs injetados na página (evita colisão);
- Métodos privados da classe com prefixo `_`;
- Toda config nova deve: (1) ter default no `constructor`, (2) ser tratada no `applyConfig`, (3) ser incluída na lista `keys` do `loadState`, (4) ganhar controle no popup.

---

## 9. Documentação executável

`docs/index.html` funciona diretamente no navegador e não depende de build, CDN ou servidor de aplicação. A página carrega `src/shared/catalog.js` como fonte de verdade para profissões, acessórios, ações e subpets.

O painel **Demonstração validada** possui:

- player local de 45 segundos com 18 estados e controles de reprodução, capítulos, range, setas e teclado;
- quatro grupos de evidência renderizados a partir do mesmo array `DEMO_STEPS`, evitando divergência entre roteiro e storyboard;
- selos que combinam contagens dinâmicas dos catálogos com o snapshot reproduzível da suíte;
- galeria dos acessórios usando diretamente as camadas pixel-art de `src/content/style.css`, sem substituição por emoji;
- laboratórios separados para sprite normal/liso, boca, os **31** acessórios e subpets com apelido, corpo, olhos e sete ações;
- pausa ao ocultar a aba e respeito a `prefers-reduced-motion`;
- breakpoints desktop, tablet e móvel sem rolagem horizontal.

Os cartões de evidência são cenas HTML/CSS, não capturas antigas nem um vídeo fictício. O JavaScript os gera localmente a partir do roteiro e mantém catálogos, capítulos e contadores sincronizados.

---

## 10. Validação local

```powershell
node --check src/shared/catalog.js
node --check src/content/content.js
node --check src/popup/popup.js
node --check src/background/background.js
node --test tests/*.test.js
node tests/runtime-smoke.mjs
```

Os **164 testes** cobrem estado padrão, schema v5 e migração de saves (sem XSS de missão/streak, sem poluição de protótipo), quatro modelos, **nove rostos**, sete skins, cor independente dos olhos, curva de nível, missão diária (14 tipos, incl. balões/keepy), catálogo/CSS dos acessórios, chapéus sem recorte, composição das camadas, trajes profissionais temporários, corpo estático e pernas isoladas, modo liso, boca opcional/emoções, pesca, sub-pets, documentação interativa, referências do popup (studio/status×4/summon/minimal), manifest, isolamento de keyframes, invalidação do contexto MV3, bfcache/`lastError`, AudioContext pós-gesto, allowlist de mensagens, sites bloqueados seguros, save coalesce, extras kick/keepy/superdance, **100% das ações no `_handleAction`**, ownership da bola no pé direito, babinha/escala do balão, **`petVisible`/`clawdHasSavedPosition`**, harmonia/qualidade-fluida, validação-completa (combo/focusin/skins), pixel-fx e name-tag, e reconciliação de reload. O contrato da vitrine exige 18 etapas, todos os IDs consumidos pelo JavaScript, integração com os catálogos e ausência de dependências remotas. O smoke test executa o Edge/Chromium em perfil isolado e valida 4/4 modelos, 8/8 rostos, acessórios, estúdio pixel/liso, boca, 12 profissões, ações do catálogo (**30**), pesca, popup, subpet com **7** interações e três reloads sem erros ou duplicação. Gate estático: `node tests/tools/validate-ecosystem.mjs`. A validação manual complementar deve incluir gestos físicos de touch, export/import e viagem cross-tab entre janelas reais.

### Segurança (resumo)

- Mensagens runtime: `clawdValidateRuntimeMessage` / valores via `clawdSanitizeConfigValue` e `clawdSanitizeSettingValue`;
- Migração: `clawdAssignPlain`, clamp numérico, missão reconstruída pelo catálogo;
- Sites bloqueados: `clawdHostIsBlocked` (host exato ou subdomínio);
- Áudio: `_bindAudioUnlock` — sem `AudioContext` até gesto;
- Cleanup DOM: `CLAWD_DOM_CLEANUP_SELECTORS` alinhado entre content e background.

---

## 10. Novidades v3.6 / v3.7

### v3.6 — Props, Studio, Personalidade, A11y

| Feature | Detalhe técnico |
|---------|----------------|
| **CLAWD_TIMINGS** | Objeto em `catalog.js` com 8 constantes (`SUBPET_INTERACTION_MS: 20000`, `STAT_DECAY_MS`, `STORAGE_DEBOUNCE_MS`, `PARTICLE_MAX: 18`, `SETTLE_EPS_PX: 0.5`, `DOUBLE_CLICK_WINDOW_MS: 220`, `RANDOM_ACTION_MS: 18000`, `DUO_SCENE_MS: 22000`). Elimina magic numbers em `content.js` e `popup.js`. |
| **Props animados (12)** | Cada profissão tem um `<div class="profession-prop ...">` no template. Keyframes: `clawd-chef-stir`, `clawd-cursor-blink`, `clawd-boot-tap`, `clawd-bobber`, `clawd-note-float`, `clawd-glint`, `clawd-smoke-puff`, `clawd-steam`. Opacidade 0 por padrão; ativados via `.cooking`, `.typing`, `.keepy-uppy`, etc. |
| **Studio in-page** | `openStudio()` injeta painel flutuante arrastável; `?detached=1` abre em janela popup separada. |
| **Personalidade adaptativa** | `S.personality.playful/lazy/bold` lidos em `_scheduleInteraction()` e `_decayStats()` para ajustar intervalo e velocidade de decay. |
| **A11y live region** | `<div role="status" aria-live="polite" class="clawd-sr-only">` em `#aic-clawd-node`; atualizado em `updateEmotion()`. CSS `.clawd-sr-only`: `position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0,0,0,0)`. |
| **SubPet RAF guard** | `_loop()` do SubPet verifica `document.body.contains(this._node)` antes de continuar; termina silenciosamente ao detectar nó removido. |

### v3.7 — Animações, Partículas e Interações

| Feature | Detalhe técnico |
|---------|----------------|
| **Hover pixel-art** | `#aic-clawd-node:not(.smooth):not(.dragging):hover .pet-body { filter: brightness(1.07) drop-shadow(...); transition: filter 0.18s ease; }` — GPU-friendly via `filter`. |
| **Click ring** | `.pressing::after` com `@keyframes clawd-click-ring` (scale 0.3→2.4, opacity 0.75→0, 0.42s). Disparado automaticamente pela classe `.pressing` que já existia. |
| **Speed lines** | `.running:not(.aic-reduced-motion)::before` com `@keyframes clawd-speed-lines` (translateX 0→-16px, 0.22s linear infinite). |
| **Walk dust trail** | `_spawnWalkDust(2)` chamado com 22% probabilidade por frame dentro do `_doAutoWalk()` RAF step. O método já tem throttle interno de 280ms — sem risco de over-spawn. |
| **Partículas emocionais** | Adicionadas em `updateEmotion()`: joyful→rosa, ecstatic→dourado, peppy→azul, sad→azul. Respeitam `noParticles`, `performanceMode` e `_reducedMotion`. |
| **Ripple botões popup** | `pulseStatButton()` adiciona classe `stat-ripple` → `::after` com `clawd-btn-ripple` (scale 0.2→2.8, 0.38s). |
| **XP level-up flash** | Em `renderHeader()`, ao detectar mudança de nível, aplica `xp-levelup-flash` na `.stat-fill` da barra de XP (`clawd-xp-levelup`, brightness 1→2→1, 0.55s). |
| **Skin animations** | `glow`: `clawd-skin-glow-pulse` 2.4s ease-in-out (brightness + cyan drop-shadow). `robot`: `clawd-skin-robot-scan` 2s steps(2) (brightness step). Ambos usam `:not(.aic-reduced-motion)` no seletor. |
| **Face animations** | `sparkle`: `clawd-face-sparkle-twinkle` 1.6s nos olhos. `heart`: `clawd-face-heart-pulse` 1.2s scale no coração. Idem reduced-motion guard. |
| **Ambient FX (movimento)** | `_spawnAccessoryMotionFx()` dispara faíscas curtas ao **andar/correr/planar/dançar** ou equipar acessório — não há timer de loop idle; `noAmbientSparks` desliga faíscas de movimento. |
| **Bola pé direito** | `.pet-ball { left: 48px }` + chuteira `left: 42px`; kick/roll/doPlay para a direita; sem `drop-shadow` blur; contador `.aic-juggle-count` à direita. |
| **v3.7.3 UX** | `petVisible` no estado; `summonPetToTab` no SW; `minimalMode` → `.aic-minimal`; `clawdHasSavedPosition()` rejeita `{0,0}`; spawn usa `clawdDefaultPositionCoords(startCorner)`. |
| **Validação** | Suíte **187/187** · v3.8.0 (i18n, Trello, layering, fluidez, polish cross-tab/SFX/animações). |
| **Fluidez pet↔subpet** | `clawdEaseInOutCubic` em walk/run; `_pulseReact` ecoa jump/dance/bath/happy; micro-idle do subpet; walk CSS `ease-in-out`; anticipação de pulo; duo ~72% chance; timings mais vivos. |
| **Cross-tab / SFX** | `_isActiveHost` + `_crossTabHidden`; despawn cancelável; beep/fala/partículas só no host; sem eco wake/cheer/dblclick. |

---

*Documentação Técnica — Claw'd · atualizada em 22/07/2026*
