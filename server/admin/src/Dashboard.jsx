import React, { useEffect, useRef, useState } from 'react';
import { getOverview, getUsers, getGames } from './api.js';
import { country } from './flag.js';
import MessageModal from './MessageModal.jsx';
import MetricModal from './MetricModal.jsx';

// Tiny deterministic sparkline so cards feel alive even before real history exists.
function Sparkline({ seed = 1, color = '#a78bfa' }) {
  const pts = [];
  const n = 12;
  let v = 0.5;
  for (let i = 0; i < n; i++) {
    // pseudo-random but stable per seed
    v += (Math.sin(seed * 9.7 + i * 1.3) + Math.cos(seed * 3.1 + i * 0.7)) * 0.12;
    v = Math.max(0.08, Math.min(0.92, v));
    pts.push(v);
  }
  const w = 100, h = 26;
  const step = w / (n - 1);
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${(i * step).toFixed(1)} ${((1 - p) * h).toFixed(1)}`).join(' ');
  const gid = `g${seed}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L ${w} ${h} L 0 ${h} Z`} fill={`url(#${gid})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Stat({ label, value, seed, color, delay, metric, onOpen }) {
  return (
    <button className={`stat ${delay}`} onClick={() => onOpen(metric)} title="View details">
      <span className="stat-label">{label}</span>
      <span className="stat-value grad-text">{value}</span>
      <div className="stat-spark"><Sparkline seed={seed} color={color} /></div>
      <span className="stat-more">View →</span>
    </button>
  );
}

function fmtTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

const EmptyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="13" rx="3" />
    <path d="M7 7V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2" />
    <path d="M8 13h.01M16 13h.01M9.5 16.5a3.5 3.5 0 0 0 5 0" />
  </svg>
);

