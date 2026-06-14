import { showBackButton, hideBackButton } from './telegram.js';
import { setBackgroundVisible, mountBackground } from './background.js';
import { mountBackButton, setBackButtonVisible } from './backbutton.js';

// Screens that should NOT be kept in the back stack once you leave them.
// (You should never be able to "go back into" a finished/transient screen.)
const TRANSIENT = new Set(['game', 'result', 'replay-screen']);

// Screens where the animated menu background should be hidden (gameplay).
const NO_BACKGROUND = new Set(['game', 'team-game', 'replay-screen']);

// Screens with NO in-app back button (home root + gameplay, which have their
// own exit controls).
const NO_BACK_BUTTON = new Set(['home', 'game', 'team-game', 'result']);

class Router {
  constructor() {
    this.routes = {};
    this.activeScreen = null;
    this.history = []; // stack of { name, params }
    this.container = null;
  }

  init(containerSelector) {
    this.container = document.querySelector(containerSelector);
    if (!this.container) {
      console.error(`Container ${containerSelector} not found.`);
      return;
    }

    document.addEventListener('language-changed', () => {
      if (this.activeScreen) this.reRenderActiveScreen();
    });
  }

  register(name, ScreenClass) {
    this.routes[name] = ScreenClass;
  }

  /**
   * Navigate to a screen.
   * @param {string} routeName
   * @param {object} params
   * @param {object|boolean} options - { replace, push } (boolean kept for back-compat = push)
   */
  navigate(routeName, params = {}, options = {}) {
    const ScreenClass = this.routes[routeName];
    if (!ScreenClass) {
      console.error(`Route "${routeName}" is not registered.`);
      return;
    }

    // Back-compat: a boolean third arg means "pushToHistory"
    if (typeof options === 'boolean') options = { push: options };
    const replace = options.replace === true;
    const push = options.push !== false; // default true

    // Going home always resets the stack to a single entry (clean root).
    if (routeName === 'home') {
      this._destroyActive();
      this.history = [{ name: 'home', params }];
      this._render(ScreenClass, params);
      return;
    }

    this._destroyActive();

    if (push) {
      const top = this.history[this.history.length - 1];
      const targetIsTransient = TRANSIENT.has(routeName);
      const topIsTransient = top && TRANSIENT.has(top.name);

      if (replace && top) {
        // Explicit replace
        this.history[this.history.length - 1] = { name: routeName, params };
      } else if (topIsTransient) {
        // Never keep a transient screen underneath — replace it
        // (e.g. game -> result, result -> replay, result -> game rematch).
        this.history[this.history.length - 1] = { name: routeName, params };
      } else if (targetIsTransient) {
        // Entering a game/result/replay from a normal screen: replace the
        // current top so finished games don't leave config screens in the
        // back stack. Back from the game returns to the screen before it.
        this.history[this.history.length - 1] = { name: routeName, params };
      } else if (!top || top.name !== routeName) {
        this.history.push({ name: routeName, params });
      } else {
        // Same route again — just update its params.
        this.history[this.history.length - 1] = { name: routeName, params };
      }
    }

    this._render(ScreenClass, params);
  }

  back() {
    // Let the active screen intercept back (e.g. game confirms surrender).
    if (this.activeScreen && typeof this.activeScreen.onBack === 'function') {
      const handled = this.activeScreen.onBack();
      if (handled) return;
    }

    if (this.history.length <= 1) {
      // At root — go/stay home.
      this.navigate('home');
      return;
    }

    this.history.pop();
    const prev = this.history[this.history.length - 1];
    const ScreenClass = this.routes[prev.name];
    if (!ScreenClass) {
      this.navigate('home');
      return;
    }
    this._destroyActive();
    this._render(ScreenClass, prev.params);
  }

  goHome() {
    this.navigate('home');
  }

  clearHistory() {
    this.history = [];
    hideBackButton();
  }

  // ===== internal =====

  _destroyActive() {
    if (this.activeScreen && typeof this.activeScreen.destroy === 'function') {
      try { this.activeScreen.destroy(); } catch (e) { /* ignore */ }
    }
    if (this.container) this.container.innerHTML = '';
    this.activeScreen = null;
  }

  _render(ScreenClass, params) {
    // Toggle the Telegram back button based on stack depth.
    if (this.history.length > 1) {
      showBackButton(() => this.back());
    } else {
      hideBackButton();
    }

    // Compute whether this screen shows the menu background.
    const top = this.history[this.history.length - 1];

    this.activeScreen = new ScreenClass(this, params);
    this.container.innerHTML = this.activeScreen.render();
    // The innerHTML reset above wipes the persistent background; re-attach it
    // and apply the correct visibility for this screen (hidden in-game).
    mountBackground();
    setBackgroundVisible(!(top && NO_BACKGROUND.has(top.name)));
    mountBackButton();
    setBackButtonVisible(!(top && NO_BACK_BUTTON.has(top.name)));
    if (typeof this.activeScreen.afterRender === 'function') {
      this.activeScreen.afterRender();
    }
  }

  reRenderActiveScreen() {
    if (!this.activeScreen) return;
    const scrollPos = window.scrollY;
    this.container.innerHTML = this.activeScreen.render();
    mountBackground();
    mountBackButton();
    if (typeof this.activeScreen.afterRender === 'function') {
      this.activeScreen.afterRender();
    }
    window.scrollTo(0, scrollPos);
  }
}

export const router = new Router();
export default router;
