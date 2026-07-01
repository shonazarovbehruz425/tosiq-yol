// trainedai.js — WrongWay AI learning layer
// ai.js ga TEGILMAYDI. Faqat uning ustiga qo'shimcha qatlam.
//
// Qanday ishlaydi:
//   1. Server bot-result qabul qilganda dangerWalls/dangerPaths hisoblab,
//      server/trainedai.js faylini yozadi va Telegram kanalga yuboradi.
//   2. Keyingi o'yinda TrainedAI bu ma'lumotni serverdan yuklaydi.
//   3. Yuklangan ma'lumot QuoridorAI ning original avoidMoves mexanizmiga
//      beriladi — shu tarzda asosiy AI o'zgarishsiz qoladi.

import { QuoridorAI } from './ai.js';

// ─── Training data loader ────────────────────────────────────────────────────

/**
 * Fetch training data from the server.
 * Returns { dangerWalls, dangerPaths } or null on failure.
 * Tries the precomputed JSON API — no dynamic import, always reliable.
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
 * TrainedAI is a thin subclass of QuoridorAI.
 * It does NOT override generateCandidates — it uses the parent's proven
 * avoidMoves mechanism instead, which is already wired into the search.
 * It only adds a lightweight position penalty on top of the base evaluation.
 *
 * Without training data: IDENTICAL to QuoridorAI — zero overhead.
 * With training data: avoids learned bad walls + penalises losing positions.
 */
export class TrainedAI extends QuoridorAI {
  /**
   * Apply server-computed danger data to this AI instance.
   * Call this once before getMove().
   *
   * @param {Array} dangerWalls  [{r, c, wallType, score}]
   * @param {Array} dangerPaths  [{r, c, score}]
   */
  applyTraining(dangerWalls, dangerPaths) {
    // ── Wall avoidance ──────────────────────────────────────────────────────
    // Feed high-danger walls into the parent's avoidMoves Set.
    // QuoridorAI already knows how to handle avoided moves in its search —
    // no need to duplicate that logic here.
    this.avoidMoves = new Set();
    const WALL_THRESHOLD = 25; // score above this → mark as avoided
    for (const { r, c, wallType, score } of (dangerWalls || [])) {
      if (score >= WALL_THRESHOLD) {
        this.avoidMoves.add(`${r},${c},${wallType}`);
      }
    }

    // ── Position penalty map ─────────────────────────────────────────────────
    this._dangerPaths = new Map();
    for (const { r, c, score } of (dangerPaths || [])) {
      if (score > 0) this._dangerPaths.set(`${r},${c}`, score);
    }
  }

  // ── Evaluation override ───────────────────────────────────────────────────
  // Calls the FULL original evaluation, then adds a small learned penalty.
  // This is safe because super.evaluateState() is self-contained.
  evaluateState(engine) {
    // Run the complete original evaluation (minimax + advanced heuristics)
    let score = super.evaluateState(engine);

    // Add position penalty from training data (lightweight — max -60 pts)
    if (this._dangerPaths && this._dangerPaths.size > 0) {
      const pos = engine.pawnPos[this.playerIndex];
      const penalty = this._dangerPaths.get(`${pos.r},${pos.c}`) || 0;
      if (penalty > 0) score -= Math.min(penalty * 1.2, 60);
    }

    return score;
  }
}
