import { t } from '../core/i18n.js';
import { socket } from '../core/websocket.js';
import { haptic, shareInvite } from '../core/telegram.js';
import { Toast } from '../components/toast.js';

// Telegram bot username and Mini App short name (must match @BotFather setup)
const BOT_USERNAME = 'WrongWayGameBot';
const APP_SHORT_NAME = 'play';

export class FriendScreen {
  constructor(router, params) {
    this.router = router;
    this.params = params || {}; // e.g. { isWaiting: true, roomCode: '1234' }

    this.isWaiting = this.params.isWaiting || false;
    this.roomCode = this.params.roomCode || '';

    this.onMatchFound = this.onMatchFound.bind(this);
  }

  render() {
    if (this.isWaiting) {
      // Waiting room for private friend match
      return `
        <div class="screen screen-enter" style="justify-content: center; align-items: center; text-align: center;">
          <div class="card" style="width: 100%; max-width: 340px; padding: 30px; display: flex; flex-direction: column; align-items: center; gap: 20px;">
            <div class="loader" style="width: 48px; height: 48px;"></div>
            <h2>${t('privateTitle')}</h2>
            <p>${t('waitingFriend', { code: '' })}</p>

            <div style="font-size: 36px; font-weight: 800; letter-spacing: 4px; background-color: rgba(255,255,255,0.05); padding: 10px 20px; border-radius: 12px; border: 1px dashed var(--primary); margin: 10px 0;">
              ${this.roomCode}
            </div>

            <button class="btn btn-primary" id="share-link-btn">
              🔗 Havolani Ulashish
            </button>

            <button class="btn btn-secondary" id="cancel-room-btn" style="margin-top: 10px; width: 100%;">
              ${t('cancel')}
            </button>
          </div>
        </div>
      `;
    }

    return `
      <div class="screen screen-enter">
        <h2 class="menu-title" style="margin-top: 20px;">${t('privateTitle')}</h2>

        <button class="btn btn-primary friend-list-btn" id="friends-list-btn" style="margin: 24px 0 14px; padding: 16px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:20px;height:20px;flex-shrink:0;">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          &nbsp; ${t('friends')}
        </button>

        <button class="btn btn-secondary" id="create-private-btn" style="margin: 0 0 26px; padding: 16px;">
          🔒 &nbsp; ${t('createPrivate')}
        </button>

        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
          <div style="flex: 1; height: 1px; background-color: var(--card-border);"></div>
          <span style="font-size: 13px; color: var(--text-secondary); text-transform: uppercase; font-weight: 600;">
            ${t('orEnterCode')}
          </span>
          <div style="flex: 1; height: 1px; background-color: var(--card-border);"></div>
        </div>

        <div style="text-align: center;">
          <p style="font-size: 14px; margin-bottom: 8px;">${t('enterCodeHint')}</p>
          <div class="code-input-container">
            <input type="text" maxlength="1" pattern="[0-9]*" inputmode="numeric" class="code-digit-input" id="digit-1">
            <input type="text" maxlength="1" pattern="[0-9]*" inputmode="numeric" class="code-digit-input" id="digit-2">
            <input type="text" maxlength="1" pattern="[0-9]*" inputmode="numeric" class="code-digit-input" id="digit-3">
            <input type="text" maxlength="1" pattern="[0-9]*" inputmode="numeric" class="code-digit-input" id="digit-4">
          </div>
          <button class="btn btn-secondary" id="join-room-btn" style="margin-top: 10px; width: 100%;">
            ${t('join')}
          </button>
        </div>

        <button class="btn btn-secondary" id="back-btn" style="margin-top: auto;">
          ${t('back')}
        </button>
      </div>
    `;
  }

  afterRender() {
    socket.connect();
    socket.on('match_found', this.onMatchFound);

    if (this.isWaiting) {
      // 1. Share/Copy Link Event
      const shareBtn = document.getElementById('share-link-btn');
      shareBtn.addEventListener('click', async () => {
        haptic.impact('medium');
        const joinLink = `https://t.me/${BOT_USERNAME}/${APP_SHORT_NAME}?startapp=join_${this.roomCode}`;
        const result = await shareInvite(joinLink, t('inviteMessage'));
        if (result === 'copied') Toast.success(t('inviteCopied'));
        else if (result === 'failed') Toast.error(t('inviteFailed'));
      });

      // 2. Cancel Room Event
      const cancelBtn = document.getElementById('cancel-room-btn');
      cancelBtn.addEventListener('click', () => {
        haptic.impact('light');
        socket.send('leave_private_room', { roomCode: this.roomCode });
        this.router.navigate('friend');
      });

      return;
    }

    // Bind non-waiting elements
    const friendsListBtn = document.getElementById('friends-list-btn');
    if (friendsListBtn) {
      friendsListBtn.addEventListener('click', () => {
        haptic.impact('medium');
        this.router.navigate('friends');
      });
    }

    const createBtn = document.getElementById('create-private-btn');
    createBtn.addEventListener('click', () => {
      haptic.impact('medium');
      this.createPrivateRoom();
    });

    const backBtn = document.getElementById('back-btn');
    backBtn.addEventListener('click', () => {
      haptic.impact('light');
      this.router.back();
    });

    // Code digit auto-focusing
    const inputs = [
      document.getElementById('digit-1'),
      document.getElementById('digit-2'),
      document.getElementById('digit-3'),
      document.getElementById('digit-4')
    ];

    inputs.forEach((input, idx) => {
      input.addEventListener('input', (e) => {
        const val = e.target.value;
        if (val.length === 1 && idx < 3) {
          inputs[idx + 1].focus();
        }
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && input.value.length === 0 && idx > 0) {
          inputs[idx - 1].focus();
        }
      });
    });

    const joinBtn = document.getElementById('join-room-btn');
    joinBtn.addEventListener('click', () => {
      const code = inputs.map(i => i.value).join('');
      if (code.length !== 4) {
        haptic.notification('warning');
        Toast.warning(t('invalidCode'));
        return;
      }

      haptic.impact('medium');
      Toast.info(t('connecting'));
      socket.send('join_private_room', { roomCode: code });
    });
  }

  // Create a private room directly with the standard ruleset
  createPrivateRoom() {
    Toast.info(t('loading'));
    const config = { mode: 'duel', boardSize: 9, totalTime: 300, blitzTime: 0, wallsCount: 10 };

    const onRoomCreated = (data) => {
      socket.off('room_created', onRoomCreated);
      if (data && data.roomCode) {
        this.router.navigate('friend', { isWaiting: true, roomCode: data.roomCode });
      } else {
        Toast.error(t('error'));
      }
    };
    socket.on('room_created', onRoomCreated);

    const send = () => socket.send('create_private_room', config);
    if (socket.isConnected) {
      send();
    } else {
      socket.connect();
      const onConnect = () => { socket.off('connect', onConnect); send(); };
      socket.on('connect', onConnect);
    }
  }

  onMatchFound(data) {
    haptic.notification('success');
    Toast.success("Do'stingiz ulandi! O'yin boshlanmoqda.");

    this.router.navigate('game', {
      vs: 'friend',
      roomCode: data.roomCode,
      playerSide: data.side,
      boardSize: data.config.boardSize,
      totalTime: data.config.totalTime,
      blitzTime: data.config.blitzTime,
      wallsCount: data.config.wallsCount,
      mySkin: data.mySkin,
      opponentSkin: data.opponent && data.opponent.skin,
      opponent: data.opponent
    });
  }

  destroy() {
    socket.off('match_found', this.onMatchFound);
  }
}
export default FriendScreen;
