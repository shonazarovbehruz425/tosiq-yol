// Lightweight Telegram bot using the HTTP Bot API via long polling.
// No extra dependencies — uses Node's built-in fetch.
//
// Flow:
//   /start            -> ask the user to pick a language (UZ / EN / RU)
//   language chosen   -> save language, send a localized welcome with a Play button
//   /play /stats etc. -> handled in the user's saved language
import { db } from '../db/database.js';

const API = (token, method) => `https://api.telegram.org/bot${token}/${method}`;

let offset = 0;
let running = false;
let activeToken = null; // stored when the bot starts, used by admin sendToUser

// ===== Localized strings =====
const T = {
  uz: {
    chooseLang: '🌐 Tilni tanlang:',
    welcome: (name) =>
      `👋 Salom, ${name}!\n\n*Wrong Way* — Quoridor uslubidagi strategik o'yinга xush kelibsiz.\nRaqibingizni to'siqlar bilan to'sing va shoshqangizni qarama-qarshi tomonга yetkazing.\n\nO'ynash uchun *Play* tugmasini bosing! 🎮`,
    play: '🎮 O\'ynash',
    letsPlay: "Qani boshladik! 🎮",
    stats: (u) => `📊 *Sizning statistikangiz*\n\n🏆 G'alaba: ${u.wins}\n💔 Mag'lubiyat: ${u.losses}\n🤝 Durang: ${u.draws}\n⭐ Reyting: ${u.rating}`,
    noStats: 'Hali statistika yo\'q. Avval o\'ynang!',
    help: '*Wrong Way* komandalar:\n/start — o\'yinni ochish\n/play — tez o\'ynash\n/stats — statistika\n/language — tilni o\'zgartirish',
    nudge: 'O\'ynash uchun Play tugmasini bosing 🎮',
    langSet: 'Til o\'rnatildi: O\'zbek 🇺🇿'
  },
  en: {
    chooseLang: '🌐 Choose your language:',
    welcome: (name) =>
      `👋 Hi ${name}!\n\nWelcome to *Wrong Way* — a Quoridor-style strategy game.\nBlock your rival with barricades and race your pawn to the other side.\n\nTap *Play* to start! 🎮`,
    play: '🎮 Play',
    letsPlay: "Let's play! 🎮",
    stats: (u) => `📊 *Your stats*\n\n🏆 Wins: ${u.wins}\n💔 Losses: ${u.losses}\n🤝 Draws: ${u.draws}\n⭐ Rating: ${u.rating}`,
    noStats: 'No stats yet. Play a game first!',
    help: '*Wrong Way* commands:\n/start — open the game\n/play — quick play\n/stats — your stats\n/language — change language',
    nudge: 'Tap Play to start the game 🎮',
    langSet: 'Language set: English 🇬🇧'
  },
  ru: {
    chooseLang: '🌐 Выберите язык:',
    welcome: (name) =>
      `👋 Привет, ${name}!\n\nДобро пожаловать в *Wrong Way* — стратегическую игру в стиле Quoridor.\nБлокируйте соперника барьерами и доведите свою фишку до другой стороны.\n\nНажмите *Play*, чтобы начать! 🎮`,
    play: '🎮 Играть',
    letsPlay: "Поехали! 🎮",
    stats: (u) => `📊 *Ваша статистика*\n\n🏆 Победы: ${u.wins}\n💔 Поражения: ${u.losses}\n🤝 Ничьи: ${u.draws}\n⭐ Рейтинг: ${u.rating}`,
    noStats: 'Пока нет статистики. Сыграйте сначала!',
    help: '*Wrong Way* команды:\n/start — открыть игру\n/play — быстрая игра\n/stats — статистика\n/language — сменить язык',
    nudge: 'Нажмите Play, чтобы начать игру 🎮',
    langSet: 'Язык установлен: Русский 🇷🇺'
  }
};

const tr = (lang) => T[lang] || T.en;

async function call(token, method, payload) {
  try {
    const res = await fetch(API(token, method), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!data.ok && data.error_code !== 409) {
      // 409 (polling conflict) is handled & logged in poll(); don't double-log it.
      console.warn(`[bot] ${method} not ok: ${data.error_code} ${data.description}`);
    }
    return data;
  } catch (err) {
    console.error(`[bot] ${method} failed:`, err.message);
    return null;
  }
}

// Inline keyboard with a Play button (localized label).
// Prefers a web_app button (opens inside Telegram); falls back to a t.me deep
// link to the Mini App so a button always appears even without WEBAPP_URL.
let BOT_USERNAME = '';
const APP_SHORT_NAME = 'play';

function playKeyboard(lang, webAppUrl) {
  const label = tr(lang).play;

  // web_app buttons require a valid https URL
  if (webAppUrl && /^https:\/\//i.test(webAppUrl)) {
    return { inline_keyboard: [[{ text: label, web_app: { url: webAppUrl } }]] };
  }

  // Fallback: open the Mini App via its t.me deep link
  if (BOT_USERNAME) {
    return {
      inline_keyboard: [[
        { text: label, url: `https://t.me/${BOT_USERNAME}/${APP_SHORT_NAME}` }
      ]]
    };
  }

  return undefined;
}

