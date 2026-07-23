# Changelog

Todas as mudanças notáveis deste projeto são registradas aqui.
Formato inspirado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

## [4.0.0] — Foco & Bem-estar

Marco maior: o Claw'd deixa de ser só um mascote e vira um **companheiro de foco e bem-estar**.
Schema migrado **v5 → v6** (aditivo, retrocompatível). Suíte **253/253**.

### Adicionado

- **Pomodoro** — motor no service worker com `chrome.alarms` (sobrevive a troca de aba/sleep do worker). Máquina de estados pura `clawdPomodoroNextPhase` (foco → pausa/pausa longa → foco); estado ao vivo em `storage.local['clawdFocus']`; broadcast `focusState` para as abas. Aba **Foco** no popup com cronômetro ao vivo, start/pausar/pular/parar, durações e auto-iniciar. Pet ganha glow de foco e recompensa (XP + moedas) ao concluir ciclo
- **Guarda anti-doomscroll** — `clawdClassifyTimeSink` detecta rolagem infinita (TikTok, YouTube `/shorts`, Instagram/Facebook reels, Reddit, X…). Escalada **configurável** via `clawdEscalationLevel`: fala gentil → toast com tempo → **respiração guiada** → **bloqueio suave** (sempre com escape "continuar +5 min"). Limite e firmeza ajustáveis
- **Regras por site** — editor no popup para o usuário cadastrar domínios e o nível de interação (`block`/`nudge`/`limit`/`boost`/`off`), com "adicionar site atual". `blockedSites` legado é migrado automaticamente para `siteRules(block)` e mantido como espelho
- **Tempo de tela** — rastreio diário por categoria (`clawdScreenTimeAdd`), só na aba ativa (sem dupla contagem), com resumo no popup (total, em foco, rolagem, top categorias)
- **Bem-estar** — respiração guiada box-breathing (4-4-4-4) em overlay, check-in de humor (1–5) com resposta acolhedora e sugestão opcional de apoio em dias difíceis, e lembretes opt-in: descanso ocular **20-20-20**, hidratação, postura e afirmações positivas (respeitam horário de silêncio e não interrompem o foco)

### Alterado

- **Schema v6** — novos blocos `focus`/`wellbeing`/`screenTime` + settings de Pomodoro, guarda e bem-estar em `catalog.js` (SSOT), com sanitizers dedicados e migração `if (v < 6)`
- **Banner/README/showcase** — versão **v4.0** e badge **253/253**; docs sincronizadas ao catálogo
- **Interação pet/subpet** — long press consistente em mouse e toque (abraço/habilidade especial), `Shift+Enter`, foco visível, instruções acessíveis e subpet que acompanha o ponteiro
- **Sistema de movimento** — tokens de duração/easing equivalentes no runtime, popup e showcase; transições restritas às propriedades necessárias; documentação canônica em `docs/MOTION.md`
- **Acessibilidade do popup** — tabs ARIA com ←/→/Home/End; Pomodoro e humor sincronizam `disabled`/`aria-pressed`; onboarding e overlays preservam o foco
- **Sprites Raposa/Capivara/Axolote** — silhuetas mais legíveis e cores vivas; hover/especial/duo com personalidade (estrelas, pausa calma, bolhas); bob idle por espécie

### Corrigido

