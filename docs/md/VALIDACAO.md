# Relatório de Validação — Claw'd v3.7

**Data:** 17 de julho de 2026 (v3.7.0 — hover pixel-art, click ring, speed lines, walk dust, partículas emocionais, ripple popup, skin/face animations, ambient FX completo)  
**Ambiente:** Windows · Node.js 24 · Edge/Chromium com perfil isolado  
**Marco:** **150/150** contratos — animações, interações, ações 100%, acessórios, popup UX, mecânicas avançadas

## Resultado

- Verificações de sintaxe: **aprovadas** (`catalog`, `content`, `popup`, `background`, `showcase`);
- Suíte `node:test`: **150/150 testes aprovados** (catálogo, extensão, integridade, harmonia, qualidade-fluida, validação-completa);
- `validate-ecosystem`: **ECOSYSTEM_STATIC_OK** (inclui **100%** das 30 ações no map `_handleAction`);
- Smoke test em navegador Chromium/Edge real: **aprovado** (`runtimeErrors: 0`, `invalidContextErrors: 0`, `reloads: [1,1,1]`);
- Assets: **8/8** PNGs em `src/shared/sprites/subpets/` com `image.url` no catálogo.

## Matriz de validação (fases 1–6)

| Fase | Domínio | Status | Evidência |
|------|---------|--------|-----------|
| **1** | Animações / skins / idle×7 / body Y / reduced-motion | ✅ | `validation-complete` + quality-fluid + ecosystem §4 |
| **2** | Clique 1/2/3+/5, atalhos Alt+F/H/P/Z, bola/balão, focusin Dev | ✅ | `validation-complete` (tantrum via `_rapidClickCount`, laptop só engineer) |
| **3** | 30 ações + 3 extras no `_handleAction` (100%) | ✅ | `validation-complete` + ecosystem §9 + smoke ações |
| **4** | 31 acessórios CSS, uniforme sem destruir pessoal, props | ✅ | `validation-complete` + integrity slot body |
| **5** | Studio/detach, status×4, shop/claim, quiet/block, migrate | ✅ | `validation-complete` + integrity status |
| **6** | Combo 10s, streak, daily 14 / weekly 12, cross-tab, SFX | ✅ | `validation-complete` + quality-fluid volumes |

## Contratos novos (validação completa — 20 testes)

Arquivo: `tests/validation-complete.test.js`

| Contrato | Status |
|----------|--------|
| Skins ×7 pintam `.skin-mod` | ✅ |
| Idle ×7 keyframe + `!important` | ✅ |
| Body accessories Y peito/pescoço + capa z-index | ✅ |
| Reduced-motion / performanceMode / nofx | ✅ |
| Clique → carinho / cambalhota / superdance / tantrum | ✅ |
| Atalhos Alt+F/H/P/Z + bola/balão | ✅ |
| focusin engineer→typing; demais→curious; laptop gated | ✅ |
| 100% `CLAWD_ACTIONS` + extras no map | ✅ |
| Amostra por família (social/movimento/care/special) | ✅ |
| 31 acessórios com box-shadow pixel | ✅ |
| Uniforme não destrói acessórios pessoais | ✅ |
| Props de profissão DOM+CSS | ✅ |
| Studio + detached + allowlist `openStudio` | ✅ |
| 4 status clicáveis | ✅ |
| Shop inventário + claim daily/weekly mensagem | ✅ |
| Quiet/block sanitize + personality 5 traits | ✅ |
| Migrate round-trip inventário shop + schema v5 | ✅ |
| Combo 10s / exclusões / XP / conquista | ✅ |
| Streak + daily 14 / weekly 12 | ✅ |
| Cross-tab SW + subpets 8×7 + SFX dual | ✅ |

## Contagens vivas (SSOT `catalog.js`)

| Entidade | Qtd |
|----------|-----|
| Ações no popup (`CLAWD_ACTIONS`) | **30** |
| Extras motor (`CLAWD_PET_EXTRA_ACTIONS`) | **3** |
| Acessórios (3 slots) | **31** |
| Rostos / skins / idle variations | **8** / **7** / **7** |
| Profissões | **12** |
| Sub-pets / ações de sub-pet | **8** / **7** |
| Conquistas | **34** |
| Daily / weekly | **14** / **12** |
| Schema | **v5** |
| Popup header / docs | **v3.7** |

## Checklist v3.7 — animações e interações

| Item | Verificado |
|------|-----------|
| Hover pixel-art: sombra + brightness ao passar mouse no pet | ✅ |
| Click ring: anel expansivo ao pressionar o pet | ✅ |
| Speed lines: linhas brancas horizontais ao correr | ✅ |
| Walk dust trail: pó de poeira ao caminhar via `_doAutoWalk()` | ✅ |
| Partículas emocionais: corações (joyful), estrelas (ecstatic), azul (sad/peppy) | ✅ |
| Ripple nos botões de ação do popup | ✅ |
| Flash dourado na XP bar ao subir de nível | ✅ |
| Skin `glow`: brilho ciano pulsante | ✅ |
| Skin `robot`: scan-line steps(2) | ✅ |
| Rosto `sparkle`: cintilação nos olhos | ✅ |
| Rosto `heart`: pulsação do coração | ✅ |
| `ribbon` e `scarf_body`: partículas ambiente | ✅ |
| `has-ribbon` / `has-scarf-body` classes em `_syncAccessoryVisuals()` | ✅ |
| `prefers-reduced-motion`: ring/speed-lines/scan desativados | ✅ |
| `will-change: transform` no `.pet-body` durante walking/running | ✅ |

## Checklist smoke manual (5 min)

- [ ] Idle estático (sem pernas box-shadow no idle)
- [ ] Hover no pet (pixel mode) → sombra + brightness sutil
- [ ] Clique no pet → ring expansivo vermelho
- [ ] Auto-walk → rastro de pó atrás das patas
- [ ] Correr → speed lines brancas + rastro mais intenso
- [ ] Carinho (1 clique) → cambalhota (2) → superdance (3+)
- [ ] 1 acessório body abaixo do rosto
- [ ] Profissão Dev + foco em input → laptop
- [ ] Studio na página arrastável / janela `?detached=1`
- [ ] Status feed/happy/play/bath no popup → ver ripple no botão
- [ ] Skin glow → pulsação ciano suave
- [ ] Rosto sparkle → olhos cintilando

## Comandos reproduzíveis

```powershell
npm run check
npm test
node tests/tools/validate-ecosystem.mjs
node tests/runtime-smoke.mjs
```

## Segurança e performance (baseline)

| Tema | Garantia |
|------|----------|
| Mensagens | Allowlist + sanitize (SSOT catalog); content em `switch` validado |
| Storage | Migrate em load/save; inventário só IDs de loja; **save coalesce** |
| DOM | Speech/toast/nome/missão via `textContent` |
| Sites bloqueados | Hostname DNS + match exato/subdomínio |
| Áudio | Sem `AudioContext` até gesto; volumes actions/ambient; mute master |
| FX | Cap de partículas; sem spawn se hidden / `performanceMode` / reduced-motion |

## Limite do teste

Páginas `chrome://` / loja não aceitam content scripts. Após editar JS/CSS: **recarregar a extensão** em `chrome://extensions` (ou `edge://extensions`) e a aba de teste.
