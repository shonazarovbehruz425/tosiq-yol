// Authoritative, server-side skin price catalog.
//
// SECURITY: skin prices MUST live on the server. The WebSocket client sends a
// `price` field when buying, but that value is attacker-controlled and must not
// be trusted (a malicious client could send price 0 to buy any skin for free).
// The server always looks up the real price from this catalog instead.
//
// Keep the IDs in sync with client/src/game/skins.js (`SKINS`).
// Tiered pricing (WAYZ): tier 1 = 400, tier 2 = 900, tier 3 = 1000.
// Default pawns stay free.

export const SKIN_PRICES = {
  // Free default pawns (also granted automatically on first shop load)
  default_red: 0,
  default_blue: 0,

  // ===== Football clubs =====
  // Tier 1 (400)
  rma: 400, bar: 400, mun: 400, mci: 400, liv: 400, bay: 400, psg: 400, juv: 400, che: 400, ars: 400,
  mil: 400, int: 400,
  // Tier 2 (900)
  bvb: 900, atm: 900, tot: 900, nap: 900, aja: 900, por: 900, ben: 900, sev: 900, rom: 900, laz: 900,
  om: 900, ol: 900, rbl: 900, b04: 900, ata: 900, vil: 900, rso: 900, new: 900,
  // Tier 3 (1000)
  val: 1000, avl: 1000, whu: 1000, eve: 1000, lei: 1000, cel: 1000, ran: 1000, gal: 1000, fen: 1000, bjk: 1000,
  fla: 1000, boc: 1000, riv: 1000, san: 1000, cor: 1000, hil: 1000, nas: 1000, mon: 1000, shk: 1000, scp: 1000,
  wol: 1000, bha: 1000, cry: 1000, ful: 1000, bre: 1000, nfo: 1000, lee: 1000, sou: 1000, gir: 1000, bet: 1000,
  ath: 1000, cad: 1000, osa: 1000, cel2: 1000, fio: 1000, tor: 1000, bol: 1000, udi: 1000, gen: 1000, sas: 1000,
  mfc: 1000, sfr: 1000, vfb: 1000, wob: 1000, sch: 1000, svw: 1000, tsg: 1000, lil: 1000, ren: 1000, nic: 1000,
  len: 1000, psv: 1000, fey: 1000, azs: 1000, spt: 1000, fcp: 1000, bra: 1000, trz: 1000, din: 1000, red: 1000,
  oly: 1000, pao: 1000, zen: 1000, csk: 1000, spa: 1000, ith: 1000, ahl: 1000, ity: 1000, lag: 1000, lafc: 1000,
  pal: 1000,

  // ===== Minecraft (tier 1 = 400) =====
  mc_creeper: 400, mc_steve: 400, mc_zombie: 400, mc_skeleton: 400, mc_ender: 400,
  mc_pig: 400, mc_cow: 400, mc_diamond: 400, mc_tnt: 400, mc_sword: 400,

  // ===== Mashhur insonlar (tier 1 = 400) =====
  fam_king: 400, fam_astro: 400, fam_star: 400, fam_science: 400, fam_artist: 400,
  fam_singer: 400, fam_boxer: 400, fam_gamer: 400,

  // ===== Meme (tier 1 = 400) =====
  meme_lol: 400, meme_moai: 400, meme_cool: 400, meme_clown: 400, meme_frog: 400,
  meme_skull: 400, meme_fire: 400, meme_cold: 400, meme_sus: 400
};

// Returns the authoritative price for a skin id, or null if the id is unknown.
export function getSkinPrice(skinId) {
  if (!skinId || typeof skinId !== 'string') return null;
  return Object.prototype.hasOwnProperty.call(SKIN_PRICES, skinId)
    ? SKIN_PRICES[skinId]
    : null;
}

export default SKIN_PRICES;
