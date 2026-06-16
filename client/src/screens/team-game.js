import { t } from '../core/i18n.js';
import { haptic } from '../core/telegram.js';
import { Sound, setSoundEnabled } from '../core/sound.js';
import { StorageManager } from '../core/storage.js';
import { TeamEngine } from '../game/team-logic.js';
import { TeamAI } from '../game/team-ai.js';
import { socket } from '../core/websocket.js';
import { Modal } from '../components/modal.js';
import { Toast } from '../components/toast.js';
import { Confetti } from '../game/animations.js';
import { sizeBoard } from '../game/board-shift.js';

// 2v2 Team game. Two flavours:
//  - Local  (params.online falsy): human is player 0, AI controls 1,2,3.
//  - Online (params.online):       4 humans, the server drives turns.
export class TeamGameScreen {
  constructor(router, params) {
    this.router = router;
    this.params = params || {};
    this.online = params.online === true;
    this.boardSize = this.params.boardSize || 11;
    this.wallsPerTeam = this.params.wallsCount || this.params.wallsPerTeam || 10;

    this.engine = new TeamEngine(this.boardSize, this.wallsPerTeam);
    // Online: my slot from the server. Local: I'm player 0.
    this.mySide = this.online ? (this.params.slot || 0) : 0;
    this.ai = this.online ? {} : { 1: new TeamAI(1), 2: new TeamAI(2), 3: new TeamAI(3) };
    this.names = this.params.players || null; // online: [{id,slot,name}]

    this.cellElements = {};
    this.pawnElements = [null, null, null, null];
    this.wallMode = null;

    this.onTeamMoved = this.onTeamMoved.bind(this);
    this.onTeamWall = this.onTeamWall.bind(this);
    this.onTeamFinished = this.onTeamFinished.bind(this);
    this.onTeamPlayerLeft = this.onTeamPlayerLeft.bind(this);
  }

  render() {
    return `
      <div class="game-container screen-enter" id="team-page">
        <div class="game-header">
          <button class="game-logo-btn" id="logo-btn">
            <span class="game-logo-mark">
              <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 15v-3h-6v-2h6V7l4 4-4 4M5 15l-4-4 4-4v3h6v2H5v3"/>
              </svg>
            </span>
            <span class="game-logo-text">${t('appName')}</span>
          </button>
          <button class="give-up-btn" id="exit-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            <span>${t('back')}</span>
          </button>
        </div>

        <div class="team-status">
          <div class="team-chip team0" id="team0-chip">
            <span class="team-dot"></span> ${t('teamBlue')}
            <span class="team-walls" id="team0-walls">🚧 ${this.wallsPerTeam}</span>
          </div>
          <div class="team-chip team1" id="team1-chip">
            <span class="team-dot"></span> ${t('teamRed')}
            <span class="team-walls" id="team1-walls">🚧 ${this.wallsPerTeam}</span>
          </div>
        </div>

        <div class="turn-banner" id="team-banner">${t('yourTurn')}</div>

        <div class="board-wrapper" id="team-board"></div>

        <div class="game-controls">
          <button class="btn ${'btn-secondary'} team-wall-btn" id="wall-h-btn">━ ${t('horizontal')}</button>
          <button class="btn btn-secondary team-wall-btn" id="wall-v-btn">┃ ${t('vertical')}</button>
        </div>
      </div>
    `;
  }

  async afterRender() {
    const settings = await StorageManager.loadSettings();
    setSoundEnabled(settings.sound);

    if (this.online) {
      socket.on('team_moved', this.onTeamMoved);
      socket.on('team_wall', this.onTeamWall);
      socket.on('team_finished', this.onTeamFinished);
      socket.on('team_player_left', this.onTeamPlayerLeft);
    }

    this.buildBoard();
    this.updatePawns();
    this.updateBanner();

    // Brief intro so players understand the objective. After the board flip,
    // every player's own goal line is visually at the TOP of their screen.
    Toast.info(t('teamGoalHint'));

    document.getElementById('logo-btn').addEventListener('click', () => this.confirmExit());
    document.getElementById('exit-btn').addEventListener('click', () => this.confirmExit());

    const hBtn = document.getElementById('wall-h-btn');
    const vBtn = document.getElementById('wall-v-btn');
    hBtn.addEventListener('click', () => this.toggleWallMode('H', hBtn, vBtn));
    vBtn.addEventListener('click', () => this.toggleWallMode('V', vBtn, hBtn));
  }

