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

  // Set the user's chosen display name (shown on the leaderboard).
  // Only updates an EXISTING user (created via the bot /start). Returns the
  // user object on success, or null if not found.
  setDisplayName(telegramId, name) {
    const u = this.data.users[telegramId];
    if (!u) return null;
    u.display_name = name;
    u.last_seen = new Date().toISOString();
    this.save();
    return u;
  }

  // ===== Friend system =====
  // Each user gets: friends: [ids], friendRequests: { incoming: [ids], outgoing: [ids] }

  _ensureFriendFields(u) {
    if (!u) return;
    if (!Array.isArray(u.friends)) u.friends = [];
    if (!u.friendRequests || typeof u.friendRequests !== 'object') {
      u.friendRequests = { incoming: [], outgoing: [] };
    }
    if (!Array.isArray(u.friendRequests.incoming)) u.friendRequests.incoming = [];
    if (!Array.isArray(u.friendRequests.outgoing)) u.friendRequests.outgoing = [];
  }

  // Public name/flag for a user id (used by friend lists).
  publicProfile(id) {
    const u = this.data.users[String(id)];
    if (!u) return { id, name: 'Unknown', country_code: '', wins: 0, losses: 0 };
    return {
      id: u.id,
      name: u.display_name || u.first_name || (u.username ? '@' + u.username : 'Anonymous'),
      country_code: u.country_code || '',
      wins: u.wins || 0,
      losses: u.losses || 0
    };
  }

  areFriends(a, b) {
    const ua = this.data.users[String(a)];
    return !!(ua && Array.isArray(ua.friends) && ua.friends.map(String).includes(String(b)));
  }

  // Send a friend request from `fromId` to `toId`.
  // Returns { ok, error, status } where status can be 'sent' | 'already_friends' | 'accepted'.
  sendFriendRequest(fromId, toId) {
    fromId = String(fromId); toId = String(toId);
    if (fromId === toId) return { ok: false, error: 'self' };
    const from = this.data.users[fromId];
    const to = this.data.users[toId];
    if (!from) return { ok: false, error: 'sender_unknown' };
    if (!to) return { ok: false, error: 'target_unknown' };

    this._ensureFriendFields(from);
    this._ensureFriendFields(to);

    if (from.friends.map(String).includes(toId)) {
      return { ok: true, status: 'already_friends' };
    }

    // If the target already sent US a request, accept it automatically.
    if (from.friendRequests.incoming.map(String).includes(toId)) {
      this.acceptFriendRequest(fromId, toId);
      return { ok: true, status: 'accepted' };
    }

    if (!from.friendRequests.outgoing.map(String).includes(toId)) {
      from.friendRequests.outgoing.push(toId);
    }
    if (!to.friendRequests.incoming.map(String).includes(fromId)) {
      to.friendRequests.incoming.push(fromId);
    }
    this.save();
    return { ok: true, status: 'sent' };
  }

  // `meId` accepts a pending request from `otherId`.
  acceptFriendRequest(meId, otherId) {
    meId = String(meId); otherId = String(otherId);
    const me = this.data.users[meId];
    const other = this.data.users[otherId];
    if (!me || !other) return { ok: false, error: 'unknown' };

    this._ensureFriendFields(me);
    this._ensureFriendFields(other);

    // Remove from request lists
    me.friendRequests.incoming = me.friendRequests.incoming.filter(id => String(id) !== otherId);
    me.friendRequests.outgoing = me.friendRequests.outgoing.filter(id => String(id) !== otherId);
    other.friendRequests.outgoing = other.friendRequests.outgoing.filter(id => String(id) !== meId);
    other.friendRequests.incoming = other.friendRequests.incoming.filter(id => String(id) !== meId);

    // Add to friends both ways
    if (!me.friends.map(String).includes(otherId)) me.friends.push(otherId);
    if (!other.friends.map(String).includes(meId)) other.friends.push(meId);

    this.save();
    return { ok: true };
  }

  // `meId` declines a pending request from `otherId`.
  declineFriendRequest(meId, otherId) {
    meId = String(meId); otherId = String(otherId);
    const me = this.data.users[meId];
    const other = this.data.users[otherId];
    if (me) {
      this._ensureFriendFields(me);
      me.friendRequests.incoming = me.friendRequests.incoming.filter(id => String(id) !== otherId);
    }
    if (other) {
      this._ensureFriendFields(other);
      other.friendRequests.outgoing = other.friendRequests.outgoing.filter(id => String(id) !== meId);
    }
    this.save();
    return { ok: true };
  }

  removeFriend(meId, otherId) {
    meId = String(meId); otherId = String(otherId);
    const me = this.data.users[meId];
    const other = this.data.users[otherId];
    if (me) { this._ensureFriendFields(me); me.friends = me.friends.filter(id => String(id) !== otherId); }
    if (other) { this._ensureFriendFields(other); other.friends = other.friends.filter(id => String(id) !== meId); }
    this.save();
    return { ok: true };
  }

  // Full friend snapshot for a user: friends + incoming/outgoing requests as
  // public profiles. `onlineIds` is an optional Set of online user ids.
  getFriendData(meId, onlineIds = null) {
    const me = this.data.users[String(meId)];
    if (!me) return { friends: [], incoming: [], outgoing: [], suggestions: [] };
    this._ensureFriendFields(me);
    const mark = (id) => {
      const p = this.publicProfile(id);
      p.online = onlineIds ? onlineIds.has(Number(id)) || onlineIds.has(String(id)) : false;
      return p;
    };
    return {
      friends: me.friends.map(mark),
      incoming: me.friendRequests.incoming.map(mark),
      outgoing: me.friendRequests.outgoing.map(mark),
      suggestions: this.getFriendSuggestions(meId, 10, onlineIds)
    };
  }

  // Up to `limit` random users to suggest as friends — excludes self, current
  // friends, and anyone with a pending request either way.
  getFriendSuggestions(meId, limit = 10, onlineIds = null) {
    const me = this.data.users[String(meId)];
    if (!me) return [];
    this._ensureFriendFields(me);
    const exclude = new Set([String(meId)]);
    me.friends.forEach(id => exclude.add(String(id)));
    me.friendRequests.incoming.forEach(id => exclude.add(String(id)));
    me.friendRequests.outgoing.forEach(id => exclude.add(String(id)));

    const pool = Object.values(this.data.users).filter(u => !exclude.has(String(u.id)));
    // Fisher–Yates shuffle, then take `limit`.
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, limit).map(u => {
      const p = this.publicProfile(u.id);
      p.online = onlineIds ? (onlineIds.has(Number(u.id)) || onlineIds.has(String(u.id))) : false;
      return p;
    });
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

  // Update an EXISTING user without creating a new one. Returns true if found.
  // Used by the Mini App WebSocket so merely opening the app doesn't add users —
  // only the bot's /start creates accounts.
  touchUser(telegramId, userProfile = {}) {
    const u = this.data.users[telegramId];
    if (!u) return false;
    if (userProfile.username) u.username = userProfile.username;
    if (userProfile.first_name) u.first_name = userProfile.first_name;
    const langCode = userProfile.language_code || userProfile.lang;
    if (langCode) u.language_code = langCode;
    u.last_seen = new Date().toISOString();
    this.save();
    return true;
  }

  // Delete a user by Telegram id. Returns true if a user was removed.
  deleteUser(telegramId) {
    const key = String(telegramId);
    if (this.data.users[key]) {
      delete this.data.users[key];
      this.save();
      return true;
    }
    return false;
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

  getLeaderboard(limit = 20, requesterId = null) {
    const sorted = Object.values(this.data.users)
      .slice()
      // Rank by online wins (then fewer losses as a tie-breaker).
      .sort((a, b) => (b.wins || 0) - (a.wins || 0) || (a.losses || 0) - (b.losses || 0));

    const nameOf = (u) => u.display_name || u.first_name || (u.username ? '@' + u.username : 'Anonymous');

    const top = sorted.slice(0, limit).map((u, i) => ({
      rank: i + 1,
      id: u.id,
      name: nameOf(u),
      country_code: u.country_code || '',
      wins: u.wins || 0,
      losses: u.losses || 0
    }));

    // Resolve the requesting user's own rank (even if outside the top list).
    let me = null;
    if (requesterId != null) {
      const idx = sorted.findIndex(u => String(u.id) === String(requesterId));
      if (idx !== -1) {
        const u = sorted[idx];
        me = {
          rank: idx + 1,
          id: u.id,
          name: nameOf(u),
          country_code: u.country_code || '',
          wins: u.wins || 0,
          losses: u.losses || 0
        };
      }
    }

    return { top, me, total: sorted.length };
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

  // ===== Detailed analytics for the admin metric drill-downs =====

  // Helper: build a day-by-day series for the last `days` days.
  _dailySeries(items, dateField, days = 14) {
    const out = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
      out.push({ date: key, label: `${d.getMonth() + 1}/${d.getDate()}`, count: 0 });
    }
    const idx = {};
    out.forEach((o, i) => { idx[o.date] = i; });
    items.forEach(it => {
      const v = it[dateField];
      if (!v) return;
      const key = new Date(v).toISOString().slice(0, 10);
      if (key in idx) out[idx[key]].count += 1;
    });
    return out;
  }

  // Detailed view for a given metric: 'users' | 'games' | 'today' | 'active' | 'moves'
  getMetricDetail(metric) {
    const users = Object.values(this.data.users);
    const games = this.data.games;

    if (metric === 'users') {
      // Country distribution
      const byCountry = {};
      users.forEach(u => {
        const c = u.country_name || u.country_code || 'Unknown';
        byCountry[c] = (byCountry[c] || 0) + 1;
      });
      const countries = Object.entries(byCountry)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

      return {
        metric,
        total: users.length,
        series: this._dailySeries(users, 'created_at'),       // new users/day
        breakdown: { title: 'By country', items: countries }
      };
    }

    if (metric === 'games' || metric === 'today') {
      const modeCount = {};
      const sizeCount = {};
      let totalMoves = 0;
      games.forEach(g => {
        const m = g.mode || 'duel';
        modeCount[m] = (modeCount[m] || 0) + 1;
        const sz = `${g.boardSize || '?'}×${g.boardSize || '?'}`;
        sizeCount[sz] = (sizeCount[sz] || 0) + 1;
        totalMoves += Array.isArray(g.moves) ? g.moves.length : 0;
      });
      return {
        metric,
        total: games.length,
        series: this._dailySeries(games, 'created_at'),       // games/day
        breakdown: {
          title: 'By mode',
          items: Object.entries(modeCount).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)
        },
        breakdown2: {
          title: 'By board size',
          items: Object.entries(sizeCount).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)
        },
        avgMoves: games.length ? Math.round(totalMoves / games.length) : 0
      };
    }

    if (metric === 'moves') {
      // Moves-per-game distribution buckets
      const buckets = [
        { name: '1–10', min: 1, max: 10, count: 0 },
        { name: '11–20', min: 11, max: 20, count: 0 },
        { name: '21–40', min: 21, max: 40, count: 0 },
        { name: '41–70', min: 41, max: 70, count: 0 },
        { name: '70+', min: 71, max: Infinity, count: 0 }
      ];
      let totalMoves = 0;
      games.forEach(g => {
        const m = Array.isArray(g.moves) ? g.moves.length : 0;
        totalMoves += m;
        const b = buckets.find(b => m >= b.min && m <= b.max);
        if (b) b.count += 1;
      });
      return {
        metric,
        total: games.length ? Math.round(totalMoves / games.length) : 0,
        // Series: average moves per day
        series: (() => {
          const days = this._dailySeries(games, 'created_at');
          const sums = {};
          days.forEach(d => { sums[d.date] = { total: 0, n: 0 }; });
          games.forEach(g => {
            const key = g.created_at ? new Date(g.created_at).toISOString().slice(0, 10) : null;
            if (key && sums[key]) { sums[key].total += (Array.isArray(g.moves) ? g.moves.length : 0); sums[key].n += 1; }
          });
          return days.map(d => ({ ...d, count: sums[d.date].n ? Math.round(sums[d.date].total / sums[d.date].n) : 0 }));
        })(),
        breakdown: { title: 'Games by length', items: buckets.map(b => ({ name: b.name, count: b.count })) }
      };
    }

    // default (active handled live on the server side)
    return { metric, total: 0, series: this._dailySeries([], 'created_at'), breakdown: { title: '', items: [] } };
  }
}

export const db = new JSONDatabase();
export default db;
