import { roomManager } from './rooms.js';

class MatchmakingSystem {
  constructor() {
    this.queue = []; // Array of players: { id, first_name, username, config, ws }
  }

  enter(player, config) {
    // Prevent duplicate entries
    this.leave(player.id);

    const entry = {
      id: player.id,
      first_name: player.first_name,
      username: player.username,
      ws: player.ws,
      config: {
        mode: config.mode || 'duel',
        boardSize: config.boardSize || 9,
        totalTime: config.totalTime || 300,
        blitzTime: config.blitzTime || 0,
        wallsCount: config.wallsCount || 10
      }
    };

    console.log(`Player ${player.first_name} entered matchmaking queue.`);

    // Match only players who chose the SAME game configuration (mode, board
    // size, time control, blitz increment and wall count) so nobody ends up in
    // a game with settings they didn't pick.
    const sameConfig = (a, b) =>
      a.mode === b.mode &&
      a.boardSize === b.boardSize &&
      a.totalTime === b.totalTime &&
      a.blitzTime === b.blitzTime &&
      a.wallsCount === b.wallsCount;

    const partnerIdx = this.queue.findIndex(p => sameConfig(p.config, entry.config));

    if (partnerIdx !== -1) {
      const partner = this.queue.splice(partnerIdx, 1)[0];
      console.log(`Match found! Creating room for ${entry.first_name} and ${partner.first_name}.`);

      // Create a public room
      const room = roomManager.createRoom(entry.config);
      room.addPlayer(partner);
      room.addPlayer(entry);
      room.start();
    } else {
      // Add to queue
      this.queue.push(entry);
    }
  }

  leave(playerId) {
    const originalLen = this.queue.length;
    this.queue = this.queue.filter(p => p.id !== playerId);
    if (this.queue.length < originalLen) {
      console.log(`Player with ID ${playerId} left matchmaking queue.`);
      return true;
    }
    return false;
  }
}

export const matchmaking = new MatchmakingSystem();
export default matchmaking;