- **Glow de foco × ações** — o pulso não anima mais `.pet-body`/`.smooth-sprite`; um halo em `.sprite-stack::after` evita sobrescrever pulo, dança, corrida ou comemoração
- **Overlays de bem-estar** — respiração e bloqueio suave agora são modais completos (`aria-modal`, foco preso, Escape, restauração do foco) e removem o DOM em `transitionend` com fallback rastreado
- **Movimento reduzido** — popup/showcase desligam animações e transições; preview autônomo do subpet usa rAF e pausa em aba oculta ou com `prefers-reduced-motion`
- **Performance CSS** — removidos todos os `transition: all` do runtime e do popup
- **Ações autônomas × interação explícita** — fala, idle, subpet, passeio, profissão, dwell e cenas em dupla respeitam `AUTONOMY_GRACE_MS`; nenhuma reação automática atropela a ação pedida pelo usuário nem deixa partículas tardias
- **Balões sobrepostos** — o layout mede o conteúdo após o render, escolhe entre quatro posições, evita pet/subpet/etiqueta e limita os dois balões à viewport. O olhar 3D foi isolado no personagem para não deformar fala ou controles
- **Long press duplicado** — segurar não dispara mais o abraço e um carinho adicional no `mouseup`; toque e mouse compartilham a mesma intenção
- **Um pet no navegador** — `broadcastOwnership` unifica `assignHost`/`completeTravel`; `sendPresence` faz `forceHidePet` se hide/despawn falhar; hide-before-paint no construtor; disconnect sempre esconde (mesmo bfcache); `respawnAnywhere`/`onActivated` usam `lastFocusedWindow`
- **Hide cross-tab efetiva** — classe `.aic-presence-hidden` com `display: none !important` (pet + subpet); `style.display='none'` sozinho perdia para `display: block !important` do host e deixava clones em várias janelas/abas
- **Dinossauro na página** — removida faixa clara do crop (parecia costura); sprite cheio com 3 espinhos; `filter` de sombra no `.subpet-motion` (não no ink) para não clipar box-shadow/custom
- **Preview de subpets no popup** — host **72×60**; grid sempre PNG bitmap; tint sem swatch preto no canto

## [Não lançado]

### Adicionado

- **Central de Calma** — reset respiratório de um minuto, grounding autoguiado 5-4-3-2-1 e sons procedurais curtos de chuva, ondas, floresta e ronronar; todos respeitam horário de silêncio, volumes e desbloqueio de áudio por gesto
- **Valor de bem-estar local** — contadores de respiração/grounding/som, histórico limitado a 180 práticas, sequência saudável e resumo de sete dias com recomendação gentil; nenhum dado sai do navegador e a UI explicita que as ferramentas não substituem cuidado profissional
- **Três novos subpets** — Raposa, Capivara e Axolote com sprites 12×10, PNGs empacotados, pools autônomos, especiais e SFX próprios; catálogo total passa a **11 espécies**
- **Contratos de valor** — `tests/wellbeing-value.test.js` valida espécies/assets, allowlist, sanitização, acessibilidade modal, cleanup de timers, alvos de toque e documentação sem promessa clínica
- **Onboarding com setup inicial** — primeira abertura do popup pede **idioma** e **posição inicial** (`#onboarding-locale` / `#onboarding-corner`); sugere o idioma do navegador via `clawdNormalizeLocale`
- **"Aprontar" (travessura autônoma)** — `doMischief()` no pet (esgueira → reaparece rindo, reaproveitando estados `sneaking`/`peeking`) e `case 'mischief'` no subpet; ambos entram nos pools autônomos ponderados por personalidade (playful/curious). Fora do catálogo/grid — não altera as contagens de ações
- **Reações à navegação** — **digitar (sustentado)** via `_bindTypingCompanion` (o pet "escreve junto" em rajadas espaçadas e volta à calma quando as teclas param; Dev entra em `typing`, demais ficam curiosos) e **assistir vídeo** via `_bindMediaWatching`/`_tickWatch` (vídeo grande tocando → o pet fica por perto reagindo baixinho 🍿/👀, com auto-walk e dwell suspensos até pausar/acabar)
- **Subpet off-screen** — `IntersectionObserver` pausa rAF + animações CSS (`.off-screen`) quando o companheiro sai da viewport; retoma ao reaparecer
- Suíte **197/197** contratos (polish subpet dt/observer + mischief/navegação/i18n + gate popup CSS async)
- **Popup boot** — `content/style.css` deixou de ser `<link>` síncrono no `popup.html` (bloqueava o JS no MV3); agora é injetado após o parse; erros de boot vão para `__clawdPopupBootError`

### Alterado

