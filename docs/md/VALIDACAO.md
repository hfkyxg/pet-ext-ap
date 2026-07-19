# Relatório de Validação — Claw'd v3.7.2

**Data:** 19 de julho de 2026 (polish acessórios/FX + sync XP + release)  
**Ambiente:** Windows · Node.js 24 · Edge/Chromium  
**Marco:** **156/156** contratos — animações, interações, ações 100%, acessórios, 9 rostos, skins animadas, partículas ricas

## Resultado

- Verificações de sintaxe: **aprovadas**
- Suíte `node:test`: **156/156**
- `validate-ecosystem`: **ECOSYSTEM_STATIC_OK** · version **3.7.2** (30/30 ações + extras)
- Lint (`eslint src`): **0 erros**
- Smoke Chromium: **runtimeErrors: 0** · 3/3 reloads · carinho +XP OK
- Polish: fones/facewear nítidos, FX ambient, crisp-edges, duo hug sem fala duplicada, dance/keepy/pescaria limpam ao ocultar
- Sync: `storage.onChanged` não regride XP/coins/counters (Math.max)

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
| Headphones LED + facewear enriquecido + spark-ambient | ✅ |
| Headwear sync ao passo; abraço duo `silent`; destroy limpa dance | ✅ |
| XP/coins/counters não regridem via onChanged stale | ✅ |

## Comandos

```powershell
npm run check
npm test
node tests/tools/validate-ecosystem.mjs
node tests/runtime-smoke.mjs
```
