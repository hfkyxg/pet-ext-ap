const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const style = fs.readFileSync(path.join(root, 'src', 'content', 'style.css'), 'utf8');

/* Bug: no visual liso, as props de profissão apareciam sem profissão ativa
   (glow vermelho/blobs perto da cabeça). Causa: cada prop tem animação
   infinita (clawd-glint/steam) que anima `opacity`; animação vence `opacity:0`
   no cascade, então a prop nunca some de verdade. Correção: gating por
   `visibility` (que ignora a animação de opacity), oculto por padrão e
   visível apenas no estado revelado da profissão. */

test('props: base oculta por visibility (animação de opacity não vaza sem profissão)', () => {
  const base = style.match(/#aic-clawd-node \.profession-prop \{[^}]*\}/);
  assert.ok(base, 'Regra base .profession-prop não encontrada.');
  assert.match(base[0], /opacity:\s*0/, 'A base deve manter opacity:0.');
  assert.match(base[0], /visibility:\s*hidden/, 'A base PRECISA de visibility:hidden — só opacity:0 é vencido pela animação da prop.');
});

test('props: estado revelado da profissão liga visibility:visible junto com opacity:1', () => {
  // O bloco de reveal compartilhado ([data-profession=X].fx .prop-Y) termina com opacity:1 + visibility:visible.
  const reveal = style.match(/#aic-clawd-node\[data-profession="chef"\]\.cooking \.prop-chef-pan,[\s\S]*?\.prop-fisher-bobber \{([^}]*)\}/);
  assert.ok(reveal, 'Bloco de reveal das props não encontrado.');
  assert.match(reveal[1], /opacity:\s*1/, 'Reveal deve setar opacity:1.');
  assert.match(reveal[1], /visibility:\s*visible/, 'Reveal deve setar visibility:visible para vencer o visibility:hidden da base.');
});

test('props: visibility alterna na hora (sem transição que congele a troca)', () => {
  const base = style.match(/#aic-clawd-node \.profession-prop \{[^}]*\}/)[0];
  // A transição é só de opacity — visibility não entra na transition (evita lag ao revelar).
  assert.match(base, /transition:\s*opacity[^;]*;/, 'A transição deve cobrir opacity.');
  assert.doesNotMatch(base, /transition:[^;]*visibility/, 'visibility não deve estar na transition (troca instantânea).');
});
