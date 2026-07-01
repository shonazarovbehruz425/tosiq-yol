// Pawn skins shop: football-team-themed crest badges + custom SVG art crests.
//
// NOTE: Football crests are ORIGINAL color-crest designs (team colours +
// abbreviation), NOT the official trademarked club logos. Minecraft / famous /
// meme categories use ORIGINAL hand-built SVG artwork (see skins-art.js), NOT
// emoji stickers and NOT copyrighted artwork/photos.
//
// Pricing (WAYZ): tier 1 = 400, tier 2 = 900, tier 3 = 1000. Defaults are free.
// The server (server/game/skins-catalog.js) holds the authoritative prices.
//
// Each skin: { id, name, short?, colors: [primary, secondary], price, tier, category }

import { ART } from './skins-art.js';

const FREE = 0;

export const SKINS = [
  // Free defaults (classic red / blue dots)
  { id: 'default_red',  name: 'Classic Red',  short: '', colors: ['#ef4444', '#dc2626'], price: 0, tier: 0, side: 0 },
  { id: 'default_blue', name: 'Classic Blue', short: '', colors: ['#3b82f6', '#2563eb'], price: 0, tier: 0, side: 1 },

  // ===== First 50 clubs =====
  { id: 'rma', name: 'Madrid White',   short: 'RMA', colors: ['#ffffff', '#febe10'], price: FREE, tier: 1 },
  { id: 'bar', name: 'Blaugrana',      short: 'BAR', colors: ['#004d98', '#a50044'], price: FREE, tier: 1 },
  { id: 'mun', name: 'Red Devils',     short: 'MUN', colors: ['#da291c', '#fbe122'], price: FREE, tier: 1 },
  { id: 'mci', name: 'Sky Blue',       short: 'MCI', colors: ['#6cabdd', '#1c2c5b'], price: FREE, tier: 1 },
  { id: 'liv', name: 'The Reds',       short: 'LIV', colors: ['#c8102e', '#00b2a9'], price: FREE, tier: 1 },
  { id: 'bay', name: 'Bavarians',      short: 'BAY', colors: ['#dc052d', '#0066b2'], price: FREE, tier: 1 },
  { id: 'psg', name: 'Paris',          short: 'PSG', colors: ['#004170', '#da291c'], price: FREE, tier: 1 },
  { id: 'juv', name: 'Old Lady',       short: 'JUV', colors: ['#000000', '#ffffff'], price: FREE, tier: 1 },
  { id: 'che', name: 'The Blues',      short: 'CHE', colors: ['#034694', '#ffffff'], price: FREE, tier: 1 },
  { id: 'ars', name: 'Gunners',        short: 'ARS', colors: ['#ef0107', '#ffffff'], price: FREE, tier: 1 },
  { id: 'mil', name: 'Rossoneri',      short: 'MIL', colors: ['#fb090b', '#000000'], price: FREE, tier: 1 },
  { id: 'int', name: 'Nerazzurri',     short: 'INT', colors: ['#0068a8', '#000000'], price: FREE, tier: 1 },
  { id: 'bvb', name: 'Yellow Wall',    short: 'BVB', colors: ['#fde100', '#000000'], price: FREE, tier: 2 },
  { id: 'atm', name: 'Colchoneros',    short: 'ATM', colors: ['#cb3524', '#1c2c5b'], price: FREE, tier: 2 },
  { id: 'tot', name: 'Spurs',          short: 'TOT', colors: ['#ffffff', '#132257'], price: FREE, tier: 2 },
  { id: 'nap', name: 'Partenopei',     short: 'NAP', colors: ['#12a0d7', '#ffffff'], price: FREE, tier: 2 },
  { id: 'aja', name: 'Ajax',           short: 'AJA', colors: ['#d2122e', '#ffffff'], price: FREE, tier: 2 },
  { id: 'por', name: 'Dragons',        short: 'POR', colors: ['#0033a0', '#ffffff'], price: FREE, tier: 2 },
  { id: 'ben', name: 'Eagles',         short: 'BEN', colors: ['#e30613', '#ffffff'], price: FREE, tier: 2 },
  { id: 'sev', name: 'Sevillistas',    short: 'SEV', colors: ['#d80027', '#ffffff'], price: FREE, tier: 2 },
  { id: 'rom', name: 'Giallorossi',    short: 'ROM', colors: ['#8e1118', '#f0bc42'], price: FREE, tier: 2 },
  { id: 'laz', name: 'Biancocelesti',  short: 'LAZ', colors: ['#87d8f7', '#0a2240'], price: FREE, tier: 2 },
  { id: 'om',  name: 'Marseille',      short: 'OM',  colors: ['#2faee0', '#ffffff'], price: FREE, tier: 2 },
  { id: 'ol',  name: 'Lyon',           short: 'OL',  colors: ['#da291c', '#ffffff'], price: FREE, tier: 2 },
  { id: 'rbl', name: 'Leipzig',        short: 'RBL', colors: ['#dd0741', '#ffffff'], price: FREE, tier: 2 },
  { id: 'b04', name: 'Leverkusen',     short: 'B04', colors: ['#e32221', '#000000'], price: FREE, tier: 2 },
  { id: 'ata', name: 'La Dea',         short: 'ATA', colors: ['#1d70b8', '#000000'], price: FREE, tier: 2 },
  { id: 'vil', name: 'Yellow Sub',     short: 'VIL', colors: ['#ffe667', '#005187'], price: FREE, tier: 2 },
  { id: 'rso', name: 'Sociedad',       short: 'RSO', colors: ['#0067b1', '#ffffff'], price: FREE, tier: 2 },
  { id: 'new', name: 'Magpies',        short: 'NEW', colors: ['#241f20', '#ffffff'], price: FREE, tier: 2 },
  { id: 'val', name: 'Valencia',       short: 'VAL', colors: ['#ee3524', '#ffffff'], price: FREE, tier: 3 },
  { id: 'avl', name: 'Villans',        short: 'AVL', colors: ['#670e36', '#95bfe5'], price: FREE, tier: 3 },
  { id: 'whu', name: 'Hammers',        short: 'WHU', colors: ['#7a263a', '#1bb1e7'], price: FREE, tier: 3 },
  { id: 'eve', name: 'Toffees',        short: 'EVE', colors: ['#003399', '#ffffff'], price: FREE, tier: 3 },
  { id: 'lei', name: 'Foxes',          short: 'LEI', colors: ['#003090', '#fdbe11'], price: FREE, tier: 3 },
  { id: 'cel', name: 'Celtic',         short: 'CEL', colors: ['#018749', '#ffffff'], price: FREE, tier: 3 },
  { id: 'ran', name: 'Rangers',        short: 'RAN', colors: ['#1b458f', '#ffffff'], price: FREE, tier: 3 },
  { id: 'gal', name: 'Galatasaray',    short: 'GAL', colors: ['#a90432', '#fdb912'], price: FREE, tier: 3 },
  { id: 'fen', name: 'Fenerbahce',     short: 'FEN', colors: ['#00296b', '#ffed00'], price: FREE, tier: 3 },
  { id: 'bjk', name: 'Besiktas',       short: 'BJK', colors: ['#000000', '#ffffff'], price: FREE, tier: 3 },
  { id: 'fla', name: 'Flamengo',       short: 'FLA', colors: ['#e30613', '#000000'], price: FREE, tier: 3 },
  { id: 'boc', name: 'Boca',           short: 'BOC', colors: ['#0a4c95', '#f9d616'], price: FREE, tier: 3 },
  { id: 'riv', name: 'River',          short: 'RIV', colors: ['#e1052c', '#ffffff'], price: FREE, tier: 3 },
  { id: 'san', name: 'Santos',         short: 'SAN', colors: ['#ffffff', '#000000'], price: FREE, tier: 3 },
  { id: 'cor', name: 'Corinthians',    short: 'COR', colors: ['#000000', '#ffffff'], price: FREE, tier: 3 },
  { id: 'hil', name: 'Al Hilal',       short: 'HIL', colors: ['#0c2f8b', '#ffffff'], price: FREE, tier: 3 },
  { id: 'nas', name: 'Al Nassr',       short: 'NAS', colors: ['#f9d616', '#0a4c95'], price: FREE, tier: 3 },
  { id: 'mon', name: 'Monaco',         short: 'MON', colors: ['#e51b22', '#ffffff'], price: FREE, tier: 3 },
  { id: 'shk', name: 'Shakhtar',       short: 'SHK', colors: ['#f47920', '#000000'], price: FREE, tier: 3 },
  { id: 'scp', name: 'Sporting',       short: 'SCP', colors: ['#008057', '#ffffff'], price: FREE, tier: 3 },

  // ===== 50 more clubs =====
  { id: 'wol', name: 'Wolves',         short: 'WOL', colors: ['#fdb913', '#231f20'], price: FREE, tier: 3 },
  { id: 'bha', name: 'Seagulls',       short: 'BHA', colors: ['#0057b8', '#ffffff'], price: FREE, tier: 3 },
  { id: 'cry', name: 'Eagles CP',      short: 'CRY', colors: ['#1b458f', '#c4122e'], price: FREE, tier: 3 },
  { id: 'ful', name: 'Cottagers',      short: 'FUL', colors: ['#ffffff', '#000000'], price: FREE, tier: 3 },
  { id: 'bre', name: 'Bees',           short: 'BRE', colors: ['#e30613', '#ffffff'], price: FREE, tier: 3 },
  { id: 'nfo', name: 'Forest',         short: 'NFO', colors: ['#dd0000', '#ffffff'], price: FREE, tier: 3 },
  { id: 'lee', name: 'Leeds',          short: 'LEE', colors: ['#ffffff', '#1d428a'], price: FREE, tier: 3 },
  { id: 'sou', name: 'Saints',         short: 'SOU', colors: ['#d71920', '#ffffff'], price: FREE, tier: 3 },
  { id: 'gir', name: 'Girona',         short: 'GIR', colors: ['#cd2534', '#ffffff'], price: FREE, tier: 3 },
  { id: 'bet', name: 'Betis',          short: 'BET', colors: ['#00954c', '#ffffff'], price: FREE, tier: 3 },
  { id: 'ath', name: 'Athletic',       short: 'ATH', colors: ['#ee2523', '#ffffff'], price: FREE, tier: 3 },
  { id: 'cad', name: 'Cadiz',          short: 'CAD', colors: ['#f4d03f', '#0a4c95'], price: FREE, tier: 3 },
  { id: 'osa', name: 'Osasuna',        short: 'OSA', colors: ['#0a346f', '#d91a21'], price: FREE, tier: 3 },
  { id: 'cel2',name: 'Celta',          short: 'CEL', colors: ['#8ac3ee', '#ffffff'], price: FREE, tier: 3 },
  { id: 'fio', name: 'Fiorentina',     short: 'FIO', colors: ['#592c82', '#ffffff'], price: FREE, tier: 3 },
  { id: 'tor', name: 'Torino',         short: 'TOR', colors: ['#881600', '#ffffff'], price: FREE, tier: 3 },
  { id: 'bol', name: 'Bologna',        short: 'BOL', colors: ['#1a2f48', '#a21c25'], price: FREE, tier: 3 },
  { id: 'udi', name: 'Udinese',        short: 'UDI', colors: ['#000000', '#ffffff'], price: FREE, tier: 3 },
  { id: 'gen', name: 'Genoa',          short: 'GEN', colors: ['#a21c25', '#1a2f48'], price: FREE, tier: 3 },
  { id: 'sas', name: 'Sassuolo',       short: 'SAS', colors: ['#00a752', '#000000'], price: FREE, tier: 3 },
  { id: 'mfc', name: 'Gladbach',       short: 'MGB', colors: ['#000000', '#00a651'], price: FREE, tier: 3 },
  { id: 'sfr', name: 'Frankfurt',      short: 'SGE', colors: ['#000000', '#e1000f'], price: FREE, tier: 3 },
  { id: 'vfb', name: 'Stuttgart',      short: 'VFB', colors: ['#ffffff', '#e30613'], price: FREE, tier: 3 },
  { id: 'wob', name: 'Wolfsburg',      short: 'WOB', colors: ['#65b32e', '#ffffff'], price: FREE, tier: 3 },
  { id: 'sch', name: 'Schalke',        short: 'S04', colors: ['#004d9d', '#ffffff'], price: FREE, tier: 3 },
  { id: 'svw', name: 'Bremen',         short: 'SVW', colors: ['#1d9053', '#ffffff'], price: FREE, tier: 3 },
  { id: 'tsg', name: 'Hoffenheim',     short: 'TSG', colors: ['#1c63b7', '#ffffff'], price: FREE, tier: 3 },
  { id: 'lil', name: 'Lille',          short: 'LIL', colors: ['#e01e13', '#0a2240'], price: FREE, tier: 3 },
  { id: 'ren', name: 'Rennes',         short: 'REN', colors: ['#e23223', '#000000'], price: FREE, tier: 3 },
  { id: 'nic', name: 'Nice',           short: 'NIC', colors: ['#e30613', '#000000'], price: FREE, tier: 3 },
  { id: 'len', name: 'Lens',           short: 'LEN', colors: ['#ffe000', '#e30613'], price: FREE, tier: 3 },
  { id: 'psv', name: 'PSV',            short: 'PSV', colors: ['#ed1c24', '#ffffff'], price: FREE, tier: 3 },
  { id: 'fey', name: 'Feyenoord',      short: 'FEY', colors: ['#e30613', '#ffffff'], price: FREE, tier: 3 },
  { id: 'azs', name: 'AZ Alkmaar',     short: 'AZ',  colors: ['#e2001a', '#ffffff'], price: FREE, tier: 3 },
  { id: 'spt', name: 'Sporting CP',    short: 'SPT', colors: ['#008057', '#ffffff'], price: FREE, tier: 3 },
  { id: 'fcp', name: 'FC Porto',       short: 'FCP', colors: ['#003da5', '#ffffff'], price: FREE, tier: 3 },
  { id: 'bra', name: 'Braga',          short: 'BRA', colors: ['#e30613', '#ffffff'], price: FREE, tier: 3 },
  { id: 'trz', name: 'Trabzonspor',    short: 'TRZ', colors: ['#80142b', '#5da9dd'], price: FREE, tier: 3 },
  { id: 'din', name: 'Dynamo Kyiv',    short: 'DYN', colors: ['#ffffff', '#005bbb'], price: FREE, tier: 3 },
  { id: 'red', name: 'Red Star',       short: 'CZV', colors: ['#e30613', '#ffffff'], price: FREE, tier: 3 },
  { id: 'oly', name: 'Olympiacos',     short: 'OLY', colors: ['#e30613', '#ffffff'], price: FREE, tier: 3 },
  { id: 'pao', name: 'Panathinaikos',  short: 'PAO', colors: ['#00843d', '#ffffff'], price: FREE, tier: 3 },
  { id: 'zen', name: 'Zenit',          short: 'ZEN', colors: ['#0a3b7c', '#7fbfff'], price: FREE, tier: 3 },
  { id: 'csk', name: 'CSKA',           short: 'CSK', colors: ['#c8102e', '#0a3b7c'], price: FREE, tier: 3 },
  { id: 'spa', name: 'Spartak',        short: 'SPK', colors: ['#c8102e', '#ffffff'], price: FREE, tier: 3 },
  { id: 'ith', name: 'Al Ittihad',     short: 'ITH', colors: ['#000000', '#f9d616'], price: FREE, tier: 3 },
  { id: 'ahl', name: 'Al Ahli',        short: 'AHL', colors: ['#007a3d', '#ffffff'], price: FREE, tier: 3 },
  { id: 'ity', name: 'Inter Miami',    short: 'MIA', colors: ['#f7b5cd', '#000000'], price: FREE, tier: 3 },
  { id: 'lag', name: 'LA Galaxy',      short: 'LAG', colors: ['#00245d', '#fdb913'], price: FREE, tier: 3 },
  { id: 'lafc',name: 'LAFC',           short: 'LFC', colors: ['#000000', '#c39e6d'], price: FREE, tier: 3 },
  { id: 'pal', name: 'Palmeiras',      short: 'PAL', colors: ['#006437', '#ffffff'], price: FREE, tier: 3 },

  // ===== Minecraft =====
  { id: 'mc_creeper',  name: 'Creeper',   colors: ['#5bbf3a', '#3d8b28'], category: 'minecraft', price: FREE, tier: 1 },
  { id: 'mc_steve',    name: 'Miner',     colors: ['#8b5a2b', '#5c3a1a'], category: 'minecraft', price: FREE, tier: 1 },
  { id: 'mc_zombie',   name: 'Zombie',    colors: ['#3d8b28', '#1f5214'], category: 'minecraft', price: FREE, tier: 1 },
  { id: 'mc_skeleton', name: 'Skeleton',  colors: ['#d1d5db', '#9ca3af'], category: 'minecraft', price: FREE, tier: 1 },
  { id: 'mc_ender',    name: 'Enderman',  colors: ['#4c1d95', '#1e1b4b'], category: 'minecraft', price: FREE, tier: 1 },
  { id: 'mc_pig',      name: 'Pig',       colors: ['#f9a8d4', '#ec4899'], category: 'minecraft', price: FREE, tier: 1 },
  { id: 'mc_cow',      name: 'Cow',       colors: ['#a16207', '#713f12'], category: 'minecraft', price: FREE, tier: 1 },
  { id: 'mc_diamond',  name: 'Diamond',   colors: ['#22d3ee', '#0891b2'], category: 'minecraft', price: FREE, tier: 1 },
  { id: 'mc_tnt',      name: 'TNT',       colors: ['#ef4444', '#b91c1c'], category: 'minecraft', price: FREE, tier: 1 },
  { id: 'mc_sword',    name: 'Sword',     colors: ['#94a3b8', '#475569'], category: 'minecraft', price: FREE, tier: 1 },

  // ===== Mashhur insonlar (original persona artwork) =====
  { id: 'fam_king',    name: 'King',      colors: ['#f59e0b', '#b45309'], category: 'famous', price: FREE, tier: 1 },
  { id: 'fam_astro',   name: 'Astronaut', colors: ['#1e3a8a', '#0f172a'], category: 'famous', price: FREE, tier: 1 },
  { id: 'fam_star',    name: 'Superstar', colors: ['#facc15', '#ca8a04'], category: 'famous', price: FREE, tier: 1 },
  { id: 'fam_science', name: 'Scientist', colors: ['#0ea5e9', '#0369a1'], category: 'famous', price: FREE, tier: 1 },
  { id: 'fam_artist',  name: 'Artist',    colors: ['#a855f7', '#6b21a8'], category: 'famous', price: FREE, tier: 1 },
  { id: 'fam_singer',  name: 'Singer',    colors: ['#ec4899', '#9d174d'], category: 'famous', price: FREE, tier: 1 },
  { id: 'fam_boxer',   name: 'Champion',  colors: ['#dc2626', '#7f1d1d'], category: 'famous', price: FREE, tier: 1 },
  { id: 'fam_gamer',   name: 'Gamer',     colors: ['#22c55e', '#15803d'], category: 'famous', price: FREE, tier: 1 },

  // ===== Meme =====
  { id: 'meme_lol',    name: 'LOL',       colors: ['#fbbf24', '#d97706'], category: 'meme', price: FREE, tier: 1 },
  { id: 'meme_moai',   name: 'Moai',      colors: ['#6b7280', '#374151'], category: 'meme', price: FREE, tier: 1 },
  { id: 'meme_cool',   name: 'Cool',      colors: ['#0ea5e9', '#075985'], category: 'meme', price: FREE, tier: 1 },
  { id: 'meme_clown',  name: 'Clown',     colors: ['#f43f5e', '#be123c'], category: 'meme', price: FREE, tier: 1 },
  { id: 'meme_frog',   name: 'Frog',      colors: ['#65a30d', '#3f6212'], category: 'meme', price: FREE, tier: 1 },
  { id: 'meme_skull',  name: 'Skull',     colors: ['#e5e7eb', '#9ca3af'], category: 'meme', price: FREE, tier: 1 },
  { id: 'meme_fire',   name: 'Lit',       colors: ['#f97316', '#c2410c'], category: 'meme', price: FREE, tier: 1 },
  { id: 'meme_cold',   name: 'Frozen',    colors: ['#38bdf8', '#0369a1'], category: 'meme', price: FREE, tier: 1 },
  { id: 'meme_sus',    name: 'Sus',       colors: ['#a3a3a3', '#525252'], category: 'meme', price: FREE, tier: 1 }
];

