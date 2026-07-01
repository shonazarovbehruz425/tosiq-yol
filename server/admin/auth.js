// Secure admin authentication: httpOnly signed-cookie sessions,
// timing-safe password comparison, and login rate limiting.
import crypto from 'crypto';

const ADMIN_PASSWORD = process.env.ADMIN_TOKEN || 'admin123';
const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const SESSION_TTL_MS = 1000 * 60 * 60 * 8; // 8 hours
const COOKIE_NAME = 'admin_session';

// In-memory session store: sessionId -> expiry timestamp
const sessions = new Map();

// Login attempt tracking per IP for rate limiting
const attempts = new Map(); // ip -> { count, firstAt, blockedUntil }
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 1000 * 60 * 5;   // 5 min window
const BLOCK_MS = 1000 * 60 * 15;   // 15 min block

function timingSafeEqual(a, b) {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ab.length !== bb.length) {
    // Compare against itself to keep timing roughly constant, then fail
    crypto.timingSafeEqual(ab, ab);
    return false;
  }
  return crypto.timingSafeEqual(ab, bb);
}

function sign(value) {
  return crypto.createHmac('sha256', SESSION_SECRET).update(value).digest('hex');
}

function makeSessionToken() {
  const id = crypto.randomBytes(24).toString('hex');
  const expiry = Date.now() + SESSION_TTL_MS;
  sessions.set(id, expiry);
  const payload = `${id}.${expiry}`;
  return `${payload}.${sign(payload)}`;
}

function verifySessionToken(token) {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [id, expiry, sig] = parts;
  if (sign(`${id}.${expiry}`) !== sig) return false;
  const exp = parseInt(expiry, 10);
  if (!exp || Date.now() > exp) { sessions.delete(id); return false; }
  if (!sessions.has(id)) return false;
  return true;
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const out = {};
  header.split(';').forEach(pair => {
    const idx = pair.indexOf('=');
    if (idx > -1) {
      const k = pair.slice(0, idx).trim();
      out[k] = decodeURIComponent(pair.slice(idx + 1).trim());
    }
  });
  return out;
}

function clientIp(req) {
  return (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress || 'unknown';
}

function isRateLimited(ip) {
  const rec = attempts.get(ip);
  if (!rec) return false;
  if (rec.blockedUntil && Date.now() < rec.blockedUntil) return true;
  return false;
}

function registerFailedAttempt(ip) {
  const now = Date.now();
  let rec = attempts.get(ip);
  if (!rec || now - rec.firstAt > WINDOW_MS) {
    rec = { count: 0, firstAt: now, blockedUntil: 0 };
  }
  rec.count += 1;
  if (rec.count >= MAX_ATTEMPTS) {
    rec.blockedUntil = now + BLOCK_MS;
  }
  attempts.set(ip, rec);
}

function clearAttempts(ip) {
  attempts.delete(ip);
}

// Cookie flags. `secure` only over HTTPS (Render serves HTTPS in prod).
function cookieString(token, { clear = false } = {}) {
  const isProd = process.env.NODE_ENV === 'production' || process.env.RENDER;
  const base = [
    `${COOKIE_NAME}=${clear ? '' : token}`,
    'HttpOnly',
    'Path=/',
    'SameSite=Strict',
    isProd ? 'Secure' : ''
  ].filter(Boolean);
  if (clear) base.push('Max-Age=0');
  else base.push(`Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`);
  return base.join('; ');
}

// ===== Express handlers =====

export function loginHandler(req, res) {
  const ip = clientIp(req);
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Too many attempts. Try again later.' });
  }
  const password = (req.body && req.body.password) || '';
  if (!timingSafeEqual(password, ADMIN_PASSWORD)) {
    registerFailedAttempt(ip);
    return res.status(401).json({ error: 'Invalid password' });
  }
  clearAttempts(ip);
  const token = makeSessionToken();
  res.setHeader('Set-Cookie', cookieString(token));
  res.json({ ok: true });
}

export function logoutHandler(req, res) {
  const cookies = parseCookies(req);
  const token = cookies[COOKIE_NAME];
  if (token) {
    const id = token.split('.')[0];
    sessions.delete(id);
  }
  res.setHeader('Set-Cookie', cookieString('', { clear: true }));
  res.json({ ok: true });
}

// Middleware guarding admin API routes (cookie session only).
export function requireAdmin(req, res, next) {
  const cookies = parseCookies(req);
  if (verifySessionToken(cookies[COOKIE_NAME])) return next();
  return res.status(401).json({ error: 'Unauthorized' });
}
