// trainedai.js — Adaptive AI extension on top of QuoridorAI
// This file is AUTOMATICALLY managed by the server's learning system.
// The server saves learned danger data here after every defeat.
// ai.js is NOT modified — this class simply adds a safety layer on top.

import { QuoridorAI } from './ai.js';

// ─── Trained danger data (auto-updated by server via /trainedai.js) ──────────
// dangerWalls: walls the AI played that historically led to losses
// dangerPaths: pawn positions where the AI was historically losing
// These are updated LIVE from the server — no rebuild needed.
export let TRAINED_DANGER_WALLS = [];
export let TRAINED_DANGER_PATHS = [];
export let TRAINED_META = { totalPatterns: 0, lastUpdated: null };

let _dataLoaded = false;

/**
 * Load the latest trained data from the server.
 * Primary: dynamic import() of /trainedai.js  (server-generated JS file)
 * Fallback: fetch /api/bot-patterns JSON endpoint
 *
 * The server writes a fresh trainedai.js every time the AI is defeated.
 */
export async function loadTrainedData(difficulty) {
  // ── Primary: load the JS file the server generates ──
  try {
    // Add timestamp to bust cache — always get the freshest data
    const mod = await import(/* @vite-ignore */ `/trainedai.js?t=${Date.now()}`);
    if (mod.TRAINED_DANGER_WALLS) TRAINED_DANGER_WALLS = mod.TRAINED_DANGER_WALLS;
    if (mod.TRAINED_DANGER_PATHS) TRAINED_DANGER_PATHS = mod.TRAINED_DANGER_PATHS;
    if (mod.TRAINED_META)         TRAINED_META         = mod.TRAINED_META;
    _dataLoaded = true;
    return true;
  } catch { /* dynamic import may fail in some environments — use JSON fallback */ }

  // ── Fallback: JSON API ──
  try {
    const url = difficulty
      ? `/api/bot-patterns?difficulty=${difficulty}`
      : '/api/bot-patterns';
    const res = await fetch(url);
    if (!res.ok) return false;
    const data = await res.json();
    if (data.dangerWalls) TRAINED_DANGER_WALLS = data.dangerWalls;
    if (data.dangerPaths) TRAINED_DANGER_PATHS = data.dangerPaths;
    TRAINED_META = {
      totalPatterns: (data.stats && data.stats.playerWins) || 0,
      lastUpdated: new Date().toISOString()
    };
    _dataLoaded = true;
    return true;
  } catch {
    return false;
  }
}

// ─── TrainedAI class ──────────────────────────────────────────────────────────
/**
 * TrainedAI extends QuoridorAI without changing any of its core logic.
 *
 * It adds ONE extra layer:
 *   1. Walls that historically appeared in losing games are EXCLUDED
 *      from the candidate list (if their danger score is high enough).
 *   2. Board positions that historically led to losses are penalised
 *      in the evaluation score.
 *
 * When no patterns have been collected yet, TrainedAI behaves exactly
 * like QuoridorAI — zero overhead, zero regression.
 */
export class TrainedAI extends QuoridorAI {
  constructor(playerIndex) {
    super(playerIndex);
    // Local danger maps built from TRAINED_DANGER_WALLS/PATHS
    this._dangerWalls = new Map(); // "r,c,wallType" -> score
    this._dangerPaths = new Map(); // "r,c" -> score
  }

  /**
   * Apply the globally loaded training data into this instance.
   * Call this after loadTrainedData() has been awaited.
   */
  applyTraining(dangerWalls, dangerPaths) {
    const walls = dangerWalls || TRAINED_DANGER_WALLS;
    const paths  = dangerPaths || TRAINED_DANGER_PATHS;

    this._dangerWalls = new Map();
    for (const { r, c, wallType, score } of walls) {
      this._dangerWalls.set(`${r},${c},${wallType}`, score);
    }
    this._dangerPaths = new Map();
    for (const { r, c, score } of paths) {
      this._dangerPaths.set(`${r},${c}`, score);
    }
  }

  // ── Override generateCandidates ───────────────────────────────────────────
  // Identical to super() except high-danger walls are silently dropped.
  // This does NOT touch the core minimax / evaluation logic.
  generateCandidates(engine) {
    const base = super.generateCandidates(engine);

    if (this._dangerWalls.size === 0) return base; // no training yet → unchanged

    const filtered = [];
    for (const c of base) {
      if (c.type !== 'wall') {
        filtered.push(c);
        continue;
      }
      const score = this._dangerWalls.get(`${c.r},${c.c},${c.wallType}`) || 0;
      // Threshold 60: only exclude walls that appeared in MANY losing games
      if (score >= 60) continue; // learned to avoid this wall
      filtered.push({ ...c, dangerScore: score });
    }
    return filtered;
  }

  // ── Override evaluateState ────────────────────────────────────────────────
  // Calls the original evaluation and adds a danger penalty on top.
  evaluateState(engine) {
    // Full original evaluation — no changes to that logic
    let score = super.evaluateState(engine);

    if (this._dangerPaths.size === 0 && this._dangerWalls.size === 0) {
      return score; // no training yet → identical to QuoridorAI
    }

    // Penalty 1: bot is in a position it has historically lost from
    const myPos = engine.pawnPos[this.playerIndex];
    const posPenalty = this._dangerPaths.get(`${myPos.r},${myPos.c}`) || 0;
    if (posPenalty > 0) score -= Math.min(posPenalty * 1.5, 120);

    // Penalty 2: bot has placed a wall that appeared in previous losses
    for (const w of engine.walls) {
      if (w.player === this.playerIndex) {
        const wallPenalty = this._dangerWalls.get(`${w.r},${w.c},${w.type}`) || 0;
        if (wallPenalty > 0) score -= Math.min(wallPenalty, 80);
      }
    }

    return score;
  }
}
