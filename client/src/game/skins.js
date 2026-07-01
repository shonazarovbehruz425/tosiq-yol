// Pawn skins shop: football-team crest badges + hand-built SVG art categories.
//
// NOTE: Football crests are ORIGINAL color-crest designs (team colours +
// abbreviation), NOT the official trademarked club logos. Minecraft / famous /
// meme categories use ORIGINAL hand-drawn vector art (see ART map below) —
// no emoji, no copyrighted photos.
//
// Each skin: { id, name, short?, colors: [primary, secondary], price, tier, category }

// All crests are free for now (price 0).
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

  // ===== Minecraft (hand-built pixel-style SVG, see ART) =====
  { id: 'mc_creeper',  name: 'Creeper',   colors: ['#5bbf3a', '#3d8b28'], category: 'minecraft', price: FREE, tier: 1 },
  { id: 'mc_steve',    name: 'Miner',     colors: ['#b57f52', '#5c3a1a'], category: 'minecraft', price: FREE, tier: 1 },
  { id: 'mc_zombie',   name: 'Zombie',    colors: ['#3d8b28', '#1f5214'], category: 'minecraft', price: FREE, tier: 1 },
  { id: 'mc_skeleton', name: 'Skeleton',  colors: ['#d1d5db', '#9ca3af'], category: 'minecraft', price: FREE, tier: 1 },
  { id: 'mc_ender',    name: 'Enderman',  colors: ['#4c1d95', '#1e1b4b'], category: 'minecraft', price: FREE, tier: 1 },
  { id: 'mc_pig',      name: 'Pig',       colors: ['#f9a8d4', '#ec4899'], category: 'minecraft', price: FREE, tier: 1 },
  { id: 'mc_cow',      name: 'Cow',       colors: ['#a16207', '#713f12'], category: 'minecraft', price: FREE, tier: 1 },
  { id: 'mc_diamond',  name: 'Diamond',   colors: ['#22d3ee', '#0891b2'], category: 'minecraft', price: FREE, tier: 1 },
  { id: 'mc_tnt',      name: 'TNT',       colors: ['#ef4444', '#b91c1c'], category: 'minecraft', price: FREE, tier: 1 },
  { id: 'mc_sword',    name: 'Sword',     colors: ['#94a3b8', '#475569'], category: 'minecraft', price: FREE, tier: 1 },

  // ===== Mashhur insonlar (persona icons — original art, no photos) =====
  { id: 'fam_king',    name: 'King',      colors: ['#f59e0b', '#b45309'], category: 'famous', price: FREE, tier: 1 },
  { id: 'fam_astro',   name: 'Astronaut', colors: ['#1e3a8a', '#0f172a'], category: 'famous', price: FREE, tier: 1 },
  { id: 'fam_star',    name: 'Superstar', colors: ['#facc15', '#ca8a04'], category: 'famous', price: FREE, tier: 1 },
  { id: 'fam_science', name: 'Scientist', colors: ['#0ea5e9', '#0369a1'], category: 'famous', price: FREE, tier: 1 },
  { id: 'fam_artist',  name: 'Artist',    colors: ['#a855f7', '#6b21a8'], category: 'famous', price: FREE, tier: 1 },
  { id: 'fam_singer',  name: 'Singer',    colors: ['#ec4899', '#9d174d'], category: 'famous', price: FREE, tier: 1 },
  { id: 'fam_boxer',   name: 'Champion',  colors: ['#dc2626', '#7f1d1d'], category: 'famous', price: FREE, tier: 1 },
  { id: 'fam_gamer',   name: 'Gamer',     colors: ['#22c55e', '#15803d'], category: 'famous', price: FREE, tier: 1 },

  // ===== Meme (original art) =====
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
export const SHOP_CATEGORIES = [
  { id: 'football',  label: 'Futbol',    icon: '\u26bd' },
  { id: 'minecraft', label: 'Minecraft', icon: '\u26cf\ufe0f' },
  { id: 'famous',    label: 'Mashhur',   icon: '\u2b50' },
  { id: 'meme',      label: 'Meme',      icon: '\ud83d\ude02' }
];

// Any tier>0 skin without an explicit category belongs to the football set.
SKINS.forEach(s => { if (!s.category) s.category = s.tier > 0 ? 'football' : 'default'; });

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

