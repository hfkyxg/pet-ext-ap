# Changelog

Todas as mudanças notáveis deste projeto são registradas aqui.
Formato inspirado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

## [3.8.0] — 2026-07-21

### Adicionado

- **i18n** — `src/shared/i18n.js` com 11 locales (pt-BR padrão + en, es, zh-CN, ja, fr, de, ko, hi, ar, ru); seletor no popup; `clawdT` com fallback selected → en → pt-BR
- **Speech pools SSOT** — pools expandidos (pt-BR/en); demais idiomas com núcleo idle/happy/hungry/sad/curious + fallback
- **Posições de notificação** — `toastPosition`, `speechAnchor`, `emotionBadgeSide` (settings v5) com CSS `data-pos` / `data-speech-anchor` / `data-emotion-side`
- **Trello** — API Key/Token/Board ID em `chrome.storage.local` (`clawdTrello`); ações “Enviar sugestão” / “Reportar bug” via SW (`createTrelloCard`); `docs/TRELLO.md` + `CLAWD_TRELLO_BOARD_URL` → board público pet (`8wGr5tiQ`)
- **Contribuição / auditoria** — `CONTRIBUTING.md`, `npm run audit` (5 eixos), ecosystem no CI

### Alterado

- Manifest **3.8.0**; content_scripts carregam `i18n.js` antes do catálogo
- Suíte **165/165** contratos

### Corrigido

- **Name-tag / balão sobre o pet** — `.sprite-stack` acima da etiqueta; speech `below` com z-index e offset seguros
- **Subpet atrás da etiqueta** — `.aic-subpet` no mesmo z-index do pet (pinta na frente) e follow alinhado aos pés

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
