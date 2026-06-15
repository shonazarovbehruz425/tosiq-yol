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
    this.data = null; // { me, friends, suggestions }
    this.loaded = false;
    this._bound = false;
    this.searchResults = null; // null = not searching; [] = no results
    this.searchQuery = '';

    this.onFriendData = this.onFriendData.bind(this);
    this.onInviteResult = this.onInviteResult.bind(this);
    this.onFriendResult = this.onFriendResult.bind(this);
    this.onSearchResults = this.onSearchResults.bind(this);
  }

  render() {
    const myId = this.data && this.data.me ? this.data.me.gameId : '';
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
          ${myId ? `<div class="my-game-id" id="my-game-id">${t('yourId')}: <b>${myId}</b> <span class="copy-id">⧉</span></div>` : ''}
        </div>

        <div class="fr-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="fr-search-ico">
            <circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>
          </svg>
          <input type="text" id="fr-search-input" class="fr-search-input" placeholder="${t('searchPlaceholder')}" autocomplete="off" />
          <button class="fr-search-clear" id="fr-search-clear" style="display:none;">✕</button>
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
    if (this.searchResults !== null) {
      return this.renderSearch();
    }
    if (!this.loaded) {
      return `<div class="fr-empty"><div class="loader"></div></div>`;
    }
    const friends = this.data.friends || [];
    const suggestions = this.data.suggestions || [];
    let html = '';

    if (friends.length === 0) {
      html += `<div class="fr-empty">${t('noFriends')}</div>`;
    } else {
      html += `<div class="fr-section-title">${t('myFriends')}</div>`;
      html += `<div class="fr-list">${friends.map(f => this.friendRow(f)).join('')}</div>`;
    }

    // Random people-you-may-know suggestions from the bot's users.
    if (suggestions.length > 0) {
      html += `<div class="fr-section-title">${t('suggestions')}</div>`;
      html += `<div class="fr-list">${suggestions.map(s => this.suggestionRow(s)).join('')}</div>`;
    }
    return html;
  }

  renderSearch() {
    const results = this.searchResults || [];
    const friendIds = new Set((this.data && this.data.friends || []).map(f => String(f.id)));
    if (results.length === 0) {
      return `<div class="fr-section-title">${t('searchResults')}</div><div class="fr-empty">${t('noSearchResults')}</div>`;
    }
    return `
      <div class="fr-section-title">${t('searchResults')}</div>
      <div class="fr-list">${results.map(s => this.searchRow(s, friendIds.has(String(s.id)))).join('')}</div>
    `;
  }

  searchRow(s, isFriend) {
    const flag = flagFromCode(s.country_code);
    const status = s.online
      ? `<span class="fr-status on"><span class="odot"></span>${t('online')}</span>`
      : `<span class="fr-status">ID ${s.gameId || ''}</span>`;
    const action = isFriend
      ? `<span class="fr-status on">✓</span>`
      : `<button class="fr-add-btn" data-add="${s.id}" title="${t('addFriend')}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/>
          </svg>
        </button>`;
    return `
      <div class="fr-row">
        <span class="fr-avatar">${this.initial(s.name)}</span>
        <span class="fr-meta">
          <span class="fr-name">${this.esc(s.name)} ${flag ? `<span class="fr-flag">${flag}</span>` : ''}</span>
          ${status}
        </span>
        ${action}
      </div>
    `;
  }

  suggestionRow(s) {
    const flag = flagFromCode(s.country_code);
    const status = s.online
      ? `<span class="fr-status on"><span class="odot"></span>${t('online')}</span>`
      : `<span class="fr-status">${t('offline')}</span>`;
    return `
      <div class="fr-row">
        <span class="fr-avatar">${this.initial(s.name)}</span>
        <span class="fr-meta">
          <span class="fr-name">${this.esc(s.name)} ${flag ? `<span class="fr-flag">${flag}</span>` : ''}</span>
          ${status}
        </span>
        <button class="fr-add-btn" data-add="${s.id}" title="${t('addFriend')}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M19 8v6M22 11h-6"/>
          </svg>
        </button>
      </div>
    `;
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
    // Bind socket listeners only once (refreshBody re-renders the list in place).
    if (!this._bound) {
      socket.on('friend_data', this.onFriendData);
      socket.on('invite_result', this.onInviteResult);
      socket.on('friend_request_result', this.onFriendResult);
      socket.on('search_results', this.onSearchResults);
      this._bound = true;
      socket.connect();
      socket.send('get_friends');
      this._retry = setTimeout(() => socket.send('get_friends'), 800);
    }

    const backBtn = document.getElementById('back-btn');
    if (backBtn) backBtn.addEventListener('click', () => { haptic.impact('light'); this.router.back(); });

    // Search input (debounced) — query by 8-digit ID or username/name.
    const input = document.getElementById('fr-search-input');
    const clearBtn = document.getElementById('fr-search-clear');
    if (input) {
      input.value = this.searchQuery;
      input.addEventListener('input', () => {
        const q = input.value.trim();
        this.searchQuery = q;
        if (clearBtn) clearBtn.style.display = q ? 'block' : 'none';
        clearTimeout(this._searchTimer);
        if (!q) { this.searchResults = null; this.refreshBody(); return; }
        this._searchTimer = setTimeout(() => {
          socket.send('search_users', { query: q });
        }, 300);
      });
    }
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.searchQuery = '';
        this.searchResults = null;
        if (input) input.value = '';
        clearBtn.style.display = 'none';
        this.refreshBody();
      });
    }

    // Copy my game ID on tap.
    const idEl = document.getElementById('my-game-id');
    if (idEl) {
      idEl.addEventListener('click', () => {
        const id = this.data && this.data.me ? this.data.me.gameId : '';
        if (id) {
          navigator.clipboard?.writeText(id).then(() => Toast.success(t('idCopied'))).catch(() => {});
        }
      });
    }

    this.bindRowActions();
  }

  onSearchResults(data) {
    if (!data) return;
    // Only apply if it matches the current query (avoid stale responses).
    if (this.searchQuery && data.query === this.searchQuery) {
      this.searchResults = data.results || [];
      this.refreshBody();
    }
  }

  // Re-render just the list body without re-running socket setup.
  refreshBody() {
    const body = document.getElementById('fr-body');
    if (body) body.innerHTML = this.renderBody();
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
    document.querySelectorAll('.fr-add-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        haptic.impact('medium');
        socket.send('send_friend_request', { userId: btn.dataset.add });
        btn.classList.add('sent');
        btn.disabled = true;
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
    this.data = data || { me: null, friends: [], suggestions: [] };
    this.loaded = true;
    this.refreshBody();
    // Refresh the "your ID" line if it wasn't shown before.
    if (this.data.me && this.data.me.gameId && !document.getElementById('my-game-id')) {
      this.router.reRenderActiveScreen();
    }
  }

  onFriendResult(res) {
    if (!res) return;
    if (res.status === 'already_friends') Toast.info(t('alreadyFriends'));
    else if (res.status === 'accepted') Toast.success(t('friendAdded'));
    else if (res.status === 'sent') Toast.success(t('friendRequestSent'));
  }

  onInviteResult(res) {
    if (res && !res.ok && res.error === 'offline') {
      Toast.warning(t('friendOffline'));
      return;
    }
    if (res && res.ok && res.roomCode) {
      // Wait until the friend accepts; then drop into the game.
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
          mySkin: m.mySkin,
          opponentSkin: m.opponent && m.opponent.skin,
          opponent: m.opponent
        });
      };
      socket.on('match_found', onMatch);
    }
  }

  destroy() {
    socket.off('friend_data', this.onFriendData);
    socket.off('invite_result', this.onInviteResult);
    socket.off('friend_request_result', this.onFriendResult);
    socket.off('search_results', this.onSearchResults);
    if (this._retry) { clearTimeout(this._retry); this._retry = null; }
    if (this._searchTimer) { clearTimeout(this._searchTimer); this._searchTimer = null; }
  }
}

export default FriendsScreen;
