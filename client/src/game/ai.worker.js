// Web Worker that runs the (potentially multi-second) bot search OFF the main
// thread, so the UI stays fully responsive while the bot is "thinking" — chat,
// reactions and animations keep working during the bot's turn.
import { QuoridorEngine } from './logic.js';
import { QuoridorAI } from './ai.js';

let cachedPatterns = null;
let cachedDangerWalls = null;
let cachedDangerPaths = null;

self.onmessage = (e) => {
  const { state, difficulty, botSide, patterns, dangerWalls, dangerPaths } = e.data || {};

  // Cache adaptive data for reuse
  if (patterns !== undefined) cachedPatterns = patterns;
  if (dangerWalls !== undefined) cachedDangerWalls = dangerWalls;
  if (dangerPaths !== undefined) cachedDangerPaths = dangerPaths;

  try {
    const engine = new QuoridorEngine(state.boardSize, state.wallsCount, state.mode, {
      chaos: state.chaos,
      seed: state.seed
    });
    // Restore the live position.
    engine.pawnPos = state.pawnPos.map(p => ({ ...p }));
    engine.walls = state.walls.map(w => ({ ...w }));
    engine.playerWallsLeft = [...state.playerWallsLeft];
    engine.currentPlayer = state.currentPlayer;
    engine.winner = typeof state.winner === 'number' ? state.winner : -1;
    if (state.powerups) engine.powerups = state.powerups;
    if (state.ghostCharges) engine.ghostCharges = state.ghostCharges;

    const ai = new QuoridorAI(botSide);
    // Apply danger maps first (server pre-computed, fastest)
    if (cachedDangerWalls || cachedDangerPaths) {
      ai.setDangerMaps(cachedDangerWalls, cachedDangerPaths);
    }
    // Then apply raw patterns (builds on top of danger maps)
    if (cachedPatterns) ai.setAdaptivePatterns(cachedPatterns);
    const move = ai.getMove(engine, difficulty);
    self.postMessage({ ok: true, move });
  } catch (err) {
    self.postMessage({ ok: false, error: err && err.message });
  }
};
