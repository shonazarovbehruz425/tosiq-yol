import { cloudStorage } from './telegram.js';
import { setLanguage } from './i18n.js';
import { setSoundEnabled } from './sound.js';

const SETTINGS_KEY = 'tosiq_yol_settings';
const STATS_KEY = 'tosiq_yol_stats';

const defaultSettings = {
  theme: 'dark',
  vibration: true,
  sound: true,
  lang: 'uz'
};

const defaultStats = {
  wins: 0,
  losses: 0,
  draws: 0,
  rating: 1000
};

export class StorageManager {
  static async loadSettings() {
    try {
      const data = await cloudStorage.getItem(SETTINGS_KEY);
      if (data) {
        const settings = JSON.parse(data);
        const merged = { ...defaultSettings, ...settings };
        
        // Apply language
        setLanguage(merged.lang);
        
        // Apply theme
        this.applyTheme(merged.theme);

        // Apply sound preference
        setSoundEnabled(merged.sound);
        
        return merged;
      }
    } catch (e) {
      console.error('Failed to load settings', e);
    }
    
    // Fallback apply default lang
    setLanguage(defaultSettings.lang);
    this.applyTheme(defaultSettings.theme);
    setSoundEnabled(defaultSettings.sound);
    return defaultSettings;
  }

  static async saveSettings(settings) {
    try {
      await cloudStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      
      // Apply changes
      setLanguage(settings.lang);
      this.applyTheme(settings.theme);
      setSoundEnabled(settings.sound);
      return true;
    } catch (e) {
      console.error('Failed to save settings', e);
      return false;
    }
  }

  static applyTheme(theme) {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light-mode');
      root.classList.remove('dark-mode');
    } else {
      root.classList.add('dark-mode');
      root.classList.remove('light-mode');
    }
  }

  static async loadStats() {
    try {
      const data = await cloudStorage.getItem(STATS_KEY);
      if (data) {
        return { ...defaultStats, ...JSON.parse(data) };
      }
    } catch (e) {
      console.error('Failed to load stats', e);
    }
    return defaultStats;
  }

  static async saveStats(stats) {
    try {
      await cloudStorage.setItem(STATS_KEY, JSON.stringify(stats));
      return true;
    } catch (e) {
      console.error('Failed to save stats', e);
      return false;
    }
  }

  static async recordGameResult(won) {
    const stats = await this.loadStats();
    if (won === 'win') {
      stats.wins += 1;
      stats.rating += 25;
    } else if (won === 'lose') {
      stats.losses += 1;
      stats.rating = Math.max(100, stats.rating - 20);
    } else {
      stats.draws += 1;
    }
    await this.saveStats(stats);
    return stats;
  }
}
