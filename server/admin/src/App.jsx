import React, { useEffect, useState } from 'react';
import { checkSession, login, logout } from './api.js';
import Login from './Login.jsx';
import Dashboard from './Dashboard.jsx';

export default function App() {
  const [authed, setAuthed] = useState(null); // null = checking

  useEffect(() => {
    checkSession().then(setAuthed).catch(() => setAuthed(false));
  }, []);

  const handleLogin = async (password) => {
    const res = await login(password);
    if (res.ok) setAuthed(true);
    return res;
  };

  const handleLogout = async () => {
    await logout();
    setAuthed(false);
  };

  if (authed === null) {
    return <div className="boot"><div className="spinner" /></div>;
  }

  return authed
    ? <Dashboard onLogout={handleLogout} onExpire={() => setAuthed(false)} />
    : <Login onLogin={handleLogin} />;
}
