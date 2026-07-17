# 🚀 Claw'd — Registro de entregas v3.2, v3.3 e v3.6

> Documento histórico das entregas das versões v3.2, v3.3 e v3.6 (não é roadmap aberto).
> Os blocos principais já estão implementados; cada seção preserva objetivo, comportamento, modelo de dados e critérios para manutenção.

---

## v3.6 — Polish Completo: Animações, Performance e A11y (2026-07-17)

### Entregas v3.6

| Módulo | Entrega | Tipo | Estado |
|--------|---------|------|--------|
| **CSS** | Props de profissão animados: chef-stir, cursor-blink, boot-tap | feature | ✅ |
| **CSS** | Hover glow reativo em modo Smooth (`--clawd-glow`) | feature | ✅ |
| **CSS** | `.clawd-sr-only` (screen-reader only visually hidden) | a11y | ✅ |
| **JS** | `CLAWD_TIMINGS` centralizado em catalog.js + export | perf | ✅ |
| **JS** | SubPet RAF guard — `document.body.contains()` antes de tick | bug fix | ✅ |
| **JS** | SubPet interação ajustada por `personality.playful/lazy` | feature | ✅ |
| **JS** | `--clawd-glow` sincronizado com cor primária do pet | feature | ✅ |
| **JS** | Live region `aria-live="polite"` para mudanças de emoção | a11y | ✅ |
| **HTML** | `stat-feed-btn` — saciedade clicável para feed rápido | UX | ✅ |
| **Tests** | 4 novos testes de integridade (TIMINGS, props, A11y, feed) | qualidade | ✅ |
| **Docs** | CHANGELOG, README, MELHORIAS, VALIDACAO, docs/index.html | docs | ✅ |

### Resumo técnico

- **Magic numbers eliminados**: `28000`, `350`, `60000`, `18`, `0.5`, `25000`, `32000` → `CLAWD_TIMINGS.*`
- **Props animator**: engineer + footballer sem props visuais agora têm keyframes dedicados; chef pan stir soma ao steam existente
- **Hover glow**: `drop-shadow(0 0 5px --clawd-glow)` + `brightness(1.06)` no `.smooth:hover` — derivado de hex color `+70` (44% alpha)
- **RAF orphan guard**: `cancelAnimationFrame + return` se `!document.body.contains(node)` no tick do SubPet
- **A11y**: `srStatusNode` atualiza textContent com label de emoção legível em PT-BR ao mudar de estado
- **Suite**: 123 → 130 → **150/150** contratos automatizados

---

## v3.3 — Gamificação 2.0, Profissões & Acessórios (2026-07-16)

### Entregas v3.3

| Módulo | Entrega | Estado |
|--------|---------|--------|
| **M3** | Gamificação 2.0: combo, desafio semanal, 13 conquistas, 5 quests | ✅ Concluído |
| **M4** | 4 profissões, 10 acessórios, slot body, schema v5 | ✅ Concluído |
| **M5** | 4 ações, 8 keyframes, partículas sazonais, detecção de contexto | ✅ Concluído |
| **M6** | Docs sync, personality, customSpeech, particleColor, volumes | ✅ Concluído |

### Novidades principais

- **Slot body**: terceiro slot de acessório (ribbon, wings, cape, armor); CSS pixel-art completo; rendering condicional de has-wings/has-cape/has-armor
- **Sistema de combo**: janela 10s, balão a ×3, XP ×(1+0.15×n) a ×5, conquista combo_king
- **Desafio semanal**: 12 desafios por hash ISO week, alarm background semanal, claim com XP+badge
- **Traços de personalidade**: 5 dimensões (playful, lazy, curious, social, foodie) afetam idle e fala
- **Detecção de contexto**: 11 categorias de sites (coding, music, video, shopping, social, news, email, gaming, health, learning, idle)
- **Partículas sazonais**: neve (dez/jan), folhas (out), flores (abr), vagalumes (jun/jul)
- **Marcos de nível**: party_hat (5), monocle (10), wings (15), crown (20) — automáticos

