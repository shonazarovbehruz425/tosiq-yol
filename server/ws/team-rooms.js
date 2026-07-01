// 4-player 2v2 Team rooms + matchmaking. Kept separate from the 2-player
// roomManager so the classic modes are unaffected.
import { TeamQuoridor } from '../game/team-quoridor.js';
import { db } from '../db/database.js';

// How long (ms) a disconnected player has to reconnect before their team
// forfeits. Mirrors the 2-player Room grace period so flaky mobile networks
// (Telegram often suspends the WebView in the background) don't hand the win
// to the other team over a momentary drop. (issue #10)
const RECONNECT_GRACE_MS = 30000;

export class TeamRoom {
  constructor(roomCode, config) {
    this.roomCode = roomCode;
    this.config = {
      boardSize: config.boardSize || 11,
      wallsPerTeam: config.wallsPerTeam || 10
    };
    this.players = [];           // up to 4: { id, first_name, username, ws }
    this.playerSlots = {};       // playerId -> slot 0..3
    this.engine = null;
    this.isStarted = false;
    this.isFinished = false;
    // Guard so results (coins, stats, saveGame, broadcast) are only ever
    // awarded once, no matter how the game ends (win or disconnect-forfeit).
    this._settled = false;
    // playerId -> setTimeout id for the reconnect grace window.
    this.disconnectTimers = {};
  }

  addPlayer(player) {
    if (this.players.length >= 4) return false;
    this.players.push(player);
    return true;
  }

  getPlayer(id) { return this.players.find(p => p.id === id); }
  removePlayer(id) { this.players = this.players.filter(p => p.id !== id); }

  start() {
    if (this.players.length !== 4) return;
    // Assign slots 0..3 randomly. Teams alternate by parity, so shuffling slots
    // naturally mixes who is teamed with whom.
    const shuffled = [...this.players].sort(() => Math.random() - 0.5);
    shuffled.forEach((p, i) => { this.playerSlots[p.id] = i; });

    this.engine = new TeamQuoridor(this.config.boardSize, this.config.wallsPerTeam);
    this.isStarted = true;

    this.players.forEach(p => {
      const slot = this.playerSlots[p.id];
      this.sendTo(p.id, 'team_match_found', {
        roomCode: this.roomCode,
        slot,                       // 0..3
        team: slot % 2,             // 0 or 1
        config: this.config,
        players: this.players.map(x => ({
          id: x.id,
          slot: this.playerSlots[x.id],
          name: x.first_name || x.username || 'Player'
        }))
      });
    });
  }

  handleMove(playerId, r, c) {
    const slot = this.playerSlots[playerId];
    if (slot == null || !this.engine) return;
    if (this.engine.currentPlayer !== slot) return;
    if (this.engine.movePawn(r, c, slot)) {
      this.broadcast('team_moved', { slot, r, c, currentPlayer: this.engine.currentPlayer });
      this.checkWinner();
    }
  }

  handleWall(playerId, r, c, type) {
    const slot = this.playerSlots[playerId];
    if (slot == null || !this.engine) return;
    if (this.engine.currentPlayer !== slot) return;
    if (this.engine.placeWall(r, c, type, slot)) {
      this.broadcast('team_wall', {
        slot, r, c, wallType: type,
        currentPlayer: this.engine.currentPlayer,
        teamWallsLeft: this.engine.teamWallsLeft
      });
      this.checkWinner();
    }
  }

  checkWinner() {
    if (this.engine.winner !== -1 && !this.isFinished) {
      this._settle();
    }
  }

  // Finalize the match exactly once: notify players, award coins, and — unlike
  // before — persist 2v2 win/loss into stats + a game record so team results
  // show up on the leaderboard and history (issue #8).
  _settle(reason) {
    if (this._settled) return;
    this._settled = true;
    this.isFinished = true;

    // Stop any pending reconnect grace timers — the game is over.
    Object.values(this.disconnectTimers).forEach(clearTimeout);
    this.disconnectTimers = {};

    const winningTeam = this.engine.winner;
    const payload = { winningTeam };
    if (reason) payload.reason = reason;
    this.broadcast('team_finished', payload);

    // Award WAYZ: winners more than losers, and bucket players by team.
    const winners = [];
    const losers = [];
    this.players.forEach(p => {
      const won = this.playerSlots[p.id] % 2 === winningTeam;
      try { db.addCoins(p.id, won ? 25 : 8); } catch (e) { /* ignore */ }
      (won ? winners : losers).push(p);
    });

    // Persist stats/leaderboard. updateStats works on 1v1 pairs, so pair each
    // winner with a loser (2 pairs for a full 2v2).
    try {
      const n = Math.min(winners.length, losers.length);
      for (let i = 0; i < n; i++) {
        db.updateStats(winners[i].id, losers[i].id, false);
      }
    } catch (e) { /* ignore */ }

    // Record the game so it appears in history alongside 1v1 games.
    try {
      const bySlot = (slot) => this.players.find(p => this.playerSlots[p.id] === slot);
      const red = bySlot(0);
      const blue = bySlot(1);
      db.saveGame({
        playerRed: red ? red.id : null,
        playerBlue: blue ? blue.id : null,
        winner: winningTeam,
        mode: 'team',
        boardSize: this.config.boardSize,
        totalTime: 0,
        blitzTime: 0,
        wallsCount: this.config.wallsPerTeam,
        moves: (this.engine && this.engine.moveHistory) || []
      });
    } catch (e) { /* ignore */ }
  }

