import { t } from '../core/i18n.js';
import { socket } from '../core/websocket.js';
import { haptic } from '../core/telegram.js';
import { Toast } from '../components/toast.js';

function flagFromCode(code) {
  if (!code || code.length !== 2) return '';
  const A = 0x1f1e6;
  const up = code.toUpperCase();
  return String.fromCodePoint(A + (up.charCodeAt(0) - 65), A + (up.charCodeAt(1) - 65));
}

export class OnlineScreen {
  constructor(router, params) {
    this.router = router;
    this.params = params || {};

    this.lobbies = [];
    this.waitingLobby = false;   // created a public lobby, waiting for someone

    this.friends = null;         // friend list for the invite popup
    this.invitedId = null;       // friend we're currently inviting

    this.onLobbiesList = this.onLobbiesList.bind(this);
    this.onMatchFound = this.onMatchFound.bind(this);
    this.onConnect = this.onConnect.bind(this);
    this.onFriendData = this.onFriendData.bind(this);
    this.onInviteResult = this.onInviteResult.bind(this);

    // Register socket listeners once for this screen instance
    this.bindSockets();
  }

  render() {
    // Waiting view (after creating a public lobby)
    if (this.waitingLobby) {
      return `
        <div class="screen screen-enter mm-screen">
          <div class="mm-wrap">
            <button class="mm-orb" id="cancel-search-btn" aria-label="${t('cancel')}">
              <span class="mm-ring mm-ring-1"></span>
              <span class="mm-ring mm-ring-2"></span>
              <span class="mm-ring mm-ring-3"></span>
              <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
            <div class="mm-timer" id="mm-timer">0:00</div>
            <div class="mm-title">${t('findingMatch')}</div>
            <div class="mm-sub">${t('searchingOpponent')}</div>
            <div class="mm-status"><span class="mm-status-dot"></span>${t('connectingServer')}</div>
            <button class="mm-cancel" id="cancel-search-btn-2">${t('cancel')}</button>
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

          <button class="play-action" id="friend-lobby-btn">
            <span class="play-action-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </span>
            <span class="play-action-text">
              <span class="play-action-title">${t('friendLobby')}</span>
              <span class="play-action-desc">${t('friendLobbyDesc')}</span>
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
      const cancel = () => {
        haptic.impact('light');
        socket.send('cancel_search');
        this.waitingLobby = false;
        if (this._mmTimer) { clearInterval(this._mmTimer); this._mmTimer = null; }
        socket.send('get_lobbies');
        this.router.reRenderActiveScreen();
        this.rebindList();
      };
      document.getElementById('cancel-search-btn')?.addEventListener('click', cancel);
      document.getElementById('cancel-search-btn-2')?.addEventListener('click', cancel);

      // Count-up timer.
      this._mmStart = Date.now();
      const tick = () => {
        const el = document.getElementById('mm-timer');
        if (!el) return;
        const s = Math.floor((Date.now() - this._mmStart) / 1000);
        el.innerText = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
      };
      tick();
      this._mmTimer = setInterval(tick, 1000);
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

    const teamBtn = document.getElementById('friend-lobby-btn');
    teamBtn?.addEventListener('click', () => {
      haptic.impact('medium');
      // Open a popup right here with the player's friends; pick one to invite
      // to a private match (no screen change).
      this.openInvitePopup();
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

  // ===== Invite a friend popup =====

  openInvitePopup() {
    // Build the overlay shell; request fresh friend data to fill it.
    this.closeInvitePopup();
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'invite-popup';
    overlay.innerHTML = `
      <div class="modal-card invite-card">
        <button class="invite-close" id="invite-close">✕</button>
        <h3 class="modal-title">${t('friendLobby')}</h3>
        <p class="modal-desc">${t('inviteFriendHint')}</p>
        <div class="invite-list" id="invite-list">
          <div class="fr-empty"><div class="loader"></div></div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    this._invitePopup = overlay;

    overlay.addEventListener('click', (e) => { if (e.target === overlay) this.closeInvitePopup(); });
    overlay.querySelector('#invite-close')?.addEventListener('click', () => this.closeInvitePopup());

    // Render cached friends immediately if we have them; always refresh.
    if (this.friends) this.renderInviteList();
    this.whenConnected(() => socket.send('get_friends'));
  }

  closeInvitePopup() {
    if (this._invitePopup) { this._invitePopup.remove(); this._invitePopup = null; }
  }

  renderInviteList() {
    const list = this._invitePopup && this._invitePopup.querySelector('#invite-list');
    if (!list) return;
    const friends = this.friends || [];
    if (friends.length === 0) {
      list.innerHTML = `<div class="fr-empty">${t('noFriends')}</div>`;
      return;
    }
    list.innerHTML = friends.map(f => {
      const flag = flagFromCode(f.country_code);
      const init = this.esc((f.name || '?').trim().charAt(0).toUpperCase() || '?');
      const status = f.online
        ? `<span class="fr-status on"><span class="odot"></span>${t('online')}</span>`
        : `<span class="fr-status">${t('offline')}</span>`;
      return `
        <div class="fr-row">
          <span class="fr-avatar">${init}</span>
          <span class="fr-meta">
            <span class="fr-name">${this.esc(f.name)} ${flag ? `<span class="fr-flag">${flag}</span>` : ''}</span>
            ${status}
          </span>
          <button class="fr-invite-btn ${f.online ? '' : 'disabled'}" data-invite="${f.id}" ${f.online ? '' : 'disabled'}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3" fill="currentColor" stroke="none"/></svg>
            ${t('invite')}
          </button>
        </div>
      `;
    }).join('');

    list.querySelectorAll('.fr-invite-btn[data-invite]').forEach(btn => {
      if (btn.disabled) return;
      btn.addEventListener('click', () => {
        haptic.impact('medium');
        this.invitedId = btn.dataset.invite;
        socket.send('invite_to_game', { userId: btn.dataset.invite });
        Toast.info(t('waitingFriendAccept'));
        this.closeInvitePopup();
      });
    });
  }

  esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
    ));
  }

  onFriendData(data) {
    this.friends = (data && data.friends) || [];
    this.renderInviteList();
  }

  onInviteResult(res) {
    if (res && !res.ok && res.error === 'offline') {
      Toast.warning(t('friendOffline'));
    }
    // On success the server sends match_found once the friend accepts; that's
    // handled by onMatchFound below.
  }

  // Register socket listeners exactly once
  bindSockets() {
    socket.connect();
    socket.on('lobbies_list', this.onLobbiesList);
    socket.on('match_found', this.onMatchFound);
    socket.on('connect', this.onConnect);
    socket.on('friend_data', this.onFriendData);
    socket.on('invite_result', this.onInviteResult);
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
      mySkin: data.mySkin,
      opponentSkin: data.opponent && data.opponent.skin,
      opponent: data.opponent
    });
  }

  destroy() {
    this.closeInvitePopup();
    if (this._mmTimer) { clearInterval(this._mmTimer); this._mmTimer = null; }
    socket.off('lobbies_list', this.onLobbiesList);
    socket.off('match_found', this.onMatchFound);
    socket.off('connect', this.onConnect);
    socket.off('friend_data', this.onFriendData);
    socket.off('invite_result', this.onInviteResult);
  }
}
export default OnlineScreen;
