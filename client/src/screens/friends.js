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

export class FriendsScreen {
  constructor(router, params) {
    this.router = router;
    this.params = params || {};
    this.tab = this.params.tab || 'friends';
    this.data = null; // { friends, incoming, outgoing }
    this.loaded = false;

    this.onFriendData = this.onFriendData.bind(this);
    this.onInviteResult = this.onInviteResult.bind(this);
  }

  render() {
    const incomingCount = this.data ? this.data.incoming.length : 0;
    return `
      <div class="screen screen-enter">
        <div class="menu-header" style="margin-top: 18px;">
          <div class="friends-logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <h2 class="menu-title">${t('friendsTitle')}</h2>
          <p class="menu-slogan">${t('friendsSubtitle')}</p>
        </div>

        <div class="fr-tabs">
          <button class="fr-tab ${this.tab === 'friends' ? 'on' : ''}" data-tab="friends">${t('tabFriends')}</button>
          <button class="fr-tab ${this.tab === 'requests' ? 'on' : ''}" data-tab="requests">
            ${t('tabRequests')}${incomingCount ? ` <span class="fr-badge">${incomingCount}</span>` : ''}
          </button>
        </div>

        <div id="fr-body" class="fr-body">
          ${this.renderBody()}
        </div>

        <button class="btn btn-secondary" id="back-btn" style="margin-top: 16px;">
          ${t('back')}
        </button>
      </div>
    `;
  }

  renderBody() {
    if (!this.loaded) {
      return `<div class="fr-empty"><div class="loader"></div></div>`;
    }
    return this.tab === 'friends' ? this.renderFriends() : this.renderRequests();
  }

  renderFriends() {
    const friends = this.data.friends || [];
    if (friends.length === 0) {
      return `<div class="fr-empty">${t('noFriends')}</div>`;
    }
    return `<div class="fr-list">${friends.map(f => this.friendRow(f)).join('')}</div>`;
  }

  friendRow(f) {
    const flag = flagFromCode(f.country_code);
    const status = f.online
      ? `<span class="fr-status on"><span class="odot"></span>${t('online')}</span>`
      : `<span class="fr-status">${t('offline')}</span>`;
    return `
      <div class="fr-row">
        <span class="fr-avatar">${this.initial(f.name)}</span>
        <span class="fr-meta">
          <span class="fr-name">${this.esc(f.name)} ${flag ? `<span class="fr-flag">${flag}</span>` : ''}</span>
          ${status}
        </span>
        <button class="fr-invite-btn ${f.online ? '' : 'disabled'}" data-id="${f.id}" ${f.online ? '' : 'disabled'}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3" fill="currentColor" stroke="none"/></svg>
          ${t('invite')}
        </button>
        <button class="fr-remove-btn" data-remove="${f.id}" title="${t('remove')}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>
    `;
  }

  renderRequests() {
    const incoming = this.data.incoming || [];
    const outgoing = this.data.outgoing || [];
    if (incoming.length === 0 && outgoing.length === 0) {
      return `<div class="fr-empty">${t('noRequests')}</div>`;
    }
    let html = '';
    if (incoming.length) {
      html += `<div class="fr-section-title">${t('incomingRequests')}</div>`;
      html += `<div class="fr-list">${incoming.map(r => this.incomingRow(r)).join('')}</div>`;
    }
    if (outgoing.length) {
      html += `<div class="fr-section-title">${t('outgoingRequests')}</div>`;
      html += `<div class="fr-list">${outgoing.map(r => this.outgoingRow(r)).join('')}</div>`;
    }
    return html;
  }

  incomingRow(r) {
    const flag = flagFromCode(r.country_code);
    return `
      <div class="fr-row">
        <span class="fr-avatar">${this.initial(r.name)}</span>
        <span class="fr-meta">
          <span class="fr-name">${this.esc(r.name)} ${flag ? `<span class="fr-flag">${flag}</span>` : ''}</span>
        </span>
        <button class="fr-accept-btn" data-accept="${r.id}">${t('accept')}</button>
        <button class="fr-decline-btn" data-decline="${r.id}">${t('decline')}</button>
      </div>
    `;
  }

  outgoingRow(r) {
    const flag = flagFromCode(r.country_code);
    return `
      <div class="fr-row">
        <span class="fr-avatar">${this.initial(r.name)}</span>
        <span class="fr-meta">
          <span class="fr-name">${this.esc(r.name)} ${flag ? `<span class="fr-flag">${flag}</span>` : ''}</span>
          <span class="fr-status">${t('pending')}</span>
        </span>
      </div>
    `;
  }

  initial(name) {
    const n = (name || '?').trim();
    return this.esc(n.charAt(0).toUpperCase() || '?');
  }

  esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
    ));
  }

  afterRender() {
    socket.on('friend_data', this.onFriendData);
    socket.on('invite_result', this.onInviteResult);
    socket.connect();
    socket.send('get_friends');
    this._retry = setTimeout(() => socket.send('get_friends'), 800);

    const backBtn = document.getElementById('back-btn');
    if (backBtn) backBtn.addEventListener('click', () => { haptic.impact('light'); this.router.back(); });

    document.querySelectorAll('.fr-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        this.tab = btn.dataset.tab;
        haptic.selection();
        this.router.reRenderActiveScreen();
      });
    });

    this.bindRowActions();
  }

  bindRowActions() {
    document.querySelectorAll('.fr-invite-btn').forEach(btn => {
      if (btn.disabled) return;
      btn.addEventListener('click', () => {
        haptic.impact('medium');
        socket.send('invite_to_game', { userId: btn.dataset.id });
        Toast.info(t('waitingFriendAccept'));
      });
    });
    document.querySelectorAll('[data-accept]').forEach(btn => {
      btn.addEventListener('click', () => {
        haptic.impact('medium');
        socket.send('accept_friend_request', { userId: btn.dataset.accept });
      });
    });
    document.querySelectorAll('[data-decline]').forEach(btn => {
      btn.addEventListener('click', () => {
        haptic.impact('light');
        socket.send('decline_friend_request', { userId: btn.dataset.decline });
      });
    });
    document.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', () => {
        haptic.impact('light');
        socket.send('remove_friend', { userId: btn.dataset.remove });
      });
    });
  }

  onFriendData(data) {
    this.data = data || { friends: [], incoming: [], outgoing: [] };
    this.loaded = true;
    // Re-render to refresh tab badge counts and lists.
    this.router.reRenderActiveScreen();
  }

  onInviteResult(res) {
    if (res && !res.ok && res.error === 'offline') {
      Toast.warning(t('friendOffline'));
      return;
    }
    if (res && res.ok && res.roomCode) {
      // Wait in a lightweight waiting room until the friend accepts.
      const onMatch = (m) => {
        socket.off('match_found', onMatch);
        this.router.navigate('game', {
          vs: 'friend',
          roomCode: m.roomCode,
          playerSide: m.side,
          boardSize: m.config.boardSize,
          totalTime: m.config.totalTime,
          blitzTime: m.config.blitzTime,
          wallsCount: m.config.wallsCount,
          mode: m.config.mode,
          opponent: m.opponent
        });
      };
      socket.on('match_found', onMatch);
    }
  }

  destroy() {
    socket.off('friend_data', this.onFriendData);
    socket.off('invite_result', this.onInviteResult);
    if (this._retry) { clearTimeout(this._retry); this._retry = null; }
  }
}

export default FriendsScreen;
