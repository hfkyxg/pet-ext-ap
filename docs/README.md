# Documentação — Claw'd

Índice único da documentação. Markdown de produto em **[md/](./md/)**; vitrine interativa e arquitetura nesta pasta.

## Comece por aqui

| Documento | Para quem | Conteúdo |
|-----------|-----------|----------|
| [../README.md](../README.md) | Todo mundo | Visão, instalação, funcionalidades |
| [./index.html](./index.html) | Exploração visual | Demo guiada, labs, catálogos |
| [./ARCHITECTURE.md](./ARCHITECTURE.md) | Mantenedores | Camadas, padrões, contratos MV3 |
| [./md/DOCUMENTACAO.md](./md/DOCUMENTACAO.md) | Desenvolvedores | Protocolo interno, APIs, privacidade |
| [./md/MANUAL.md](./md/MANUAL.md) | Usuários finais | Controles e uso diário |
| [./md/VALIDACAO.md](./md/VALIDACAO.md) | QA / release | Evidências da suíte e smoke |
| [./md/MELHORIAS.md](./md/MELHORIAS.md) | Produto | Registro v3.2 e ideias |
| [../CHANGELOG.md](../CHANGELOG.md) | Todos | Histórico de versões |
| [./md/Documentacao_Projeto_Clawd.md](./md/Documentacao_Projeto_Clawd.md) | Executivo | Resumo de projeto |
| [./md/README.md](./md/README.md) | — | Índice só dos `.md` de produto |

## Código e testes

```
src/
  shared/catalog.js   # SSOT
  content/            # runtime na página
  background/         # presença MV3
  popup/              # UI
  assets/ + shared/sprites/
tests/
  *.test.js           # contratos (node --test)
  runtime-smoke.mjs   # Chromium real
  tools/              # geradores e capturas one-off
  sprite-out/         # sheet canônico + previews
docs/
  README.md           # este índice
  ARCHITECTURE.md     # camadas e padrões
  index.html          # vitrine interativa
  md/                 # markdown de produto
```