  // A player's socket dropped (network blip, backgrounded WebView). Instead of
  // forfeiting their team immediately, keep the room alive and give them a
  // grace window to reconnect. Only forfeit if they're still gone when it
  // elapses. (issue #10)
  handleDisconnect(playerId) {
    if (!this.isStarted || this.isFinished) return;
    const slot = this.playerSlots[playerId];
    if (slot == null) return;

    // Refresh the timer if one is already running for this player.
    if (this.disconnectTimers[playerId]) clearTimeout(this.disconnectTimers[playerId]);

    // Let teammates/opponents know this player dropped (client shows a toast);
    // the match keeps going while we wait for a reconnect.
    this.broadcast('team_player_left', { slot, disconnected: true });

    this.disconnectTimers[playerId] = setTimeout(() => {
      delete this.disconnectTimers[playerId];
      if (this.isFinished) return;
      // Reconnected on a fresh socket during the grace window? Then do nothing.
      const p = this.getPlayer(playerId);
      if (p && p.ws && p.ws.readyState === 1) return;
      // Still gone → the leaver's team forfeits, the other team wins.
      if (this.engine && this.engine.winner === -1) {
        this.engine.winner = 1 - (slot % 2);
        this._settle('left');
      }
    }, RECONNECT_GRACE_MS);
  }

  // A deliberate exit (Back button / surrender via leave_team_room). No grace
  // period — the leaver's team forfeits right away.
  handleLeave(playerId) {
    if (!this.isStarted || this.isFinished) return;
    const slot = this.playerSlots[playerId];
    if (this.disconnectTimers[playerId]) {
      clearTimeout(this.disconnectTimers[playerId]);
      delete this.disconnectTimers[playerId];
    }
    this.broadcast('team_player_left', { slot });
    if (slot != null && this.engine && this.engine.winner === -1) {
      this.engine.winner = 1 - (slot % 2); // the other team wins
      this._settle('left');
    }
  }

  // A player's socket came back within the grace window. Cancel the pending
  // forfeit, rebind their new socket, and let everyone know they're back. The
  // client keeps its own board state in memory across the drop (the screen is
  // never torn down), so there's no need to resend the full game state.
  handleReconnect(player) {
    if (this.isFinished) return;
    if (this.disconnectTimers[player.id]) {
      clearTimeout(this.disconnectTimers[player.id]);
      delete this.disconnectTimers[player.id];
    }
    const existing = this.getPlayer(player.id);
    if (existing) {
      existing.ws = player.ws; // rebind to the fresh socket
    } else {
      // Shouldn't normally happen (we never drop players on disconnect), but be
      // defensive if the player object was somehow removed.
      this.players.push(player);
    }
    const slot = this.playerSlots[player.id];
    this.broadcast('team_player_rejoined', { slot });
  }

  broadcast(type, payload) {
    this.players.forEach(p => this.sendTo(p.id, type, payload));
  }

  sendTo(playerId, type, payload) {
    const p = this.getPlayer(playerId);
    if (p && p.ws && p.ws.readyState === 1) {
      p.ws.send(JSON.stringify({ type, payload }));
    }
  }
}

class TeamRoomManager {
  constructor() {
    this.rooms = {};
    this.queue = [];   // players waiting for a 2v2 match: { id, first_name, username, ws, config }
  }

  createRoom(config) {
    // Unique team code ('T' + 4 digits); retry on collision.
    let code;
    do {
      code = 'T' + Math.floor(1000 + Math.random() * 9000);
    } while (this.rooms[code]);
    const room = new TeamRoom(code, config);
    this.rooms[code] = room;
    return room;
  }

  getRoom(code) { return this.rooms[code] || null; }
  getRoomByPlayerId(id) {
    return Object.values(this.rooms).find(r => r.players.some(p => p.id === id));
  }
  deleteRoom(code) {
    const room = this.rooms[code];
    if (room) {
      // Clear any pending grace timers so they don't fire on a dead room.
      Object.values(room.disconnectTimers).forEach(clearTimeout);
    }
    delete this.rooms[code];
  }

  // Matchmaking: collect 4 players, then start a room.
  enqueue(player, config) {
    // Avoid duplicates.
    if (this.queue.some(q => q.id === player.id)) return { waiting: this.queue.length };
    this.queue.push({ ...player, config });

    if (this.queue.length >= 4) {
      const four = this.queue.splice(0, 4);
      const room = this.createRoom(config);
      four.forEach(p => room.addPlayer({ id: p.id, first_name: p.first_name, username: p.username, ws: p.ws }));
      room.start();
      return { matched: true, roomCode: room.roomCode };
    }
    return { waiting: this.queue.length };
  }

  dequeue(id) {
    this.queue = this.queue.filter(q => q.id !== id);
  }

  queueSize() { return this.queue.length; }
}

export const teamRoomManager = new TeamRoomManager();
export default teamRoomManager;
