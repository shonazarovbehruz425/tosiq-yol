// Pawn skins shop: football-team-themed crest badges.
//
// NOTE: These are ORIGINAL color-crest designs (team colours + abbreviation),
// NOT the official trademarked club logos. They represent teams by their
// recognizable colours without reproducing copyrighted artwork.
//
// Each skin: { id, name, short, colors: [primary, secondary], price, tier }
// tier: 0 = free default, 1 = elite (500), 2 = top (300), 3 = classic (150)

export const SKINS = [
  // Free defaults (classic red / blue dots)
  { id: 'default_red',  name: 'Classic Red',  short: '', colors: ['#ef4444', '#dc2626'], price: 0, tier: 0, side: 0 },
  { id: 'default_blue', name: 'Classic Blue', short: '', colors: ['#3b82f6', '#2563eb'], price: 0, tier: 0, side: 1 },

  // Tier 1 — elite clubs (500 coins)
  { id: 'rma', name: 'Madrid White',   short: 'RMA', colors: ['#ffffff', '#febe10'], price: 500, tier: 1 },
  { id: 'bar', name: 'Blaugrana',      short: 'BAR', colors: ['#004d98', '#a50044'], price: 500, tier: 1 },
  { id: 'mun', name: 'Red Devils',     short: 'MUN', colors: ['#da291c', '#fbe122'], price: 500, tier: 1 },
  { id: 'mci', name: 'Sky Blue',       short: 'MCI', colors: ['#6cabdd', '#1c2c5b'], price: 500, tier: 1 },
  { id: 'liv', name: 'The Reds',       short: 'LIV', colors: ['#c8102e', '#00b2a9'], price: 500, tier: 1 },
  { id: 'bay', name: 'Bavarians',      short: 'BAY', colors: ['#dc052d', '#0066b2'], price: 500, tier: 1 },
  { id: 'psg', name: 'Paris',          short: 'PSG', colors: ['#004170', '#da291c'], price: 500, tier: 1 },
  { id: 'juv', name: 'Old Lady',       short: 'JUV', colors: ['#000000', '#ffffff'], price: 500, tier: 1 },
  { id: 'che', name: 'The Blues',      short: 'CHE', colors: ['#034694', '#ffffff'], price: 500, tier: 1 },
  { id: 'ars', name: 'Gunners',        short: 'ARS', colors: ['#ef0107', '#ffffff'], price: 500, tier: 1 },
  { id: 'mil', name: 'Rossoneri',      short: 'MIL', colors: ['#fb090b', '#000000'], price: 500, tier: 1 },
  { id: 'int', name: 'Nerazzurri',     short: 'INT', colors: ['#0068a8', '#000000'], price: 500, tier: 1 },

  // Tier 2 — top clubs (300 coins)
  { id: 'bvb', name: 'Yellow Wall',    short: 'BVB', colors: ['#fde100', '#000000'], price: 300, tier: 2 },
  { id: 'atm', name: 'Colchoneros',    short: 'ATM', colors: ['#cb3524', '#ffffff'], price: 300, tier: 2 },
  { id: 'tot', name: 'Spurs',          short: 'TOT', colors: ['#ffffff', '#132257'], price: 300, tier: 2 },
  { id: 'nap', name: 'Partenopei',     short: 'NAP', colors: ['#12a0d7', '#ffffff'], price: 300, tier: 2 },
  { id: 'aja', name: 'Ajax',           short: 'AJA', colors: ['#d2122e', '#ffffff'], price: 300, tier: 2 },
  { id: 'por', name: 'Dragons',        short: 'POR', colors: ['#0033a0', '#ffffff'], price: 300, tier: 2 },
  { id: 'ben', name: 'Eagles',         short: 'BEN', colors: ['#e30613', '#ffffff'], price: 300, tier: 2 },
  { id: 'sev', name: 'Sevillistas',    short: 'SEV', colors: ['#ffffff', '#d80027'], price: 300, tier: 2 },
  { id: 'rom', name: 'Giallorossi',    short: 'ROM', colors: ['#8e1118', '#f0bc42'], price: 300, tier: 2 },
  { id: 'laz', name: 'Biancocelesti',  short: 'LAZ', colors: ['#87d8f7', '#ffffff'], price: 300, tier: 2 },
  { id: 'om',  name: 'Marseille',      short: 'OM',  colors: ['#ffffff', '#2faee0'], price: 300, tier: 2 },
  { id: 'ol',  name: 'Lyon',           short: 'OL',  colors: ['#ffffff', '#da291c'], price: 300, tier: 2 },
  { id: 'rbl', name: 'Leipzig',        short: 'RBL', colors: ['#dd0741', '#ffffff'], price: 300, tier: 2 },
  { id: 'b04', name: 'Leverkusen',     short: 'B04', colors: ['#e32221', '#000000'], price: 300, tier: 2 },
  { id: 'ata', name: 'La Dea',         short: 'ATA', colors: ['#1d70b8', '#000000'], price: 300, tier: 2 },
  { id: 'vil', name: 'Yellow Sub',     short: 'VIL', colors: ['#ffe667', '#005187'], price: 300, tier: 2 },
  { id: 'rso', name: 'Sociedad',       short: 'RSO', colors: ['#0067b1', '#ffffff'], price: 300, tier: 2 },
  { id: 'new', name: 'Magpies',        short: 'NEW', colors: ['#241f20', '#ffffff'], price: 300, tier: 2 },

  // Tier 3 — classic clubs (150 coins)
  { id: 'val', name: 'Valencia',       short: 'VAL', colors: ['#ffffff', '#ee3524'], price: 150, tier: 3 },
  { id: 'avl', name: 'Villans',        short: 'AVL', colors: ['#670e36', '#95bfe5'], price: 150, tier: 3 },
  { id: 'whu', name: 'Hammers',        short: 'WHU', colors: ['#7a263a', '#1bb1e7'], price: 150, tier: 3 },
  { id: 'eve', name: 'Toffees',        short: 'EVE', colors: ['#003399', '#ffffff'], price: 150, tier: 3 },
  { id: 'lei', name: 'Foxes',          short: 'LEI', colors: ['#003090', '#fdbe11'], price: 150, tier: 3 },
  { id: 'cel', name: 'Celtic',         short: 'CEL', colors: ['#018749', '#ffffff'], price: 150, tier: 3 },
  { id: 'ran', name: 'Rangers',        short: 'RAN', colors: ['#1b458f', '#ffffff'], price: 150, tier: 3 },
  { id: 'gal', name: 'Galatasaray',    short: 'GAL', colors: ['#a90432', '#fdb912'], price: 150, tier: 3 },
  { id: 'fen', name: 'Fenerbahce',     short: 'FEN', colors: ['#ffed00', '#00296b'], price: 150, tier: 3 },
  { id: 'bjk', name: 'Besiktas',       short: 'BJK', colors: ['#000000', '#ffffff'], price: 150, tier: 3 },
  { id: 'fla', name: 'Flamengo',       short: 'FLA', colors: ['#e30613', '#000000'], price: 150, tier: 3 },
  { id: 'boc', name: 'Boca',           short: 'BOC', colors: ['#0a4c95', '#f9d616'], price: 150, tier: 3 },
  { id: 'riv', name: 'River',          short: 'RIV', colors: ['#ffffff', '#e1052c'], price: 150, tier: 3 },
  { id: 'san', name: 'Santos',         short: 'SAN', colors: ['#ffffff', '#000000'], price: 150, tier: 3 },
  { id: 'cor', name: 'Corinthians',    short: 'COR', colors: ['#000000', '#ffffff'], price: 150, tier: 3 },
  { id: 'hil', name: 'Al Hilal',       short: 'HIL', colors: ['#0c2f8b', '#ffffff'], price: 150, tier: 3 },
  { id: 'nas', name: 'Al Nassr',       short: 'NAS', colors: ['#f9d616', '#0a4c95'], price: 150, tier: 3 },
  { id: 'mon', name: 'Monaco',         short: 'MON', colors: ['#e51b22', '#ffffff'], price: 150, tier: 3 },
  { id: 'shk', name: 'Shakhtar',       short: 'SHK', colors: ['#f47920', '#000000'], price: 150, tier: 3 },
  { id: 'scp', name: 'Sporting',       short: 'SCP', colors: ['#008057', '#ffffff'], price: 150, tier: 3 }
];

