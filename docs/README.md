# Documentação — Claw'd

Índice único. Markdown de produto em **[md/](./md/)**; vitrine interativa e arquitetura nesta pasta.

## Comece por aqui

| Documento | Para quem | Conteúdo |
|-----------|-----------|----------|
| [../README.md](../README.md) | Todo mundo | Visão, instalação, funcionalidades (v4.0.0) |
| [./index.html](./index.html) | Exploração visual | Demo guiada, labs, catálogos · badge **250/250** |
| [./ARCHITECTURE.md](./ARCHITECTURE.md) | Mantenedores | Camadas, padrões, contratos MV3 |
| [./MOTION.md](./MOTION.md) | UI / runtime / QA | Timings, rAF, overlays, teclado e movimento reduzido |
| [./md/DOCUMENTACAO.md](./md/DOCUMENTACAO.md) | Desenvolvedores | Protocolo interno, APIs, privacidade |
| [./md/MANUAL.md](./md/MANUAL.md) | Usuários finais | Controles, studio, status, FAQ |
| [./md/VALIDACAO.md](./md/VALIDACAO.md) | QA / release | Matriz de QA + gate **250/250** |
| [./md/MELHORIAS.md](./md/MELHORIAS.md) | Produto | Registro histórico v3.2 → v4.0 + polish |
| [../CHANGELOG.md](../CHANGELOG.md) | Todos | Histórico de versões |
| [./md/Documentacao_Projeto_Clawd.md](./md/Documentacao_Projeto_Clawd.md) | Executivo | Resumo de projeto |
| [./md/README.md](./md/README.md) | — | Índice só dos `.md` de produto |

## Gate de qualidade

```powershell
npm run check
npm test                                          # 250/250
node tests/tools/validate-ecosystem.mjs           # 100% ações no map
node tests/runtime-smoke.mjs                      # Edge/Chromium
```

## Código e testes

```
src/
  shared/catalog.js        # SSOT (schema v6 + CLAWD_TIMINGS)
  shared/i18n.js           # chrome UI + speech (11 locales)
  shared/i18n-entities.js  # labels dinâmicas (ações/loja/…)
  content/                 # runtime na página
  background/              # presença MV3
  popup/                   # UI + studio detach
  assets/ + shared/sprites/
tests/
  *.test.js           # contratos (node --test) — 224
  motion-harmony.test.js
  validation-complete.test.js
  runtime-smoke.mjs
  tools/              # geradores, shots, validate-ecosystem
docs/
  README.md           # este índice
  ARCHITECTURE.md
  MOTION.md            # contrato de movimento/interação
  index.html          # vitrine
  md/                 # markdown de produto
```
