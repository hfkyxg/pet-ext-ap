<div align="center">

<img src="src/assets/pet-banner.svg" width="100%" alt="Claw'd — Companheiro de Navegação" />

<br/>

[![Manifest V3](https://img.shields.io/badge/Manifest-V3-red?style=for-the-badge&logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/)
[![Version](https://img.shields.io/badge/version-3.2-ff4757?style=for-the-badge)](./manifest.json)
[![License](https://img.shields.io/badge/license-MIT-2ecc71?style=for-the-badge)](./LICENSE)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-f1c40f?style=for-the-badge&logo=javascript&logoColor=black)](./src/)

**Claw'd** é uma extensão Chrome que injeta um mascote pixel-art interativo em qualquer página da web.  
Ele anda, desliza, reage, dorme, pisca, demonstra emoções e cuida de seus próprios sub-pets — com animações CSS e movimento sincronizado ao refresh rate do navegador.

[Instalar](#-instalação) · [Funcionalidades](#-funcionalidades) · [Personalização](#-personalização) · [Validação](#-validação) · [Contribuir](#-contribuição)

🌐 **Explore:** [Documentação Interativa](./docs/index.html) · [Documentação Técnica](./DOCUMENTACAO.md) · [Manual de Instruções](./MANUAL.md) · [Relatório de Validação](./VALIDACAO.md) · [Registro de Melhorias v3.2](./MELHORIAS.md)

</div>

---

## 📖 O artigo: um bichinho de estimação para a web moderna

> *Toda aba aberta é um lugar solitário. O Claw'd existe para que não seja.*

Passamos horas dentro do navegador — lendo, trabalhando, procrastinando — e a página nunca olha de volta. O **Claw'd** nasceu de uma ideia simples e teimosa: e se um cantinho da tela tivesse vida própria? Não um assistente que fala demais, nem um popup que interrompe, mas um **companheiro pixel-art** que anda pela borda da janela, cochila quando você some, comemora quando você volta e, de vez em quando, faz uma embaixadinha só para se exibir.

### Pixel a pixel, de propósito

O visual é deliberadamente **pixel-art numa grade de 4 px**. Cada modelo — Clássico, Mini, Pinças e Guardião — é uma silhueta desenhada célula a célula, com **corpo estático e pernas em camada própria**: elas só entram no ciclo de passos quando o pet realmente se desloca, então nada "escorrega" pela tela. Os olhos têm cor independente, piscam sozinhos e ganham quatro rostos (Clássico, Brilho, Focado, Sonolento). É charme retrô com engenharia moderna: **100% CSS**, sem sprites raster, sincronizado ao *refresh rate* real do monitor via `requestAnimationFrame`.

### O gramado dentro do navegador ⚽

A alma brincalhona do Claw'd está na profissão **Jogador**. Aqui a bola não é enfeite — é jogável. **Toque na bola** e ele começa uma sequência de **embaixadinhas**: cada toque sobe a bola num arco, o som ganha um tom mais agudo e um **contador ao vivo** flutua ao lado. Demore demais e a bola cai, rola pela página e o pet corre atrás — a janela de tempo *encolhe* conforme o combo cresce, transformando um detalhe fofo num pequeno **minijogo de ritmo e habilidade**. Quando quiser fechar com chave de ouro, **dê um duplo-clique**: o Claw'd finaliza a jogada com um **golaço**, e quanto maior a sequência de embaixadinhas, maior o bônus de XP. Recordes viram conquistas (Malabarista, Rei do Combo), e quando você o deixa ocioso ele continua treinando sozinho.

### Um elenco em harmonia

Ao redor do futebol há um sistema inteiro que conversa entre si: **oito profissões** (Jogador, Tutor, Dev, Músico, Chef, Ninja, Pescador e Livre), cada uma com um uniforme temporário que *não* apaga seus acessórios pessoais; **14 acessórios** em dois slots; **sub-pets** com espécie, apelido e habilidades; **status estilo Tamagotchi** que geram emoções; e uma camada de **gamificação** com XP progressivo, PixelCoins, loja, missão diária e conquistas. Tudo compartilha o mesmo **catálogo único** (`src/shared/catalog.js`), então o popup e o pet real sempre mostram exatamente os mesmos dados.

### Feito para durar (e para hackear)

Não há *build step* nem dependências externas: você clona, carrega a pasta no `chrome://extensions` e pronto. Por baixo, um **service worker** MV3 cuida da presença cross-tab e da reinjeção segura; o content script se auto-recupera de recargas; mensagens, storage e DOM passam por **sanitização e allowlists**; áudio só inicia após gesto do usuário; e **61 testes automatizados** (mais um *smoke test* em Chromium real) guardam catálogos, schema, segurança, renderização, embaixadinhas e a integridade cruzada de todos os subsistemas. É um brinquedo — mas construído como software de verdade.

O Claw'd não quer sua atenção o tempo todo. Ele só quer estar lá, no rodapé da sua tarde, pronto para uma embaixadinha quando você precisar sorrir.

---

## 🎬 Demonstração executável

Abra a [Documentação Interativa](./docs/index.html#demonstracao) para percorrer uma sessão guiada de **45 segundos e 18 etapas**: entrada, perspectiva 3D, carinho, ações, scroll, passeio, arraste com inércia, sono, despertar, pesca, futebol, desafio do Tutor, acessórios, modo liso e subpet especial.

A demonstração é HTML/CSS/JavaScript local — não um vídeo simulado — e inclui reprodução/pausa, navegação por capítulo, teclado, movimento reduzido e um storyboard quadro a quadro. A galeria reutiliza as próprias camadas pixel-art de `src/content/style.css`, portanto os modelos e os 14 acessórios exibidos são os mesmos do runtime, sem depender de imagens raster. Os selos do topo refletem a validação atual: **61/61 contratos**, **8/8 scripts**, **4 modelos**, **4 rostos**, **8 profissões**, **14 acessórios**, **24 ações**, **7 ações do subpet**, **3/3 reloads limpos** e **0 erros de runtime**.

---

## 🐾 Modelos e Expressões do Mascote

<div align="center">
<img src="src/assets/pet-states.svg" width="100%" alt="Modelos pixel-art Clássico, Mini, Pinças e Guardião" />
</div>

O Claw'd combina **estados de movimento, ações e emoções** que mudam conforme você interage com a página:

| Estado | Trigger | Animação |
|--------|---------|----------|
| 🐾 **Idle** | Padrão | Respiração, piscada e pernas imóveis |
| 🚶 **Walking / Running** | Passeio, arraste ou corrida | Pernas alternadas somente enquanto há deslocamento |
| ❤️ **Happy / Joyful** | Carinho e necessidades altas | Pulo, sorriso, balão de emoji e partículas |
| 💤 **Sleeping / Yawning** | Inatividade | Olhos fechados, bocejo e Zzz flutuante |
| ⚡ **Excited** | Scroll e descoberta de página | Tremida curta e expressão surpresa |
| 👋 **Waving** | Ação manual ou espontânea | Aceno com balão contextual |
| 🎣 **Fishing / Reeling** | Profissão Pescador | Vara, lago, fisgada e captura animada |
| 😢 **Sad / Hungry** | Status baixos | Boca e balão de emoção correspondentes |

---

## ✨ Funcionalidades

<table>
<tr>
<td width="50%">

### 🎨 Animações Fluidas
- Sprite padrão fiel ao modelo compacto vermelho de referência
- **4 modelos pixel-art**: Clássico, Mini, Pinças e Guardião, todos na grade de 4 px
- **Pernas em camada própria**: estáticas em repouso e em ciclo somente durante movimento
- **4 rostos e olhos com cor independente**: Clássico, Brilho, Focado e Sonolento
- Piscada independente, expressões faciais e **balão de emojis**
- Efeito **3D perspective** ao seguir o cursor
- **Partículas** de ❤️ ✨ ⭐ ao receber carinho
- **Pop-in** animado ao carregar a página
- **Sombra no chão** sincronizada com o movimento
- **Modo liso real** — mantém a silhueta angular do modelo, mas troca as células por blocos contínuos, sem grade, textura ou efeito de slime
- **Contorno** — borda escura ao redor do pet
- **Boca opcional** — remove apenas a boca, preservando olhos, piscadas e balões de emoji

</td>
<td width="50%">

### 🧠 Comportamento Inteligente
- **Andar automático** pela tela (configurável)
- **Balões de fala e emoção** com mensagens e emojis contextuais
- **Dorme** após 30s de inatividade
- **Acorda** ao clicar, scrollar ou arrastar
- Reação instantânea ao **scroll** da página
- Arraste com **inércia, deslizamento e colisão suave nas bordas**
- Um único pet principal após reload, com limpeza de instâncias órfãs
- Suporte completo a **touch** (mobile)

</td>
</tr>
<tr>
<td width="50%">

### 💼 Profissões & Roupas
- **8 profissões**: Livre, Jogador, Tutor, Dev, Músico, Chef, Ninja e Pescador
- Pescador monta um **lago interativo**, lança a vara, fisga e captura peixes
- Jogador faz embaixadinhas; Tutor cria desafios; Dev digita; Músico toca riffs
- **14 acessórios** em dois slots e nos dois renderizadores; os 7 chapéus têm detalhes, profundidade, área externa sem recorte e movimento sincronizado ao passo
- **Provador e cards ao vivo no popup** usam a arte CSS real do pet — inclusive modelos, skins, chapéus e óculos — e mostram os dois slots combinados
- Trajes de profissão são temporários: entram automaticamente sem apagar o boné, chapéu ou acessório pessoal salvo

</td>
<td width="50%">

### 🎮 Gamificação
- **Sistema de XP e níveis** — carinho dá +5 XP, gol dá +10 XP
- **PixelCoins, loja, conquistas, streak e missão diária**
- **Barra de progresso** animada no popup
- **Embaixadinhas interativas** — toque na bola para mantê-la no ar (contador ao vivo, combos e recorde); **duplo-clique finaliza com um golaço** ⚽🥅 e quanto maior a sequência, maior o bônus de XP
- **8 sub-pets** com apelido, cores independentes de corpo/olhos, sono, despertar, 7 ações manuais e habilidade por espécie
- Dragão e pássaro com **voo**; slime com clone; efeitos de partículas com teto e pausa em aba oculta
- **Balão** e **abraço** entre as ações principais do pet
- **Missão diária** resgatável, streak e conquistas
- Cross-tab com desconexão segura em **bfcache** (sem pilha de `runtime.lastError`)
- Sons 8-bit **apenas após gesto** do usuário (política de autoplay)
- Progresso salvo entre sessões

</td>
</tr>
</table>

---

## 🚀 Instalação

### Chrome / Edge / Brave

```bash
# 1. Clone o repositório
git clone https://github.com/hfkyxg/pet-ext-ap.git
cd pet-ext-ap

# 2. Abra o Chrome e vá para:
#    chrome://extensions/
#    (ou edge://extensions/ no Edge)

# 3. Ative "Modo do desenvolvedor" (canto superior direito)

# 4. Clique em "Carregar sem compactação"

# 5. Selecione a pasta pet-ext-ap/
```

Pronto! O Claw'd aparecerá no canto inferior direito de qualquer site. 🎉

---

## 🎨 Personalização

Clique no ícone da extensão para abrir o **menu de personalização**:

<div align="center">

```
┌─────────────────────────────────┐
│  [🐾]  Claw'd v3.2  🪙 120       │
├──────────┬────────────┬──────────┤
│ 🎨 💼 🧠 ⚡ 🐕 🛍️ 🏆 ⚙️       │
├──────────┴────────────┴──────────┤
│                                  │
│  Nome do pet: [_____________]    │
│                                  │
│  Modelo:  [01] [02] [03] [04]   │
│  Rosto:   [•]  [✦]  [⌁]  [–]    │
│                                  │
│  Cor:  ● ● ● ● ● ● ● ●          │
│  Olhos: [#08080b  ▼]             │
│                                  │
│  Tamanho:   ──●───  1.5×         │
│  Velocidade: ──●───  1.0×        │
│                                  │
└──────────────────────────────────┘
```

</div>

### Aba Aparência
- **Nome** — renomeia o pet (atualiza em tempo real)
- **Modelo** — alterna entre Clássico, Mini, Pinças e Guardião sem desalinhamento dos acessórios
- **Rosto** — escolhe Clássico, Brilho, Focado ou Sonolento
- **Cor dos olhos** — picker independente da cor do corpo
- **Cor** — 8 cores predefinidas + picker customizado
- **Tamanho** — slider de 0.8× a 3.0×
- **Velocidade** — controla a velocidade da animação
- **Visual liso** — suaviza os pixels sem transformar ou redesenhar o pet
- **Contorno** — adiciona borda escura ao redor do mascote
- **Exibir boca** — mostra ou remove o sorriso e as expressões da boca sem alterar a sprite
- **Acessórios** — 14 opções em slots separados, cada uma com miniatura pixel-art real, descrição, dica e estado selecionado acessível

### Aba Profissão
- **⚽ Jogador** — bola de futebol jogável ao lado do pet
- **📚 Tutor** — óculos automáticos + foco de estudo
- **💻 Dev** — fones automáticos + reações a sites de código
- **🎸 Músico** — riffs, dança e reações em sites de música
- **🧑‍🍳 Chef** — cozinha e torna a alimentação mais eficaz
- **🥷 Ninja** — truques de desaparecimento e surpresa
- **🎣 Pescador** — vara, lago, fisgada manual/automática e peixes raros
- **🐾 Livre** — modo padrão sem profissão

### Aba Comportamento
- **Balão de fala** — ativa/desativa mensagens
- **Andar automático** — pet passeia sozinho
- **Dormir** — ativa o modo de inatividade
- **Passeio entre abas** — mantém um único pet anfitrião e frequência configurável
- **Pegadas** — indica abas onde o pet não está

### Aba Ações
Dispare ações imediatas como **acenar, dançar, dar carinho, alimentar, brincar, posar, dar banho, dormir, acordar, pescar, pular, esticar e rugir**. A aba também permite ocultar e resgatar o pet.

### Aba Sub-pets
Ative uma das oito espécies, atribua um **apelido**, personalize separadamente as cores do **corpo** e dos **olhos** e use o painel ao vivo para **dar carinho, brincar, explorar, rodopiar, comemorar ou executar a habilidade especial**. Uma interação acorda o subpet adormecido antes da animação.

---

## 🏗️ Estrutura do Projeto

```
pet-ext-ap/
├── manifest.json              # Configuração da extensão (MV3)
├── src/
│   ├── content/
│   │   ├── content.js         # Motor do mascote + sistema de estados
│   │   └── style.css          # Pixel-art CSS + keyframes de animação
│   ├── shared/
│   │   └── catalog.js         # Estado, catálogos, missões e migrações
│   ├── popup/
│   │   ├── popup.html         # Interface de personalização
│   │   ├── popup.css          # Dark UI design system
│   │   └── popup.js           # Controles e preview ao vivo
│   ├── background/
│   │   └── background.js      # Service worker (inicialização)
│   └── assets/
│       ├── pet-banner.svg     # Banner animado
│       └── pet-states.svg     # Showcase de modelos e rostos
├── tests/
│   ├── catalog.test.js        # Regras, sprites, emoções e ciclo de vida
│   ├── extension.test.js      # Manifest, popup, documentação e reload seguro
│   └── runtime-smoke.mjs      # Chromium real, interações e reloads
├── docs/
│   ├── index.html             # Vitrine, player de mecânicas e laboratórios
│   ├── showcase.css           # Sistema visual, cenas e layout responsivo
│   └── showcase.js            # Roteiro, evidências, catálogos e previews
├── DOCUMENTACAO.md            # Arquitetura e protocolo interno
├── MANUAL.md                  # Guia de uso
├── VALIDACAO.md               # Evidências automatizadas e em Chromium real
├── LICENSE                    # Licença MIT (2026)
└── README.md
```

---

## 🔧 Como Funciona

### Sistema de Estados (content.js)

```javascript
// Estados alteram classes CSS e o balão de emoção correspondente
setState('happy')   // → node.classList.add('happy')
setState('sleeping') // → olhos fechados + filter escurecido
setState('excited')  // → animação de shake + walk acelerado
setState('waving')   // → braço levantado
setState('idle')     // → respiração/piscada, sem mexer as pernas
```

### Pixel-Art via CSS (style.css)

```css
/* Corpo e pernas são camadas independentes na mesma grade de 4×4px. */
#aic-clawd-node .pixel-sprite {
  box-shadow: var(--clawd-pixel-body);
  animation: none !important; /* a silhueta nunca troca de desenho */
}

#aic-clawd-node.walking .pixel-legs,
#aic-clawd-node.running .pixel-legs {
  animation: clawd-pixel-leg-cycle var(--clawd-step-duration) steps(1) infinite;
}

/* O modo liso remove as células e ativa a silhueta angular contínua. */
#aic-clawd-node.smooth :is(.pixel-sprite, .pixel-legs) { display: none; box-shadow: none; }
#aic-clawd-node.smooth .smooth-sprite { display: block; }
```

### Personalização em Tempo Real

```javascript
// Toda config usa CSS custom properties
node.style.setProperty('--agent-color', '#3498db'); // → cor muda instantaneamente
bodyNode.style.transform = `scale(${scale})`;        // → tamanho sem reflow
```

---

## 🎮 Interações

| Ação | Resultado |
|------|-----------|
| **Clicar** no pet | Pulo feliz + partículas + fala |
| **Arrastar e soltar** | Reposiciona, desliza com inércia e salva a posição |
| **Scrollar** | Estado excited por 1s |
| **Mover o mouse** | Perspectiva 3D (rotação suave) |
| **Clique duplo/triplo** | Ações especiais e sequências de emoção |
| **Clicar no sub-pet** | Carinho ou despertar com animação própria |
| **Painel do sub-pet** | Brincar, explorar, rodopiar, comemorar ou usar a habilidade da espécie |
| **Clicar no lago** | Fisga o peixe durante a profissão Pescador |
| **Touch (mobile)** | Arrastar e clicar funcionam |
| **Não interagir** por 30s | Pet adormece automaticamente |

---

## 💾 Persistência

Todas as configurações são salvas via `chrome.storage.local` e persistem entre sessões:

```javascript
chrome.storage.local.set({
  clawdState: {
    name:         "Claw'd",
    color:        "#c71515",
    eyeColor:     "#08080b",
    model:        "classic",
    faceStyle:    "classic",
    scale:        1.5,
    animSpeed:    1,
    showSpeech:   true,
    showMouth:    false,
    autoWalk:     true,
    sleepEnabled: true,
    position:     { x: 1200, y: 600 },
    smooth:       false,
    accessoryHead: 'none',
    accessoryFace: 'none',
    subpets:      { active: 'dog', unlocked: ['dog'], names: {}, colors: {}, eyeColors: {} },
    settings:     { crossTab: true, performanceMode: false }
  }
});
```

---

## 🗺️ Estado atual e próximos passos

O núcleo da v3.2 está implementado e validado: quatro silhuetas, quatro rostos, olhos independentes, favoritos, sub-pets, profissões contextuais, dois slots de acessórios, pixel art em camadas, stats, cross-tab, loja, conquistas e missão diária. O plano detalhado e as ideias de expansão estão em [MELHORIAS.md](./MELHORIAS.md):

| Área | Destaques |
|------|-----------|
| ⭐ **Favoritos** | Favorite ações, profissões, acessórios, cores e apelidos — favoritos ganham prioridade |
| 🐕 **Sub-Pets** | Oito espécies com apelido, corpo/olhos customizáveis, sprites pixel-art, sete ações ao vivo e habilidades próprias |
| 🎬 **Animações & Acessórios** | Corpo/pernas separados, 2 slots e 7 chapéus refinados; ações extras (balão, abraço, spin…) |
| 🔐 **Segurança & Runtime** | Allowlist de mensagens, sanitização de storage/DOM, cores hex-only, sites bloqueados por host exato, áudio pós-gesto, bfcache sem `lastError` |
| 🧬 **Modelos & Rostos** | 4 silhuetas × 4 rostos, cor de olhos independente e Clássico fiel à referência |
| 😊 **Status & Emoções** | Felicidade, fome, energia e higiene estilo Tamagotchi, com emoções derivadas |
| 💼 **Profissões 2.0** | Embaixadinhas com contador e recorde, desafios do Tutor, digitação do Dev + novas profissões |
| 🎮 **Gamificação** | Curva de XP progressiva, PixelCoins, lojinha, conquistas, streak e missão diária resgatável |
| 🖥️ **Renderização adaptativa** | Movimento em `requestAnimationFrame`, leitura do refresh rate e sprite pixel-perfect como padrão |
| 🌐 **Cross-Tab** | O pet passeia entre abas; reload limpa instâncias órfãs e recria somente o principal na aba ativa |
| 😄 **Emoções visuais** | Balão de emojis, piscadas e boca contextual opcional sem substituir a sprite base |
| ⚙️ **Configurações** | Skins, sons 8-bit, horário de silêncio, sites bloqueados, export/import de progresso |

---

## ✅ Validação

O projeto não usa build step nem dependências externas. A validação local inclui:

```powershell
node --check src/shared/catalog.js
node --check src/content/content.js
node --check src/popup/popup.js
node --check src/background/background.js
node --test tests/*.test.js
node tests/runtime-smoke.mjs
```

Os **61 testes automatizados** validam catálogos, schema v4, quatro modelos, quatro rostos, cor dos olhos, missões, sprite padrão, separação corpo/pernas, modo liso, boca opcional/emoções, chapéus sem recorte, composição dos slots, trajes profissionais não destrutivos, sub-pets, documentação interativa, pesca, manifest, popup, movimento adaptativo, isolamento de CSS, contexto MV3 invalidado, **bfcache/lastError**, **AudioContext pós-gesto**, **allowlist de mensagens**, **sites bloqueados sem substring**, **anti-poluição de protótipo** e reconciliação após reload. O contrato da documentação também exige 18 capítulos, 18 cartões de evidência, IDs únicos, catálogos reais e ausência de mídia externa ou vídeo fictício. O smoke test abre o Edge/Chromium com um perfil isolado e exercita em runtime real **4/4 modelos e 4/4 rostos**, os 14 acessórios nos dois renderizadores, o provador pixel/liso do popup, a cor dos olhos, o controle persistente da boca, o movimento dos chapéus, 8 profissões e os estados esperados das ações do catálogo (**24** principais). Também prova que o corpo não morpha e apenas as pernas caminham, restauração do visual pessoal, efeitos cosméticos ligados/desligados pelo modo desempenho, pesca cancelada sem recompensa, pesca concluída com incremento, clique físico de carinho, subpet com suas **7** interações e três reloads consecutivos com um único pet e zero erros. Passe um caminho de página como argumento para reproduzir um caso específico: `node tests/runtime-smoke.mjs "C:\caminho\pagina.html"`.

A vitrine também foi inspecionada em navegador real nos layouts desktop e móvel: player funcional, avanço automático, seleção direta das etapas lisa/subpet, 14 acessórios no laboratório, **zero logs de erro** e nenhuma rolagem horizontal em 375 px.

O visual inicial continua exatamente o sprite compacto vermelho de referência: modelo Clássico, rosto Clássico, olhos `#08080b`, pixels nítidos, sem blur, escala 1.5×, skin normal e acessórios desligados. O navegador sincroniza deslocamentos ao refresh rate disponível; em monitores de 120/144/165 Hz o `requestAnimationFrame` acompanha essa cadência, enquanto o modo de baixo refresh reduz efeitos secundários.

Ao arrastar e soltar com velocidade, o Claw'd desliza sobre o conteúdo da página com inércia, rebate suavemente nas bordas e mantém o ciclo das pernas ativo apenas durante o movimento.

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch: `git checkout -b feature/nova-skin`
3. Commit: `git commit -m 'add: nova skin do mascote'`
4. Push: `git push origin feature/nova-skin`
5. Abra um Pull Request

### Ideias de contribuição
- [ ] Novas skins e acessórios pixel-art
- [ ] Mais desafios e peixes raros por profissão
- [x] Seis interações manuais e habilidades próprias para os sub-pets
- [ ] Testes E2E automatizados em Chrome real
- [ ] Suporte a Firefox (WebExtensions)

---

## 📄 Licença

MIT © 2026 — Feito com ❤️ e muitos pixels.

---

<div align="center">

**⭐ Se curtiu, deixa uma star no repositório!**

`🐾 Claw'd — Seu companheiro pixel-art na web 🌐`

</div>
