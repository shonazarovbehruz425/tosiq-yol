import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Pick a writable directory for the local db.json copy.
// Order: DATA_DIR (e.g. a Render persistent disk) -> server folder -> OS temp.
function resolveDataDir() {
  const candidates = [
    process.env.DATA_DIR,
    path.join(__dirname, '..'),
    os.tmpdir()
  ].filter(Boolean);

  for (const dir of candidates) {
    try {
      fs.mkdirSync(dir, { recursive: true });
      // Verify we can actually write here
      const probe = path.join(dir, '.write-test');
      fs.writeFileSync(probe, 'ok');
      fs.unlinkSync(probe);
      return dir;
    } catch (e) {
      // try next candidate
    }
  }
  return os.tmpdir();
}

const DATA_DIR = resolveDataDir();
const DB_PATH = path.join(DATA_DIR, 'db.json');

class JSONDatabase {
  constructor() {
    this.data = {
      users: {},   // key: telegram_id -> { id, username, first_name, rating, wins, losses, draws }
      games: []    // list of { id, player_red, player_blue, winner, moves, time }
    };
    // Optional remote persistence hook (set by Telegram channel store)
    this.onPersist = null;
    this._persistTimer = null;
    this.init();
  }

  init() {
    try {
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

  // Replace all data (used when restoring from the Telegram channel)
  replaceData(newData) {
    if (newData && typeof newData === 'object') {
      this.data = {
        users: newData.users || {},
        games: newData.games || []
      };
      // Write to local file but don't trigger a remote re-upload
      try {
        fs.writeFileSync(DB_PATH, JSON.stringify(this.data, null, 2), 'utf8');
      } catch (e) { /* ignore */ }
      console.log(`[db] Restored ${Object.keys(this.data.users).length} users from remote store`);
    }
  }

  serialize() {
    return JSON.stringify(this.data, null, 2);
  }

  save() {
    try {
      fs.writeFileSync(DB_PATH, this.serialize(), 'utf8');
    } catch (err) {
      console.error('Failed to save local JSON database:', err.code || err.message);
    }
    // Debounced remote persistence (Telegram channel), if configured
    this.scheduleRemoteSave();
  }

  scheduleRemoteSave() {
    if (typeof this.onPersist !== 'function') return;
    if (this._persistTimer) return; // already scheduled within the window
    this._persistTimer = setTimeout(() => {
      this._persistTimer = null;
      try { this.onPersist(this.serialize()); } catch (e) { /* ignore */ }
    }, 8000); // batch writes; upload at most every 8s
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

  // Set the user's country resolved from their IP (code: ISO-2, e.g. "UZ")
  setUserCountry(telegramId, code, name) {
    const u = this.data.users[telegramId];
    if (u && code) {
      u.country_code = code;
      u.country_name = name || code;
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
        country_code: u.country_code || '',
        country_name: u.country_name || '',
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
