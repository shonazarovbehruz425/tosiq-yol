import { haptic, getInitData } from "../core/telegram.js";
import { getLanguage } from "../core/i18n.js";
import { isSoundEnabled } from "../core/sound.js";

/**
 * DotBoxScreen
 * Renders the DotBox game in a smooth animated overlay inside the #app 9:16 frame.
 * Uses a fade+scale entrance so it feels like a natural part of the WrongWay app.
 */
export class DotBoxScreen {
  constructor(router, params) {
    this.router = router;
    this.params = params;
  }

  render() {
    return `
      <div class="dotbox-fullscreen" id="dotbox-fullscreen">
        <!-- Loading indicator while iframe loads -->
        <div class="dotbox-loading" id="dotbox-loading">
          <div class="dotbox-loading-spinner"></div>
          <div class="dotbox-loading-text">Yuklanmoqda...</div>
        </div>

        <!-- Floating back button — always above the iframe -->
        <button class="dotbox-back-btn" id="dotbox-back-btn" aria-label="Orqaga">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
               stroke-linecap="round" stroke-linejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>

        <!-- DotBox game iframe -->
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
    // Smooth back navigation with exit animation
    const backBtn = document.getElementById("dotbox-back-btn");
    if (backBtn) {
      backBtn.addEventListener("click", () => {
        haptic.impact("medium");
        this.exitAndNavigate();
      });
    }

    // Hide loading spinner once iframe finishes loading
    const iframe = document.getElementById("dotbox-iframe");
    const loading = document.getElementById("dotbox-loading");

    if (iframe) {
      const onReady = () => {
        if (loading) {
          loading.classList.add("hidden");
          // Remove from DOM after fade-out transition
          setTimeout(() => loading.remove(), 350);
        }
      };

      iframe.addEventListener("load", onReady);
      // If iframe is already cached and loaded, hide immediately
      if (iframe.complete) onReady();

      // Inject Telegram initData + current WrongWay settings
      const post = (type) => {
        try {
          iframe.contentWindow?.postMessage(
            {
              type,
              initData: getInitData(),
              lang: getLanguage(),
              sound: isSoundEnabled(),
            },
            "*",
          );
        } catch (e) {
          /* cross-origin or iframe not ready */
        }
      };
      const sendInit = () => post("dotbox_init");
      const sendSettings = () => post("dotbox_settings");

      iframe.addEventListener("load", sendInit);
      sendInit();

      this._onLangChange = sendSettings;
      this._onSettingsChange = sendSettings;
      document.addEventListener("language-changed", this._onLangChange);
      document.addEventListener("settings-changed", this._onSettingsChange);
    }
  }

  // Animate out then navigate — feels like a natural in-app transition
  exitAndNavigate() {
    const el = document.getElementById("dotbox-fullscreen");
    if (el) {
      el.classList.add("dotbox-exit");
      el.addEventListener("animationend", () => {
        this.router.navigate("home");
      }, { once: true });
      // Safety fallback if animationend doesn't fire
      setTimeout(() => this.router.navigate("home"), 300);
    } else {
      this.router.navigate("home");
    }
  }

  destroy() {
    if (this._onLangChange) {
      document.removeEventListener("language-changed", this._onLangChange);
    }
    if (this._onSettingsChange) {
      document.removeEventListener("settings-changed", this._onSettingsChange);
    }
    // Blank the iframe so any audio / timers inside DotBox stop immediately
    const iframe = document.getElementById("dotbox-iframe");
    if (iframe) iframe.src = "about:blank";
  }
}

export default DotBoxScreen;
