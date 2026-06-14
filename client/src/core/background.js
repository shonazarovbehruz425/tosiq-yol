// Persistent Quoridor-themed animated background. Mounted once behind #app so
// it shows across all menu screens, and hidden during gameplay.

function buildBackgroundHTML() {
  const walls = [
    // type, color, left%, top%, drift duration(s), delay(s)
    ['h', 'red',  12, 14, 16, 0],
    ['h', 'blue', 64, 9,  19, -5],
    ['v', 'blue', 8,  52, 18, -3],
    ['h', 'red',  78, 60, 17, -7],
    ['h', 'blue', 22, 82, 20, -9],
    ['v', 'red',  88, 30, 15, -6],
    ['v', 'blue', 44, 70, 21, -11],
    ['h', 'red',  52, 38, 18, -13],
  ];
  const pawns = [
    // color, left%, top%, float duration(s), delay(s)
    ['red',  56, 68, 8,  0],
    ['blue', 30, 26, 9,  -3],
    ['red',  82, 46, 10, -5],
    ['blue', 16, 74, 8.5, -2],
  ];

  const wallEls = walls.map(([type, color, l, t, dur, delay]) =>
    `<span class="qbg-wall ${type} ${color}" style="left:${l}%;top:${t}%;animation-duration:${dur}s;animation-delay:${delay}s"></span>`
  ).join('');

  const pawnEls = pawns.map(([color, l, t, dur, delay]) =>
    `<span class="qbg-pawn ${color}" style="left:${l}%;top:${t}%;animation-duration:${dur}s;animation-delay:${delay}s"></span>`
  ).join('');

  return `<div class="qbg-grid"></div><div class="qbg-items">${wallEls}${pawnEls}</div>`;
}

let bgEl = null;
let hidden = false;

// Create the background layer (once) and ensure it's the first child of #app.
// Safe to call repeatedly — the router wipes #app on navigation, so we
// re-attach the same element after each render.
export function mountBackground() {
  const app = document.getElementById('app');
  if (!app) return;
  if (!bgEl) {
    bgEl = document.createElement('div');
    bgEl.className = 'qbg qbg-global';
    bgEl.setAttribute('aria-hidden', 'true');
    bgEl.innerHTML = buildBackgroundHTML();
  }
  bgEl.style.display = hidden ? 'none' : '';
  if (bgEl.parentElement !== app) {
    app.insertBefore(bgEl, app.firstChild);
  } else if (app.firstChild !== bgEl) {
    app.insertBefore(bgEl, app.firstChild);
  }
}

// Back-compat alias used at bootstrap.
export function initBackground() {
  mountBackground();
}

// Show on menu screens, hide during gameplay.
export function setBackgroundVisible(visible) {
  hidden = !visible;
  if (bgEl) bgEl.style.display = visible ? '' : 'none';
}
