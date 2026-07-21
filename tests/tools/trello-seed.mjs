#!/usr/bin/env node
/**
 * Trello setup — configura e personaliza o board público do projeto:
 * descrição, preferências, labels coloridas, power-ups, custom fields,
 * listas e cards de apresentação — para convidar novos contribuidores.
 *
 * Credenciais NUNCA ficam no Git. Passe por ambiente:
 *   TRELLO_KEY=...  TRELLO_TOKEN=...  [TRELLO_BOARD=8wGr5tiQ]  node tests/tools/trello-seed.mjs
 *
 * - Idempotente: listas/labels/cards/power-ups já existentes não são duplicados.
 * - Nunca imprime key/token.
 * - `--dry` mostra o plano sem chamar a API.
 *
 * Passos "best-effort" (power-ups, custom fields, prefs de power-up) são
 * não-fatais: se a API recusar, o script avisa e segue.
 */

const KEY = (process.env.TRELLO_KEY || '').trim();
const TOKEN = (process.env.TRELLO_TOKEN || '').trim();
const BOARD = (process.env.TRELLO_BOARD || '8wGr5tiQ').trim();
const DRY = process.argv.includes('--dry');

const API = 'https://api.trello.com/1';

/** Descrição do board (aparece no cabeçalho / link público). */
const BOARD_DESC =
  "Claw'd 🐾 — companheiro pixel-art que vive nas suas abas. "
  + 'Board público de roadmap e feedback. Vote nas ideias 👍, pegue um card '
  + '"good first issue" e contribua! Repo + guia: veja README / CONTRIBUTING.';

/** Preferências do board (permissivas para comunidade). Best-effort. */
const BOARD_PREFS = {
  selfJoin: 'true',        // qualquer membro do Workspace pode entrar
  cardCovers: 'true',      // capas de card (visual)
  comments: 'public',      // comentários públicos (feedback aberto)
  voting: 'public',        // votação aberta em ideias
  cardAging: 'pirate',     // cards parados "envelhecem" visualmente
};

/**
 * Power-ups recomendados. `id` = idPlugin público do Trello (best-effort;
 * se falhar, habilite manualmente pela UI → Power-Ups).
 */
const POWERUPS = [
  { name: 'Custom Fields', id: '56d5e249a98895a9797bebb9', why: 'Prioridade/Área/Esforço por card' },
];

/**
 * Custom fields (dependem do power-up Custom Fields ativo). Best-effort.
 * type: list | text | number | date | checkbox
 */
const CUSTOM_FIELDS = [
  { name: 'Prioridade', type: 'list', options: ['🔴 Alta', '🟡 Média', '🟢 Baixa'] },
  { name: 'Área', type: 'list', options: ['Core', 'UI/UX', 'i18n', 'Infra/CI', 'Docs'] },
  { name: 'Esforço (pts)', type: 'number' },
];

/** Labels coloridas (taxonomia). color = paleta do Trello. */
const LABELS = [
  { name: 'bug', color: 'red' },
  { name: 'feature', color: 'green' },
  { name: 'i18n', color: 'sky' },
  { name: 'security', color: 'orange' },
  { name: 'performance', color: 'yellow' },
  { name: 'docs', color: 'purple' },
  { name: 'good first issue', color: 'lime' },
];

/** Listas do board, em ordem (esquerda → direita). */
const LISTS = ['📥 Ideias', '🐛 Bugs', '📋 Backlog', '🚧 Em progresso', '✅ Feito'];