export default function Dashboard({ onLogout, onExpire }) {
  const [data, setData] = useState(null);
  const [users, setUsers] = useState([]);
  const [games, setGames] = useState([]);
  const [updated, setUpdated] = useState(null);
  const [tab, setTab] = useState('rooms');
  const [msgUser, setMsgUser] = useState(null);
  const [metric, setMetric] = useState(null);
  const timer = useRef(null);

  const load = async () => {
    try {
      const [ov, us, gm] = await Promise.all([getOverview(), getUsers(), getGames(30)]);
      setData(ov);
      setUsers(us);
      setGames(gm);
      setUpdated(new Date());
    } catch {
      onExpire();
    }
  };

  useEffect(() => {
    load();
    timer.current = setInterval(load, 5000);
    return () => clearInterval(timer.current);
  }, []);

  if (!data) {
    return <div className="boot"><div className="spinner" /></div>;
  }

  const s = data.summary;

  return (
    <div className="dash">
      <header className="topbar">
        <div className="brand">
          <span className="pdot" />
          Wrong Way <span className="sub">Admin</span>
        </div>
        <div className="topbar-right">
          <span className="online"><span className="gdot" /> {data.online} online</span>
          <button className="signout" onClick={onLogout}>Sign out</button>
        </div>
      </header>

      <div className="stats">
        <Stat label="Users" value={s.totalUsers} seed={2} color="#a78bfa" delay="delay-1" metric="users" onOpen={setMetric} />
        <Stat label="Games" value={s.totalGames} seed={5} color="#60a5fa" delay="delay-2" metric="games" onOpen={setMetric} />
        <Stat label="Today" value={s.gamesToday} seed={8} color="#34d399" delay="delay-3" metric="today" onOpen={setMetric} />
        <Stat label="Active" value={data.activeRooms.length} seed={3} color="#fbbf24" delay="delay-4" metric="active" onOpen={setMetric} />
        <Stat label="Avg moves" value={s.avgMovesPerGame} seed={6} color="#22d3ee" delay="delay-5" metric="moves" onOpen={setMetric} />
      </div>

      <div className="tabs delay-3">
        <button className={tab === 'rooms' ? 'on' : ''} onClick={() => setTab('rooms')}>
          Active games <span className="badge">{data.activeRooms.length}</span>
        </button>
        <button className={tab === 'games' ? 'on' : ''} onClick={() => setTab('games')}>
          History
        </button>
        <button className={tab === 'users' ? 'on' : ''} onClick={() => setTab('users')}>
          Users <span className="badge">{users.length}</span>
        </button>
      </div>

      {tab === 'rooms' && (
        <div className="panel delay-4">
          {data.activeRooms.length === 0
            ? (
              <div className="empty">
                <div className="empty-icon"><EmptyIcon /></div>
                <div className="empty-text">No active games right now</div>
              </div>
            )
            : (
              <div className="panel-scroll">
                <table>
                  <thead><tr><th>Code</th><th>Type</th><th>Players</th><th>Mode</th><th>Moves</th><th>Status</th></tr></thead>
                  <tbody>
                    {data.activeRooms.map(r => (
                      <tr key={r.roomCode}>
                        <td className="mono">{r.roomCode}</td>
                        <td>{r.isPrivate ? 'Private' : 'Public'}</td>
                        <td>{r.players.join(' vs ') || '—'} <span className="muted">({r.playerCount}/2)</span></td>
                        <td>{r.mode} · {r.boardSize}×{r.boardSize}</td>
                        <td>{r.moves}</td>
                        <td>
                          <span className={`tag ${r.isFinished ? 'gray' : r.isStarted ? 'green' : 'amber'}`}>
                            {r.isFinished ? 'Finished' : r.isStarted ? 'Live' : 'Waiting'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </div>
      )}

      {tab === 'games' && (
        <div className="panel delay-4">
          {games.length === 0
            ? (
              <div className="empty">
                <div className="empty-icon"><EmptyIcon /></div>
                <div className="empty-text">No games played yet</div>
              </div>
            )
            : (
              <div className="panel-scroll">
                <table>
                  <thead><tr><th>Red</th><th>Blue</th><th>Winner</th><th>Mode</th><th>Moves</th><th>Time</th></tr></thead>
                  <tbody>
                    {games.map(g => (
                      <tr key={g.id}>
                        <td>{g.red}</td>
                        <td>{g.blue}</td>
                        <td>
                          <span className={`tag ${g.winner === 'red' ? 'red' : g.winner === 'blue' ? 'blue' : 'gray'}`}>
                            {g.winner}
                          </span>
                        </td>
                        <td>{g.mode} · {g.boardSize}×{g.boardSize}</td>
                        <td>{g.moves}</td>
                        <td className="muted">{fmtTime(g.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </div>
      )}

      {tab === 'users' && (
        <div className="panel delay-4">
          {users.length === 0
            ? (
              <div className="empty">
                <div className="empty-icon"><EmptyIcon /></div>
                <div className="empty-text">No users yet</div>
              </div>
            )
            : (
              <div className="panel-scroll">
                <table>
                  <thead><tr><th>Name</th><th>Username</th><th>Telegram ID</th><th>Country</th><th>Status</th><th></th></tr></thead>
                  <tbody>
                    {users.map((u) => {
                      const c = country(u);
                      return (
                        <tr key={u.id}>
                          <td>{u.first_name || '—'}</td>
                          <td className="muted">{u.username ? '@' + u.username : '—'}</td>
                          <td className="mono">{u.id}</td>
                          <td><span className="country">{c.flag} <span className="muted">{c.name}</span></span></td>
                          <td>
                            {u.online
                              ? <span className="status-online"><span className="odot" /> Online</span>
                              : <span className="status-offline">Offline</span>}
                          </td>
                          <td>
                            <button className="msg-btn" onClick={() => setMsgUser(u)} title="Send message">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M22 2 11 13" />
                                <path d="M22 2 15 22l-4-9-9-4 20-7z" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
        </div>
      )}

      <footer className="foot">
        Updated {updated ? updated.toLocaleTimeString() : '—'} · auto-refresh 5s
        <span className="spinner tiny" />
      </footer>

      {msgUser && <MessageModal user={msgUser} onClose={() => setMsgUser(null)} />}
      {metric && <MetricModal metric={metric} onClose={() => setMetric(null)} />}
    </div>
  );
}
