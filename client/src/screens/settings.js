import { t, getLanguage, LANGUAGES } from '../core/i18n.js';
import { StorageManager } from '../core/storage.js';
import { haptic } from '../core/telegram.js';
import { socket } from '../core/websocket.js';

export class SettingsScreen {
  constructor(router, params) {
    this.router = router;
    this.params = params;
    this.settings = null;
  }

  render() {
    // Return temporary layout during load
    if (!this.settings) {
      return `
        <div class="screen screen-enter">
          <h2 class="menu-title">${t('systemSettings')}</h2>
          <div style="display:flex; justify-content:center; align-items:center; height:200px;">
            <div class="loader"></div>
          </div>
        </div>
      `;
    }

    const currentLang = getLanguage();
    const currentLangData = LANGUAGES.find(l => l.code === currentLang) || LANGUAGES[0];
    const dailyLabel = currentLang === 'ru' ? '\u0415\u0436\u0435\u0434\u043d\u0435\u0432\u043d\u043e' : (currentLang === 'en' ? 'Daily' : 'Kunlik');
    const dailySub = currentLang === 'ru' ? '\u0415\u0436\u0435\u0434\u043d\u0435\u0432\u043d\u044b\u0435 \u0437\u0430\u0434\u0430\u043d\u0438\u044f \u0438 \u043d\u0430\u0433\u0440\u0430\u0434\u0430' : (currentLang === 'en' ? 'Daily quests & reward' : 'Kunlik topshiriqlar va mukofot');

    return `
      <div class="screen screen-enter">
        <h2 class="menu-title" style="margin-top: 20px;">${t('systemSettings')}</h2>

        <!-- Daily quests entry (prominent CTA) -> opens the Daily screen -->
        <div class="card daily-cta" id="daily-setting-row" style="margin-top: 24px; cursor:pointer; display:flex; align-items:center; gap:14px; padding:16px; background:linear-gradient(135deg,#7c3aed,#4f46e5); border:1px solid rgba(255,255,255,0.14); box-shadow:0 8px 24px rgba(124,58,237,0.35);">
          <div style="width:46px; height:46px; border-radius:13px; background:rgba(255,255,255,0.18); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="8" width="18" height="4" rx="1"/>
              <path d="M12 8v13"/>
              <path d="M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7"/>
              <path d="M12 8S11 3 8 3a2.5 2.5 0 0 0 0 5z"/>
              <path d="M12 8s1-5 4-5a2.5 2.5 0 0 1 0 5z"/>
            </svg>
          </div>
          <div style="flex:1; min-width:0;">
            <div style="font-weight:700; font-size:16px; color:#ffffff; line-height:1.2;">${dailyLabel}</div>
            <div style="font-size:12.5px; color:rgba(255,255,255,0.82); margin-top:2px;">${dailySub}</div>
          </div>
          <span style="display:flex; align-items:center; color:rgba(255,255,255,0.9); flex-shrink:0;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 6l6 6-6 6"/>
            </svg>
          </span>
        </div>

        <div class="card" style="margin-top: 16px;">
          <!-- Username Setting -->
          <div class="setting-row setting-row-stack">
            <div class="setting-label">
              <span class="setting-title">${t('username')}</span>
              <span class="setting-subtitle">${t('usernameHint')}</span>
            </div>
            <div class="username-field">
              <input
                type="text"
                id="username-input"
                class="username-input"
                maxlength="20"
                placeholder="${t('usernamePlaceholder')}"
                value="${(this.settings.username || '').replace(/"/g, '&quot;')}"
                autocomplete="off"
                spellcheck="false"
              />
              <button class="username-save" id="username-save-btn" disabled>${t('save')}</button>
            </div>
            <div class="username-status" id="username-status"></div>
          </div>

          <!-- Theme Setting -->
          <div class="setting-row">
            <div class="setting-label">
              <span class="setting-title">${t('theme')}</span>
              <span class="setting-subtitle" id="theme-subtitle-desc">
                ${this.settings.theme === 'dark' ? t('darkMode') : t('lightMode')}
              </span>
            </div>
            <label class="switch">
              <input type="checkbox" id="theme-toggle" ${this.settings.theme === 'dark' ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
          </div>

          <!-- Language Setting (dropdown) -->
          <div class="setting-row">
            <div class="setting-label">
              <span class="setting-title">${t('language')}</span>
            </div>
            <div class="lang-select" id="lang-select">
              <button class="lang-current" id="lang-current-btn">
                <span class="lang-flag">${currentLangData.flag}</span>
                <span class="lang-name">${currentLangData.name}</span>
                <span class="lang-caret">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </span>
              </button>
              <div class="lang-dropdown" id="lang-dropdown">
                ${LANGUAGES.map(l => `
                  <button class="lang-option ${currentLang === l.code ? 'active' : ''}" data-lang="${l.code}">
                    <span class="lang-flag">${l.flag}</span>
                    <span class="lang-name">${l.name}</span>
                  </button>
                `).join('')}
              </div>
            </div>
          </div>

          <!-- Vibration Setting -->
          <div class="setting-row">
            <div class="setting-label">
              <span class="setting-title">${t('vibration')}</span>
            </div>
            <label class="switch">
              <input type="checkbox" id="vibration-toggle" ${this.settings.vibration ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
          </div>

          <!-- Sound Setting -->
          <div class="setting-row">
            <div class="setting-label">
              <span class="setting-title">${t('soundEffects')}</span>
            </div>
            <label class="switch">
              <input type="checkbox" id="sound-toggle" ${this.settings.sound ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
          </div>
        </div>

        <button class="btn btn-secondary" id="back-btn" style="margin-top: auto;">
          ${t('back')}
        </button>
      </div>
    `;
  }

