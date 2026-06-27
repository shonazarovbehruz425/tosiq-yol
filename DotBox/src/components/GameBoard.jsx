import { useRef, useEffect, useCallback } from 'react';
import { adjBoxes, boxFull } from '../game/logic.js';
import { startNoise, stopNoise } from '../audio/sounds.js';
import styles from './GameBoard.module.css';

export default function GameBoard({ G, onMove, online, sync }) {
  const canvasRef = useRef(null);
  const drag = useRef({ dot: null, dir: null, cx: 0, cy: 0 });
  const layout = useRef({ DPR: 1, CW: 0, CH: 0, CELL: 60, PX: 30, PY: 30 });

  const dXY = useCallback((col, row) => {
    const { CELL, PX, PY } = layout.current;
    return { x: PX + col * CELL, y: PY + row * CELL };
  }, []);

  const draw = useCallback(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    const g = G.current;
    const { DPR, CW, CH, CELL } = layout.current;
    ctx.clearRect(0, 0, CW, CH);
    const n = g.size;

    // Filled boxes
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      if (!g.boxes[r][c]) continue;
      const { x, y } = dXY(c, r);
      const p = g.boxes[r][c];
      ctx.fillStyle = p === 1 ? 'rgba(124,58,237,.22)' : 'rgba(225,29,72,.22)';
      roundRect(ctx, x + 3, y + 3, CELL - 6, CELL - 6, 8); ctx.fill();
      ctx.fillStyle = p === 1 ? 'rgba(167,139,250,.7)' : 'rgba(251,113,133,.7)';
      ctx.beginPath(); ctx.arc(x + CELL / 2, y + CELL / 2, 3.5, 0, Math.PI * 2); ctx.fill();
    }

    // Ghost lines
    ctx.globalAlpha = .08; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 8]);
    for (let r = 0; r <= n; r++) for (let c = 0; c < n; c++) if (!g.hL[r][c]) {
      const a = dXY(c, r), b = dXY(c + 1, r);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    for (let r = 0; r < n; r++) for (let c = 0; c <= n; c++) if (!g.vL[r][c]) {
      const a = dXY(c, r), b = dXY(c, r + 1);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    ctx.setLineDash([]); ctx.globalAlpha = 1;

    // Placed lines
    const seg = (x0, y0, x1, y1, p) => {
      ctx.lineCap = 'round';
      const col = p === 1 ? '#7c3aed' : '#e11d48';
      const glow = p === 1 ? 'rgba(124,58,237,.5)' : 'rgba(225,29,72,.5)';
      ctx.strokeStyle = glow; ctx.lineWidth = 10; ctx.globalAlpha = .35;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      ctx.strokeStyle = col; ctx.lineWidth = 5; ctx.globalAlpha = 1;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    };
    for (let r = 0; r <= n; r++) for (let c = 0; c < n; c++) if (g.hL[r][c]) {
      const a = dXY(c, r), b = dXY(c + 1, r); seg(a.x, a.y, b.x, b.y, g.hL[r][c]);
    }
    for (let r = 0; r < n; r++) for (let c = 0; c <= n; c++) if (g.vL[r][c]) {
      const a = dXY(c, r), b = dXY(c, r + 1); seg(a.x, a.y, b.x, b.y, g.vL[r][c]);
    }

    // Drag preview
    const d = drag.current;
    if (d.dot && d.dir) {
      const { x: sx, y: sy } = dXY(d.dot.c, d.dot.r);
      let ex = sx, ey = sy;
      if (d.dir === 'h') {
        const dx = d.cx - sx, sgn = dx >= 0 ? 1 : -1, tc = d.dot.c + sgn;
        if (tc >= 0 && tc <= n) { const { x: tx } = dXY(tc, d.dot.r); ex = sx + (tx - sx) * Math.min(1, Math.abs(dx) / CELL); }
      } else {
        const dy = d.cy - sy, sgn = dy >= 0 ? 1 : -1, tr = d.dot.r + sgn;
        if (tr >= 0 && tr <= n) { const { y: ty } = dXY(d.dot.c, tr); ey = sy + (ty - sy) * Math.min(1, Math.abs(dy) / CELL); }
      }
      const col = g.cur === 1 ? '#a78bfa' : '#fb7185';
      ctx.lineCap = 'round'; ctx.strokeStyle = col; ctx.lineWidth = 5; ctx.globalAlpha = .75;
      ctx.shadowColor = col; ctx.shadowBlur = 16;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    }

    // Dots
    for (let r = 0; r <= n; r++) for (let c = 0; c <= n; c++) {
      const { x, y } = dXY(c, r);
      const isSel = d.dot && d.dot.r === r && d.dot.c === c;
      if (isSel) { ctx.shadowColor = g.cur === 1 ? '#a78bfa' : '#fb7185'; ctx.shadowBlur = 18; }
      ctx.fillStyle = isSel ? (g.cur === 1 ? '#a78bfa' : '#fb7185') : '#505c7a';
      ctx.beginPath(); ctx.arc(x, y, isSel ? 7.5 : 5.5, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    }
  }, [G, dXY]);

  const resize = useCallback(() => {
    const cvs = canvasRef.current;
    const cw = cvs?.parentElement;
    if (!cvs || !cw) return;
    const w = cw.clientWidth, h = cw.clientHeight;
    if (!w || !h) return;
    const DPR = window.devicePixelRatio || 1;
    cvs.width = w * DPR; cvs.height = h * DPR;
    cvs.style.width = w + 'px'; cvs.style.height = h + 'px';
    cvs.getContext('2d').setTransform(DPR, 0, 0, DPR, 0, 0);
    const n = G.current.size;
    const CELL = Math.floor(Math.min((w - 48) / n, (h - 48) / n));
    const PX = Math.floor((w - CELL * n) / 2);
    const PY = Math.floor((h - CELL * n) / 2);
    layout.current = { DPR, CW: w, CH: h, CELL, PX, PY };
    draw();
  }, [G, draw]);

  const nearDot = useCallback((px, py) => {
    const { CELL } = layout.current;
    const snap = Math.max(30, CELL * .46);
    let best = null, bd = snap;
    const n = G.current.size;
    for (let r = 0; r <= n; r++) for (let c = 0; c <= n; c++) {
      const { x, y } = dXY(c, r);
      const d = Math.hypot(px - x, py - y);
      if (d < bd) { bd = d; best = { r, c }; }
    }
    return best;
  }, [G, dXY]);

  const evPt = e => {
    const rect = canvasRef.current.getBoundingClientRect();
    const t = e.changedTouches?.[0] || e.touches?.[0] || e;
    return { px: t.clientX - rect.left, py: t.clientY - rect.top };
  };

  const onStart = useCallback(e => {
    e.preventDefault();
    const g = G.current;
    const { side } = online;
    if (g.over || g.aiOn || (g.mode === 'ai' && g.cur === 2) || (g.mode === 'online' && g.cur !== side)) return;
    const { px, py } = evPt(e);
    const dot = nearDot(px, py);
    if (!dot) return;
    const { x, y } = dXY(dot.c, dot.r);
    drag.current = { dot, dir: null, cx: x, cy: y };
    draw();
  }, [G, online, nearDot, dXY, draw]);

  const onPointerMove = useCallback(e => {
    e.preventDefault();
    if (!drag.current.dot) return;
    const { px, py } = evPt(e);
    drag.current.cx = px; drag.current.cy = py;
    if (!drag.current.dir) {
      const { x: sx, y: sy } = dXY(drag.current.dot.c, drag.current.dot.r);
      const dx = Math.abs(px - sx), dy = Math.abs(py - sy);
      if (dx > 9 || dy > 9) { drag.current.dir = dx >= dy ? 'h' : 'v'; startNoise(); }
    }
    draw();
  }, [dXY, draw]);

  const onEnd = useCallback(e => {
    e.preventDefault();
    if (!drag.current.dot) return;
    stopNoise();
    const { r, c } = drag.current.dot;
    const { CELL } = layout.current;
    if (drag.current.dir) {
      const { x: sx, y: sy } = dXY(c, r);
      if (drag.current.dir === 'h') {
        const dx = drag.current.cx - sx;
        if (Math.abs(dx) >= CELL * .36) { const tc = c + (dx >= 0 ? 1 : -1); if (tc >= 0 && tc <= G.current.size) onMove('h', r, Math.min(c, tc)); }
      } else {
        const dy = drag.current.cy - sy;
        if (Math.abs(dy) >= CELL * .36) { const tr = r + (dy >= 0 ? 1 : -1); if (tr >= 0 && tr <= G.current.size) onMove('v', Math.min(r, tr), c); }
      }
    }
    drag.current = { dot: null, dir: null, cx: 0, cy: 0 };
    draw();
  }, [G, dXY, draw, onMove]);

  const onCancel = useCallback(() => {
    stopNoise();
    drag.current = { dot: null, dir: null, cx: 0, cy: 0 };
    draw();
  }, [draw]);

  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    cvs.addEventListener('mousedown', onStart);
    cvs.addEventListener('mousemove', onPointerMove);
    cvs.addEventListener('mouseup', onEnd);
    cvs.addEventListener('mouseleave', onCancel);
    cvs.addEventListener('touchstart', onStart, { passive: false });
    cvs.addEventListener('touchmove', onPointerMove, { passive: false });
    cvs.addEventListener('touchend', onEnd, { passive: false });
    cvs.addEventListener('touchcancel', onCancel, { passive: false });
    return () => {
      cvs.removeEventListener('mousedown', onStart);
      cvs.removeEventListener('mousemove', onPointerMove);
      cvs.removeEventListener('mouseup', onEnd);
      cvs.removeEventListener('mouseleave', onCancel);
      cvs.removeEventListener('touchstart', onStart);
      cvs.removeEventListener('touchmove', onPointerMove);
      cvs.removeEventListener('touchend', onEnd);
      cvs.removeEventListener('touchcancel', onCancel);
    };
  }, [onStart, onPointerMove, onEnd, onCancel]);

  useEffect(() => {
    resize();
    const ro = new ResizeObserver(resize);
    if (canvasRef.current?.parentElement) ro.observe(canvasRef.current.parentElement);
    return () => ro.disconnect();
  }, [resize]);

  // Redraw when game state changes
  useEffect(() => { draw(); });

  return <canvas ref={canvasRef} className={styles.canvas} />;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}
