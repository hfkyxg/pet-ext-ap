# 📘 Claw'd — Manual de Instruções

> Guia completo de uso para quem acabou de adotar o Claw'd. 🐾
> Nada de código aqui — só como usar. Para detalhes técnicos, veja a [Documentação](./DOCUMENTACAO.md).

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

---

## 4. O Menu (popup)

Clique no **ícone da extensão** para abrir o menu. No topo você vê o preview do pet, o status de conexão e a **barra de XP com o nível atual**.

### 🎨 Aba Aparência

- **Nome do pet** — digite e o name-tag muda na hora;
- **Cor principal** — 8 cores prontas ou o seletor para qualquer cor;
- **Tamanho** — de 0.8× (mini) a 3× (gigante);
- **Velocidade da animação** — deixe-o zen (0.5×) ou hiperativo (3×);
- **Visual liso** — conserva a geometria angular do pet, mas usa superfícies contínuas no lugar das células quadradas; não exibe grade ou textura e não transforma o Claw'd em slime;
- **Contorno** — borda escura ao redor do pet (destaca em fundos claros);
- **Acessórios** — 14 opções em dois slots, incluindo boné, cartola, coroa, óculos, óculos de sol, laço, fones e mochila.

### 💼 Aba Profissão

A profissão muda o comportamento do pet:

| Profissão | O que ele faz |
|-----------|---------------|
| 🐾 **Livre** | Modo padrão, sem profissão |
| ⚽ **Jogador** | Ganha boné + uma **bola jogável** ao lado dele. Clique na bola para ele marcar um golaço (+10 XP!). Em sites de esporte (ge, ESPN…), ele comemora sozinho |
| 📚 **Tutor** | Veste óculos e fica de olho: em redes sociais, ele lembra você de focar nos estudos |
| 💻 **Dev** | Coloca os fones e reage a GitHub, Stack Overflow e documentações |
| 🎸 **Músico** | Toca riffs, dança e reage em sites de música |
| 🧑‍🍳 **Chef** | Cozinha e torna a alimentação duas vezes mais eficaz |
| 🥷 **Ninja** | Desaparece, corre e surpreende com truques próprios |
| 🎣 **Pescador** | Monta lago e vara, espera a fisgada e captura peixes |

### 🧠 Aba Comportamento

- **Balão de fala** — liga/desliga as mensagens aleatórias;
- **Andar automático** — ele passeia sozinho pela tela de tempos em tempos;
- **Dormir quando ocioso** — desative se quiser o pet sempre acordado.
- **Passear entre abas** — mantém somente um Claw'd principal e permite definir a frequência da viagem;
- **Pegadas** — mostra onde o pet não está quando o passeio entre abas está ativo.

### 🐕 Sub-pets

Ao selecionar um sub-pet, você pode definir um apelido e uma cor própria. O nome aparece nas falas e a cor é aplicada ao sprite pixel-art, incluindo uma sombra mais escura automaticamente.

Clique ou use Enter/Espaço no sub-pet para fazer carinho. Se ele estiver dormindo, acordará com uma animação própria; quando o Claw'd principal acorda, os dois despertam juntos. Sub-pets também brincam, correm, cochilam e fazem uma reação especial conforme a espécie.

### 🎣 Profissão Pescador

O Pescador monta um lago e uma vara ao lado do pet. Depois de alguns segundos o peixe fisga: clique no lago para puxar imediatamente ou aguarde a captura automática. Peixes raros rendem mais XP e ativam uma comemoração especial.

### ⚡ Aba Ações

Botões de comando imediato: 👋 **Acenar** · 🕺 **Dançar** · ❤️ **Carinho** · 🍖 **Alimentar** · 🎾 **Brincar** · 📸 **Posar** · 🫧 **Banho** · 😴 **Dormir** · ☀️ **Acordar** · 🎣 **Pescar** · 🦘 **Pular** · 🤾 **Esticar** · 🦁 **Rugir**.

Abaixo deles:

- **👁️ Mostrar / Ocultar** — esconde o pet temporariamente (útil em apresentações);
- **🔄 Resgatar pet** — perdeu o pet atrás de algum elemento? Isso o traz de volta ao canto inferior direito.

### 🎯 Missão diária

Na aba **🏆 Conquistas**, uma missão muda diariamente. Ela acompanha ações reais (carinho, comida, brincadeira, dança, passeio, pesca ou gols), mostra o progresso em tempo real e libera XP + PixelCoins ao clicar em **Resgatar**. A recompensa só pode ser coletada uma vez por dia.

---

## 5. XP e Níveis

O Claw'd evolui com carinho:

- Carinho (clique): **+5 XP** · Golaço na bola: **+10 XP**;
- A cada **50 XP** ele sobe de nível, com festa de partículas e balão "🎖️ Level X!";
- O progresso fica na barra do menu e **é salvo para sempre** — mesmo fechando o navegador.

---

## 6. Perguntas frequentes

**O pet sumiu!**
Abra o menu → aba Ações → **🔄 Resgatar pet**. Ele volta ao canto da tela.

**Apareceu mais de um pet depois de atualizar a extensão.**
Na v3.1, basta clicar em **Recarregar** em `chrome://extensions`: a extensão remove automaticamente instâncias antigas de todas as abas e recria somente o pet principal na aba ativa.

**Ele não aparece em uma página.**
Algumas páginas internas do navegador (chrome://, loja de extensões, PDFs) não aceitam extensões — é limitação do Chrome, não do pet.

**As falas estão me atrapalhando.**
Menu → Comportamento → desligue o **Balão de fala**. Você também pode desligar o andar automático.

**Quero recomeçar do zero.**
Remova e reinstale a extensão em `chrome://extensions/` — isso apaga todas as configurações e o XP.

**O pet me espiona?**
Não. Nenhum dado sai do seu navegador: não há servidores, contas nem rastreamento. Ele só olha o *endereço* do site (para as reações de profissão), nunca o conteúdo. Veja a seção Privacidade da [Documentação](./DOCUMENTACAO.md#7-privacidade-e-segurança).

**Ele funciona no Firefox?**
Ainda não — por enquanto Chrome, Edge e Brave. Suporte a Firefox está nas ideias de contribuição.

---

## 7. Recursos avançados já disponíveis

O Claw'd já inclui **favoritos ⭐**, **sub-pets** (cachorro, gato, dinossauro, dragão…), **status e emoções** estilo Tamagotchi, balões de emoji, piscadas e expressões, embaixadinhas ⚽, **óculos de sol 🕶️**, lojinha com PixelCoins, conquistas, missão diária e o pet **passeando entre suas abas abertas**. Novas ideias e melhorias futuras estão no [MELHORIAS.md](./MELHORIAS.md).

---

*Manual de Instruções — Claw'd · 2026 · Feito com ❤️ e muitos pixels*
