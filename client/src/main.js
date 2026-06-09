import './styles/index.css';
import { initTelegram, isTelegram, getTelegramUser } from './core/telegram.js';
import { router } from './core/router.js';
import { StorageManager } from './core/storage.js';
import { initSound } from './core/sound.js';

// Screen Imports
import HomeScreen from './screens/home.js';
import SettingsScreen from './screens/settings.js';
import BotScreen from './screens/bot.js';
import ModeSelectScreen from './screens/mode-select.js';
import OnlineScreen from './screens/online.js';
import FriendScreen from './screens/friend.js';
import GameScreen from './screens/game-screen.js';
import ResultScreen from './screens/result.js';
import ReplayScreen from './screens/replay-screen.js';

async function bootstrap() {
  console.log("Bootstrapping To'siq Yo'l game app...");

  // 1. Initialize Telegram SDK integration
  initTelegram();

  // 1b. Arm audio so the first user gesture unlocks Web Audio (mobile/Telegram)
  initSound();

  // 2. Load stored settings (language, theme, sounds, vibration)
  await StorageManager.loadSettings();

  // 3. Register routing screens
  router.register('home', HomeScreen);
  router.register('settings', SettingsScreen);
  router.register('bot', BotScreen);
  router.register('mode-select', ModeSelectScreen);
  router.register('online', OnlineScreen);
  router.register('friend', FriendScreen);
  router.register('game', GameScreen);
  router.register('result', ResultScreen);
  router.register('replay-screen', ReplayScreen);

  // 4. Hook router to DOM target
  router.init('#app');

  // 5. Deep Link joining check (Telegram WebApp start_param parameter)
  // Check if user launched app via a link: t.me/BotName/app?startapp=join_1234
  let startParam = null;
  if (isTelegram() && window.Telegram.WebApp.initDataUnsafe) {
    startParam = window.Telegram.WebApp.initDataUnsafe.start_param;
  } else {
    // Local query string fallback for desktop testing
    const params = new URLSearchParams(window.location.search);
    startParam = params.get('tgWebAppStartParam') || params.get('startapp');
  }

  if (startParam && startParam.startsWith('join_')) {
    const roomCode = startParam.split('join_')[1];
    if (roomCode && roomCode.length === 4) {
      console.log(`Deep link join detected for room: ${roomCode}`);
      
      // Route immediately to Friend screen waiting room to connect
      router.navigate('friend');
      
      // Fill digits and click join automatically after DOM loads
      setTimeout(() => {
        const digits = roomCode.split('');
        for (let i = 0; i < 4; i++) {
          const input = document.getElementById(`digit-${i+1}`);
          if (input) input.value = digits[i];
        }
        const joinBtn = document.getElementById('join-room-btn');
        if (joinBtn) joinBtn.click();
      }, 300);
      return;
    }
  }

  // Fallback: load default screen
  router.navigate('home');
}

// Start app
bootstrap().catch(err => {
  console.error("App bootstrap error:", err);
});