// Categories shown as tabs at the top of the Shop. Football is the default.
// Tab icons are crisp SVG (see catIconSvg) — no emoji / stickers.
export const SHOP_CATEGORIES = [
  { id: 'football',  label: 'Futbol' },
  { id: 'minecraft', label: 'Minecraft' },
  { id: 'famous',    label: 'Mashhur' },
  { id: 'meme',      label: 'Meme' }
];

// Small crisp category-tab icons (SVG, no emoji/stickers). Uses currentColor so
// each icon adopts the tab's text colour (active = white, inactive = grey).
export function catIconSvg(id, size = 15) {
  const box = `viewBox="0 0 24 24" width="${size}" height="${size}" style="vertical-align:-2px;margin-right:2px;"`;
  switch (id) {
    case 'football':
      return `<svg ${box} fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="9"/><polygon points="12,7.4 15.4,9.9 14.1,14 9.9,14 8.6,9.9" fill="currentColor" stroke="none"/><path d="M12 3v4.4M20.5 9.9 15.4 9.9M18.2 18 14.1 14M5.8 18 9.9 14M3.5 9.9 8.6 9.9"/></svg>`;
    case 'minecraft':
      return `<svg ${box} fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8.5Q12 3.5 20 8.5"/><path d="M4 8.5Q7.5 11 11.5 10"/><path d="M20 8.5Q16.5 11 12.5 10"/><line x1="12" y1="9.6" x2="9.6" y2="21"/></svg>`;
    case 'famous':
      return `<svg ${box} fill="currentColor" stroke="none"><polygon points="12,2.5 14.7,8.7 21.5,9.4 16.4,13.9 18,20.6 12,17 6,20.6 7.6,13.9 2.5,9.4 9.3,8.7"/></svg>`;
    case 'meme':
      return `<svg ${box} fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M8 13.8Q12 17.5 16 13.8"/><line x1="9" y1="9.4" x2="9" y2="10.3"/><line x1="15" y1="9.4" x2="15" y2="10.3"/></svg>`;
    default:
      return '';
  }
}

