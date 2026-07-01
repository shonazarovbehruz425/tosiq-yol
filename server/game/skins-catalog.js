// Authoritative, server-side skin price catalog.
//
// SECURITY: skin prices MUST live on the server. The WebSocket client sends a
// `price` field when buying, but that value is attacker-controlled and must not
// be trusted (a malicious client could send price 0 to buy any skin for free).
// The server always looks up the real price from this catalog instead.
//
// Keep the IDs in sync with client/src/game/skins.js (`SKINS`). All crests are
// currently FREE (price 0); to charge WAYZ for a skin, change its value below.

export const SKIN_PRICES = {
  // Free default pawns (also granted automatically on first shop load)
  default_red: 0,
  default_blue: 0,
  // Club crests — all free for now
  rma: 0, bar: 0, mun: 0, mci: 0, liv: 0, bay: 0, psg: 0, juv: 0, che: 0, ars: 0,
  mil: 0, int: 0, bvb: 0, atm: 0, tot: 0, nap: 0, aja: 0, por: 0, ben: 0, sev: 0,
  rom: 0, laz: 0, om: 0, ol: 0, rbl: 0, b04: 0, ata: 0, vil: 0, rso: 0, new: 0,
  val: 0, avl: 0, whu: 0, eve: 0, lei: 0, cel: 0, ran: 0, gal: 0, fen: 0, bjk: 0,
  fla: 0, boc: 0, riv: 0, san: 0, cor: 0, hil: 0, nas: 0, mon: 0, shk: 0, scp: 0,
  wol: 0, bha: 0, cry: 0, ful: 0, bre: 0, nfo: 0, lee: 0, sou: 0, gir: 0, bet: 0,
  ath: 0, cad: 0, osa: 0, cel2: 0, fio: 0, tor: 0, bol: 0, udi: 0, gen: 0, sas: 0,
  mfc: 0, sfr: 0, vfb: 0, wob: 0, sch: 0, svw: 0, tsg: 0, lil: 0, ren: 0, nic: 0,
  len: 0, psv: 0, fey: 0, azs: 0, spt: 0, fcp: 0, bra: 0, trz: 0, din: 0, red: 0,
  oly: 0, pao: 0, zen: 0, csk: 0, spa: 0, ith: 0, ahl: 0, ity: 0, lag: 0, lafc: 0,
  pal: 0
};

// Returns the authoritative price for a skin id, or null if the id is unknown.
export function getSkinPrice(skinId) {
  if (!skinId || typeof skinId !== 'string') return null;
  return Object.prototype.hasOwnProperty.call(SKIN_PRICES, skinId)
    ? SKIN_PRICES[skinId]
    : null;
}

export default SKIN_PRICES;
