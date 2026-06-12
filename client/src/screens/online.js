import { t } from '../core/i18n.js';
import { socket } from '../core/websocket.js';
import { haptic } from '../core/telegram.js';
import { Toast } from '../components/toast.js';

export class OnlineScreen {
  constructor(router, params) {
    this.router = router;
    this.params = params || {};

    this.lobbies = [];
    this.searchActive = false;   // matchmaking queue
    this.waitingLobby = false;   // created a public lobby, waiting for someone

    this.onLobbiesList = this.onLobbiesList.bind(this);
    this.onMatchFound = this.onMatchFound.bind(this);
    this.onConnect = this.onConnect.bind(this);

    // Register socket listeners once for this screen instance
    this.bindSockets();
  }

  render() {
    // Searching / waiting view
    if (this.searchActive || this.waitingLobby) {
      const title = this.searchActive ? t('searchingMatch') : t('waitingOpponent');
      return `
        <div class="screen screen-enter" style="justify-content: center; align-items: center; text-align: center;">
          <div class="card" style="width: 100%; max-width: 340px; padding: 30px; display: flex; flex-direction: column; align-items: center; gap: 18px;">
            <div class="loader" style="width: 52px; height: 52px; border-width: 4px;"></div>
            <h2 style="margin-bottom: 0;">${title}</h2>
            <p class="muted" style="font-size: 14px;">${t('modeDuellDesc')}</p>
            <button class="btn btn-secondary" id="cancel-search-btn" style="margin-top: 6px; width: 100%;">
              ${t('cancel')}
            </button>
          </div>
        </div>
      `;
    }

    let lobbiesHtml;
    if (this.lobbies.length === 0) {
      lobbiesHtml = `
        <div class="card" style="text-align: center; padding: 30px; color: var(--text-secondary);">
          <span style="font-size: 40px; display: block; margin-bottom: 12px;">🏟️</span>
          <p>${t('noLobbies')}</p>
        </div>
      `;
    } else {
      lobbiesHtml = `
        <div class="lobby-list">
          ${this.lobbies.map(lobby => `
            <div class="lobby-card">
              <div class="lobby-info">
                <span class="lobby-name">🏆 #${String(lobby.id).slice(0, 4).toUpperCase()}</span>
                <div class="lobby-meta">
                  <span class="badge" style="font-size: 11px;">🧭 ${lobby.boardSize}x${lobby.boardSize}</span>
                  <span class="badge" style="font-size: 11px;">⏱️ ${lobby.totalTime ? lobby.totalTime/60 + 'm' : '∞'}</span>
                  <span class="badge" style="font-size: 11px;">🚧 ${lobby.wallsCount}</span>
                </div>
              </div>
              <button class="btn lobby-join-btn" data-lobby-id="${lobby.id}">
                ${t('join')}
              </button>
            </div>
          `).join('')}
        </div>
      `;
    }

    return `
      <div class="screen screen-enter">
        <h2 class="menu-title" style="margin-top: 20px;">${t('onlineTitle')}</h2>

        <div style="display: flex; gap: 10px; margin: 20px 0 10px;">
          <button class="btn btn-primary" id="quick-play-btn" style="flex: 1;">
            ⚡ ${t('quickPlay')}
          </button>
          <button class="btn btn-secondary" id="create-lobby-btn" style="flex: 1;">
            ➕ ${t('createLobby')}
          </button>
        </div>

        <button class="btn btn-secondary" id="mode-btn" style="margin-bottom: 10px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px;vertical-align:-3px;">
            <circle cx="12" cy="12" r="9"/>
            <circle cx="12" cy="12" r="5"/>
            <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/>
          </svg>
          &nbsp; ${t('modeCardTitle')}
        </button>

        <div class="section-title">${t('openGames')}</div>
        ${lobbiesHtml}

        <button class="btn btn-secondary" id="back-btn" style="margin-top: auto;">
          ${t('back')}
        </button>
      </div>
    `;
  }

  afterRender() {
    // Bind UI for the current view. Socket listeners are registered once in onMount.
    if (this.searchActive || this.waitingLobby) {
      const cancelBtn = document.getElementById('cancel-search-btn');
      cancelBtn?.addEventListener('click', () => {
        haptic.impact('light');
        socket.send('cancel_search');
        this.searchActive = false;
        this.waitingLobby = false;
        socket.send('get_lobbies');
        this.router.reRenderActiveScreen();
        this.rebindList();
      });
      return;
    }

    this.rebindList();
  }

  // Bind buttons on the lobby-list view
  rebindList() {
    const quickBtn = document.getElementById('quick-play-btn');
    quickBtn?.addEventListener('click', () => {
      haptic.impact('medium');
      this.searchActive = true;
      this.router.reRenderActiveScreen();
      this.afterRender();
      this.whenConnected(() => socket.send('enter_matchmaking', {
        mode: 'duel', boardSize: 9, totalTime: 300, blitzTime: 0, wallsCount: 10
      }));
    });

    const createBtn = document.getElementById('create-lobby-btn');
    createBtn?.addEventListener('click', () => {
      haptic.impact('medium');
      this.waitingLobby = true;
      this.router.reRenderActiveScreen();
      this.afterRender();
      this.whenConnected(() => socket.send('create_public_lobby', {
        mode: 'duel', boardSize: 9, totalTime: 300, blitzTime: 0, wallsCount: 10
      }));
    });

    const backBtn = document.getElementById('back-btn');
    backBtn?.addEventListener('click', () => {
      haptic.impact('light');
      this.router.back();
    });

    const modeBtn = document.getElementById('mode-btn');
    modeBtn?.addEventListener('click', () => {
      haptic.impact('medium');
      this.router.navigate('mode-select', { vs: 'online' });
    });

    document.querySelectorAll('.lobby-join-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const lobbyId = btn.dataset.lobbyId;
        haptic.impact('medium');
        Toast.info(t('connecting'));
        socket.send('join_lobby', { lobbyId });
      });
    });
  }

  // Register socket listeners exactly once
  bindSockets() {
    socket.connect();
    socket.on('lobbies_list', this.onLobbiesList);
    socket.on('match_found', this.onMatchFound);
    socket.on('connect', this.onConnect);
    this.whenConnected(() => socket.send('get_lobbies'));
  }

  onConnect() {
    // (Re)request the lobby list after a (re)connection if we're browsing
    if (!this.searchActive && !this.waitingLobby) socket.send('get_lobbies');
  }

  whenConnected(fn) {
    if (socket.isConnected) fn();
    else {
      socket.connect();
      const once = () => { socket.off('connect', once); fn(); };
      socket.on('connect', once);
    }
  }

  onLobbiesList(data) {
    // Ignore list updates while we're in a searching/waiting view
    if (this.searchActive || this.waitingLobby) return;
    this.lobbies = data || [];
    this.router.reRenderActiveScreen();
    this.rebindList();
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
    socket.off('lobbies_list', this.onLobbiesList);
    socket.off('match_found', this.onMatchFound);
    socket.off('connect', this.onConnect);
  }
}
export default OnlineScreen;
