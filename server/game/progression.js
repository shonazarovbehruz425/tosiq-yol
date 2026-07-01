// server/game/progression.js
// ────────────────────────────────────────────────────────────────────────────
// Progression layer: LEAGUES (built on top of the existing Elo rating in
// db.updateStats) + DAILY STREAK + DAILY QUESTS.
//
// All state lives inside db.data.users[id] so it is automatically persisted to
// and restored from the Telegram channel store together with the rest of the
// database (Render wipes local disk on redeploy). We only ever touch
// db.data.users and call db.save() — database.js itself is left untouched.
// ────────────────────────────────────────────────────────────────────────────
import { db } from '../db/database.js';

// ===== Leagues =====
// Rating thresholds. A player's league is derived purely from their Elo rating
// (starts at 1000). Beating stronger players climbs you faster (see Elo in
// database.js). Names are shown localized in the UI where needed.
export const LEAGUES = [
  { key: 'bronze',      name: 'Bronza',      emoji: '\u{1F949}', min: 0,    max: 999  },
  { key: 'silver',      name: 'Kumush',      emoji: '\u{1F948}', min: 1000, max: 1199 },
  { key: 'gold',        name: 'Oltin',       emoji: '\u{1F947}', min: 1200, max: 1399 },
  { key: 'platinum',    name: 'Platina',     emoji: '\u{1F48E}', min: 1400, max: 1599 },
  { key: 'diamond',     name: 'Olmos',       emoji: '\u{1F5A4}', min: 1600, max: 1799 },
  { key: 'master',      name: 'Master',      emoji: '\u{1F525}', min: 1800, max: 1999 },
  { key: 'grandmaster', name: 'Grandmaster', emoji: '\u{1F451}', min: 2000, max: Infinity }
];

// Resolve league info for a rating, including progress to the next tier.
export function getLeague(rating) {
  const r = typeof rating === 'number' ? rating : 1000;
  let i = LEAGUES.findIndex(l => r >= l.min && r <= l.max);
  if (i === -1) i = r < LEAGUES[0].min ? 0 : LEAGUES.length - 1;
  const lg = LEAGUES[i];
  const next = LEAGUES[i + 1] || null;
  return {
    key: lg.key, name: lg.name, emoji: lg.emoji, min: lg.min, max: lg.max,
    index: i, tiers: LEAGUES.length,
    next: next ? { key: next.key, name: next.name, emoji: next.emoji, min: next.min } : null,
    pointsToNext: next ? Math.max(0, next.min - r) : 0
  };
}

// Global rank by rating (1-based), with wins/losses as tie-breakers.
export function getRank(userId) {
  const users = Object.values(db.data.users || {});
  const sorted = users.slice().sort((a, b) =>
    (b.rating || 0) - (a.rating || 0) ||
    (b.wins || 0) - (a.wins || 0) ||
    (a.losses || 0) - (b.losses || 0)
  );
  const idx = sorted.findIndex(u => String(u.id) === String(userId));
  return { rank: idx === -1 ? null : idx + 1, total: sorted.length };
}

// ===== Date helpers =====
// Fixed UTC+5 (Asia/Tashkent) day boundary so streaks roll over at local
// midnight for the primary audience regardless of where the server runs.
const TZ_OFFSET_MS = 5 * 60 * 60 * 1000;
export function dateKey(ts = Date.now()) {
  return new Date(ts + TZ_OFFSET_MS).toISOString().slice(0, 10); // YYYY-MM-DD
}
function dayDiff(aKey, bKey) {
  const a = new Date(aKey + 'T00:00:00Z').getTime();
  const b = new Date(bKey + 'T00:00:00Z').getTime();
  return Math.round((b - a) / 86400000);
}

