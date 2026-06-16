import { t } from '../core/i18n.js';
import { haptic, getInitData, isTelegram } from '../core/telegram.js';
import { BoardRenderer } from '../game/board.js';
import { ReplayManager } from '../game/replay.js';
import { ReplayRecorder } from '../game/replay-recorder.js';
import { Toast } from '../components/toast.js';

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
    this.exportSpeed = 1.5;   // download speed multiplier
    this.recording = false;

    this.onAutoplayStep = this.onAutoplayStep.bind(this);
  }

  playIcon() {
    return `<svg viewBox="0 0 24 24" fill="currentColor" style="width:16px;height:16px;vertical-align:-2px;margin-right:5px;"><path d="M7 5v14l12-7z"/></svg>${t('play')}`;
  }
  pauseIcon() {
    return `<svg viewBox="0 0 24 24" fill="currentColor" style="width:16px;height:16px;vertical-align:-2px;margin-right:5px;"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>${t('pause')}`;
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
          <button class="game-logo-btn" id="download-btn" title="${t('downloadVideo')}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px;vertical-align:-3px;">
              <path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/>
            </svg>
          </button>
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
              <svg viewBox="0 0 24 24" fill="currentColor" style="width:16px;height:16px;vertical-align:-2px;margin-right:5px;"><path d="M11 6 4 12l7 6V6zM19 6l-7 6 7 6V6z"/></svg>
              ${t('stepBackward')}
            </button>
            <button class="btn btn-primary" id="play-pause-btn" style="flex: 1.5; padding: 12px;">
              <svg viewBox="0 0 24 24" fill="currentColor" style="width:16px;height:16px;vertical-align:-2px;margin-right:5px;"><path d="M7 5v14l12-7z"/></svg>
              ${t('play')}
            </button>
            <button class="btn btn-secondary" id="step-forward-btn" style="flex: 1; padding: 12px;">
              ${t('stepForward')}
              <svg viewBox="0 0 24 24" fill="currentColor" style="width:16px;height:16px;vertical-align:-2px;margin-left:5px;"><path d="M13 6l7 6-7 6V6zM5 6l7 6-7 6V6z"/></svg>
            </button>
          </div>

          <!-- Export speed -->
          <div class="replay-speed-row">
            <span class="replay-speed-label">${t('exportSpeed')}</span>
            <div class="btn-group" id="speed-selector">
              <button class="btn-segment" data-speed="1.5">1.5x</button>
              <button class="btn-segment" data-speed="2">2x</button>
              <button class="btn-segment" data-speed="2.5">2.5x</button>
              <button class="btn-segment" data-speed="3">3x</button>
            </div>
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
        playPauseBtn.innerHTML = this.playIcon();
      } else {
        playPauseBtn.innerHTML = this.pauseIcon();
        this.replay.startAutoplay(1000, this.onAutoplayStep);
      }
    });

    stepBackBtn.addEventListener('click', () => {
      haptic.impact('light');
      this.replay.stopAutoplay();
      playPauseBtn.innerHTML = this.playIcon();
      
      this.replay.stepBackward();
      this.syncUI();
    });

    stepForwardBtn.addEventListener('click', () => {
      haptic.impact('light');
      this.replay.stopAutoplay();
      playPauseBtn.innerHTML = this.playIcon();
      
      this.replay.stepForward();
      this.syncUI();
    });

    backBtn.addEventListener('click', () => {
      haptic.impact('light');
      this.replay.stopAutoplay();
      // If we came from a result screen, return to it; otherwise normal back.
      if (this.params && this.params.resultParams) {
        this.router.navigate('result', this.params.resultParams);
      } else {
        this.router.back();
      }
    });

    // Export-speed selector (default highlighted)
    const speedSel = document.getElementById('speed-selector');
    const setSpeedActive = () => {
      speedSel?.querySelectorAll('.btn-segment').forEach(b => {
        b.classList.toggle('active', parseFloat(b.dataset.speed) === this.exportSpeed);
      });
    };
    setSpeedActive();
    speedSel?.querySelectorAll('.btn-segment').forEach(btn => {
      btn.addEventListener('click', () => {
        this.exportSpeed = parseFloat(btn.dataset.speed);
        haptic.selection();
        setSpeedActive();
      });
    });

    // Download (record the game to a video file)
    const downloadBtn = document.getElementById('download-btn');
    downloadBtn?.addEventListener('click', () => {
      haptic.impact('medium');
      this.downloadVideo();
    });

    // Draw initial state
    this.syncUI();
  }

  // Record the game to a .webm video and trigger a download.
  async downloadVideo() {
    if (this.recording) return;
    if (!this.moveHistory.length) {
      Toast.info(t('noMovesToExport'));
      return;
    }
    if (!ReplayRecorder.isSupported()) {
      Toast.error(t('exportUnsupported'));
      return;
    }

    this.recording = true;
    this.replay.stopAutoplay();
    const overlay = this.showRecordingOverlay();

    try {
      const recorder = new ReplayRecorder({
        boardSize: this.boardSize,
        initialWalls: this.initialWalls,
        moveHistory: this.moveHistory,
        mode: this.mode,
        size: 1080
      });

      const blob = await recorder.record({
        speed: this.exportSpeed,
        onProgress: (step, total) => {
          const pct = total > 0 ? Math.round((step / total) * 100) : 0;
          const bar = overlay.querySelector('#rec-bar');
          const txt = overlay.querySelector('#rec-pct');
          if (bar) bar.style.width = `${pct}%`;
          if (txt) txt.innerText = `${pct}%`;
        }
      });

      // Inside Telegram: send the video straight to the user's chat via the bot
      // (downloading a file in the Mini App WebView is unreliable). Outside
      // Telegram (browser testing): fall back to a normal file download.
      let sentToChat = false;
      if (isTelegram()) {
        // Show an "uploading / sending" state.
        const titleEl = overlay.querySelector('.modal-title');
        const hintEl = overlay.querySelector('.modal-desc');
        if (titleEl) titleEl.innerText = t('sendingToChat');
        if (hintEl) hintEl.innerText = t('sendingToChatHint');

        sentToChat = await this.sendReplayToBot(blob);
      }

      if (sentToChat) {
        haptic.notification('success');
        Toast.success(t('videoSentToChat'));
      } else {
        // Browser fallback (or send failed): trigger a download.
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `wrong-way-replay-${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
        haptic.notification('success');
        Toast.success(t('videoSaved'));
      }
    } catch (e) {
      haptic.notification('error');
      Toast.error(t('exportFailed'));
    } finally {
      this.recording = false;
      overlay.remove();
    }
  }

  // Upload the recorded replay to the server, which forwards it to the user's
  // Telegram chat via the bot. Returns true on success.
  async sendReplayToBot(blob) {
    try {
      const loc = window.location;
      const isViteDev = loc.port === '5173';
      const base = isViteDev ? `${loc.protocol}//${loc.hostname}:3000` : '';
      const caption = encodeURIComponent(t('replayCaption'));
      const res = await fetch(`${base}/api/replay/upload?caption=${caption}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'video/webm',
          'Authorization': `Bearer ${getInitData() || ''}`
        },
        body: blob
      });
      const data = await res.json().catch(() => null);
      return !!(data && data.ok);
    } catch (e) {
      return false;
    }
  }

  showRecordingOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'rec-overlay';
    overlay.innerHTML = `
      <div class="modal-card" style="max-width: 320px; text-align: center;">
        <div class="loader" style="width: 46px; height: 46px; margin: 4px auto 14px;"></div>
        <h3 class="modal-title">${t('recordingVideo')}</h3>
        <p class="modal-desc" style="margin-bottom: 14px;">${t('recordingHint')}</p>
        <div style="width: 100%; height: 8px; background: rgba(255,255,255,0.08); border-radius: 4px; overflow: hidden;">
          <div id="rec-bar" style="width: 0%; height: 100%; background: var(--primary-gradient); transition: width 0.2s ease;"></div>
        </div>
        <div id="rec-pct" style="margin-top: 8px; font-weight: 700; color: var(--text-secondary);">0%</div>
      </div>
    `;
    document.body.appendChild(overlay);
    return overlay;
  }

  onAutoplayStep(state) {
    haptic.impact('light');
    this.syncUI();
    
    if (state.currentStep === state.totalSteps) {
      const playPauseBtn = document.getElementById('play-pause-btn');
      if (playPauseBtn) playPauseBtn.innerHTML = this.playIcon();
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

    // Refresh Board DOM elements.
    // ReplayManager rebuilds a fresh engine on every step, so re-point the
    // renderer to the current engine before redrawing (otherwise it shows the
    // stale initial state and pawns never move).
    this.boardRenderer.engine = this.replay.engine;
    this.boardRenderer.updatePawns();
    this.boardRenderer.drawWalls();
  }

  destroy() {
    this.replay.destroy();
    document.getElementById('rec-overlay')?.remove();
  }
}
export default ReplayScreen;
