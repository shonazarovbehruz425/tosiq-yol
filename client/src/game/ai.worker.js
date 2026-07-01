// Web Worker that runs the (potentially multi-second) bot search OFF the main
// thread, so the UI stays fully responsive while the bot is "thinking" — chat,
// reactions and animations keep working during the bot's turn.
import { QuoridorEngine } from './logic.js';
import { TrainedAI, loadTrainedData, TRAINED_DANGER_WALLS, TRAINED_DANGER_PATHS } from './trainedai.js';

// Cache for the current game session
let _difficulty = null;
let _trainingLoaded = false;
let _cachedDangerWalls = null;
let _cachedDangerPaths = null;

self.onmessage = async (e) => {
  const { state, difficulty, botSide, dangerWalls, dangerPaths } = e.data || {};

  // Accept pre-fetched danger maps from the main thread
  if (dangerWalls !== undefined) _cachedDangerWalls = dangerWalls;
  if (dangerPaths !== undefined) _cachedDangerPaths = dangerPaths;

  // Load training data on first move of a new difficulty
  if (!_trainingLoaded || _difficulty !== difficulty) {
    _difficulty = difficulty;
    const ok = await loadTrainedData(difficulty);
    _trainingLoaded = ok;
    if (ok) {
      _cachedDangerWalls = TRAINED_DANGER_WALLS;
      _cachedDangerPaths = TRAINED_DANGER_PATHS;
    }
  }

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

    // Use TrainedAI — identical to QuoridorAI when no training data exists
    const ai = new TrainedAI(botSide);
    if (_cachedDangerWalls || _cachedDangerPaths) {
      ai.applyTraining(_cachedDangerWalls, _cachedDangerPaths);
    }

    const move = ai.getMove(engine, difficulty);
    self.postMessage({ ok: true, move });
  } catch (err) {
    self.postMessage({ ok: false, error: err && err.message });
  }
};
