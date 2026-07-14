# 📖 Claw'd — Documentação Técnica

> Documentação de arquitetura, código e funcionamento interno da extensão.
> Complementa a [documentação interativa](./docs/index.html), o [README](./README.md) (visão geral), o [MANUAL.md](./MANUAL.md) (uso) e o [MELHORIAS.md](./MELHORIAS.md) (roadmap v3).

---

## 1. Visão Geral

O **Claw'd** é uma extensão Chrome (Manifest V3) que injeta um mascote pixel-art interativo em qualquer página. Não usa frameworks nem dependências externas: é 100% Vanilla JS + CSS. O renderizador padrão usa células de 4×4px em `box-shadow`; o modo liso ativa uma segunda silhueta CSS angular e contínua, sem grade ou textura. Ambos compartilham estados, emoções, acessórios e animações com keyframes isolados pelo prefixo `clawd-`.

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
│   ├── index.html             # Vitrine e laboratório interativo
│   ├── showcase.css           # Layout responsivo sem dependências externas
│   └── showcase.js            # Previews e catálogos vivos
├── tests/
│   ├── catalog.test.js        # Contratos de estado, arte e mecânicas
│   ├── extension.test.js      # Manifest, popup, docs e ciclo de reload
│   └── runtime-smoke.mjs      # Smoke real em Edge/Chromium + reload MV3
├── README.md                  # Visão geral e instalação
├── DOCUMENTACAO.md            # Este arquivo
├── MANUAL.md                  # Manual do usuário
└── MELHORIAS.md               # Especificação das melhorias v3
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

Antes e durante esse ciclo, todas as chamadas a `chrome.runtime`, `chrome.storage` e ao Port cross-tab passam por guardas de contexto. Se um reload invalidar o ambiente MV3, callbacks tardios usam fallback, a instância cancela timers/listeners e remove seu DOM sem voltar a chamar APIs expiradas. Um heartbeat de 500 ms cobre também contextos invalidados quando nenhum callback está pendente.

**DOM criado (`createNode`):**

```html
<div id="aic-clawd-node">              <!-- container posicionado (left/top) -->
  <div class="speech-bubble">          <!-- balão de fala -->
  <div class="pet-body">
    <div class="sprite-stack">         <!-- flip horizontal acontece aqui -->
      <div class="pixel-sprite">       <!-- renderizador pixel em box-shadow -->
      <div class="smooth-sprite">      <!-- renderizador angular contínuo -->
      <div class="accessory">          <!-- camada cosmética compartilhada -->
      <div class="emotion-face">       <!-- piscada e boca em camada própria -->
    </div>
    <div class="name-tag">             <!-- nome do pet -->
  </div>
  <div class="pet-ball">               <!-- bola (profissão jogador) -->
  <div class="ground-shadow">          <!-- sombra no chão -->
</div>
```

A separação `node` (posição) → `sprite-stack` (flip) → renderizador visual (animação) evita conflito de `transform` entre camadas. O nó recebe `data-clawd-owned="true"` e `all: initial`; seletores críticos são escopados em `#aic-clawd-node` para impedir que estilos genéricos da página, como `.pixel-sprite` ou `.name-tag`, contaminem a extensão.

**Máquina de estados (`setState`):**

| Estado | Classe CSS | Trigger |
|--------|-----------|---------|
| `idle` | (nenhuma) | padrão |
| `happy` | `.happy` | clique/carinho |
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
- **Clique/carinho**: estado `happy` + partículas emoji + `+5 XP`;
- **Scroll**: estado `excited` por ~900ms;
- **Mousemove**: `lookAtCursor()` aplica `perspective + rotateX/Y` limitado a ±12° (efeito 3D);
- **Bola** (jogador): `kickBall()` — animação de chute, `+10 XP`.

**Gamificação:**

- `addXp(amount)` → nível = `floor(xp / 50) + 1`; level up dispara balão, partículas em dose dupla e estado excited;
- XP persistido em `clawdState.xp`.

**Contexto de página (`_detectPageContext`):**

`_contextMap` mapeia profissão → lista de fragmentos de hostname. Se a URL casa, o pet mostra mensagem da profissão (`_profMessages`) após 2s; jogador também comemora com partículas.

