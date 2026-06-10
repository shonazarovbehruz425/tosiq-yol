import { getInitData } from './telegram.js';

class WebSocketManager {
  constructor() {
    this.ws = null;
    this.listeners = {};
    this.url = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 2000;
    this.isConnected = false;
    this.pingInterval = null;
  }

  connect(customUrl = null) {
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    if (customUrl) {
      this.url = customUrl;
    } else {
      // Auto-detect URL
      const loc = window.location;
      const protocol = loc.protocol === 'https:' ? 'wss:' : 'ws:';
      // In Vite dev (port 5173) the API/WS server runs on :3000.
      // In production (Render etc.) the frontend and backend share the same host/port.
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
      this.startHeartbeat();
      
      // Send auth/init data to backend immediately
      const initData = getInitData();
      this.send('auth', { initData });
      
      this.trigger('connect', null);
    };

    this.ws.onmessage = (event) => {
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
      
      if (!event.wasClean) {
        this.attemptReconnect();
      }
    };

    this.ws.onerror = (err) => {
      console.error('WebSocket error:', err);
      this.trigger('error', err);
    };
  }

  send(type, payload = {}) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn(`WebSocket is not open. Cannot send message of type "${type}".`);
      return false;
    }
    this.ws.send(JSON.stringify({ type, payload }));
    return true;
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
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max WebSocket reconnect attempts reached.');
      this.trigger('reconnect_failed', null);
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    console.log(`Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms...`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  startHeartbeat() {
    this.stopHeartbeat();
    this.pingInterval = setInterval(() => {
      if (this.isConnected) {
        this.send('ping');
      }
    }, 30000); // Send ping every 30 seconds
  }

  stopHeartbeat() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  disconnect() {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close(1000, 'Normal closure');
      this.ws = null;
    }
    this.isConnected = false;
  }
}

export const socket = new WebSocketManager();
export default socket;
