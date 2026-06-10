import React, { useState } from 'react';

// Smooth area + line chart for a daily time series.
export function AreaChart({ data = [], color = '#8b5cf6', height = 160 }) {
  const [hover, setHover] = useState(null);
  if (!data.length) return <div className="chart-empty">No data</div>;

  const w = 560, h = height, padX = 8, padY = 16;
  const max = Math.max(1, ...data.map(d => d.count));
  const n = data.length;
  const stepX = (w - padX * 2) / Math.max(1, n - 1);
  const x = (i) => padX + i * stepX;
  const y = (v) => padY + (1 - v / max) * (h - padY * 2);

  const linePts = data.map((d, i) => `${x(i)},${y(d.count)}`);
  const linePath = 'M ' + linePts.join(' L ');
  const areaPath = `${linePath} L ${x(n - 1)},${h - padY} L ${x(0)},${h - padY} Z`;
  const gid = `area-${color.replace('#', '')}`;

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="area-chart"
           onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.4" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* gridlines */}
        {[0, 0.5, 1].map((g, i) => (
          <line key={i} x1={padX} x2={w - padX} y1={padY + g * (h - padY * 2)} y2={padY + g * (h - padY * 2)}
                stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
        ))}
        <path d={areaPath} fill={`url(#${gid})`} />
        <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {data.map((d, i) => (
          <g key={i}>
            {hover === i && (
              <line x1={x(i)} x2={x(i)} y1={padY} y2={h - padY} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
            )}
            <circle cx={x(i)} cy={y(d.count)} r={hover === i ? 5 : 3} fill={color}
                    stroke="#0b0f19" strokeWidth="2" />
            <rect x={x(i) - stepX / 2} y={0} width={stepX} height={h} fill="transparent"
                  onMouseEnter={() => setHover(i)} />
          </g>
        ))}
      </svg>
      <div className="chart-tip">
        {hover != null
          ? <span><b>{data[hover].count}</b> · {data[hover].label}</span>
          : <span className="muted">Hover the chart for daily values</span>}
      </div>
      <div className="chart-axis">
        <span>{data[0].label}</span>
        <span>{data[data.length - 1].label}</span>
      </div>
    </div>
  );
}

// Horizontal bar list for breakdowns (country, mode, etc.)
export function BarList({ items = [], color = '#60a5fa' }) {
  if (!items.length) return <div className="chart-empty">No data</div>;
  const max = Math.max(1, ...items.map(i => i.count));
  return (
    <div className="barlist">
      {items.slice(0, 10).map((it, i) => (
        <div className="barlist-row" key={i}>
          <span className="barlist-name" title={it.name}>{it.name}</span>
          <div className="barlist-track">
            <div className="barlist-fill" style={{ width: `${(it.count / max) * 100}%`, background: color }} />
          </div>
          <span className="barlist-val">{it.count}</span>
        </div>
      ))}
    </div>
  );
}
