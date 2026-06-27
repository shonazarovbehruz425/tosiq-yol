// Web Audio based sound effects for DotBox.
//
// Browsers (and Telegram's WebView) start an AudioContext in the "suspended"
// state and only allow it to resume from inside a user gesture. We unlock it on
// the first interaction (App calls unlockAudio on the first pointerdown) and
// keep it warm afterwards. All effects are synthesized — no audio assets.

let ctx = null;
let unlocked = false;

function soundOn() {
  return typeof window === 'undefined' ? true : window.__dbSoundEnabled !== false;
}

function ensureContext() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

function resumeContext() {
  const c = ensureContext();
  if (!c) return Promise.resolve();
  if (c.state === 'suspended') return c.resume().catch(() => {});
  return Promise.resolve();
}

// Unlock on the first user gesture by playing a tiny silent buffer.
export function unlockAudio() {
  const c = ensureContext();
  if (!c) return;
  resumeContext().then(() => {
    if (unlocked) return;
    try {
      const buffer = c.createBuffer(1, 1, 22050);
      const src = c.createBufferSource();
      src.buffer = buffer;
      src.connect(c.destination);
      src.start(0);
      unlocked = true;
    } catch { /* ignore */ }
  });
}

// No bundled meme assets — kept for API compatibility with the call site.
export function preloadMemes() { /* no-op */ }

// Internal: play a simple tone after making sure the context is running.
function playTone(configure) {
  if (!soundOn()) return;
  const c = ensureContext();
  if (!c) return;
  const fire = () => {
    try {
      const now = c.currentTime;
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.connect(gain);
      gain.connect(c.destination);
      configure(osc, gain, now);
    } catch { /* ignore */ }
  };
  if (c.state === 'suspended') resumeContext().then(fire);
  else fire();
}

// ── Pencil scratch noise (looping while the player drags a line) ────────────
let noiseSrc = null;
let noiseGain = null;

export function startNoise() {
  if (!soundOn()) return;
  const c = ensureContext();
  if (!c) return;
  const fire = () => {
    if (noiseSrc) return; // already scratching
    try {
      const dur = 2;
      const buffer = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
      const src = c.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      const filter = c.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1800;
      filter.Q.value = 0.7;
      const gain = c.createGain();
      gain.gain.setValueAtTime(0.0001, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.05, c.currentTime + 0.03);
      src.connect(filter); filter.connect(gain); gain.connect(c.destination);
      src.start(0);
      noiseSrc = src; noiseGain = gain;
    } catch { /* ignore */ }
  };
  if (c.state === 'suspended') resumeContext().then(fire);
  else fire();
}

export function stopNoise() {
  if (!noiseSrc) return;
  const c = ctx;
  try {
    if (c && noiseGain) {
      const now = c.currentTime;
      noiseGain.gain.cancelScheduledValues(now);
      noiseGain.gain.setValueAtTime(noiseGain.gain.value, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
      noiseSrc.stop(now + 0.06);
    } else {
      noiseSrc.stop();
    }
  } catch { /* ignore */ }
  noiseSrc = null; noiseGain = null;
}

// ── One-shot effects ────────────────────────────────────────────────────────
export function playSnap() {
  playTone((osc, gain, now) => {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.08);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.1, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
    osc.start(now);
    osc.stop(now + 0.11);
  });
}

// Box completed. player 1 = mine (bright), player 2 = opponent (lower).
export function playBoxDing(player = 1) {
  const base = player === 1 ? 660 : 440;
  const notes = [base, base * 1.5];
  notes.forEach((freq, i) => {
    playTone((osc, gain, now) => {
      const t = now + i * 0.07;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.12, t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      osc.start(t);
      osc.stop(t + 0.21);
    });
  });
}

export function playWin() {
  const notes = [392, 523, 659, 784]; // G4 C5 E5 G5
  notes.forEach((freq, i) => {
    playTone((osc, gain, now) => {
      const t = now + i * 0.12;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      osc.start(t);
      osc.stop(t + 0.26);
    });
  });
}

export function playLose() {
  const notes = [392, 311, 233]; // descending
  notes.forEach((freq, i) => {
    playTone((osc, gain, now) => {
      const t = now + i * 0.15;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.1, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      osc.start(t);
      osc.stop(t + 0.31);
    });
  });
}

// Expressive synthesized "voice" for each reaction button.
export function playReaction(id) {
  switch (id) {
    case 'laugh': {
      const beats = [520, 480, 560, 500, 460];
      beats.forEach((f, i) => {
        playTone((osc, gain, now) => {
          const t = now + i * 0.13;
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(f, t);
          osc.frequency.exponentialRampToValueAtTime(f * 1.4, t + 0.05);
          osc.frequency.exponentialRampToValueAtTime(f * 0.85, t + 0.11);
          gain.gain.setValueAtTime(0.0001, t);
          gain.gain.exponentialRampToValueAtTime(0.12, t + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
          osc.start(t);
          osc.stop(t + 0.13);
        });
      });
      break;
    }
    case 'fire': {
      playTone((osc, gain, now) => {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(900, now);
        osc.frequency.exponentialRampToValueAtTime(120, now + 0.9);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.1, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.05, now + 0.5);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.0);
        osc.start(now);
        osc.stop(now + 1.05);
      });
      break;
    }
    case 'wow': {
      playTone((osc, gain, now) => {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(720, now + 0.5);
        osc.frequency.exponentialRampToValueAtTime(640, now + 0.9);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.12, now + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.95);
        osc.start(now);
        osc.stop(now + 1.0);
      });
      break;
    }
    case 'angry': {
      playTone((osc, gain, now) => {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(110, now);
        for (let i = 0; i < 6; i++) {
          const t = now + i * 0.13;
          osc.frequency.setValueAtTime(i % 2 ? 95 : 125, t);
        }
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.13, now + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);
        osc.start(now);
        osc.stop(now + 0.9);
      });
      break;
    }
    case 'wave': {
      const notes = [523, 659, 784];
      notes.forEach((f, i) => {
        playTone((osc, gain, now) => {
          const t = now + i * 0.1;
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, t);
          gain.gain.setValueAtTime(0.0001, t);
          gain.gain.exponentialRampToValueAtTime(0.1, t + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
          osc.start(t);
          osc.stop(t + 0.19);
        });
      });
      break;
    }
    default:
      break;
  }
}