- **i18n chrome completo** — `applyPopupI18n` + `CLAWD_I18N_EXTRA` cobrem onboarding, aparência, comportamento, ações e config; troca de idioma atualiza toda a estrutura do popup (RTL em `ar`); content recebe `updateSetting` de `locale`
- **i18n dinâmico** — `i18n-entities.js` + `et()` traduz ações/profissões/loja/conquistas/acessórios/sub-pets (nomes **e** descrições EN); `applyLocaleChoice` chama `renderAll()` para sincronizar chrome + listas ao vivo; titles/`aria-label` via `data-i18n-title` / `data-i18n-aria`
- **Subpet fluido** — follow spring com `dt` normalizado a 60 fps (cap 3×); keyframes idle/hop/cuddle/wake/spin/celebrate mais suaves; hover/press squash; `will-change` em stack/subpet
- **Dev tooling** — `npm run check` inclui `i18n-entities.js`; ESLint com globals `clawdEntityT` / `CLAWD_I18N_ENTITY` e bloco dedicado ao arquivo
- **Banner/README sincronizados à fonte da verdade** — `pet-banner.svg` atualizado (v3.8, **9 rostos**, **31 acessórios**) e números obsoletos do README corrigidos (197 testes, 31 acessórios, v3.8). Novo **guarda de deriva** trava os selos do banner às contagens reais do catálogo (modelos/rostos/acessórios) e à versão do manifest — nunca mais ficam obsoletos silenciosamente
- **Vida contínua** — cadência das variações idle mais viva (menos tempo-morto enquanto se navega): pet `max(4500, 15000 − playful·900)`, subpet `max(4500, 12000 − playful·700)`; ainda self-reschedule e throttled por `cooldownMs`/estado
- **Cadência de navegação** — `CLAWD_TIMINGS` apertados (`RANDOM_ACTION_MS` 8s, `DUO_SCENE_MS` 16s, `SUBPET_INTERACTION_MS` 9s); auto-walk 12s; fala aleatória 28s; subpet com `_nextLightSubAction` enquanto o dono anda/reage; scroll/clique/SPA/digitar/vídeo com cooldowns menores e eco ocasional do companheiro
- **Docs** — VALIDACAO, README, MANUAL, MELHORIAS, ARCHITECTURE e showcase alinhados ao marco **197/197** (popup boot + fluidez subpet)

### Corrigido

- **Modo liso nítido** — removido `filter: drop-shadow` do `.pet-body` (com `scale(1.5)`) e do `.sprite-stack` no liso; contorno usa `box-shadow` nos sólidos; keyframes (pose/meditar/elétrico/arco-íris/sleep/excited) sem sombra no body; name-tag mais baixo no liso; contratos em `catalog`/`validation-complete`/`quality-fluid`
- **Load unpacked MV3** — harness de smoke local movido de `_harness.html` (nome reservado pelo Chromium) para `tests/harness.html`; contrato em `extension.test.js` rejeita arquivos/pastas com `_` no pacote (exceto `_locales`/`_metadata`)
- **Badge da suíte** — showcase/docs alinhados a **253/253** contratos
- **Personalização de subpets** — picker usa a cor natural do sprite (não `CLAWD_COLORS[index]`); cor/olho iguais ao default não derrubam o PNG; dino = crop literal do sheet (3 espinhos); grid do popup **sempre PNG** e **sem swatch de tint** (o 10×10 no canto virava quadrado preto); preview host **72×60** + tinta `.subpet-pixel-ink`; botão “Restaurar cores”; sanitize remove `#111111`/quase-preto no corpo de espécies claras
- **Animações** — idle `!important` limpo no `setState`; `doDance` com `_danceTimers`; digitar sustentado; hug do subpet não cancela ação do dono; timers de FX/scroll/summon/poof rastreados no `destroy`; filtro energetic idle (`≤1100ms`); popup `prefers-reduced-motion` amplo
- **Cross-tab / SFX** — aba não-host silenciosa (`_isActiveHost` / `_crossTabHidden` + `.aic-presence-hidden`); race `despawnPet`×`spawnPet` (`_despawnTimer` + `_travelGen`); subpet dblclick sem `special` duplo; wake sem chime eco; saudade longa sem `celebrate` duplicado após `doCheer`
- **Locale do browser** — `clawdNormalizeLocale` mapeia `en-US`→`en`, `pt`→`pt-BR`, `zh-*`→`zh-CN`, etc.

## [3.8.0] — 2026-07-21

### Adicionado

- **i18n** — `src/shared/i18n.js` com 11 locales (pt-BR padrão + en, es, zh-CN, ja, fr, de, ko, hi, ar, ru); seletor no popup; `clawdT` com fallback selected → en → pt-BR
- **Speech pools SSOT** — pools expandidos (pt-BR/en); demais idiomas com núcleo idle/happy/hungry/sad/curious + fallback
- **Posições de notificação** — `toastPosition`, `speechAnchor`, `emotionBadgeSide` (settings v5) com CSS `data-pos` / `data-speech-anchor` / `data-emotion-side`
- **Trello** — API Key/Token/Board ID em `chrome.storage.local` (`clawdTrello`); ações “Enviar sugestão” / “Reportar bug” via SW (`createTrelloCard`); `docs/TRELLO.md` + `CLAWD_TRELLO_BOARD_URL` → board público pet (`8wGr5tiQ`)
- **Contribuição / auditoria** — `CONTRIBUTING.md`, `npm run audit` (5 eixos), ecosystem no CI

