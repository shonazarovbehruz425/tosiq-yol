// Global in-app back button, pinned to the top-left. Shown on menu/sub screens
// (not on the home screen or during gameplay). Calls router.back().
import { router } from './router.js';
import { haptic } from './telegram.js';

let btn = null;

export function initBackButton() {
  const app = document.getElementById('app');
  if (!app || btn) return;
  btn = document.createElement('button');
  btn.className = 'app-back-btn';
  btn.id = 'app-back-btn';
  btn.setAttribute('aria-label', 'Back');
  btn.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M15 18l-6-6 6-6"/>
    </svg>`;
  btn.addEventListener('click', () => {
    haptic.impact('light');
    router.back();
  });
  app.appendChild(btn);
  btn.style.display = 'none';
}

export function mountBackButton() {
  const app = document.getElementById('app');
  if (!app) return;
  if (!btn) { initBackButton(); return; }
  // Re-attach after the router wipes #app.
  if (btn.parentElement !== app) app.appendChild(btn);
}

export function setBackButtonVisible(visible) {
  if (btn) btn.style.display = visible ? 'flex' : 'none';
}
