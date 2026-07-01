// Web Worker that runs the (potentially multi-second) bot search OFF the main
// thread so the UI stays responsive during bot thinking.
import { QuoridorEngine } from './logic.js';
import { TrainedAI, loadTrainedData } from './trainedai.js';

// Training data is loaded ONCE in the background when the worker starts.
// _loadPromise resolves before the first move is calculated.
let _trainingData = null;
let _loadPromise = null;

function startLoadingTraining(difficulty) {
  // Only load once per difficulty
  _loadPromise = loadTrainedData(difficulty).then(data => {
    _trainingData = data;
    _loadPromise = null;
  }).catch(() => {
    _loadPromise = null;
  });
}

// ── Main message handler ─────────────────────────────────────────────────────
// NOTE: onmessage is NOT async — async onmessage causes race conditions when
// multiple moves arrive before the first one finishes.
self.onmessage = (e) => {
  const { state, difficulty, botSide } = e.data || {};

  // Kick off training data load if not already started
  if (_loadPromise === null && _trainingData === null) {
    startLoadingTraining(difficulty);
  }

  const runAI = () => {
    try {
      const engine = new QuoridorEngine(
        state.boardSize,
        state.wallsCount,
        state.mode,
        { chaos: state.chaos, seed: state.seed }
      );
      engine.pawnPos         = state.pawnPos.map(p => ({ ...p }));
      engine.walls           = state.walls.map(w => ({ ...w }));
      engine.playerWallsLeft = [...state.playerWallsLeft];
      engine.currentPlayer   = state.currentPlayer;
      engine.winner          = typeof state.winner === 'number' ? state.winner : -1;
      if (state.powerups)     engine.powerups     = state.powerups;
      if (state.ghostCharges) engine.ghostCharges  = state.ghostCharges;

      // Use TrainedAI — identical to QuoridorAI when no training data exists
      const ai = new TrainedAI(botSide);
      if (_trainingData) {
        ai.applyTraining(_trainingData.dangerWalls, _trainingData.dangerPaths, _trainingData.patterns);
      }

      const move = ai.getMove(engine, difficulty);
      self.postMessage({ ok: true, move });
    } catch (err) {
      self.postMessage({ ok: false, error: err && err.message });
    }
  };

  if (_loadPromise) {
    // First move only: wait for training data, then run
    _loadPromise.then(runAI).catch(runAI);
  } else {
    // All subsequent moves: run immediately (no waiting)
    runAI();
  }
};
