// Custom-designed ANIMATED reaction icons (not plain emoji/stickers).
// Each reaction has:
//   key   - sent over the network
//   color - accent colour for the glow/ring
//   sound - id passed to Sound.reaction() for an expressive synthesized voice
import { preloadMemes, playMeme } from '../core/sound.js';
//   icon  - small static SVG used in the picker button
//   art   - large SVG (rendered with its own CSS animation) that floats up and
//           plays for >= 1 second when triggered
//
// There are 5 reactions (laugh, fire, wow, angry, clap).

export const REACTIONS = [
  {
    key: 'laugh',
    color: '#34d399',
    sound: 'laugh',
    icon: `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="url(#icLa)"/><path d="M7.5 9.5 10 11 7.5 12.5z" fill="#0b3d2e"/><path d="M16.5 9.5 14 11l2.5 1.5z" fill="#0b3d2e"/><path d="M7 14h10a5 5 0 0 1-10 0z" fill="#0b3d2e"/><path d="M8.5 14h7a3.5 3.5 0 0 1-7 0z" fill="#ff7591"/><defs><linearGradient id="icLa" x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse"><stop stop-color="#6ee7b7"/><stop offset="1" stop-color="#10b981"/></linearGradient></defs></svg>`
  },
  {
    key: 'fire',
    color: '#f97316',
    sound: 'fire',
    icon: `<svg viewBox="0 0 24 24" fill="none"><path d="M12 2c1.7 3.4.6 5.7-1.1 7.4C9.4 10.9 8.5 12.3 8.5 14a4.5 4.5 0 0 0 9 .3c.9 1.1 1.2 2.3 1.2 3.2A6.5 6.5 0 1 1 6 17c0-3.6 2-5.8 3.7-7.6C11.9 7 13.4 4.6 12 2z" fill="url(#icFi)"/><path d="M12.5 12c1 2 .3 3.4-.7 4.5-.8.8-1.3 1.7-1.3 2.7a2.5 2.5 0 0 0 5 0c0-.7-.3-1.4-.8-2z" fill="#fde68a"/><defs><linearGradient id="icFi" x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse"><stop stop-color="#fbbf24"/><stop offset="1" stop-color="#ef4444"/></linearGradient></defs></svg>`
  },
  {
    key: 'wow',
    color: '#a78bfa',
    sound: 'wow',
    icon: `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="url(#icWo)"/><circle cx="8.6" cy="9.6" r="1.7" fill="#23104d"/><circle cx="15.4" cy="9.6" r="1.7" fill="#23104d"/><ellipse cx="12" cy="16" rx="2.6" ry="3.2" fill="#23104d"/><defs><linearGradient id="icWo" x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse"><stop stop-color="#c4b5fd"/><stop offset="1" stop-color="#8b5cf6"/></linearGradient></defs></svg>`
  },
  {
    key: 'angry',
    color: '#fb7185',
    sound: 'angry',
    icon: `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="url(#icAn)"/><path d="M6.5 8.5 11 10.5" stroke="#4c0519" stroke-width="2" stroke-linecap="round"/><path d="M17.5 8.5 13 10.5" stroke="#4c0519" stroke-width="2" stroke-linecap="round"/><circle cx="8.8" cy="12" r="1.5" fill="#4c0519"/><circle cx="15.2" cy="12" r="1.5" fill="#4c0519"/><path d="M8.5 17a4 4 0 0 1 7 0z" fill="#4c0519"/><defs><linearGradient id="icAn" x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse"><stop stop-color="#fda4af"/><stop offset="1" stop-color="#e11d48"/></linearGradient></defs></svg>`
  },
  {
    key: 'wave',
    color: '#38bdf8',
    sound: 'clap',
    icon: `<svg viewBox="0 0 24 24" fill="none"><path d="M7 12V6.5a1.3 1.3 0 0 1 2.6 0V11m0-.5V5a1.3 1.3 0 0 1 2.6 0v5.5m0-.3V6a1.3 1.3 0 0 1 2.6 0v5m0-1.2a1.3 1.3 0 0 1 2.6 0V14a6 6 0 0 1-6 6h-.7a6 6 0 0 1-4.4-2L4 14.5a1.4 1.4 0 0 1 2-2z" fill="url(#icWa)" stroke="url(#icWa)" stroke-width="0.5" stroke-linejoin="round"/><defs><linearGradient id="icWa" x1="12" y1="3" x2="12" y2="20" gradientUnits="userSpaceOnUse"><stop stop-color="#7dd3fc"/><stop offset="1" stop-color="#0ea5e9"/></linearGradient></defs></svg>`
  }
];

