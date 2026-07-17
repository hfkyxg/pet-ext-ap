# tools/ — geradores e capturas

Scripts one-off usados para arte, ícones e screenshots. Não fazem parte de `node --test tests/*.test.js`.

> **Chrome MV3:** nomes começando com `_` são reservados no pacote da extensão — estes scripts **não** usam prefixo `_`.

Rodar sempre a partir da **raiz do repositório**.

| Script | Função |
|--------|--------|
| `crop-literal-sprites.mjs` | Fonte canônica dos PNGs em `src/shared/sprites/subpets/` |
| `make-sprites.mjs` | Frames/preview em `tests/sprite-out/` (pacote só com `WRITE_PKG_SPRITES=1`) |
| `inject-image-meta.mjs` | Injeta `image:{}` no catálogo a partir do meta do crop |
| `make-icons.mjs` | Gera `src/assets/icons/icon-*.png` |
| `extract-literal-sprites.mjs` / `literal-to-catalog.mjs` | Pipelines auxiliares de sheet → catálogo |
| `shot-*.mjs` | Capturas via Edge/CDP → `tests/shots/` (perfil Edge em `.tmp/`) |
| `patch-polish.mjs` | Patch pontual de CSS (histórico de polish) |
| `validate-ecosystem.mjs` | Validação estática do ecossistema |

Saídas esperadas:

- `tests/sprite-out/` — sheet e previews (gitignored em parte; sheet canônico versionado conforme necessidade)
- `tests/shots/` — artefatos de screenshot (gitignored)
- `.tmp/` — perfis isolados do Edge/Chrome para CDP (gitignored)
