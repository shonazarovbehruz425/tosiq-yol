import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Load config
dotenv.config();

// Imports
import { db } from './db/database.js';
import { initTelegramStore } from './db/telegram-store.js';
import { handleWebSocketConnection } from './ws/handler.js';
import { roomManager } from './ws/rooms.js';
import { loginHandler, logoutHandler, requireAdmin } from './admin/auth.js';
import { startBot, sendToUser, broadcastToAll, sendVideoToUser } from './bot/bot.js';
import { presence } from './ws/presence.js';
import { verifyTelegramWebAppData } from './middleware/auth.js';
import { webmToMp4, isConversionAvailable } from './bot/video-convert.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json());

// Lightweight liveness probe for Render's health checks. Defined first and
// kept dependency-free so it responds instantly the moment the server is up,
// helping Render mark the new instance "ready" sooner and shortening the
// deploy swap window (fewer brief 503s during deploys).
app.get('/healthz', (req, res) => {
  res.type('text/plain').send('ok');
});

// We attach the WebSocketServer later; expose a getter for live counts.
let wssRef = null;
const getOnlineCount = () => (wssRef ? wssRef.clients.size : 0);

// API HTTP Endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.get('/api/leaderboard', (req, res) => {
  try {
    const board = db.getLeaderboard(20);
    res.json(board.top);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== Replay video delivery =====
// The Mini App records a replay to a .webm video client-side and POSTs the raw
// bytes here. We authenticate via the Telegram initData (Authorization: Bearer
// <initData>) and forward the video to that user's chat through the bot.
app.post('/api/replay/upload',
  express.raw({ type: ['video/webm', 'application/octet-stream'], limit: '60mb' }),
  async (req, res) => {
    try {
      const authHeader = req.headers.authorization || '';
      const initData = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
      const result = verifyTelegramWebAppData(initData, process.env.BOT_TOKEN);
      if (!result.isValid || !result.user || !result.user.id) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const buffer = req.body;
      if (!buffer || !buffer.length) {
        return res.status(400).json({ error: 'Empty video' });
      }
      // Hard cap (Telegram bots can send up to 50MB; we keep replays small).
      if (buffer.length > 50 * 1024 * 1024) {
        return res.status(413).json({ error: 'Video too large' });
      }

      const caption = (req.query.caption ? String(req.query.caption) : '').slice(0, 200)
        || '🎬 Wrong Way — o\'yin replayi';

      // Convert WebM (VP8/VP9, looks blurry/cartoonish in Telegram) into a
      // crisp H.264 MP4 when ffmpeg is available; otherwise fall back to webm.
      let outBuf = buffer;
      let filename = `wrong-way-replay-${Date.now()}.mp4`;
      let mime = 'video/mp4';
      if (isConversionAvailable()) {
        try {
          outBuf = await webmToMp4(buffer);
        } catch (convErr) {
          console.warn('[replay] mp4 conversion failed, sending webm:', convErr.message);
          outBuf = buffer;
          filename = `wrong-way-replay-${Date.now()}.webm`;
          mime = 'video/webm';
        }
      } else {
        filename = `wrong-way-replay-${Date.now()}.webm`;
        mime = 'video/webm';
      }

      const sent = await sendVideoToUser(result.user.id, outBuf, filename, caption, mime);
      if (sent.ok) return res.json({ ok: true });
      return res.status(502).json({ error: sent.error || 'Failed to send' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// ===== Admin auth (httpOnly cookie session) =====
app.post('/api/admin/login', loginHandler);
app.post('/api/admin/logout', logoutHandler);
app.get('/api/admin/session', requireAdmin, (req, res) => res.json({ ok: true }));

// ===== Admin API (cookie-protected) =====
app.get('/api/admin/overview', requireAdmin, (req, res) => {
  try {
    res.json({
      summary: db.getAdminSummary(),
      online: getOnlineCount(),
      activeRooms: roomManager.getActiveRooms(),
      serverTime: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/users', requireAdmin, (req, res) => {
  try {
    const onlineIds = presence.onlineIds();
    const users = db.getAllUsers().map(u => ({
      ...u,
      online: onlineIds.has(u.id)
    }));
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send a message to a specific user via the bot
app.post('/api/admin/send', requireAdmin, async (req, res) => {
  try {
    const { userId, text } = req.body || {};
    if (!userId || !text || !String(text).trim()) {
      return res.status(400).json({ error: 'userId and text are required' });
    }
    const result = await sendToUser(Number(userId), String(text));
    if (result.ok) return res.json({ ok: true });
    return res.status(502).json({ error: result.error });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Broadcast a message to ALL users via the bot
app.post('/api/admin/broadcast', requireAdmin, async (req, res) => {
  try {
    const { text } = req.body || {};
    if (!text || !String(text).trim()) {
      return res.status(400).json({ error: 'text is required' });
    }
    const result = await broadcastToAll(String(text).trim());
    if (result.ok) {
      return res.json({ ok: true, sent: result.sent, failed: result.failed, total: result.total });
    }
    return res.status(502).json({ error: result.error });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Adjust a user's WAYZ balance. Body: { userId, set?: number, add?: number }
app.post('/api/admin/set-coins', requireAdmin, (req, res) => {
  try {
    const { userId, set, add } = req.body || {};
    if (!userId) return res.status(400).json({ error: 'userId is required' });
    let coins;
    if (typeof add === 'number') {
      coins = db.addCoins(userId, add);
    } else if (typeof set === 'number') {
      coins = db.setCoins(userId, set);
    } else {
      return res.status(400).json({ error: 'Provide "set" or "add" amount' });
    }
    if (coins === null) return res.status(404).json({ error: 'User not found' });
    return res.json({ ok: true, coins });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a user
app.post('/api/admin/delete-user', requireAdmin, (req, res) => {
  try {
    const { userId } = req.body || {};
    if (!userId) return res.status(400).json({ error: 'userId is required' });
    const removed = db.deleteUser(userId);
    if (removed) return res.json({ ok: true });
    return res.status(404).json({ error: 'User not found' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/games', requireAdmin, (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    res.json(db.getRecentGames(limit));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Detailed drill-down for a metric card (with time series + breakdowns)
app.get('/api/admin/metric/:name', requireAdmin, (req, res) => {
  try {
    const name = req.params.name;
    if (name === 'active') {
      const rooms = roomManager.getActiveRooms();
      const started = rooms.filter(r => r.isStarted && !r.isFinished).length;
      const waiting = rooms.filter(r => !r.isStarted).length;
      return res.json({
        metric: 'active',
        total: rooms.length,
        live: true,
        breakdown: {
          title: 'By status',
          items: [
            { name: 'Live', count: started },
            { name: 'Waiting', count: waiting },
            { name: 'Finished', count: rooms.filter(r => r.isFinished).length }
          ]
        },
        rooms
      });
    }
    res.json(db.getMetricDetail(name));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve the admin panel SPA (built React app) under a secret path
const ADMIN_PATH = '/behruz620sh1742';
const adminBuildPath = path.join(__dirname, 'admin', 'dist');
if (fs.existsSync(adminBuildPath)) {
  app.use(ADMIN_PATH, express.static(adminBuildPath));
  app.get(`${ADMIN_PATH}/*`, (req, res) => {
    res.sendFile(path.join(adminBuildPath, 'index.html'));
  });
} else {
  app.get(ADMIN_PATH, (req, res) => {
    res.status(503).send('Admin panel not built. Run: npm run build --prefix server/admin');
  });
}

// ===== Telegram channel helpers =====
const TG_API = (token, method) => `https://api.telegram.org/bot${token}/${method}`;

async function sendToChannel(text, extra = {}) {
  const token = process.env.BOT_TOKEN;
  const channelId = process.env.DB_CHANNEL_ID;
  if (!token || !channelId) return null;
  try {
    const res = await fetch(TG_API(token, 'sendMessage'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: channelId, text, parse_mode: 'HTML', ...extra })
    });
    return await res.json();
  } catch (err) {
    console.error('[sendToChannel] Failed:', err.message);
    return null;
  }
}

// ===== trainedai.js generation & upload =====
const TRAINED_AI_FILE_PATH = path.join(__dirname, 'trainedai.js');

/**
 * Generate the JS file content for trainedai.js
 * This is the file the client loads to know which moves to avoid.
 */
function generateTrainedAIContent(dangerWalls, dangerPaths, stats) {
  const now = new Date().toISOString();
  const wallsJson = JSON.stringify(dangerWalls, null, 2);
  const pathsJson = JSON.stringify(dangerPaths, null, 2);
  return [
    `// trainedai.js — WrongWay AI o'z-o'zidan o'rganish natijalari`,
    `// Yaratilgan: ${now}`,
    `// Jami saqlangan taktikalar: ${stats.playerWins || 0}`,
    `// Bu fayl server tomonidan avtomatik yangilanadi — qo'lda o'zgartirmang.`,
    ``,
    `export const TRAINED_DANGER_WALLS = ${wallsJson};`,
    ``,
    `export const TRAINED_DANGER_PATHS = ${pathsJson};`,
    ``,
    `export const TRAINED_META = {`,
    `  totalPatterns: ${stats.playerWins || 0},`,
    `  botWins: ${stats.botWins || 0},`,
    `  lastUpdated: "${now}"`,
    `};`,
    ``
  ].join('\n');
}

/** Save trainedai.js to server folder for static serving at /trainedai.js */
function saveTrainedAIFile(content) {
  try {
    fs.writeFileSync(TRAINED_AI_FILE_PATH, content, 'utf8');
    console.log(`[trainedai] Saved ${TRAINED_AI_FILE_PATH}`);
  } catch (err) {
    console.error('[trainedai] Failed to save:', err.message);
  }
}

/**
 * Upload trainedai.js as a document to the Telegram channel.
 * Uses multipart/form-data (required by Telegram sendDocument).
 */
async function sendDocumentToChannel(filename, content, caption = '') {
  const token = process.env.BOT_TOKEN;
  const channelId = process.env.DB_CHANNEL_ID;
  if (!token || !channelId) return null;

  try {
    // Build multipart body manually (no external deps)
    const boundary = `----WrongWayBoundary${Date.now()}`;
    const fileBytes = Buffer.from(content, 'utf8');

    const parts = [
      `--${boundary}\r\nContent-Disposition: form-data; name="chat_id"\r\n\r\n${channelId}`,
      `--${boundary}\r\nContent-Disposition: form-data; name="parse_mode"\r\n\r\nHTML`,
    ];
    if (caption) {
      parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="caption"\r\n\r\n${caption}`);
    }
    // File part
    const fileHeader = `--${boundary}\r\nContent-Disposition: form-data; name="document"; filename="${filename}"\r\nContent-Type: text/javascript\r\n\r\n`;
    const closing = `\r\n--${boundary}--`;

    const headerBuf   = Buffer.from(parts.join('\r\n') + '\r\n' + fileHeader, 'utf8');
    const closingBuf  = Buffer.from(closing, 'utf8');
    const body = Buffer.concat([headerBuf, fileBytes, closingBuf]);

    const res = await fetch(TG_API(token, 'sendDocument'), {
      method: 'POST',
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
      body
    });
    const json = await res.json();
    if (!json.ok) console.error('[trainedai] Telegram sendDocument error:', json.description);
    return json;
  } catch (err) {
    console.error('[trainedai] sendDocument failed:', err.message);
    return null;
  }
}

// ===== Bot game results & adaptive AI =====
const BOT_PATTERNS_PATH = path.join(__dirname, 'bot-patterns.json');

function loadBotPatterns() {
  try {
    if (fs.existsSync(BOT_PATTERNS_PATH)) {
      return JSON.parse(fs.readFileSync(BOT_PATTERNS_PATH, 'utf8'));
    }
  } catch {}
  return { patterns: [], stats: { totalGames: 0, playerWins: 0, botWins: 0 } };
}

function saveBotPatterns(data) {
  try {
    // Keep last 500 patterns (more data = smarter AI)
    if (data.patterns.length > 500) {
      data.patterns = data.patterns.slice(-500);
    }
    fs.writeFileSync(BOT_PATTERNS_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('[bot-patterns] Failed to save:', err.message);
  }
}

// Build a danger map from all stored patterns:
// - dangerWalls: { "r,c,type" -> score } walls the bot should NEVER play
// - dangerPaths: { "r,c" -> score } pawn positions where bot has historically lost
function buildDangerMap(patterns) {
  const dangerWalls = {};
  const dangerPaths = {};

  for (const p of patterns) {
    // Recency weight: newer patterns matter more
    const ageMs = Date.now() - (p.timestamp || 0);
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    const recencyWeight = Math.max(0.2, 1 - ageDays / 30); // decay over 30 days

    // Difficulty weight: harder difficulty defeats matter more
    const diffWeight = { hard: 1, master: 1.5, grandmaster: 2 }[p.difficulty] || 1;
    const w = recencyWeight * diffWeight;

    // Bot's wall placements that appeared in losing games
    for (const km of p.keyMoves || []) {
      if (km.player === 1) { // bot is always player 1 (blue/top)
        const key = `${km.r},${km.c},${km.wallType}`;
        dangerWalls[key] = (dangerWalls[key] || 0) + w * 15;
      }
    }

    // Board positions where bot was losing
    for (const pos of p.positions || []) {
      if (pos.type === 'move') {
        const key = `${pos.r},${pos.c}`;
        dangerPaths[key] = (dangerPaths[key] || 0) + w * 8;
      }
    }
  }

  return { dangerWalls, dangerPaths };
}

app.post('/api/bot-result', express.json({ limit: '1mb' }), async (req, res) => {
  try {
    const { difficulty, result, moveHistory, boardSize, mode } = req.body || {};
    if (!difficulty || !result || !Array.isArray(moveHistory)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Extract Telegram user from Authorization header (optional)
    let tgUser = null;
    try {
      const authHeader = req.headers.authorization || '';
      const initData = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
      if (initData) {
        const verified = verifyTelegramWebAppData(initData, process.env.BOT_TOKEN);
        if (verified.isValid && verified.user) tgUser = verified.user;
      }
    } catch {}

    const data = loadBotPatterns();
    data.stats.totalGames++;

    const isHardPlus = ['hard', 'master', 'grandmaster'].includes(difficulty);
    if (result === 'win' && isHardPlus) {
      data.stats.playerWins++;

      // All wall moves from the game (both players)
      const keyMoves = moveHistory
        .filter(m => m.type === 'wall')
        .map(m => ({ r: m.r, c: m.c, wallType: m.wallType, player: m.player }));

      // Snapshot positions at key intervals
      const positions = [];
      for (let i = 2; i < moveHistory.length; i += 3) {
        const m = moveHistory[i];
        if (m) positions.push({ step: i, type: m.type, r: m.r, c: m.c, wallType: m.wallType });
      }

      // Opening sequence (first 10 moves) — critical for pattern recognition
      const opening = moveHistory.slice(0, 10).map((m, i) => ({ step: i, ...m }));

      data.patterns.push({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        difficulty,
        boardSize: boardSize || 9,
        result,
        keyMoves,
        positions,
        opening,
        totalMoves: moveHistory.length,
        timestamp: Date.now(),
        userId: tgUser?.id || null,
        userName: tgUser?.first_name || tgUser?.username || 'Anonymous'
      });

      saveBotPatterns(data);
      console.log(`[bot-patterns] Pattern saved (${difficulty}, ${keyMoves.length} walls, ${moveHistory.length} moves, user: ${tgUser?.first_name || 'unknown'})`);

      // Build updated danger maps
      const { dangerWalls, dangerPaths } = buildDangerMap(data.patterns);
      const topDangerWalls = Object.entries(dangerWalls)
        .sort(([, a], [, b]) => b - a).slice(0, 40)
        .map(([key, score]) => {
          const [r, c, wallType] = key.split(',');
          return { r: +r, c: +c, wallType, score: Math.round(score) };
        });
      const topDangerPaths = Object.entries(dangerPaths)
        .sort(([, a], [, b]) => b - a).slice(0, 30)
        .map(([key, score]) => {
          const [r, c] = key.split(',');
          return { r: +r, c: +c, score: Math.round(score) };
        });

      // Generate trainedai.js content and save locally
      const jsContent = generateTrainedAIContent(topDangerWalls, topDangerPaths, data.stats);
      saveTrainedAIFile(jsContent);

      // Send detailed text notification to Telegram channel
      const wallsUsed = keyMoves.length;
      const botWalls = keyMoves.filter(m => m.player === 1).length;
      const playerWalls = keyMoves.filter(m => m.player === 0).length;
      const diffLabel = { hard: '🔴 Hard', master: '🟠 Master', grandmaster: '🏆 Grandmaster' }[difficulty] || difficulty;
      const boardLabel = `${boardSize || 9}×${boardSize || 9}`;
      const userName = tgUser ? `@${tgUser.username || tgUser.first_name}` : 'Noma\'lum';
      const totalPatterns = data.patterns.length;

      const channelMsg = [
        `🤖 <b>AI yengildi — taktika saqlandi!</b>`,
        ``,
        `👤 O'yinchi: <b>${userName}</b>`,
        `🎯 Daraja: <b>${diffLabel}</b>`,
        `📐 Doska: ${boardLabel}`,
        ``,
        `📊 O'yin statistikasi:`,
        `   🎯 Jami yurishlar: ${moveHistory.length}`,
        `   🧱 O'yinchi devorlari: ${playerWalls}`,
        `   🧱 Bot devorlari: ${botWalls}`,
        ``,
        `🧠 Jami saqlangan taktikalar: ${totalPatterns}`,
        `⚡ Bot yangilangan <code>trainedai.js</code> fayli quyida 👇`
      ].join('\n');

      // Send text message first, then the .js file as document
      sendToChannel(channelMsg).catch(() => {});
      sendDocumentToChannel(
        'trainedai.js',
        jsContent,
        `🧠 Yangilangan AI o'quv ma'lumotlari\n📦 Patterns: ${totalPatterns} | Daraja: ${diffLabel}`
      ).catch(() => {});

    } else if (result === 'lose') {
      data.stats.botWins++;
      saveBotPatterns(data);
    }

    res.json({ ok: true, patternCount: data.patterns.length });
  } catch (err) {
    console.error('[bot-result] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/bot-patterns', (req, res) => {
  try {
    const difficulty = req.query.difficulty || null;
    const data = loadBotPatterns();

    // Filter by difficulty if requested
    let patterns = data.patterns;
    if (difficulty) {
      // For hard: include hard patterns; master: hard+master; grandmaster: all
      const diffOrder = ['hard', 'master', 'grandmaster'];
      const diffIdx = diffOrder.indexOf(difficulty);
      const allowed = diffIdx >= 0 ? diffOrder.slice(0, diffIdx + 1) : [difficulty];
      patterns = patterns.filter(p => allowed.includes(p.difficulty));
    }

    // Build weighted danger map from all patterns
    const { dangerWalls, dangerPaths } = buildDangerMap(patterns);

    // Top danger walls (bot should never play these)
    const topDangerWalls = Object.entries(dangerWalls)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 40)
      .map(([key, score]) => {
        const [r, c, wallType] = key.split(',');
        return { r: +r, c: +c, wallType, score: Math.round(score) };
      });

    // Top danger pawn positions (bot should avoid being here)
    const topDangerPaths = Object.entries(dangerPaths)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 30)
      .map(([key, score]) => {
        const [r, c] = key.split(',');
        return { r: +r, c: +c, score: Math.round(score) };
      });

    res.json({
      patterns: patterns.slice(-80),   // last 80 raw patterns
      dangerWalls: topDangerWalls,      // weighted danger wall map
      dangerPaths: topDangerPaths,      // weighted danger position map
      stats: data.stats
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Serve generated trainedai.js at /trainedai.js ──
// The AI worker fetches this URL to get the latest learned danger data.
// Updated automatically every time the AI is defeated.
app.get('/trainedai.js', (req, res) => {
  try {
    if (fs.existsSync(TRAINED_AI_FILE_PATH)) {
      res.type('application/javascript');
      res.sendFile(TRAINED_AI_FILE_PATH);
    } else {
      // No training data yet — return empty module so imports don't break
      res.type('application/javascript').send([
        '// trainedai.js — hali ma\'lumot yo\'q',
        '// O\'yinchi AI ni yutganda bu fayl avtomatik to\'ldiriladi.',
        'export const TRAINED_DANGER_WALLS = [];',
        'export const TRAINED_DANGER_PATHS = [];',
        'export const TRAINED_META = { totalPatterns: 0, lastUpdated: null };',
      ].join('\n'));
    }
  } catch (err) {
    res.status(500).type('application/javascript').send('export const TRAINED_DANGER_WALLS=[];export const TRAINED_DANGER_PATHS=[];export const TRAINED_META={};');
  }
});

// Serve static frontend assets in production mode
const clientBuildPath = path.join(__dirname, '../dist');
if (fs.existsSync(clientBuildPath)) {
  console.log(`Serving static production build from ${clientBuildPath}`);
  app.use(express.static(clientBuildPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
} else {
  console.log("Static client build folder not detected. Server running in API-only mode.");
}

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server attached to HTTP server
const wss = new WebSocketServer({ noServer: true });
wssRef = wss; // expose for admin online-count

server.on('upgrade', (request, socket, head) => {
  const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;

  if (pathname === '/ws') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

wss.on('connection', (ws, request) => {
  handleWebSocketConnection(ws, wss, request);
});

// Start listening
const PORT = process.env.PORT || 3000;
server.listen(PORT, async () => {
  console.log(`Server listening on port ${PORT}`);
  // Restore DB from the Telegram channel (if configured), then start the bot.
  await initTelegramStore();
  startBot();
});
