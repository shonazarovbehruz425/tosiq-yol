import { haptic, getInitData } from "../core/telegram.js";

/**
 * DotBoxScreen
 * Renders the DotBox game in a true full-viewport overlay using fixed positioning,
 * so the iframe always fills 100vw × 100vh regardless of parent layout.
 */
export class DotBoxScreen {
  constructor(router, params) {
    this.router = router;
    this.params = params;
  }

  render() {
    return `
      <div class="dotbox-fullscreen" id="dotbox-fullscreen">
        <!-- Floating back button — always above the iframe -->
        <button class="dotbox-back-btn" id="dotbox-back-btn" aria-label="Orqaga">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
               stroke-linecap="round" stroke-linejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>

        <!-- DotBox game — true full-screen iframe -->
        <iframe
          id="dotbox-iframe"
          src="/dotbox/index.html"
          title="Dots & Boxes"
          allow="vibrate"
          sandbox="allow-scripts allow-same-origin allow-forms"
        ></iframe>
      </div>
    `;
  }

  afterRender() {
    const backBtn = document.getElementById("dotbox-back-btn");
    if (backBtn) {
      backBtn.addEventListener("click", () => {
        haptic.impact("medium");
        this.router.navigate("home");
      });
    }

    // Inject Telegram initData into the DotBox iframe so it can
    // authenticate its own WebSocket connection to the server.
    const iframe = document.getElementById("dotbox-iframe");
    if (iframe) {
      const sendInit = () => {
        try {
          const initData = getInitData();
          iframe.contentWindow?.postMessage(
            { type: "dotbox_init", initData },
            "*",
          );
        } catch (e) {
          /* cross-origin or iframe not ready */
        }
      };
      iframe.addEventListener("load", sendInit);
      // Try immediately in case the iframe already finished loading
      sendInit();
    }
  }

  destroy() {
    // Blank the iframe so any audio / timers inside DotBox stop immediately
    const iframe = document.getElementById("dotbox-iframe");
    if (iframe) iframe.src = "about:blank";
  }
}

export default DotBoxScreen;
