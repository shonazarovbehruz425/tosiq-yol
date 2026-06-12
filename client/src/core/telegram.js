// Wrapper for window.Telegram.WebApp

const tg = window.Telegram?.WebApp;

export const isTelegram = () => {
  return !!(tg && tg.initData);
};

export const initTelegram = () => {
  if (tg) {
    try { tg.ready(); } catch (e) { /* ignore */ }
    try { tg.expand(); } catch (e) { /* ignore */ }
    try { applyTheme(); } catch (e) { /* ignore */ }

    // Watch for theme & viewport changes (guarded — older desktop clients vary)
    try { tg.onEvent('themeChanged', applyTheme); } catch (e) { /* ignore */ }
    try { tg.onEvent('viewportChanged', applyViewportHeight); } catch (e) { /* ignore */ }
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
  let height = 0;
  if (tg && tg.viewportStableHeight) {
    height = tg.viewportStableHeight;
  } else if (tg && tg.viewportHeight) {
    height = tg.viewportHeight;
  }
  // Guard: Telegram may report 0 before expand (esp. desktop). Fall back to window.
  if (!height || height < 200) {
    height = window.innerHeight || document.documentElement.clientHeight || 600;
  }

  const winW = window.innerWidth || document.documentElement.clientWidth || 400;

  // Compute the 9:16 portrait frame width explicitly (no CSS min()/calc/aspect-ratio,
  // which can break in older/desktop Telegram WebViews and cause a 0-width black screen).
  let width = Math.round(height * 9 / 16);
  if (width > winW) width = winW; // never wider than the viewport

  const root = document.documentElement;
  root.style.setProperty('--app-height', `${height}px`);
  root.style.setProperty('--app-width', `${width}px`);
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

// Open Telegram's native "share to a chat" picker with the given invite link
// and message, so the user can pick a specific friend. Falls back to copying
// the link outside Telegram. Returns 'shared' | 'copied' | 'failed'.
export const shareInvite = async (url, text = '') => {
  if (tg && typeof tg.openTelegramLink === 'function') {
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    try {
      tg.openTelegramLink(shareUrl);
      return 'shared';
    } catch (e) { /* fall through to clipboard */ }
  }
  try {
    await navigator.clipboard.writeText(`${text} ${url}`.trim());
    return 'copied';
  } catch (e) {
    return 'failed';
  }
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

// Cloud Storage Wrapper (Falls back to localStorage).
// Each call has a timeout so a stalled Telegram callback (seen on some desktop
// clients) can never hang the app — it falls back to localStorage instead.
const CS_TIMEOUT = 1500;

export const cloudStorage = {
  setItem: (key, value) => {
    return new Promise((resolve) => {
      let done = false;
      const finish = (v) => { if (!done) { done = true; resolve(v); } };
      const timer = setTimeout(() => {
        try { localStorage.setItem(key, value); } catch (e) {}
        finish(true);
      }, CS_TIMEOUT);
      try {
        if (tg?.CloudStorage && tg.isVersionAtLeast && tg.isVersionAtLeast('6.9')) {
          tg.CloudStorage.setItem(key, value, (err, success) => {
            clearTimeout(timer);
            try { localStorage.setItem(key, value); } catch (e) {}
            finish(!err && success);
          });
        } else {
          clearTimeout(timer);
          localStorage.setItem(key, value);
          finish(true);
        }
      } catch (e) {
        clearTimeout(timer);
        try { localStorage.setItem(key, value); } catch (_) {}
        finish(true);
      }
    });
  },
  getItem: (key) => {
    return new Promise((resolve) => {
      let done = false;
      const finish = (v) => { if (!done) { done = true; resolve(v); } };
      const timer = setTimeout(() => {
        // Telegram callback stalled — fall back to localStorage
        let local = null;
        try { local = localStorage.getItem(key); } catch (e) {}
        finish(local);
      }, CS_TIMEOUT);
      try {
        if (tg?.CloudStorage && tg.isVersionAtLeast && tg.isVersionAtLeast('6.9')) {
          tg.CloudStorage.getItem(key, (err, value) => {
            clearTimeout(timer);
            if (err || value == null || value === '') {
              let local = null;
              try { local = localStorage.getItem(key); } catch (e) {}
              finish(local);
            } else {
              finish(value);
            }
          });
        } else {
          clearTimeout(timer);
          finish(localStorage.getItem(key));
        }
      } catch (e) {
        clearTimeout(timer);
        let local = null;
        try { local = localStorage.getItem(key); } catch (_) {}
        finish(local);
      }
    });
  }
};