// ===== Daily quests =====
// metric values are the event names emitted by addQuestProgress().
const QUEST_POOL = [
  { id: 'play3',   metric: 'play',        goal: 3, reward: 60,  text: { uz: "3 ta o'yin o'yna",          en: 'Play 3 games',        ru: '\u0421\u044b\u0433\u0440\u0430\u0439\u0442\u0435 3 \u0438\u0433\u0440\u044b' } },
  { id: 'play5',   metric: 'play',        goal: 5, reward: 110, text: { uz: "5 ta o'yin o'yna",          en: 'Play 5 games',        ru: '\u0421\u044b\u0433\u0440\u0430\u0439\u0442\u0435 5 \u0438\u0433\u0440' } },
  { id: 'win2',    metric: 'win',         goal: 2, reward: 130, text: { uz: "2 marta g'alaba qozon",     en: 'Win 2 games',         ru: '\u0412\u044b\u0438\u0433\u0440\u0430\u0439\u0442\u0435 2 \u0438\u0433\u0440\u044b' } },
  { id: 'win3',    metric: 'win',         goal: 3, reward: 200, text: { uz: "3 marta g'alaba qozon",     en: 'Win 3 games',         ru: '\u0412\u044b\u0438\u0433\u0440\u0430\u0439\u0442\u0435 3 \u0438\u0433\u0440\u044b' } },
  { id: 'online2', metric: 'play_online', goal: 2, reward: 150, text: { uz: '2 ta onlayn jang',           en: 'Play 2 online games', ru: '2 \u043e\u043d\u043b\u0430\u0439\u043d-\u0438\u0433\u0440\u044b' } },
  { id: 'onwin1',  metric: 'win_online',  goal: 1, reward: 170, text: { uz: 'Onlaynda 1 marta yut',       en: 'Win 1 online game',   ru: '\u0412\u044b\u0438\u0433\u0440\u0430\u0439\u0442\u0435 1 \u043e\u043d\u043b\u0430\u0439\u043d' } },
  { id: 'beatai1', metric: 'beat_ai',     goal: 1, reward: 160, text: { uz: "AI ni hard+ da yeng",        en: 'Beat AI on hard+',    ru: '\u041f\u043e\u0431\u0435\u0434\u0438\u0442\u0435 \u0418\u0418 (hard+)' } }
];

// Deterministic daily selection: everyone gets the same 3 quests on a day.
function questsForDay(key) {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  const n = QUEST_POOL.length;
  const step = 1 + (h % (n - 1));
  const picks = [];
  const used = new Set();
  let idx = h % n;
  while (picks.length < 3 && used.size < n) {
    if (!used.has(idx)) { used.add(idx); picks.push(QUEST_POOL[idx]); }
    idx = (idx + step) % n;
  }
  return picks;
}

function ensureFields(u) {
  if (!u) return;
  if (typeof u.coins !== 'number') u.coins = 1000;
  if (!Array.isArray(u.ownedSkins)) u.ownedSkins = ['default_red', 'default_blue'];
  if (typeof u.streak !== 'number') u.streak = 0;
  if (typeof u.bestStreak !== 'number') u.bestStreak = 0;
  if (u.lastCheckin === undefined) u.lastCheckin = null;
  if (!u.daily || typeof u.daily !== 'object') u.daily = { date: null, quests: [] };
  rollDaily(u);
}

function rollDaily(u) {
  const key = dateKey();
  if (u.daily && u.daily.date === key && Array.isArray(u.daily.quests) && u.daily.quests.length) return;
  const defs = questsForDay(key);
  u.daily = {
    date: key,
    quests: defs.map(d => ({
      id: d.id, metric: d.metric, goal: d.goal, reward: d.reward, text: d.text,
      progress: 0, done: false, rewarded: false
    }))
  };
}

// Coins granted for a daily check-in of the given streak length.
function streakReward(streak) {
  const base = Math.min(150, 15 + streak * 10); // day1=25 … capped at 150
  const weekly = streak > 0 && streak % 7 === 0 ? 50 : 0; // weekly milestone
  return base + weekly;
}

function prospectiveStreak(u, key) {
  if (u.lastCheckin === key) return u.streak || 0;
  if (u.lastCheckin && dayDiff(u.lastCheckin, key) === 1) return (u.streak || 0) + 1;
  return 1;
}

// ===== Public API =====

