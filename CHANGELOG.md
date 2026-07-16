# Changelog

Todas as mudanças notáveis deste projeto são registradas aqui.
Formato inspirado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

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
