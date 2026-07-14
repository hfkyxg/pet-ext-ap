<div align="center">

<img src="src/assets/pet-banner.svg" width="100%" alt="Claw'd — Companheiro de Navegação" />

<br/>

[![Manifest V3](https://img.shields.io/badge/Manifest-V3-red?style=for-the-badge&logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/)
[![Version](https://img.shields.io/badge/version-3.1-ff4757?style=for-the-badge)](./manifest.json)
[![License](https://img.shields.io/badge/license-MIT-2ecc71?style=for-the-badge)](./LICENSE)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-f1c40f?style=for-the-badge&logo=javascript&logoColor=black)](./src/)

**Claw'd** é uma extensão Chrome que injeta um mascote pixel-art interativo em qualquer página da web.  
Ele anda, desliza, reage, dorme, pisca, demonstra emoções e cuida de seus próprios sub-pets — com animações CSS e movimento sincronizado ao refresh rate do navegador.

[Instalar](#-instalação) · [Funcionalidades](#-funcionalidades) · [Personalização](#-personalização) · [Validação](#-validação) · [Contribuir](#-contribuição)

🌐 **Explore:** [Documentação Interativa](./docs/index.html) · [Documentação Técnica](./DOCUMENTACAO.md) · [Manual de Instruções](./MANUAL.md) · [Relatório de Validação](./VALIDACAO.md) · [Registro de Melhorias v3.1](./MELHORIAS.md)

</div>

---

## 🎬 Demonstração executável

Abra a [Documentação Interativa](./docs/index.html#demonstracao) para percorrer uma sessão guiada de **45 segundos e 18 etapas**: entrada, perspectiva 3D, carinho, ações, scroll, passeio, arraste com inércia, sono, despertar, pesca, futebol, desafio do Tutor, acessórios, modo liso e subpet especial.

A demonstração é HTML/CSS/JavaScript local — não um vídeo simulado — e inclui reprodução/pausa, navegação por capítulo, teclado, movimento reduzido e um storyboard quadro a quadro. A galeria reutiliza as próprias camadas pixel-art de `src/content/style.css`, portanto os 14 acessórios exibidos são os mesmos do runtime, sem depender de fontes de emoji. Os selos do topo refletem a validação atual: **32/32 contratos**, **8/8 scripts**, **8 profissões**, **14 acessórios**, **14 ações**, **6 ações do subpet**, **3/3 reloads limpos** e **0 erros de runtime**.

---

## 🐾 Estados do Mascote

<div align="center">
<img src="src/assets/pet-states.svg" width="100%" alt="Estados: Idle, Happy, Sleeping, Excited, Waving" />
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
- **Pernas estáticas em repouso** e walk cycle só durante movimento
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
- **Provador ao vivo no popup** usa a mesma arte do pet em pixel/liso e mostra os dois slots combinados
- Trajes de profissão são temporários: entram automaticamente sem apagar o boné, chapéu ou acessório pessoal salvo

</td>
<td width="50%">

### 🎮 Gamificação
- **Sistema de XP e níveis** — carinho dá +5 XP, gol dá +10 XP
- **PixelCoins, loja, conquistas, streak e missão diária**
- **Barra de progresso** animada no popup
- **Bola jogável** — clique na bola e veja o Claw'd marcar um golaço ⚽🥅
- **8 sub-pets** com apelido, cores independentes de corpo/olhos, sono, despertar, 6 ações manuais e habilidade por espécie
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
│  [🐾]  Claw'd v3.1  🪙 120       │
├──────────┬────────────┬──────────┤
│ 🎨 💼 🧠 ⚡ 🐕 🛍️ 🏆 ⚙️       │
├──────────┴────────────┴──────────┤
│                                  │
│  Nome do pet: [_____________]    │
│                                  │
│  Cor:  ● ● ● ● ● ● ● ●          │
│        [#c71515  ▼]              │
│                                  │
│  Tamanho:   ──●───  1.5×         │
│  Velocidade: ──●───  1.0×        │
│                                  │
└──────────────────────────────────┘
```

</div>

### Aba Aparência
- **Nome** — renomeia o pet (atualiza em tempo real)
- **Cor** — 8 cores predefinidas + picker customizado
- **Tamanho** — slider de 0.8× a 3.0×
- **Velocidade** — controla a velocidade da animação
- **Visual liso** — suaviza os pixels sem transformar ou redesenhar o pet
- **Contorno** — adiciona borda escura ao redor do mascote
- **Exibir boca** — mostra ou remove o sorriso e as expressões da boca sem alterar a sprite
- **Acessórios** — 14 opções em slots separados, com descrição visível do item, dicas ao passar o cursor e estados selecionados acessíveis

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
│       └── pet-states.svg     # Showcase de estados
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
/* A geometria padrão continua sendo o mesmo box-shadow de pixels de 4×4px. */
#aic-clawd-node .pixel-sprite {
  animation: none !important; /* pernas imóveis em repouso */
}

#aic-clawd-node.walking .pixel-sprite,
#aic-clawd-node.running .pixel-sprite {
  animation: clawd-pixel-walk var(--clawd-step-duration) steps(1) infinite !important;
}

/* O modo liso remove as células e ativa a silhueta angular contínua. */
#aic-clawd-node.smooth .pixel-sprite { display: none; box-shadow: none; }
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
    scale:        1.5,
    animSpeed:    1,
    showSpeech:   true,
    showMouth:    true,
    autoWalk:     true,
    sleepEnabled: true,
    position:     { x: 1200, y: 600 },
    smooth:       false,
    accessoryHead: 'none',
    accessoryFace: 'none',
    subpets:      { active: null, unlocked: [], names: {}, colors: {}, eyeColors: {} },
    settings:     { crossTab: true, performanceMode: false }
  }
});
```

---

## 🗺️ Estado atual e próximos passos

O núcleo da v3.1 está implementado e validado: favoritos, sub-pets, profissões contextuais, dois slots de acessórios, pixel art em camadas, stats, cross-tab, loja, conquistas e missão diária. O plano detalhado e as ideias de expansão estão em [MELHORIAS.md](./MELHORIAS.md):

| Área | Destaques |
|------|-----------|
| ⭐ **Favoritos** | Favorite ações, profissões, acessórios, cores e apelidos — favoritos ganham prioridade |
| 🐕 **Sub-Pets** | Oito espécies com apelido, corpo/olhos customizáveis, sprites pixel-art, seis ações ao vivo e habilidades próprias |
| 🎬 **Animações & Acessórios** | Novas ações, 2 slots e 7 chapéus refinados em pixel-art e superfícies contínuas |
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

Os **32 testes automatizados** validam catálogos, migração, missões, sprite padrão, pernas, modo liso, boca opcional/emoções, chapéus sem recorte, composição dos slots, trajes profissionais não destrutivos, sub-pets, documentação interativa, pesca, manifest, popup, movimento adaptativo, isolamento de CSS, contexto MV3 invalidado e reconciliação após reload. O contrato da documentação também exige 18 capítulos, 18 cartões de evidência, IDs únicos, catálogos reais e ausência de mídia externa ou vídeo fictício. O smoke test abre o Edge/Chromium com um perfil isolado e exercita em runtime real os 14 acessórios nos dois renderizadores, o provador pixel/liso do popup, o controle persistente da boca, o movimento dos chapéus, 8 profissões e os estados esperados das 14 ações. Também prova restauração do visual pessoal, efeitos cosméticos ligados/desligados pelo modo desempenho, pesca cancelada sem recompensa, pesca concluída com incremento, clique físico de carinho, subpet com suas 6 interações e três reloads consecutivos com um único pet e zero erros. Passe um caminho de página como argumento para reproduzir um caso específico: `node tests/runtime-smoke.mjs "C:\caminho\pagina.html"`.

A vitrine também foi inspecionada em navegador real nos layouts desktop e móvel: player funcional, avanço automático, seleção direta das etapas lisa/subpet, 14 acessórios no laboratório, **zero logs de erro** e nenhuma rolagem horizontal em 375 px.

O visual inicial é o sprite compacto vermelho de referência: pixels nítidos, sem blur, com escala 1.5×, skin normal e acessórios desligados. O navegador sincroniza deslocamentos ao refresh rate disponível; em monitores de 120/144/165 Hz o `requestAnimationFrame` acompanha essa cadência, enquanto o modo de baixo refresh reduz efeitos secundários.

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
