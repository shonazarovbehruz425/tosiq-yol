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

  render() {
    return `
      <div class="screen screen-enter">
        <div class="menu-header">
          <div class="logo-container">
            <!-- Intersecting arrows symbol representing Quoridor blocking paths -->
            <svg class="logo-svg" viewBox="0 0 24 24">
              <path d="M19 15v-3h-6v-2h6V7l4 4-4 4M5 15l-4-4 4-4v3h6v2H5v3m7 4V13h2v6h3l-4 4-4-4h3m0-14V1h2v6h3l-4 4-4-4h3V5z"/>
            </svg>
          </div>
          <h1 class="menu-title">${t('appName')}</h1>
          <p class="menu-slogan">${t('appSlogan')}</p>
          <div class="badge badge-online" id="online-users-badge" style="margin-top: 12px;">
            <span class="online-dot"></span>
            <span id="online-count-text">${t('onlineUsers', { count: this.onlineCount })}</span>
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

          <button class="menu-pill" id="shop-btn">
            <span class="menu-pill-icon icon-shop">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M6 2 3 6v14a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V6l-3-4z"/>
                <path d="M3 6h18M16 10a4 4 0 0 1-8 0"/>
              </svg>
            </span>
            <span class="menu-pill-label">${t('shop')}</span>
            <span class="menu-pill-chevron">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 6l6 6-6 6"/>
              </svg>
            </span>
          </button>

          <button class="menu-pill" id="dotbox-btn">
            <span class="menu-pill-icon icon-dotbox">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1"/>
                <rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/>
                <rect x="14" y="14" width="7" height="7" rx="1"/>
              </svg>
            </span>
            <span class="menu-pill-label">Dots &amp; Boxes</span>
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
    // The server only broadcasts the count on brand-new connections, so ask for
    // it explicitly whenever Home mounts (we may already be connected).
    const askCount = () => socket.send('get_online_count');
    if (socket.isConnected) askCount();
    else { const once = () => { socket.off('connect', once); askCount(); }; socket.on('connect', once); }
    
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

    const shopBtn = document.getElementById('shop-btn');
    if (shopBtn) {
      shopBtn.addEventListener('click', () => {
        haptic.impact('medium');
        this.router.navigate('shop');
      });
    }

    const dotboxBtn = document.getElementById('dotbox-btn');
    if (dotboxBtn) {
      dotboxBtn.addEventListener('click', () => {
        haptic.impact('medium');
        this.router.navigate('dotbox');
      });
    }

    const settingsBtn = document.getElementById('settings-btn');
    settingsBtn.addEventListener('click', () => {
      haptic.impact('medium');
      this.router.navigate('settings');
    });
  }

  onUsersCount(data) {
    if (data && typeof data.count !== 'undefined') {
      this.onlineCount = data.count;
      const txt = document.getElementById('online-count-text');
      if (txt) txt.innerText = t('onlineUsers', { count: this.onlineCount });
    }
  }

  destroy() {
    socket.off('users_count', this.onUsersCount);
  }
}
export default HomeScreen;
