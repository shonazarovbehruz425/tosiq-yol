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
    this.waitingTeam = false;    // in 2v2 matchmaking queue

    this.onLobbiesList = this.onLobbiesList.bind(this);
    this.onMatchFound = this.onMatchFound.bind(this);
    this.onConnect = this.onConnect.bind(this);
    this.onTeamQueue = this.onTeamQueue.bind(this);

    // Register socket listeners once for this screen instance
    this.bindSockets();
  }

  render() {
    // Waiting view (after creating a public lobby, or in 2v2 queue)
    if (this.waitingLobby || this.waitingTeam) {
      const title = this.waitingTeam ? t('waitingTeam') : t('waitingOpponent');
      const sub = this.waitingTeam ? `${this.teamQueueSize || 1}/4` : t('modeDuellDesc');
      return `
        <div class="screen screen-enter" style="justify-content: center; align-items: center; text-align: center;">
          <div class="card" style="width: 100%; max-width: 340px; padding: 30px; display: flex; flex-direction: column; align-items: center; gap: 18px;">
            <div class="loader" style="width: 52px; height: 52px; border-width: 4px;"></div>
            <h2 style="margin-bottom: 0;">${title}</h2>
            <p class="muted" style="font-size: 14px;">${sub}</p>
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
            <span class="play-action-chevron">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 6l6 6-6 6"/>
              </svg>
            </span>
          </button>

          <button class="play-action" id="team-online-btn">
            <span class="play-action-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </span>
            <span class="play-action-text">
              <span class="play-action-title">${t('modeTeam')} · 2v2</span>
              <span class="play-action-desc">${t('teamOnlineDesc')}</span>
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
    if (this.waitingLobby || this.waitingTeam) {
      const cancelBtn = document.getElementById('cancel-search-btn');
      cancelBtn?.addEventListener('click', () => {
        haptic.impact('light');
        if (this.waitingTeam) {
          socket.send('cancel_team_search');
          this.waitingTeam = false;
        } else {
          socket.send('cancel_search');
          this.waitingLobby = false;
        }
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
      // Open the mode/board settings; from there the player creates a public
      // lobby and waits inside the game.
      this.router.navigate('mode-select', { vs: 'online' });
    });

    const backBtn = document.getElementById('back-btn');
    backBtn?.addEventListener('click', () => {
      haptic.impact('light');
      this.router.back();
    });

    const teamBtn = document.getElementById('team-online-btn');
    teamBtn?.addEventListener('click', () => {
      haptic.impact('medium');
      this.waitingTeam = true;
      this.teamQueueSize = 1;
      this.router.reRenderActiveScreen();
      this.afterRender();
      this.whenConnected(() => socket.send('enter_team_matchmaking', { wallsPerTeam: 10 }));
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
    socket.on('team_queue', this.onTeamQueue);
    this.whenConnected(() => socket.send('get_lobbies'));
  }

  onTeamQueue(data) {
    // Update the "x/4" counter while waiting for a 2v2 match.
    if (data && typeof data.size === 'number') {
      this.teamQueueSize = data.size;
      if (this.waitingTeam) {
        const sub = document.querySelector('.screen .muted');
        if (sub) sub.innerText = `${data.size}/4`;
      }
    }
  }

  onConnect() {
    // (Re)request the lobby list after a (re)connection if we're browsing
    if (!this.waitingLobby && !this.waitingTeam) socket.send('get_lobbies');
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
    if (this.waitingLobby || this.waitingTeam) return;
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
      mySkin: data.mySkin,
      opponentSkin: data.opponent && data.opponent.skin,
      opponent: data.opponent
    });
  }

  destroy() {
    socket.off('lobbies_list', this.onLobbiesList);
    socket.off('match_found', this.onMatchFound);
    socket.off('connect', this.onConnect);
    socket.off('team_queue', this.onTeamQueue);
  }
}
export default OnlineScreen;