### Alterado

- Manifest **3.8.0**; content_scripts carregam `i18n.js` antes do catálogo
- Suíte **169/169** contratos
- **Animações pet↔subpet** — locomoção com `clawdEaseInOutCubic`; subpet ecoa pulo/dança/banho/alegria; micro-idle do companheiro; duo/ações espontâneas mais frequentes; walk/run CSS fluido + anticipação de pulo

### Corrigido

- **Name-tag / balão sobre o pet** — `.sprite-stack` acima da etiqueta; speech `below` com z-index e offset seguros
- **Subpet atrás da etiqueta** — `.aic-subpet` no mesmo z-index do pet (pinta na frente) e follow alinhado aos pés
- **Grade de ações** — Esgueirar `🤫` (sem tofu □), Acrobacia `💫` (distinto de Resgatar `🛟`), “Toca aqui” em PT-BR; ripple/feedback no popup; bounce/sneak/clap mais fluidos
- **Pet duplicado entre abas** — hide otimista no boot; reconnect + hide no disconnect do Port; `completeTravel`/`assignHost` escondem não-hosts; `forceHidePet` para orphan; display respeita `_crossTabHidden`
- **Ações invisíveis em aba sem pet** — popup enfileira a ação, manda `requestHost` ao SW e roda o anim após `spawnPet`; Resgatar não celebra com pet escondido

## [3.7.3] — 2026-07-20

### Adicionado

- **`petVisible` persistente** — mostrar/ocultar pet sobrevive a reload e sincroniza entre popup e aba via `getStatus` / `toggleVisibility`
- **Seguir nesta guia** — botão `summonPetToTab` no popup; service worker reatribui o anfitrião cross-tab à aba atual
- **Modo minimalista** (`minimalMode`) — oculta badge de nível, emoji flutuante e props de profissão (classe `.aic-minimal`)

### Melhorado

- **Harmonia de timing** — tokens `--clawd-ease-bounce` / `--clawd-ease-snap` / `--clawd-dur-*` centralizam as "house curves" reaproveitadas nas transições (abordagem cirúrgica: keyframes existentes preservados)
- **Profissões com assinatura própria** — `Gamer` ganha `_gamerCombo()` (pulo→giro que alimenta o contador de combo, com XP por combo) e `Streamer` ganha `_streamerLive()` (cena "AO VIVO" distinta do músico, com fala de chat e partículas de transmissão); `Tutor` varia operação (× ou +) e prompt do desafio
- **Interações com subpets** — pool autônomo do subpet agora é ponderado pela personalidade do dono (playful→play/celebrate/spin, lazy→nap/cuddle, curious→explore, social→hug), mantendo o viés de espécie; nova cena coordenada de **dança em duo** pet↔subpet

### Corrigido

- **Spawn no canto errado (top-left)** — `clawdHasSavedPosition()` rejeita saves legados `{x:0,y:0}`; posição padrão via `clawdDefaultPositionCoords()` no canto preferido (`startCorner`, padrão inferior direito)
- **Partículas sem loop ambiente** — faíscas de acessório só disparam em movimento/ação/equip; clima sazonal não roda em timer contínuo
- **Reduced-motion na boca** — `.emotion-mouth` (idle/talk/chew) agora também para sob `prefers-reduced-motion` / `.aic-reduced-motion` (antes seguia animando)
- **Hover × emoção** — pet alegre no hover **intensifica** o brilho da emoção em vez de sobrescrevê-lo (regra composta `.emotion-glow:hover`)
- **Limpeza** — removido `_ambientWeatherTimer` vestigial (nunca era atribuído; loop real vive em `_timers`)

- **Versão alinhada:** manifest / popup / README → **3.7.3** · suíte **159/159**

## [3.7.2] — 2026-07-19

### Melhorado

