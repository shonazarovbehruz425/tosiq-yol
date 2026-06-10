import React, { useEffect, useRef, useState } from 'react';
import { getOverview, getUsers, getGames } from './api.js';

function Stat({ label, value, accent }) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className={`stat-value ${accent || ''}`}>{value}</span>
    </div>
  );
}

function fmtTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

export default function Dashboard({ onLogout, onExpire }) {
  const [data, setData] = useState(null);
  const [users, setUsers] = useState([]);
  const [games, setGames] = useState([]);
  const [updated, setUpdated] = useState(null);
  const [tab, setTab] = useState('rooms');
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
          <span className="brand-dot" />
          Wrong Way <span className="muted">Admin</span>
        </div>
        <div className="topbar-right">
          <span className="online"><span className="pulse" /> {data.online} online</span>
          <button className="ghost" onClick={onLogout}>Sign out</button>
        </div>
      </header>

      <div className="stats">
        <Stat label="Users" value={s.totalUsers} accent="purple" />
        <Stat label="Games" value={s.totalGames} accent="blue" />
        <Stat label="Today" value={s.gamesToday} accent="green" />
        <Stat label="Active" value={data.activeRooms.length} accent="amber" />
        <Stat label="Avg moves" value={s.avgMovesPerGame} />
      </div>

      <div className="tabs">
        <button className={tab === 'rooms' ? 'on' : ''} onClick={() => setTab('rooms')}>
          Active games <span className="count">{data.activeRooms.length}</span>
        </button>
        <button className={tab === 'games' ? 'on' : ''} onClick={() => setTab('games')}>
          History
        </button>
        <button className={tab === 'users' ? 'on' : ''} onClick={() => setTab('users')}>
          Users <span className="count">{users.length}</span>
        </button>
      </div>

      {tab === 'rooms' && (
        <div className="card">
          {data.activeRooms.length === 0
            ? <div className="empty">No active games right now</div>
            : (
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
            )}
        </div>
      )}

      {tab === 'games' && (
        <div className="card">
          {games.length === 0
            ? <div className="empty">No games yet</div>
            : (
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
            )}
        </div>
      )}

      {tab === 'users' && (
        <div className="card">
          {users.length === 0
            ? <div className="empty">No users yet</div>
            : (
              <table>
                <thead><tr><th>#</th><th>Name</th><th>Username</th><th>Rating</th><th>W</th><th>L</th></tr></thead>
                <tbody>
                  {users.map((u, i) => (
                    <tr key={u.id}>
                      <td className="muted">{i + 1}</td>
                      <td>{u.first_name || '—'}</td>
                      <td className="muted">{u.username ? '@' + u.username : '—'}</td>
                      <td className="mono">{u.rating}</td>
                      <td className="green">{u.wins}</td>
                      <td className="red">{u.losses}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </div>
      )}

      <footer className="foot muted">
        Updated {updated ? updated.toLocaleTimeString() : '—'} · auto-refresh 5s
      </footer>
    </div>
  );
}
