import { t } from '../core/i18n.js';
import { socket } from '../core/websocket.js';
import { haptic, getTelegramUser } from '../core/telegram.js';
import { StorageManager } from '../core/storage.js';
import { Sound, setSoundEnabled } from '../core/sound.js';
import { QuoridorEngine } from '../game/logic.js';
import { QuoridorAI } from '../game/ai.js';
import { BoardRenderer } from '../game/board.js';
import { GameTimer } from '../game/timer.js';
import { FloatingEmoji } from '../game/animations.js';
import { REACTIONS, reactionArt } from '../game/reactions.js';
import { Modal } from '../components/modal.js';
import { Toast } from '../components/toast.js';

export class GameScreen {
  constructor(router, params) {
    this.router = router;
    // Contains: { vs: 'bot'|'friend'|'online', boardSize, totalTime, blitzTime, wallsCount, playerSide, opponent }
    this.params = params || {};
    
    this.vs = this.params.vs || 'bot';
    this.boardSize = this.params.boardSize || 9;
    this.wallsCount = this.params.wallsCount || 10;
    this.mode = this.params.mode || 'duel';
    this.fog = this.params.fog === true; // Fog of War visibility overlay
    this.fogRadius = 2; // reveal a 5x5 area around my pawn
    this.soundEnabled = true;
    
    // Engine & Board Renderer
    this.engine = new QuoridorEngine(this.boardSize, this.wallsCount, this.mode);
    this.boardRenderer = null;
    
    // Player settings: side 0 = Red (bottom), 1 = Blue (top)
    this.mySide = typeof this.params.playerSide !== 'undefined' ? this.params.playerSide : 0; // Default 0 for local bot
    this.opponentUser = this.params.opponent || { first_name: 'AI Bot' };
    this.meUser = getTelegramUser();
    
    // Timer
    this.timer = null;
    
    // Bot AI helper
    this.botAI = null;
    if (this.vs === 'bot') {
      const botSide = 1 - this.mySide;
      this.botAI = new QuoridorAI(botSide);
    }
    
    // Event bindings
    this.onMovePawn = this.onMovePawn.bind(this);
    this.onPlaceWall = this.onPlaceWall.bind(this);
    this.onOpponentMoved = this.onOpponentMoved.bind(this);
    this.onOpponentWall = this.onOpponentWall.bind(this);
    this.onEmojiReceived = this.onEmojiReceived.bind(this);
    this.onChatMessage = this.onChatMessage.bind(this);
    this.onOpponentResigned = this.onOpponentResigned.bind(this);
    this.onOpponentDisconnected = this.onOpponentDisconnected.bind(this);
    this.onOpponentReconnected = this.onOpponentReconnected.bind(this);
  }

  render() {
    const isBot = this.vs === 'bot';
    
    const p1Name = this.mySide === 0 ? this.meUser.first_name : this.opponentUser.first_name;
    const p2Name = this.mySide === 1 ? this.meUser.first_name : this.opponentUser.first_name;
    
    return `
      <div class="game-container screen-enter" id="game-page-container">
        <!-- Header -->
        <div class="game-header">
          <button class="game-logo-btn" id="logo-btn">🛑 ${t('appName')}</button>
          <button class="btn btn-outline-red surrender-btn" id="surrender-btn">${t('surrender')}</button>
        </div>

        <!-- Players Panel -->
        <div class="players-status">
          <!-- Blue Player (Top, indices 1) -->
          <div class="player-panel player-blue" id="player-panel-1">
            <div class="player-info-top">
              <div class="player-avatar">B</div>
              <span class="player-name">${p2Name}</span>
            </div>
            <div class="player-stats">
              <span class="walls-badge" id="player-walls-1">🚧 ${this.wallsCount}</span>
              <span class="player-timer" id="player-time-1">05:00</span>
            </div>
          </div>

          <!-- Red Player (Bottom, indices 0) -->
          <div class="player-panel player-red" id="player-panel-0">
            <div class="player-info-top">
              <div class="player-avatar">R</div>
              <span class="player-name">${p1Name}</span>
            </div>
            <div class="player-stats">
              <span class="walls-badge" id="player-walls-0">🚧 ${this.wallsCount}</span>
              <span class="player-timer" id="player-time-0">05:00</span>
            </div>
          </div>
        </div>

        <!-- Timer / Status Bar -->
        <div class="turn-banner" id="game-status-banner">
          ...
        </div>

        <!-- Board -->
        <div class="board-wrapper" id="game-board-container">
          <!-- CSS Grid Board draws here -->
        </div>

        <!-- Bottom Actions -->
        <div class="game-controls">
          <div class="emoji-reactions" id="emoji-reactions">
            <button class="emoji-toggle" id="emoji-toggle" title="Reaksiya">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="9"/>
                <path d="M8.5 14.5a4 4 0 0 0 7 0"/>
                <circle cx="9" cy="9.5" r="1.2" fill="currentColor" stroke="none"/>
                <circle cx="15" cy="9.5" r="1.2" fill="currentColor" stroke="none"/>
              </svg>
            </button>
            <div class="emoji-popup" id="emoji-popup">
              ${REACTIONS.map(r => `
                <button class="emoji-btn" data-emoji="${r.key}" style="--rc:${r.color}">${r.icon}</button>
              `).join('')}
            </div>
          </div>

          <div class="wall-tray" id="wall-tray">
            <span class="wall-tray-hint" id="wall-tray-hint">To'siqni sudrang →</span>
            <div class="wall-chip wall-chip-h" id="wall-chip-h" title="Gorizontal to'siq">
              <span class="wall-chip-bar bar-h"></span>
            </div>
            <div class="wall-chip wall-chip-v" id="wall-chip-v" title="Vertikal to'siq">
              <span class="wall-chip-bar bar-v"></span>
            </div>
          </div>
        </div>
        ${isBot ? '' : this.renderChat()}
      </div>
    `;
  }

