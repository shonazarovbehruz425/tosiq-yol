// Tracks which users are currently online (connected via WebSocket).
// A user may have multiple sockets; we count connections per userId.

const online = new Map(); // userId -> connection count

export const presence = {
  add(userId) {
    if (userId == null) return;
    online.set(userId, (online.get(userId) || 0) + 1);
  },

  remove(userId) {
    if (userId == null) return;
    const n = (online.get(userId) || 0) - 1;
    if (n <= 0) online.delete(userId);
    else online.set(userId, n);
  },

  isOnline(userId) {
    return online.has(userId);
  },

  // Set of online user IDs (as numbers)
  onlineIds() {
    return new Set(online.keys());
  },

  count() {
    return online.size;
  }
};

export default presence;