### Roadmap v3.4

| Fase | Foco | Estado |
|------|------|--------|
| Docs sync | Sincronizar documentação com estado vivo (loop tick 6) | ✅ Concluído (81/81) |
| Micro-animações | Variações idle (look/scratch/taptoe), frames pixel-art para flip/meditate/electric/nap | ✅ (tick 2) |
| UX onboarding | Overlay de boas-vindas na primeira abertura do popup | Parcial / em produto |
| Interações | Atalhos Alt+F/H/P/Z, reação ao scroll, duplo-clique, retorno de aba, click frenético | ✅ |
| Summon elaborado | Animação de queda com bounce ao injetar o pet | Opcional |

---

> **Registro v3.2 abaixo — histórico de implementação do ciclo anterior.**

**Base atual:** `content.js` (classes `ClawdCompanion` e `SubPet`), `popup.js/html/css`, `background.js` (service worker MV3), catálogo compartilhado, persistência via `chrome.storage.local` (chave `clawdState`) e [vitrine interativa](../index.html).

**Marco v3.2 — Estúdio pixel-art:** quatro silhuetas (`classic`, `mini`, `claws`, `guardian`) × quatro rostos, olhos independentes e skins combináveis. O corpo virou uma camada estática; apenas as pernas mudam de frame quando o pet realmente se desloca ou chuta. Popup, runtime, modo liso e documentação usam o mesmo catálogo visual.

**Polish 15/07/2026 — Sub-pets unificados + PNG:** `CLAWD_SUBPET_SPRITES` no catálogo (grade 12×10 @ 4px, frames idle/walk/sleep), PNGs literais do sheet em `src/shared/sprites/subpets/` via `web_accessible_resources`, fallback `box-shadow` sob paleta custom, animações no wrapper `.subpet-motion`, especiais reforçados; crops via `tests/tools/crop-literal-sprites.mjs` (`make-sprites` não sobrescreve o pacote sem `WRITE_PKG_SPRITES=1`).

**Polish 17/07/2026 — Pixel-fx + name-tag + qualidade:** camada `.pixel-fx` com poses `steps(1)` (aceno, andar, pulo, dança, rugido, banho, etc.); name-tag com título de nível + nome (fix do `textContent` que apagava spans); FX de acessório/ambient; volumes Ações/Ambiente; suíte alinhada ao gate vivo (**130+** contratos).

**Polish 15/07/2026 — Segurança, performance e integridade:** allowlist de mensagens, sanitização de storage/DOM, bfcache sem `Unchecked runtime.lastError`, AudioContext só após gesto, particles com teto, heartbeat 2,5 s, sites bloqueados por host/subdomínio, ações principais e **7 ações** de sub-pet; suíte histórica **65/65** (superseded — ver polish 16/07).

**Polish 16/07/2026 — Loop validation (ticks 1–6):** segurança endurecida; animações/idle; **30 ações** no popup + extras kick/keepy/superdance; gamificação com balões/keepy (28 conquistas, 14 quests); save coalesce / caps; docs + showcase alinhados — suíte **81/81**.

**Polish 16/07/2026 — Padrões + profundidade:** contexto de página SSOT (`CLAWD_PAGE_CONTEXTS` / reset para `idle`); **12** desafios semanais; reações em 11 categorias; `customSpeech` ponderado por `social`; idle actions ponderadas por traços; onboarding com contagens reais (31 acessórios / 34 conquistas); suíte de harmonia da fase.

**Polish 15/07/2026 — Presença viva:** `showMouth: true` por padrão; cenas duo pet↔subpet; dwell/page-engage (`look-around`, `page-peek`, `tab-greet`, `soft-land`).

---

## Índice

