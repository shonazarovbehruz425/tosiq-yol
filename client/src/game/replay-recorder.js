import { QuoridorEngine } from './logic.js';

// Renders a game's move history onto an offscreen <canvas> and records it to a
// downloadable .webm video using MediaRecorder. Speed is configurable so the
// exported clip can run faster than real time (1.5x .. 3x).
export class ReplayRecorder {
  constructor({ boardSize, initialWalls, moveHistory, mode = 'duel', size = 720 }) {
    this.boardSize = boardSize || 9;
    this.initialWalls = initialWalls || 10;
    this.moveHistory = moveHistory || [];
    this.mode = mode;

    this.size = size;          // square canvas (px)
    this.headerH = 70;         // top strip for step counter
    this.padding = 26;

    this.canvas = document.createElement('canvas');
    this.canvas.width = this.size;
    this.canvas.height = this.size + this.headerH;
    this.ctx = this.canvas.getContext('2d');

    // Theme colours (kept independent of CSS so the export looks consistent).
    this.colors = {
      bg: '#0f1020',
      panel: '#1a1c2e',
      cell: '#23263b',
      cellEdge: '#2e3250',
      red: '#ef4444',
      blue: '#3b82f6',
      redGoal: 'rgba(239,68,68,0.22)',
      blueGoal: 'rgba(59,130,246,0.22)',
      text: '#e6e8f0',
      sub: '#9aa0b5',
      accent: '#7c3aed'
    };
  }

  static isSupported() {
    return typeof window !== 'undefined' &&
      typeof window.MediaRecorder !== 'undefined' &&
      !!document.createElement('canvas').captureStream;
  }

  // Build engine state at a given step index.
  engineAtStep(step) {
    const engine = new QuoridorEngine(this.boardSize, this.initialWalls, this.mode);
    for (let i = 0; i < step; i++) {
      const m = this.moveHistory[i];
      if (m.type === 'move') engine.movePawn(m.r, m.c, m.player);
      else engine.placeWall(m.r, m.c, m.wallType, m.player);
    }
    return engine;
  }

  // ---- geometry helpers ----
  layout() {
    const N = this.boardSize;
    const avail = this.size - this.padding * 2;
    const gapRatio = 0.18;
    const cell = avail / (N + gapRatio * (N - 1));
    const gap = cell * gapRatio;
    return { N, cell, gap, top: this.headerH + this.padding, left: this.padding };
  }

  cellX(c, L) { return L.left + c * (L.cell + L.gap); }
  cellY(r, L) { return L.top + r * (L.cell + L.gap); }

  roundRect(x, y, w, h, r) {
    const ctx = this.ctx;
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  drawState(engine, step) {
    const ctx = this.ctx;
    const C = this.colors;
    const L = this.layout();

    // Background
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Header text
    ctx.fillStyle = C.text;
    ctx.font = '700 30px system-ui, -apple-system, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText('Wrong Way', this.padding, this.headerH / 2);

    ctx.fillStyle = C.sub;
    ctx.font = '600 22px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${step}/${this.moveHistory.length}`, this.size - this.padding, this.headerH / 2);

    // Board panel
    const boardW = L.N * L.cell + (L.N - 1) * L.gap;
    this.roundRect(L.left - 8, L.top - 8, boardW + 16, boardW + 16, 18);
    ctx.fillStyle = C.panel;
    ctx.fill();

    // Cells + goal tint
    for (let r = 0; r < L.N; r++) {
      for (let c = 0; c < L.N; c++) {
        const x = this.cellX(c, L), y = this.cellY(r, L);
        this.roundRect(x, y, L.cell, L.cell, L.cell * 0.16);
        let fill = C.cell;
        if (this.mode === 'race') {
          if (r === 0) fill = C.blueGoal;
        } else {
          if (r === 0) fill = C.redGoal;
          else if (r === L.N - 1) fill = C.blueGoal;
        }
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = C.cellEdge;
        ctx.stroke();
      }
    }

    // Walls
    (engine.walls || []).forEach(w => {
      const color = w.player === 0 ? C.red : C.blue;
      ctx.fillStyle = color;
      if (w.type === 'H') {
        const x = this.cellX(w.c, L);
        const y = this.cellY(w.r, L) + L.cell;
        this.roundRect(x, y, 2 * L.cell + L.gap, L.gap, L.gap / 2);
      } else {
        const x = this.cellX(w.c, L) + L.cell;
        const y = this.cellY(w.r, L);
        this.roundRect(x, y, L.gap, 2 * L.cell + L.gap, L.gap / 2);
      }
      ctx.fill();
    });

    // Pawns
    const pawnColors = [C.red, C.blue];
    for (let i = 0; i < 2; i++) {
      const p = engine.pawnPos[i];
      if (!p) continue;
      const cx = this.cellX(p.c, L) + L.cell / 2;
      const cy = this.cellY(p.r, L) + L.cell / 2;
      const rad = L.cell * 0.32;
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.fillStyle = pawnColors[i];
      ctx.shadowColor = pawnColors[i];
      ctx.shadowBlur = 16;
      ctx.fill();
      ctx.shadowBlur = 0;
      // inner highlight
      ctx.beginPath();
      ctx.arc(cx - rad * 0.25, cy - rad * 0.25, rad * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fill();
    }
  }

  // Record the whole game to a webm Blob.
  // speed: playback multiplier (1.5 .. 3). onProgress(step,total) optional.
  record({ speed = 1.5, baseDelay = 900, onProgress = () => {} } = {}) {
    return new Promise((resolve, reject) => {
      if (!ReplayRecorder.isSupported()) {
        reject(new Error('unsupported'));
        return;
      }

      const delay = Math.max(120, baseDelay / speed);
      const fps = 30;
      let stream;
      try {
        stream = this.canvas.captureStream(fps);
      } catch (e) {
        reject(e);
        return;
      }

      // Pick a supported mime type.
      const candidates = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
      let mime = '';
      for (const c of candidates) {
        if (window.MediaRecorder.isTypeSupported && window.MediaRecorder.isTypeSupported(c)) { mime = c; break; }
      }

      let recorder;
      try {
        recorder = mime ? new window.MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 12_000_000 })
                        : new window.MediaRecorder(stream);
      } catch (e) {
        reject(e);
        return;
      }

      const chunks = [];
      recorder.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
      recorder.onerror = (e) => reject(e.error || new Error('record_error'));
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mime || 'video/webm' });
        resolve(blob);
      };

      recorder.start();

      const total = this.moveHistory.length;
      let step = 0;

      // Draw the opening position and hold briefly.
      this.drawState(this.engineAtStep(0), 0);
      onProgress(0, total);

      const tick = () => {
        if (step >= total) {
          // Hold the final frame, then stop.
          setTimeout(() => {
            try { recorder.stop(); } catch (_) {}
            stream.getTracks().forEach(tr => tr.stop());
          }, 700);
          return;
        }
        step++;
        this.drawState(this.engineAtStep(step), step);
        onProgress(step, total);
        setTimeout(tick, delay);
      };

      // Small intro hold before the first move.
      setTimeout(tick, 600);
    });
  }
}
