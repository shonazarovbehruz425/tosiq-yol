import { t } from '../core/i18n.js';
import { haptic } from '../core/telegram.js';
import { socket } from '../core/websocket.js';
import { Toast } from '../components/toast.js';

export class ModeSelectScreen {
  constructor(router, params) {
    this.router = router;
    this.params = params || {}; // { vs: 'bot'|'friend'|'online', difficulty }

    // Default configuration
    this.config = {
      mode: 'duel',   // 'duel' or 'race'
      size: 9,        // 7 or 9
      timer: 300,     // 0 | 180 | 300
      blitz: 0,       // 0 | 10 | 15 | 30
      walls: 10
    };

    this.searching = false; // online matchmaking state

    this.onMatchFound = this.onMatchFound.bind(this);
  }

  // Short summary badges (e.g. "Duell · 5 min")
  summaryBadges() {
    const modeLabel = this.config.mode === 'duel' ? t('modeDuel') : t('modeRace');
    let timeLabel;
    if (this.config.timer === 0) timeLabel = t('noTimer');
    else timeLabel = `${this.config.timer / 60} min`;
    return `
      <div class="mode-badges">
        <span class="mode-badge">⚔️ ${modeLabel}</span>
        <span class="mode-badge">⏱️ ${timeLabel}</span>
        <span class="mode-badge">🚧 ${this.config.walls}</span>
      </div>
    `;
  }

  render() {
    if (this.searching) {
      return this.renderSearching();
    }

    const c = this.config;
    return `
      <div class="screen screen-enter mode-screen">
        <div class="menu-header" style="margin-top: 6px; margin-bottom: 10px;">
          <div class="logo-container" style="background: linear-gradient(135deg, #7c3aed, #4f46e5); width: 64px; height: 64px; border-radius: 18px; margin-bottom: 10px;">
            <span style="font-size: 32px;">🎯</span>
          </div>
          <h2 class="menu-title">${t('modeCardTitle')}</h2>
          <p class="menu-slogan">${t('modeCardDesc')}</p>
          ${this.summaryBadges()}
        </div>

        <!-- Game type: Duell vs Race -->
        <div class="mode-section-label">${t('fieldLabel')}</div>
        <div class="big-card-grid">
          <button class="big-card ${c.mode === 'duel' ? 'active' : ''}" data-mode="duel">
            <div class="big-card-visual visual-duel">
              <span class="bc-dot bc-dot-red"></span>
              <span class="bc-dot bc-dot-blue"></span>
            </div>
            <span class="big-card-title">${t('modeDuel')}</span>
            <span class="big-card-sub">${t('duelSub')}</span>
          </button>
          <button class="big-card ${c.mode === 'race' ? 'active' : ''}" data-mode="race">
            <div class="big-card-visual visual-race">
              <span class="bc-flag">🏁</span>
            </div>
            <span class="big-card-title">${t('modeRace')}</span>
            <span class="big-card-sub">${t('raceSub')}</span>
          </button>
        </div>
        <div class="mode-hint" id="mode-hint">${c.mode === 'duel' ? t('duelHint') : t('raceHint')}</div>

        <!-- Board size -->
        <div class="mode-section-label">${t('boardSize')}</div>
        <div class="big-card-grid">
          <button class="big-card size-card ${c.size === 7 ? 'active' : ''}" data-size="7">
            <span class="big-card-title">7 × 7</span>
            <span class="big-card-sub">${t('size7Sub')}</span>
          </button>
          <button class="big-card size-card ${c.size === 9 ? 'active' : ''}" data-size="9">
            <span class="big-card-title">9 × 9</span>
            <span class="big-card-sub">${t('size9Sub')}</span>
          </button>
        </div>

        <!-- Timer -->
        <div class="mode-section-label">${t('timerLabel')}</div>
        <div class="btn-group full" id="timer-selector">
          <button class="btn-segment ${c.timer === 0 ? 'active' : ''}" data-timer="0">${t('noTimer')}</button>
          <button class="btn-segment ${c.timer === 180 ? 'active' : ''}" data-timer="180">3 min</button>
          <button class="btn-segment ${c.timer === 300 ? 'active' : ''}" data-timer="300">5 min</button>
        </div>

        <!-- Blitz -->
        <div class="mode-section-label">${t('blitzLabel')}</div>
        <div class="btn-group full" id="blitz-selector">
          <button class="btn-segment ${c.blitz === 0 ? 'active' : ''}" data-blitz="0">${t('noBlitz')}</button>
          <button class="btn-segment ${c.blitz === 10 ? 'active' : ''}" data-blitz="10">10s</button>
          <button class="btn-segment ${c.blitz === 15 ? 'active' : ''}" data-blitz="15">15s</button>
          <button class="btn-segment ${c.blitz === 30 ? 'active' : ''}" data-blitz="30">30s</button>
        </div>

        <!-- Barricades -->
        <div class="mode-section-label">${t('barricades')}</div>
        <div class="counter-control full" style="justify-content: center;">
          <button class="counter-btn" id="walls-minus">−</button>
          <span class="counter-val" id="walls-val">${c.walls}</span>
          <button class="counter-btn" id="walls-plus">+</button>
        </div>

        <button class="btn btn-primary" id="start-game-btn" style="margin-top: 18px; padding: 16px 24px; font-size: 18px;">
          ${this.startLabel()}
        </button>

        <button class="btn btn-secondary" id="back-btn" style="margin-top: 12px; margin-bottom: 8px;">
          ${t('back')}
        </button>
      </div>
    `;
  }

  startLabel() {
    if (this.params.vs === 'online') return `🌐 ${t('findOpponent')}`;
    if (this.params.vs === 'friend') return `🔒 ${t('createPrivate')}`;
    return `🚀 ${t('startGame')}`;
  }