1. [⭐ Sistema de Favoritos](#1--sistema-de-favoritos)
2. [🐕 Sub-Pets (pets do pet)](#2--sub-pets-pets-do-pet)
3. [🎬 Novas Animações, Ações e Acessórios](#3--novas-animações-ações-e-acessórios)
4. [😊 Status e Emoções do Pet](#4--status-e-emoções-do-pet)
5. [💼 Melhoria das Profissões e Interações](#5--melhoria-das-profissões-e-interações)
6. [🎮 Gamificação e Mecânicas](#6--gamificação-e-mecânicas)
7. [🌐 Passeio entre Abas (Cross-Tab)](#7--passeio-entre-abas-cross-tab)
8. [⚙️ Personalizações e Configurações](#8--personalizações-e-configurações)
9. [🗺️ Roadmap de Implementação](#9--roadmap-de-implementação)

---

## 1. ⭐ Sistema de Favoritos

### Objetivo
Permitir favoritar **qualquer item do sistema** — ações, profissões, acessórios, cores, apelidos, sub-pets — com uma estrelinha ⭐. Itens favoritados ganham **prioridade**: aparecem primeiro nas listas do popup e têm maior peso nos comportamentos aleatórios do pet.

### Comportamento
- Toda opção do popup (cards de acessório, profissão, ação, swatch de cor, apelidos salvos) ganha um botão ☆ no canto superior direito do card. Clicado, vira ⭐ e o item é favoritado.
- Itens favoritados são reordenados para o **topo da sua grid** com um leve destaque visual (borda dourada + glow suave).
- **Prioridade comportamental**: quando o pet escolhe uma ação/fala aleatória (aceno, dança, mensagens), itens favoritados recebem peso 3× no sorteio.
- **Apelidos**: o campo de nome ganha histórico — cada nome usado é salvo; favoritar um apelido faz o pet alternar entre apelidos favoritos ao falar de si mesmo.
- Favoritar uma cor a adiciona a uma linha "Cores favoritas" acima da grid padrão.

### Modelo de dados (`clawdState.favorites`)
```javascript
favorites: {
  actions:     ['dance', 'wave'],          // ids das ações
  professions: ['footballer'],
  accessories: ['sunglasses', 'cap'],
  colors:      ['#3498db', '#e84393'],
  nicknames:   ["Claw'd", 'Pixel'],
  subpets:     ['dragon']
}
```

### Alterações por arquivo
| Arquivo | Mudança |
|---------|---------|
| `popup.html` | Botão `.fav-star` em cada card/swatch; seção "Favoritos" no topo de cada aba |
| `popup.css` | Estilos `.fav-star`, `.favorited` (borda dourada), animação de "pop" da estrela |
| `popup.js` | `toggleFavorite(category, id)`, reordenação das grids, persistência |
| `content.js` | `getWeightedRandom(pool, favorites)` — sorteio ponderado 3× para favoritos |

### Critérios de aceite
- [x] Qualquer item favoritável exibe ☆/⭐ e persiste após fechar o navegador.
- [x] Favoritos aparecem primeiro nas grids.
- [x] Ações favoritas ocorrem visivelmente com mais frequência no comportamento aleatório.

---

## 2. 🐕 Sub-Pets (pets do pet)

### Objetivo
O Claw'd pode **adotar seus próprios pets** em pixel-art — dos convencionais (cachorro, gato, pássaro, coelho) aos fantásticos (dinossauro, dragão, fantasma, slime) — que o seguem pela tela e interagem com ele.

### Catálogo inicial
| Sub-pet | Desbloqueio | Interação especial |
|---------|-------------|--------------------|
| 🐶 Cachorro | Nível 2 | Busca a bola quando o Claw'd chuta |
| 🐱 Gato | Nível 3 | Dorme junto; às vezes ignora o Claw'd (é um gato) |
| 🐦 Pássaro | Nível 4 | Voa em círculos sobre o Claw'd; pousa na cabeça dele |
| 🐰 Coelho | Nível 5 | Pula junto nas comemorações |
| 🦖 Dinossauro | Nível 7 | Corre em disparada pela tela; rugido com balão "RAWR!" |
| 🐉 Dragão | Nível 10 | Cospe fogo pixel-art; carrega o Claw'd voando no passeio |
| 👻 Fantasma | Nível 12 | Atravessa elementos da página; aparece/some |
| 🟢 Slime | Nível 15 | Se divide em dois mini-slimes ao receber carinho |

### Comportamento
- **Renderização**: cada sub-pet é um nó próprio (`.aic-subpet`). Por padrão usa o PNG de `src/shared/sprites/subpets/<id>.png`; com cor de corpo/olhos customizada (ou na piscada) cai no `box-shadow` gerado a partir dos frames do catálogo. Escala ~40–55% do pet principal via `--subpet-scale`.
- **Follow**: o sub-pet segue o Claw'd com atraso suave (lerp de posição, ~300ms atrás), inclusive no auto-walk e no drag.
- **Interações pet↔pet** (sorteadas a cada ~30s quando ambos idle):
  - `play`: pulam e brincam juntos;
  - `cuddle`: encostam e sobem corações;
  - `nap`: dormem juntos (Zzz sincronizado);
  - `race`: apostam corrida até a borda da tela;
  - `explore`: o subpet visita outra região visível da página;
  - `spin`: executa um rodopio curto com partículas;
  - `celebrate`: pet e subpet comemoram juntos;
  - especial por espécie (tabela acima).
- **Estados próprios**: o subpet tem `following / playing / cuddling / racing / exploring / spinning / celebrating / special / sleeping / waking`; o atributo `data-state` mantém o diagnóstico observável sem romper o isolamento MV3.
- O usuário pode ter **1 subpet ativo** por vez; a aba **🐕 Pets** mostra nível, favorito, apelido e personalizações independentes de corpo e olhos.
- Um painel de **7 ações ao vivo** oferece carinho, brincar, explorar, rodopiar, comemorar, abraço e habilidade especial. A ação acorda o subpet antes de começar.

### Modelo de dados
```javascript
subpets: {
  active: 'dragon',                    // ou null
  unlocked: ['dog', 'cat', 'dragon'],
  names: { dog: 'Rex', dragon: 'Fumaça' },
  colors: { dog: '#4a90e2' },
  eyeColors: { dog: '#33ff99' }
}
```

### Alterações por arquivo
| Arquivo | Mudança |
|---------|---------|
| `content.js` | Nova classe `SubPet` (sprite, follow, estados, interações); instanciada por `ClawdCompanion` |
| `style.css` | Keyframes isolados `clawd-subpet-*`, direção preservada e movimento reduzido |
| `popup.html/js` | Aba "🐕 Pets", corpo/olhos, apelido e painel de sete ações |
| `catalog.js` | `CLAWD_SUBPET_SPRITES` + `image.url`, `CLAWD_SUBPET_ACTIONS`, defaults e migração de `eyeColors` |
| `src/shared/sprites/subpets/*.png` | Bitmaps literais do sheet (`crop-literal-sprites.mjs`; `make-sprites` não sobrescreve sem `WRITE_PKG_SPRITES=1`) |

### Critérios de aceite
- [x] Sub-pet segue o Claw'd suavemente em qualquer página.
- [x] Sete interações manuais e oito habilidades por espécie são observáveis.
- [x] Apelido, corpo e olhos persistem de forma independente.
- [x] Desbloqueio por nível funciona e persiste.

---

## 3. 🎬 Novas Animações, Ações e Acessórios

### 3.1 Novas animações de estado
| Animação | Trigger | Descrição |
|----------|---------|-----------|
| 🤸 Cambalhota | Ação manual / level up | Rotação 360° com squash & stretch |
| 😋 Comer | Ação "Alimentar" | Mastiga um petisco pixel; migalhas caem |
| 🎉 Comemorar | Gol, level up, conquista | Pula com confete pixel-art |
| 🥱 Bocejar | 15s antes de dormir | Transição idle → sleeping (antecipação) |
| 🙈 Tímido | Cursor parado sobre ele por 3s | Cobre os olhos com as patas |
| 😡 Birra | Ignorado por 2+ min com fome | Bate o pé, balão "Hmpf!" |
| 🕺 Dança melhorada | Ação "Dançar" | 3 passos distintos em sequência (não só shake) |
| 🏃 Corrida | Fuga do cursor / race com sub-pet | Sprint com poeirinha atrás |

### 3.2 Novas ações (aba ⚡ Ações)
- 🍖 **Alimentar** — reduz fome, +3 XP, animação de comer;
- 🤸 **Cambalhota** — acrobacia com partículas;
- 🎾 **Brincar** — joga uma bolinha genérica (independente da profissão);
- 📸 **Pose** — pet faz pose por 3s (bom para screenshot);
- 🫧 **Banho** — bolhas de sabão sobem, pet fica "brilhando" por 1 min (+felicidade).

### 3.3 Acessórios — novos e melhorados
**Novos:**
| Acessório | Visual |
|-----------|--------|
| 🕶️ **Óculos de sol** | Lentes escuras com brilho no canto; deixa o pet com pose "cool" (idle mais lento e confiante) |
| 🎩 Cartola | Elegância clássica |
| 👑 Coroa | Desbloqueio no nível 20 |
| 🧣 Cachecol | Balança no vento durante o walk |
| 🎒 Mochilinha | Combina com a profissão Tutor |

**Melhorias nos existentes:**
- [x] Sobreposição correta no `sprite-stack`, acompanhando o corpo sem deslocar a sprite base;
- [x] **2 slots**: cabeça (boné/cartola/coroa) + rosto/corpo (óculos/laço/cachecol);
- [x] 7 chapéus redesenhados nos modos pixel-art e liso, com movimento somente em `walking`/`running`;
- [x] Descrições, dicas de desbloqueio e estado selecionado acessível no popup;
- Cores de acessório ajustáveis (CSS var `--acc-color`).

**Implementação do óculos de sol (`style.css`):**
```css
[data-accessory="sunglasses"] .accessory {
  /* lentes: 2 blocos 8×8 escuros + ponte + brilho */
  box-shadow:
    8px 8px 0 #111, 12px 8px 0 #111,     /* lente esq */
    24px 8px 0 #111, 28px 8px 0 #111,    /* lente dir */
    16px 8px 0 #333, 20px 8px 0 #333,    /* ponte */
    9px 9px 0 rgba(255,255,255,.55);     /* brilho */
}
```

### Critérios de aceite
- [x] Óculos de sol disponível na grid de acessórios e renderizando em todos os estados.
- [x] Dois slots de acessório simultâneos funcionais.
- [x] 5+ novas ações disparáveis pelo popup.

---

## 4. 😊 Status e Emoções do Pet

### Objetivo
Dar "vida interior" ao pet: um conjunto de medidores que evoluem com o tempo e determinam a **emoção atual**, visível no pet e no popup.

### Medidores (0–100)
| Medidor | Sobe com | Desce com |
|---------|----------|-----------|
| ❤️ Felicidade | Carinho, brincadeiras, ações favoritas | Ser ignorado, fome alta |
| 🍖 Saciedade | Ação "Alimentar" | Tempo (−1 a cada 5 min de navegação) |
| ⚡ Energia | Dormir | Ações, brincadeiras, auto-walk |
| 🧼 Higiene | Ação "Banho" | Tempo (lentamente) |

### Emoções derivadas
A emoção é calculada dos medidores e exibida como **badge flutuante** sobre o pet (emoji pequeno) + cor do name-tag:

```javascript
computeEmotion() {
  if (this.stats.energy    < 20) return 'sleepy';   // 🥱
  if (this.stats.hunger    < 25) return 'hungry';   // 🍖 (birra se < 10)
  if (this.stats.happiness > 80) return 'joyful';   // 🤩
  if (this.stats.happiness < 30) return 'sad';      // 😢
  return 'content';                                  // 🙂
}
```

- Emoções alteram o comportamento: `sad` reduz auto-walk e mensagens; `joyful` aumenta acenos e brincadeiras com o sub-pet; `hungry` faz o pet olhar para o usuário e mostrar balão pedindo comida.
- **Popup**: o header ganha 4 mini-barras (estilo Tamagotchi) ao lado da barra de XP.
- Decaimento processado no `startBehaviorLoop()` (tick de 60s) e persistido com timestamp para calcular decaimento offline ao reabrir (`lastStatsUpdate`).

### Modelo de dados
```javascript
stats: {
  happiness: 85, hunger: 60, energy: 90, hygiene: 75,
  lastStatsUpdate: 1770000000000
}
```

### Critérios de aceite
- [x] 4 medidores visíveis no popup e persistentes.
- [x] Emoção atual visível sobre o pet e mudando conforme os medidores.
- [x] Decaimento offline calculado corretamente ao reabrir o navegador.

---

## 5. 💼 Melhoria das Profissões e Interações

### 5.1 ⚽ Jogador — Embaixadinhas interativas
- **Embaixadinha jogável**: cada **toque na bola** dá um toque de embaixadinha imediato (`juggleTouch`), com a bola subindo em arco (`clawd-ball-pop`), som que sobe de tom e uma **bolha de contador ao vivo** sobre a bola. É um minijogo de ritmo: um *watchdog* derruba a bola se você demorar para o próximo toque, e a janela **encolhe conforme o combo cresce** — fica mais difícil e emocionante.
- **Combos e marcos** a cada 10 toques ("10! ⚽", "x2 COMBO! 🔥", "x5 LENDÁRIO! 🔥") com multiplicador de XP. Se a bola cair, ela rola e o pet corre atrás; o **recorde de embaixadinhas** é salvo (`_recordKeepy`) e vira conquista (Malabarista, Rei do Combo).
- **Duplo-clique = finalização**: chuta a gol encerrando a sequência atual como um **golaço** com bônus de XP proporcional ao combo. Trajetória em parábola com rotação e a "trave" pixel-art aparece na lateral.
- **Embaixadinha autônoma**: quando ocioso, o Jogador ainda treina sozinho (`startKeepyUppy`) — as duas modalidades nunca rodam ao mesmo tempo.
- Camisa de time: seletor de 8 cores de camisa (CSS var `--jersey-color`) na aba Profissão.

### 5.2 📚 Tutor — Desafios reais
- Em sites de distração (mapa `_contextMap.tutor`), após X minutos configuráveis, o pet mostra um **mini-desafio** num balão interativo: expressão rápida (`7 × 8 ?`) com 3 alternativas.
- Acertou: +8 XP + moedas; errou: o pet explica a resposta com bom humor.
- Animação nova: pet segura uma **plaquinha pixel-art** com a pergunta.

### 5.3 💻 Dev — Reações a código
- Em GitHub/Stack Overflow: pet "digita" num laptop minúsculo (nova animação `clawd-typing`, mãos alternando sobre o teclado);
- Balões contextuais: detecta a linguagem do repositório pela URL/DOM e comenta ("Python? 🐍 boa!");
- Easter egg: em páginas com erro 404, o pet aparece com lupa 🔍 "procurando a página".

### 5.4 Novas profissões
| Profissão | Visual | Comportamento |
|-----------|--------|---------------|
| 🎸 Músico | Violão pixel | Toca riffs em sites de música (Spotify/YouTube Music); notas musicais flutuam |
| 🧑‍🍳 Chef | Chapéu de chef | Em sites de receita, mexe uma panelinha; "alimentar" fica 2× mais eficaz |
| 🥷 Ninja | Faixa na cabeça | Se esconde atrás de elementos da página; aparece de surpresa |

### Critérios de aceite
- [x] Embaixadinhas com contador, erro ocasional e recorde persistido.
- [x] Desafios do Tutor funcionais com feedback de acerto/erro.
- [x] Animação de digitação do Dev em sites de código.

---

## 6. 🎮 Gamificação e Mecânicas

### 6.1 Refinos no XP
- Curva progressiva: `xpParaNível(n) = 50 × n^1.3` (em vez de 50 fixos) — evita níveis instantâneos no fim de jogo;
- Novas fontes de XP: alimentar (+3), banho (+4), embaixadinha recorde (+15), desafio do Tutor (+8), interação com sub-pet (+2), streak diário (+10);
- **Streak diário**: navegar com o pet ativo em dias consecutivos dá bônus crescente (dia 1: +10 … dia 7+: +50).

### 6.2 Moedas e lojinha 🪙
- Nova moeda **PixelCoins**, ganha junto com XP (≈1 coin a cada 5 XP) e em desafios;
- **Lojinha** no popup (nova aba 🛍️): compra de acessórios cosméticos, cores de camisa, skins de bola e itens de decoração (casinha, almofada onde o pet dorme);
- Itens comprados entram na grid de acessórios normalmente (e podem ser favoritados ⭐).

### 6.3 Conquistas 🏆
| Conquista | Condição |
|-----------|----------|
| Primeiro Carinho | 1º clique no pet |
| Artilheiro | 50 gols |
| Malabarista | 30 embaixadinhas seguidas |
| Zoológico | Desbloquear 4 sub-pets |
| Dorminhoco | Pet dormiu 100 vezes |
| Fashionista | Usar 8 acessórios diferentes |
| Explorador | Pet visitou 10 abas diferentes num dia |

- Notificação in-page (toast pixel-art) ao desbloquear; galeria de conquistas no popup com progresso.

### 6.4 Modelo de dados
```javascript
game: {
  xp: 340, level: 6, coins: 68,
  streak: { days: 3, lastDay: '2026-07-14' },
  achievements: { first_pet: true, striker: false, ... },
  counters: { goals: 12, keepyRecord: 23, sleeps: 40, tabsToday: 4 },
  inventory: ['sunglasses', 'jersey_blue', 'ball_gold']
}
```

### Critérios de aceite
- [x] Curva de XP progressiva sem quebrar saves antigos (migração: manter XP, recalcular nível).
- [x] Loja funcional com compra/equipar persistente.
- [x] 7+ conquistas com toast de desbloqueio.

---

## 7. 🌐 Passeio entre Abas (Cross-Tab)

### Objetivo
O pet **passeia entre as abas abertas**: sai por uma borda da tela numa aba e "chega" em outra, criando a ilusão de um único pet vivo no navegador — e não um clone por aba.

### Arquitetura
O `background.js` (service worker) vira o **coordenador central de presença**:

```
┌─────────┐   handshake    ┌────────────────────┐   spawn/despawn   ┌─────────┐
│  Aba A  │ ─────────────▶ │  background.js      │ ────────────────▶ │  Aba B  │
│(content)│ ◀───────────── │  "PresenceManager"  │ ◀──────────────── │(content)│
└─────────┘   estado/pos   └────────────────────┘    estado/pos      └─────────┘
```

1. **Registro**: cada content script se registra no service worker via `chrome.runtime.connect` (Port), informando `tabId` (o SW obtém via `sender.tab.id`).
2. **Aba anfitriã**: o SW mantém `hostTabId` — a única aba onde o pet está visível. As demais ficam com o pet oculto (ou mostram só "pegadas" 🐾 sutis, configurável).
3. **Viagem**:
   - A cada ~2–5 min (configurável), ou ao trocar de aba ativa, o SW decide uma viagem;
   - Na aba de origem: animação `clawd-travel-out` — o pet corre até a borda lateral e sai da tela; content envia `travelComplete`;
   - O SW escolhe a aba destino (preferindo a aba **ativa**; usa `chrome.tabs.query`), transfere o estado (posição Y, emoção, sub-pet, acessórios) e envia `spawnPet` com `direction: 'left'|'right'`;
   - Na aba destino: pet entra correndo pela borda oposta, com balão "Cheguei! 🧳".
4. **Aba ativa muda** (`chrome.tabs.onActivated`): se o pet não está na aba focada, após 10s ele "sente saudade" e viaja para ela.
5. **Resiliência**: se a aba anfitriã fechar (`chrome.tabs.onRemoved`), o SW respawna o pet imediatamente na aba ativa. Estado sempre espelhado no `chrome.storage.session` para sobreviver ao SW adormecer (MV3).

### Mensagens novas (protocolo)
```javascript
// content → SW
{ type: 'register' } | { type: 'travelComplete' } | { type: 'stateSync', state }
// SW → content
{ type: 'spawnPet', state, direction } | { type: 'despawnPet', direction } | { type: 'hidePet' }
```

### Configurações do usuário
- Toggle "🌐 Passear entre abas" (padrão: ligado);
- Frequência do passeio: raramente / às vezes / sempre que troco de aba;
- "Pegadas" nas abas sem pet: on/off.

### Critérios de aceite
- [x] Apenas 1 pet visível no navegador inteiro com o modo ligado.
- [x] Saída e chegada animadas pelas bordas, com estado preservado (emoção, acessório, sub-pet viajam juntos).
- [x] Fechamento da aba anfitriã não "mata" o pet.

---

## 8. ⚙️ Personalizações e Configurações

Nova aba **⚙️ Config** no popup, consolidando:

### Personalização
- **Modelos pixel-art**: Clássico fiel à referência, Mini, Pinças e Guardião;
- **Rostos e olhos**: Clássico, Brilho, Focado e Sonolento, com canal de cor independente;
- **Skins de corpo**: além de cor, formatos alternativos (orelhas caídas, rabo longo, robô);
- **Temas do name-tag**: claro / escuro / neon / invisível;
- **Sons** (ligado por padrão, desligável): bipes 8-bit sutis em ações (Web Audio API, volume ajustável); só após gesto do usuário na página;
- **Horário de silêncio**: intervalo em que o pet não fala nem anda (ex.: 09h–12h, foco);
- **Sites bloqueados**: lista de domínios onde o pet não aparece (ex.: banco, e-mail corporativo);
- **Posição inicial preferida**: canto da tela padrão ao entrar em página nova.

### Sistema
- **Exportar / Importar dados**: JSON com todo o `clawdState` (backup de progresso, XP, conquistas, favoritos);
- **Resetar progresso** (com confirmação dupla);
- **Modo desempenho**: desativa partículas, 3D-look e sub-pet em máquinas fracas;
- **Acessibilidade**: respeitar `prefers-reduced-motion` (reduz animações automaticamente).

### Critérios de aceite
- [x] Export/import restaura 100% do estado.
- [x] Sites bloqueados impedem a injeção do pet (checagem no início do content script).
- [x] `prefers-reduced-motion` respeitado.

---

## 9. 🗺️ Roadmap executado

| Fase | Entrega | Itens | Estado em 2026 |
|------|---------|-------|----------------|
| **1** | Fundações | Estado, migração de saves e aba Config | ✅ Concluída |
| **2** | Vida interior | Status/emoções, novas ações, óculos de sol e 2 slots | ✅ Concluída |
| **3** | Favoritos + Gamificação | Favoritos, XP, moedas, loja, conquistas e missão diária | ✅ Concluída |
| **4** | Profissões 2.0 | Embaixadinhas, Tutor, Dev e novas profissões | ✅ Concluída |
| **5** | Sub-Pets | Classe `SubPet`, catálogo, apelidos, cores e interações | ✅ Concluída |
| **6** | Cross-Tab | PresenceManager, viagens e reconciliação de reload | ✅ Concluída |
| **7** | Showcase + Sub-Pets 2.0 | Documentação interativa, olhos customizáveis e sete ações | ✅ Concluída |
| **8** | Estúdio Pixel-art v3.2 | 4 modelos, 4 rostos, olhos independentes e pernas em camada própria | ✅ Concluída |

### Diretrizes gerais
- Manter **zero dependências externas** — tudo em Vanilla JS + CSS puro;
- Toda feature nova atrás de config com padrão sensato (nada intrusivo por default);
- Sub-pets usam PNG default + fallback `box-shadow` sob paleta custom;
- `z-index` máximo (`2147483647`) e `pointer-events` cuidadosos para nunca bloquear a página;
- Migração de dados: versionar o storage (`clawdState.schemaVersion = 4`) com migrador incremental.

---

*Registro de implementação — Claw'd v3.2 e v3.3 · 2026*
