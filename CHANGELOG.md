# Changelog

Todas as mudanças notáveis deste projeto são registradas aqui.
Formato inspirado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

## [3.3.0] — 2026-07-16

### Adicionado

- **Slot body (3º acessório)** — ribbon, wings, cape, armor; `accessoryBody` no estado e no popup
- **10 novos acessórios** — witch_hat, bunny_ears, party_hat, visor (head); monocle, mustache (face); ribbon, wings, cape, armor (body)
- **4 novas profissões** — doctor 🩺, artist 🎨, gamer 🎮, streamer 📡 (total: 12)
- **4 novas ações** — flip, meditate, electric, nap (total: 28)
- **13 novas conquistas** — first_level, centurion, shopaholic, gourmet, dance_machine, marathon_fisher, fashion_victim, combo_king, legendary_pet, full_house, polyglot, night_owl, iron_will (total: 25)
- **5 novos tipos de quest diária** — bath, accessories, subpet, combo, profession (total: 12)
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

### Alterado

- Schema v4 → **v5** (`CLAWD_SCHEMA_VERSION = 5`)
- `manifest.json` versão 3.2.0 → **3.3.0**
- Manifest: permissão **alarms** adicionada
- `clawdEffectiveAccessories()` retorna `body`, `userBody`, `bodySource`
- `clawdDefaultState()` com novos campos: personality, accessoryBody, weekly, customSpeech, particleColor, soundVolumeActions, soundVolumeAmbient, counters.streakDays
- Popup: terceiro slot de acessório (body), seção de desafio semanal, novos sliders de volume, color picker de partícula, textarea de voz customizada
- Showcase docs: 24→28 ações, 14→24 acessórios, 8→12 profissões, Schema v4→v5

### Corrigido

- Conquista `iron_will` usa `counter: 'streakDays'` (mirror de `game.streak.days`) para ser verificável nos testes de integridade
- `clawdMigrateState()` bloco v5 inicializa todos os campos novos sem apagar dados antigos

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
- Pipeline `tests/tools/_crop-literal-sprites.mjs` (fonte canônica dos PNGs) e `tests/tools/_make-sprites.mjs` (frames/preview; pacote só com `WRITE_PKG_SPRITES=1`)
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
- `_make-sprites` não sobrescreve PNGs do pacote sem `WRITE_PKG_SPRITES=1`
- Smoke Chromium: 0 erros de runtime, 3 reloads com 1 pet

## [3.1.x] e anteriores

Entregas anteriores (favoritos, gamificação, cross-tab, profissões 2.0, estúdio pixel) estão documentadas em [MELHORIAS.md](./docs/md/MELHORIAS.md) como registro histórico da v3.2.