/** Cards de apresentação — com labels e checklist opcionais. */
const SEED = [
  {
    list: '📋 Backlog',
    name: "👋 Bem-vindo ao Claw'd — comece por aqui",
    labels: ['good first issue', 'docs'],
    desc: [
      "Claw'd é um companheiro pixel-art que vive nas suas abas do navegador.",
      '',
      '- Repositório e guia: veja README.md e CONTRIBUTING.md',
      '- 11 idiomas, notificações posicionáveis, sub-pets, profissões e conquistas',
      '- Feedback: use os botões 💡 Sugestão / 🐛 Bug dentro da extensão (⚙️ Trello)',
    ].join('\n'),
    checklist: {
      name: 'Primeiros passos',
      items: ['Ler CONTRIBUTING.md', 'Rodar npm test', 'Pegar um card "good first issue"'],
    },
  },
  {
    list: '📋 Backlog',
    name: '🌍 i18n — revisar traduções nativas dos 11 idiomas',
    labels: ['i18n', 'good first issue'],
    desc: 'Pools de fala e UI em pt-BR, en, es, zh-CN, ja, fr, de, ko, hi, ar, ru. Falantes nativos: revisem tom e naturalidade em src/shared/i18n.js.',
  },
  {
    list: '📋 Backlog',
    name: '🔔 Notificações — posições de toast (incl. laterais esq/dir)',
    labels: ['feature'],
    desc: 'Toast em center/bl/br/tl/tr + laterais l/r. Balão de fala e badge de emoção também posicionáveis em ⚙️ Configurações.',
  },
  {
    list: '📋 Backlog',
    name: '🎨 Novos acessórios, skins e profissões',
    labels: ['feature', 'good first issue'],
    desc: 'Catálogo em src/shared/catalog.js. Sugira/implemente novos itens pixel-art mantendo os testes (npm test) verdes.',
  },
  {
    list: '✅ Feito',
    name: 'v3.8.0 — i18n, posições de notificação e integração Trello',
    labels: ['feature', 'i18n'],
    desc: '11 idiomas com seletor, toast/balão/badge posicionáveis, cards de feedback via Trello, auditoria de 5 eixos (npm run audit).',
  },
];

function die(msg) {
  console.error(`ERRO: ${msg}`);
  process.exit(1);
}

/**
 * Chamada à API. `soft:true` → não-fatal: retorna null em erro (para passos
 * best-effort como power-ups). Nunca loga key/token.
 */
async function trello(pathname, params = {}, method = 'GET', { soft = false } = {}) {
  const url = new URL(API + pathname);
  const all = { key: KEY, token: TOKEN, ...params };
  let res;
  try {
    if (method === 'GET') {
      for (const [k, v] of Object.entries(all)) url.searchParams.set(k, String(v));
      res = await fetch(url);
    } else {
      res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(all).toString(),
      });
    }
  } catch (e) {
    if (soft) return null;
    die(`${method} ${pathname} → rede: ${e && e.message ? e.message : e}`);
  }
  if (!res.ok) {
    if (soft) return null;
    die(`${method} ${pathname} → HTTP ${res.status}`);
  }
  return res.json();
}

function planoDry() {
  console.log('=== PLANO (dry-run, nenhuma chamada à API) ===');
  console.log(`board: ${BOARD}`);
  console.log(`descrição: ${BOARD_DESC.slice(0, 60)}…`);
  console.log(`prefs: ${Object.entries(BOARD_PREFS).map(([k, v]) => `${k}=${v}`).join(', ')}`);
  console.log(`power-ups: ${POWERUPS.map((p) => p.name).join(', ')}`);
  console.log(`custom fields: ${CUSTOM_FIELDS.map((f) => `${f.name}(${f.type})`).join(', ')}`);
  console.log(`labels: ${LABELS.map((l) => `${l.name}:${l.color}`).join(', ')}`);
  console.log(`listas: ${LISTS.join(' · ')}`);
  SEED.forEach((c) => console.log(`card → ${c.list}: ${c.name}  [${(c.labels || []).join(', ')}]`));
}