  toggleWallMode(type, btn, other) {
    if (this.engine.currentPlayer !== this.mySide || this.engine.winner !== -1) return;
    const myTeam = this.engine.team(this.mySide);
    if (this.engine.teamWallsLeft[myTeam] <= 0) { Toast.warning("To'siqlar tugadi!"); return; }
    this.wallMode = this.wallMode === type ? null : type;
    btn.classList.toggle('active', this.wallMode === type);
    other.classList.remove('active');
    this.renderWallSlots();
  }

  buildBoard() {
    const container = document.getElementById('team-board');
    container.innerHTML = '';
    const N = this.boardSize;
    const board = document.createElement('div');
    board.className = 'board';
    if (N >= 13) board.classList.add('gap-xs');
    else if (N >= 11) board.classList.add('gap-sm');

    const tracks = [];
    for (let i = 0; i < N; i++) {
      tracks.push('1fr');
      if (i < N - 1) tracks.push('var(--wall-gap, 10px)');
    }
    board.style.gridTemplateColumns = tracks.join(' ');
    board.style.gridTemplateRows = tracks.join(' ');

    this.cellElements = {};
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.style.gridRow = `${r * 2 + 1}`;
        cell.style.gridColumn = `${c * 2 + 1}`;
        // Goal lines: team 0 (blue) finishes at the top (row 0),
        // team 1 (red) finishes at the bottom (row N-1).
        if (r === 0) {
          const g = document.createElement('div');
          g.className = 'goal-line-blue';
          cell.appendChild(g);
        }
        if (r === N - 1) {
          const g = document.createElement('div');
          g.className = 'goal-line-red';
          cell.appendChild(g);
        }
        cell.addEventListener('click', () => this.onCellClick(r, c));
        board.appendChild(cell);
        this.cellElements[`${r},${c}`] = cell;
      }
    }
    this.boardDiv = board;
    container.appendChild(board);
    // Flip the board 180° for red-team players so their own pawn sits at the
    // bottom moving up — the natural perspective (same as 1v1).
    if (this.engine.team(this.mySide) === 1) {
      container.classList.add('board-flipped');
    }
    this.drawWalls();
    this.renderValidMoves();
    // Size the board in JS (square px) — old desktop WebViews lack aspect-ratio.
    if (this._detachSize) this._detachSize();
    this._detachSize = sizeBoard(container);
  }

  onCellClick(r, c) {
    if (this.engine.currentPlayer !== this.mySide || this.engine.winner !== -1) return;
    const cell = this.cellElements[`${r},${c}`];
    if (!cell.classList.contains('valid-move')) return;

    if (this.online) {
      // Server is authoritative — send and wait for the broadcast.
      socket.send('team_move', { roomCode: this.params.roomCode, r, c });
      return;
    }
    if (this.engine.movePawn(r, c, this.mySide)) {
      Sound.move();
      haptic.impact('light');
      this.afterHumanTurn();
    }
  }

  // Wall placement: tap a slot between cells.
  renderWallSlots() {
    this.boardDiv.querySelectorAll('.wall-slot').forEach(s => s.remove());
    if (!this.wallMode || this.engine.currentPlayer !== this.mySide) return;
    const N = this.boardSize;
    for (let r = 0; r < N - 1; r++) {
      for (let c = 0; c < N - 1; c++) {
        if (!this.engine.isValidWall(r, c, this.wallMode)) continue;
        const slot = document.createElement('div');
        slot.className = 'wall-slot wall-slot-active';
        if (this.wallMode === 'H') {
          slot.style.gridRow = `${r * 2 + 2}`;
          slot.style.gridColumn = `${c * 2 + 1} / span 3`;
        } else {
          slot.style.gridRow = `${r * 2 + 1} / span 3`;
          slot.style.gridColumn = `${c * 2 + 2}`;
        }
        slot.addEventListener('click', (e) => {
          e.stopPropagation();
          if (this.online) {
            socket.send('team_wall', { roomCode: this.params.roomCode, r, c, wallType: this.wallMode });
            this.wallMode = null;
            document.querySelectorAll('.team-wall-btn').forEach(b => b.classList.remove('active'));
            this.boardDiv.querySelectorAll('.wall-slot').forEach(s => s.remove());
            return;
          }
          if (this.engine.placeWall(r, c, this.wallMode, this.mySide)) {
            Sound.wall();
            haptic.impact('medium');
            this.wallMode = null;
            document.querySelectorAll('.team-wall-btn').forEach(b => b.classList.remove('active'));
            this.afterHumanTurn();
          }
        });
        this.boardDiv.appendChild(slot);
      }
    }
  }

  afterHumanTurn() {
    this.drawWalls();
    this.updatePawns();
    this.updateWalls();
    this.wallMode = null;
    document.querySelectorAll('.team-wall-btn').forEach(b => b.classList.remove('active'));
    this.boardDiv.querySelectorAll('.wall-slot').forEach(s => s.remove());

    if (this.checkEnd()) return;
    this.runAITurns();
  }

  // Run AI players until it's the human's turn again (or game ends).
  runAITurns() {
    this.updateBanner();
    this.renderValidMoves();
    if (this.engine.currentPlayer === this.mySide || this.engine.winner !== -1) return;

    setTimeout(() => {
      const cur = this.engine.currentPlayer;
      if (cur === this.mySide || this.engine.winner !== -1) return;
      const ai = this.ai[cur];
      const mv = ai.getMove(this.engine);
      if (mv) {
        if (mv.type === 'move') { this.engine.movePawn(mv.r, mv.c, cur); Sound.move(); }
        else { this.engine.placeWall(mv.r, mv.c, mv.wallType, cur); Sound.wall(); }
      } else {
        // Safety: skip if somehow stuck.
        const lm = this.engine.getValidMoves(cur);
        if (lm.length) this.engine.movePawn(lm[0].r, lm[0].c, cur);
      }
      this.drawWalls();
      this.updatePawns();
      this.updateWalls();
      if (this.checkEnd()) return;
      this.runAITurns();
    }, 450);
  }

  checkEnd() {
    if (this.engine.winner === -1) return false;
    // Online: the server's team_finished event drives the end screen.
    if (this.online) return true;
    const iWon = this.engine.winner === this.engine.team(this.mySide);
    setTimeout(() => this.finish(iWon ? 'win' : 'lose'), 400);
    return true;
  }

  renderValidMoves() {
    Object.values(this.cellElements).forEach(c => c.classList.remove('valid-move'));
    if (this.engine.currentPlayer !== this.mySide || this.engine.winner !== -1) return;
    this.engine.getValidMoves(this.mySide).forEach(m => {
      const cell = this.cellElements[`${m.r},${m.c}`];
      if (cell) cell.classList.add('valid-move');
    });
  }

  updatePawns() {
    // Team 0 = blue (players 0,2), Team 1 = red (players 1,3).
    // Your pawn gets a bright ring; your teammate gets a small star marker so
    // you can instantly tell friend from foe.
    this.pawnElements.forEach(p => p?.remove());
    const myTeam = this.engine.team(this.mySide);
    for (let i = 0; i < 4; i++) {
      const pos = this.engine.pawnPos[i];
      const cell = this.cellElements[`${pos.r},${pos.c}`];
      if (!cell) continue;
      const pawn = document.createElement('div');
      const color = this.engine.team(i) === 0 ? 'blue' : 'red';
      let extra = '';
      if (i === this.mySide) extra = ' pawn-me';
      else if (this.engine.team(i) === myTeam) extra = ' pawn-mate';
      pawn.className = `pawn pawn-${color}${extra}`;
      if (i === this.mySide) pawn.innerHTML = '<span class="pawn-tag">★</span>';
      cell.appendChild(pawn);
      this.pawnElements[i] = pawn;
    }
    this.renderValidMoves();
  }

  drawWalls() {
    this.boardDiv.querySelectorAll('.wall:not(.wall-preview)').forEach(w => w.remove());
    this.engine.walls.forEach(w => {
      const el = document.createElement('div');
      el.className = `wall wall-${w.team === 0 ? 'blue' : 'red'}`;
      if (w.type === 'H') {
        el.style.gridRow = `${w.r * 2 + 2}`;
        el.style.gridColumn = `${w.c * 2 + 1} / span 3`;
      } else {
        el.style.gridRow = `${w.r * 2 + 1} / span 3`;
        el.style.gridColumn = `${w.c * 2 + 2}`;
      }
      this.boardDiv.appendChild(el);
    });
  }

  updateWalls() {
    const a = document.getElementById('team0-walls');
    const b = document.getElementById('team1-walls');
    if (a) a.innerText = `🚧 ${this.engine.teamWallsLeft[0]}`;
    if (b) b.innerText = `🚧 ${this.engine.teamWallsLeft[1]}`;
  }

  updateBanner() {
    const banner = document.getElementById('team-banner');
    if (!banner) return;
    const cur = this.engine.currentPlayer;
    if (this.engine.winner !== -1) return;
    if (cur === this.mySide) {
      banner.innerText = t('yourTurn');
      banner.classList.add('my-turn');
    } else {
      const who = this.engine.team(cur) === 0 ? t('teammateTurn') : t('opponentTurn');
      banner.innerText = who;
      banner.classList.remove('my-turn');
    }
    // Highlight active team chip.
    document.getElementById('team0-chip')?.classList.toggle('active', this.engine.team(cur) === 0);
    document.getElementById('team1-chip')?.classList.toggle('active', this.engine.team(cur) === 1);
  }

  confirmExit() {
    Modal.show({
      title: t('surrender'),
      message: t('surrenderConfirm'),
      confirmText: t('confirm'),
      cancelText: t('cancel'),
      onConfirm: () => this.router.navigate('home')
    });
  }

  finish(result) {
    if (result === 'win') {
      Confetti.spawn(document.getElementById('team-page'));
      haptic.notification('success');
    } else {
      haptic.notification('error');
    }
    Modal.show({
      title: result === 'win' ? t('victory') : t('defeat'),
      message: result === 'win' ? t('victoryDesc') : t('defeatDesc'),
      confirmText: this.online ? t('menu') : t('rematch'),
      cancelText: this.online ? null : t('menu'),
      barrierDismissible: false,
      onConfirm: () => {
        if (this.online) this.router.navigate('home');
        else this.router.navigate('team-game', { ...this.params });
      },
      onCancel: () => this.router.navigate('home')
    });
  }

  // ===== Online event handlers (server-authoritative) =====
  onTeamMoved(data) {
    if (!data) return;
    this.engine.movePawn(data.r, data.c, data.slot);
    Sound.move();
    this.drawWalls();
    this.updatePawns();
    this.updateBanner();
    this.checkEnd();
  }

  onTeamWall(data) {
    if (!data) return;
    this.engine.placeWall(data.r, data.c, data.wallType, data.slot);
    Sound.wall();
    this.drawWalls();
    this.updatePawns();
    this.updateWalls();
    this.updateBanner();
    this.renderValidMoves();
    this.checkEnd();
  }

  onTeamFinished(data) {
    const winningTeam = data && data.winningTeam;
    if (this.engine.winner === -1) this.engine.winner = winningTeam;
    const iWon = winningTeam === this.engine.team(this.mySide);
    setTimeout(() => this.finish(iWon ? 'win' : 'lose'), 400);
  }

  onTeamPlayerLeft(data) {
    Toast.warning(t('opponentLeft') || "O'yinchi chiqib ketdi");
  }

  destroy() {
    if (this._detachSize) { this._detachSize(); this._detachSize = null; }
    if (this.online) {
      socket.off('team_moved', this.onTeamMoved);
      socket.off('team_wall', this.onTeamWall);
      socket.off('team_finished', this.onTeamFinished);
      socket.off('team_player_left', this.onTeamPlayerLeft);
      socket.send('leave_team_room', { roomCode: this.params.roomCode });
    }
  }
}

export default TeamGameScreen;
