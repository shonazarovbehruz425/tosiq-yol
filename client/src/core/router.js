import { showBackButton, hideBackButton } from './telegram.js';

class Router {
  constructor() {
    this.routes = {};
    this.activeScreen = null;
    this.history = [];
    this.container = null;
  }

  init(containerSelector) {
    this.container = document.querySelector(containerSelector);
    if (!this.container) {
      console.error(`Container ${containerSelector} not found.`);
      return;
    }
    
    // Listen for manual language changes to re-render the active screen
    document.addEventListener('language-changed', () => {
      if (this.activeScreen) {
        this.reRenderActiveScreen();
      }
    });
  }

  register(name, ScreenClass) {
    this.routes[name] = ScreenClass;
  }

  navigate(routeName, params = {}, pushToHistory = true) {
    const ScreenClass = this.routes[routeName];
    if (!ScreenClass) {
      console.error(`Route "${routeName}" is not registered.`);
      return;
    }

    // Destroy active screen if it exists
    if (this.activeScreen) {
      if (typeof this.activeScreen.destroy === 'function') {
        this.activeScreen.destroy();
      }
      this.container.innerHTML = '';
    }

    if (pushToHistory) {
      // Don't duplicate consecutive duplicate routes
      const lastInHistory = this.history[this.history.length - 1];
      if (!lastInHistory || lastInHistory.name !== routeName) {
        this.history.push({ name: routeName, params });
      }
    }

    // Set up Telegram BackButton
    if (this.history.length > 1) {
      showBackButton(() => this.back());
    } else {
      hideBackButton();
    }

    // Create new screen instance
    this.activeScreen = new ScreenClass(this, params);
    
    // Render
    this.container.innerHTML = this.activeScreen.render();
    
    // Bind events
    if (typeof this.activeScreen.afterRender === 'function') {
      this.activeScreen.afterRender();
    }
  }

  back() {
    if (this.history.length <= 1) return;
    
    // Pop current screen
    this.history.pop();
    
    // Get previous screen
    const prev = this.history[this.history.length - 1];
    
    // Navigate without pushing to history again
    this.navigate(prev.name, prev.params, false);
  }

  clearHistory() {
    this.history = [];
    hideBackButton();
  }

  reRenderActiveScreen() {
    if (!this.activeScreen) return;
    const scrollPos = window.scrollY;
    
    // Extract parameters
    const params = this.activeScreen.params;
    
    // Re-render
    this.container.innerHTML = this.activeScreen.render();
    
    if (typeof this.activeScreen.afterRender === 'function') {
      this.activeScreen.afterRender();
    }
    
    window.scrollTo(0, scrollPos);
  }
}

export const router = new Router();
export default router;