async function main() {
  if (DRY) return planoDry();
  if (!KEY || !TOKEN) die('defina TRELLO_KEY e TRELLO_TOKEN no ambiente.');
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(BOARD)) die(`board id inválido: ${BOARD}`);

  // 1. Descrição + preferências (prefs de power-up são best-effort).
  await trello(`/boards/${BOARD}/desc`, { value: BOARD_DESC }, 'PUT');
  console.log('+ descrição atualizada');
  for (const [pref, value] of Object.entries(BOARD_PREFS)) {
    const ok = await trello(`/boards/${BOARD}/prefs/${pref}`, { value }, 'PUT', { soft: true });
    console.log(`${ok ? '+' : '~'} pref ${pref}=${value}${ok ? '' : ' (ignorada pela API)'}`);
  }

  // 2. Power-ups (best-effort; alguns exigem habilitar na UI).
  const plugins = (await trello(`/boards/${BOARD}/boardPlugins`, {}, 'GET', { soft: true })) || [];
  const enabled = new Set(plugins.map((p) => p.idPlugin));
  for (const pu of POWERUPS) {
    if (enabled.has(pu.id)) { console.log(`= power-up já ativo: ${pu.name}`); continue; }
    const ok = await trello(`/boards/${BOARD}/boardPlugins`, { idPlugin: pu.id }, 'POST', { soft: true });
    console.log(`${ok ? '+' : '~'} power-up ${pu.name}${ok ? '' : ' — habilite manualmente (UI → Power-Ups)'}`);
  }

  // 3. Custom fields (dependem do power-up Custom Fields; best-effort).
  const cfExisting = (await trello('/boards/' + BOARD + '/customFields', {}, 'GET', { soft: true })) || [];
  const cfNames = new Set(cfExisting.map((f) => f.name));
  for (let i = 0; i < CUSTOM_FIELDS.length; i++) {
    const f = CUSTOM_FIELDS[i];
    if (cfNames.has(f.name)) { console.log(`= custom field já existe: ${f.name}`); continue; }
    const params = { idModel: BOARD, modelType: 'board', name: f.name, type: f.type, pos: (i + 1) * 100, display_cardFront: 'true' };
    if (f.type === 'list') {
      params.options = JSON.stringify(f.options.map((value, idx) => ({ color: 'none', value: { text: value }, pos: (idx + 1) * 100 })));
    }
    const ok = await trello('/customFields', params, 'POST', { soft: true });
    console.log(`${ok ? '+' : '~'} custom field ${f.name}${ok ? '' : ' (requer power-up Custom Fields ativo)'}`);
  }

  // 4. Labels (idempotente por nome).
  const labelsExisting = await trello(`/boards/${BOARD}/labels`, { fields: 'name,color', limit: 1000 });
  const labelByName = new Map(labelsExisting.filter((l) => l.name).map((l) => [l.name, l.id]));
  for (const lb of LABELS) {
    if (labelByName.has(lb.name)) { console.log(`= label já existe: ${lb.name}`); continue; }
    const created = await trello(`/boards/${BOARD}/labels`, { name: lb.name, color: lb.color });
    labelByName.set(lb.name, created.id);
    console.log(`+ label criada: ${lb.name} (${lb.color})`);
  }

  // 5. Listas (idempotente por nome).
  const existing = await trello(`/boards/${BOARD}/lists`, { fields: 'id,name' });
  const listByName = new Map(existing.map((l) => [l.name, l.id]));
  for (const name of LISTS) {
    if (listByName.has(name)) { console.log(`= lista já existe: ${name}`); continue; }
    const created = await trello('/lists', { name, idBoard: BOARD, pos: 'bottom' }, 'POST');
    listByName.set(name, created.id);
    console.log(`+ lista criada: ${name}`);
  }

  // 6. Cards + labels + checklist (idempotente por nome dentro da lista).
  for (const card of SEED) {
    const idList = listByName.get(card.list);
    if (!idList) { console.log(`! lista ausente para "${card.name}" — pulando`); continue; }
    const cards = await trello(`/lists/${idList}/cards`, { fields: 'name' });
    if (cards.some((c) => c.name === card.name)) { console.log(`= card já existe: ${card.name}`); continue; }
    const idLabels = (card.labels || []).map((n) => labelByName.get(n)).filter(Boolean).join(',');
    const created = await trello('/cards', { idList, name: card.name, desc: card.desc || '', idLabels }, 'POST');
    console.log(`+ card criado: ${card.name}`);
    if (card.checklist && created && created.id) {
      const cl = await trello('/checklists', { idCard: created.id, name: card.checklist.name }, 'POST', { soft: true });
      if (cl && cl.id) {
        for (const item of card.checklist.items) {
          await trello(`/checklists/${cl.id}/checkItems`, { name: item }, 'POST', { soft: true });
        }
        console.log(`  ↳ checklist "${card.checklist.name}" (${card.checklist.items.length} itens)`);
      }
    }
  }

  console.log(`\n✅ Board configurado: https://trello.com/b/${BOARD}`);
}

main().catch((e) => die(e && e.message ? e.message : String(e)));