// Full profile summary for the bot /stats card and Mini App profile.
export function getProfileSummary(userId) {
  const u = db.data.users[String(userId)];
  if (!u) return null;
  ensureFields(u);
  db.save();
  const rating = typeof u.rating === 'number' ? u.rating : 1000;
  return {
    id: u.id,
    name: u.display_name || u.first_name || (u.username ? '@' + u.username : 'Player'),
    rating,
    league: getLeague(rating),
    ...getRank(userId),
    wins: u.wins || 0, losses: u.losses || 0, draws: u.draws || 0,
    coins: u.coins || 0, streak: u.streak || 0, bestStreak: u.bestStreak || 0
  };
}

// Daily state: streak + today's quests (progress capped to goal).
export function getDailyState(userId) {
  const u = db.data.users[String(userId)];
  if (!u) return null;
  ensureFields(u);
  db.save();
  const key = dateKey();
  return {
    date: key,
    streak: u.streak || 0,
    bestStreak: u.bestStreak || 0,
    checkedInToday: u.lastCheckin === key,
    nextReward: streakReward(prospectiveStreak(u, key)),
    quests: u.daily.quests.map(q => ({
      id: q.id, text: q.text, goal: q.goal,
      progress: Math.min(q.progress || 0, q.goal), reward: q.reward, done: !!q.done
    }))
  };
}

// Perform the once-per-day check-in. Idempotent within a day.
export function dailyCheckin(userId) {
  const u = db.data.users[String(userId)];
  if (!u) return { ok: false, error: 'not_registered' };
  ensureFields(u);
  const key = dateKey();
  if (u.lastCheckin === key) {
    return { ok: true, alreadyChecked: true, streak: u.streak || 0, bestStreak: u.bestStreak || 0, reward: 0, coins: u.coins || 0 };
  }
  if (u.lastCheckin && dayDiff(u.lastCheckin, key) === 1) u.streak = (u.streak || 0) + 1;
  else u.streak = 1;
  u.bestStreak = Math.max(u.bestStreak || 0, u.streak);
  u.lastCheckin = key;
  const reward = streakReward(u.streak);
  u.coins = Math.max(0, (u.coins || 0) + reward);
  db.save();
  return { ok: true, alreadyChecked: false, streak: u.streak, bestStreak: u.bestStreak, reward, coins: u.coins };
}

// Emit a progress event. metric: 'play' | 'win' | 'play_online' | 'win_online'
// | 'beat_ai'. Quests auto-award coins the moment they hit their goal, so this
// is robust regardless of where the game was played (online, vs AI, etc.).
// Returns { completed:[{id,text,reward}], coins }.
export function addQuestProgress(userId, metric, amount = 1) {
  const u = db.data.users[String(userId)];
  if (!u) return { completed: [], coins: 0 };
  ensureFields(u);
  const completed = [];
  for (const q of u.daily.quests) {
    if (q.done || q.metric !== metric) continue;
    q.progress = (q.progress || 0) + amount;
    if (q.progress >= q.goal) {
      q.progress = q.goal;
      q.done = true;
      if (!q.rewarded) {
        q.rewarded = true;
        u.coins = Math.max(0, (u.coins || 0) + q.reward);
        completed.push({ id: q.id, text: q.text, reward: q.reward });
      }
    }
  }
  db.save();
  return { completed, coins: u.coins || 0 };
}

// Convenience: record a finished game in one call.
//   opts = { win:boolean, online:boolean, vsAiHardPlus:boolean }
export function recordGamePlayed(userId, opts = {}) {
  if (!db.data.users[String(userId)]) return { completed: [], coins: 0 };
  const all = [];
  const push = (m) => { const r = addQuestProgress(userId, m, 1); if (r.completed) all.push(...r.completed); };
  push('play');
  if (opts.online) push('play_online');
  if (opts.win) push('win');
  if (opts.win && opts.online) push('win_online');
  if (opts.win && opts.vsAiHardPlus) push('beat_ai');
  const u = db.data.users[String(userId)];
  return { completed: all, coins: (u && u.coins) || 0 };
}
