# 📘 Claw'd — Manual de Instruções

> Guia completo de uso para quem acabou de adotar o Claw'd. 🐾
> Nada de código aqui — só como usar. Para conhecer tudo visualmente, abra a [Documentação Interativa](../index.html); para detalhes técnicos, veja a [Documentação](./DOCUMENTACAO.md).

---

## 1. O que é o Claw'd?

O Claw'd é um mascote virtual em pixel-art que mora no seu navegador. Ele aparece em qualquer site, anda pela tela, reage ao que você faz, dorme quando você some, e evolui de nível conforme vocês interagem. Pense num Tamagotchi que acompanha sua navegação.

---

## 2. Instalação

1. Baixe ou clone o projeto para uma pasta no seu computador;
2. Abra o Chrome (ou Edge/Brave) e digite na barra de endereço: `chrome://extensions/`;
3. Ative o **Modo do desenvolvedor** (interruptor no canto superior direito);
4. Clique em **"Carregar sem compactação"**;
5. Selecione a pasta do projeto.

Pronto — o Claw'd aparece no canto inferior direito de qualquer site que você abrir. 🎉

> 💡 **Dica:** fixe o ícone da extensão na barra do navegador (ícone de quebra-cabeça → alfinete) para acessar o menu rapidamente.

---

## 3. Primeiros passos

| Faça isto | E acontece isto |
|-----------|-----------------|
| **Clique** no pet | Ele pula de alegria, solta corações ❤️ e ganha +5 XP |
| **Arraste** o pet | Ele muda de lugar, desliza com inércia ao soltar e memoriza a posição |
| **Role a página** | Ele fica elétrico ⚡ por um instante |
| **Mova o mouse** por perto | Os olhos dele acompanham o cursor (efeito 3D) |
| **Fique 30s sem mexer** | Ele boceja e cai no sono 💤 |
| **Clique nele dormindo** | Ele acorda com um "Bom dia! ☀️" |

No celular/tablet, toque e arraste funcionam do mesmo jeito.

