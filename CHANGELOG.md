# Changelog

Todas as mudanças notáveis deste projeto são registradas aqui.
Formato inspirado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

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
