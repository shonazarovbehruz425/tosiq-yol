// Pawn skins shop: football-team-themed crest badges.
//
// NOTE: These are ORIGINAL color-crest designs (team colours + abbreviation),
// NOT the official trademarked club logos. They represent teams by their
// recognizable colours without reproducing copyrighted artwork.
//
// Each skin: { id, name, short, colors: [primary, secondary], price, tier }

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
  { id: 'pal', name: 'Palmeiras',      short: 'PAL', colors: ['#006437', '#ffffff'], price: FREE, tier: 3 }
];

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
// Uses a clipPath with a UNIQUE id per render (the duplicate-id collision was
// the original "half-drawn" bug) so any number of crests render correctly.
export function crestSvg(id, size = 40) {
  const s = byId[id];
  const uid = `s${(++_uid)}`;

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