- **Validação expandida (20/jul/2026)** — smoke runtime cobre 7 skins, duo pet↔subpet, partículas DOM (spawn/cleanup/noParticles), multi-clique (somersault/superdance/tantrum), subpets cat+dragon e props chef/ninja/streamer; contratos estáticos ampliados (matriz 8×7, duo CSS, anti-bloom name-tag) mantendo **156/156**
- **Skin reage à ação (v3.7.3)** — a `.skin-mod` deixa de ser passiva: orelhas (`droopy`) flopam no pulo/festa e balançam ao correr; antena do robô treme e o LED de status pisca forte na empolgação; neon (`glow`) flameja mais forte na comemoração; sardas/bolinhas dão um "pop" alegre; listras viram linhas de velocidade ao correr. Tudo herda o `--agent-scale`, fica atrás de `:not(.aic-reduced-motion)` e tem contrato de teste
- **Fones** — arco + conchas acolchoadas + LED azul (não parece fumaça); pulse idle + bob no passo
- **Facewear** — óculos, óculos de sol, goggles, laço, medalha, blush, mochila, monóculo e bigode com pixel mais legível
- **FX ambient** — modo `spark-ambient` (spread curto); particles de headphones/medal/halo/crown; equip sparks cobrem o catálogo
- **Nitidez / fluidez** — `crisp-edges` em sprites/acessórios; brilho via brightness/opacity (menos blur); headwear sincronizado ao passo; abraço duo sem fala duplicada; dance/keepy/pescaria limpam ao ocultar/destruir
- **Sync** — `storage.onChanged` preserva XP/coins/counters com `Math.max` (evita regressão por save stale)
- **Anti-bloom** — sombra seca 0-blur no pet; emotion/pose/shiny/profissão/skin/sparks/dust sem soft glow; `noParticles` em walk dust e emoji particles; propeller+headphones alinhados
- **Duo pet↔subpet** — walk/run sync via CSS vars; classes duo preservadas; hug/play/celebrate/nap alinhados; carinho encadeia petting; settle ao fim das interações
- Versão alinhada: **manifest / popup / README → 3.7.2**

### Corrigido

- **Escala das animações** — 26 keyframes de `.pet-body` (andar, correr, pular, rolar, girar, quicar, comemorar, agachar, abraçar, tontura, espiar, aceno-idle, balão, aterrissagem, saudação, olhar, cutucar-subpet, acomodar-sono…) largavam o `scale(var(--agent-scale))` e faziam o pet **encolher para 1×** durante a ação; agora todo frame rebaqueia a escala e o corpo mantém o tamanho em todos os modelos (classic/mini/claws/guardian). Contrato de regressão trava o invariante
- **Pouso do pulo** — poeira de impacto sincronizada com o squash em ~0,63s (segundo evento, ignora o throttle da poeira de passo)
- Race save debounce × onChanged que zerava o +5 XP do carinho no smoke runtime
- Soft `drop-shadow`/`blur` que lavava olhos e acessórios no screenshot (propeller + headphones)

---

## [3.7.1] — 2026-07-19

### Adicionado

- **Rosto Babão (`drool`)** — boca aberta + babinha GPU (`clawd-drool-drip`); também pinga no `sleeping`
- **Partículas pixel ricas** — variantes `spark-sm/md/lg/star` + twinkle; pó de caminhada em cluster pixel
- **Animações de skin** — freckles/stripes/spots/droopy com keyframes dedicados (além de glow/robot)
- Contratos: babinha, escala do balão, skins animadas → suíte **156/156**

### Corrigido / portado da branch v4 no GitHub

- Balão de fala e badge de emoção acompanham `--agent-scale`
- `_clampSpeechBubble()` (flip-left / below) para não sair da viewport
- `stopFishing()` no-op sem pescaria ativa (não apaga falas ao trocar profissão)
- `clawdRegisterDailyProgress` resolve quest pela data da própria missão (determinístico)

### Alterado

- Rostos: **9** (inclui Babão); docs/manual/VALIDACAO/README alinhados a **156/156**

---

## [3.7.0] — 2026-07-17

### Adicionado

