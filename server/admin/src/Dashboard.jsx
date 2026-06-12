import React, { useEffect, useRef, useState } from 'react';
import { getOverview, getUsers, getGames, deleteUser, setCoins } from './api.js';
import { country } from './flag.js';
import MessageModal from './MessageModal.jsx';
import MetricModal from './MetricModal.jsx';
import BroadcastModal from './BroadcastModal.jsx';

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
  const [delUser, setDelUser] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);
  const [coinUser, setCoinUser] = useState(null);
  const [coinInput, setCoinInput] = useState('');
  const [coinBusy, setCoinBusy] = useState(false);
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

  const confirmDelete = async () => {
    if (!delUser || deleting) return;
    setDeleting(true);
    const res = await deleteUser(delUser.id);
    setDeleting(false);
    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u.id !== delUser.id));
      setDelUser(null);
    } else {
      alert(res.error || 'Failed to delete');
    }
  };

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
          <div className="panel-toolbar">
            <span className="panel-toolbar-title">All users <span className="muted">({users.length})</span></span>
            <button className="btn-broadcast" onClick={() => setBroadcasting(true)} disabled={users.length === 0} title="Send a message to every user">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 11l19-9-9 19-2-8-8-2z" />
              </svg>
              Broadcast
            </button>
          </div>
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
                  <thead><tr><th>Name</th><th>Username</th><th>Telegram ID</th><th>Country</th><th>WAYZ</th><th>Status</th><th></th></tr></thead>
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
                            <span className="wayz-cell">🪙 {u.coins ?? 0}</span>
                          </td>
                          <td>
                            {u.online
                              ? <span className="status-online"><span className="odot" /> Online</span>
                              : <span className="status-offline">Offline</span>}
                          </td>
                          <td>
                            <div className="row-actions">
                              <button className="coin-btn" onClick={() => { setCoinUser(u); setCoinInput(String(u.coins ?? 0)); }} title="Edit WAYZ">
                                🪙
                              </button>
                              <button className="msg-btn" onClick={() => setMsgUser(u)} title="Send message">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M22 2 11 13" />
                                  <path d="M22 2 15 22l-4-9-9-4 20-7z" />
                                </svg>
                              </button>
                              <button className="del-btn" onClick={() => setDelUser(u)} title="Delete user">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M3 6h18" />
                                  <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                  <path d="M10 11v6M14 11v6" />
                                </svg>
                              </button>
                            </div>
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
      {broadcasting && <BroadcastModal totalUsers={users.length} onClose={() => setBroadcasting(false)} />}

      {coinUser && (
        <div className="modal-overlay" onClick={() => !coinBusy && setCoinUser(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <div className="modal-title">Edit WAYZ balance</div>
                <div className="modal-sub">{coinUser.first_name || 'user'} · ID {coinUser.id}</div>
              </div>
              <button className="modal-x" onClick={() => !coinBusy && setCoinUser(null)}>✕</button>
            </div>
            <p className="del-warn">Current balance: 🪙 {coinUser.coins ?? 0} WAYZ</p>
            <input
              type="number"
              className="coin-input"
              value={coinInput}
              onChange={(e) => setCoinInput(e.target.value)}
              placeholder="New balance"
              autoFocus
            />
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => !coinBusy && setCoinUser(null)} disabled={coinBusy}>Cancel</button>
              <button className="btn-send" disabled={coinBusy} onClick={async () => {
                const val = parseInt(coinInput, 10);
                if (Number.isNaN(val) || val < 0) return;
                setCoinBusy(true);
                const res = await setCoins(coinUser.id, { set: val });
                setCoinBusy(false);
                if (res.ok) {
                  setUsers((prev) => prev.map(x => x.id === coinUser.id ? { ...x, coins: res.coins } : x));
                  setCoinUser(null);
                } else {
                  alert(res.error || 'Failed to update');
                }
              }}>{coinBusy ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {coinUser && (
        <div className="modal-overlay" onClick={() => !coinBusy && setCoinUser(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <div className="modal-title">Edit WAYZ balance</div>
                <div className="modal-sub">{coinUser.first_name || 'user'} · ID {coinUser.id}</div>
              </div>
              <button className="modal-x" onClick={() => !coinBusy && setCoinUser(null)}>✕</button>
            </div>
            <p className="del-warn">Current balance: 🪙 {coinUser.coins ?? 0} WAYZ</p>
            <input
              type="number"
              className="coin-input"
              value={coinInput}
              onChange={(e) => setCoinInput(e.target.value)}
              placeholder="New balance"
              autoFocus
            />
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => !coinBusy && setCoinUser(null)} disabled={coinBusy}>Cancel</button>
              <button className="btn-send" disabled={coinBusy} onClick={async () => {
                const val = parseInt(coinInput, 10);
                if (Number.isNaN(val) || val < 0) return;
                setCoinBusy(true);
                const res = await setCoins(coinUser.id, { set: val });
                setCoinBusy(false);
                if (res.ok) {
                  setUsers((prev) => prev.map(x => x.id === coinUser.id ? { ...x, coins: res.coins } : x));
                  setCoinUser(null);
                } else {
                  alert(res.error || 'Failed to update');
                }
              }}>{coinBusy ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {delUser && (
        <div className="modal-overlay" onClick={() => !deleting && setDelUser(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <div className="modal-title">Delete user?</div>
                <div className="modal-sub">{delUser.first_name || 'user'} · ID {delUser.id}</div>
              </div>
              <button className="modal-x" onClick={() => !deleting && setDelUser(null)}>✕</button>
            </div>
            <p className="del-warn">This permanently removes the user and their stats. This cannot be undone.</p>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setDelUser(null)} disabled={deleting}>Cancel</button>
              <button className="btn-danger" onClick={confirmDelete} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
