# Prompt para a extensão do Claude no navegador (Claude for Chrome)

Cole o bloco abaixo na extensão do Claude, com o Trello já aberto e logado.
Ela vai montar o board pela interface (sem precisar de API Key/Token).

---

Você está no meu Trello, já logado. Abra o board **https://trello.com/b/8wGr5tiQ/pet**
e configure-o exatamente assim, pela interface. Não delete nada que já exista;
se um item já existir com o mesmo nome, apenas pule (idempotente).

## 1. Descrição do board
Menu do board (⋯) → "Sobre este quadro" / Editar descrição, e cole:
> Claw'd 🐾 — companheiro pixel-art que vive nas suas abas. Board público de roadmap e feedback. Vote nas ideias 👍, pegue um card "good first issue" e contribua! Repo + guia: veja README / CONTRIBUTING.

## 2. Preferências (menu ⋯ → Configurações)
- Comentários: **Membros públicos / qualquer um** (feedback aberto)
- Votação: **habilitada para todos**
- Ingresso automático (self-join): **ligado**
- Capas de card: **ligado**

## 3. Power-ups (menu ⋯ → Power-Ups)
Ative:
- **Custom Fields** (Campos personalizados)
- **Voting** (Votação)
- **Card Aging** (Envelhecimento de cards) → estilo "pirata"
- **GitHub** (se pedir login, me avise para eu autorizar)
- **Calendar** (Calendário)

## 4. Campos personalizados (depois de ativar Custom Fields)
- **Prioridade** (tipo lista): 🔴 Alta, 🟡 Média, 🟢 Baixa
- **Área** (tipo lista): Core, UI/UX, i18n, Infra/CI, Docs
- **Esforço (pts)** (tipo número)

## 5. Labels coloridas (menu de qualquer card → Etiquetas → criar)
- `bug` → vermelho
- `feature` → verde
- `i18n` → azul-céu
- `security` → laranja
- `performance` → amarelo
- `docs` → roxo
- `good first issue` → verde-limão

## 6. Listas (nesta ordem, esquerda → direita)
1. 📥 Ideias
2. 🐛 Bugs
3. 📋 Backlog
4. 🚧 Em progresso
5. ✅ Feito

## 7. Cards

**Lista "📋 Backlog":**

1. **👋 Bem-vindo ao Claw'd — comece por aqui**
   - Labels: `good first issue`, `docs`
   - Descrição:
     > Claw'd é um companheiro pixel-art que vive nas suas abas do navegador.
     >
     > - Repositório e guia: veja README.md e CONTRIBUTING.md
     > - 11 idiomas, notificações posicionáveis, sub-pets, profissões e conquistas
     > - Feedback: use os botões 💡 Sugestão / 🐛 Bug dentro da extensão (⚙️ Trello)
   - Checklist "Primeiros passos": Ler CONTRIBUTING.md · Rodar npm test · Pegar um card "good first issue"

2. **🌍 i18n — revisar traduções nativas dos 11 idiomas**
   - Labels: `i18n`, `good first issue`
   - Descrição: Pools de fala e UI em pt-BR, en, es, zh-CN, ja, fr, de, ko, hi, ar, ru. Falantes nativos: revisem tom e naturalidade em src/shared/i18n.js.

3. **🔔 Notificações — posições de toast (incl. laterais esq/dir)**
   - Labels: `feature`
   - Descrição: Toast em center/bl/br/tl/tr + laterais l/r. Balão de fala e badge de emoção também posicionáveis em ⚙️ Configurações.

4. **🎨 Novos acessórios, skins e profissões**
   - Labels: `feature`, `good first issue`
   - Descrição: Catálogo em src/shared/catalog.js. Sugira/implemente novos itens pixel-art mantendo os testes (npm test) verdes.

**Lista "✅ Feito":**

5. **v3.8.0 — i18n, posições de notificação e integração Trello**
   - Labels: `feature`, `i18n`
   - Descrição: 11 idiomas com seletor, toast/balão/badge posicionáveis, cards de feedback via Trello, auditoria de 5 eixos (npm run audit).

## 8. Ao terminar
Me diga o que foi criado e o que precisou de login extra (ex.: power-up GitHub),
e tire um print do board para eu conferir.
