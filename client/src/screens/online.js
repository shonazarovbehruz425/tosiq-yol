import { t } from '../core/i18n.js';
import { socket } from '../core/websocket.js';
import { haptic } from '../core/telegram.js';
import { Toast } from '../components/toast.js';

export class OnlineScreen {
  constructor(router, params) {
    this.router = router;
    this.params = params || {};

    this.lobbies = [];
    this.waitingLobby = false;   // created a public lobby, waiting for someone

    this.onLobbiesList = this.onLobbiesList.bind(this);
    this.onMatchFound = this.onMatchFound.bind(this);
    this.onConnect = this.onConnect.bind(this);

    // Register socket listeners once for this screen instance
    this.bindSockets();
  }

  render() {
    // Waiting view (after creating a public lobby)
    if (this.waitingLobby) {
      return `
        <div class="screen screen-enter" style="justify-content: center; align-items: center; text-align: center;">
          <div class="card" style="width: 100%; max-width: 340px; padding: 30px; display: flex; flex-direction: column; align-items: center; gap: 18px;">
            <div class="loader" style="width: 52px; height: 52px; border-width: 4px;"></div>
            <h2 style="margin-bottom: 0;">${t('waitingOpponent')}</h2>
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
        <div class="empty-lobbies">
          <div class="empty-lobbies-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M2 12h4l2-6 4 12 2-6h8"/>
            </svg>
          </div>
          <p class="empty-lobbies-text">${t('noLobbies')}</p>
        </div>
      `;
    } else {
      lobbiesHtml = `
        <div class="lobby-list">
          ${this.lobbies.map(lobby => `
            <div class="lobby-card">
              <div class="lobby-info">
                <span class="lobby-name">#${String(lobby.id).slice(0, 4).toUpperCase()}</span>
                <div class="lobby-meta">
                  <span class="lobby-chip">${lobby.boardSize}×${lobby.boardSize}</span>
                  <span class="lobby-chip">${lobby.totalTime ? lobby.totalTime / 60 + 'm' : '∞'}</span>
                  <span class="lobby-chip">${lobby.wallsCount} 🚧</span>
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
      <div class="screen screen-enter online-screen">
        <div class="online-header">
          <div class="online-logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="9"/>
              <path d="M3 12h18"/>
              <path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z"/>
            </svg>
          </div>
          <div>
            <h2 class="online-title">${t('onlineTitle')}</h2>
            <p class="online-sub">${t('modeDuellDesc')}</p>
          </div>
        </div>

        <div class="online-actions">
          <button class="play-action play-action-primary" id="create-lobby-btn">
            <span class="play-action-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="9"/>
                <path d="M12 8v8M8 12h8"/>
              </svg>
            </span>
            <span class="play-action-text">
              <span class="play-action-title">${t('createLobby')}</span>
              <span class="play-action-desc">${t('createLobbyDesc')}</span>
            </span>
          </button>

          <button class="play-action play-action-mode" id="mode-btn">
            <span class="play-action-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="9"/>
                <circle cx="12" cy="12" r="5"/>
                <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/>
              </svg>
            </span>
            <span class="play-action-text">
              <span class="play-action-title">${t('modeCardTitle')}</span>
              <span class="play-action-desc">${t('modeCardDesc')}</span>
            </span>
            <span class="play-action-chevron">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 6l6 6-6 6"/>
              </svg>
            </span>
          </button>
        </div>

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
    if (this.waitingLobby) {
      const cancelBtn = document.getElementById('cancel-search-btn');
      cancelBtn?.addEventListener('click', () => {
        haptic.impact('light');
        socket.send('cancel_search');
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
    if (!this.waitingLobby) socket.send('get_lobbies');
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
    // Ignore list updates while we're in a waiting view
    if (this.waitingLobby) return;
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
