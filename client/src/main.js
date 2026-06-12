import './styles/index.css';
import { initTelegram, isTelegram, getTelegramUser } from './core/telegram.js';
import { router } from './core/router.js';
import { StorageManager } from './core/storage.js';
import { initSound } from './core/sound.js';
import { initSocial } from './core/social.js';

// Screen Imports
import HomeScreen from './screens/home.js';
import SettingsScreen from './screens/settings.js';
import LeaderboardScreen from './screens/leaderboard.js';
import FriendsScreen from './screens/friends.js';
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

  // 2. Load stored settings (language, theme, sounds, vibration).
  //    Never let this block the app — guard with a timeout so a stalled
  //    storage backend can't leave the screen blank (seen on desktop Telegram).
  try {
    await Promise.race([
      StorageManager.loadSettings(),
      new Promise((resolve) => setTimeout(resolve, 2500))
    ]);
  } catch (e) {
    console.warn('loadSettings failed, continuing with defaults:', e);
  }

  // 3. Register routing screens
  router.register('home', HomeScreen);
  router.register('settings', SettingsScreen);
  router.register('leaderboard', LeaderboardScreen);
  router.register('friends', FriendsScreen);
  router.register('bot', BotScreen);
  router.register('mode-select', ModeSelectScreen);
  router.register('online', OnlineScreen);
  router.register('friend', FriendScreen);
  router.register('game', GameScreen);
  router.register('result', ResultScreen);
  router.register('replay-screen', ReplayScreen);

  // 4. Hook router to DOM target
  router.init('#app');

  // 4b. Bind app-wide social notifications (friend requests / game invites)
  initSocial();

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

// Render a visible error instead of a blank screen, so failures are diagnosable.
function showFatal(err) {
  try {
    const app = document.getElementById('app');
    if (app) {
      app.innerHTML = `
        <div style="padding:24px;color:#f1f5f9;font-family:system-ui,sans-serif;overflow:auto;height:100%;">
          <h2 style="color:#fb7185;margin-bottom:10px;">Yuklashda xatolik</h2>
          <p style="color:#9ca3af;font-size:13px;margin-bottom:14px;">Iltimos skrinshot yuboring:</p>
          <pre style="white-space:pre-wrap;font-size:12px;background:#1b2436;padding:12px;border-radius:10px;color:#fca5a5;">${(err && (err.stack || err.message)) || String(err)}</pre>
          <button onclick="location.reload()" style="margin-top:16px;padding:12px 20px;background:#7c3aed;color:#fff;border:none;border-radius:12px;font-weight:700;">Qayta urinish</button>
        </div>`;
    }
  } catch (e) { /* ignore */ }
}

// Catch async errors during bootstrap
bootstrap().catch(err => {
  console.error('App bootstrap error:', err);
  showFatal(err);
});

// Catch any uncaught error/rejection that would otherwise leave a blank screen
window.addEventListener('error', (e) => {
  console.error('Uncaught error:', e.error || e.message);
  if (!document.querySelector('.screen, .game-container')) showFatal(e.error || e.message);
});
window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled rejection:', e.reason);
  if (!document.querySelector('.screen, .game-container')) showFatal(e.reason);
});
