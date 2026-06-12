import { t } from '../core/i18n.js';
import { haptic } from '../core/telegram.js';
import { socket } from '../core/websocket.js';
import { Toast } from '../components/toast.js';

// Available board sizes with their default and maximum barricade counts.
// Walls scale with the board so larger boards allow more barricades.
const BOARD_SIZES = [
  { size: 7,  defWalls: 6,  maxWalls: 10, subKey: 'size7Sub' },
  { size: 9,  defWalls: 10, maxWalls: 14, subKey: 'size9Sub' },
  { size: 11, defWalls: 14, maxWalls: 20, subKey: 'size11Sub' },
  { size: 13, defWalls: 18, maxWalls: 26, subKey: 'size13Sub' }
];

const sizeInfo = (size) => BOARD_SIZES.find(b => b.size === size) || BOARD_SIZES[1];

// Selectable game modes. `available: false` modes show a "coming soon" hint
// and can't be started yet (e.g. networked 2v2 needs more work).
const GAME_MODES = [
  { id: 'duel',  icon: '⚔️', available: true },
  { id: 'race',  icon: '🏁', available: true },
  { id: 'fog',   icon: '🌫️', available: true },
  { id: 'chaos', icon: '✨', available: false },
  { id: 'team',  icon: '👥', available: false }
];

const modeInfo = (id) => GAME_MODES.find(m => m.id === id) || GAME_MODES[0];
const modeName = (id) => ({ duel: 'modeDuel', race: 'modeRace', fog: 'modeFog', chaos: 'modeChaos', team: 'modeTeam' }[id]);
const modeSub = (id) => ({ duel: 'duelSub', race: 'raceSub', fog: 'fogSub', chaos: 'chaosSub', team: 'teamSub' }[id]);
const modeHint = (id) => ({ duel: 'duelHint', race: 'raceHint', fog: 'fogHint', chaos: 'chaosHint', team: 'teamHint' }[id]);

export class ModeSelectScreen {
  constructor(router, params) {
    this.router = router;
    this.params = params || {}; // { vs: 'bot'|'friend'|'online', difficulty }

    // Default configuration
    this.config = {
      mode: 'duel',   // 'duel' or 'race'
      size: 9,        // 7 | 9 | 11 | 13
      timer: 300,     // 0 | 180 | 300
      blitz: 0,       // 0 | 10 | 15 | 30
      walls: 10
    };

    this.searching = false; // online matchmaking state

    this.onMatchFound = this.onMatchFound.bind(this);
  }

