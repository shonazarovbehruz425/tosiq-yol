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
          <div class="emoji-reactions">
            <button class="emoji-btn" data-emoji="😠">😠</button>
            <button class="emoji-btn" data-emoji="😂">😂</button>
            <button class="emoji-btn" data-emoji="😱">😱</button>
            <button class="emoji-btn" data-emoji="🤯">🤯</button>
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

    // 6. Bind Emoji Buttons
    const emojiBtns = document.querySelectorAll('.emoji-btn');
    emojiBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const emoji = btn.dataset.emoji;
        haptic.impact('light');
        
        // Spawn locally
        FloatingEmoji.spawn(emoji, document.getElementById('game-page-container'), btn.getBoundingClientRect());
        
        if (this.vs !== 'bot') {
          // Send to opponent online
          socket.send('game_emoji', { roomCode: this.params.roomCode, emoji });
        }
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
    }
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

    // 4. Trigger AI bot if vs bot
    if (this.vs === 'bot' && this.engine.currentPlayer !== this.mySide) {
      setTimeout(() => {
        this.runBotAI();
      }, 600); // 600ms artificial delay to look human
    }
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
    // Find the opponent panel rect to anchor emoji explosion
    const oppIdx = 1 - this.mySide;
    const oppPanel = document.getElementById(`player-panel-${oppIdx}`);
    FloatingEmoji.spawn(data.emoji, document.getElementById('game-page-container'), oppPanel?.getBoundingClientRect());
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
    
    // Turn off sockets
    if (this.vs !== 'bot') {
      socket.off('opponent_moved', this.onOpponentMoved);
      socket.off('opponent_wall', this.onOpponentWall);
      socket.off('game_emoji', this.onEmojiReceived);
      socket.off('opponent_resigned', this.onOpponentResigned);
      socket.off('opponent_disconnected', this.onOpponentDisconnected);
      socket.off('opponent_reconnected', this.onOpponentReconnected);
    }
  }
}
export default GameScreen;
