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
import { handleWebSocketConnection } from './ws/handler.js';
import { roomManager } from './ws/rooms.js';
import { loginHandler, logoutHandler, requireAdmin } from './admin/auth.js';
import { startBot, sendToUser } from './bot/bot.js';
import { presence } from './ws/presence.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json());

// We attach the WebSocketServer later; expose a getter for live counts.
let wssRef = null;
const getOnlineCount = () => (wssRef ? wssRef.clients.size : 0);

// API HTTP Endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.get('/api/leaderboard', (req, res) => {
  try {
    const board = db.getLeaderboard();
    res.json(board);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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

app.get('/api/admin/games', requireAdmin, (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    res.json(db.getRecentGames(limit));
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
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  // Start the Telegram bot (long polling). No-op if BOT_TOKEN is unset.
  startBot();
});