- **Hover pixel-art** — `brightness(1.07) + drop-shadow` ao passar mouse no pet em modo não-smooth
- **Click ring** — anel expansivo (scale 0.3→2.4, opacity fade) via `::after` na classe `.pressing`
- **Speed lines** — linhas horizontais brancas via `::before` em `.running` (GPU-friendly, `will-change: transform` no `.pet-body`)
- **Walk dust trail** — `_spawnWalkDust(2)` com 22% de probabilidade por frame no `_doAutoWalk()` RAF
- **Partículas emocionais** — corações (joyful), estrelas (ecstatic), azul (peppy/sad) em `updateEmotion()` ao mudar emoção
- **Ripple nos botões** — `stat-ripple` + `::after` com `clawd-btn-ripple` em todos os botões de ação do popup
- **Flash XP level-up** — `xp-levelup-flash` com `clawd-xp-levelup` na barra de XP ao subir de nível
- **Skin glow** — keyframe `clawd-skin-glow-pulse` (brightness + drop-shadow pulsante 2.4s)
- **Skin robot** — keyframe `clawd-skin-robot-scan` (scan-line steps(2) 2s)
- **Face sparkle** — keyframe `clawd-face-sparkle-twinkle` (brilho 1.6s nos olhos)
- **Face heart** — keyframe `clawd-face-heart-pulse` (scale 1→1.15 1.2s no coração)
- **Ambient FX ribbon** — partículas rosas no idle ao usar laço de pescoço
- **Ambient FX scarf_body** — partículas vermelhas ao andar com cachecol corpo
- **Classes has-ribbon / has-scarf-body** — toggles em `_syncAccessoryVisuals()` para consistência com has-wings/has-cape/has-armor
- **Sparks de acessório ampliados** — mapa de cores ao vestir crown/halo/headphones/medal/etc.
- **3 contratos** de ownership da bola (pé direito, pixel sem blur, kick/roll → direita)

### Alterado

- `will-change: transform` adicionado ao `.pet-body` durante `.walking` e `.running`
- `_syncAccessoryVisuals()` agora gerencia 5 classes `has-*` para todos os acessórios de corpo
- **Bola do Jogador** no **pé direito** (longe do subpet); chuteira alinhada; kick/roll/doPlay para a direita
- Bola mais **pixel-art** (sem `drop-shadow` suave); animações keepy/kick mais fluidas; área de toque maior
- Contador de embaixadinhas ao lado direito; pó de caminhada respeita `particleColor`
- Suíte **153/153**; badge do showcase e docs/VALIDACAO alinhados
- Ninja: hosts de contexto (hackthebox, tryhackme, security…); `--clawd-accent` no popup/preview

---

## [3.6.0] — 2026-07-17

### Adicionado

- **CLAWD_TIMINGS** — constante centralizada no catálogo com intervalos críticos; elimina magic numbers em `content.js` e `popup.js`
- **Props animados** — engineer (cursor piscante), footballer (chuteira), chef (stir), fisher (boia); laptop **somente** em Dev digitando
- **Studio in-page + janela destacável** — personalização móvel (`openStudio` / `?detached=1`)
- **4 status clicáveis** no popup — happy / feed / play / bath
- **Hover glow reativo** — modo Smooth com `drop-shadow` via `--clawd-glow`
- **A11y live region** — `role="status" aria-live="polite"` + `.clawd-sr-only`
- **Validação completa** — `tests/validation-complete.test.js` (20 contratos) + ecosystem **100%** das 30 ações no `_handleAction`
- **SubPet RAF guard** + frequência adaptativa por personalidade
- Body accessories reposicionados (peito/pescoço; capa atrás)

### Alterado

- Suíte **150/150**; popup header **v3.6**; docs/manual/README/VALIDACAO alinhados (8 rostos · 7 skins · 7 idle)
- Tools em `tests/tools/` sem prefixo `_` (Chrome MV3 reserva `_` no pacote)

---

## [3.3.1] — 2026-07-17

### Adicionado

- **Camada `.pixel-fx`** — poses pixel `steps(1)` para aceno, braços no andar/correr, pulo, rolamento, cambalhota, giro, dança, high-five, stretch, clap, sono, rugido, peek, sneak, banho e celebração (4 modelos)
- **FX de acessório** — pop + sparks ao vestir; ambient de hélice/asas/capa/armadura; planeio real com asas
- Suítes **harmony-phase** e **quality-fluid**; showcase **123/123**
- **Perf/inteligência** — reserva de teto FX (`_reserveFx`), lookAtCursor por rAF+proximidade, `will-change` só ao mover, idle variation sempre reagenda, contexto reage no 1º load, visibilidade unificada por away-time
- **Sprites fluidos** — ações (roll/spin/cheer/…) e idle variations vencem breathe; aba oculta pausa CSS; subpet settle-wake + FX release + sync no spawn

