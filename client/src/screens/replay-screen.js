import { t } from '../core/i18n.js';
import { haptic } from '../core/telegram.js';
import { BoardRenderer } from '../game/board.js';
import { ReplayManager } from '../game/replay.js';

export class ReplayScreen {
  constructor(router, params) {
    this.router = router;
    // Contains: { moveHistory, boardSize, initialWalls }
    this.params = params;
    
    this.moveHistory = params.moveHistory || [];
    this.boardSize = params.boardSize || 9;
    this.initialWalls = params.initialWalls || 10;
    this.mode = params.mode || 'duel';
    
    this.replay = new ReplayManager(this.boardSize, this.initialWalls, this.moveHistory, this.mode);
    this.boardRenderer = null;
    
    this.onAutoplayStep = this.onAutoplayStep.bind(this);
  }

  render() {
    const total = this.moveHistory.length;
    const current = this.replay.currentStep;
    
    return `
      <div class="game-container screen-enter" style="gap: 10px;">
        <!-- Header -->
        <div class="game-header">
          <button class="game-logo-btn" id="back-btn">← ${t('back')}</button>
          <span style="font-weight: 700; font-size: 15px;" id="replay-title-step">
            ${t('step', { current, total })}
          </span>
        </div>

        <!-- Progress Bar -->
        <div style="width: 100%; height: 6px; background-color: rgba(255,255,255,0.05); border-radius: 3px; overflow: hidden; margin-top: 4px;">
          <div id="replay-progress-bar" style="width: 0%; height: 100%; background: var(--primary-gradient); transition: width 0.15s ease;"></div>
        </div>

        <!-- Description Banner -->
        <div class="turn-banner" id="replay-status-banner" style="font-size: 13px; font-weight: 600; padding: 6px; color: var(--text-secondary);">
          O'yin boshlanishi
        </div>

        <!-- Board -->
        <div class="board-wrapper" id="replay-board-container">
          <!-- Board grid -->
        </div>

        <!-- Replay Controls -->
        <div style="display: flex; flex-direction: column; gap: 12px; margin-top: auto;">
          <div style="display: flex; gap: 12px; justify-content: center;">
            <button class="btn btn-secondary" id="step-back-btn" style="flex: 1; padding: 12px;">
              ⏪ ${t('stepBackward')}
            </button>
            <button class="btn btn-primary" id="play-pause-btn" style="flex: 1.5; padding: 12px;">
              ▶ ${t('play')}
            </button>
            <button class="btn btn-secondary" id="step-forward-btn" style="flex: 1; padding: 12px;">
              ⏩ ${t('stepForward')}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  afterRender() {
    const container = document.getElementById('replay-board-container');
    
    // Create board renderer (readonly, we don't bind gameplay click events)
    this.boardRenderer = new BoardRenderer(container, this.replay.engine, {
      onMovePawn: () => {},
      onPlaceWall: () => {}
    });

    // Disable possible moves highlighting during replay
    this.boardRenderer.updateValidMoves(false);

    // Bind Controls
    const playPauseBtn = document.getElementById('play-pause-btn');
    const stepBackBtn = document.getElementById('step-back-btn');
    const stepForwardBtn = document.getElementById('step-forward-btn');
    const backBtn = document.getElementById('back-btn');

    playPauseBtn.addEventListener('click', () => {
      haptic.impact('medium');
      if (this.replay.isAutoplay) {
        this.replay.stopAutoplay();
        playPauseBtn.innerHTML = `▶ ${t('play')}`;
      } else {
        playPauseBtn.innerHTML = `⏸ Pause`;
        this.replay.startAutoplay(1000, this.onAutoplayStep);
      }
    });

    stepBackBtn.addEventListener('click', () => {
      haptic.impact('light');
      this.replay.stopAutoplay();
      playPauseBtn.innerHTML = `▶ ${t('play')}`;
      
      this.replay.stepBackward();
      this.syncUI();
    });

    stepForwardBtn.addEventListener('click', () => {
      haptic.impact('light');
      this.replay.stopAutoplay();
      playPauseBtn.innerHTML = `▶ ${t('play')}`;
      
      this.replay.stepForward();
      this.syncUI();
    });

    backBtn.addEventListener('click', () => {
      haptic.impact('light');
      this.replay.stopAutoplay();
      this.router.back();
    });

    // Draw initial state
    this.syncUI();
  }

  onAutoplayStep(state) {
    haptic.impact('light');
    this.syncUI();
    
    if (state.currentStep === state.totalSteps) {
      const playPauseBtn = document.getElementById('play-pause-btn');
      if (playPauseBtn) playPauseBtn.innerHTML = `▶ ${t('play')}`;
    }
  }

  // Update progress bar, title steps, text descriptions and board
  syncUI() {
    const state = this.replay.getState();
    
    // Update step text
    const titleStep = document.getElementById('replay-title-step');
    if (titleStep) titleStep.innerText = t('step', { current: state.currentStep, total: state.totalSteps });
    
    // Update progress bar width
    const progress = document.getElementById('replay-progress-bar');
    if (progress) {
      const pct = state.totalSteps > 0 ? (state.currentStep / state.totalSteps) * 100 : 0;
      progress.style.width = `${pct}%`;
    }

    // Update description banner
    const banner = document.getElementById('replay-status-banner');
    if (banner) {
      if (state.currentStep === 0) {
        banner.innerText = "O'yin boshlanishi";
        banner.style.color = 'var(--text-secondary)';
      } else {
        const move = state.currentMove;
        const colorName = move.player === 0 ? "Qizil" : "Ko'k";
        const sideColor = move.player === 0 ? 'var(--accent-red)' : 'var(--accent-blue)';
        
        if (move.type === 'move') {
          banner.innerHTML = `<span style="color: ${sideColor};">● ${colorName}</span>: shoshqa siljitildi (${move.r + 1}, ${move.c + 1})`;
        } else {
          const wDir = move.wallType === 'H' ? "gorizontal" : "vertikal";
          banner.innerHTML = `<span style="color: ${sideColor};">● ${colorName}</span>: to'siq qo'yildi (${move.r + 1}, ${move.c + 1}, ${wDir})`;
        }
      }
    }

    // Refresh Board DOM elements
    this.boardRenderer.updatePawns();
    this.boardRenderer.drawWalls();
  }

  destroy() {
    this.replay.destroy();
  }
}
export default ReplayScreen;
