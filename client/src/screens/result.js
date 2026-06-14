import { t } from '../core/i18n.js';
import { socket } from '../core/websocket.js';
import { haptic } from '../core/telegram.js';
import { Confetti } from '../game/animations.js';
import { Toast } from '../components/toast.js';

export class ResultScreen {
  constructor(router, params) {
    this.router = router;
    // Contains: { result: 'win'|'lose', vs, roomCode, boardSize, initialWalls, moveHistory, playerSide, opponent }
    this.params = params;
    
    this.result = params.result;
    this.vs = params.vs;
    
    this.rematchRequested = false;
    this.opponentRematchRequested = false;

    this.onRematchRequested = this.onRematchRequested.bind(this);
    this.onRematchAccepted = this.onRematchAccepted.bind(this);
    this.onOpponentLeft = this.onOpponentLeft.bind(this);
  }

  render() {
    const isWin = this.result === 'win';
    const isBot = this.vs === 'bot';
    
    let statusText = '';
    if (this.rematchRequested && this.opponentRematchRequested) {
      statusText = `<p class="rematch-status go">${t('rematchStarting')}</p>`;
    } else if (this.rematchRequested) {
      statusText = `<p class="rematch-status wait">${t('waitingOpponentRematch')}</p>`;
    } else if (this.opponentRematchRequested) {
      statusText = `<p class="rematch-status invite">${t('opponentWantsRematch')}</p>`;
    }

    return `
      <div class="screen screen-enter" id="result-page-container" style="justify-content: center; align-items: center; text-align: center;">
        <div class="result-card ${isWin ? 'result-win' : 'result-lose'}">

          <div class="result-icon-halo">
            <div class="result-icon">
              ${isWin ? `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z"/>
                  <path d="M7 5H4v2a3 3 0 0 0 3 3M17 5h3v2a3 3 0 0 1-3 3"/>
                </svg>
              ` : `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="9"/>
                  <path d="M8 15.5a4.5 4.5 0 0 1 8 0"/>
                  <path d="M8.5 9h.01M15.5 9h.01"/>
                </svg>
              `}
            </div>
          </div>

          <h1 class="result-title">
            ${isWin ? t('victory') : t('defeat')}
          </h1>

          <p class="result-desc">
            ${isWin ? t('victoryDesc') : t('defeatDesc')}
          </p>

          <div class="result-stat">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 19V10M10 19V5M16 19v-7M20 19H3"/>
            </svg>
            ${t('movesCount', { count: this.params.moveHistory.length })}
          </div>

          ${statusText}

          <div class="menu-actions result-actions">
            <button class="menu-pill menu-pill-primary" id="rematch-btn">
              <span class="menu-pill-icon icon-rematch">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 12a9 9 0 0 1 15-6.7L21 8"/>
                  <path d="M21 3v5h-5"/>
                  <path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
                  <path d="M3 21v-5h5"/>
                </svg>
              </span>
              <span class="menu-pill-label">${t('rematch')}</span>
            </button>

            <button class="menu-pill" id="replay-btn">
              <span class="menu-pill-icon icon-replay">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 12a9 9 0 1 0 9-9"/>
                  <path d="M3 4v5h5"/>
                  <path d="M10 9l5 3-5 3z" fill="currentColor" stroke="none"/>
                </svg>
              </span>
              <span class="menu-pill-label">${t('replay')}</span>
            </button>

            <button class="menu-pill" id="menu-btn">
              <span class="menu-pill-icon icon-home">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 11l9-8 9 8"/>
                  <path d="M5 10v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9"/>
                  <path d="M9 21v-6h6v6"/>
                </svg>
              </span>
              <span class="menu-pill-label">${t('menu')}</span>
            </button>
          </div>

        </div>
      </div>
    `;
  }

