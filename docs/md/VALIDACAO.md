# Relatório de Validação — Claw'd v3.7

**Data:** 17 de julho de 2026 (revalidação completa — interações, ações, animações, acessórios + polish da bola no pé direito)  
**Ambiente:** Windows · Node.js 24 · Edge/Chromium com perfil isolado  
**Marco:** **153/153** contratos — animações, interações, ações 100%, acessórios, popup UX, mecânicas avançadas, ownership da bola

## Resultado

- Verificações de sintaxe: **aprovadas** (`catalog`, `content`, `popup`, `background`, `showcase`);
- Suíte `node:test`: **153/153 testes aprovados** (catálogo, extensão, integridade, harmonia, qualidade-fluida, validação-completa);
- `validate-ecosystem`: **ECOSYSTEM_STATIC_OK** (inclui **100%** das 30 ações no map `_handleAction`);
- Smoke test em navegador Chromium/Edge real: **aprovado** (`runtimeErrors: 0`, `invalidContextErrors: 0`, `reloads: [1,1,1]`);
- Audit pontual bola/acessórios: **AUDIT_OK** (bola `left: 48px`, sem drop-shadow, kick/roll à direita, 31 acessórios CSS);
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
| **7** | Bola no pé direito, pixel sem blur, kick/roll → direita | ✅ | 3 contratos novos em `validation-complete` |

## Contratos novos (validação completa)

Arquivo: `tests/validation-complete.test.js` — **23** contratos no arquivo (20 originais + 3 polish bola).

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
| Bola no pé direito (≥40px) + chuteira alinhada | ✅ |
| Bola pixel sem drop-shadow; kick/roll à direita | ✅ |
| Headphones + skins `ball_beach` / `ball_gold` | ✅ |

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
| Contratos automatizados | **153** |

## Smoke runtime (amostra)

| Área | Resultado |
|------|-----------|
| Ações disparadas no pet | 30 estados coerentes (wave→holding-balloon→…) |
| Popup | 8 abas · 12 profissões · 30 ações · 31 acessórios (16+12+6) · 34 conquistas |
| Outfit pixel/smooth | paint box-shadow presente; remoção OK |
| Subpet | 6 interações + override + remoção limpa |
| Reloads | `[1,1,1]` · `runtimeErrors: 0` |

## Checklist smoke manual (5 min)

- [ ] Idle estático (sem pernas box-shadow no idle)
- [ ] Hover no pet (pixel mode) → sombra + brightness sutil
- [ ] Clique no pet → ring expansivo vermelho
- [ ] Auto-walk → rastro de pó atrás das patas
- [ ] Correr → speed lines brancas + rastro mais intenso
- [ ] Carinho (1 clique) → cambalhota (2) → superdance (3+)
- [ ] Profissão Jogador → bola no **pé direito** (longe do subpet)
- [ ] Toque na bola → embaixadinhas; duplo-clique → chute à direita
- [ ] Acessório fones (`headphones`) = conchas cinza laterais
- [ ] 1 acessório body abaixo do rosto
- [ ] Profissão Dev + foco em input → laptop
- [ ] Studio na página arrastável / janela `?detached=1`
- [ ] Status feed/happy/play/bath no popup → ripple no botão

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
