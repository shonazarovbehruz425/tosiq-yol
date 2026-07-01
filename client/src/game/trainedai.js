// trainedai.js — WrongWay AI o'rganish qatlami
// ai.js ga TEGILMAYDI. Bu faqat uning ustiga yengil qo'shimcha qatlam.
//
// NIMANI O'RGANADI (yangilangan):
//   1) RAQIBNING YUTUQ YO'LAGI (asosiy signal): bot yutqazgan o'yinlarda odam
//      piyodasi (player 0) bosib o'tgan kataklar. Bot shu yo'lakni DEVOR bilan
//      to'sishga undaydi — ya'ni odam takror-takror bir xil strategiya bilan
//      yutayotgan bo'lsa, bot o'sha yo'lni bloklashni o'rganadi. Ma'lumot
//      /api/bot-patterns dan (patterns[].opening) olinadi — har yurishda kim
//      yurgani (player) yozilgan.
//   2) Bot o'zi yutqazgan o'yinlarda qo'ygan devorlar: yengil "takrorlama"
//      turtkisi (kichik jarima).
//
// XAVFSIZLIK: barcha turtkilar FAQAT qiyin darajalarda (advancedEval:
// hard/master/grandmaster) va cheklangan (bounded). Bir qadam ~200 ball turadi,
// bu turtkilar esa jami ±50 atrofida — shuning uchun asosiy poyga mantiqini
// hech qachon bosib keta olmaydi. Oson/normal darajalar butunlay tegilmaydi.

import { QuoridorAI } from './ai.js';

// ─── Training data loader ────────────────────────────────────────────

/**
 * Fetch training data from the server.
 * Returns { dangerWalls, dangerPaths, patterns } or null on failure.
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
      dangerPaths: Array.isArray(data.dangerPaths) ? data.dangerPaths : [],
      patterns: Array.isArray(data.patterns) ? data.patterns : []
    };
  } catch {
    return null;
  }
}

// ─── TrainedAI class ───────────────────────────────────────────────

/**
 * TrainedAI extends QuoridorAI.
 *
 * ai.js dagi hech narsa buzilmaydi — faqat evaluateState ga cheklangan
 * o'rganish turtkilari qo'shiladi (faqat hard+ da).
 */
export class TrainedAI extends QuoridorAI {
  /**
   * Apply server-computed training data.
   * @param {Array} dangerWalls  [{r, c, wallType, score}]  bot's own losing walls
   * @param {Array} dangerPaths  [{r, c, score}]            (ISHLATILMAYDI, moslik uchun)
   * @param {Array} patterns     raw stored games (opening moves bilan)
   */
  applyTraining(dangerWalls, dangerPaths, patterns) {
    // avoidMoves ni BO'SH qoldiramiz: parent klassdagi kandidat generatsiyasi
    // va tartiblash buzilmasin — bot o'z eng yaxshi devorlarini ko'raveradi.
    this.avoidMoves = new Set();

    // (2) Bot o'zi yutqazgan devorlar — yengil "takrorlama" turtkisi.
    this._trainedDangerWalls = new Map();
    for (const { r, c, wallType, score } of (dangerWalls || [])) {
      if (score > 0) this._trainedDangerWalls.set(`${r},${c},${wallType}`, score);
    }

    // (1) RAQIBNING yutuq yo'lagi. Har bir yutqazilgan o'yinning "opening"
    // (dastlabki 10 yurish) qismidan odam (player 0) piyodasi turgan kataklarni
    // yig'amiz. Yangilik og'irroq (recency), qiyinroq daraja og'irroq baholanadi.
    const cellScore = new Map();
    const now = Date.now();
    for (const p of (patterns || [])) {
      const ageDays = (now - (p.timestamp || now)) / (1000 * 60 * 60 * 24);
      const recency = Math.max(0.2, 1 - ageDays / 30);
      const diffW = { hard: 1, master: 1.5, grandmaster: 2 }[p.difficulty] || 1;
      const w = recency * diffW;
      for (const om of (p.opening || [])) {
        if (om && om.type === 'move' && om.player === 0) {
          const key = `${om.r},${om.c}`;
          cellScore.set(key, (cellScore.get(key) || 0) + w * 8);
        }
      }
    }

    // Ikki tayyor xarita (O(1) qidiruv uchun oldindan quriladi):
    //   _threatCell : aniq katak -> score  (odam piyodasi shu yerda => xavf)
    //   _threatNear : katak + qo'shnilari -> eng katta score
    //                 (bot devori shu atrofda => yo'lakni bloklagan => mukofot)
    this._threatCell = new Map();
    this._threatNear = new Map();
    for (const [key, score] of cellScore) {
      if (!(score > 0)) continue;
      this._threatCell.set(key, score);
      const [r, c] = key.split(',').map(Number);
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const k = `${r + dr},${c + dc}`;
          const cur = this._threatNear.get(k) || 0;
          if (score > cur) this._threatNear.set(k, score);
        }
      }
    }
  }

  /**
   * evaluateState override:
   *   1. To'liq asosiy evaluation ishlaydi (super.evaluateState).
   *   2. FAQAT qiyin darajalarda (advancedEval) cheklangan turtkilar:
   *      - Odamning yutuq yo'lagini to'sish: MUKOFOT (+); odam shu yo'lda tursa: JARIMA (-).
   *      - Bir xil yutqazgan devorni takror qo'yishdan yengil qochish.
   */
  evaluateState(engine) {
    const score = super.evaluateState(engine);
    if (!this.advancedEval) return score;

    let adjust = 0;

    // Yengil "takrorlama" jarimasi (cap -20).
    if (this._trainedDangerWalls && this._trainedDangerWalls.size > 0) {
      let penalty = 0;
      for (const w of engine.walls) {
        if (w.player === this.playerIndex) {
          const danger = this._trainedDangerWalls.get(`${w.r},${w.c},${w.type}`);
          if (danger) penalty += Math.min(danger * 0.15, 12);
        }
      }
      adjust -= Math.min(penalty, 20);
    }

    // RAQIBNING yutuq yo'lagini to'sish (asosiy o'rganish signali, cap ±30).
    if (this._threatNear && this._threatNear.size > 0) {
      let corridor = 0;
      for (const w of engine.walls) {
        if (w.player !== this.playerIndex) continue;
        const sc = this._threatNear.get(`${w.r},${w.c}`);
        if (sc) corridor += Math.min(sc * 0.25, 10);
      }
      const opp = engine.pawnPos[this.oppIndex];
      const oppSc = this._threatCell.get(`${opp.r},${opp.c}`);
      if (oppSc) corridor -= Math.min(oppSc * 0.2, 12);
      adjust += Math.max(-30, Math.min(30, corridor));
    }

    return score + adjust;
  }
}
