// 4-player 2v2 Team rooms + matchmaking. Kept separate from the 2-player
// roomManager so the classic modes are unaffected.
import { TeamQuoridor } from '../game/team-quoridor.js';
import { db } from '../db/database.js';

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
      this.isFinished = true;
      this.broadcast('team_finished', { winningTeam: this.engine.winner });
      // Award WAYZ: winners more than losers.
      this.players.forEach(p => {
        const won = this.playerSlots[p.id] % 2 === this.engine.winner;
        try { db.addCoins(p.id, won ? 25 : 8); } catch (e) { /* ignore */ }
      });
    }
  }

  handleDisconnect(playerId) {
    if (!this.isStarted || this.isFinished) return;
    this.broadcast('team_player_left', { slot: this.playerSlots[playerId] });
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
    const code = 'T' + Math.floor(1000 + Math.random() * 9000);
    const room = new TeamRoom(code, config);
    this.rooms[code] = room;
    return room;
  }

  getRoom(code) { return this.rooms[code] || null; }
  getRoomByPlayerId(id) {
    return Object.values(this.rooms).find(r => r.players.some(p => p.id === id));
  }
  deleteRoom(code) { delete this.rooms[code]; }

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
