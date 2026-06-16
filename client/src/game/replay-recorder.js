import { QuoridorEngine } from './logic.js';

// Renders a game's move history onto an offscreen <canvas> and records it to a
// .webm video (with synthesized audio) using MediaRecorder. The server then
// transcodes it to a crisp MP4. Speed is configurable (1.5x .. 3x).
export class ReplayRecorder {
  constructor({ boardSize, initialWalls, moveHistory, mode = 'duel', size = 1080 }) {
    this.boardSize = boardSize || 9;
    this.initialWalls = initialWalls || 10;
    this.moveHistory = moveHistory || [];
    this.mode = mode;

    // Render at a high resolution for a crisp export. `size` is the board area
    // width; total canvas is square-ish with a header strip on top.
    this.size = size;             // board area width (px)
    this.headerH = Math.round(size * 0.1);
    this.padding = Math.round(size * 0.04);

    this.canvas = document.createElement('canvas');
    this.canvas.width = this.size;
    this.canvas.height = this.size + this.headerH;
    this.ctx = this.canvas.getContext('2d', { alpha: false });

    // Theme colours (kept independent of CSS so the export looks consistent).
    this.colors = {
      bg: '#0b0f1d',
      bg2: '#141a2e',
      panel: '#1b2138',
      cell: '#252b42',
      cellEdge: '#323a59',
      red: '#ef4444',
      redHi: '#f87171',
      blue: '#3b82f6',
      blueHi: '#60a5fa',
      wall: '#aab4d6',
      wallEdge: '#5b647e',
      redGoal: 'rgba(239,68,68,0.20)',
      blueGoal: 'rgba(59,130,246,0.20)',
      text: '#f1f3fb',
      sub: '#9aa0b5'
    };

    // Audio (synthesized move/wall sounds mixed into the recording).
    this._audioCtx = null;
    this._audioDest = null;
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
    const gapRatio = 0.16;
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
    const W = this.canvas.width;
    const H = this.canvas.height;
    const s = this.size / 720; // scale factor relative to the old 720 design

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, C.bg2);
    bgGrad.addColorStop(1, C.bg);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Header: logo mark + title + step counter
    const hy = this.headerH / 2;
    const markR = 18 * s;
    const markX = this.padding + markR;
    ctx.save();
    const lg = ctx.createLinearGradient(markX - markR, hy - markR, markX + markR, hy + markR);
    lg.addColorStop(0, '#8b5cf6');
    lg.addColorStop(1, '#4f46e5');
    ctx.fillStyle = lg;
    this.roundRect(markX - markR, hy - markR, markR * 2, markR * 2, markR * 0.5);
    ctx.fill();
    // arrows glyph
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3 * s;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(markX - 7 * s, hy - 4 * s);
    ctx.lineTo(markX + 7 * s, hy - 4 * s);
    ctx.moveTo(markX + 3 * s, hy - 8 * s);
    ctx.lineTo(markX + 7 * s, hy - 4 * s);
    ctx.lineTo(markX + 3 * s, hy);
    ctx.moveTo(markX + 7 * s, hy + 4 * s);
    ctx.lineTo(markX - 7 * s, hy + 4 * s);
    ctx.moveTo(markX - 3 * s, hy);
    ctx.lineTo(markX - 7 * s, hy + 4 * s);
    ctx.lineTo(markX - 3 * s, hy + 8 * s);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = C.text;
    ctx.font = `800 ${30 * s}px system-ui, -apple-system, sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText('Wrong Way', markX + markR + 14 * s, hy);

    ctx.fillStyle = C.sub;
    ctx.font = `700 ${24 * s}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'right';
    ctx.fillText(`${step}/${this.moveHistory.length}`, W - this.padding, hy);

