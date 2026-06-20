import { getInitData } from './telegram.js';

class WebSocketManager {
  constructor() {
    this.ws = null;
    this.listeners = {};
    this.url = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 60; // keep trying on flaky mobile networks
    this.reconnectDelay = 1000;
    this.isConnected = false;
    this.pingInterval = null;
    this.reconnectTimer = null;
    this.closing = false; // set when the app/page is shutting down
    this.sendQueue = [];   // outgoing messages buffered while disconnected
    this.lastPong = 0;     // timestamp of the last inbound message (liveness)

    if (typeof window !== 'undefined') {
      const shutdown = () => this.shutdown();
      window.addEventListener('pagehide', shutdown);
      window.addEventListener('beforeunload', shutdown);
      // Reconnect promptly when the app returns to the foreground (Telegram
      // often suspends the WebView in the background, silently killing sockets).
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden && !this.closing &&
            (!this.ws || this.ws.readyState > WebSocket.OPEN)) {
          this.reconnectAttempts = 0;
          this.connect();
        }
      });
      window.addEventListener('online', () => {
        if (!this.closing) { this.reconnectAttempts = 0; this.connect(); }
      });
    }
  }

  connect(customUrl = null) {
    if (this.closing) return;
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    if (customUrl) {
      this.url = customUrl;
    } else {
      const loc = window.location;
      const protocol = loc.protocol === 'https:' ? 'wss:' : 'ws:';
      const isViteDev = loc.port === '5173';
      const host = isViteDev ? `${loc.hostname}:3000` : loc.host;
      this.url = `${protocol}//${host}/ws`;
    }

    console.log(`Connecting to WebSocket at ${this.url}`);
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log('WebSocket connection established.');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.lastPong = Date.now();
      this.startHeartbeat();

      // Authenticate first, then flush anything queued while we were offline.
      try {
        this.ws.send(JSON.stringify({ type: 'auth', payload: { initData: getInitData() } }));
      } catch (e) { /* ignore */ }
      this._flushQueue();

      this.trigger('connect', null);
    };

    this.ws.onmessage = (event) => {
      this.lastPong = Date.now(); // any inbound traffic proves the link is alive
      try {
        const message = JSON.parse(event.data);
        const { type, payload } = message;
        if (type === 'pong') return; // Heartbeat response
        this.trigger(type, payload);
      } catch (err) {
        console.error('Failed to parse WebSocket message', err);
      }
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket connection closed.', event.reason);
      this.isConnected = false;
      this.stopHeartbeat();
      this.trigger('disconnect', event);
      // Always try to recover unless we're intentionally shutting down.
      if (!this.closing) this.attemptReconnect();
    };

    this.ws.onerror = (err) => {
      console.error('WebSocket error:', err);
      this.trigger('error', err);
    };
  }

  send(type, payload = {}) {
    const msg = JSON.stringify({ type, payload });
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try { this.ws.send(msg); return true; } catch (e) { /* fall through to queue */ }
    }
    // Buffer game messages so a brief drop doesn't lose a move/reaction/chat.
    // (Heartbeats and auth are transient and never queued.)
    if (type !== 'ping' && type !== 'auth') {
      this.sendQueue.push(msg);
      if (this.sendQueue.length > 60) this.sendQueue.shift();
    }
    if (!this.closing) this.connect(); // kick a reconnect
    return false;
  }

  _flushQueue() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const q = this.sendQueue;
    this.sendQueue = [];
    for (const msg of q) {
      try { this.ws.send(msg); } catch (e) { this.sendQueue.push(msg); }
    }
  }

  on(type, callback) {
    if (!this.listeners[type]) {
      this.listeners[type] = [];
    }
    this.listeners[type].push(callback);
  }

  off(type, callback) {
    if (!this.listeners[type]) return;
    this.listeners[type] = this.listeners[type].filter(cb => cb !== callback);
  }

  trigger(type, data) {
    if (this.listeners[type]) {
      this.listeners[type].forEach(callback => callback(data));
    }
  }

  attemptReconnect() {
    if (this.closing) return;
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max WebSocket reconnect attempts reached.');
      this.trigger('reconnect_failed', null);
      return;
    }

    this.reconnectAttempts++;
    // Fast first retries, capped at 5s, so flaky networks recover quickly.
    const delay = Math.min(5000, this.reconnectDelay * Math.pow(1.6, this.reconnectAttempts - 1));
    console.log(`Reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${Math.round(delay)}ms...`);

    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.closing) this.connect();
    }, delay);
  }

  startHeartbeat() {
    this.stopHeartbeat();
    this.lastPong = Date.now();
    // Ping often and watch for a reply; if the link goes silent, force a
    // reconnect instead of waiting for the OS to notice the dead socket.
    this.pingInterval = setInterval(() => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
      if (Date.now() - this.lastPong > 32000) {
        console.warn('Heartbeat timeout — forcing reconnect.');
        try { this.ws.close(); } catch (e) { /* ignore */ }
        return;
      }
      this.send('ping');
    }, 12000);
  }

  stopHeartbeat() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  disconnect() {
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.onclose = null;
        this.ws.onerror = null;
        this.ws.onmessage = null;
        this.ws.onopen = null;
        this.ws.close(1000, 'Normal closure');
      } catch (e) { /* ignore */ }
      this.ws = null;
    }
    this.isConnected = false;
  }

  shutdown() {
    this.closing = true;
    this.disconnect();
  }
}

export const socket = new WebSocketManager();
export default socket;
