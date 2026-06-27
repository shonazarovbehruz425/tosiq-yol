// Thin WebSocket client for DotBox online play.
//
// Connects to the same `/ws` endpoint as the main app, authenticates with the
// Telegram initData injected by the parent frame (window.__dbInitData), and
// relays the `dotbox_*` message protocol handled by server/ws/handler.js.

let socket = null;
let pendingReady = null;            // onReady callback to fire once authed
const listeners = {};               // type -> Set<callback>
const sendQueue = [];               // messages buffered while disconnected

function wsUrl() {
  const loc = window.location;
  const protocol = loc.protocol === 'https:' ? 'wss:' : 'ws:';
  // Vite dev server runs on 5173; the API/WS server runs on 3000.
  const isViteDev = loc.port === '5173';
  const host = isViteDev ? `${loc.hostname}:3000` : loc.host;
  return `${protocol}//${host}/ws`;
}

function getInitData() {
  return (typeof window !== 'undefined' && window.__dbInitData) || '';
}

function flushQueue() {
  if (!socket || socket.readyState !== WebSocket.OPEN) return;
  while (sendQueue.length) {
    const msg = sendQueue.shift();
    try { socket.send(msg); } catch { sendQueue.unshift(msg); break; }
  }
}

/**
 * Open (or reuse) the connection. `onReady` fires once the socket is open and
 * the auth frame has been sent — the right moment to join a queue/room.
 */
export function connect(onReady) {
  if (typeof onReady === 'function') pendingReady = onReady;

  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    if (socket.readyState === WebSocket.OPEN) runPending();
    return;
  }

  try {
    socket = new WebSocket(wsUrl());
  } catch {
    return;
  }

  socket.onopen = () => {
    try { socket.send(JSON.stringify({ type: 'auth', payload: { initData: getInitData() } })); } catch { /* ignore */ }
    flushQueue();
    runPending();
  };

  socket.onmessage = (event) => {
    let message;
    try { message = JSON.parse(event.data); } catch { return; }
    const { type, payload } = message;
    if (type === 'pong') return;
    const set = listeners[type];
    if (set) set.forEach((cb) => { try { cb(payload); } catch { /* ignore */ } });
  };

  socket.onclose = () => { socket = null; };
  socket.onerror = () => { /* surfaced via onclose */ };
}

function runPending() {
  const fn = pendingReady;
  pendingReady = null;
  if (fn) { try { fn(); } catch { /* ignore */ } }
}

/** Drop a queued onReady callback (e.g. user cancelled matchmaking). */
export function cancelPending() {
  pendingReady = null;
}

export function send(type, payload = {}) {
  const msg = JSON.stringify({ type, payload });
  if (socket && socket.readyState === WebSocket.OPEN) {
    try { socket.send(msg); return true; } catch { /* fall through */ }
  }
  sendQueue.push(msg);
  if (sendQueue.length > 40) sendQueue.shift();
  return false;
}

export function on(type, callback) {
  (listeners[type] || (listeners[type] = new Set())).add(callback);
}

export function off(type, callback) {
  listeners[type]?.delete(callback);
}
