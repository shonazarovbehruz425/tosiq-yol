import { haptic } from '../core/telegram.js';

/**
 * DotBoxScreen
 * Loads the DotBox (Dots & Boxes) game in a full-screen iframe overlay.
 * The iframe points to /dotbox/index.html which is a separate React build.
 */
export class DotBoxScreen {
  constructor(router, params) {
    this.router = router;
    this.params = params;
  }

  render() {
    return `
      <div class="screen dotbox-screen-wrapper" style="padding:0;overflow:hidden;position:relative;">
        <!-- Back button overlay -->
        <button class="dotbox-back-btn" id="dotbox-back-btn" aria-label="Orqaga">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>

        <!-- DotBox game iframe -->
        <iframe
          id="dotbox-iframe"
          src="/dotbox/index.html"
          title="Dots & Boxes"
          sandbox="allow-scripts allow-same-origin allow-forms"
          style="
            width: 100%;
            height: 100%;
            border: none;
            display: block;
            position: absolute;
            top: 0; left: 0;
            background: #0b0f19;
          "
        ></iframe>
      </div>
    `;
  }

  afterRender() {
    const backBtn = document.getElementById('dotbox-back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        haptic.impact('medium');
        this.router.navigate('home');
      });
    }
  }

  destroy() {
    // Remove iframe src to stop any running audio/timers inside DotBox
    const iframe = document.getElementById('dotbox-iframe');
    if (iframe) iframe.src = 'about:blank';
  }
}

export default DotBoxScreen;
