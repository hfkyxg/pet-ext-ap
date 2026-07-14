# Projeto Claw'd v3.1 — Visão Arquitetural e Funcional

> Documento executivo atualizado em 2026. Para detalhes de implementação, consulte [DOCUMENTACAO.md](./DOCUMENTACAO.md); para uso diário, consulte [MANUAL.md](./MANUAL.md).

## 1. Visão do produto

O Claw'd transforma a navegação web em uma experiência acompanhada, leve e gamificada. O mascote reage em tempo real sem bloquear o conteúdo, mantém sua personalização entre sessões e funciona localmente, sem servidor, conta ou telemetria.

O visual padrão é o sprite compacto vermelho de referência. Em repouso, as pernas permanecem imóveis; elas só alternam durante caminhada, corrida, inércia e embaixadinhas. Piscadas, bocas e balões de emoji são camadas independentes, portanto não deformam o corpo base.

## 2. Ecossistema funcional

- **Movimento adaptativo:** `requestAnimationFrame`, leitura da cadência real do navegador, arraste, touch, inércia e colisão suave nas bordas;
- **Emoções:** felicidade, fome, energia e higiene alimentam expressões, falas, piscadas e balões de emoji;
- **Personalização:** nome, cor, tamanho, velocidade, skins, name-tag, camisa, bolas e 14 acessórios em dois slots;
- **Sub-pets:** oito espécies com apelido, cor própria, sono, despertar sincronizado e ações especiais;
- **Gamificação:** XP, níveis, PixelCoins, loja, conquistas, streak, favoritos e missão diária;
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

A suíte local usa `node:test` e verificações de sintaxe para validar estado, migrações, catálogo, acessórios, sprite, emoções, modo liso, sub-pets, pesca, manifest, popup e reload seguro. A evolução recomendada é ampliar testes E2E em Chrome real, adicionar novas profissões/sub-pets e manter cada novo cosmético coberto por catálogo e CSS.

---

*Documentação Arquitetural — Claw'd v3.1 · 2026*
