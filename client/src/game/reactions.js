// Custom-designed reaction icons (not plain emoji/stickers).
// Each reaction has a `key` (sent over the network), a small `icon` SVG used in
// the picker button, and a larger `art` SVG that floats up when triggered.

export const REACTIONS = [
  {
    key: 'fire',
    color: '#f97316',
    icon: `<svg viewBox="0 0 24 24" fill="none"><path d="M12 3c1.5 3 .5 5-1 6.5C9.7 10.8 9 12 9 13.5a3 3 0 0 0 6 .2c.8 1 1 2 1 2.8a4 4 0 1 1-8 0c0-2.4 1.4-4 2.5-5.5C11.8 9.2 12.6 6.4 12 3z" fill="url(#fireG)"/><defs><linearGradient id="fireG" x1="12" y1="3" x2="12" y2="20" gradientUnits="userSpaceOnUse"><stop stop-color="#fbbf24"/><stop offset="1" stop-color="#ef4444"/></linearGradient></defs></svg>`
  },
  {
    key: 'clap',
    color: '#fbbf24',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 13l-2.5 2.5a2 2 0 0 0 0 2.8l1.2 1.2a4 4 0 0 0 2.8 1.2H14a5 5 0 0 0 5-5v-3.5"/><path d="M14 11l1.5-1.5"/><path d="M11.5 8.5 13 7"/><path d="M9.5 6.5 11 5"/><path d="M19 11l1-3M16.5 9l2-2.5"/></svg>`
  },
  {
    key: 'strong',
    color: '#22d3ee',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="#22d3ee" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 13v-2a2 2 0 0 1 4 0v1V5a2 2 0 0 1 4 0v6"/><path d="M14 8a2 2 0 0 1 4 0v6a6 6 0 0 1-6 6h-1a6 6 0 0 1-5-2.7L3.5 13"/></svg>`
  },
  {
    key: 'shock',
    color: '#a78bfa',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="9" cy="10" r="1.4" fill="#a78bfa" stroke="none"/><circle cx="15" cy="10" r="1.4" fill="#a78bfa" stroke="none"/><ellipse cx="12" cy="16" rx="2.2" ry="2.6"/></svg>`
  },
  {
    key: 'angry',
    color: '#fb7185',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="#fb7185" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 9l2 1M16 9l-2 1"/><path d="M9 16a4 4 0 0 1 6 0"/></svg>`
  },
  {
    key: 'laugh',
    color: '#34d399',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 14a4 4 0 0 0 8 0z" fill="#34d399" stroke="none"/><path d="M7 9.5 10 11M17 9.5 14 11"/></svg>`
  }
];

// Big floating artwork (reuses the same icon but rendered large with a glow).
export function reactionArt(key) {
  const r = REACTIONS.find(x => x.key === key);
  if (!r) return '🎉';
  return `<span class="reaction-art" style="--rc:${r.color}">${r.icon}</span>`;
}

export function getReaction(key) {
  return REACTIONS.find(x => x.key === key) || null;
}
