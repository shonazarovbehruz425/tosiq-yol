import { t } from '../core/i18n.js';
import { socket } from '../core/websocket.js';
import { haptic } from '../core/telegram.js';

export class HomeScreen {
  constructor(router, params) {
    this.router = router;
    this.params = params;
    this.onlineCount = 0;
    
    this.onUsersCount = this.onUsersCount.bind(this);
  }

  // Quoridor-themed animated background: a grid board with floating wall
  // pieces and drifting red/blue pawn markers behind the menu.
  renderBackground() {
    const walls = [
      // type, color, left%, top%, drift duration(s), delay(s)
      ['h', 'red',  12, 14, 16, 0],
      ['h', 'blue', 64, 9,  19, -5],
      ['v', 'blue', 8,  52, 18, -3],
      ['h', 'red',  78, 60, 17, -7],
      ['h', 'blue', 22, 82, 20, -9],
      ['v', 'red',  88, 30, 15, -6],
      ['v', 'blue', 44, 70, 21, -11],
      ['h', 'red',  52, 38, 18, -13],
    ];
    const pawns = [
      // color, left%, top%, float duration(s), delay(s)
      ['red',  56, 68, 8,  0],
      ['blue', 30, 26, 9,  -3],
      ['red',  82, 46, 10, -5],
      ['blue', 16, 74, 8.5, -2],
    ];

    const wallEls = walls.map(([type, color, l, t, dur, delay]) =>
      `<span class="qbg-wall ${type} ${color}" style="left:${l}%;top:${t}%;animation-duration:${dur}s;animation-delay:${delay}s"></span>`
    ).join('');

    const pawnEls = pawns.map(([color, l, t, dur, delay]) =>
      `<span class="qbg-pawn ${color}" style="left:${l}%;top:${t}%;animation-duration:${dur}s;animation-delay:${delay}s"></span>`
    ).join('');

    return `
      <div class="qbg" aria-hidden="true">
        <div class="qbg-grid"></div>
        <div class="qbg-items">${wallEls}${pawnEls}</div>
      </div>
    `;
  }

  render() {
    return `
      <div class="screen screen-enter">
        ${this.renderBackground()}
        <div class="menu-header">
          <div class="logo-container">
            <!-- Intersecting arrows symbol representing Quoridor blocking paths -->
            <svg class="logo-svg" viewBox="0 0 24 24">
              <path d="M19 15v-3h-6v-2h6V7l4 4-4 4M5 15l-4-4 4-4v3h6v2H5v3m7 4V13h2v6h3l-4 4-4-4h3m0-14V1h2v6h3l-4 4-4-4h3V5z"/>
            </svg>
          </div>
          <h1 class="menu-title">${t('appName')}</h1>
          <p class="menu-slogan">${t('appSlogan')}</p>
          <div class="badge badge-online" id="online-users-badge" style="margin-top: 12px; display: none;">
            🟢 ${t('onlineUsers', { count: this.onlineCount })}
          </div>
        </div>

        <div class="menu-actions home-actions" style="margin-top: 20px;">
          <button class="menu-pill menu-pill-primary" id="play-online-btn">
            <span class="menu-pill-icon icon-online">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="9"/>
                <path d="M3 12h18"/>
                <path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z"/>
              </svg>
            </span>
            <span class="menu-pill-label">${t('playOnline')}</span>
          </button>

          <button class="menu-pill" id="play-bot-btn">
            <span class="menu-pill-icon icon-bot">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="5" y="8" width="14" height="11" rx="3"/>
                <path d="M12 8V4"/>
                <circle cx="12" cy="3" r="1"/>
                <circle cx="9.5" cy="13" r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="14.5" cy="13" r="1.2" fill="currentColor" stroke="none"/>
                <path d="M2 13v3M22 13v3"/>
              </svg>
            </span>
            <span class="menu-pill-label">${t('playBot')}</span>
          </button>

          <button class="menu-pill" id="play-friend-btn">
            <span class="menu-pill-icon icon-friend">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M16 19a4 4 0 0 0-8 0"/>
                <circle cx="12" cy="9" r="3"/>
                <path d="M5 19a3 3 0 0 1 4-2.8"/>
                <path d="M19 19a3 3 0 0 0-4-2.8"/>
                <circle cx="6.5" cy="10.5" r="2"/>
                <circle cx="17.5" cy="10.5" r="2"/>
              </svg>
            </span>
            <span class="menu-pill-label">${t('playFriend')}</span>
          </button>

          <button class="menu-pill menu-pill-mode" id="duel-mode-card">
            <span class="menu-pill-icon icon-mode">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="9"/>
                <circle cx="12" cy="12" r="5"/>
                <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/>
              </svg>
            </span>
            <span class="menu-pill-label">${t('modeCardTitle')}</span>
            <span class="menu-pill-chevron">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 6l6 6-6 6"/>
              </svg>
            </span>
          </button>

          <button class="menu-pill" id="leaderboard-btn">
            <span class="menu-pill-icon icon-leaderboard">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M8 21h8M12 17v4"/>
                <path d="M7 4h10v5a5 5 0 0 1-10 0z"/>
                <path d="M7 5H4v2a3 3 0 0 0 3 3M17 5h3v2a3 3 0 0 1-3 3"/>
              </svg>
            </span>
            <span class="menu-pill-label">${t('leaderboard')}</span>
            <span class="menu-pill-chevron">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 6l6 6-6 6"/>
              </svg>
            </span>
          </button>

          <button class="menu-pill" id="friends-btn">
            <span class="menu-pill-icon icon-friends">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </span>
            <span class="menu-pill-label">${t('friends')}</span>
            <span class="menu-pill-chevron">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 6l6 6-6 6"/>
              </svg>
            </span>
          </button>

          <button class="menu-pill" id="settings-btn">
            <span class="menu-pill-icon icon-settings">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </span>
            <span class="menu-pill-label">${t('systemSettings')}</span>
          </button>
        </div>

        <div class="menu-footer">
          <a href="https://t.me/WrongWayGame" class="menu-link" target="_blank">
            📢 ${t('channel')}
          </a>
          <a href="https://t.me/WrongWaySupportBot" class="menu-link" target="_blank">
            💬 ${t('support')}
          </a>
        </div>
      </div>
    `;
  }