  renderSearching() {
    return `
      <div class="screen screen-enter" style="justify-content: center; align-items: center; text-align: center;">
        <div class="card" style="width: 100%; max-width: 340px; padding: 30px; display: flex; flex-direction: column; align-items: center; gap: 18px;">
          <div class="loader" style="width: 52px; height: 52px; border-width: 4px;"></div>
          <h2 style="margin-bottom: 0;">${t('searchingMatch')}</h2>
          ${this.summaryBadges()}
          <button class="btn btn-secondary" id="cancel-search-btn" style="margin-top: 6px; width: 100%;">
            ${t('cancel')}
          </button>
        </div>
      </div>
    `;
  }

  afterRender() {
    socket.connect();
    socket.on('match_found', this.onMatchFound);

    if (this.searching) {
      const cancelBtn = document.getElementById('cancel-search-btn');
      cancelBtn?.addEventListener('click', () => {
        haptic.impact('light');
        socket.send('cancel_search');
        this.searching = false;
        this.router.reRenderActiveScreen();
      });
      return;
    }

    // Game type cards (Duell / Race)
    document.querySelectorAll('.big-card[data-mode]').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.big-card[data-mode]').forEach(b => b.classList.remove('active'));
        card.classList.add('active');
        this.config.mode = card.dataset.mode;
        const hint = document.getElementById('mode-hint');
        if (hint) hint.innerText = this.config.mode === 'duel' ? t('duelHint') : t('raceHint');
        haptic.selection();
        this.refreshBadges();
      });
    });

    // Board size cards
    document.querySelectorAll('.big-card[data-size]').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.big-card[data-size]').forEach(b => b.classList.remove('active'));
        card.classList.add('active');
        this.config.size = parseInt(card.dataset.size);
        this.config.walls = this.config.size === 7 ? 6 : 10;
        const wv = document.getElementById('walls-val');
        if (wv) wv.innerText = this.config.walls;
        haptic.selection();
        this.refreshBadges();
      });
    });

    // Timer
    document.querySelectorAll('#timer-selector .btn-segment').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#timer-selector .btn-segment').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.config.timer = parseInt(btn.dataset.timer);
        haptic.selection();
        this.refreshBadges();
      });
    });

    // Blitz
    document.querySelectorAll('#blitz-selector .btn-segment').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#blitz-selector .btn-segment').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.config.blitz = parseInt(btn.dataset.blitz);
        haptic.selection();
      });
    });

    // Barricades
    const wallsVal = document.getElementById('walls-val');
    document.getElementById('walls-minus')?.addEventListener('click', () => {
      if (this.config.walls > 0) {
        this.config.walls--;
        wallsVal.innerText = this.config.walls;
        haptic.impact('light');
        this.refreshBadges();
      }
    });
    document.getElementById('walls-plus')?.addEventListener('click', () => {
      const maxWalls = this.config.size === 7 ? 12 : 20;
      if (this.config.walls < maxWalls) {
        this.config.walls++;
        wallsVal.innerText = this.config.walls;
        haptic.impact('light');
        this.refreshBadges();
      }
    });

    // Start
    document.getElementById('start-game-btn')?.addEventListener('click', () => {
      haptic.impact('medium');
      this.startGame();
    });

    // Back
    document.getElementById('back-btn')?.addEventListener('click', () => {
      haptic.impact('light');
      this.router.back();
    });
  }

  refreshBadges() {
    const header = document.querySelector('.menu-header .mode-badges');
    if (header) {
      header.outerHTML = this.summaryBadges();
    }
  }

  baseConfig() {
    return {
      mode: this.config.mode,
      boardSize: this.config.size,
      totalTime: this.config.timer,
      blitzTime: this.config.blitz,
      wallsCount: this.config.walls
    };
  }

  startGame() {
    const vs = this.params?.vs || 'online';
    const gameParams = {
      vs,
      difficulty: this.params?.difficulty || 'normal',
      ...this.baseConfig()
    };

    if (vs === 'bot') {
      this.router.navigate('game', gameParams);
      return;
    }

    if (vs === 'friend') {
      Toast.info(t('loading'));
      const send = () => socket.send('create_private_room', this.baseConfig());
      const onRoomCreated = (data) => {
        socket.off('room_created', onRoomCreated);
        if (data && data.roomCode) {
          this.router.navigate('friend', { isWaiting: true, roomCode: data.roomCode, gameParams });
        } else {
          Toast.error(t('error'));
        }
      };
      socket.on('room_created', onRoomCreated);
      this.whenConnected(send);
      return;
    }

    // Online: enter matchmaking and show an in-place waiting view (own screen)
    this.searching = true;
    this.router.reRenderActiveScreen();
    this.whenConnected(() => {
      socket.send('enter_matchmaking', this.baseConfig());
    });
  }

  whenConnected(fn) {
    if (socket.isConnected) {
      fn();
    } else {
      socket.connect();
      const onConnect = () => {
        socket.off('connect', onConnect);
        fn();
      };
      socket.on('connect', onConnect);
    }
  }

  onMatchFound(data) {
    haptic.notification('success');
    Toast.success(t('opponentFound'));
    this.router.navigate('game', {
      vs: 'online',
      roomCode: data.roomCode,
      playerSide: data.side,
      boardSize: data.config.boardSize,
      totalTime: data.config.totalTime,
      blitzTime: data.config.blitzTime,
      wallsCount: data.config.wallsCount,
      mode: data.config.mode,
      opponent: data.opponent
    });
  }

  destroy() {
    socket.off('match_found', this.onMatchFound);
  }
}
export default ModeSelectScreen;