// Any tier>0 skin without an explicit category belongs to the football set.
SKINS.forEach(s => { if (!s.category) s.category = s.tier > 0 ? 'football' : 'default'; });

// Tiered pricing (WAYZ) — keep in sync with server/game/skins-catalog.js.
const TIER_PRICE = { 1: 400, 2: 900, 3: 1000 };
SKINS.forEach(s => { if (s.tier > 0) s.price = TIER_PRICE[s.tier] || s.price; });

export const DEFAULT_SKIN = { 0: 'default_red', 1: 'default_blue' };

const byId = {};
SKINS.forEach(s => { byId[s.id] = s; });

export function getSkin(id) {
  return byId[id] || null;
}

// Buyable skins (excludes the free defaults).
export function shopSkins() {
  return SKINS.filter(s => s.tier > 0);
}

// Unique id generator so multiple crests on the page never share gradient/clip
// IDs (the previous collision is what left some crests half-rendered).
let _uid = 0;

// Build an inline SVG crest for a skin. `size` is the pixel diameter.
// Uses UNIQUE ids per render (the duplicate-id collision was the original
// "half-drawn" bug) so any number of crests render correctly.
export function crestSvg(id, size = 40) {
  const s = byId[id];
  const uid = `s${(++_uid)}`;

  // Custom hand-built SVG art crests (Minecraft, famous personas, memes):
  // original artwork drawn on a dark disc, clipped to the crest circle.
  if (s && ART[s.id]) {
    return `<svg viewBox="0 0 40 40" width="${size}" height="${size}">
      <defs>
        <radialGradient id="${uid}g" cx="38%" cy="28%">
          <stop offset="0%" stop-color="#2d3446"/><stop offset="100%" stop-color="#121826"/>
        </radialGradient>
        <clipPath id="${uid}c"><circle cx="20" cy="20" r="18"/></clipPath>
      </defs>
      <circle cx="20" cy="20" r="18" fill="url(#${uid}g)"/>
      <g clip-path="url(#${uid}c)">${ART[s.id]}</g>
      <circle cx="20" cy="20" r="18" fill="none" stroke="rgba(255,255,255,0.9)" stroke-width="2.5"/>
    </svg>`;
  }

  // Default skins: a glossy solid dot.
  if (!s || s.tier === 0) {
    const c = s ? s.colors : ['#ef4444', '#dc2626'];
    return `<svg viewBox="0 0 40 40" width="${size}" height="${size}">
      <defs><radialGradient id="${uid}" cx="35%" cy="30%">
        <stop offset="0%" stop-color="${c[0]}"/><stop offset="100%" stop-color="${c[1]}"/>
      </radialGradient></defs>
      <circle cx="20" cy="20" r="18" fill="url(#${uid})" stroke="rgba(255,255,255,0.8)" stroke-width="2.5"/>
    </svg>`;
  }

  const [p, sec] = s.colors;
  // Circle clipped two-tone: primary fill + a diagonal triangle of the secondary
  // colour, a divider line, a dark plate behind the abbreviation, and an outer
  // ring. Works even for white-on-white teams.
  return `<svg viewBox="0 0 40 40" width="${size}" height="${size}">
    <defs><clipPath id="${uid}"><circle cx="20" cy="20" r="18"/></clipPath></defs>
    <g clip-path="url(#${uid})">
      <rect x="0" y="0" width="40" height="40" fill="${p}"/>
      <polygon points="0,0 40,0 0,40" fill="${sec}"/>
      <line x1="40" y1="0" x2="0" y2="40" stroke="rgba(0,0,0,0.25)" stroke-width="1.5"/>
      <rect x="0" y="13.5" width="40" height="13" fill="rgba(0,0,0,0.4)"/>
      <circle cx="20" cy="20" r="17" fill="none" stroke="rgba(0,0,0,0.18)" stroke-width="2"/>
    </g>
    <circle cx="20" cy="20" r="18" fill="none" stroke="rgba(255,255,255,0.92)" stroke-width="2.5"/>
    <text x="20" y="24.4" text-anchor="middle" font-family="Outfit, Arial, sans-serif"
      font-size="10.5" font-weight="800" fill="#ffffff">${s.short}</text>
  </svg>`;
}
