// Wrapper for window.Telegram.WebApp

const tg = window.Telegram?.WebApp;

export const isTelegram = () => {
  return !!(tg && tg.initData);
};

export const initTelegram = () => {
  if (tg) {
    try { tg.ready(); } catch (e) { /* ignore */ }
    try { tg.expand(); } catch (e) { /* ignore */ }

    // Open in true full screen on supported clients (Bot API 8.0+).
    // Falls back silently to the expanded view on older clients.
    try {
      const ver = parseFloat(tg.version || '6.0');
      if (ver >= 8.0 && typeof tg.requestFullscreen === 'function') {
        tg.requestFullscreen();
      }
    } catch (e) { /* ignore */ }

    try { applyTheme(); } catch (e) { /* ignore */ }

    // Always stop Telegram's swipe-down-to-minimize gesture. On Android this
    // gesture otherwise hijacks in-app scrolling and wall dragging, so our
    // scrollable game screen never receives the touch. (Bot API 7.7+.)
    try {
      if (typeof tg.disableVerticalSwipes === 'function') {
        tg.disableVerticalSwipes();
      }
    } catch (e) { /* ignore */ }
    // Some clients expose this as a writable flag.
    try {
      if ('isVerticalSwipesEnabled' in tg) tg.isVerticalSwipesEnabled = false;
    } catch (e) { /* ignore */ }

    // Watch for theme & viewport changes (guarded — older desktop clients vary)
    try { tg.onEvent('themeChanged', applyTheme); } catch (e) { /* ignore */ }
    try { tg.onEvent('viewportChanged', applyViewportHeight); } catch (e) { /* ignore */ }
    // Recompute the layout when entering/leaving full screen.
    try { tg.onEvent('fullscreenChanged', onFullscreenChanged); } catch (e) { /* ignore */ }
    try { tg.onEvent('fullscreenFailed', applyViewportHeight); } catch (e) { /* ignore */ }
    // Safe-area changes (system bars / fullscreen controls) — keep header clear.
    try { tg.onEvent('safeAreaChanged', applyTopInset); } catch (e) { /* ignore */ }
    try { tg.onEvent('contentSafeAreaChanged', applyTopInset); } catch (e) { /* ignore */ }
  }

  applyViewportHeight();
  applyTopInset();

  // Fallback for browsers / desktop testing: track window resize
  window.addEventListener('resize', applyViewportHeight);
  window.addEventListener('orientationchange', () => {
    // Delay to let the browser settle the new dimensions
    setTimeout(applyViewportHeight, 200);
  });
  // Android: the visual viewport changes when system bars / keyboard appear and
  // Telegram's own viewportChanged event isn't always reliable. Re-measure.
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', applyViewportHeight);
  }
};

// In full screen Telegram overlays its close/menu controls at the top, so we
// push our content down by the reported safe-area inset. Also stop the
// swipe-down-to-close gesture while in full screen so gameplay isn't dismissed.
const onFullscreenChanged = () => {
  applyTopInset();
  applyViewportHeight();
  // Keep vertical swipes disabled regardless of fullscreen state so Android
  // never hijacks in-app scrolling / wall dragging.
  try {
    if (tg && typeof tg.disableVerticalSwipes === 'function') {
      tg.disableVerticalSwipes();
    }
  } catch (e) { /* ignore */ }
};

// Write Telegram's top safe-area inset into a CSS variable so the header clears
// the fullscreen system controls. Combines the device safe area with the
// content safe area (Telegram's close/menu buttons), with a sane minimum when
// in full screen so the header never hides behind the controls.
const applyTopInset = () => {
  let deviceTop = 0;
  let contentTop = 0;
  try {
    if (tg && tg.safeAreaInset && typeof tg.safeAreaInset.top === 'number') {
      deviceTop = tg.safeAreaInset.top;
    }
    if (tg && tg.contentSafeAreaInset && typeof tg.contentSafeAreaInset.top === 'number') {
      contentTop = tg.contentSafeAreaInset.top;
    }
  } catch (e) { /* ignore */ }

  let top = deviceTop + contentTop;

  // In full screen Telegram overlays round close/menu buttons at the top-right.
  // Guarantee enough clearance even if the client reports a small/zero inset.
  try {
    if (tg && tg.isFullscreen) {
      top = Math.max(top, 56);
    }
  } catch (e) { /* ignore */ }

  document.documentElement.style.setProperty('--tg-content-top', `${top || 0}px`);
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

  // Android fix: Telegram sometimes reports a stable height taller than the
  // actually-visible WebView (the bottom then sits under the system nav bar and
  // is unreachable, with no scroll because nothing "overflows"). Clamp to the
  // real visible viewport so the bottom controls always fit / can scroll.
  const winH = window.innerHeight || document.documentElement.clientHeight || 0;
  if (winH > 200 && height > winH) {
    height = winH;
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
