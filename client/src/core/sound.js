// Web Audio based sound effects with reliable mobile/Telegram WebView unlocking.
//
// Browsers (and Telegram's WebView) start an AudioContext in the "suspended"
// state and only allow it to resume from inside a user gesture. We unlock it on
// the first pointer/touch/key interaction and keep it warm afterwards.

let ctx = null;
let unlocked = false;
let enabled = true;

function ensureContext() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

// Resume the context (returns a promise). Safe to call repeatedly.
function resumeContext() {
  const c = ensureContext();
  if (!c) return Promise.resolve();
  if (c.state === 'suspended') {
    return c.resume().catch(() => {});
  }
  return Promise.resolve();
}

// Unlock on the first user gesture by playing a tiny silent buffer.
function unlock() {
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
    } catch (e) {
      /* ignore */
    }
  });
}

// Install global one-time unlock listeners.
export function initSound() {
  const handler = () => unlock();
  const opts = { passive: true };
  ['pointerdown', 'touchstart', 'mousedown', 'keydown'].forEach(evt => {
    window.addEventListener(evt, handler, opts);
  });
}

export function setSoundEnabled(value) {
  enabled = !!value;
}

export function isSoundEnabled() {
  return enabled;
}

// Internal: play a simple tone after making sure the context is running.
function playTone(configure) {
  if (!enabled) return;
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
    } catch (e) {
      /* ignore */
    }
  };

  if (c.state === 'suspended') {
    // Resume first, then play once running (handles the very first sound).
    resumeContext().then(fire);
  } else {
    fire();
  }
}

export const Sound = {
  move() {
    playTone((osc, gain, now) => {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.1);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.09, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.13);
    });
  },

  wall() {
    playTone((osc, gain, now) => {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.setValueAtTime(230, now + 0.05);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.13, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.17);
      osc.start(now);
      osc.stop(now + 0.18);
    });
  },

  error() {
    playTone((osc, gain, now) => {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.linearRampToValueAtTime(80, now + 0.2);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
      osc.start(now);
      osc.stop(now + 0.23);
    });
  },

  win() {
    // Simple ascending arpeggio
    const notes = [392, 523, 659, 784]; // G4, C5, E5, G5
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
  },

  lose() {
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
};

export default Sound;
