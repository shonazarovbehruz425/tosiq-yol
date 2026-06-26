import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles/global.css';

// ── Telegram user ───────────────────────────────
const _getTgUser = () => {
  try {
    const u = window.Telegram?.WebApp?.initDataUnsafe?.user;
    if (u) return { name: u.first_name || 'Siz', username: u.username || '' };
  } catch {}
  try {
    const u = window.parent?.Telegram?.WebApp?.initDataUnsafe?.user;
    if (u) return { name: u.first_name || 'Siz', username: u.username || '' };
  } catch {}
  return { name: 'Siz', username: '' };
};
window.__dbMe = _getTgUser();

// ── InitData (for WebSocket auth) ───────────────
window.__dbInitData = '';
window.addEventListener('message', ev => {
  if (ev.data?.type === 'dotbox_init' && ev.data.initData) {
    window.__dbInitData = ev.data.initData;
  }
});
try {
  const d = window.parent?.Telegram?.WebApp?.initData;
  if (d) window.__dbInitData = d;
} catch {}

// ── WrongWay settings ───────────────────────────
try {
  const s = JSON.parse(localStorage.getItem('tosiq_yol_settings') || '{}');
  window.__dbSoundEnabled = s.sound !== false;
} catch {
  window.__dbSoundEnabled = true;
}

// ── Telegram init ───────────────────────────────
try {
  const tg = window.Telegram?.WebApp;
  if (tg) { tg.ready(); tg.expand(); }
} catch {}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