  afterRender() {
    // Connect to WebSocket to track online count
    socket.connect();
    socket.on('users_count', this.onUsersCount);
    
    // Bind buttons
    const playOnlineBtn = document.getElementById('play-online-btn');
    playOnlineBtn.addEventListener('click', () => {
      haptic.impact('medium');
      this.router.navigate('online');
    });

    const playFriendBtn = document.getElementById('play-friend-btn');
    playFriendBtn.addEventListener('click', () => {
      haptic.impact('medium');
      this.router.navigate('friend');
    });

    const playBotBtn = document.getElementById('play-bot-btn');
    playBotBtn.addEventListener('click', () => {
      haptic.impact('medium');
      this.router.navigate('bot');
    });

    const leaderboardBtn = document.getElementById('leaderboard-btn');
    if (leaderboardBtn) {
      leaderboardBtn.addEventListener('click', () => {
        haptic.impact('medium');
        this.router.navigate('leaderboard');
      });
    }

    const friendsBtn = document.getElementById('friends-btn');
    if (friendsBtn) {
      friendsBtn.addEventListener('click', () => {
        haptic.impact('medium');
        this.router.navigate('friends');
      });
    }

    const settingsBtn = document.getElementById('settings-btn');
    settingsBtn.addEventListener('click', () => {
      haptic.impact('medium');
      this.router.navigate('settings');
    });

    // Mode card -> open game mode settings for an ONLINE match
    const modeCard = document.getElementById('duel-mode-card');
    if (modeCard) {
      modeCard.addEventListener('click', () => {
        haptic.impact('medium');
        this.router.navigate('mode-select', { vs: 'online' });
      });
    }
  }

  onUsersCount(data) {
    if (data && typeof data.count !== 'undefined') {
      this.onlineCount = data.count;
      const badge = document.getElementById('online-users-badge');
      if (badge) {
        badge.innerText = `🟢 ${t('onlineUsers', { count: this.onlineCount })}`;
        badge.style.display = 'inline-flex';
      }
    }
  }

  destroy() {
    socket.off('users_count', this.onUsersCount);
  }
}
export default HomeScreen;
