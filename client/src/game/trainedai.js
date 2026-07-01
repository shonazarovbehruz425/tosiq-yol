// trainedai.js — WrongWay AI o'rganish qatlami
// ai.js ga TEGILMAYDI. Bu faqat uning ustiga juda yengil qo'shimcha qatlam.
//
// NEGA ILGARI "DUMB" BO'LGAN VA ENDI TUZATILDI:
//   1) Eski versiya AI ning O'Z oldinga yurish kataklarini (dangerPaths)
//      jarima qilardi → AI oldinga borishdan qochib sarson yurardi. OLIB TASHLANDI.
//   2) Jarima barcha darajalarga bir xil urardi → daraja farqi yo'qolardi.
//      Endi jarima FAQAT qiyin darajalarda (advancedEval: hard/master/grandmaster)
//      va juda kichik (cheklangan) — asosiy strategiyani hech qachon buzmaydi.
//   3) Eng yaxshi devorlar avoidMoves ga tushib qolardi → endi avoidMoves bo'sh,
//      shuning uchun kandidat generatsiyasi/tartibi buzilmaydi.
//
// FALSAFA: o'rganish faqat TENG variantlar orasida tanlovni biroz suradi —
// ya'ni bot bir xil yutqazgan devorni takror qo'yishdan yengilgina qochadi,
// lekin kuchidan hech narsa yo'qotmaydi.

import { QuoridorAI } from './ai.js';

// ─── Training data loader ────────────────────────────────────────────

/**
 * Fetch training data from the server.
 * Returns { dangerWalls: Array, dangerPaths: Array } or null on failure.
 */
export async function loadTrainedData(difficulty) {
  try {
    const url = difficulty
      ? `/api/bot-patterns?difficulty=${encodeURIComponent(difficulty)}`
      : '/api/bot-patterns';
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return {
      dangerWalls: Array.isArray(data.dangerWalls) ? data.dangerWalls : [],
      dangerPaths: Array.isArray(data.dangerPaths) ? data.dangerPaths : []
    };
  } catch {
    return null;
  }
}

// ─── TrainedAI class ───────────────────────────────────────────────

/**
 * TrainedAI extends QuoridorAI.
 *
 * ai.js dagi hech narsa override qilinmaydi — faqat evaluateState ga juda
 * kichik, cheklangan "anti-repeat" turtki qo'shiladi (faqat hard+ da).
 */
export class TrainedAI extends QuoridorAI {
  /**
   * Apply server-computed danger data.
   * @param {Array} dangerWalls  [{r, c, wallType, score}]
   * @param {Array} dangerPaths  [{r, c, score}]  (saqlanib qoldi, lekin ISHLATILMAYDI)
   */
  applyTraining(dangerWalls, dangerPaths) {
    // avoidMoves ni BO'SH qoldiramiz: kandidat generatsiyasi va tartiblash
    // (parent klassdagi) buzilmasin — bot o'z eng yaxshi devorlarini ko'raveradi.
    this.avoidMoves = new Set();

    // "r,c,wallType" → score. Faqat yengil turtki uchun ishlatiladi.
    this._trainedDangerWalls = new Map();
    for (const { r, c, wallType, score } of (dangerWalls || [])) {
      if (score > 0) this._trainedDangerWalls.set(`${r},${c},${wallType}`, score);
    }

    // dangerPaths ATAYIN ishlatilmaydi: botning o'z oldinga yurish kataklarini
    // jarima qilish uni sarson qilib "dumb" qilib qo'yardi. Parametr faqat
    // moslik uchun qoldirildi.
  }

  /**
   * evaluateState override:
   *   1. To'liq asosiy evaluation ishlaydi (super.evaluateState).
   *   2. FAQAT qiyin darajalarda (advancedEval) va juda kichik, cheklangan
   *      jarima qo'shiladi — bot bir xil yutqazgan devorni takror qo'yishdan
   *      yengilgina qochadi. Cap: eng ko'pi -30 (bir qadam = 100), shuning uchun
   *      hech qachon asosiy poyga mantiqini bosib keta olmaydi.
   */
  evaluateState(engine) {
    const score = super.evaluateState(engine);

    // Oson/normal darajalar: o'rganish qatlami umuman aralashmaydi.
    if (!this.advancedEval) return score;
    if (!this._trainedDangerWalls || this._trainedDangerWalls.size === 0) return score;

    let penalty = 0;
    for (const w of engine.walls) {
      if (w.player === this.playerIndex) {
        const danger = this._trainedDangerWalls.get(`${w.r},${w.c},${w.type}`);
        if (danger) penalty += Math.min(danger * 0.15, 12); // har devorga kichik turtki
      }
    }
    // Umumiy cap: asosiy strategiyani buzmaslik uchun eng ko'pi -30.
    return score - Math.min(penalty, 30);
  }
}
