#!/usr/bin/env node
/**
 * Gera src/shared/i18n-entities.js com mapa EN do catálogo (labels).
 * pt-BR continua vindo do catalog.js como fallback.
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '../..');
const require = createRequire(import.meta.url);
const c = require(path.join(root, 'src/shared/catalog.js'));

const EN = {
  action: {
    wave: 'Wave', dance: 'Dance', happy: 'Pet', feed: 'Feed', somersault: 'Somersault',
    play: 'Play', pose: 'Pose', bath: 'Bath', sleep: 'Sleep', wake: 'Wake', fish: 'Fish',
    jump: 'Jump', stretch: 'Stretch', roar: 'Roar', spin: 'Spin', bounce: 'Bounce',
    wink: 'Wink', cheer: 'Cheer', sneak: 'Sneak', clap: 'Clap', peek: 'Peek', roll: 'Roll',
    balloon: 'Balloon', hug: 'Hug', flip: 'Flip', meditate: 'Meditate', electric: 'Zap',
    nap: 'Nap', highfive: 'High five', lookAround: 'Look around'
  },
  prof: {
    idle: 'Free', footballer: 'Footballer', tutor: 'Tutor', engineer: 'Dev',
    musician: 'Musician', chef: 'Chef', ninja: 'Ninja', fisher: 'Fisher',
    doctor: 'Doctor', artist: 'Artist', gamer: 'Gamer', streamer: 'Streamer'
  },
  prof_desc: {
    idle: 'No active profession',
    footballer: 'Soccer vibes and keepy-uppy',
    tutor: 'Challenges and learning prompts',
    engineer: 'Coding companion with laptop',
    musician: 'Rhythms and musical props',
    chef: 'Kitchen energy and snacks',
    ninja: 'Stealth moves and focus',
    fisher: 'Casts and catches on the page',
    doctor: 'Care and wellness checkups',
    artist: 'Creative sparks and color',
    gamer: 'Combos and game energy',
    streamer: 'Live chat energy'
  },
  model: { classic: 'Classic', mini: 'Mini', claws: 'Claws', guardian: 'Guardian' },
  face: {
    classic: 'Classic', sparkle: 'Sparkle', focused: 'Focused', sleepy: 'Sleepy',
    wink: 'Wink', cute: 'Cute', angry: 'Grumpy', heart: 'Heart eyes', drool: 'Drooly'
  },
  skin: {
    normal: 'Normal', droopy: 'Floppy ears', robot: 'Robot', freckles: 'Freckles',
    stripes: 'Stripes', spots: 'Spots', glow: 'Neon'
  },
  acc: {
    cap: 'Cap', tophat: 'Top hat', crown: 'Crown', chefhat: 'Chef hat', ninjaband: 'Ninja band',
    fishhat: 'Fishing hat', propeller: 'Propeller hat', witch_hat: 'Witch hat',
    bunny_ears: 'Bunny ears', party_hat: 'Party hat', visor: 'Gamer visor',
    glasses: 'Glasses', sunglasses: 'Sunglasses', bow: 'Bow', headphones: 'Headphones',
    scarf: 'Scarf', backpack: 'Backpack', medal: 'Medal', monocle: 'Monocle',
    mustache: 'Mustache', halo: 'Halo', horns: 'Horns', headband: 'Headband',
    star_clip: 'Star clip', blush: 'Blush', goggles: 'Adventure goggles', ribbon: 'Ribbon',
    wings: 'Wings', cape: 'Hero cape', armor: 'Armor', scarf_body: 'Body scarf'
  },
  subpet: {
    dog: 'Dog', cat: 'Cat', bird: 'Bird', rabbit: 'Rabbit',
    dino: 'Dino', dragon: 'Dragon', ghost: 'Ghost', slime: 'Slime'
  },
  rarity: { common: 'Common', rare: 'Rare', epic: 'Epic', legendary: 'Legendary' },
  daily: {
    pets: "Pet Claw'd 3 times",
    feed: 'Feed your buddy 2 times',
    play: 'Play with the pet 2 times',
    dance: 'Dance together 2 times',
    walk: 'Take the pet for a walk 3 times',
    fish: 'Fish 2 times',
    goals: 'Score 2 goals',
    bath: 'Bathe the pet 2 times',
    accessories: 'Change an accessory at least once',
    subpet: 'Interact with your sub-pet 3 times',
    combo: 'Make a 3-action combo',
    profession: 'Use a profession for at least 1 cycle',
    balloons: 'Pop 3 balloons',
    keepy: 'Do 20 keepy-uppies total'
  },
  weekly: {
    fish: 'Fisher of the Week', dance: 'Weekly Fever', pets: 'Too Affectionate',
    walk: 'Digital Marathon', goals: 'Weekly Striker', balloons: 'Balloon Hunter',
    keepy: 'Keepy Master', combo: 'Weekly Combo', subpet: 'Dynamic Duo',
    profession: 'Pixel Workaholic', feed: 'Chef of the Week', play: 'Playtime'
  },
  weekly_desc: {
    fish: 'Fish 8 times this week', dance: 'Dance 10 times this week',
    pets: 'Pet 15 times this week', walk: 'Walk the pet 20 times',
    goals: 'Score 8 goals this week', balloons: 'Pop 12 balloons this week',
    keepy: 'Do 80 keepy-uppies this week', combo: 'Complete 8 combos (≥3 actions)',
    subpet: 'Interact with the sub-pet 20 times', profession: 'Use professions in 5 cycles',
    feed: 'Feed the pet 10 times', play: 'Play 10 times this week'
  },
  subact: {
    cuddle: 'Cuddle', play: 'Play', explore: 'Explore', spin: 'Spin',
    celebrate: 'Celebrate', hug: 'Hug', special: 'Special'
  },
  subpet_desc: {
    dog: 'Loyal — wags when happy',
    cat: 'Independent — naps all day',
    bird: 'Sings and flies across the page',
    rabbit: 'Fast — double hops',
    dino: 'Classic heavy steps',
    dragon: 'Rare — breathes fire on challenge',
    ghost: 'Phases through walls, appears at night',
    slime: 'Sticky — splits when fed'
  }
};

const ACC_DESC_EN = {
  cap: 'Sporty cap with brim, panels and button',
  tophat: 'Classic top hat with violet band',
  crown: 'Golden crown with three jewels',
  chefhat: 'Chef toque with pleats and band',
  ninjaband: 'Ninja headband with knot and trailing ends',
  fishhat: 'Wide-brim fishing hat with badge',
  propeller: 'Colorful helmet with spinning propeller',
  witch_hat: 'Pointy hat with buckle and wide brim',
  bunny_ears: 'Soft pink bunny ears',
  party_hat: 'Striped cone hat with pompom',
  visor: 'Futuristic visor with side LEDs',
  glasses: 'Light frames with translucent lenses',
  sunglasses: 'Dark shades with lenses, bridge and gloss',
  bow: 'Pink bow with bold center',
  headphones: 'Padded headphones over the head',
  scarf: 'Red scarf with animated tip',
  backpack: 'Compact backpack with pocket and buckle',
  medal: 'Golden medal on a ribbon',
  monocle: 'Elegant lens with golden chain',
  mustache: 'Stylish mustache for a sharp look',
  halo: 'Floating golden pixel angel ring',
  horns: 'Red mischievous devil horns',
  headband: 'Colorful athlete bandana',
  star_clip: 'Golden star hair clip',
  blush: 'Cute anime blush cheeks',
  goggles: 'Pilot/diver pixel-art goggles',
  ribbon: 'Delicate silk neck ribbon',
  wings: 'Light wings for gentle gliding',
  cape: 'Billowing superhero cape',
  armor: 'Pixel-art armor with metal details',
  scarf_body: 'Neck-wrapped scarf, tip in the wind'
};

const ACH_DESC_EN = {
  first_pet: 'First click on the pet',
  striker: 'Score 50 goals',
  juggler: '30 keepy-uppies in a row',
  combo_keepy: '50 keepy-uppies in a row',
  zoo: 'Unlock 4 sub-pets',
  sleepyhead: 'Pet slept 100 times',
  fashionista: 'Wear 8 different accessories',
  explorer: '10 different tabs in one day',
  fisherman: 'Fish 20 times',
  bigcatch: 'Catch 1 rare fish',
  marathoner: 'Walk 500 times',
  dance_fever: 'Dance 50 times',
  first_level: 'Reach level 5',
  centurion: 'Perform 100 actions',
  shopaholic: 'Buy 5 shop items',
  gourmet: 'Feed the pet 20 times',
  dance_machine: 'Dance 15 times',
  fashion_victim: 'Have 6 accessories unlocked',
  combo_king: '5-action combo in 10 seconds',
  legendary_pet: 'Reach level 30',
  full_house: 'Unlock every sub-pet',
  polyglot: 'Use all 12 professions',
  night_owl: '50 interactions off peak hours',
  speedrun: '10 actions in 30 seconds',
  iron_will: '30-day streak',
  balloon_novice: 'Pop 5 balloons',
  balloon_party: 'Pop 25 balloons',
  keepy_miles: '200 keepy-uppies total',
  social_butterfly: 'Pet 50 times',
  night_owl_ext: '100 night interactions',
  streak_master: '14-day streak',
  fashion_queen: 'Wear 15 different accessories',
  keepy_legend: '1000 keepy-uppies total',
  balloon_master: 'Pop 100 balloons'
};

const SUBACT_FB_EN = {
  cuddle: 'Shared cuddles!',
  play: 'Playtime!',
  explore: 'Exploring the page!',
  spin: 'Full spin!',
  celebrate: 'Duo celebration!',
  hug: 'Buddy hug!',
  special: 'Species ability!'
};

// Fill missing acc keys from catalog
for (const id of Object.keys(c.CLAWD_ACCESSORIES)) {
  if (!EN.acc[id]) EN.acc[id] = c.CLAWD_ACCESSORIES[id].label;
}
EN.acc_desc = {};
for (const [id, def] of Object.entries(c.CLAWD_ACCESSORIES)) {
  EN.acc_desc[id] = ACC_DESC_EN[id] || def.desc || EN.acc[id];
}

EN.shop = {};
for (const [id, def] of Object.entries(c.CLAWD_SHOP)) {
  EN.shop[id] = EN.acc[id] || ({
    ball_gold: 'Golden ball', ball_beach: 'Beach ball', cushion: 'Cushion',
    propeller: 'Propeller hat'
  })[id] || def.label;
}

EN.ach = {};
EN.ach_desc = {};
const ACH_EN = {
  first_pet: 'First Pet', striker: 'Striker', juggler: 'Juggler', combo_keepy: 'Keepy King',
  zoo: 'Zoo', sleepyhead: 'Sleepyhead', fashionista: 'Fashionista', explorer: 'Explorer',
  fisherman: 'Fisher', bigcatch: 'Big Catch', marathoner: 'Marathoner', dance_fever: 'Dance Fever',
  first_level: 'First Level', centurion: 'Centurion', shopaholic: 'Shopaholic', gourmet: 'Gourmet',
  dance_machine: 'Dance Machine', fashion_victim: 'Fashion Victim', combo_king: 'Combo King',
  legendary_pet: 'Legendary Pet', full_house: 'Full House', polyglot: 'Polyglot',
  night_owl: 'Night Owl', speedrun: 'Speedrun', iron_will: 'Iron Will',
  balloon_novice: 'Balloon Novice', balloon_party: 'Balloon Party', keepy_miles: 'Keepy Miles',
  social_butterfly: 'Social Butterfly', night_owl_ext: 'Night Owl+', streak_master: 'Streak Master',
  fashion_queen: 'Fashion Queen', keepy_legend: 'Keepy Legend', balloon_master: 'Balloon Master'
};
for (const [id, def] of Object.entries(c.CLAWD_ACHIEVEMENTS)) {
  EN.ach[id] = ACH_EN[id] || def.label;
  EN.ach_desc[id] = ACH_DESC_EN[id] || def.desc || '';
}

EN.subact_fb = {};
for (const [id, def] of Object.entries(c.CLAWD_SUBPET_ACTIONS || {})) {
  if (!EN.subact[id]) EN.subact[id] = def.label;
  EN.subact_fb[id] = SUBACT_FB_EN[id] || def.feedback || '';
}

// Color presets
EN.color = {};
for (const p of (c.CLAWD_COLOR_PRESETS || [])) {
  const key = p.id || p.color;
  EN.color[key] = ({
    classic: 'Classic', neon: 'Neon', natural: 'Natural', sakura: 'Sakura', cyber: 'Cyber'
  })[key] || p.label;
}

const outPath = path.join(root, 'src/shared/i18n-entities.js');
const body = `/* ===================================================
   CLAW'D — Labels de catálogo por locale (EN + helper)
   pt-BR usa o texto do catalog.js como fallback.
   Gerado/atualizado por tests/tools/gen-i18n-entities.mjs
   =================================================== */