### 3.3 Estilo — `style.css`

- **Pixel-art**: o corpo é um único elemento com dezenas de `box-shadow` de 4×4px; a cor principal vem da CSS var `--agent-color`;
- **Renderização adaptativa**: deslocamento e sub-pet usam `requestAnimationFrame`; o content script mede a cadência real em 30 frames e registra `data-refresh-rate`, sem impor 60 Hz artificialmente;
- **Walk cycle**: o frame padrão é estático e reproduz o modelo compacto vermelho; `clawd-pixel-walk` só é ativado em `walking`/`running` e `clawd-pixel-keepy` durante a embaixadinha;
- **Emoções em camadas**: o corpo base não é substituído; `emotion-face` desenha piscada/boca, `emotion-badge` exibe o emoji e `.mouth-hidden` remove somente a boca;
- **Escala**: `--agent-scale` compõe com todos os keyframes (evita sobrescrever `transform`);
- **Modificadores**: `.smooth` alterna para a silhueta contínua; `.outlined` aplica contorno; `[data-acc-head]`/`[data-acc-face]` desenham 14 acessórios com variantes pixel-art e lisas;
- **Chapéus responsivos**: os 7 itens de cabeça têm detalhes próprios nos dois renderizadores e `clawd-headwear-step` acompanha apenas `walking`/`running`, sem animação ociosa;
- **Isolamento**: todos os keyframes usam namespace `clawd-`, evitando colisões com `walk`, `sleep`, `fish` e outras animações comuns do site;
- Velocidade de animação ajustada pelas variáveis `--clawd-step-duration` e `--clawd-run-duration`, derivadas de `animSpeed`.

### 3.4 Popup — `popup.html/js/css`

UI dark com header (preview do pet, status, barra de XP) e 8 abas: **Aparência**, **Profissão**, **Comportamento**, **Ações**, **Pets**, **Loja**, **Conquistas** e **Configurações**. A aba Conquistas também exibe a missão diária, progresso e resgate.

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
  name: "Claw'd",          // nome exibido no name-tag
  color: '#c71515',        // cor principal (--agent-color)
  scale: 1.5,              // 0.8–3.0 (--agent-scale)
  animSpeed: 1,            // 0.5–3.0
  showSpeech: true,        // balões de fala
  showMouth: true,         // sorriso e expressões da boca
  autoWalk: true,          // passeio automático
  sleepEnabled: true,      // dormir por inatividade
  profession: 'idle',      // idle | footballer | tutor | engineer | musician | chef | ninja | fisher
  smooth: false,           // visual liso
  outline: false,          // contorno
  accessoryHead: 'none',   // slot de cabeça
  accessoryFace: 'none',   // slot de rosto/corpo
  position: { x, y },      // última posição arrastada
  xp: 0,                   // gamificação
  subpets: {
    active: null,
    unlocked: [],
    names: {},             // apelido por espécie
    colors: {},            // cor do corpo por espécie
    eyeColors: {}          // cor dos olhos por espécie
  }
}
```

O estado inicial mantém o sprite compacto vermelho de referência (`color: #c71515`, `skin: normal`, `smooth: false`, `accessoryHead/Face: none`). O sistema não fixa 60 FPS: animações CSS e `requestAnimationFrame` acompanham a cadência do navegador e o modo de baixo refresh desliga apenas efeitos decorativos.

Escrita incremental via `save()`/`persist()` (read-modify-write). O schema ganha `schemaVersion`, `stats`, `game`, `favorites`, `subpets` e `daily` — com migrador incremental. A missão diária é derivada da data, tem progresso limitado ao alvo e recompensa idempotente.

Sub-pets têm `subpets.names`, `subpets.colors` e `subpets.eyeColors` indexados pela espécie. A classe `SubPet` deriva automaticamente uma cor de sombra do corpo para manter profundidade e aplica os olhos como canal `K` independente. O popup envia `setSubpetColor` e `setSubpetEyeColor` para atualização ao vivo; saves antigos recebem `eyeColors: {}` pela migração sem perder os demais dados.