export const DEFAULT_SKIN = { 0: 'default_red', 1: 'default_blue' };

const byId = {};
SKINS.forEach(s => { byId[s.id] = s; });

export function getSkin(id) {
  return byId[id] || null;
}

// Buyable skins (excludes the free defaults), ordered by tier then name.
export function shopSkins() {
  return SKINS.filter(s => s.tier > 0);
}

// Build an inline SVG crest for a skin. `size` is the pixel diameter.
// A two-tone shield/circle with the team abbreviation.
export function crestSvg(id, size = 40) {
  const s = byId[id];
  if (!s || s.tier === 0) {
    // Classic solid dot (default skins)
    const c = s ? s.colors : ['#ef4444', '#dc2626'];
    return `<svg viewBox="0 0 40 40" width="${size}" height="${size}">
      <defs><radialGradient id="g_${id}" cx="35%" cy="30%"><stop offset="0%" stop-color="${c[0]}"/><stop offset="100%" stop-color="${c[1]}"/></radialGradient></defs>
      <circle cx="20" cy="20" r="18" fill="url(#g_${id})" stroke="rgba(255,255,255,0.7)" stroke-width="2.5"/>
    </svg>`;
  }
  const [p, sec] = s.colors;
  // Choose a readable text colour against the primary.
  const txt = isLight(p) ? '#111827' : '#ffffff';
  return `<svg viewBox="0 0 40 40" width="${size}" height="${size}">
    <defs>
      <clipPath id="cl_${id}"><circle cx="20" cy="20" r="18"/></clipPath>
    </defs>
    <g clip-path="url(#cl_${id})">
      <rect x="0" y="0" width="40" height="40" fill="${p}"/>
      <rect x="0" y="0" width="20" height="40" fill="${sec}"/>
      <rect x="0" y="26" width="40" height="14" fill="${p}"/>
    </g>
    <circle cx="20" cy="20" r="18" fill="none" stroke="rgba(255,255,255,0.85)" stroke-width="2.5"/>
    <text x="20" y="24.5" text-anchor="middle" font-family="Outfit, sans-serif"
      font-size="11" font-weight="800" fill="${txt}">${s.short}</text>
  </svg>`;
}

function isLight(hex) {
  const c = hex.replace('#', '');
  if (c.length !== 6) return false;
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  // Perceived luminance
  return (0.299 * r + 0.587 * g + 0.114 * b) > 150;
}