  // Short summary badges (e.g. "Duell · 5 min")
  summaryBadges() {
    const modeLabel = t(modeName(this.config.mode));
    let timeLabel;
    if (this.config.timer === 0) timeLabel = t('noTimer');
    else timeLabel = `${this.config.timer / 60} min`;
    return `
      <div class="mode-badges">
        <span class="mode-badge">${modeInfo(this.config.mode).icon} ${modeLabel}</span>
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

        <!-- Game mode (dropdown, like the language picker) -->
        <div class="mode-section-label">${t('fieldLabel')}</div>
        <div class="bsize-select mode-select" id="mode-select">
          <button class="bsize-current" id="mode-current-btn">
            <span class="mode-cur-emoji">${modeInfo(c.mode).icon}</span>
            <span class="bsize-cur-title">${t(modeName(c.mode))}</span>
            <span class="bsize-cur-sub">${t(modeSub(c.mode))}</span>
            <span class="lang-caret">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </span>
          </button>
          <div class="bsize-dropdown" id="mode-dropdown">
            ${GAME_MODES.map(m => `
              <button class="bsize-option mode-option ${c.mode === m.id ? 'active' : ''} ${m.available ? '' : 'soon'}" data-mode="${m.id}">
                <span class="mode-cur-emoji">${m.icon}</span>
                <span class="mode-opt-text">
                  <span class="bsize-opt-title">${t(modeName(m.id))}${m.available ? '' : ' · soon'}</span>
                  <span class="bsize-opt-sub">${t(modeSub(m.id))}</span>
                </span>
              </button>
            `).join('')}
          </div>
        </div>
        <div class="mode-hint" id="mode-hint">${t(modeHint(c.mode))}</div>

        <!-- Board size (dropdown) -->
        <div class="mode-section-label">${t('boardSize')}</div>
        <div class="bsize-select" id="bsize-select">
          <button class="bsize-current" id="bsize-current-btn">
            <span class="bsize-cur-title">${c.size}×${c.size}</span>
            <span class="bsize-cur-sub">${t(sizeInfo(c.size).subKey)}</span>
            <span class="lang-caret">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </span>
          </button>
          <div class="bsize-dropdown" id="bsize-dropdown">
            ${BOARD_SIZES.map(b => `
              <button class="bsize-option ${c.size === b.size ? 'active' : ''}" data-size="${b.size}">
                <span class="bsize-opt-title">${b.size}×${b.size}</span>
                <span class="bsize-opt-sub">${t(b.subKey)}</span>
              </button>
            `).join('')}
          </div>
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
        <div class="walls-max-hint" id="walls-max-hint">${t('maxLabel')}: ${sizeInfo(c.size).maxWalls}</div>

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

    // Game mode dropdown (styled like the language picker)
    const modeSelect = document.getElementById('mode-select');
    const modeCurrentBtn = document.getElementById('mode-current-btn');
    modeCurrentBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      haptic.selection();
      modeSelect.classList.toggle('open');
    });
    this._closeMode = () => modeSelect?.classList.remove('open');
    document.addEventListener('click', this._closeMode);

    document.querySelectorAll('.mode-option[data-mode]').forEach(card => {
      card.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = card.dataset.mode;
        const info = modeInfo(id);
        if (!info.available) {
          haptic.notification('warning');
          Toast.info(t('teamHint'));
          return;
        }
        modeSelect?.classList.remove('open');
        document.querySelectorAll('.mode-option[data-mode]').forEach(b => b.classList.remove('active'));
        card.classList.add('active');
        this.config.mode = id;

        // Update the current button label
        const emoji = modeCurrentBtn.querySelector('.mode-cur-emoji');
        const title = modeCurrentBtn.querySelector('.bsize-cur-title');
        const sub = modeCurrentBtn.querySelector('.bsize-cur-sub');
        if (emoji) emoji.innerText = info.icon;
        if (title) title.innerText = t(modeName(id));
        if (sub) sub.innerText = t(modeSub(id));

        const hint = document.getElementById('mode-hint');
        if (hint) hint.innerText = t(modeHint(id));
        haptic.selection();
        this.refreshBadges();
      });
    });

    // Board size dropdown
    const bsizeSelect = document.getElementById('bsize-select');
    const bsizeCurrentBtn = document.getElementById('bsize-current-btn');
    bsizeCurrentBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      haptic.selection();
      bsizeSelect.classList.toggle('open');
    });
    this._closeBsize = () => bsizeSelect?.classList.remove('open');
    document.addEventListener('click', this._closeBsize);

    document.querySelectorAll('.bsize-option[data-size]').forEach(card => {
      card.addEventListener('click', (e) => {
        e.stopPropagation();
        bsizeSelect?.classList.remove('open');
        document.querySelectorAll('.bsize-option[data-size]').forEach(b => b.classList.remove('active'));
        card.classList.add('active');
        this.config.size = parseInt(card.dataset.size);
        const info = sizeInfo(this.config.size);

        // Update current button label
        const curTitle = bsizeCurrentBtn.querySelector('.bsize-cur-title');
        const curSub = bsizeCurrentBtn.querySelector('.bsize-cur-sub');
        if (curTitle) curTitle.innerText = `${info.size}×${info.size}`;
        if (curSub) curSub.innerText = t(info.subKey);

        // Reset walls to default and update max hint
        this.config.walls = info.defWalls;
        const wv = document.getElementById('walls-val');
        if (wv) wv.innerText = this.config.walls;
        const hint = document.getElementById('walls-max-hint');
        if (hint) hint.innerText = `${t('maxLabel')}: ${info.maxWalls}`;
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

    // Barricades (clamped to this board's min 0 / max)
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
      const maxWalls = sizeInfo(this.config.size).maxWalls;
      if (this.config.walls < maxWalls) {
        this.config.walls++;
        wallsVal.innerText = this.config.walls;
        haptic.impact('light');
        this.refreshBadges();
      } else {
        haptic.notification('warning');
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
    // Fog of War plays by Duel rules; the fog is a presentation layer.
    const engineMode = this.config.mode === 'fog' ? 'duel' : this.config.mode;
    return {
      mode: engineMode,
      fog: this.config.mode === 'fog',
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
    if (this._closeBsize) {
      document.removeEventListener('click', this._closeBsize);
      this._closeBsize = null;
    }
    if (this._closeMode) {
      document.removeEventListener('click', this._closeMode);
      this._closeMode = null;
    }
  }
}
export default ModeSelectScreen;