// A Play button safe for editMessageText (web_app buttons are rejected there).
// Uses a t.me deep link which still opens the Mini App natively in Telegram.
function playKeyboardEditable(lang) {
  if (!BOT_USERNAME) return undefined;
  return {
    inline_keyboard: [[
      { text: tr(lang).play, url: `https://t.me/${BOT_USERNAME}/${APP_SHORT_NAME}` }
    ]]
  };
}

// Language picker keyboard.
function langKeyboard() {
  return {
    inline_keyboard: [[
      { text: "🇺🇿 O'zbek", callback_data: 'lang_uz' },
      { text: '🇬🇧 English', callback_data: 'lang_en' },
      { text: '🇷🇺 Русский', callback_data: 'lang_ru' }
    ]]
  };
}

function getUserLang(userId) {
  const u = db.getUser(userId);
  return (u && u.lang) || 'en';
}

async function handleMessage(token, msg, webAppUrl) {
  const chatId = msg.chat?.id;
  const from = msg.from;
  const text = (msg.text || '').trim();
  if (!chatId || !from) return;

  // Persist the user on any interaction
  db.saveUser(from.id, {
    username: from.username || '',
    first_name: from.first_name || 'Player'
  });

  // /start -> always ask for language first
  if (text.startsWith('/start') || text.startsWith('/language') || text.startsWith('/lang')) {
    await call(token, 'sendMessage', {
      chat_id: chatId,
      text: '🌐 Tilni tanlang / Choose language / Выберите язык:',
      reply_markup: langKeyboard()
    });
    return;
  }

  const lang = getUserLang(from.id);
  const s = tr(lang);

  if (text.startsWith('/play')) {
    await call(token, 'sendMessage', { chat_id: chatId, text: s.letsPlay, reply_markup: playKeyboard(lang, webAppUrl) });
    return;
  }

  if (text.startsWith('/stats')) {
    const u = db.getUser(from.id);
    await call(token, 'sendMessage', {
      chat_id: chatId,
      text: u ? s.stats(u) : s.noStats,
      parse_mode: 'Markdown'
    });
    return;
  }

  if (text.startsWith('/help')) {
    await call(token, 'sendMessage', { chat_id: chatId, text: s.help, parse_mode: 'Markdown', reply_markup: playKeyboard(lang, webAppUrl) });
    return;
  }

  // Default nudge
  await call(token, 'sendMessage', { chat_id: chatId, text: s.nudge, reply_markup: playKeyboard(lang, webAppUrl) });
}

async function handleCallback(token, cb, webAppUrl) {
  const data = cb.data || '';
  const chatId = cb.message?.chat?.id;
  const from = cb.from;
  if (!chatId || !from) return;

  if (data.startsWith('lang_')) {
    const lang = data.slice(5); // uz | en | ru
    const valid = ['uz', 'en', 'ru'].includes(lang) ? lang : 'en';

    // Save the chosen language on the user record
    const existing = db.getUser(from.id) || {};
    db.saveUser(from.id, {
      username: from.username || existing.username || '',
      first_name: from.first_name || existing.first_name || 'Player'
    });
    db.setUserLang(from.id, valid);

    const s = tr(valid);

    // Acknowledge the button tap (removes the loading spinner)
    await call(token, 'answerCallbackQuery', { callback_query_id: cb.id, text: s.langSet });

    // Edit the language-picker message IN PLACE into the localized welcome.
    // Use a t.me deep-link Play button (web_app buttons can't be used in edits).
    const name = from.first_name || 'there';
    const edited = await call(token, 'editMessageText', {
      chat_id: chatId,
      message_id: cb.message.message_id,
      text: s.welcome(name),
      parse_mode: 'Markdown',
      reply_markup: playKeyboardEditable(valid)
    });

    // Only if the edit truly failed (e.g. message deleted), send a fresh one.
    if (!edited || !edited.ok) {
      await call(token, 'sendMessage', {
        chat_id: chatId,
        text: s.welcome(name),
        parse_mode: 'Markdown',
        reply_markup: playKeyboard(valid, webAppUrl)
      });
    }
    return;
  }

  // Unknown callback — just acknowledge
  await call(token, 'answerCallbackQuery', { callback_query_id: cb.id });
}

async function poll(token, webAppUrl) {
  if (!running) return;
  const res = await call(token, 'getUpdates', {
    offset, timeout: 30, allowed_updates: ['message', 'callback_query']
  });

  // 409 Conflict = another instance is polling the same bot token.
  // Back off and retry instead of hammering the API / flooding logs.
  if (res && !res.ok && res.error_code === 409) {
    console.warn('[bot] 409 Conflict — another instance is polling this token. Retrying in 10s.');
    if (running) setTimeout(() => poll(token, webAppUrl), 10000);
    return;
  }

  if (res && res.ok && Array.isArray(res.result)) {
    for (const update of res.result) {
      offset = update.update_id + 1;
      if (update.message) await handleMessage(token, update.message, webAppUrl);
      else if (update.callback_query) await handleCallback(token, update.callback_query, webAppUrl);
    }
    if (running) setImmediate(() => poll(token, webAppUrl));
    return;
  }

  // Any other transient error: wait briefly before retrying
  if (running) setTimeout(() => poll(token, webAppUrl), 3000);
}

