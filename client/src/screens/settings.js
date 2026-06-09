import { t, getLanguage, LANGUAGES } from '../core/i18n.js';
import { StorageManager } from '../core/storage.js';
import { haptic } from '../core/telegram.js';

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

    return `
      <div class="screen screen-enter">
        <h2 class="menu-title" style="margin-top: 20px;">${t('systemSettings')}</h2>
        
        <div class="card" style="margin-top: 24px;">
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
  }
}
export default SettingsScreen;
