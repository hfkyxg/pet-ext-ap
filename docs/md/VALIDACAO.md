# Relatório de Validação — Claw'd v3.7.1

**Data:** 19 de julho de 2026 (sync GitHub v4 + partículas/skins/babinha + revalidação completa)  
**Ambiente:** Windows · Node.js 24 · Edge/Chromium  
**Marco:** **156/156** contratos — animações, interações, ações 100%, acessórios, 9 rostos, skins animadas, partículas ricas

## Resultado

- Verificações de sintaxe: **aprovadas**
- Suíte `node:test`: **156/156**
- `validate-ecosystem`: **ECOSYSTEM_STATIC_OK** (30/30 ações + extras)
- Sync: `master` continha v3.7; portadas melhorias da branch `claude/clawd-v4-ecosystem-fl8pnf` (Babinha, escala do balão, daily progress determinístico)
- Default branch GitHub `main` atualizada para acompanhar `master`

## Contagens vivas

| Entidade | Qtd |
|----------|-----|
| Ações popup / extras | **30** / **3** |
| Acessórios | **31** |
| Rostos / skins / idle | **9** / **7** / **7** |
| Profissões / subpets | **12** / **8** |
| Contratos | **156** |

## Novidades validadas nesta passagem

| Item | Status |
|------|--------|
| Rosto `drool` + drip no sleeping | ✅ |
| Speech/badge com `--agent-scale` + clamp viewport | ✅ |
| Skins freckles/stripes/spots/droopy animadas | ✅ |
| Partículas `spark-sm/md/lg/star` + walk-dust rico | ✅ |
| Bola pé direito / pixel / kick→direita | ✅ |
| 100% ações no `_handleAction` | ✅ |

## Comandos

```powershell
npm run check
npm test
node tests/tools/validate-ecosystem.mjs
node tests/runtime-smoke.mjs
```