// Set the persistent menu button + slash commands.
async function setupMenuButton(token, webAppUrl) {
  if (webAppUrl) {
    await call(token, 'setChatMenuButton', {
      menu_button: { type: 'web_app', text: 'Play', web_app: { url: webAppUrl } }
    });
  }
  await call(token, 'setMyCommands', {
    commands: [
      { command: 'start', description: 'Start / choose language' },
      { command: 'play', description: 'Quick play' },
      { command: 'stats', description: 'Your stats' },
      { command: 'language', description: 'Change language' }
    ]
  });
}

export async function startBot() {
  const token = process.env.BOT_TOKEN;
  const webAppUrl = process.env.WEBAPP_URL || '';

  if (!token || token.startsWith('YOUR_TELEGRAM_BOT_TOKEN')) {
    console.log('[bot] BOT_TOKEN not set — Telegram bot disabled (Mini App still works).');
    return;
  }

  const me = await call(token, 'getMe');
  if (!me || !me.ok) {
    console.error('[bot] Invalid BOT_TOKEN — bot not started.');
    return;
  }
  BOT_USERNAME = me.result.username || '';
  await call(token, 'deleteWebhook', { drop_pending_updates: false });
  await setupMenuButton(token, webAppUrl);

  activeToken = token;
  running = true;
  console.log(`[bot] Started as @${me.result.username}. Polling for updates...`);
  poll(token, webAppUrl);
}

// Send an admin message to a specific user. Returns { ok, error }.
export async function sendToUser(userId, text) {
  if (!activeToken) return { ok: false, error: 'Bot is not running' };
  if (!userId || !text) return { ok: false, error: 'Missing userId or text' };
  const res = await call(activeToken, 'sendMessage', {
    chat_id: userId,
    text,
    disable_web_page_preview: true
  });
  if (res && res.ok) return { ok: true };
  return { ok: false, error: (res && res.description) || 'Failed to send' };
}

// Broadcast a message to every user in the database.
// Returns { ok, sent, failed, total }. Throttled to stay within Telegram limits
// (~30 messages/second), so large audiences are delivered gradually.
export async function broadcastToAll(text) {
  if (!activeToken) return { ok: false, error: 'Bot is not running' };
  if (!text || !String(text).trim()) return { ok: false, error: 'Message text is required' };

  const users = db.getAllUsers();
  let sent = 0;
  let failed = 0;

  for (const u of users) {
    if (!u || !u.id) { failed++; continue; }
    const res = await call(activeToken, 'sendMessage', {
      chat_id: u.id,
      text,
      disable_web_page_preview: true
    });
    if (res && res.ok) {
      sent++;
    } else {
      failed++;
      // If Telegram asks us to back off, honour the retry_after hint.
      const retry = res && res.parameters && res.parameters.retry_after;
      if (retry) await sleep((retry + 1) * 1000);
    }
    // Throttle: ~25 messages/second keeps us safely under Telegram's cap.
    await sleep(40);
  }

  return { ok: true, sent, failed, total: users.length };
}

// Send a recorded replay video to a specific user's chat. The video arrives as
// a Buffer (webm). Uses multipart/form-data so we can upload the file bytes
// directly. Returns { ok, error }.
export async function sendVideoToUser(userId, buffer, filename = 'replay.webm', caption = '') {
  if (!activeToken) return { ok: false, error: 'Bot is not running' };
  if (!userId || !buffer || !buffer.length) return { ok: false, error: 'Missing userId or video' };

  try {
    const form = new FormData();
    form.append('chat_id', String(userId));
    if (caption) form.append('caption', caption);
    // Telegram accepts webm under sendVideo; send as a Blob with a filename.
    const blob = new Blob([buffer], { type: 'video/webm' });
    form.append('video', blob, filename);

    const res = await fetch(API(activeToken, 'sendVideo'), { method: 'POST', body: form });
    const data = await res.json().catch(() => null);
    if (data && data.ok) return { ok: true };

    // Some clients prefer the file as a document; retry as a document fallback.
    const form2 = new FormData();
    form2.append('chat_id', String(userId));
    if (caption) form2.append('caption', caption);
    form2.append('document', new Blob([buffer], { type: 'video/webm' }), filename);
    const res2 = await fetch(API(activeToken, 'sendDocument'), { method: 'POST', body: form2 });
    const data2 = await res2.json().catch(() => null);
    if (data2 && data2.ok) return { ok: true };

    return { ok: false, error: (data2 && data2.description) || (data && data.description) || 'Failed to send video' };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function stopBot() {
  running = false;
}
