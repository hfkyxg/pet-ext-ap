<div align="center">

<img src="src/assets/pet-banner.svg" width="100%" alt="Claw'd — Companheiro de Navegação" />

<br/>

[![Manifest V3](https://img.shields.io/badge/Manifest-V3-red?style=for-the-badge&logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/)
[![Version](https://img.shields.io/badge/version-2.1-ff4757?style=for-the-badge)](./manifest.json)
[![License](https://img.shields.io/badge/license-MIT-2ecc71?style=for-the-badge)](./LICENSE)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-f1c40f?style=for-the-badge&logo=javascript&logoColor=black)](./src/)

**Claw'd** é uma extensão Chrome que injeta um mascote pixel-art interativo em qualquer página da web.  
Ele anda, reage, dorme, pisca, e responde às suas ações — tudo com animações CSS fluidas.

[Instalar](#-instalação) · [Funcionalidades](#-funcionalidades) · [Personalização](#-personalização) · [Contribuir](#-contribuição)

</div>

---

## 🐾 Estados do Mascote

<div align="center">
<img src="src/assets/pet-states.svg" width="100%" alt="Estados: Idle, Happy, Sleeping, Excited, Waving" />
</div>

O Claw'd tem **5 estados animados** que mudam automaticamente conforme você interage com a página:

| Estado | Trigger | Animação |
|--------|---------|----------|
| 🐾 **Idle** | Padrão | Caminhada com piscar de olhos |
| ❤️ **Happy** | Clique no pet | Pulo + partículas coloridas |
| 💤 **Sleeping** | 30s sem atividade | Olhos fechados + Zzz flutuante |
| ⚡ **Excited** | Scroll na página | Tremida rápida |
| 👋 **Waving** | Aleatório a cada ~25s | Acena com braço levantado |

---

## ✨ Funcionalidades

<table>
<tr>
<td width="50%">

### 🎨 Animações Fluidas
- Pixel-art com **3 frames** de walk animation
- **Piscar de olhos** no terceiro frame
- Efeito **3D perspective** ao seguir o cursor
- **Partículas** de ❤️ ✨ ⭐ ao receber carinho
- **Pop-in** animado ao carregar a página
- **Sombra no chão** sincronizada com o movimento
- **Modo liso** — funde os pixels num preenchimento sólido, sem grade
- **Contorno** — borda escura ao redor do pet (combina com o modo liso)

</td>
<td width="50%">

### 🧠 Comportamento Inteligente
- **Andar automático** pela tela (configurável)
- **Balão de fala** com mensagens aleatórias
- **Dorme** após 30s de inatividade
- **Acorda** ao clicar, scrollar ou arrastar
- Reação instantânea ao **scroll** da página
- Suporte completo a **touch** (mobile)

</td>
</tr>
<tr>
<td width="50%">

### 💼 Profissões & Roupas
- **⚽ Jogador** — ganha boné + bola de futebol jogável; celebra em sites esportivos
- **📚 Tutor** — veste óculos; monitora foco em redes sociais
- **💻 Dev** — usa fones; reage a GitHub, docs e Stack Overflow
- **Acessórios manuais**: 🧢 boné · 👓 óculos · 🎀 laço · 🎧 fones

</td>
<td width="50%">

### 🎮 Gamificação
- **Sistema de XP e níveis** — carinho dá +5 XP, gol dá +10 XP
- **Level up** com festa de partículas 🎖️
- **Barra de progresso** animada no popup
- **Bola jogável** — clique na bola e veja o Claw'd marcar um golaço ⚽🥅
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
│  [🐾]  Claw'd  v2  ● Conectado  │
├──────────┬────────────┬──────────┤
│ 🎨Aparência│ 🧠Comportamento│ ⚡Ações │
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
- **Visual liso** — funde os pixels num visual sólido, sem exibir a grade
- **Contorno** — adiciona borda escura ao redor do mascote
- **Acessórios** — boné, óculos, laço ou fones de ouvido

### Aba Profissão
- **⚽ Jogador** — bola de futebol jogável ao lado do pet
- **📚 Tutor** — óculos automáticos + foco de estudo
- **💻 Dev** — fones automáticos + reações a sites de código
- **🐾 Livre** — modo padrão sem profissão

### Aba Comportamento
- **Balão de fala** — ativa/desativa mensagens
- **Andar automático** — pet passeia sozinho
- **Dormir** — ativa o modo de inatividade

### Aba Ações
Dispare ações imediatas:
- 👋 **Acenar** — anima o gesto de tchauzinho
- 🕺 **Dançar** — tremida animada com partículas
- ❤️ **Carinho** — pulo feliz com corações
- 😴 **Dormir** — coloca o pet para dormir
- ☀️ **Acordar** — acorda imediatamente

---

## 🏗️ Estrutura do Projeto

```
pet-ext-ap/
├── manifest.json              # Configuração da extensão (MV3)
├── src/
│   ├── common/
│   │   └── core.js            # Núcleo compartilhado: ClawdStore, níveis e profissões
│   ├── content/
│   │   ├── content.js         # Motor do mascote + sistema de estados
│   │   └── style.css          # Pixel-art CSS + keyframes de animação
│   ├── popup/
│   │   ├── popup.html         # Interface de personalização
│   │   ├── popup.css          # Dark UI design system
│   │   └── popup.js           # Controles e preview ao vivo
│   ├── background/
│   │   └── background.js      # Service worker (estado inicial não-destrutivo)
│   └── assets/
│       ├── pet-banner.svg     # Banner animado
│       └── pet-states.svg     # Showcase de estados
└── README.md
```

### Arquitetura (v2.1)

- **`ClawdStore`** (`src/common/core.js`) — fonte única do estado persistido. Cache em
  memória + gravação *debounced* no `chrome.storage.local` e sincronização entre abas
  via `chrome.storage.onChanged` (padrão **Observer**).
- **Profissões** são um catálogo declarativo (padrão **Strategy**): cada uma descreve
  acessório automático, palavras-chave de contexto e mensagens — o motor só consome os dados.
- **Mensagens do popup** são despachadas por um mapa de comandos (padrão **Command**);
  a configuração flui num sentido único: `popup → storage → todas as abas`.

---

## 🔧 Como Funciona

### Sistema de Estados (content.js)

```javascript
// O mascote tem 5 estados gerenciados por CSS classes
setState('happy')   // → node.classList.add('happy')
setState('sleeping') // → olhos fechados + filter escurecido
setState('excited')  // → animação de shake + walk acelerado
setState('waving')   // → braço levantado
setState('idle')     // → walk padrão com breathe
```

### Pixel-Art via CSS (style.css)

```css
/* Cada pixel é um box-shadow de 4px × 4px */
@keyframes walk {
  0%, 100% {
    box-shadow:
      /* Orelhas: col 1-2 e col 9-10 */
      4px 0 var(--agent-color), 8px 0 var(--agent-color),
      /* Olhos abertos: col 3 e col 7 = preto */
      12px 8px #111, 28px 8px #111,
      /* Pernas frame A */
      8px 28px var(--agent-color), 16px 28px var(--agent-color);
  }
  66% { /* frame com piscar de olhos */
    box-shadow: /* ... olhos fechados como traço ... */;
  }
}
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
| **Arrastar** | Repositiona e salva a posição |
| **Scrollar** | Estado excited por 1s |
| **Mover o mouse** | Perspectiva 3D (rotação suave) |
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
    autoWalk:     true,
    sleepEnabled: true,
    position:     { x: 1200, y: 600 }
  }
});
```

---

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch: `git checkout -b feature/nova-skin`
3. Commit: `git commit -m 'add: nova skin do mascote'`
4. Push: `git push origin feature/nova-skin`
5. Abra um Pull Request

### Ideias de contribuição
- [ ] Novas skins / sprites alternativos
- [ ] Sistema de conquistas (pet levels)
- [ ] Reações a sites específicos
- [ ] Modo escuro para o name-tag
- [ ] Suporte a Firefox (WebExtensions)

---

## 📄 Licença

MIT © 2025 — Feito com ❤️ e muitos pixels.

---

<div align="center">

**⭐ Se curtiu, deixa uma star no repositório!**

`🐾 Claw'd — Seu companheiro pixel-art na web 🌐`

</div>
