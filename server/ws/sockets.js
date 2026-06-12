// Global registry mapping a userId to their live WebSocket connection(s).
// Lets us push real-time notifications (friend requests, game invites) to a
// specific user from anywhere, regardless of which room they're in.

const sockets = new Map(); // userId -> Set<ws>

export const socketRegistry = {
  add(userId, ws) {
    if (userId == null || !ws) return;
    const key = String(userId);
    if (!sockets.has(key)) sockets.set(key, new Set());
    sockets.get(key).add(ws);
  },

  remove(userId, ws) {
    if (userId == null) return;
    const key = String(userId);
    const set = sockets.get(key);
    if (!set) return;
    set.delete(ws);
    if (set.size === 0) sockets.delete(key);
  },

  // Send a message to every live socket of a user. Returns true if delivered.
  sendToUser(userId, type, payload) {
    const key = String(userId);
    const set = sockets.get(key);
    if (!set || set.size === 0) return false;
    const msg = JSON.stringify({ type, payload });
    let delivered = false;
    set.forEach(ws => {
      if (ws && ws.readyState === 1) { // OPEN
        try { ws.send(msg); delivered = true; } catch (e) { /* ignore */ }
      }
    });
    return delivered;
  },

  isOnline(userId) {
    const set = sockets.get(String(userId));
    return !!(set && set.size > 0);
  }
};

export default socketRegistry;