### Corrigido

- **Name-tag** — `textContent` no `.name-tag` apagava o título de nível; agora título + nome em spans (`_syncNameTag` / `syncPopupNameTag`)
- Slot **corpo** no DOM/CSS/popup/showcase; volumes Ações/Ambiente no áudio; `opts.count` nas partículas
- Hover-pet com cooldown; coalesce click/dblclick na bola; reduced-motion nos FX
- **SFX/FX polish** — play/pose/bath/wake/birra com beep/chime; mute real (volume 0); migrate preserva canais em 0; pó/clima respeitam reduced-motion; preview dos sliders Ações/Ambiente no popup

### Alterado

- Docs/manual/VALIDACAO alinhados à suíte **123/123** e ao catálogo vivo

---

## [3.3.0] — 2026-07-16

### Adicionado

- **Slot body (3º acessório)** — ribbon, wings, cape, armor; `accessoryBody` no estado e no popup
- **10 novos acessórios** — witch_hat, bunny_ears, party_hat, visor (head); monocle, mustache (face); ribbon, wings, cape, armor (body)
- **4 novas profissões** — doctor 🩺, artist 🎨, gamer 🎮, streamer 📡 (total: 12)
- **Ações expandídas** — flip, meditate, electric, nap, highfive, lookAround e demais até **30** no popup; extras **kick / keepy / superdance** via motor (`CLAWD_PET_EXTRA_ACTIONS`)
- **Conquistas** — total **28** (incl. balloon_novice, balloon_party, keepy_miles + iron_will / night_owl / etc.)
- **14 tipos de quest diária** — bath, accessories, subpet, combo, profession, **balloons**, **keepy** (+ base)
- **Sistema de desafio semanal** — 4 desafios rotativos (hash ISO week), progress em `S.weekly`, claim com XP e badge
- **Sistema de combo** — janela de 10s, balão a ×3, bônus de XP a ×5, conquista combo_king
- **Traços de personalidade** — 5 dimensões (playful, lazy, curious, social, foodie) em `S.personality`
- **Alarme semanal** — `chrome.alarms.create('clawdWeeklyReset', 10080min)` em background.js; broadcast weeklyReset para todas as abas
- **Marcos de nível com recompensas** — party_hat (5), monocle (10), wings (15), crown (20), confetti automático
- **Detecção de contexto de página expandida** — 11 contextos (coding, music, video, shopping, social, news, email, gaming, health, learning + idle)
- **Partículas sazonais** — neve (dez/jan), folhas (out), flores (abr), vagalumes (jun/jul) via `_spawnAmbientWeather()`
- **Marcos de tempo na aba** — balloon + XP a 5min, 30min, 1h
- **Tab milestones** — `_checkTabMilestones()` a cada 60s
- **8 novos keyframes CSS** — clawd-flip, clawd-meditate, clawd-electric, clawd-float-idle, clawd-rainbow-glow, clawd-confetti-fall, clawd-nametag-rainbow, clawd-holographic-shimmer
- **3 novos temas de name-tag** — rainbow, holographic, minimal (total: 7)
- **Campos de personalização** — cor de partícula (particleColor), voz customizada (customSpeech), volume por categoria (soundVolumeActions, soundVolumeAmbient)
- **Multiplicadores de XP por profissão** — chef+feed ×1.5, fisher+fish ×1.5, footballer+keepy ×2, doctor+bath ×1.5
- **Contador streakDays** — espelhado de `game.streak.days` para suportar conquista iron_will
- **Contadores balloonsPopped / keepyTotal** — missões e conquistas de balão/embaixadinha

### Alterado