Para ensaiar tudo antes de usar a extensão, abra a [Demonstração Executável](../index.html#demonstracao): são 18 capítulos com reprodução, pausa, seleção direta e explicação quadro a quadro, do pop-in ao subpet especial.

---

## 4. O Menu (popup)

Clique no **ícone da extensão** para abrir o menu. No topo você vê o preview do pet, o status de conexão e a **barra de XP com o nível atual**.

### 🎨 Aba Aparência

- **Nome do pet** — digite e o name-tag muda na hora (mostra **título do nível** + nome);
- **Modelo do pet** — escolha entre Clássico, Mini, Pinças e Guardião; o Clássico preserva exatamente a silhueta compacta original;
- **Cor principal** — cores prontas ou o seletor para qualquer cor;
- **Rosto e olhos** — **9 rostos** (Clássico, Brilho, Focado, Sonolento, Piscadela, Fofinho, Bravo, Apaixonado, Babão) e cor de olhos independente do corpo;
- **Tamanho** — de 0.8× (mini) a 3× (gigante);
- **Velocidade da animação** — deixe-o zen (0.5×) ou hiperativo (3×);
- **Visual liso** — conserva a geometria angular do pet, mas usa superfícies contínuas no lugar das células quadradas; não exibe grade ou textura e não transforma o Claw'd em slime;
- **Contorno** — borda escura ao redor do pet (destaca em fundos claros);
- **Exibir boca** — ligada por padrão; desligue para remover somente a boca (olhos, piscadas e balões de emoji continuam ativos);
- **Skin do corpo** — **7 skins** (Normal, Orelhas caídas, Robô, Sardas, Listras, Manchas, Brilho), combinável com qualquer modelo e rosto;
- **Provador ao vivo** — mostra a mesma arte CSS do pet e combina modelo + rosto + skin + cabeça + rosto/corpo antes de você fechar o popup; a etiqueta abaixo do preview espelha título + nome;
- **Studio na página** — botão para abrir o painel de personalização **sobre a página** (arrastável pelos cantos ou posição livre); ou **janela destacável** (`popup.html?detached=1`) para não depender do popup da barra;
- **Acessórios** — **31** opções em **três slots** (cabeça, rosto, **corpo**), com miniaturas pixel-art reais. Selecione ou passe o cursor para ler a descrição; chapéus acompanham o passo e ficam parados em repouso.

#### Status clicáveis

Na barra de status (felicidade / saciedade / energia / higiene), **clique no medidor** para disparar a ação correspondente: carinho, alimentar, brincar ou banho — sem precisar ir à aba Ações. Cada barra mostra a **porcentagem ao vivo**; a barra de XP exibe `atual/próximo · %` até o próximo nível. Abaixo há **ações rápidas** (aceno, dança, pose, sono, balão, torcida).

#### Slot de Corpo (novo em v3.3)

O terceiro slot veste o **peito/pescoço** (abaixo do rosto) e combina com qualquer cabeça ou rosto:

| Acessório | Desbloqueio | Efeito especial |
|-----------|-------------|-----------------|
| 🎀 **Ribbon** | Grátis | Laço no peito/pescoço |
| 🪽 **Wings** | Nível 15 | Asas laterais + levitação suave no idle |
| 🦸 **Cape** | Loja (80 coins) | Capa atrás do corpo ao caminhar |
| 🛡️ **Armor** | Loja (100 coins) | Armadura abaixo dos olhos |
| 🧣 **Scarf (corpo)** | Catálogo | Cachecol no pescoço |

### 💼 Aba Profissão

A profissão muda o comportamento do pet:

| Profissão | O que ele faz |
|-----------|---------------|
| 🐾 **Livre** | Modo padrão, sem profissão |
| ⚽ **Jogador** | Ganha boné + uma **bola jogável no pé direito** (longe do subpet). **Toque na bola** para fazer embaixadinhas pixel-art (contador ao vivo e combos!) e **dê duplo-clique para chutar a gol** à direita — quanto maior a sequência, maior o golaço (+XP). Em sites de esporte (ge, ESPN…), ele treina embaixadinhas sozinho |
| 📚 **Tutor** | Veste óculos e fica de olho: em redes sociais, ele lembra você de focar nos estudos |
| 💻 **Dev** | Coloca os fones e reage a GitHub, Stack Overflow e documentações |
| 🎸 **Músico** | Toca riffs, dança e reage em sites de música |
| 🧑‍🍳 **Chef** | Cozinha e torna a alimentação duas vezes mais eficaz |
| 🥷 **Ninja** | Desaparece, corre e surpreende com truques próprios |
| 🎣 **Pescador** | Monta lago e vara, espera a fisgada e captura peixes |
| 🩺 **Doutor** | Reage a sites de saúde; banho rende +higiene extra |
| 🎨 **Artista** | Pinta no idle; spawn de estrelas ao posar |
| 🎮 **Gamer** | Reage a sites de jogos; combo de ações dá XP bônus |
| 📡 **Streamer** | Dança em sites de streaming; balão especial ao ficar 5min na aba |

O equipamento indicado pela profissão é temporário e aparece com o selo **PROF.**. Sua escolha pessoal continua salva e volta automaticamente ao selecionar **Livre**.

### 🧠 Aba Comportamento

- **Balão de fala** — liga/desliga as mensagens aleatórias;
- **Andar automático** — ele passeia sozinho pela tela de tempos em tempos;
- **Dormir quando ocioso** — desative se quiser o pet sempre acordado;
- **Passear entre abas** — mantém somente um Claw'd principal e permite definir a frequência da viagem;
- **Pegadas** — mostra onde o pet não está quando o passeio entre abas está ativo;
- **Sons** — bipes 8-bit em ações (ligado por padrão); o volume fica no controle ao lado (ao arrastar, um chirp de prévia toca no próprio menu);
- **Horário de silêncio** — intervalo em que o pet não fala, anda sozinho nem toca sons;
- **Sites bloqueados** — um domínio por linha (ex.: `meubanco.com.br`); o pet não aparece nesses hosts nem em subdomínios;
- **Exportar / Importar dados** — backup JSON do progresso (XP, conquistas, favoritos, sub-pets).

### 🐕 Sub-pets

Ao selecionar um subpet, você pode definir um **apelido**, a **cor do corpo** e uma **cor independente para os olhos**. O nome aparece nas falas; o corpo recebe uma sombra mais escura automaticamente para preservar a profundidade da pixel-art.

Clique ou use Enter/Espaço no subpet para fazer carinho. Se ele estiver dormindo, acordará com uma animação própria; quando o Claw'd principal acorda, os dois despertam juntos.

No painel **Interações ao vivo**, escolha uma destas **sete** ações:

- **🫶 Carinho** — aproxima a dupla, mostra coração e gera partículas;
- **🎾 Brincar** — ativa pulos e uma resposta animada;
- **🔎 Explorar** — o subpet percorre outra região da página;
- **🌀 Rodopiar** — executa um giro curto;
- **🎉 Comemorar** — pet e subpet festejam juntos;
- **🤗 Abraço** — abraço em duo com feedback visual;
- **✨ Especial** — usa o comportamento exclusivo da espécie, como fogo/voo do dragão, corrida do dinossauro ou desaparecimento do fantasma.

Qualquer ação manual acorda o subpet antes de começar. Se você escolher outra enquanto uma animação ainda acontece, a nova ação assume de forma imediata.

De tempos em tempos, com os dois idle, o Claw'd e o subpet fazem **cenas em duo** sozinhos (abraço, brincadeira, soneca sincronizada ou comemoração). Depois de uns 45–90 s na mesma página, o pet também pode **explorar a estrutura da página** (caminhar até um título/botão e “espiar” o conteúdo).

### 🎣 Profissão Pescador

O Pescador monta um lago e uma vara ao lado do pet. Depois de alguns segundos o peixe fisga: clique no lago para puxar imediatamente ou aguarde a captura automática. Peixes raros rendem mais XP e ativam uma comemoração especial.

### ⚡ Aba Ações

Botões de comando imediato: 👋 **Acenar** · 🕺 **Dançar** · ❤️ **Carinho** · 🍖 **Alimentar** · 🎾 **Brincar** · 📸 **Posar** · 🫧 **Banho** · 😴 **Dormir** · ☀️ **Acordar** · 🎣 **Pescar** · 🦘 **Pular** · 🤾 **Esticar** · 🦁 **Rugir** · 🌀 **Girar** · 🎈 **Balão** · 🤗 **Abraçar** · 🤸 **Flip** · 🧘 **Meditar** · ⚡ **Elétrico** · 💤 **Cochilo** · e outras ações do catálogo (**30** no popup; kick/keepy/superdance via Jogador / motor).

Abaixo deles:

- **👁️ Mostrar / Ocultar** — esconde o pet temporariamente (útil em apresentações);
- **🔄 Resgatar pet** — perdeu o pet atrás de algum elemento? Isso o traz de volta ao canto inferior direito.

### 🎯 Missão diária

Na aba **🏆 Conquistas**, uma missão muda diariamente. Ela acompanha ações reais (carinho, comida, brincadeira, dança, passeio, pesca, gols, banho, acessório, sub-pet, combo, profissão, **balões** ou **embaixadinhas**), mostra o progresso em tempo real e libera XP + PixelCoins ao clicar em **Resgatar**. A recompensa só pode ser coletada uma vez por dia.

### 🏅 Desafio Semanal (novo em v3.3)

Logo abaixo das missões diárias, a seção **Desafio da Semana** mostra um objetivo maior (troca de semana toda segunda-feira zero-hora). Cada semana traz um dos quatro desafios rotativos com barra de progresso e recompensa especial (XP elevado + badge visual). Clique em **Resgatar** quando completar para receber o prêmio — só é possível uma vez por semana.

### 🔥 Sistema de Combo (novo em v3.3)

Faça **3 ou mais ações em sequência dentro de 10 segundos** para ativar o combo. O balão mostra o multiplicador atual (×3, ×4…) e ao atingir ×5 o XP recebido sobe automaticamente. Manter o ritmo é a forma mais rápida de evoluir de nível e desbloquear a conquista **Combo King**.

---

## 5. XP e Níveis

O Claw'd evolui com carinho:

- Carinho (clique): **+5 XP** · Golaço na bola: **+10 XP**;
- O primeiro nível exige **50 XP** e os seguintes usam uma curva progressiva, com festa de partículas e balão de nível;
- O progresso fica na barra do menu e **é salvo para sempre** — mesmo fechando o navegador.

---

## 6. Perguntas frequentes

**O pet sumiu!**
Abra o menu → aba Ações → **🔄 Resgatar pet**. Ele volta ao canto da tela.

**Apareceu mais de um pet depois de atualizar a extensão.**
Na v3.2, basta clicar em **Recarregar** em `chrome://extensions`: a extensão remove automaticamente instâncias antigas de todas as abas e recria somente o pet principal na aba ativa.

**Ele não aparece em uma página.**
Algumas páginas internas do navegador (chrome://, loja de extensões, PDFs) não aceitam extensões — é limitação do Chrome, não do pet.

**As falas estão me atrapalhando.**
Menu → Comportamento → desligue o **Balão de fala**. Você também pode desligar o andar automático ou definir um **horário de silêncio**.

**Não ouço os sons.**
O Chrome só libera áudio depois de um clique/toque na página. Clique uma vez na aba e tente de novo; confira se **Sons** está ligado e se você não está em horário de silêncio.

**Quero o pet sem boca, mas ainda expressivo.**
Menu → Aparência → desligue **Exibir boca**. As piscadas, emoções dos olhos e o balão de emojis continuam funcionando.

**Quero recomeçar do zero.**
Remova e reinstale a extensão em `chrome://extensions/` — isso apaga todas as configurações e o XP.

**O pet me espiona?**
Não. Nenhum dado sai do seu navegador: não há servidores, contas nem rastreamento. Ele só olha o *endereço* do site (para as reações de profissão), nunca o conteúdo. Veja a seção Privacidade da [Documentação](./DOCUMENTACAO.md#7-privacidade-e-segurança).

**Ele funciona no Firefox?**
Ainda não — por enquanto Chrome, Edge e Brave. Suporte a Firefox está nas ideias de contribuição.

**O prop da profissão não aparece (frigideira, cursor, chuteira…)**
Confirme que o pet está no estado correto: chef animado aparece só durante a ação `cooking` (quando o pet está em modo chef em um site de culinária ou via ação manual). O cursor do dev pisca sempre que a profissão "Dev" está ativa.

**O leitor de tela não anuncia as emoções.**
As mudanças de emoção são anunciadas via `aria-live="polite"` — elas só aparecem quando a emoção MUDA (ex: de "contente" para "com fome"). Certifique-se de que o leitor de tela está configurado para regiões live.

**O sub-pet some após fechar e reabrir a aba.**
Normal — o sub-pet é recriado a cada carga da página. Ele volta automaticamente se estiver ativo (`subpets.active` definido no estado).

---

## 7. Atalhos de teclado

| Atalho | Ação |
|--------|------|
| `Alt + F` | Dar comida ao pet (alimentar) |
| `Alt + H` | Carinho — pet pula de alegria |
| `Alt + P` | Pose — pet congela com brilho dourado |
| `Alt + Z` | Dormir / Acordar (toggle) |
| `Enter` / `Espaço` no pet | Igual a um clique |
| Clique no emoji 🍖 (popup) | Alimentar rapidamente sem sair do popup |
| Clique nos medidores de status | Carinho / alimentar / brincar / banho |
| `Enter` / `Espaço` no 🍖 | Mesmo efeito via teclado |
| Botão Studio / Destacar | Painel móvel na página ou janela destacável |

> **Dica Dev:** com a profissão **Dev (engineer)**, ao focar um campo de texto o pet entra em `typing` e mostra o laptop. Nas outras profissões ele só fica curioso.

---

## 8. Recursos avançados já disponíveis

O Claw'd v3.7 inclui **4 modelos × 9 rostos × 7 skins**, olhos independentes, skins combináveis, **favoritos ⭐**, **sub-pets** (cachorro, gato, dinossauro, dragão…) com arte PNG literal, **31 acessórios em 3 slots**, **12 profissões** com contexto de página e props animados únicos, **30 ações** no popup (+ kick/keepy/superdance), **status clicáveis** e emoções estilo Tamagotchi com anúncio acessível, **Studio in-page** + janela destacável, sistema de **combo**, **12 desafios semanais** rotativos, **34 conquistas** (incl. balão/keepy), **14 quests diárias**, **traços de personalidade** que afetam o comportamento real do sub-pet, **voz customizada**, **cor de partícula**, **volumes por categoria**, partículas sazonais e pixel ricas, animações de hover/ring/speed-lines/skins e o pet **passeando entre suas abas**. A bola do Jogador fica no **pé direito**, em pixel-art nítido. O histórico de versões está no [CHANGELOG.md](../../CHANGELOG.md); o registro técnico das entregas está no [MELHORIAS.md](./MELHORIAS.md). Validação atual: [VALIDACAO.md](./VALIDACAO.md) (**156/156**).

### Personalização avançada (v3.3)

| Opção | Onde | O que faz |
|-------|------|-----------|
| **Traços de personalidade** | Aba Comportamento | 5 sliders (playful, lazy, curious, social, foodie) que afetam frequência de ações e falas |
| **Voz customizada** | Aba Config | Textarea com frases personalizadas que o pet fala aleatoriamente |
| **Cor de partícula** | Aba Config | Color picker para substituir o tema padrão de partículas |
| **Volume de ações** | Aba Config | Slider separado para sons de ações do pet |
| **Volume ambiente** | Aba Config | Slider separado para sons ambientes e idle |
| **Tema de name-tag** | Aba Aparência | 7 opções: classic, neon, pastel, dark, ocean, rainbow, holographic, minimal |

---

*Manual de Instruções — Claw'd · 2026 · Feito com ❤️ e muitos pixels*
