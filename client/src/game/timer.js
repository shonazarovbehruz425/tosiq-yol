// Game Timer Manager for Quoridor Match

export class GameTimer {
  constructor(options = {}) {
    this.totalTime = options.totalTime || 0; // 0 = no limit, otherwise in seconds (e.g. 180s)
    this.blitzTime = options.blitzTime || 0; // 0 = no limit, otherwise in seconds (e.g. 10s)
    
    this.playerTimes = [this.totalTime, this.totalTime]; // [P1_Time, P2_Time]
    this.blitzRemaining = this.blitzTime;
    
    this.activePlayer = 0; // 0 or 1
    this.intervalId = null;
    this.isRunning = false;
    
    this.onTick = options.onTick || (() => {});
    this.onTimeout = options.onTimeout || (() => {});
  }

  start(activePlayer = 0) {
    if (this.isRunning) return;
    
    this.activePlayer = activePlayer;
    this.isRunning = true;
    this.resetBlitz();
    
    this.intervalId = setInterval(() => {
      this.tick();
    }, 1000);
  }

  pause() {
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  switchPlayer(newPlayer) {
    this.activePlayer = newPlayer;
    this.resetBlitz();
    this.onTick(this.getState());
  }

  resetBlitz() {
    this.blitzRemaining = this.blitzTime;
  }

  tick() {
    if (!this.isRunning) return;

    let timedOut = false;

    // 1. Decrement blitz timer if active
    if (this.blitzTime > 0) {
      this.blitzRemaining--;
      if (this.blitzRemaining <= 0) {
        timedOut = true;
      }
    }

    // 2. Decrement player's match timer if active
    if (this.totalTime > 0) {
      this.playerTimes[this.activePlayer]--;
      if (this.playerTimes[this.activePlayer] <= 0) {
        timedOut = true;
      }
    }

    // Emit tick event
    this.onTick(this.getState());

    if (timedOut) {
      this.pause();
      this.onTimeout(this.activePlayer);
    }
  }

  getState() {
    return {
      playerTimes: [...this.playerTimes],
      blitzRemaining: this.blitzRemaining,
      activePlayer: this.activePlayer,
      hasTotalLimit: this.totalTime > 0,
      hasBlitzLimit: this.blitzTime > 0
    };
  }

  formatTime(seconds) {
    if (seconds <= 0) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  destroy() {
    this.pause();
  }
}
export default GameTimer;
