// Reaction set kept identical to the WrongWay app (client/src/game/reactions.js)
// so DotBox shows the same custom-designed icons, colours and keys.
//   key   - identifier (also used by playReaction for the synthesized sound)
//   color - accent colour for the glow/ring
//   icon  - small static SVG used in the picker button
export const REACTIONS = [
  {
    key: 'laugh',
    color: '#34d399',
    icon: `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="url(#icLa)"/><path d="M7.5 9.5 10 11 7.5 12.5z" fill="#0b3d2e"/><path d="M16.5 9.5 14 11l2.5 1.5z" fill="#0b3d2e"/><path d="M7 14h10a5 5 0 0 1-10 0z" fill="#0b3d2e"/><path d="M8.5 14h7a3.5 3.5 0 0 1-7 0z" fill="#ff7591"/><defs><linearGradient id="icLa" x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse"><stop stop-color="#6ee7b7"/><stop offset="1" stop-color="#10b981"/></linearGradient></defs></svg>`
  },
  {
    key: 'fire',
    color: '#f97316',
    icon: `<svg viewBox="0 0 24 24" fill="none"><path d="M12 2c1.7 3.4.6 5.7-1.1 7.4C9.4 10.9 8.5 12.3 8.5 14a4.5 4.5 0 0 0 9 .3c.9 1.1 1.2 2.3 1.2 3.2A6.5 6.5 0 1 1 6 17c0-3.6 2-5.8 3.7-7.6C11.9 7 13.4 4.6 12 2z" fill="url(#icFi)"/><path d="M12.5 12c1 2 .3 3.4-.7 4.5-.8.8-1.3 1.7-1.3 2.7a2.5 2.5 0 0 0 5 0c0-.7-.3-1.4-.8-2z" fill="#fde68a"/><defs><linearGradient id="icFi" x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse"><stop stop-color="#fbbf24"/><stop offset="1" stop-color="#ef4444"/></linearGradient></defs></svg>`
  },
  {
    key: 'wow',
    color: '#a78bfa',
    icon: `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="url(#icWo)"/><circle cx="8.6" cy="9.6" r="1.7" fill="#23104d"/><circle cx="15.4" cy="9.6" r="1.7" fill="#23104d"/><ellipse cx="12" cy="16" rx="2.6" ry="3.2" fill="#23104d"/><defs><linearGradient id="icWo" x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse"><stop stop-color="#c4b5fd"/><stop offset="1" stop-color="#8b5cf6"/></linearGradient></defs></svg>`
  },
  {
    key: 'angry',
    color: '#fb7185',
    icon: `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="url(#icAn)"/><path d="M6.5 8.5 11 10.5" stroke="#4c0519" stroke-width="2" stroke-linecap="round"/><path d="M17.5 8.5 13 10.5" stroke="#4c0519" stroke-width="2" stroke-linecap="round"/><circle cx="8.8" cy="12" r="1.5" fill="#4c0519"/><circle cx="15.2" cy="12" r="1.5" fill="#4c0519"/><path d="M8.5 17a4 4 0 0 1 7 0z" fill="#4c0519"/><defs><linearGradient id="icAn" x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse"><stop stop-color="#fda4af"/><stop offset="1" stop-color="#e11d48"/></linearGradient></defs></svg>`
  },
  {
    key: 'wave',
    color: '#38bdf8',
    icon: `<svg viewBox="0 0 24 24" fill="none"><path d="M7 12V6.5a1.3 1.3 0 0 1 2.6 0V11m0-.5V5a1.3 1.3 0 0 1 2.6 0v5.5m0-.3V6a1.3 1.3 0 0 1 2.6 0v5m0-1.2a1.3 1.3 0 0 1 2.6 0V14a6 6 0 0 1-6 6h-.7a6 6 0 0 1-4.4-2L4 14.5a1.4 1.4 0 0 1 2-2z" fill="url(#icWa)" stroke="url(#icWa)" stroke-width="0.5" stroke-linejoin="round"/><defs><linearGradient id="icWa" x1="12" y1="3" x2="12" y2="20" gradientUnits="userSpaceOnUse"><stop stop-color="#7dd3fc"/><stop offset="1" stop-color="#0ea5e9"/></linearGradient></defs></svg>`
  }
];
