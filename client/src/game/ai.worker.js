// Web Worker that runs the (potentially multi-second) bot search OFF the main
// thread, so the UI stays fully responsive while the bot is "thinking" — chat,
// reactions and animations keep working during the bot's turn.
import { QuoridorEngine } from './logic.js';
import { QuoridorAI } from './ai.js';

self.onmessage = (e) => {
  const { state, difficulty, botSide } = e.data || {};
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
    const move = ai.getMove(engine, difficulty);
    self.postMessage({ ok: true, move });
  } catch (err) {
    self.postMessage({ ok: false, error: err && err.message });
  }
};
