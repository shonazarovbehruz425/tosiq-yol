// trainedai.js — WrongWay AI learning layer
// ai.js ga TEGILMAYDI. Faqat uning ustiga qo'shimcha evaluation qatlam.
//
// Qanday to'g'ri ishlaydi:
//   avoidMoves.has() → priority=-100 → lekin minimax BARIBIR tekshiradi!
//   Shuning uchun biz evaluateState() da og'ir jarima beramiz.
//   Minimax endi o'sha harakatlar orqali o'tgandan so'ng past score ko'radi
//   va ularni o'zi chetlab o'tadi — AI kuchidan hech narsa ketmaydi.

import { QuoridorAI } from './ai.js';

// ─── Training data loader ────────────────────────────────────────────────────

/**
 * Fetch training data from the server.
 * Returns { dangerWalls: Map, dangerPaths: Map } or null on failure.
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

// ─── TrainedAI class ─────────────────────────────────────────────────────────

/**
 * TrainedAI extends QuoridorAI.
 *
 * MUHIM: avoidMoves mexanizmi (priority=-100) to'liq ishlaydi,
 * lekin minimax baribir o'sha harakatni tekshiradi. Shuning uchun
 * biz evaluateState() ni override qilamiz — minimax o'sha harakatdan
 * keyin past score ko'radi va o'zi tanlamaydi.
 *
 * AI KUCHI O'ZGARMAYDI:
 *   - generateCandidates() → o'zgarishsiz (override yo'q)
 *   - minimax() → o'zgarishsiz
 *   - getMove() → o'zgarishsiz
 *   - evaluateState() → faqat jarima qo'shiladi (asosiy eval to'liq ishlaydi)
 */
export class TrainedAI extends QuoridorAI {
  /**
   * Apply server-computed danger data.
   * @param {Array} dangerWalls  [{r, c, wallType, score}]
   * @param {Array} dangerPaths  [{r, c, score}]
   */
  applyTraining(dangerWalls, dangerPaths) {
    // avoidMoves → generateCandidates → orderCandidates da priority=-100
    // Bu yetarli emas, shuning uchun evaluateState da ham jarima beramiz
    this.avoidMoves = new Set();

    // dangerWalls Map: "r,c,wallType" → score
    // Score qanchalik katta bo'lsa, AI u devordan shunchalik ko'proq qochadi
    this._trainedDangerWalls = new Map();
    for (const { r, c, wallType, score } of (dangerWalls || [])) {
      const key = `${r},${c},${wallType}`;
      this._trainedDangerWalls.set(key, score);
      // Threshold 20+: avoidMoves ga ham qo'shamiz (ordering uchun)
      if (score >= 20) this.avoidMoves.add(key);
    }

    // dangerPaths Map: "r,c" → score
    this._trainedDangerPaths = new Map();
    for (const { r, c, score } of (dangerPaths || [])) {
      if (score > 0) this._trainedDangerPaths.set(`${r},${c}`, score);
    }
  }

  /**
   * Override evaluateState:
   * 1. Asosiy evaluation to'liq ishlaydi (super.evaluateState)
   * 2. Ustiga training jarimalari qo'shiladi
   *
   * Minimax bu scoreni ko'radi va avoided harakatlarni
   * o'zi tanlamaydi — AI kuchidan hech narsa ketmaydi.
   */
  evaluateState(engine) {
    // ── 1. To'liq asosiy evaluation (o'zgarishsiz) ──────────────────────────
    let score = super.evaluateState(engine);

    // ── 2. Traning jarimasi: bot o'ynagan devorlar ───────────────────────────
    // Agar hozirgi board da bot tomonidan qo'yilgan devor danger lista da
    // bo'lsa, score dan jarima ayiramiz. Minimax bu scoreni ko'radi.
    if (this._trainedDangerWalls && this._trainedDangerWalls.size > 0) {
      for (const w of engine.walls) {
        if (w.player === this.playerIndex) {
          const key = `${w.r},${w.c},${w.type}`;
          const dangerScore = this._trainedDangerWalls.get(key) || 0;
          if (dangerScore > 0) {
            // Jarima: danger score ga mutanosib, lekin chekli
            // Score 100 bo'lsa → -120 jarima (jiddiy)
            // Score 30 bo'lsa → -36 jarima (o'rtacha)
            score -= Math.min(dangerScore * 1.2, 150);
          }
        }
      }
    }

    // ── 3. Training jarimasi: bot pawn pozitsiyasi ───────────────────────────
    if (this._trainedDangerPaths && this._trainedDangerPaths.size > 0) {
      const pos = engine.pawnPos[this.playerIndex];
      const pathDanger = this._trainedDangerPaths.get(`${pos.r},${pos.c}`) || 0;
      if (pathDanger > 0) score -= Math.min(pathDanger * 0.8, 50);
    }

    return score;
  }
}
