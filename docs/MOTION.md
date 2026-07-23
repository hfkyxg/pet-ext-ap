# Sistema de movimento e interação — Claw'd v4.0

Este documento é a fonte de manutenção para animações, transições e interações do runtime, popup e showcase. O objetivo é preservar ritmo, acessibilidade e performance sem apagar a personalidade pixel-art.

## Princípios

1. Movimento físico contínuo usa `requestAnimationFrame` e delta de tempo; timers não renderizam deslocamento.
2. Transições declaram somente as propriedades que mudam. `transition: all` é proibido.
3. Entrada pode ter ênfase; saída deve ser igual ou mais curta e o DOM só é removido após `transitionend`, com fallback temporizado.
4. Uma camada visual não pode sobrescrever a animação funcional de outra. O halo de foco, por exemplo, vive em `.sprite-stack::after`, nunca em `.pet-body`.
5. `prefers-reduced-motion: reduce`, `.aic-reduced-motion` e o modo desempenho devem interromper movimento decorativo, partículas e loops autônomos.
6. Toda interação precisa funcionar com ponteiro e teclado, ter foco visível e expor o estado assistivo correspondente.
7. Ações explícitas têm prioridade: loops autônomos aguardam `AUTONOMY_GRACE_MS` após qualquer interação recente antes de falar, passear, variar o idle ou iniciar uma cena em dupla.

## Vocabulário de movimento

| Papel | Duração de referência | Curva |
|------|------------------------|-------|
| Pressão / resposta imediata | 80 ms | standard |
| Hover / mudança curta | 180 ms | standard |
| Pop / seleção enfatizada | 180–240 ms | emphasized |
| Painel / estado base | 240–320 ms | standard |
| Overlay / revelação | 360–400 ms | standard |
| Respiração guiada | 4.000 ms por fase | ease-in-out |

Os tokens equivalentes ficam em:

- `src/content/style.css`: `--clawd-ease-*` e `--clawd-dur-*`;
- `src/popup/popup.css`: `--motion-ease-*` e `--motion-*`;
- `docs/showcase.css`: `--motion-ease-*` e `--motion-*`;
- `src/shared/catalog.js`: `CLAWD_TIMINGS` para relógios e fallbacks JavaScript.

As durações específicas de personagens e keyframes expressivos podem variar, mas devem manter a relação ação → reação → repouso e não competir pela mesma propriedade no mesmo elemento.

## Runtime e ciclo de vida

- Pet e subpet usam `requestAnimationFrame`; o follow do subpet normaliza `dt` para 60 Hz e limita saltos de frame.
- A aba oculta e o `IntersectionObserver` pausam trabalho visual que não está sendo visto.
- Partículas têm teto concorrente e timers rastreados.
- A janela `AUTONOMY_GRACE_MS` impede que fala, idle, subpet, profissão, passeio ou cena em dupla atropelem a reação solicitada pelo usuário e seu cleanup visual.
- Overlays usam `_removeAfterMotion()` para esperar `transitionend`/`transitioncancel`, com `CLAWD_TIMINGS.MOTION_EXIT_MS` como fallback.
- `destroy()` cancela rAF, intervalos, timeouts, listeners, observers e remoções visuais pendentes.

## Foco e bem-estar

- O relógio visual do Pomodoro atualiza a cada `FOCUS_TICK_MS` e calcula o restante a partir de `Date.now()`, evitando deriva acumulada.
- A respiração usa quatro fases de `BREATH_PHASE_MS`: inspire, segure, expire, segure.
- Respiração e bloqueio suave são diálogos modais: `aria-modal`, título/descrição associados, foco inicial, ciclo de Tab, Escape e restauração do foco anterior.
- O halo de foco anima uma camada decorativa independente; ações como pulo, dança e comemoração continuam sendo donas de `.pet-body`.

## Falas, olhar e gestos

- Balões nunca são posicionados pela caixa animada de entrada. O texto é inserido, a classe visível é aplicada e a medição de `offsetWidth/offsetHeight` acontece no próximo `requestAnimationFrame`.
- Pet e subpet avaliam `above`, `left`, `right` e `below`; a pontuação penaliza overflow e colisão com sprite, etiqueta, badge, outro personagem e outra fala. O resultado final mantém margem mínima de 8 px da viewport.
- A preferência `speechAnchor` muda a ordem dos candidatos, mas não autoriza cobrir conteúdo ou sair da tela.
- `.pet-look-layer` é a única camada que recebe perspectiva 3D. Fala, controles e hitbox não inclinam nem deformam.
- Clique, duplo clique, long press e arraste são intenções diferentes. Mover além do limiar cancela o long press; depois que o long press dispara, `mouseup`/`touchend` não enfileiram o clique.
- `Enter`/`Espaço` replica a ação primária; `Shift+Enter`/`Shift+Espaço` oferece a ação especial. O ring de long press e o acompanhamento do ponteiro são decorativos e param em reduced-motion.

## Popup e showcase

- As abas do popup seguem o padrão ARIA (`tablist`, `tab`, `tabpanel`) e aceitam ←, →, Home e End.
- Botões de Pomodoro refletem `disabled` e `aria-pressed`; humor usa `aria-pressed`.
- O showcase só avança automaticamente após ação explícita do usuário, pausa ao ocultar a página e usa rAF no preview autônomo do subpet.
- Em movimento reduzido, popup e showcase removem animações/transições e preservam conteúdo e estados finais.

## Checklist de mudança

- [ ] A propriedade animada é `transform`, `opacity`, cor, sombra ou dimensão necessária — nunca `all`.
- [ ] A animação não sobrescreve outra camada funcional.
- [ ] O estado de saída conclui e limpa o DOM mesmo com movimento reduzido.
- [ ] Aba oculta/off-screen não mantém loop decorativo.
- [ ] Teclado, foco visível, Escape e atributos ARIA foram verificados.
- [ ] `npm test`, `npm run check`, `npm run lint`, `npm run ecosystem` e `npm run audit` estão verdes.
- [ ] A inspeção manual cobre viewport estreita, movimento reduzido e uma página real com a extensão carregada.
- [ ] Falas simultâneas foram verificadas nos quatro cantos em desktop e 375 px.

Os contratos automatizados deste sistema vivem em `tests/motion-harmony.test.js`, `tests/interaction-layout.test.js` e `tests/quality-fluid.test.js`.