  // In-game real-time chat (online/friend games only)
  renderChat() {
    return `
      <button class="chat-fab" id="chat-fab" title="${t('chat')}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
        </svg>
        <span class="chat-fab-dot" id="chat-fab-dot" style="display:none;"></span>
      </button>

      <div class="chat-panel" id="chat-panel">
        <div class="chat-head">
          <span class="chat-title">${t('chat')}</span>
          <button class="chat-close" id="chat-close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="chat-messages" id="chat-messages"></div>
        <div class="chat-input-row">
          <input type="text" id="chat-input" class="chat-input" maxlength="200" placeholder="${t('typeMessage')}" autocomplete="off" />
          <button class="chat-send" id="chat-send">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13M22 2 15 22l-4-9-9-4 20-7z"/></svg>
          </button>
        </div>
      </div>
    `;
  }

  async afterRender() {
    const settings = await StorageManager.loadSettings();
    this.soundEnabled = settings.sound;
    setSoundEnabled(settings.sound);
    
    // 1. Initialize Board Renderer
    const container = document.getElementById('game-board-container');
    this.boardRenderer = new BoardRenderer(container, this.engine, {
      onMovePawn: this.onMovePawn,
      onPlaceWall: this.onPlaceWall,
      canDragWall: () => this.canPlaceWallNow()
    });

    // 2. Setup Timer
    this.timer = new GameTimer({
      totalTime: this.params.totalTime || 0,
      blitzTime: this.params.blitzTime || 0,
      onTick: (state) => this.updateTimerUI(state),
      onTimeout: (timedOutPlayer) => this.handleTimeout(timedOutPlayer)
    });

    // Start timer (Red always starts)
    this.timer.start(0);

    // 3. Update active player panels
    this.updateActivePlayerPanel();
    this.updateStatusBanner();
    this.applyFog();

    // 4. Bind Wall Drag Chips (drag-and-drop wall placement)
    const chipH = document.getElementById('wall-chip-h');
    const chipV = document.getElementById('wall-chip-v');

    const bindChip = (chip, type) => {
      if (!chip) return;
      chip.addEventListener('pointerdown', (e) => {
        if (!this.canPlaceWallNow()) {
          haptic.notification('warning');
          if (this.engine.playerWallsLeft[this.engine.currentPlayer] <= 0) {
            Toast.warning("To'siqlaringiz tugadi!");
          } else {
            Toast.info(t('opponentTurn'));
          }
          return;
        }
        this.boardRenderer.startWallDrag(type, e, chip);
      });
    };

    bindChip(chipH, 'H');
    bindChip(chipV, 'V');

    this.updateWallChips();

    // 5. Bind Surrender Button
    const surrenderBtn = document.getElementById('surrender-btn');
    surrenderBtn.addEventListener('click', () => {
      Modal.show({
        title: t('surrender'),
        message: t('surrenderConfirm'),
        confirmText: t('confirm'),
        cancelText: t('cancel'),
        onConfirm: () => this.surrender()
      });
    });

    // 6. Bind Emoji Buttons (popup that opens on the toggle button)
    const emojiReactions = document.getElementById('emoji-reactions');
    const emojiToggle = document.getElementById('emoji-toggle');
    if (emojiToggle && emojiReactions) {
      emojiToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        haptic.impact('light');
        emojiReactions.classList.toggle('open');
      });
      // Close the popup when tapping elsewhere
      this._closeEmoji = () => emojiReactions.classList.remove('open');
      document.addEventListener('click', this._closeEmoji);
    }

    const emojiBtns = document.querySelectorAll('.emoji-btn');
    emojiBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const emoji = btn.dataset.emoji;
        haptic.impact('light');

        // Spawn the custom reaction artwork locally
        FloatingEmoji.spawn(reactionArt(emoji), document.getElementById('game-page-container'), btn.getBoundingClientRect());

        if (this.vs !== 'bot') {
          // Send to opponent online
          socket.send('game_emoji', { roomCode: this.params.roomCode, emoji });
        }

        // Collapse the popup after picking
        if (emojiReactions) emojiReactions.classList.remove('open');
      });
    });

    // 7. Bind logo exit button (only if bot, otherwise confirm surrender first)
    const logoBtn = document.getElementById('logo-btn');
    logoBtn.addEventListener('click', () => {
      if (this.vs === 'bot') {
        this.timer.destroy();
        this.router.navigate('home');
      } else {
        surrenderBtn.click();
      }
    });

    // 8. WebSocket updates if online
    if (this.vs !== 'bot') {
      socket.on('opponent_moved', this.onOpponentMoved);
      socket.on('opponent_wall', this.onOpponentWall);
      socket.on('game_emoji', this.onEmojiReceived);
      socket.on('opponent_resigned', this.onOpponentResigned);
      socket.on('opponent_disconnected', this.onOpponentDisconnected);
      socket.on('opponent_reconnected', this.onOpponentReconnected);
      socket.on('game_chat', this.onChatMessage);
      this.setupChat();
    }
  }

  // Wire up the in-game chat panel (online/friend games only)
  setupChat() {
    const fab = document.getElementById('chat-fab');
    const panel = document.getElementById('chat-panel');
    const closeBtn = document.getElementById('chat-close');
    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('chat-send');
    const dot = document.getElementById('chat-fab-dot');
    if (!fab || !panel) return;

    const openPanel = () => {
      panel.classList.add('open');
      if (dot) dot.style.display = 'none';
      setTimeout(() => input && input.focus(), 50);
    };
    const closePanel = () => panel.classList.remove('open');

    fab.addEventListener('click', () => {
      haptic.impact('light');
      panel.classList.contains('open') ? closePanel() : openPanel();
    });
    if (closeBtn) closeBtn.addEventListener('click', closePanel);

    const send = () => {
      const text = (input.value || '').trim().slice(0, 200);
      if (!text) return;
      socket.send('game_chat', { roomCode: this.params.roomCode, text });
      this.addChatMessage(text, 'me');
      input.value = '';
    };
    if (sendBtn) sendBtn.addEventListener('click', send);
    if (input) input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); send(); }
    });
  }

  // Append a chat bubble; side = 'me' | 'them'
  addChatMessage(text, side) {
    const list = document.getElementById('chat-messages');
    if (!list) return;
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${side}`;
    bubble.textContent = text;
    list.appendChild(bubble);
    list.scrollTop = list.scrollHeight;
  }

  // Opponent's chat message arrived
  onChatMessage(data) {
    if (!data || !data.text) return;
    this.addChatMessage(data.text, 'them');
    const panel = document.getElementById('chat-panel');
    const dot = document.getElementById('chat-fab-dot');
    if (panel && !panel.classList.contains('open') && dot) {
      dot.style.display = 'block';
    }
    haptic.impact('light');
  }

  // Handle local pawn moves
  onMovePawn(r, c) {
    // Prevent moves if it's not my turn online
    if (this.vs !== 'bot' && this.engine.currentPlayer !== this.mySide) {
      Sound.error();
      return;
    }

    const playerIndex = this.engine.currentPlayer;
    const success = this.engine.movePawn(r, c, playerIndex);

    if (success) {
      Sound.move();
      haptic.impact('light');

      // Update Board UI
      this.boardRenderer.updatePawns();
      
      if (this.vs !== 'bot') {
        // Send move to server
        socket.send('game_move', { roomCode: this.params.roomCode, r, c });
      }

      this.afterTurnChange();
    } else {
      Sound.error();
    }
  }

  // Handle local wall placements
  onPlaceWall(r, c, type) {
    if (this.vs !== 'bot' && this.engine.currentPlayer !== this.mySide) {
      Sound.error();
      return;
    }

    const playerIndex = this.engine.currentPlayer;
    const success = this.engine.placeWall(r, c, type, playerIndex);

    if (success) {
      Sound.wall();
      haptic.impact('medium');

      // Update wall count and redraw walls
      document.getElementById(`player-walls-${playerIndex}`).innerText = `🚧 ${this.engine.playerWallsLeft[playerIndex]}`;
      this.boardRenderer.drawWalls();
      this.boardRenderer.clearWallPreviews();
      
      if (this.vs !== 'bot') {
        // Send wall place to server
        socket.send('game_wall', { roomCode: this.params.roomCode, r, c, wallType: type });
      }

      this.afterTurnChange();
    } else {
      Sound.error();
      haptic.notification('warning');
      Toast.warning("Noto'g'ri to'siq yoki yo'l butunlay to'sildi!");
    }
  }

  afterTurnChange() {
    // 1. Check Win
    if (this.engine.winner !== -1) {
      this.timer.destroy();
      this.handleGameFinished(this.engine.winner === this.mySide ? 'win' : 'lose');
      return;
    }

    // 2. Switch timer active player
    this.timer.switchPlayer(this.engine.currentPlayer);

    // 3. Update Turn banner and Highlights
    this.updateActivePlayerPanel();
    this.updateStatusBanner();
    this.updateWallChips();
    
    // Redraw available move circles
    const myTurn = this.vs === 'bot' || this.engine.currentPlayer === this.mySide;
    this.boardRenderer.updateValidMoves(myTurn);

    // Fog of War: refresh the visible area around the controlled pawn.
    this.applyFog();

    // 4. Trigger AI bot if vs bot
    if (this.vs === 'bot' && this.engine.currentPlayer !== this.mySide) {
      setTimeout(() => {
        this.runBotAI();
      }, 250); // small delay so the player's move renders before the bot replies
    }
  }

  // ===== Fog of War =====
  // Reveal only the cells (and walls) within `fogRadius` of the pawn the local
  // player controls. Everything else is dimmed/hidden. In a bot game we follow
  // whichever pawn the human controls (mySide); online we follow our own pawn.
  applyFog() {
    if (!this.fog || !this.boardRenderer) return;
    const N = this.engine.boardSize;
    const focus = this.engine.pawnPos[this.mySide];
    if (!focus) return;

    const board = this.boardRenderer.boardDiv;
    if (!board) return;
    board.classList.add('fog-on');

    const R = this.fogRadius;
    const visible = (r, c) => Math.abs(r - focus.r) <= R && Math.abs(c - focus.c) <= R;

    // Cells: toggle a 'fogged' class for those outside the visible window.
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const cell = this.boardRenderer.cellElements[`${r},${c}`];
        if (cell) cell.classList.toggle('fogged', !visible(r, c));
      }
    }

    // Walls: hide any wall whose spanned cells are all outside the visible window.
    this.boardRenderer.setWallVisibility((w) => {
      if (w.type === 'H') {
        return visible(w.r, w.c) || visible(w.r, w.c + 1) || visible(w.r + 1, w.c) || visible(w.r + 1, w.c + 1);
      }
      return visible(w.r, w.c) || visible(w.r + 1, w.c) || visible(w.r, w.c + 1) || visible(w.r + 1, w.c + 1);
    });
  }

  // Can the local player place a wall right now?
  canPlaceWallNow() {
    if (this.engine.winner !== -1) return false;
    // In online/friend games it must be my turn; vs bot the human always controls currentPlayer
    if (this.vs !== 'bot' && this.engine.currentPlayer !== this.mySide) return false;
    // Must have walls left for whoever's turn it is
    return this.engine.playerWallsLeft[this.engine.currentPlayer] > 0;
  }

  // Enable/disable wall drag chips depending on turn & remaining walls
  updateWallChips() {
    const tray = document.getElementById('wall-tray');
    const chipH = document.getElementById('wall-chip-h');
    const chipV = document.getElementById('wall-chip-v');
    const hint = document.getElementById('wall-tray-hint');
    if (!tray) return;

    const enabled = this.canPlaceWallNow();
    tray.classList.toggle('disabled', !enabled);
    [chipH, chipV].forEach(chip => {
      if (chip) chip.classList.toggle('chip-disabled', !enabled);
    });

    // Show remaining wall count for the current local player
    if (hint) {
      const sideForCount = this.vs === 'bot' ? this.engine.currentPlayer : this.mySide;
      const left = this.engine.playerWallsLeft[sideForCount];
      hint.innerText = enabled ? `🚧 ${left} ta · sudrang` : `🚧 ${left}`;
    }
  }

  // AI bot calculation and trigger
  runBotAI() {
    const botMove = this.botAI.getMove(this.engine, this.params.difficulty);
    
    if (botMove.type === 'move') {
      this.engine.movePawn(botMove.r, botMove.c, 1 - this.mySide);
      Sound.move();
      this.boardRenderer.updatePawns();
    } else {
      this.engine.placeWall(botMove.r, botMove.c, botMove.wallType, 1 - this.mySide);
      Sound.wall();
      const botIdx = 1 - this.mySide;
      document.getElementById(`player-walls-${botIdx}`).innerText = `🚧 ${this.engine.playerWallsLeft[botIdx]}`;
      this.boardRenderer.drawWalls();
    }

    this.afterTurnChange();
  }

  // WebSocket event: opponent moved
  onOpponentMoved(data) {
    const oppSide = 1 - this.mySide;
    this.engine.movePawn(data.r, data.c, oppSide);
    Sound.move();
    this.boardRenderer.updatePawns();
    this.afterTurnChange();
  }

  // WebSocket event: opponent placed wall
  onOpponentWall(data) {
    const oppSide = 1 - this.mySide;
    this.engine.placeWall(data.r, data.c, data.wallType, oppSide);
    Sound.wall();
    document.getElementById(`player-walls-${oppSide}`).innerText = `🚧 ${this.engine.playerWallsLeft[oppSide]}`;
    this.boardRenderer.drawWalls();
    this.afterTurnChange();
  }

  // WebSocket event: opponent sent emoji
  onEmojiReceived(data) {
    // Find the opponent panel rect to anchor the reaction
    const oppIdx = 1 - this.mySide;
    const oppPanel = document.getElementById(`player-panel-${oppIdx}`);
    FloatingEmoji.spawn(reactionArt(data.emoji), document.getElementById('game-page-container'), oppPanel?.getBoundingClientRect());
  }

  // WebSocket event: opponent surrendered
  onOpponentResigned() {
    this.timer.destroy();
    haptic.notification('success');
    Modal.show({
      title: t('victory'),
      message: t('winByDisconnect'),
      confirmText: t('menu'),
      onConfirm: () => {
        this.handleGameFinished('win');
      }
    });
  }

  onOpponentDisconnected() {
    Toast.warning(t('disconnected'));
    const banner = document.getElementById('game-status-banner');
    banner.innerText = t('opponentReconnecting');
    banner.style.color = 'var(--accent-yellow)';
  }

  onOpponentReconnected() {
    Toast.success("Raqib qayta ulandi!");
    this.updateStatusBanner();
  }

  surrender() {
    this.timer.destroy();
    if (this.vs !== 'bot') {
      socket.send('surrender', { roomCode: this.params.roomCode });
    }
    this.handleGameFinished('lose');
  }

  // Intercept the router/Telegram back button while in a game.
  // Returns true to signal we've handled it (router won't pop).
  onBack() {
    if (this.engine.winner !== -1) return false; // game over — allow normal back

    if (this.vs === 'bot') {
      // Local game — confirm leaving (no penalty)
      Modal.show({
        title: t('surrender'),
        message: t('surrenderConfirm'),
        confirmText: t('confirm'),
        cancelText: t('cancel'),
        onConfirm: () => {
          this.timer.destroy();
          this.router.navigate('home');
        }
      });
    } else {
      // Online/friend — leaving means surrender
      Modal.show({
        title: t('surrender'),
        message: t('surrenderConfirm'),
        confirmText: t('confirm'),
        cancelText: t('cancel'),
        onConfirm: () => this.surrender()
      });
    }
    return true;
  }

  // Timers UI updates
  updateTimerUI(state) {
    const redTime = document.getElementById('player-time-0');
    const blueTime = document.getElementById('player-time-1');
    const banner = document.getElementById('game-status-banner');

    if (state.hasTotalLimit) {
      if (redTime) redTime.innerText = this.timer.formatTime(state.playerTimes[0]);
      if (blueTime) blueTime.innerText = this.timer.formatTime(state.playerTimes[1]);
    } else {
      if (redTime) redTime.innerText = '∞';
      if (blueTime) blueTime.innerText = '∞';
    }

    // Blitz bar update in status banner if active
    if (state.hasBlitzLimit && state.blitzRemaining > 0) {
      banner.innerHTML = `${this.engine.currentPlayer === this.mySide ? t('yourTurn') : t('opponentTurn')} | ⚡ <b>${state.blitzRemaining}s</b>`;
      if (state.blitzRemaining <= 3) {
        banner.style.color = 'var(--accent-red)';
        haptic.impact('light');
      } else {
        banner.style.color = this.engine.currentPlayer === this.mySide ? 'var(--primary)' : 'var(--text-color)';
      }
    }
  }

  handleTimeout(timedOutPlayer) {
    haptic.notification('error');
    if (timedOutPlayer === this.mySide) {
      Toast.error("Vaqtingiz tugadi! Mag'lubiyat.");
      this.handleGameFinished('lose');
    } else {
      Toast.success("Raqibingiz vaqti tugadi! G'alaba.");
      this.handleGameFinished('win');
    }
  }

  updateActivePlayerPanel() {
    const redPanel = document.getElementById('player-panel-0');
    const bluePanel = document.getElementById('player-panel-1');
    
    if (this.engine.currentPlayer === 0) {
      redPanel?.classList.add('active');
      bluePanel?.classList.remove('active');
    } else {
      bluePanel?.classList.add('active');
      redPanel?.classList.remove('active');
    }
  }

  updateStatusBanner() {
    const banner = document.getElementById('game-status-banner');
    if (!banner) return;

    if (this.timer && this.timer.blitzTime > 0) return; // Managed by timer tick

    const myTurn = this.engine.currentPlayer === this.mySide;
    banner.innerText = myTurn ? t('yourTurn') : t('opponentTurn');
    
    if (myTurn) {
      banner.style.color = 'var(--primary)';
      banner.classList.add('my-turn');
    } else {
      banner.style.color = 'var(--text-color)';
      banner.classList.remove('my-turn');
    }
  }

  async handleGameFinished(result) {
    this.timer.destroy();
    
    // Save locally
    const isWin = result === 'win';
    if (isWin) Sound.win(); else Sound.lose();
    await StorageManager.recordGameResult(result);
    
    // Redirect to Result Screen
    this.router.navigate('result', {
      result, // 'win' or 'lose'
      vs: this.vs,
      roomCode: this.params.roomCode,
      boardSize: this.boardSize,
      initialWalls: this.wallsCount,
      mode: this.mode,
      totalTime: this.params.totalTime || 0,
      blitzTime: this.params.blitzTime || 0,
      difficulty: this.params.difficulty,
      moveHistory: this.engine.moveHistory,
      playerSide: this.mySide,
      opponent: this.opponentUser
    });
  }

  destroy() {
    if (this.timer) {
      this.timer.destroy();
    }
    if (this.boardRenderer && typeof this.boardRenderer.destroy === 'function') {
      this.boardRenderer.destroy();
    }
    if (this._closeEmoji) {
      document.removeEventListener('click', this._closeEmoji);
      this._closeEmoji = null;
    }
    
    // Turn off sockets
    if (this.vs !== 'bot') {
      socket.off('opponent_moved', this.onOpponentMoved);
      socket.off('opponent_wall', this.onOpponentWall);
      socket.off('game_emoji', this.onEmojiReceived);
      socket.off('opponent_resigned', this.onOpponentResigned);
      socket.off('opponent_disconnected', this.onOpponentDisconnected);
      socket.off('opponent_reconnected', this.onOpponentReconnected);
      socket.off('game_chat', this.onChatMessage);
    }
  }
}
export default GameScreen;