O ciclo do sub-pet usa estados explícitos: `following`, `sleeping`, `waking`, `playing`, `cuddling`, `racing`, `exploring`, `spinning`, `celebrating`, `special`, `vanishing`, `splitting` e `fire`. O estado atual também fica em `data-state`, uma fronteira pública de diagnóstico que não expõe o objeto do content script ao mundo JavaScript da página. `sleep()` e `wakeUp()` cancelam timers opostos; clique/teclado e qualquer uma das seis ações manuais despertam o subpet antes de interagir. Timers de ação ficam registrados e são cancelados por `destroy()`.

Cada espécie implementa `special`: cachorro late/busca, gato pode ignorar, pássaro rodopia, coelho salta, dinossauro corre, dragão solta fogo, fantasma desaparece e slime se divide. As animações preservam o flip horizontal por variável CSS e respeitam `prefers-reduced-motion`.

No modo liso, o `pixel-sprite` fica oculto e sem `box-shadow`; o `smooth-sprite` assume o mesmo desenho angular com uma cabeça contínua, braços, base e quatro pernas retas. Não há `background-image`, células internas, blur, cantos arredondados de slime ou textura de grade. Olhos, piscadas e a boca ficam em uma camada independente: o sorriso usa apenas traço curvo transparente e um detalhe mínimo de língua, sem os antigos blocos branco/preto; `showMouth: false` oculta essa camada sem afetar as demais emoções. Os 14 acessórios e as skins especiais também têm variantes contínuas. Os 7 chapéus usam artes, reflexos e volumes próprios, e acompanham o passo apenas durante deslocamento. O Pescador cria um lago interativo, uma vara/linha e uma janela de fisgada: o clique no lago captura antes do fallback automático.

---

## 6. Decisões de Arquitetura

| Decisão | Motivo |
|---------|--------|
| Renderizador CSS duplo | Pixel-art fiel no padrão e modo liso sem grade, ambos sem assets binários |
| Estado = classe CSS | Anima via GPU, sem JS por frame (exceto auto-walk) |
| CSS vars para cor/escala | Mudança instantânea sem reflow nem re-render |
| Storage único (`clawdState`) | Leitura atômica no boot da página, simples de migrar |
| Sem frameworks | Injeção leve em toda página; auditável; sem supply-chain risk |
| `z-index: 2147483647` | Garante o pet acima de qualquer layout |
| `destroy()` + boot token | Evita listeners, timers e instâncias duplicadas após reinjeção |
| Guardas de contexto MV3 | Encerram a instância antiga sem exceções após reload da extensão |
| Reconciliação com healthcheck estável | Exige DOM conectado, tolera aba interna ativa e repete injeções transitórias sem duplicar o pet |

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
```

**Convenções:**

- Prefixo `aic-` em todos os IDs injetados na página (evita colisão);
- Métodos privados da classe com prefixo `_`;
- Toda config nova deve: (1) ter default no `constructor`, (2) ser tratada no `applyConfig`, (3) ser incluída na lista `keys` do `loadState`, (4) ganhar controle no popup.

---

*Documentação Técnica — Claw'd · atualizada em 2026*

## 9. Validação local

```powershell
node --check src/shared/catalog.js
node --check src/content/content.js
node --check src/popup/popup.js
node --check src/background/background.js
node --test tests/*.test.js
node tests/runtime-smoke.mjs
```

Os **30 testes** cobrem estado padrão, migração de saves legados, curva de nível, missão diária, catálogo/CSS dos 14 acessórios, os 7 chapéus refinados, sprite e pernas, modo liso, boca opcional/emoções, pesca, sub-pets, documentação interativa, referências do popup, manifest, isolamento de keyframes, invalidação do contexto MV3 e reconciliação de reload. O smoke test executa o Edge/Chromium em perfil isolado e valida em runtime os dois renderizadores, todos os acessórios, alternância e persistência da boca, movimento dos chapéus, as 8 profissões, as 14 ações, popup (8 abas, loja e conquistas), subpet com apelido, corpo `#4a90e2`, olhos `#33ff99`, seis interações e três reloads sem erros ou duplicação. A validação manual complementar deve incluir gestos de arraste/touch, export/import e viagem cross-tab entre janelas reais.
