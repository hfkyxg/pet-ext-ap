# tools/ — geradores e capturas

Scripts **one-off** (prefixo `_`) usados para arte, ícones e screenshots. Não fazem parte de `node --test tests/*.test.js`.

Rodar sempre a partir da **raiz do repositório**.

| Script | Função |
|--------|--------|
| `_crop-literal-sprites.mjs` | Fonte canônica dos PNGs em `src/shared/sprites/subpets/` |
| `_make-sprites.mjs` | Frames/preview em `tests/sprite-out/` (pacote só com `WRITE_PKG_SPRITES=1`) |
| `_inject-image-meta.mjs` | Injeta `image:{}` no catálogo a partir do meta do crop |
| `_make-icons.mjs` | Gera `src/assets/icons/icon-*.png` |
| `_extract-literal-sprites.mjs` / `_literal-to-catalog.mjs` | Pipelines auxiliares de sheet → catálogo |
| `_shot-*.mjs` | Capturas via Edge/CDP → `tests/_shots/` |
| `_patch-polish.mjs` | Patch pontual de CSS (histórico de polish) |

Saídas esperadas:

- `tests/sprite-out/` — sheet e previews (gitignored em parte; sheet canônico versionado conforme necessidade)
- `tests/_shots/` — artefatos de screenshot (gitignored)
