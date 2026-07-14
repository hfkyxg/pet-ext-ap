# Projeto Claw'd: Companheiro de Navegação
## Documentação Arquitetural e Funcional

### 1. Visão Executiva e Intuitividade
O objetivo deste projeto é transformar a navegação web solitária em uma experiência acompanhada, dinâmica e gamificada. O mascote atua como uma âncora visual amigável que reage em tempo real às ações do usuário, injetando vida e contexto no navegador. A interface primária (o nó visual) deve ser totalmente fluida, não obstrutiva e altamente responsiva, integrando-se nativamente a qualquer layout de página.

### 2. Sistema de Profissões e Interatividade
A personalização vai além dos cosméticos. O mascote assume "Profissões" que ditam não apenas suas animações idle (ociosas), mas suas funcionalidades práticas e reações a contextos específicos.

**⚽ Profissão: Jogador de Futebol**
*   **Visual:** O mascote veste a camisa de uma seleção escolhida pelo usuário. Como animação ociosa, ele puxa uma bola de futebol em pixel art e começa a fazer embaixadinhas na barra inferior do navegador.
*   **Interatividade Contextual:** Se o usuário entra em sites de notícias esportivas (ex: ge.globo, ESPN), o mascote comemora como se tivesse feito um gol. Ele pode chutar a bola contra botões da página ou usar a bola para "rolar" a tela para baixo.

**📚 Profissão: Tutor Acadêmico**
*   **Visual:** Veste óculos e carrega uma prancheta ou um quadro-negro em miniatura.
*   **Interatividade Contextual:** Interrompe ciclos de procrastinação (ex: tempo excessivo em redes sociais) lançando pequenos desafios lógicos para o usuário. Para liberar a aba ou ganhar moedas virtuais, o usuário resolve expressões numéricas rápidas ou responde a conceitos matemáticos sobre conjuntos, potências e raízes, gamificando o aprendizado direto no navegador.

**💻 Profissão: Engenheiro de Software**
*   **Visual:** Usa fones de ouvido e digita rapidamente em um laptop minúsculo.
*   **Interatividade Contextual:** Atua diretamente inspecionando o código. Quando o usuário acessa repositórios ou documentações, ele pode destacar blocos de código ou identificar erros visuais de CSS na página.

### 3. Integração com IA e Orquestração Multi-Agente
Para que o mascote não seja apenas um script de animação predefinido, ele precisa de um cérebro dinâmico. O mascote servirá como a **interface de comunicação (nó)** de um robusto Sistema de Orquestração Multi-Agente, construído para operar de forma transparente em ecossistemas de desenvolvimento aberto (como o OpenCode).

**Arquitetura Multi-Agente**
Diferentes agentes de IA rodam em segundo plano e se comunicam com o nó visual:
*   **Agente de Contexto (O Olho):** Lê o DOM da página atual, identificando o tema (esportes, estudos, trabalho) sem violar a privacidade, extraindo palavras-chave.
*   **Agente de Estado (A Memória):** Gerencia as emoções, a fome (se implementado) e os cosméticos atuais do mascote.
*   **Agente Orquestrador (O Cérebro):** Recebe os dados do Agente de Contexto e decide qual animação ou caixa de diálogo o mascote deve exibir na tela.

### 4. Automações e Escalabilidade
O sistema foi desenhado para escalar tanto horizontalmente (suportando milhões de usuários simultâneos com baixo uso de servidor, já que o processamento principal ocorre localmente na extensão) quanto verticalmente (adicionando novas funcionalidades).

#### 4.1. Continuidade de Sessão (Cross-Tab Automation)
Através do `Service Worker` da extensão (Manifest V3), a posição XY, o estado atual da animação e os metadados do mascote são salvos em tempo real no `chrome.storage`. Ao clicar em um link, a nova aba resgata esses dados milissegundos antes da renderização, injetando o mascote exatamente na mesma coordenada, criando uma ilusão perfeita de continuidade.

#### 4.2. Motor de Eventos (Event-Driven Behaviors)
As automações do mascote reagem a Event Listeners nativos do navegador:
*   `scroll`: O mascote corre na direção oposta ao scroll, como se estivesse em uma esteira.
*   `mousemove`: Os olhos do mascote acompanham o cursor. Se o cursor o ameaçar, ele se esconde atrás de elementos da página (divs, imagens).
*   `idle` (Inatividade): Se o usuário não mexe o mouse por 5 minutos, o mascote (e seu respectivo pet menor) deitam na barra de tarefas e começam a dormir, com balões de "Zzz" subindo.

### 5. Próximos Passos de Desenvolvimento
1.  **Fase 1:** Refinamento do CSS e padronização do `#aic-clawd-node` para suportar sobreposição de sprites (Corpo base + Roupa + Acessório).
2.  **Fase 2:** Implementação do Background Script para persistência de estado entre abas.
3.  **Fase 3:** Integração da API de LLM via WebSockets para alimentar o Agente Orquestrador, permitindo que o mascote converse de forma inteligente baseada no conteúdo da tela.