    // Board panel with subtle border
    const boardW = L.N * L.cell + (L.N - 1) * L.gap;
    const pad = 10 * s;
    this.roundRect(L.left - pad, L.top - pad, boardW + pad * 2, boardW + pad * 2, 22 * s);
    ctx.fillStyle = C.panel;
    ctx.fill();
    ctx.lineWidth = 2 * s;
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.stroke();

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
        ctx.lineWidth = 1.5 * s;
        ctx.strokeStyle = C.cellEdge;
        ctx.stroke();
      }
    }

    // Walls — glossy slate bars with owner-coloured glow
    (engine.walls || []).forEach(w => {
      const glow = w.player === 0 ? C.red : C.blue;
      let x, y, ww, hh;
      if (w.type === 'H') {
        x = this.cellX(w.c, L);
        y = this.cellY(w.r, L) + L.cell;
        ww = 2 * L.cell + L.gap; hh = L.gap;
      } else {
        x = this.cellX(w.c, L) + L.cell;
        y = this.cellY(w.r, L);
        ww = L.gap; hh = 2 * L.cell + L.gap;
      }
      ctx.save();
      ctx.shadowColor = glow;
      ctx.shadowBlur = 12 * s;
      const wg = ctx.createLinearGradient(x, y, x, y + hh);
      wg.addColorStop(0, '#c2cae3');
      wg.addColorStop(1, '#6b76a0');
      ctx.fillStyle = wg;
      this.roundRect(x, y, ww, hh, Math.min(ww, hh) / 2);
      ctx.fill();
      ctx.restore();
    });

    // Pawns — glossy 3D spheres
    const pawnFill = [C.red, C.blue];
    const pawnHi = [C.redHi, C.blueHi];
    for (let i = 0; i < 2; i++) {
      const p = engine.pawnPos[i];
      if (!p) continue;
      const cx = this.cellX(p.c, L) + L.cell / 2;
      const cy = this.cellY(p.r, L) + L.cell / 2;
      const rad = L.cell * 0.34;
      ctx.save();
      ctx.shadowColor = pawnFill[i];
      ctx.shadowBlur = 18 * s;
      const pg = ctx.createRadialGradient(cx - rad * 0.3, cy - rad * 0.35, rad * 0.1, cx, cy, rad);
      pg.addColorStop(0, pawnHi[i]);
      pg.addColorStop(1, pawnFill[i]);
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.fillStyle = pg;
      ctx.fill();
      ctx.restore();
      // glossy highlight
      ctx.beginPath();
      ctx.arc(cx - rad * 0.28, cy - rad * 0.3, rad * 0.38, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.fill();
    }
  }

  // ---- audio ----
  initAudio() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this._audioCtx = new AC();
      if (this._audioCtx.state === 'suspended') this._audioCtx.resume().catch(() => {});
      this._audioDest = this._audioCtx.createMediaStreamDestination();
      return this._audioDest.stream;
    } catch (e) {
      return null;
    }
  }

  // Play a short tone into BOTH the recording destination and the speakers.
  playSound(kind) {
    const c = this._audioCtx;
    if (!c || !this._audioDest) return;
    try {
      const now = c.currentTime;
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.connect(gain);
      gain.connect(this._audioDest);   // into the recording
      gain.connect(c.destination);     // and audible while recording

      if (kind === 'move') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.1);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.18, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);
        osc.start(now); osc.stop(now + 0.14);
      } else { // wall
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.setValueAtTime(240, now + 0.05);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.22, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
        osc.start(now); osc.stop(now + 0.19);
      }
    } catch (e) { /* ignore */ }
  }

  // Record the whole game to a webm Blob (video + audio).
  // speed: playback multiplier (1.5 .. 3). onProgress(step,total) optional.
  record({ speed = 1.5, baseDelay = 900, onProgress = () => {} } = {}) {
    return new Promise((resolve, reject) => {
      if (!ReplayRecorder.isSupported()) {
        reject(new Error('unsupported'));
        return;
      }

      const delay = Math.max(140, baseDelay / speed);
      const fps = 60;
      let stream;
      try {
        stream = this.canvas.captureStream(fps);
      } catch (e) {
        reject(e);
        return;
      }

      // Add a synthesized audio track so the export has sound.
      const audioStream = this.initAudio();
      if (audioStream) {
        audioStream.getAudioTracks().forEach(tr => stream.addTrack(tr));
      }

      // Prefer higher-quality codecs when available.
      const candidates = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm'
      ];
      let mime = '';
      for (const cnd of candidates) {
        if (window.MediaRecorder.isTypeSupported && window.MediaRecorder.isTypeSupported(cnd)) { mime = cnd; break; }
      }

      let recorder;
      try {
        recorder = mime
          ? new window.MediaRecorder(stream, {
              mimeType: mime,
              videoBitsPerSecond: 16_000_000,
              audioBitsPerSecond: 128_000
            })
          : new window.MediaRecorder(stream);
      } catch (e) {
        reject(e);
        return;
      }

      const chunks = [];
      recorder.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
      recorder.onerror = (e) => reject(e.error || new Error('record_error'));
      recorder.onstop = () => {
        try { stream.getTracks().forEach(tr => tr.stop()); } catch (_) {}
        try { if (this._audioCtx) this._audioCtx.close(); } catch (_) {}
        const blob = new Blob(chunks, { type: (mime || 'video/webm').split(';')[0] });
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
          }, 800);
          return;
        }
        step++;
        const move = this.moveHistory[step - 1];
        this.drawState(this.engineAtStep(step), step);
        // Play the matching sound for this move.
        this.playSound(move && move.type === 'wall' ? 'wall' : 'move');
        onProgress(step, total);
        setTimeout(tick, delay);
      };

      // Small intro hold before the first move.
      setTimeout(tick, 600);
    });
  }
}