  afterRender() {
    haptic.notification(this.result === 'win' ? 'success' : 'error');

    // Confetti on win
    if (this.result === 'win') {
      Confetti.spawn(document.getElementById('result-page-container'));
    }

    // Rematch button
    const rematchBtn = document.getElementById('rematch-btn');
    rematchBtn.addEventListener('click', () => {
      haptic.impact('medium');
      this.handleRematchClick();
    });

    // Replay button
    const replayBtn = document.getElementById('replay-btn');
    replayBtn.addEventListener('click', () => {
      haptic.impact('medium');
      this.router.navigate('replay-screen', {
        moveHistory: this.params.moveHistory,
        boardSize: this.params.boardSize,
        initialWalls: this.params.initialWalls,
        mode: this.params.mode,
        // Snapshot so the replay screen can return to this result screen
        resultParams: this.params
      });
    });

    // Menu button
    const menuBtn = document.getElementById('menu-btn');
    menuBtn.addEventListener('click', () => {
      haptic.impact('light');
      if (this.vs !== 'bot') {
        socket.send('leave_room', { roomCode: this.params.roomCode });
      }
      this.router.navigate('home');
    });

    // Sockets if online
    if (this.vs !== 'bot') {
      socket.on('opponent_requested_rematch', this.onRematchRequested);
      socket.on('rematch_accepted', this.onRematchAccepted);
      socket.on('opponent_left', this.onOpponentLeft);
    }
  }

  handleRematchClick() {
    if (this.vs === 'bot') {
      // Local bot rematch: restart game immediately
      this.router.navigate('game', {
        vs: 'bot',
        difficulty: this.params.difficulty || 'normal',
        boardSize: this.params.boardSize,
        totalTime: this.params.totalTime,
        blitzTime: this.params.blitzTime,
        wallsCount: this.params.initialWalls,
        mode: this.params.mode,
        fog: this.params.fog,
        chaos: this.params.chaos,
        seed: (Date.now() & 0x7fffffff) || 1
      });
    } else {
      // Online rematch request
      this.rematchRequested = true;
      socket.send('request_rematch', { roomCode: this.params.roomCode });
      
      // Update UI to show waiting message
      this.router.reRenderActiveScreen();
      
      // If opponent had already clicked rematch, it starts immediately
      if (this.opponentRematchRequested) {
        socket.send('accept_rematch', { roomCode: this.params.roomCode });
      }
    }
  }

  onRematchRequested() {
    this.opponentRematchRequested = true;

    if (this.rematchRequested) {
      // Both requested rematch -> accept and auto-start!
      socket.send('accept_rematch', { roomCode: this.params.roomCode });
    } else {
      // Show the incoming request prominently so the player can tap Rematch.
      haptic.notification('warning');
      Toast.info(t('opponentWantsRematch'));
      this.router.reRenderActiveScreen();
      const btn = document.getElementById('rematch-btn');
      if (btn) btn.classList.add('rematch-pulse');
    }
  }

  onRematchAccepted(data) {
    haptic.notification('success');
    
    // Restart game with swapped roles/sides for fairness!
    this.router.navigate('game', {
      vs: this.vs,
      roomCode: data.roomCode,
      playerSide: data.side, // Backend swaps sides
      boardSize: this.params.boardSize,
      totalTime: this.params.totalTime,
      blitzTime: this.params.blitzTime,
      wallsCount: this.params.initialWalls,
      mode: this.params.mode,
      fog: this.params.fog,
      chaos: this.params.chaos,
      seed: this.params.seed,
      mySkin: this.params.mySkin,
      opponentSkin: this.params.opponentSkin,
      opponent: this.params.opponent
    });
  }

  onOpponentLeft() {
    Toast.warning(t('rematchDeclined'));
    
    // Disable rematch button
    const btn = document.getElementById('rematch-btn');
    if (btn) {
      btn.disabled = true;
      btn.style.opacity = '0.5';
    }
  }

  destroy() {
    if (this.vs !== 'bot') {
      socket.off('opponent_requested_rematch', this.onRematchRequested);
      socket.off('rematch_accepted', this.onRematchAccepted);
      socket.off('opponent_left', this.onOpponentLeft);
    }
  }
}
export default ResultScreen;
