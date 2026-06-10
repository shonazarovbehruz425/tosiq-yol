import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Persist data outside the (ephemeral) deploy directory when DATA_DIR is set.
// On Render, attach a Persistent Disk and set DATA_DIR=/data so the database
// survives redeploys/restarts. Without it, falls back to the local file.
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..');
const DB_PATH = path.join(DATA_DIR, 'db.json');

class JSONDatabase {
  constructor() {
    this.data = {
      users: {},   // key: telegram_id -> { id, username, first_name, rating, wins, losses, draws }
      games: []    // list of { id, player_red, player_blue, winner, moves, time }
    };
    this.init();
  }

  init() {
    try {
      // Ensure the data directory exists (e.g. a freshly mounted disk)
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_PATH)) {
        const fileContent = fs.readFileSync(DB_PATH, 'utf8');
        this.data = JSON.parse(fileContent);
        console.log(`[db] Loaded ${Object.keys(this.data.users || {}).length} users from ${DB_PATH}`);
      } else {
        this.save();
        console.log(`[db] Created new database at ${DB_PATH}`);
      }
    } catch (err) {
      console.error('Failed to initialize JSON database, resetting:', err);
      this.save();
    }
  }

  save() {
    try {
      fs.writeFileSync(DB_PATH, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (err) {
      console.error('Failed to save JSON database:', err);
    }
  }

  // Users
  getUser(telegramId) {
    return this.data.users[telegramId] || null;
  }

  saveUser(telegramId, userProfile) {
    const existing = this.data.users[telegramId];
    // Telegram provides language_code (e.g. "uz", "en", "ru") — use it for country/flag
    const langCode = userProfile.language_code || userProfile.lang || '';
    if (!existing) {
      this.data.users[telegramId] = {
        id: telegramId,
        username: userProfile.username || '',
        first_name: userProfile.first_name || 'Anonymous',
        lang: userProfile.lang || 'en',
        language_code: langCode,
        rating: 1000,
        wins: 0,
        losses: 0,
        draws: 0,
        created_at: new Date().toISOString(),
        last_seen: new Date().toISOString()
      };
    } else {
      // Update names (preserve lang and stats)
      this.data.users[telegramId].username = userProfile.username || existing.username;
      this.data.users[telegramId].first_name = userProfile.first_name || existing.first_name;
      if (langCode) this.data.users[telegramId].language_code = langCode;
      this.data.users[telegramId].last_seen = new Date().toISOString();
    }
    this.save();
    return this.data.users[telegramId];
  }

  // Set the user's preferred language (uz | en | ru ...)
  setUserLang(telegramId, lang) {
    const u = this.data.users[telegramId];
    if (u) {
      u.lang = lang;
      this.save();
    }
    return u;
  }

  // Stats updates
  updateStats(winnerId, loserId, isDraw = false) {
    const winner = this.data.users[winnerId];
    const loser = this.data.users[loserId];

    if (isDraw) {
      if (winner) winner.draws++;
      if (loser) loser.draws++;
    } else {
      if (winner) {
        winner.wins++;
        winner.rating += 25;
      }
      if (loser) {
        loser.losses++;
        loser.rating = Math.max(100, loser.rating - 20); // Floor rating at 100
      }
    }
    this.save();
  }

  // Game records
  saveGame(gameRecord) {
    const record = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11),
      player_red: gameRecord.playerRed,
      player_blue: gameRecord.playerBlue,
      winner: gameRecord.winner, // 0 = Red, 1 = Blue, -1 = Draw
      mode: gameRecord.mode || 'duel',
      boardSize: gameRecord.boardSize,
      totalTime: gameRecord.totalTime,
      blitzTime: gameRecord.blitzTime,
      wallsCount: gameRecord.wallsCount,
      moves: gameRecord.moves, // moves history
      created_at: new Date().toISOString()
    };
    
    this.data.games.push(record);
    this.save();
    return record;
  }

  getLeaderboard() {
    return Object.values(this.data.users)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 10)
      .map(u => ({
        first_name: u.first_name,
        username: u.username,
        rating: u.rating,
        wins: u.wins,
        losses: u.losses
      }));
  }

  // ===== Admin helpers =====

  // Aggregate summary used by the admin dashboard.
  getAdminSummary() {
    const users = Object.values(this.data.users);
    const games = this.data.games;

    const totalGames = games.length;
    const totalUsers = users.length;
    const totalWins = users.reduce((s, u) => s + (u.wins || 0), 0);
    const totalLosses = users.reduce((s, u) => s + (u.losses || 0), 0);
    const totalDraws = users.reduce((s, u) => s + (u.draws || 0), 0);

    // Games in the last 24 hours
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const gamesToday = games.filter(g => g.created_at && new Date(g.created_at).getTime() >= dayAgo).length;

    // Board size & mode distribution + average moves
    const boardSizes = {};
    const modes = {};
    let totalMoves = 0;
    games.forEach(g => {
      const bs = `${g.boardSize || '?'}x${g.boardSize || '?'}`;
      boardSizes[bs] = (boardSizes[bs] || 0) + 1;
      const m = g.mode || 'duel';
      modes[m] = (modes[m] || 0) + 1;
      totalMoves += Array.isArray(g.moves) ? g.moves.length : 0;
    });

    return {
      totalUsers,
      totalGames,
      gamesToday,
      totalWins,
      totalLosses,
      totalDraws,
      avgMovesPerGame: totalGames ? Math.round(totalMoves / totalGames) : 0,
      boardSizes,
      modes
    };
  }

  // All users sorted by most recently seen (full list for the admin table).
  getAllUsers() {
    return Object.values(this.data.users)
      .sort((a, b) => new Date(b.last_seen || b.created_at || 0) - new Date(a.last_seen || a.created_at || 0))
      .map(u => ({
        id: u.id,
        first_name: u.first_name,
        username: u.username,
        language_code: u.language_code || u.lang || '',
        rating: u.rating,
        wins: u.wins,
        losses: u.losses,
        draws: u.draws,
        created_at: u.created_at,
        last_seen: u.last_seen
      }));
  }

  // Most recent games (newest first), with player names resolved.
  getRecentGames(limit = 30) {
    const nameOf = (id) => {
      const u = this.data.users[id];
      return u ? (u.first_name || u.username || String(id)) : String(id);
    };
    return [...this.data.games]
      .reverse()
      .slice(0, limit)
      .map(g => ({
        id: g.id,
        red: nameOf(g.player_red),
        blue: nameOf(g.player_blue),
        winner: g.winner === 0 ? 'red' : (g.winner === 1 ? 'blue' : 'draw'),
        mode: g.mode || 'duel',
        boardSize: g.boardSize,
        moves: Array.isArray(g.moves) ? g.moves.length : 0,
        created_at: g.created_at
      }));
  }
}

export const db = new JSONDatabase();
export default db;
