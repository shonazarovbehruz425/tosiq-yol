// A small, pretty vertical adjuster that nudges the board up/down so players
// on tall phones can position it comfortably. The offset is saved per device.
import { haptic } from '../core/telegram.js';

const KEY = 'tosiq_board_shift';
const STEP = 28;       // px per tap
const MIN = -120;
const MAX = 120;

// Compute and apply a square board size in PX (no CSS aspect-ratio, which old
// desktop Telegram WebViews don't support). Returns a cleanup function.
export function sizeBoard(container) {
  if (!container) return () => {};
  const apply = () => {
    const host = container.parentElement || document.body;
    const cs = getComputedStyle(host);
    const padX = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
    const availW = (host.clientWidth || window.innerWidth) - padX;
    const root = document.documentElement;
    const appH = parseFloat(getComputedStyle(root).getPropertyValue('--app-height')) ||
                 window.innerHeight || 600;
    const availH = appH - 230;
    const size = Math.max(180, Math.floor(Math.min(availW, availH)));
    container.style.setProperty('--board-size', `${size}px`);
  };
  apply();
  const onResize = () => apply();
  window.addEventListener('resize', onResize);
  return () => window.removeEventListener('resize', onResize);
}

function load() {
  const v = parseInt(localStorage.getItem(KEY) || '0', 10);
  return Number.isNaN(v) ? 0 : Math.max(MIN, Math.min(MAX, v));
}
function save(v) {
  try { localStorage.setItem(KEY, String(v)); } catch (e) { /* ignore */ }
}

// Attach the adjuster to a board container element. Returns a cleanup function.
export function attachBoardShift(boardEl) {
  if (!boardEl) return () => {};
  let offset = load();
  const apply = () => { boardEl.style.transform = `translateY(${offset}px)`; };
  apply();

  const ctrl = document.createElement('div');
  ctrl.className = 'board-shift';
  ctrl.innerHTML = `
    <button class="bshift-btn" data-dir="up" aria-label="Up">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 15l6-6 6 6"/></svg>
    </button>
    <button class="bshift-btn bshift-reset" data-dir="reset" aria-label="Reset">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/></svg>
    </button>
    <button class="bshift-btn" data-dir="down" aria-label="Down">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
    </button>`;

  const onClick = (e) => {
    const btn = e.target.closest('.bshift-btn');
    if (!btn) return;
    const dir = btn.dataset.dir;
    if (dir === 'up') offset = Math.max(MIN, offset - STEP);
    else if (dir === 'down') offset = Math.min(MAX, offset + STEP);
    else offset = 0;
    haptic.selection();
    apply();
    save(offset);
  };
  ctrl.addEventListener('click', onClick);

  // Place the control inside the board container's parent (the game container)
  // so it floats at the right edge next to the board.
  const host = boardEl.parentElement || boardEl;
  host.appendChild(ctrl);

  return () => { ctrl.removeEventListener('click', onClick); ctrl.remove(); };
}
