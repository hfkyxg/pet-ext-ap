import fs from 'fs';

const path = 'src/content/style.css';
let css = fs.readFileSync(path, 'utf8');

const start = '/* Base vetorial dos cosméticos: cada variante abaixo usa superfícies contínuas. */';
const endMarker = '#aic-clawd-node.aic-nofx .accessory,';
const i = css.indexOf(start);
const j = css.indexOf(endMarker);
if (i < 0 || j < 0) throw new Error(`markers not found ${i} ${j}`);

const replacement = `/* Modo liso: acessórios e skins permanecem em PIXEL-SPRITE (mesma arte do modo pixel). */
#aic-clawd-node.smooth .accessory,
#aic-clawd-node.smooth .skin-mod {
  image-rendering: pixelated;
  /* NÃO zerar box-shadow — a grade pixel-art deve permanecer */
}

`;

css = css.slice(0, i) + replacement + css.slice(j);

/* Boca permanece visível por padrão (showMouth); não forçar display:none. */

const anims = `
/* ---- Novas ações do pet principal ---- */
@keyframes clawd-spin-action {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
@keyframes clawd-bounce-action {
  0%, 100% { transform: translateY(0); }
  40% { transform: translateY(-14px); }
  70% { transform: translateY(-4px); }
}
@keyframes clawd-wink-cover {
  0%, 55%, 100% { opacity: 0; }
  60%, 90% { opacity: 1; }
}
@keyframes clawd-cheer-hop {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-10px) scale(1.06); }
}
@keyframes clawd-sneak {
  0%, 100% { transform: translateX(0) scaleY(0.92); }
  50% { transform: translateX(6px) scaleY(0.88); }
}
@keyframes clawd-clap {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.08); }
}
@keyframes clawd-peek {
  0%, 100% { transform: translateY(0); }
  40% { transform: translateY(8px); }
  70% { transform: translateY(4px); }
}
@keyframes clawd-roll {
  0% { transform: translateX(0) rotate(0deg); }
  100% { transform: translateX(24px) rotate(360deg); }
}
#aic-clawd-node.spinning .pet-body,
#aic-clawd-node.spinning .smooth-sprite {
  animation: clawd-spin-action 0.7s cubic-bezier(.4,.05,.2,1) both;
}
#aic-clawd-node.bouncing .pet-body,
#aic-clawd-node.bouncing .smooth-sprite {
  animation: clawd-bounce-action 0.55s ease both;
}
#aic-clawd-node.winking .blink-cover {
  opacity: 1;
  animation: clawd-wink-cover 0.7s steps(1) both;
}
#aic-clawd-node.cheering .pet-body,
#aic-clawd-node.cheering .smooth-sprite {
  animation: clawd-cheer-hop 0.4s ease-in-out 3;
}
#aic-clawd-node.sneaking .pet-body,
#aic-clawd-node.sneaking .smooth-sprite {
  animation: clawd-sneak 0.5s ease-in-out 4;
}
#aic-clawd-node.clapping .pet-body,
#aic-clawd-node.clapping .smooth-sprite {
  animation: clawd-clap 0.22s ease-in-out 5;
}
#aic-clawd-node.peeking .pet-body,
#aic-clawd-node.peeking .smooth-sprite {
  animation: clawd-peek 0.7s ease both;
}
#aic-clawd-node.rolling .pet-body,
#aic-clawd-node.rolling .smooth-sprite {
  animation: clawd-roll 0.8s cubic-bezier(.4,.05,.2,1) both;
}
`;

if (!css.includes('clawd-spin-action')) css += `\n${anims}`;

fs.writeFileSync(path, css);
console.log('css patched', css.length);