// ===== Hand-built, original SVG artwork for the non-football categories =====
// Each value is the inner markup drawn inside a 40x40 viewBox, clipped to the
// crest circle (r=18) and layered over a dark disc. No emoji, no photos.
const ART = {
  // ----- Minecraft (blocky / pixel style) -----
  mc_creeper: `<rect x="6" y="6" width="28" height="28" fill="#57b23a"/><rect x="6" y="6" width="28" height="13" fill="#65c948"/><rect x="9" y="20" width="5" height="5" fill="#4a9c31"/><rect x="26" y="9" width="5" height="5" fill="#4a9c31"/><rect x="12" y="12" width="6" height="7" fill="#10230b"/><rect x="22" y="12" width="6" height="7" fill="#10230b"/><rect x="17" y="19" width="6" height="6" fill="#10230b"/><rect x="13" y="22" width="5" height="10" fill="#10230b"/><rect x="22" y="22" width="5" height="10" fill="#10230b"/>`,
  mc_steve: `<rect x="7" y="10" width="26" height="24" fill="#b57f52"/><rect x="7" y="6" width="26" height="8" fill="#5a3a1e"/><rect x="7" y="12" width="4" height="5" fill="#5a3a1e"/><rect x="29" y="12" width="4" height="5" fill="#5a3a1e"/><rect x="13" y="17" width="5" height="4" fill="#ffffff"/><rect x="15" y="17" width="3" height="4" fill="#4062a8"/><rect x="22" y="17" width="5" height="4" fill="#ffffff"/><rect x="22" y="17" width="3" height="4" fill="#4062a8"/><rect x="14" y="24" width="12" height="3" fill="#8a5f38"/><rect x="17" y="27" width="6" height="5" fill="#5a3a1e"/>`,
  mc_zombie: `<rect x="7" y="8" width="26" height="26" fill="#3f8f2a"/><rect x="7" y="8" width="26" height="8" fill="#4fa835"/><rect x="18" y="12" width="4" height="13" fill="#356f24"/><rect x="11" y="16" width="6" height="6" fill="#0d1f08"/><rect x="23" y="16" width="6" height="6" fill="#0d1f08"/><rect x="12" y="27" width="16" height="3" fill="#0d1f08"/>`,
  mc_skeleton: `<rect x="9" y="9" width="22" height="18" rx="6" fill="#eceef1"/><rect x="13" y="25" width="14" height="7" rx="2" fill="#d8dce1"/><rect x="11" y="14" width="6" height="7" rx="2" fill="#28323f"/><rect x="23" y="14" width="6" height="7" rx="2" fill="#28323f"/><polygon points="20,20 17.5,24 22.5,24" fill="#28323f"/><rect x="15" y="26" width="1.8" height="6" fill="#b9c0c9"/><rect x="19.2" y="26" width="1.8" height="6" fill="#b9c0c9"/><rect x="23.4" y="26" width="1.8" height="6" fill="#b9c0c9"/>`,
  mc_ender: `<rect x="6" y="6" width="28" height="28" fill="#0e0b1a"/><rect x="10" y="18" width="8" height="4" fill="#d946ef"/><rect x="22" y="18" width="8" height="4" fill="#d946ef"/><rect x="11" y="19" width="6" height="2" fill="#f5d0fe"/><rect x="23" y="19" width="6" height="2" fill="#f5d0fe"/>`,
  mc_pig: `<polygon points="9,8 16,9 12,14" fill="#eb7fa3"/><polygon points="31,8 24,9 28,14" fill="#eb7fa3"/><rect x="8" y="10" width="24" height="23" rx="6" fill="#f6a8c0"/><rect x="13" y="20" width="14" height="10" rx="4" fill="#eb7fa3"/><rect x="16.5" y="23" width="2.6" height="4" rx="1" fill="#b65576"/><rect x="21" y="23" width="2.6" height="4" rx="1" fill="#b65576"/><rect x="13" y="15" width="3" height="4" rx="1" fill="#3a1f2a"/><rect x="24" y="15" width="3" height="4" rx="1" fill="#3a1f2a"/>`,
  mc_cow: `<polygon points="8,9 13,7 13,12" fill="#e8e0d0"/><polygon points="32,9 27,7 27,12" fill="#e8e0d0"/><rect x="9" y="10" width="22" height="22" rx="6" fill="#5a3d24"/><polygon points="9,12 20,11 15,26 9,24" fill="#efe7dc"/><rect x="13" y="24" width="14" height="8" rx="4" fill="#d9a9a0"/><rect x="16" y="27" width="2.6" height="3" rx="1" fill="#8a5652"/><rect x="21" y="27" width="2.6" height="3" rx="1" fill="#8a5652"/><rect x="13" y="16" width="3" height="4" rx="1" fill="#241812"/><rect x="24" y="16" width="3" height="4" rx="1" fill="#241812"/>`,
  mc_diamond: `<polygon points="12,12 28,12 33,18 20,33 7,18" fill="#5eead4"/><polygon points="12,12 20,18 7,18" fill="#2dd4bf"/><polygon points="28,12 33,18 20,18" fill="#2dd4bf"/><polygon points="12,12 28,12 20,18" fill="#99f6e4"/><polygon points="7,18 20,18 20,33" fill="#14b8a6"/><polygon points="33,18 20,18 20,33" fill="#0d9488"/><rect x="14" y="9" width="6" height="1.6" fill="#ffffff" opacity=".8"/>`,
  mc_tnt: `<rect x="7" y="11" width="26" height="20" rx="2" fill="#b83227"/><rect x="7" y="16" width="26" height="10" fill="#d24333"/><rect x="9" y="17.5" width="22" height="7" fill="#f2ede1"/><text x="20" y="23.2" text-anchor="middle" font-family="Outfit, Arial, sans-serif" font-size="6.5" font-weight="800" fill="#1f2937">TNT</text><rect x="18" y="5" width="4" height="7" rx="1" fill="#3a3a3a"/><circle cx="20" cy="5" r="2.4" fill="#fbbf24"/>`,
  mc_sword: `<g transform="rotate(45 20 20)"><rect x="18.4" y="5" width="3.2" height="21" fill="#7fe9dd"/><rect x="18.4" y="5" width="1.4" height="21" fill="#c3f5ef"/><polygon points="18.4,5 21.6,5 20,2.5" fill="#a7f3ea"/><rect x="14.5" y="25" width="11" height="3" rx="1" fill="#6b4423"/><rect x="18.4" y="26" width="3.2" height="8" fill="#5a3a1c"/><rect x="17.6" y="32" width="4.8" height="3" rx="1" fill="#8a6a3a"/></g>`,

  // ----- Famous personas -----
  fam_king: `<polygon points="9,18 12,9 16,15 20,7 24,15 28,9 31,18" fill="#fbbf24"/><circle cx="12" cy="9" r="1.6" fill="#ef4444"/><circle cx="20" cy="7" r="1.6" fill="#22c55e"/><circle cx="28" cy="9" r="1.6" fill="#3b82f6"/><rect x="9" y="17" width="22" height="6" rx="1.5" fill="#f59e0b"/><circle cx="20" cy="20" r="1.8" fill="#ef4444"/><rect x="12" y="23" width="16" height="9" rx="4" fill="#f4c58b"/><circle cx="16" cy="27" r="1.3" fill="#3a2a1a"/><circle cx="24" cy="27" r="1.3" fill="#3a2a1a"/>`,
  fam_astro: `<circle cx="20" cy="20" r="13" fill="#eef1f4"/><circle cx="20" cy="20" r="13" fill="none" stroke="#cbd2da" stroke-width="1.5"/><rect x="11" y="14" width="18" height="12" rx="6" fill="#1c2740"/><polygon points="14,17 21,17 15,24" fill="#4aa3e0" opacity=".75"/><rect x="27" y="12" width="3" height="6" rx="1.5" fill="#94a3b8"/><circle cx="28.5" cy="11" r="1.6" fill="#ef4444"/>`,
  fam_star: `<polygon points="20,5 24,15.5 35,16 26.5,23 29.5,34 20,27.5 10.5,34 13.5,23 5,16 16,15.5" fill="#fde047"/><polygon points="20,5 24,15.5 35,16 26.5,23 29.5,34 20,27.5" fill="#facc15"/><polygon points="20,10 22.4,16.5 29,17 24,21.5 20,18.5" fill="#fef9c3" opacity=".8"/>`,
  fam_science: `<path d="M8 22 Q7 9 20 9 Q33 9 32 22 Q30 15 24 13 L16 13 Q10 15 8 22 Z" fill="#e6e8eb"/><circle cx="20" cy="22" r="10" fill="#f0c9a0"/><path d="M10 17 Q12 12 20 12 Q28 12 30 17 Q25 14 20 14 Q15 14 10 17 Z" fill="#e6e8eb"/><circle cx="15.5" cy="21" r="3.4" fill="#cfeaf5" stroke="#334155" stroke-width="1.4"/><circle cx="24.5" cy="21" r="3.4" fill="#cfeaf5" stroke="#334155" stroke-width="1.4"/><line x1="18.9" y1="21" x2="21.1" y2="21" stroke="#334155" stroke-width="1.4"/><rect x="15" y="27" width="10" height="3.2" rx="1.6" fill="#e6e8eb"/>`,
  fam_artist: `<ellipse cx="20" cy="24" rx="12" ry="8.5" fill="#f2e3c2"/><circle cx="25" cy="27" r="2.2" fill="#141a27"/><circle cx="14" cy="22" r="2" fill="#ef4444"/><circle cx="19" cy="20" r="2" fill="#facc15"/><circle cx="24" cy="21" r="2" fill="#22c55e"/><circle cx="27" cy="24" r="2" fill="#3b82f6"/><ellipse cx="20" cy="12" rx="9" ry="4.5" fill="#7c3aed"/><circle cx="20" cy="8" r="1.8" fill="#7c3aed"/>`,
  fam_singer: `<circle cx="20" cy="14" r="7.5" fill="#cbd5e1"/><circle cx="20" cy="14" r="7.5" fill="none" stroke="#94a3b8" stroke-width="1"/><line x1="14" y1="12" x2="26" y2="12" stroke="#64748b" stroke-width="1"/><line x1="14" y1="15" x2="26" y2="15" stroke="#64748b" stroke-width="1"/><rect x="17.5" y="20" width="5" height="3" rx="1.5" fill="#94a3b8"/><rect x="18" y="22" width="4" height="13" rx="2" fill="#475569"/><circle cx="30" cy="10" r="1.6" fill="#f472b6"/><rect x="30" y="6" width="1.4" height="5" fill="#f472b6"/>`,
  fam_boxer: `<rect x="8" y="17" width="24" height="13" rx="6.5" fill="#e11d2f"/><circle cx="19" cy="18" r="10" fill="#e11d2f"/><circle cx="11" cy="23" r="4.5" fill="#c4142a"/><ellipse cx="17" cy="14" rx="6" ry="3" fill="#ff6b7a" opacity=".5"/><rect x="13" y="28" width="16" height="6" rx="2" fill="#7f1420"/><line x1="13" y1="31" x2="29" y2="31" stroke="#5a0e17" stroke-width="1"/>`,
  fam_gamer: `<rect x="6" y="15" width="28" height="13" rx="6.5" fill="#3a4763"/><circle cx="10" cy="27" r="4" fill="#3a4763"/><circle cx="30" cy="27" r="4" fill="#3a4763"/><rect x="12.5" y="18.5" width="2.2" height="7" rx="1" fill="#cbd5e1"/><rect x="10.2" y="20.7" width="6.8" height="2.2" rx="1" fill="#cbd5e1"/><circle cx="26" cy="19.5" r="1.7" fill="#facc15"/><circle cx="23" cy="22.5" r="1.7" fill="#3b82f6"/><circle cx="29" cy="22.5" r="1.7" fill="#22c55e"/><circle cx="26" cy="25.5" r="1.7" fill="#ef4444"/>`,

  // ----- Meme -----
  meme_lol: `<circle cx="20" cy="20" r="14" fill="#fbbf24"/><circle cx="20" cy="20" r="14" fill="none" stroke="#e2960a" stroke-width="1.5"/><path d="M11 16 Q15 12 19 16" fill="none" stroke="#3a2a00" stroke-width="2" stroke-linecap="round"/><path d="M21 16 Q25 12 29 16" fill="none" stroke="#3a2a00" stroke-width="2" stroke-linecap="round"/><path d="M12 23 Q20 34 28 23 Z" fill="#7a1f1f"/><path d="M13 23.5 Q20 26 27 23.5 Z" fill="#ffffff"/><path d="M17 30 Q20 33 23 30 Q20 31 17 30 Z" fill="#f43f5e"/><path d="M9 19 Q7 23 9 26 Q11 23 10 19 Z" fill="#38bdf8"/><path d="M31 19 Q33 23 31 26 Q29 23 30 19 Z" fill="#38bdf8"/>`,
  meme_moai: `<path d="M11 9 Q11 6 15 6 L25 6 Q29 6 29 9 L30 25 Q30 34 20 34 Q10 34 10 25 Z" fill="#8b9096"/><path d="M20 6 L25 6 Q29 6 29 9 L30 25 Q30 34 20 34 Z" fill="#7b8086"/><rect x="12" y="14" width="6" height="3.4" fill="#3f4247"/><rect x="22" y="14" width="6" height="3.4" fill="#3f4247"/><polygon points="18,16 22,16 23.5,25 16.5,25" fill="#767b81"/><rect x="14" y="28" width="12" height="2.6" rx="1" fill="#3f4247"/><rect x="12" y="12" width="7" height="2" fill="#6f757b"/><rect x="21" y="12" width="7" height="2" fill="#6f757b"/>`,
  meme_cool: `<circle cx="20" cy="20" r="14" fill="#fbbf24"/><circle cx="20" cy="20" r="14" fill="none" stroke="#e2960a" stroke-width="1.5"/><path d="M8 15 L19 15 Q20 15 20 16.5 L20 20 Q20 22 17.5 22 L12 22 Q9 22 8.5 19 Z" fill="#141a27"/><path d="M32 15 L21 15 Q20 15 20 16.5 L20 20 Q20 22 22.5 22 L28 22 Q31 22 31.5 19 Z" fill="#141a27"/><rect x="10" y="16.5" width="4" height="1.6" rx=".8" fill="#475569"/><path d="M13 26 Q20 32 27 26" fill="none" stroke="#7a5a00" stroke-width="2.4" stroke-linecap="round"/>`,
  meme_clown: `<circle cx="8" cy="16" r="5" fill="#ef4444"/><circle cx="32" cy="16" r="5" fill="#ef4444"/><circle cx="20" cy="21" r="11" fill="#f8efe6"/><circle cx="15" cy="17" r="1.8" fill="#1f2937"/><circle cx="25" cy="17" r="1.8" fill="#1f2937"/><circle cx="13" cy="22" r="2" fill="#f9a8c0" opacity=".8"/><circle cx="27" cy="22" r="2" fill="#f9a8c0" opacity=".8"/><path d="M13 25 Q20 33 27 25" fill="none" stroke="#dc2626" stroke-width="2.6" stroke-linecap="round"/><circle cx="20" cy="23" r="3.4" fill="#ef4444"/><circle cx="19" cy="22" r="1" fill="#ff8a8a"/>`,
  meme_frog: `<path d="M8 17 Q8 31 20 31 Q32 31 32 17 Z" fill="#7fbf3f"/><path d="M11 21 Q20 26 29 21 L29 24 Q20 29 11 24 Z" fill="#5c9130"/><circle cx="12" cy="12" r="5.5" fill="#8fce4a"/><circle cx="28" cy="12" r="5.5" fill="#8fce4a"/><circle cx="12" cy="12" r="2.2" fill="#1a1a1a"/><circle cx="28" cy="12" r="2.2" fill="#1a1a1a"/><circle cx="12.8" cy="11.2" r=".7" fill="#fff"/><circle cx="28.8" cy="11.2" r=".7" fill="#fff"/><path d="M11 21 Q20 25 29 21" fill="none" stroke="#3f6212" stroke-width="1.8" stroke-linecap="round"/>`,
  meme_skull: `<path d="M20 7 Q31 7 31 19 Q31 25 27 27 L27 30 Q27 33 24 33 L16 33 Q13 33 13 30 L13 27 Q9 25 9 19 Q9 7 20 7 Z" fill="#eef1f4"/><ellipse cx="15.5" cy="19" rx="3.6" ry="4.2" fill="#1f2937"/><ellipse cx="24.5" cy="19" rx="3.6" ry="4.2" fill="#1f2937"/><polygon points="20,22 17.8,26 22.2,26" fill="#1f2937"/><rect x="16" y="30" width="1.8" height="3.2" fill="#c9cfd6"/><rect x="19.1" y="30" width="1.8" height="3.2" fill="#c9cfd6"/><rect x="22.2" y="30" width="1.8" height="3.2" fill="#c9cfd6"/>`,
  meme_fire: `<path d="M20 5 Q27 13 24 20 Q29 18 27.5 25 Q27 33 20 33 Q12 33 12 25 Q12 17 18 11 Q19 16 21 14 Q23 10 20 5 Z" fill="#f97316"/><path d="M20 13 Q24 18 22 23 Q25 22 