var CLAWD_I18N_ENTITY = {
  en: ${JSON.stringify(EN, null, 2)}
};

/**
 * Traduz label de entidade do catálogo.
 * kind: action|prof|prof_desc|model|face|skin|acc|acc_desc|shop|ach|ach_desc|
 *       subpet|subpet_desc|subact|subact_fb|daily|weekly|weekly_desc|rarity|color
 * Cadeia: locale → en → fallback (geralmente label PT do catálogo).
 */
function clawdEntityT(kind, id, fallback, locale) {
  const loc = (typeof clawdNormalizeLocale === 'function')
    ? clawdNormalizeLocale(locale)
    : (locale || 'pt-BR');
  if (loc === 'pt-BR') return fallback != null ? String(fallback) : String(id || '');
  const packs = [CLAWD_I18N_ENTITY[loc], CLAWD_I18N_ENTITY.en];
  for (let i = 0; i < packs.length; i++) {
    const pack = packs[i];
    if (pack && pack[kind] && typeof pack[kind][id] === 'string' && pack[kind][id]) {
      return pack[kind][id];
    }
  }
  return fallback != null ? String(fallback) : String(id || '');
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CLAWD_I18N_ENTITY, clawdEntityT };
}
`;

fs.writeFileSync(outPath, body, 'utf8');
console.log('Wrote', outPath);
console.log('kinds', Object.keys(EN).map((k) => `${k}:${Object.keys(EN[k]).length}`).join(', '));
