import { QuoridorEngine } from '../game/quoridor.js';
import { db } from '../db/database.js';

export class Room {
  constructor(roomCode, config) {
    this.roomCode = roomCode;
    this.config = {
      mode: config.mode || 'duel',
      boardSize: config.boardSize || 9,
      totalTime: config.totalTime || 300,
      blitzTime: config.blitzTime || 0,
      wallsCount: config.wallsCount || 10
    };
    
    // Players: array of { id, first_name, username, ws }
    this.players = [];
    this.engine = new QuoridorEngine(this.config.boardSize, this.config.wallsCount, this.config.mode);
    
    // Sides: index 0 = Red (player 1), index 1 = Blue (player 2)
    // Map playerId -> side (0 or 1)
    this.playerSides = {};
    
    // Rematch flags: set of playerId
    this.rematchRequests = new Set();
    
    // Disconnect timers: playerId -> setTimeout ID
    this.disconnectTimers = {};
    
    this.isFinished = false;
    this.isStarted = false;
    this.isPrivate = config.isPrivate || false;
  }

  addPlayer(player) {
    if (this.players.length >= 2) return false;
    
    this.players.push(player);
    return true;
  }

  removePlayer(playerId) {
    this.players = this.players.filter(p => p.id !== playerId);
  }

  getPlayer(playerId) {
    return this.players.find(p => p.id === playerId);
  }

  getOpponent(playerId) {
    return this.players.find(p => p.id !== playerId);
  }

  start() {
    if (this.players.length !== 2) return;

    // Randomize starting sides (Red = 0, Blue = 1)
    const shuffled = [...this.players].sort(() => Math.random() - 0.5);
    this.playerSides[shuffled[0].id] = 0; // Red
    this.playerSides[shuffled[1].id] = 1; // Blue

    this.isStarted = true;

    // Notify players that game starts
    this.players.forEach(player => {
      const mySide = this.playerSides[player.id];
      const opponent = this.getOpponent(player.id);
      
      this.sendTo(player.id, 'match_found', {
        roomCode: this.roomCode,
        side: mySide,
        config: this.config,
        opponent: {
          id: opponent.id,
          first_name: opponent.first_name,
          username: opponent.username
        }
      });
    });
  }

  // Handle pawn move from player
  handleMove(playerId, r, c) {
    const side = this.playerSides[playerId];
    if (typeof side === 'undefined') return false;

    const success = this.engine.movePawn(r, c, side);
    if (success) {
      // Broadcast move to opponent
      const opponent = this.getOpponent(playerId);
      if (opponent) {
        this.sendTo(opponent.id, 'opponent_moved', { r, c });
      }
      this.checkWinner();
      return true;
    }
    return false;
  }

  // Handle wall place from player
  handleWall(playerId, r, c, type) {
    const side = this.playerSides[playerId];
    if (typeof side === 'undefined') return false;

    const success = this.engine.placeWall(r, c, type, side);
    if (success) {
      // Broadcast wall to opponent
      const opponent = this.getOpponent(playerId);
      if (opponent) {
        this.sendTo(opponent.id, 'opponent_wall', { r, c, wallType: type });
      }
      this.checkWinner();
      return true;
    }
    return false;
  }

  checkWinner() {
    if (this.engine.winner !== -1) {
      this.finish(this.engine.winner);
    }
  }

  finish(winningSide) {
    if (this.isFinished) return;
    this.isFinished = true;

    const winningPlayer = this.players.find(p => this.playerSides[p.id] === winningSide);
    const losingPlayer = this.players.find(p => this.playerSides[p.id] === 1 - winningSide);

    // Save to DB
    if (winningPlayer && losingPlayer) {
      db.updateStats(winningPlayer.id, losingPlayer.id, false);
      // Reward coins for the shop: winner gets more, loser a small consolation.
      try {
        db.addCoins(winningPlayer.id, 30);
        db.addCoins(losingPlayer.id, 10);
        this.sendTo(winningPlayer.id, 'coins_awarded', { amount: 30 });
        this.sendTo(losingPlayer.id, 'coins_awarded', { amount: 10 });
      } catch (e) { /* ignore */ }
      db.saveGame({
        playerRed: this.players.find(p => this.playerSides[p.id] === 0).id,
        playerBlue: this.players.find(p => this.playerSides[p.id] === 1).id,
        winner: winningSide,
        mode: this.config.mode,
        boardSize: this.config.boardSize,
        totalTime: this.config.totalTime,
        blitzTime: this.config.blitzTime,
        wallsCount: this.config.wallsCount,
        moves: this.engine.moveHistory
      });
    }
  }

  // Disconnection handler with 30-second grace period
  handleDisconnect(playerId) {
    // Clear old timer if exists
    if (this.disconnectTimers[playerId]) {
      clearTimeout(this.disconnectTimers[playerId]);
    }

    const opponent = this.getOpponent(playerId);
    if (opponent) {
      this.sendTo(opponent.id, 'opponent_disconnected', null);
      
      // Setup timeout to auto-resign disconnected player
      this.disconnectTimers[playerId] = setTimeout(() => {
        if (!this.getPlayer(playerId)?.ws) { // Check if still disconnected
          this.sendTo(opponent.id, 'opponent_resigned', null);
          this.finish(this.playerSides[opponent.id]);
        }
      }, 30000); // 30s grace time
    }
  }

  // Reconnection handler inside grace period
  handleReconnect(player) {
    if (this.disconnectTimers[player.id]) {
      clearTimeout(this.disconnectTimers[player.id]);
      delete this.disconnectTimers[player.id];
    }

    // Update player socket reference
    const existing = this.getPlayer(player.id);
    if (existing) {
      existing.ws = player.ws;
    }

    const opponent = this.getOpponent(player.id);
    if (opponent) {
      this.sendTo(opponent.id, 'opponent_reconnected', null);
    }
  }

  sendTo(playerId, type, payload) {
    const player = this.getPlayer(playerId);
    if (player && player.ws && player.ws.readyState === 1) { // OPEN
      player.ws.send(JSON.stringify({ type, payload }));
    }
  }
}

class RoomManager {
  constructor() {
    this.rooms = {}; // key: roomCode -> Room
  }

  createRoom(config) {
    const roomCode = Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit code
    const room = new Room(roomCode, config);
    this.rooms[roomCode] = room;
    return room;
  }

  getRoom(roomCode) {
    return this.rooms[roomCode] || null;
  }

  getRoomByPlayerId(playerId) {
    return Object.values(this.rooms).find(room => room.players.some(p => p.id === playerId));
  }

  deleteRoom(roomCode) {
    const room = this.rooms[roomCode];
    if (room) {
      // Clear timers
      Object.values(room.disconnectTimers).forEach(clearTimeout);
      delete this.rooms[roomCode];
    }
  }

  // Snapshot of all active rooms for the admin panel.
  getActiveRooms() {
    return Object.values(this.rooms).map(room => ({
      roomCode: room.roomCode,
      isPrivate: room.isPrivate,
      isStarted: room.isStarted,
      isFinished: room.isFinished,
      playerCount: room.players.length,
      players: room.players.map(p => p.first_name || p.username || String(p.id)),
      mode: room.config.mode,
      boardSize: room.config.boardSize,
      currentPlayer: room.engine ? room.engine.currentPlayer : null,
      moves: room.engine ? room.engine.moveHistory.length : 0
    }));
  }
}

export const roomManager = new RoomManager();
export default roomManager;
