# Documentação — Claw'd

Índice único. Markdown de produto em **[md/](./md/)**; vitrine interativa e arquitetura nesta pasta.

## Comece por aqui

| Documento | Para quem | Conteúdo |
|-----------|-----------|----------|
| [../README.md](../README.md) | Todo mundo | Visão, instalação, funcionalidades (v3.7.3) |
| [./index.html](./index.html) | Exploração visual | Demo guiada, labs, catálogos · badge **164/164** |
| [./ARCHITECTURE.md](./ARCHITECTURE.md) | Mantenedores | Camadas, padrões, contratos MV3 |
| [./md/DOCUMENTACAO.md](./md/DOCUMENTACAO.md) | Desenvolvedores | Protocolo interno, APIs, privacidade |
| [./md/MANUAL.md](./md/MANUAL.md) | Usuários finais | Controles, studio, status, FAQ |
| [./md/VALIDACAO.md](./md/VALIDACAO.md) | QA / release | Matriz fases 1–6 + gate |
| [./md/MELHORIAS.md](./md/MELHORIAS.md) | Produto | Registro histórico v3.2 → v3.6 |
| [../CHANGELOG.md](../CHANGELOG.md) | Todos | Histórico de versões |
| [./md/Documentacao_Projeto_Clawd.md](./md/Documentacao_Projeto_Clawd.md) | Executivo | Resumo de projeto |
| [./md/README.md](./md/README.md) | — | Índice só dos `.md` de produto |

## Gate de qualidade

```powershell
npm run check
npm test                                          # 164/164
node tests/tools/validate-ecosystem.mjs           # 100% ações no map
node tests/runtime-smoke.mjs                      # Edge/Chromium
```

## Código e testes

```
src/
  shared/catalog.js   # SSOT (schema v5)
  content/            # runtime na página
  background/         # presença MV3
  popup/              # UI + studio detach
  assets/ + shared/sprites/
tests/
  *.test.js           # contratos (node --test) — 159
  validation-complete.test.js
  runtime-smoke.mjs
  tools/              # geradores, shots, validate-ecosystem
docs/
  README.md           # este índice
  ARCHITECTURE.md
  index.html          # vitrine
  md/                 # markdown de produto
```
