# Projeto Claw'd v3.7 — Visão Arquitetural e Funcional

> Documento executivo atualizado em julho/2026. Conheça o sistema na [Documentação Interativa](../index.html), consulte a implementação em [DOCUMENTACAO.md](./DOCUMENTACAO.md) e o uso diário em [MANUAL.md](./MANUAL.md).

## 1. Visão do produto

O Claw'd transforma a navegação web em uma experiência acompanhada, leve e gamificada. O mascote reage em tempo real sem bloquear o conteúdo, mantém sua personalização entre sessões e funciona localmente, sem servidor, conta ou telemetria.

O visual padrão é o sprite compacto vermelho de referência, com **boca ligada por padrão** (`showMouth: true`). Em repouso, as pernas permanecem imóveis; elas só alternam durante caminhada, corrida, inércia e embaixadinhas. Piscadas, bocas e balões de emoji são camadas independentes, portanto não deformam o corpo base. Os oito sub-pets usam PNGs literais do sheet em `src/shared/sprites/subpets/` (frames em `CLAWD_SUBPET_SPRITES`) e fallback `box-shadow` sob paleta custom. Com companheiro ativo, há cenas **duo** e, após dwell na página, engajamento visual (`page-peek` / `look-around`).

## 2. Ecossistema funcional

- **Movimento adaptativo:** `requestAnimationFrame`, leitura da cadência real do navegador, arraste, touch, inércia e colisão suave nas bordas;
- **Emoções:** felicidade, fome, energia e higiene alimentam expressões, falas, piscadas e balões de emoji;
- **Personalização:** nome, cor, tamanho, velocidade, skins, name-tag, camisa, bolas, provador pixel/liso e **31 acessórios** em três slots;
- **Sub-pets:** oito espécies com arte PNG + frames no catálogo, apelido, cores independentes de corpo e olhos, sono, despertar sincronizado, **sete** ações manuais e habilidades especiais;
- **Gamificação:** XP, níveis, PixelCoins, loja, **34** conquistas, streak, favoritos e **14** tipos de missão diária (incl. balões/keepy);
- **Persistência:** estado versionado e migrado em `chrome.storage.local`;
- **Presença entre abas:** um único pet principal via service worker e `chrome.storage.session`.

## 3. Profissões e interatividade

| Profissão | Visual e comportamento |
|-----------|------------------------|
| ⚽ Jogador | Camisa customizável, bola jogável, gols e embaixadinhas com recorde |
| 📚 Tutor | Óculos, lembretes de foco e desafios rápidos em contextos de distração |
| 💻 Dev | Fones/laptop, digitação e reações em repositórios e documentações |
| 🎸 Músico | Riffs, notas e dança em páginas de música |
| 🧑‍🍳 Chef | Cozinha, reage a receitas e melhora a alimentação |
| 🥷 Ninja | Corridas, desaparecimento e surpresa |
| 🎣 Pescador | Lago pixelado, vara, linha, fisgada interativa e peixes raros |
| 🩺 Doutor | Reações em sites de saúde; banho com bônus de higiene |
| 🎨 Artista | Pinta no idle; estrelas ao posar |
| 🎮 Gamer | Combo de ações com XP bônus em sites de jogos |
| 📡 Streamer | Cena AO VIVO distinta em sites de streaming |
| 🐾 Livre | Comportamento geral sem identidade profissional |

## 4. Ciclo de vida e reload seguro

O content script possui um `destroy()` idempotente que encerra listeners, intervalos, timers conhecidos, animações, conexão cross-tab e sub-pet antes de remover os elementos injetados. Um token de boot impede callbacks assíncronos antigos de criarem uma segunda instância.

Após recarregar, atualizar ou reativar a extensão, o service worker executa uma reconciliação por sessão:

1. encontra abas HTTP, HTTPS e `file:` elegíveis;
2. remove pets e elementos auxiliares órfãos;
3. seleciona a aba ativa da janela focada;
4. injeta nela somente o pet principal novo;
5. registra um marcador de sessão para não repetir a limpeza a cada despertar do service worker.

## 5. Privacidade e limites

O projeto não usa IA remota nem lê o conteúdo de formulários. As reações contextuais consultam apenas o hostname atual. Páginas internas do navegador, Chrome Web Store e alguns visualizadores protegidos não aceitam content scripts por restrição do próprio navegador.

## 6. Qualidade e evolução

A suíte local usa `node:test` e verificações de sintaxe para validar estado, migrações, catálogo, acessórios, sprite, emoções, modo liso, sub-pets, documentação, pesca, manifest, popup, reload seguro, bfcache, áudio pós-gesto, allowlists, save coalesce, gamificação e harmonia da fase (contexto/weekly/personalidade). Em 21/07/2026, **165/165 contratos** passaram; o catálogo vivo registra **30** ações no popup (+ kick/keepy/superdance), **31** acessórios, **12** profissões, **9** rostos (incl. Babão), **7** skins, **34** conquistas, **14** quests e **12** desafios semanais; **v3.8.0** inclui i18n (11 locales), posições de toast/balão/badge, Trello ([board pet](https://trello.com/b/8wGr5tiQ/pet)), e layering pet/subpet corrigido; o smoke test em Chromium confirma sprites unificados em `CLAWD_SUBPET_SPRITES`, três reloads com uma única instância e zero erros de runtime.

A vitrine em `docs/index.html` documenta visualmente o produto, carrega os catálogos reais e oferece laboratórios interativos do Claw'd e dos sub-pets. O painel de demonstração executa um roteiro de 45 segundos com 18 capítulos e gera 18 evidências quadro a quadro para presença, estados, profissões, gamificação e personalização. Os controles aceitam mouse, teclado e seleção direta; o layout foi verificado em desktop e 375 px, sem overflow ou logs de erro. Ela não depende de CDN, build ou servidor de aplicação.

---

*Documentação Arquitetural — Claw'd v3.8 · 2026*
