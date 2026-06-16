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
  },

  // Expressive synthesized "voice" for each animated reaction (~1s).
  reaction(id) {
    switch (id) {
      case 'laugh': {
        // Bouncy "ha-ha-ha" — quick repeated bright blips rising then falling.
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
        // Whoosh: filtered noise-like sweep using a falling sawtooth.
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
        // Surprised rising "wooo".
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
        // Low growl: buzzy detuned saw with a slow wobble.
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
      case 'clap': {
        // Several short bright claps.
        for (let i = 0; i < 5; i++) {
          playTone((osc, gain, now) => {
            const t = now + i * 0.16;
            osc.type = 'square';
            osc.frequency.setValueAtTime(1200, t);
            osc.frequency.exponentialRampToValueAtTime(400, t + 0.04);
            gain.gain.setValueAtTime(0.0001, t);
            gain.gain.exponentialRampToValueAtTime(0.1, t + 0.005);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
            osc.start(t);
            osc.stop(t + 0.07);
          });
        }
        break;
      }
      default:
        break;
    }
  }
};

export default Sound;
