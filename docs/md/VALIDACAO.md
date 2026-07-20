# Relatório de Validação — Claw'd v3.7.2

**Data:** 20 de julho de 2026 (validação expandida: smoke duo/partículas/skins/subpets + 156 contratos)  
**Ambiente:** Windows · Node.js 24 · Edge/Chromium  
**Marco:** **156/156** contratos — animações, interações, ações 100%, acessórios, 9 rostos, skins animadas, partículas ricas

## Resultado

- Verificações de sintaxe (`npm run check`): **aprovadas**
- Suíte `node:test`: **156/156**
- `validate-ecosystem`: **ECOSYSTEM_STATIC_OK** · version **3.7.2** (30/30 ações + extras)
- Lint (`eslint src tests`): **0 erros**
- Smoke Chromium: **runtimeErrors: 0** · 3/3 reloads · **7 skins** · duo pet↔subpet · partículas DOM · multi-clique · cat/dragon · props chef/ninja/streamer
- Polish: fones/facewear nítidos, FX ambient, crisp-edges, duo hug sem fala duplicada
- Sync: `storage.onChanged` não regride XP/coins/counters (Math.max)
- Duo: walk/run sync, classes preservadas, carinho→petting, settle ao fim

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
| Anti-bloom: sombra seca, sparks/dust nítidos, noParticles em pó | ✅ |
| Duo walk/run CSS vars + steps(2); hug/play/celebrate alinhados | ✅ |
| giveAffection → petting-subpet + being-petted; settle pós-interação | ✅ |
| Smoke: 7 skins `dataset.skin` + `.skin-mod` visível | ✅ |
| Smoke: duo carinho/play + feed/sleep/wake subpet (dog) | ✅ |
| Smoke: partículas `.aic-particle` spawn/cleanup + `noParticles` | ✅ |
| Smoke: multi-clique 2=somersault, 3=superdance, 5=tantrum | ✅ |
| Smoke: subpets cat + dragon (sprite + interação) | ✅ |
| Smoke: props profissão chef/ninja/streamer no DOM | ✅ |
| Estático: matriz subpet 8×7 + `_clearActionClasses` preserva duo | ✅ |
| Estático: name-tag neon/holographic anti-bloom (`text-shadow: none`) | ✅ |

## Comandos

```powershell
npm run check
npm test
node tests/tools/validate-ecosystem.mjs
node tests/runtime-smoke.mjs
```
