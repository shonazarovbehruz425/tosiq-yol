// Custom-designed ANIMATED reaction icons (not plain emoji/stickers).
// Each reaction has:
//   key   - sent over the network
//   color - accent colour for the glow/ring
//   sound - id passed to Sound.reaction() for an expressive synthesized voice
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
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 14a4 4 0 0 0 8 0z" fill="#34d399" stroke="none"/><path d="M7 9.5 10 11M17 9.5 14 11"/></svg>`
  },
  {
    key: 'fire',
    color: '#f97316',
    sound: 'fire',
    icon: `<svg viewBox="0 0 24 24" fill="none"><path d="M12 3c1.5 3 .5 5-1 6.5C9.7 10.8 9 12 9 13.5a3 3 0 0 0 6 .2c.8 1 1 2 1 2.8a4 4 0 1 1-8 0c0-2.4 1.4-4 2.5-5.5C11.8 9.2 12.6 6.4 12 3z" fill="url(#fireG)"/><defs><linearGradient id="fireG" x1="12" y1="3" x2="12" y2="20" gradientUnits="userSpaceOnUse"><stop stop-color="#fbbf24"/><stop offset="1" stop-color="#ef4444"/></linearGradient></defs></svg>`
  },
  {
    key: 'wow',
    color: '#a78bfa',
    sound: 'wow',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="9" cy="10" r="1.4" fill="#a78bfa" stroke="none"/><circle cx="15" cy="10" r="1.4" fill="#a78bfa" stroke="none"/><ellipse cx="12" cy="16" rx="2.2" ry="2.6"/></svg>`
  },
  {
    key: 'angry',
    color: '#fb7185',
    sound: 'angry',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="#fb7185" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 9l2 1M16 9l-2 1"/><path d="M9 16a4 4 0 0 1 6 0"/></svg>`
  },
  {
    key: 'clap',
    color: '#fbbf24',
    sound: 'clap',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 13l-2.5 2.5a2 2 0 0 0 0 2.8l1.2 1.2a4 4 0 0 0 2.8 1.2H14a5 5 0 0 0 5-5v-3.5"/><path d="M14 11l1.5-1.5"/><path d="M11.5 8.5 13 7"/><path d="M9.5 6.5 11 5"/><path d="M19 11l1-3M16.5 9l2-2.5"/></svg>`
  }
];

// Larger animated artwork shown when a reaction is triggered. Each reaction
// gets a face-like animated SVG (eyes/mouth move) with its own CSS animation
// class (defined in animations.css) so the reaction "plays" for ~1.4s.
function artSvg(key) {
  switch (key) {
    case 'laugh':
      return `
        <svg viewBox="0 0 64 64" class="ra-svg ra-laugh">
          <circle cx="32" cy="32" r="30" fill="#0f1830"/>
          <circle cx="32" cy="32" r="26" fill="url(#raL)"/>
          <path class="ra-eye" d="M18 26q5 -6 10 0" fill="none" stroke="#0b3d2e" stroke-width="3" stroke-linecap="round"/>
          <path class="ra-eye" d="M36 26q5 -6 10 0" fill="none" stroke="#0b3d2e" stroke-width="3" stroke-linecap="round"/>
          <path class="ra-mouth" d="M20 38a12 8 0 0 0 24 0z" fill="#0b3d2e"/>
          <defs><linearGradient id="raL" x1="0" y1="0" x2="0" y2="64" gradientUnits="userSpaceOnUse"><stop stop-color="#6ee7b7"/><stop offset="1" stop-color="#10b981"/></linearGradient></defs>
        </svg>`;
    case 'fire':
      return `
        <svg viewBox="0 0 64 64" class="ra-svg ra-fire">
          <path class="ra-flame" d="M32 6c5 9 2 14-2 18-3 3-5 6-5 10a9 9 0 0 0 18 .5c2 2.5 3 5.5 3 8A14 14 0 1 1 18 43c0-7 4-11 7.5-15.5C29 23 33 16 32 6z" fill="url(#raF)"/>
          <path d="M32 30c2 4 .8 7-1 9-1.4 1.5-2 3-2 4.6a4 4 0 0 0 8 0c0-1-.4-2-1-3z" fill="#fde68a"/>
          <defs><linearGradient id="raF" x1="32" y1="6" x2="32" y2="58" gradientUnits="userSpaceOnUse"><stop stop-color="#fbbf24"/><stop offset="1" stop-color="#ef4444"/></linearGradient></defs>
        </svg>`;
    case 'wow':
      return `
        <svg viewBox="0 0 64 64" class="ra-svg ra-wow">
          <circle cx="32" cy="32" r="30" fill="#0f1830"/>
          <circle cx="32" cy="32" r="26" fill="url(#raW)"/>
          <circle class="ra-eye" cx="23" cy="26" r="3.4" fill="#23104d"/>
          <circle class="ra-eye" cx="41" cy="26" r="3.4" fill="#23104d"/>
          <ellipse class="ra-mouth" cx="32" cy="42" rx="5" ry="7" fill="#23104d"/>
          <defs><linearGradient id="raW" x1="0" y1="0" x2="0" y2="64" gradientUnits="userSpaceOnUse"><stop stop-color="#c4b5fd"/><stop offset="1" stop-color="#8b5cf6"/></linearGradient></defs>
        </svg>`;
    case 'angry':
      return `
        <svg viewBox="0 0 64 64" class="ra-svg ra-angry">
          <circle cx="32" cy="32" r="30" fill="#0f1830"/>
          <circle cx="32" cy="32" r="26" fill="url(#raA)"/>
          <path class="ra-brow" d="M18 24l10 4M46 24l-10 4" stroke="#4c0519" stroke-width="3" stroke-linecap="round"/>
          <circle cx="24" cy="30" r="2.4" fill="#4c0519"/>
          <circle cx="40" cy="30" r="2.4" fill="#4c0519"/>
          <path d="M24 44a10 6 0 0 1 16 0" fill="none" stroke="#4c0519" stroke-width="3" stroke-linecap="round"/>
          <defs><linearGradient id="raA" x1="0" y1="0" x2="0" y2="64" gradientUnits="userSpaceOnUse"><stop stop-color="#fda4af"/><stop offset="1" stop-color="#e11d48"/></linearGradient></defs>
        </svg>`;
    case 'clap':
      return `
        <svg viewBox="0 0 64 64" class="ra-svg ra-clap">
          <g class="ra-hand-l">
            <path d="M30 16l-9 9a5 5 0 0 0 0 7l4 4a9 9 0 0 0 6 2.6" fill="none" stroke="#fbbf24" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
          </g>
          <g class="ra-hand-r">
            <path d="M34 16l9 9a5 5 0 0 1 0 7l-4 4a9 9 0 0 1-6 2.6" fill="none" stroke="#f59e0b" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
          </g>
          <g class="ra-spark">
            <path d="M32 8v6M20 12l3 5M44 12l-3 5" stroke="#fde68a" stroke-width="3" stroke-linecap="round"/>
          </g>
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
