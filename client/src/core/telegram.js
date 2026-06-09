// Wrapper for window.Telegram.WebApp

const tg = window.Telegram?.WebApp;

export const isTelegram = () => {
  return !!(tg && tg.initData);
};

export const initTelegram = () => {
  if (tg) {
    tg.ready();
    tg.expand();
    applyTheme();
    
    // Lock vertical swipes (prevent accidental minimize while playing) when supported
    try {
      if (tg.disableVerticalSwipes) tg.disableVerticalSwipes();
    } catch (e) { /* older clients */ }

    // Watch for theme changes
    tg.onEvent('themeChanged', applyTheme);

    // Keep app height in sync with the Telegram viewport
    tg.onEvent('viewportChanged', applyViewportHeight);
  }

  applyViewportHeight();

  // Fallback for browsers / desktop testing: track window resize
  window.addEventListener('resize', applyViewportHeight);
  window.addEventListener('orientationchange', () => {
    // Delay to let the browser settle the new dimensions
    setTimeout(applyViewportHeight, 200);
  });
};

// Write the real usable height into a CSS variable to avoid 100vh issues on mobile
const applyViewportHeight = () => {
  let height;
  if (tg && tg.viewportStableHeight) {
    height = tg.viewportStableHeight;
  } else if (tg && tg.viewportHeight) {
    height = tg.viewportHeight;
  } else {
    height = window.innerHeight;
  }
  document.documentElement.style.setProperty('--app-height', `${height}px`);
};

export const getInitData = () => {
  return tg ? tg.initData : '';
};

export const getTelegramUser = () => {
  if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) {
    return tg.initDataUnsafe.user;
  }
  // Fallback mock user for testing outside Telegram
  return {
    id: 123456789,
    first_name: 'Developer',
    last_name: 'Mode',
    username: 'dev_test',
    language_code: 'uz'
  };
};

const applyTheme = () => {
  if (!tg) return;
  const root = document.documentElement;
  
  // Set theme properties from Telegram
  const params = tg.themeParams;
  if (params) {
    root.style.setProperty('--tg-bg-color', params.bg_color || '#0F172A');
    root.style.setProperty('--tg-text-color', params.text_color || '#F1F5F9');
    root.style.setProperty('--tg-hint-color', params.hint_color || '#64748B');
    root.style.setProperty('--tg-link-color', params.link_color || '#8B5CF6');
    root.style.setProperty('--tg-button-color', params.button_color || '#7C3AED');
    root.style.setProperty('--tg-button-text-color', params.button_text_color || '#FFFFFF');
    root.style.setProperty('--tg-secondary-bg-color', params.secondary_bg_color || '#1E293B');
  }
};

// Haptic Feedback
export const haptic = {
  impact: (style = 'medium') => {
    if (tg?.HapticFeedback) {
      tg.HapticFeedback.impactOccurred(style);
    }
  },
  notification: (type = 'success') => {
    if (tg?.HapticFeedback) {
      tg.HapticFeedback.notificationOccurred(type);
    }
  },
  selection: () => {
    if (tg?.HapticFeedback) {
      tg.HapticFeedback.selectionChanged();
    }
  }
};

// Back Button Management
let backButtonCallback = null;

export const showBackButton = (callback) => {
  if (tg?.BackButton) {
    if (backButtonCallback) {
      tg.BackButton.offClick(backButtonCallback);
    }
    backButtonCallback = callback;
    tg.BackButton.onClick(callback);
    tg.BackButton.show();
  }
};

export const hideBackButton = () => {
  if (tg?.BackButton) {
    if (backButtonCallback) {
      tg.BackButton.offClick(backButtonCallback);
      backButtonCallback = null;
    }
    tg.BackButton.hide();
  }
};

// Cloud Storage Wrapper (Falls back to localStorage)
export const cloudStorage = {
  setItem: (key, value) => {
    return new Promise((resolve) => {
      try {
        if (tg?.CloudStorage && tg.isVersionAtLeast && tg.isVersionAtLeast('6.9')) {
          tg.CloudStorage.setItem(key, value, (err, success) => {
            resolve(!err && success);
          });
        } else {
          localStorage.setItem(key, value);
          resolve(true);
        }
      } catch (e) {
        console.warn('Telegram CloudStorage setItem failed, falling back to localStorage:', e);
        localStorage.setItem(key, value);
        resolve(true);
      }
    });
  },
  getItem: (key) => {
    return new Promise((resolve) => {
      try {
        if (tg?.CloudStorage && tg.isVersionAtLeast && tg.isVersionAtLeast('6.9')) {
          tg.CloudStorage.getItem(key, (err, value) => {
            resolve(err ? null : value);
          });
        } else {
          resolve(localStorage.getItem(key));
        }
      } catch (e) {
        console.warn('Telegram CloudStorage getItem failed, falling back to localStorage:', e);
        resolve(localStorage.getItem(key));
      }
    });
  }
};