- Schema v4 → **v5** (`CLAWD_SCHEMA_VERSION = 5`)
- `manifest.json` versão 3.2.0 → **3.3.0**
- Manifest: permissão **alarms** adicionada
- `clawdEffectiveAccessories()` retorna `body`, `userBody`, `bodySource`
- `clawdDefaultState()` com novos campos: personality, accessoryBody, weekly, customSpeech, particleColor, soundVolumeActions, soundVolumeAmbient, counters.streakDays / balloonsPopped / keepyTotal
- Popup: terceiro slot de acessório (body), seção de desafio semanal, novos sliders de volume, color picker de partícula, textarea de voz customizada
- Showcase / docs: **30** ações · **31** acessórios · **12** profissões · **28** conquistas · Schema v5 · **81/81** contratos
- Save path: **coalesce** de persistência + limpeza de timers idle/scroll no destroy (tick escalabilidade)

### Corrigido

- Conquista `iron_will` usa `counter: 'streakDays'` (mirror de `game.streak.days`) para ser verificável nos testes de integridade
- `clawdMigrateState()` bloco v5 inicializa todos os campos novos sem apagar dados antigos
- Badges/métricas da documentação interativa desalinhados (65→81, 24→31 acessórios, conquistas/quests)
---

## [3.2.1] — 2026-07-16 (loop M1→M2)

### Segurança

- `setSubpet`: merge de nomes/cores via `clawdAssignPlain` e persistência sempre com `clawdMigrateState`
- `save()`: settings via `clawdPlainMerge` (sem `Object.assign` no content)
- `clawdPlainMerge`: cópia base também sem chaves de protótipo

### Performance

- Subpet: rAF pausa de verdade com aba oculta (`_pauseRaf` / `_resumeRaf`)
- Subpet: rAF pausa ao dormir; spring skip quando settled (`SETTLE_EPS`); `_writePos` só escreve se delta ≥ 0,35px
- Pet: `updatePosition` / `lookAtCursor` pulam writes redundantes; poeira de drag/run entra no cap `_canSpawnFx`
- Cap de partículas: 28 → 18; bursts de emoji um pouco menores
- Timers de fisher/profissão/ninja respeitam `document.hidden`

### Testes / docs

- Contratos alinhados ao dispatch `switch`/`case` e ao SW com `clawdValidatePortMessage`
- VALIDACAO: roadmap M1→M6; M2 performance fechado neste tick

## [3.2.0] — 2026-07-15

### Adicionado

- Oito PNGs de sub-pet em `src/shared/sprites/subpets/` (`web_accessible_resources`), crops literais do sheet
- Metadados `image:{}` em `CLAWD_SUBPET_SPRITES` + helpers `clawdSubPetImageUrl` / `clawdSubPetBounds`
- Pipeline `tests/tools/crop-literal-sprites.mjs` (fonte canônica dos PNGs) e `tests/tools/make-sprites.mjs` (frames/preview; pacote só com `WRITE_PKG_SPRITES=1`)
- Sons de interação do sub-pet (`_sfx`) respeitando gesto do usuário e horário de silêncio
- Cenas **duo** pet↔subpet e engajamento após **dwell** na página (`look-around`, `page-peek`, `tab-greet`, `soft-land`)
- Prévia sonora no slider de volume do popup (chirp 8-bit ao ajustar / religar Sons)
- `CHANGELOG.md` e seção de contribuição expandida no README

### Alterado

- Boca ligada por padrão (`showMouth: true`); toggle no popup continua disponível
- Sub-pets: PNG literal por padrão; fallback `box-shadow` com paleta custom ou piscada (fallback)
- Piscada em subpet bitmap: mantém o PNG e usa squish/CSS (sem flash para box-shadow)
- Popup: cards de sub-pet bloqueados em full-color (sem greyscale)
- Olhos do cachorro (e demais espécies) sem buracos transparentes que pareciam “cinza”
- Animações de hover/tap/settling e follow spring por espécie
- Documentação e showcase alinhados: **24** ações pet, **7** subpet, **schema v4**, **65/65** contratos
- MANUAL: sons (prévia de volume), silêncio, sites bloqueados, export/import, duo/dwell, boca padrão

### Segurança / qualidade

- Allowlist de mensagens, AudioContext pós-gesto, sites bloqueados sem substring
- `make-sprites` não sobrescreve PNGs do pacote sem `WRITE_PKG_SPRITES=1`
- Smoke Chromium: 0 erros de runtime, 3 reloads com 1 pet

## [3.1.x] e anteriores

Entregas anteriores (favoritos, gamificação, cross-tab, profissões 2.0, estúdio pixel) estão documentadas em [MELHORIAS.md](./docs/md/MELHORIAS.md) como registro histórico da v3.2.
