// In-game currency: "WAYZ" — earned by playing, spent in the shop.
// Centralised so the name and logo are consistent everywhere.

export const CURRENCY = {
  code: 'WAYZ',
  // Short symbol used inline next to amounts.
  symbol: 'W'
};

// Custom coin logo (SVG). A gold hex coin with the intersecting-arrows motif
// from the app icon. `size` = pixel diameter.
export function coinSvg(size = 18) {
  return `<svg class="wayz-coin" viewBox="0 0 32 32" width="${size}" height="${size}" aria-hidden="true">
    <defs>
      <linearGradient id="wayzG" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#fde68a"/>
        <stop offset="55%" stop-color="#fbbf24"/>
        <stop offset="100%" stop-color="#f59e0b"/>
      </linearGradient>
    </defs>
    <!-- Hex coin -->
    <path d="M16 2 28 9v14L16 30 4 23V9z" fill="url(#wayzG)" stroke="#b45309" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M16 5 25 10.5v11L16 27 7 21.5v-11z" fill="none" stroke="#fff8e1" stroke-width="1" opacity="0.6"/>
    <!-- Intersecting arrows (blocked paths) emblem -->
    <g stroke="#7c4a03" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none">
      <path d="M11 13h7"/>
      <path d="M16 11l2 2-2 2"/>
      <path d="M21 19h-7"/>
      <path d="M16 21l-2-2 2-2"/>
    </g>
  </svg>`;
}
