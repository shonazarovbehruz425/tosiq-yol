import { t } from '../core/i18n.js';
import { socket } from '../core/websocket.js';
import { haptic } from '../core/telegram.js';
import { Toast } from '../components/toast.js';

export class OnlineScreen {
  constructor(router, params) {
    this.router = router;
    this.params = params || {}; // e.g. { searchActive: false }
    
    this.lobbies = [];
    this.searchActive = this.params.searchActive || false;
    
    this.onLobbiesList = this.onLobbiesList.bind(this);
    this.onMatchFound = this.onMatchFound.bind(this);
  }

  render() {
    if (this.searchActive) {
      return `
        <div class="screen screen-enter" style="justify-content: center; align-items: center; text-align: center;">
          <div class="card" style="width: 100%; max-width: 340px; padding: 30px; display: flex; flex-direction: column; align-items: center; gap: 20px;">
            <div class="loader" style="width: 50px; height: 50px; border-width: 4px;"></div>
            <h2 style="margin-bottom: 0;">${t('searchingMatch')}</h2>
            <p>${t('modeDuellDesc')}</p>
            <button class="btn btn-secondary" id="cancel-search-btn" style="margin-top: 10px;">
              ${t('cancel')}
            </button>
          </div>
        </div>
      `;
    }

    let lobbiesHtml = '';
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
                <span class="lobby-name">🏆 Xona #${lobby.id.slice(0, 4).toUpperCase()}</span>
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
            ⚡ Tezkor O'yin
          </button>
          <button class="btn btn-secondary" id="create-lobby-btn" style="flex: 1;">
            ➕ ${t('createLobby')}
          </button>
        </div>

        <div class="section-title">Ochiq O'yinlar</div>
        ${lobbiesHtml}

        <button class="btn btn-secondary" id="back-btn" style="margin-top: auto;">
          ${t('back')}
        </button>
      </div>
    `;
  }

  afterRender() {
    socket.connect();
    
    // Listen for events
    socket.on('lobbies_list', this.onLobbiesList);
    socket.on('match_found', this.onMatchFound);

    // Request initial lobbies list
    if (!this.searchActive) {
      socket.send('get_lobbies');
    } else {
      // If search is active (e.g. redirected from mode selector)
      // Tell backend we are looking for a match
      // Note: we already sent create_public_lobby which registers search
    }

    // Bind UI actions
    if (this.searchActive) {
      const cancelBtn = document.getElementById('cancel-search-btn');
      cancelBtn.addEventListener('click', () => {
        haptic.impact('light');
        socket.send('cancel_search');
        this.searchActive = false;
        this.router.navigate('online');
      });
      return;
    }

    const quickPlayBtn = document.getElementById('quick-play-btn');
    quickPlayBtn.addEventListener('click', () => {
      haptic.impact('medium');
      this.searchActive = true;
      this.router.reRenderActiveScreen();
      
      // Request matchmaking search
      socket.send('enter_matchmaking', {
        boardSize: 9,
        totalTime: 300,
        blitzTime: 0,
        wallsCount: 10
      });
    });

    const createLobbyBtn = document.getElementById('create-lobby-btn');
    createLobbyBtn.addEventListener('click', () => {
      haptic.impact('medium');
      this.searchActive = true;
      this.router.reRenderActiveScreen();

      // Create a standard public lobby and wait for an opponent
      socket.send('enter_matchmaking', {
        mode: 'duel',
        boardSize: 9,
        totalTime: 300,
        blitzTime: 0,
        wallsCount: 10
      });
    });

    const backBtn = document.getElementById('back-btn');
    backBtn.addEventListener('click', () => {
      haptic.impact('light');
      this.router.navigate('home');
    });

    // Join button clicks
    const joinBtns = document.querySelectorAll('.lobby-join-btn');
    joinBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const lobbyId = btn.dataset.lobbyId;
        haptic.impact('medium');
        Toast.info(t('connecting'));
        socket.send('join_lobby', { lobbyId });
      });
    });
  }

  onLobbiesList(data) {
    if (this.searchActive) return;
    this.lobbies = data || [];
    this.router.reRenderActiveScreen();
  }

  onMatchFound(data) {
    haptic.notification('success');
    Toast.success("Raqib topildi! O'yin boshlanmoqda.");
    
    // Redirect to gameplay screen
    // P1 or P2 side is sent from backend
    this.router.navigate('game', {
      vs: 'online',
      roomCode: data.roomCode,
      playerSide: data.side, // 0 = Red, 1 = Blue
      boardSize: data.config.boardSize,
      totalTime: data.config.totalTime,
      blitzTime: data.config.blitzTime,
      wallsCount: data.config.wallsCount,
      opponent: data.opponent
    });
  }

  destroy() {
    socket.off('lobbies_list', this.onLobbiesList);
    socket.off('match_found', this.onMatchFound);
  }
}
export default OnlineScreen;
