import React, { useEffect, useState } from 'react';
import { getMetric } from './api.js';
import { AreaChart, BarList } from './Charts.jsx';

const META = {
  users:  { title: 'Users',     color: '#a78bfa', seriesLabel: 'New users per day' },
  games:  { title: 'Games',     color: '#60a5fa', seriesLabel: 'Games per day' },
  today:  { title: 'Today',     color: '#34d399', seriesLabel: 'Games per day' },
  active: { title: 'Active',    color: '#fbbf24', seriesLabel: 'Live activity' },
  moves:  { title: 'Avg moves', color: '#22d3ee', seriesLabel: 'Avg moves per day' }
};

export default function MetricModal({ metric, onClose }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(false);
  const meta = META[metric] || { title: metric, color: '#8b5cf6' };

  useEffect(() => {
    let alive = true;
    getMetric(metric).then(d => { if (alive) setData(d); }).catch(() => setErr(true));
    return () => { alive = false; };
  }, [metric]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="modal-title">{meta.title}</div>
            <div className="modal-sub">{meta.seriesLabel}</div>
          </div>
          <button className="modal-x" onClick={onClose}>✕</button>
        </div>

        {err && <div className="chart-empty">Failed to load</div>}

        {!err && !data && <div className="chart-empty"><span className="spinner" /></div>}

        {data && (
          <>
            <div className="metric-big">
              <span className="metric-big-val grad-text">{data.total}</span>
              <span className="metric-big-label">{meta.title}{metric === 'moves' ? ' (average)' : ' total'}</span>
            </div>

            {data.series && <AreaChart data={data.series} color={meta.color} />}

            <div className="break-grid">
              {data.breakdown && data.breakdown.items?.length > 0 && (
                <div className="break-card">
                  <div className="break-title">{data.breakdown.title}</div>
                  <BarList items={data.breakdown.items} color={meta.color} />
                </div>
              )}
              {data.breakdown2 && data.breakdown2.items?.length > 0 && (
                <div className="break-card">
                  <div className="break-title">{data.breakdown2.title}</div>
                  <BarList items={data.breakdown2.items} color="#a78bfa" />
                </div>
              )}
            </div>

            {/* Active metric: list current rooms */}
            {metric === 'active' && data.rooms && data.rooms.length > 0 && (
              <div className="break-card" style={{ marginTop: 16 }}>
                <div className="break-title">Current games</div>
                <div className="panel-scroll">
                  <table>
                    <thead><tr><th>Code</th><th>Players</th><th>Mode</th><th>Moves</th><th>Status</th></tr></thead>
                    <tbody>
                      {data.rooms.map(r => (
                        <tr key={r.roomCode}>
                          <td className="mono">{r.roomCode}</td>
                          <td>{r.players.join(' vs ') || '—'}</td>
                          <td>{r.mode} · {r.boardSize}×{r.boardSize}</td>
                          <td>{r.moves}</td>
                          <td><span className={`tag ${r.isFinished ? 'gray' : r.isStarted ? 'green' : 'amber'}`}>
                            {r.isFinished ? 'Finished' : r.isStarted ? 'Live' : 'Waiting'}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