  async afterRender() {
    if (!this.settings) {
      this.settings = await StorageManager.loadSettings();
      this.router.reRenderActiveScreen();
      return;
    }

    // Daily quests entry -> open the daily screen
    const dailyRow = document.getElementById('daily-setting-row');
    if (dailyRow) {
      dailyRow.addEventListener('click', () => {
        haptic.impact('medium');
        this.router.navigate('daily');
      });
    }

    // Bind username input + save
    const usernameInput = document.getElementById('username-input');
    const usernameSaveBtn = document.getElementById('username-save-btn');
    const usernameStatus = document.getElementById('username-status');
    if (usernameInput && usernameSaveBtn) {
      const initial = (this.settings.username || '').trim();

      const refreshBtnState = () => {
        const val = usernameInput.value.trim();
        usernameSaveBtn.disabled = (val.length === 0 || val === usernameInput.dataset.saved);
      };
      usernameInput.dataset.saved = initial;

      usernameInput.addEventListener('input', () => {
        if (usernameStatus) { usernameStatus.textContent = ''; usernameStatus.className = 'username-status'; }
        refreshBtnState();
      });

      // Listen for the server's confirmation (bound once per screen)
      this._onUsernameSet = (data) => {
        if (!usernameStatus) return;
        if (data && data.ok) {
          usernameStatus.textContent = t('usernameSaved');
          usernameStatus.className = 'username-status ok';
        } else {
          const err = data && data.error;
          usernameStatus.textContent = err === 'not_registered'
            ? t('usernameNotRegistered')
            : (err === 'empty' ? t('usernameEmpty') : t('usernameError'));
          usernameStatus.className = 'username-status err';
        }
      };
      socket.on('username_set', this._onUsernameSet);

      const saveUsername = async () => {
        const val = usernameInput.value.trim().slice(0, 20);
        if (!val) {
          if (usernameStatus) {
            usernameStatus.textContent = t('usernameEmpty');
            usernameStatus.className = 'username-status err';
          }
          return;
        }
        haptic.impact('light');
        this.settings.username = val;
        usernameInput.dataset.saved = val;
        await StorageManager.saveSettings(this.settings);
        // Push to the server (requires an authenticated socket)
        socket.connect();
        socket.send('set_username', { name: val });
        usernameSaveBtn.disabled = true;
      };

      usernameSaveBtn.addEventListener('click', saveUsername);
      usernameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); if (!usernameSaveBtn.disabled) saveUsername(); }
      });
      refreshBtnState();
    }

    // Bind theme toggle
    const themeToggle = document.getElementById('theme-toggle');
    themeToggle.addEventListener('change', async (e) => {
      this.settings.theme = e.target.checked ? 'dark' : 'light';
      haptic.selection();
      await StorageManager.saveSettings(this.settings);
      
      const sub = document.getElementById('theme-subtitle-desc');
      if (sub) sub.innerText = this.settings.theme === 'dark' ? t('darkMode') : t('lightMode');
    });

    // Bind lang buttons
    // Language dropdown
    const langSelect = document.getElementById('lang-select');
    const langCurrentBtn = document.getElementById('lang-current-btn');
    const langDropdown = document.getElementById('lang-dropdown');

    if (langCurrentBtn) {
      langCurrentBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        haptic.selection();
        langSelect.classList.toggle('open');
      });
    }

    // Close dropdown when clicking outside
    this._closeLangDropdown = () => langSelect?.classList.remove('open');
    document.addEventListener('click', this._closeLangDropdown);

    const langButtons = document.querySelectorAll('.lang-option');
    langButtons.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const selectedLang = btn.dataset.lang;
        langSelect?.classList.remove('open');
        if (selectedLang !== getLanguage()) {
          this.settings.lang = selectedLang;
          haptic.selection();
          await StorageManager.saveSettings(this.settings);
          // Router automatically triggers reRenderActiveScreen on language change
        }
      });
    });

    // Bind vibration toggle
    const vibrationToggle = document.getElementById('vibration-toggle');
    vibrationToggle.addEventListener('change', async (e) => {
      this.settings.vibration = e.target.checked;
      haptic.selection();
      await StorageManager.saveSettings(this.settings);
    });

    // Bind sound toggle
    const soundToggle = document.getElementById('sound-toggle');
    soundToggle.addEventListener('change', async (e) => {
      this.settings.sound = e.target.checked;
      haptic.selection();
      await StorageManager.saveSettings(this.settings);
    });

    // Back button
    const backBtn = document.getElementById('back-btn');
    backBtn.addEventListener('click', () => {
      haptic.impact('light');
      this.router.back();
    });
  }

  destroy() {
    if (this._closeLangDropdown) {
      document.removeEventListener('click', this._closeLangDropdown);
      this._closeLangDropdown = null;
    }
    if (this._onUsernameSet) {
      socket.off('username_set', this._onUsernameSet);
      this._onUsernameSet = null;
    }
  }
}
export default SettingsScreen;