// Larger animated artwork shown when a reaction is triggered. Each reaction
// gets a filled, glossy animated SVG with its own CSS animation class (defined
// in animations.css) so the reaction "plays" for ~1.4s.
function artSvg(key) {
  switch (key) {
    case 'laugh':
      return `
        <svg viewBox="0 0 64 64" class="ra-svg ra-laugh">
          <circle cx="32" cy="32" r="30" fill="url(#raL)"/>
          <path class="ra-eye" d="M18 24l8 4-8 4z" fill="#0b3d2e"/>
          <path class="ra-eye" d="M46 24l-8 4 8 4z" fill="#0b3d2e"/>
          <path class="ra-mouth" d="M18 36h28a14 14 0 0 1-28 0z" fill="#0b3d2e"/>
          <path d="M22 36h20a10 10 0 0 1-20 0z" fill="#ff7591"/>
          <defs><linearGradient id="raL" x1="0" y1="2" x2="0" y2="62" gradientUnits="userSpaceOnUse"><stop stop-color="#6ee7b7"/><stop offset="1" stop-color="#10b981"/></linearGradient></defs>
        </svg>`;
    case 'fire':
      return `
        <svg viewBox="0 0 64 64" class="ra-svg ra-fire">
          <path class="ra-flame" d="M32 5c4.5 9 1.6 15-3 19-4 3.5-6.5 7-6.5 11.5a12 12 0 0 0 24 .8c2.3 2.8 3.2 6 3.2 8.5A17 17 0 1 1 16 45c0-9.5 5.3-15.5 10-20.5C30 19 35.5 13 32 5z" fill="url(#raF)"/>
          <path d="M33 30c2.6 5 .8 9-1.8 11.5-2 2-3.3 4.2-3.3 6.6a6.5 6.5 0 0 0 13 0c0-1.8-.7-3.5-1.8-5z" fill="#fde68a"/>
          <defs><linearGradient id="raF" x1="32" y1="5" x2="32" y2="60" gradientUnits="userSpaceOnUse"><stop stop-color="#fbbf24"/><stop offset="1" stop-color="#ef4444"/></linearGradient></defs>
        </svg>`;
    case 'wow':
      return `
        <svg viewBox="0 0 64 64" class="ra-svg ra-wow">
          <circle cx="32" cy="32" r="30" fill="url(#raW)"/>
          <circle class="ra-eye" cx="23" cy="25" r="4.5" fill="#23104d"/>
          <circle class="ra-eye" cx="41" cy="25" r="4.5" fill="#23104d"/>
          <ellipse class="ra-mouth" cx="32" cy="42" rx="6.5" ry="8.5" fill="#23104d"/>
          <defs><linearGradient id="raW" x1="0" y1="2" x2="0" y2="62" gradientUnits="userSpaceOnUse"><stop stop-color="#c4b5fd"/><stop offset="1" stop-color="#8b5cf6"/></linearGradient></defs>
        </svg>`;
    case 'angry':
      return `
        <svg viewBox="0 0 64 64" class="ra-svg ra-angry">
          <circle cx="32" cy="32" r="30" fill="url(#raA)"/>
          <path class="ra-brow" d="M16 22l12 5M48 22l-12 5" stroke="#4c0519" stroke-width="4" stroke-linecap="round"/>
          <circle cx="23" cy="31" r="3.4" fill="#4c0519"/>
          <circle cx="41" cy="31" r="3.4" fill="#4c0519"/>
          <path d="M22 46a11 7 0 0 1 20 0z" fill="#4c0519"/>
          <defs><linearGradient id="raA" x1="0" y1="2" x2="0" y2="62" gradientUnits="userSpaceOnUse"><stop stop-color="#fda4af"/><stop offset="1" stop-color="#e11d48"/></linearGradient></defs>
        </svg>`;
    case 'wave':
      return `
        <svg viewBox="0 0 64 64" class="ra-svg ra-wave">
          <g class="ra-hand">
            <path d="M18 32V18a3.4 3.4 0 0 1 6.8 0v11m0-1.5V14a3.4 3.4 0 0 1 6.8 0v14.5m0-.8V16a3.4 3.4 0 0 1 6.8 0v13.5m0-3.2a3.4 3.4 0 0 1 6.8 0V36a16 16 0 0 1-16 16h-2a16 16 0 0 1-11.6-5.3L10 39a3.6 3.6 0 0 1 5.2-5z" fill="url(#raV)"/>
          </g>
          <defs><linearGradient id="raV" x1="32" y1="8" x2="32" y2="54" gradientUnits="userSpaceOnUse"><stop stop-color="#7dd3fc"/><stop offset="1" stop-color="#0ea5e9"/></linearGradient></defs>
        </svg>`;
    default:
      return `<span>🎉</span>`;
  }
}

// Big floating artwork wrapper. `class reaction-art` adds the glowing bubble;
// the inner SVG carries the per-reaction animation.
export function reactionArt(key) {
  const r = REACTIONS.find(x => x.key === key);
  const color = r ? r.color : '#7c3aed';
  return `<span class="reaction-art reaction-art-anim" style="--rc:${color}">${artSvg(key)}</span>`;
}

export function getReaction(key) {
  return REACTIONS.find(x => x.key === key) || null;
}

// Meme sound files (in /public/sounds) mapped to reactions by their position:
//   1st reaction (laugh) -> sound3
//   2nd reaction (fire)  -> sound2
//   3rd reaction (wow)   -> sound4
//   4th reaction (angry) -> sound1
// The 5th (wave) has no meme sound.
const MEME_SOUND_ID = {
  laugh: 'sound3',
  fire:  'sound2',
  wow:   'sound4',
  angry: 'sound1'
};

const MEME_FILES = [
  { id: 'sound1', url: '/sounds/sound1.m4a' },
  { id: 'sound2', url: '/sounds/sound2.m4a' },
  { id: 'sound3', url: '/sounds/sound3.m4a' },
  { id: 'sound4', url: '/sounds/sound4.m4a' }
];

let _preloaded = false;
// Decode all meme sounds up-front so playback is instant (no late-loading delay).
export function preloadReactionSounds() {
  if (_preloaded) return;
  _preloaded = true;
  preloadMemes(MEME_FILES);
}

// Play the meme sound for a reaction key. Returns true if a meme sound was
// played (so callers can skip the synthesized fallback). Respects the global
// sound setting via the Sound module.
export function playReactionSound(key, soundEnabled = true) {
  if (!soundEnabled) return true;
  const id = MEME_SOUND_ID[key];
  if (!id) return false;
  return playMeme(id);
}
