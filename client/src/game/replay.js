import { QuoridorEngine } from './logic.js';

export class ReplayManager {
  constructor(boardSize, initialWalls, moveHistory, mode = 'duel') {
    this.boardSize = boardSize;
    this.initialWalls = initialWalls;
    this.moveHistory = moveHistory; // Array of moves: { player, type: 'move'|'wall', r, c, wallType }
    this.mode = mode;
    
    this.currentStep = 0;
    this.engine = new QuoridorEngine(boardSize, initialWalls, mode);
    this.playbackInterval = null;
    this.isAutoplay = false;
  }

  // Go to a specific step
  goToStep(stepIndex) {
    if (stepIndex < 0) stepIndex = 0;
    if (stepIndex > this.moveHistory.length) stepIndex = this.moveHistory.length;
    
    this.currentStep = stepIndex;
    
    // Rebuild engine state from step 0
    this.engine = new QuoridorEngine(this.boardSize, this.initialWalls, this.mode);
    
    for (let i = 0; i < this.currentStep; i++) {
      const move = this.moveHistory[i];
      if (move.type === 'move') {
        this.engine.movePawn(move.r, move.c, move.player);
      } else {
        this.engine.placeWall(move.r, move.c, move.wallType, move.player);
      }
    }
    
    return this.engine;
  }

  // Next step
  stepForward() {
    if (this.currentStep < this.moveHistory.length) {
      this.goToStep(this.currentStep + 1);
      return true;
    }
    return false;
  }

  // Prev step
  stepBackward() {
    if (this.currentStep > 0) {
      this.goToStep(this.currentStep - 1);
      return true;
    }
    return false;
  }

  // Autoplay
  startAutoplay(delay = 1000, onStepCallback = () => {}) {
    if (this.playbackInterval) return;
    this.isAutoplay = true;
    
    this.playbackInterval = setInterval(() => {
      const moved = this.stepForward();
      onStepCallback(this.getState());
      
      if (!moved) {
        this.stopAutoplay();
      }
    }, delay);
  }

  stopAutoplay() {
    this.isAutoplay = false;
    if (this.playbackInterval) {
      clearInterval(this.playbackInterval);
      this.playbackInterval = null;
    }
  }

  getState() {
    return {
      currentStep: this.currentStep,
      totalSteps: this.moveHistory.length,
      engine: this.engine,
      isAutoplay: this.isAutoplay,
      currentMove: this.currentStep > 0 ? this.moveHistory[this.currentStep - 1] : null
    };
  }

  destroy() {
    this.stopAutoplay();
  }
}
