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
    if (data.patterns.length > 200) {
      data.patterns = data.patterns.slice(-200);
    }
    fs.writeFileSync(BOT_PATTERNS_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('[bot-patterns] Failed to save:', err.message);
  }
}

app.post('/api/bot-result', express.json({ limit: '1mb' }), (req, res) => {
  try {
    const { difficulty, result, moveHistory, boardSize, mode } = req.body || {};
    if (!difficulty || !result || !Array.isArray(moveHistory)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const data = loadBotPatterns();
    data.stats.totalGames++;

    const isHardPlus = ['hard', 'master', 'grandmaster'].includes(difficulty);
    if (result === 'win' && isHardPlus) {
      data.stats.playerWins++;

      const keyMoves = moveHistory
        .filter(m => m.type === 'wall')
        .map(m => ({ r: m.r, c: m.c, wallType: m.wallType, player: m.player }));

      const positions = [];
      for (let i = 3; i < moveHistory.length; i += 4) {
        positions.push({
          step: i,
          type: moveHistory[i].type,
          r: moveHistory[i].r,
          c: moveHistory[i].c,
          wallType: moveHistory[i].wallType
        });
      }

      data.patterns.push({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        difficulty,
        boardSize: boardSize || 9,
        result,
        keyMoves,
        positions,
        totalMoves: moveHistory.length,
        timestamp: Date.now()
      });

      saveBotPatterns(data);
      console.log(`[bot-patterns] Stored winning pattern (${difficulty}, ${keyMoves.length} walls, ${moveHistory.length} moves)`);
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
    const data = loadBotPatterns();
    res.json({ patterns: data.patterns.slice(-50), stats: data.stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
