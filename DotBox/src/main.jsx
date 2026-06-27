import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { setLang } from './i18n/index.js';
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

// ── WrongWay settings (sound + language) ─────────
// Same-origin localStorage is shared with the parent WrongWay app, so we can
// read the persisted settings directly on load; the parent also pushes live
// updates over postMessage (handled below).
function applySettings({ sound, lang } = {}) {
  if (sound !== undefined) window.__dbSoundEnabled = sound !== false;
  if (lang) { window.__dbLang = lang; setLang(lang); }
}

try {
  const s = JSON.parse(localStorage.getItem('tosiq_yol_settings') || '{}');
  const lang = s.lang || localStorage.getItem('app_lang') || undefined;
  applySettings({ sound: s.sound, lang });
} catch {
  window.__dbSoundEnabled = true;
}

// ── InitData + live settings from parent frame ───
window.__dbInitData = '';
window.addEventListener('message', ev => {
  const d = ev.data;
  if (!d || typeof d !== 'object') return;
  if ((d.type === 'dotbox_init' || d.type === 'dotbox_settings')) {
    if (d.initData) window.__dbInitData = d.initData;
    applySettings({ sound: d.sound, lang: d.lang });
  }
});
try {
  const d = window.parent?.Telegram?.WebApp?.initData;
  if (d) window.__dbInitData = d;
} catch {}

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
