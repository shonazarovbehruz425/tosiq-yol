// Lightweight Telegram bot using the HTTP Bot API via long polling.
// No extra dependencies — uses Node's built-in fetch.
//
// Flow:
//   /start            -> ask the user to pick a language (UZ / EN / RU)
//   language chosen   -> save language, send a localized welcome with a Play button
//   /play /stats etc. -> handled in the user's saved language
import { db } from '../db/database.js';
import { getProfileSummary, getDailyState, dailyCheckin } from '../game/progression.js';

const API = (token, method) => `{{https://api.telegram.org/bot${token}}}/${method}`;

let offset = 0;
let running = false;
let activeToken = null; // stored when the bot starts, used by admin sendToUser

// ===== Localized strings =====
const T = {
  uz: {
    chooseLang: '\ud83c\udf10 Tilni tanlang:',
    welcome: (name) =>
      `\ud83d\udc4b Salom, ${name}!\n\n*Wrong Way* \u2014 Quoridor uslubidagi strategik o'yin\u0433\u0430 xush kelibsiz.\nRaqibingizni to'siqlar bilan to'sing va shoshqangizni qarama-qarshi tomon\u0433\u0430 yetkazing.\n\nO'ynash uchun *Play* tugmasini bosing! \ud83c\udfae`,
    play: '\ud83c\udfae O\'ynash',
    letsPlay: "Qani boshladik! \ud83c\udfae",
    stats: (u) => `\ud83d\udcca *Sizning statistikangiz*\n\n\ud83c\udfc6 G'alaba: ${u.wins}\n\ud83d\udc94 Mag'lubiyat: ${u.losses}\n\ud83e\udd1d Durang: ${u.draws}\n\u2b50 Reyting: ${u.rating}`,
    noStats: 'Hali statistika yo\'q. Avval /start bosing va o\'ynang!',
    help: '*Wrong Way* komandalar:\n/start \u2014 o\'yinni ochish\n/play \u2014 tez o\'ynash\n/stats \u2014 profil va reyting\n/daily \u2014 kunlik topshiriqlar\n/language \u2014 tilni o\'zgartirish',
    nudge: 'O\'ynash uchun Play tugmasini bosing \ud83c\udfae',
    langSet: 'Til o\'rnatildi: O\'zbek \ud83c\uddfa\ud83c\uddff',
    statsFull: (p) =>
      `\ud83d\udcca *Profil*\n\n${p.league.emoji} *${p.league.name}* liga\n\u2b50 Reyting: *${p.rating}*` +
      (p.league.next ? `  (+${p.league.pointsToNext} \u2192 ${p.league.next.emoji} ${p.league.next.name})` : '  (eng yuqori daraja! \ud83d\udc51)') +
      `\n\ud83c\udf0d O\'rin: *#${p.rank}* / ${p.total}\n\n\ud83c\udfc6 G\'alaba: ${p.wins}   \ud83d\udc94 Mag\'lubiyat: ${p.losses}   \ud83e\udd1d Durang: ${p.draws}\n\ud83e\ude99 Tanga: ${p.coins}\n\ud83d\udd25 Kunlik seriya: ${p.streak} kun (rekord: ${p.bestStreak})`,
    dailyTitle: '\ud83c\udfaf *Kunlik topshiriqlar*',
    dailyStreak: (s) => `\ud83d\udd25 Seriya: *${s.streak}* kun  (rekord: ${s.bestStreak})`,
    checkinHint: (r) => `\ud83c\udf81 Bugungi sovg\'ani olish uchun quyidagi tugmani bosing (+${r} \ud83e\ude99)`,
    checkinBtn: (r) => `\ud83c\udf81 Bugungi sovg\'a (+${r} \ud83e\ude99)`,
    checkinDone: (r, s) => `\ud83c\udf81 +${r} tanga olindi! \ud83d\udd25 Seriya: ${s} kun`,
    alreadyChecked: '\u2705 Bugungi sovg\'a allaqachon olingan. Ertaga qayting!',
    allDone: '\ud83c\udf89 Bugungi barcha topshiriqlar bajarildi! Zo\'r ish!'
  },
  en: {
    chooseLang: '\ud83c\udf10 Choose your language:',
    welcome: (name) =>
      `\ud83d\udc4b Hi ${name}!\n\nWelcome to *Wrong Way* \u2014 a Quoridor-style strategy game.\nBlock your rival with barricades and race your pawn to the other side.\n\nTap *Play* to start! \ud83c\udfae`,
    play: '\ud83c\udfae Play',
    letsPlay: "Let's play! \ud83c\udfae",
    stats: (u) => `\ud83d\udcca *Your stats*\n\n\ud83c\udfc6 Wins: ${u.wins}\n\ud83d\udc94 Losses: ${u.losses}\n\ud83e\udd1d Draws: ${u.draws}\n\u2b50 Rating: ${u.rating}`,
    noStats: 'No stats yet. Press /start and play a game first!',
    help: '*Wrong Way* commands:\n/start \u2014 open the game\n/play \u2014 quick play\n/stats \u2014 profile & rating\n/daily \u2014 daily quests\n/language \u2014 change language',
    nudge: 'Tap Play to start the game \ud83c\udfae',
    langSet: 'Language set: English \ud83c\uddec\ud83c\udde7',
    statsFull: (p) =>
      `\ud83d\udcca *Profile*\n\n${p.league.emoji} *${p.league.name}* league\n\u2b50 Rating: *${p.rating}*` +
      (p.league.next ? `  (+${p.league.pointsToNext} \u2192 ${p.league.next.emoji} ${p.league.next.name})` : '  (top tier! \ud83d\udc51)') +
      `\n\ud83c\udf0d Rank: *#${p.rank}* / ${p.total}\n\n\ud83c\udfc6 Wins: ${p.wins}   \ud83d\udc94 Losses: ${p.losses}   \ud83e\udd1d Draws: ${p.draws}\n\ud83e\ude99 Coins: ${p.coins}\n\ud83d\udd25 Daily streak: ${p.streak} days (best: ${p.bestStreak})`,
    dailyTitle: '\ud83c\udfaf *Daily quests*',
    dailyStreak: (s) => `\ud83d\udd25 Streak: *${s.streak}* days  (best: ${s.bestStreak})`,
    checkinHint: (r) => `\ud83c\udf81 Tap below to claim today's reward (+${r} \ud83e\ude99)`,
    checkinBtn: (r) => `\ud83c\udf81 Claim daily reward (+${r} \ud83e\ude99)`,
    checkinDone: (r, s) => `\ud83c\udf81 +${r} coins! \ud83d\udd25 Streak: ${s} days`,
    alreadyChecked: '\u2705 Today's reward already claimed. Come back tomorrow!',
    allDone: '\ud83c\udf89 All today's quests are done! Great job!'
  },
  ru: {
    chooseLang: '\ud83c\udf10 \u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u044f\u0437\u044b\u043a:',
    welcome: (name) =>
      `\ud83d\udc4b \u041f\u0440\u0438\u0432\u0435\u0442, ${name}!\n\n\u0414\u043e\u0431\u0440\u043e \u043f\u043e\u0436\u0430\u043b\u043e\u0432\u0430\u0442\u044c \u0432 *Wrong Way* \u2014 \u0441\u0442\u0440\u0430\u0442\u0435\u0433\u0438\u0447\u0435\u0441\u043a\u0443\u044e \u0438\u0433\u0440\u0443 \u0432 \u0441\u0442\u0438\u043b\u0435 Quoridor.\n\u0411\u043b\u043e\u043a\u0438\u0440\u0443\u0439\u0442\u0435 \u0441\u043e\u043f\u0435\u0440\u043d\u0438\u043a\u0430 \u0431\u0430\u0440\u044c\u0435\u0440\u0430\u043c\u0438 \u0438 \u0434\u043e\u0432\u0435\u0434\u0438\u0442\u0435 \u0444\u0438\u0448\u043a\u0443 \u0434\u043e \u0434\u0440\u0443\u0433\u043e\u0439 \u0441\u0442\u043e\u0440\u043e\u043d\u044b.\n\n\u041d\u0430\u0436\u043c\u0438\u0442\u0435 *Play*, \u0447\u0442\u043e\u0431\u044b \u043d\u0430\u0447\u0430\u0442\u044c! \ud83c\udfae`,
    play: '\ud83c\udfae \u0418\u0433\u0440\u0430\u0442\u044c',
    letsPlay: "\u041f\u043e\u0435\u0445\u0430\u043b\u0438! \ud83c\udfae",
    stats: (u) => `\ud83d\udcca *\u0412\u0430\u0448\u0430 \u0441\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043a\u0430*\n\n\ud83c\udfc6 \u041f\u043e\u0431\u0435\u0434\u044b: ${u.wins}\n\ud83d\udc94 \u041f\u043e\u0440\u0430\u0436\u0435\u043d\u0438\u044f: ${u.losses}\n\ud83e\udd1d \u041d\u0438\u0447\u044c\u0438: ${u.draws}\n\u2b50 \u0420\u0435\u0439\u0442\u0438\u043d\u0433: ${u.rating}`,
    noStats: '\u041f\u043e\u043a\u0430 \u043d\u0435\u0442 \u0441\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043a\u0438. \u041d\u0430\u0436\u043c\u0438\u0442\u0435 /start \u0438 \u0441\u044b\u0433\u0440\u0430\u0439\u0442\u0435!',
    help: '*Wrong Way* \u043a\u043e\u043c\u0430\u043d\u0434\u044b:\n/start \u2014 \u043e\u0442\u043a\u0440\u044b\u0442\u044c \u0438\u0433\u0440\u0443\n/play \u2014 \u0431\u044b\u0441\u0442\u0440\u0430\u044f \u0438\u0433\u0440\u0430\n/stats \u2014 \u043f\u0440\u043e\u0444\u0438\u043b\u044c \u0438 \u0440\u0435\u0439\u0442\u0438\u043d\u0433\n/daily \u2014 \u0435\u0436\u0435\u0434\u043d\u0435\u0432\u043d\u044b\u0435 \u0437\u0430\u0434\u0430\u043d\u0438\u044f\n/language \u2014 \u0441\u043c\u0435\u043d\u0438\u0442\u044c \u044f\u0437\u044b\u043a',
    nudge: '\u041d\u0430\u0436\u043c\u0438\u0442\u0435 Play, \u0447\u0442\u043e\u0431\u044b \u043d\u0430\u0447\u0430\u0442\u044c \ud83c\udfae',
    langSet: '\u042f\u0437\u044b\u043a \u0443\u0441\u0442\u0430\u043d\u043e\u0432\u043b\u0435\u043d: \u0420\u0443\u0441\u0441\u043a\u0438\u0439 \ud83c\uddf7\ud83c\uddfa',
    statsFull: (p) =>
      `\ud83d\udcca *\u041f\u0440\u043e\u0444\u0438\u043b\u044c*\n\n${p.league.emoji} \u041b\u0438\u0433\u0430 *${p.league.name}*\n\u2b50 \u0420\u0435\u0439\u0442\u0438\u043d\u0433: *${p.rating}*` +
      (p.league.next ? `  (+${p.league.pointsToNext} \u2192 ${p.league.next.emoji} ${p.league.next.name})` : '  (\u0432\u044b\u0441\u0448\u0430\u044f \u043b\u0438\u0433\u0430! \ud83d\udc51)') +
      `\n\ud83c\udf0d \u041c\u0435\u0441\u0442\u043e: *#${p.rank}* / ${p.total}\n\n\ud83c\udfc6 \u041f\u043e\u0431\u0435\u0434\u044b: ${p.wins}   \ud83d\udc94 \u041f\u043e\u0440\u0430\u0436\u0435\u043d\u0438\u044f: ${p.losses}   \ud83e\udd1d \u041d\u0438\u0447\u044c\u0438: ${p.draws}\n\ud83e\ude99 \u041c\u043e\u043d\u0435\u0442\u044b: ${p.coins}\n\ud83d\udd25 \u0421\u0435\u0440\u0438\u044f: ${p.streak} \u0434\u043d. (\u0440\u0435\u043a\u043e\u0440\u0434: ${p.bestStreak})`,
    dailyTitle: '\ud83c\udfaf *\u0415\u0436\u0435\u0434\u043d\u0435\u0432\u043d\u044b\u0435 \u0437\u0430\u0434\u0430\u043d\u0438\u044f*',
    dailyStreak: (s) => `\ud83d\udd25 \u0421\u0435\u0440\u0438\u044f: *${s.streak}* \u0434\u043d.  (\u0440\u0435\u043a\u043e\u0440\u0434: ${s.bestStreak})`,
    checkinHint: (r) => `\ud83c\udf81 \u041d\u0430\u0436\u043c\u0438\u0442\u0435 \u043d\u0438\u0436\u0435, \u0447\u0442\u043e\u0431\u044b \u043f\u043e\u043b\u0443\u0447\u0438\u0442\u044c \u043d\u0430\u0433\u0440\u0430\u0434\u0443 (+${r} \ud83e\ude99)`,
    checkinBtn: (r) => `\ud83c\udf81 \u0417\u0430\u0431\u0440\u0430\u0442\u044c \u043d\u0430\u0433\u0440\u0430\u0434\u0443 (+${r} \ud83e\ude99)`,
    checkinDone: (r, s) => `\ud83c\udf81 +${r} \u043c\u043e\u043d\u0435\u0442! \ud83d\udd25 \u0421\u0435\u0440\u0438\u044f: ${s} \u0434\u043d.`,
    alreadyChecked: '\u2705 \u0421\u0435\u0433\u043e\u0434\u043d\u044f\u0448\u043d\u044f\u044f \u043d\u0430\u0433\u0440\u0430\u0434\u0430 \u0443\u0436\u0435 \u043f\u043e\u043b\u0443\u0447\u0435\u043d\u0430. \u0417\u0430\u0445\u043e\u0434\u0438\u0442\u0435 \u0437\u0430\u0432\u0442\u0440\u0430!',
    allDone: '\ud83c\udf89 \u0412\u0441\u0435 \u0437\u0430\u0434\u0430\u043d\u0438\u044f \u043d\u0430 \u0441\u0435\u0433\u043e\u0434\u043d\u044f \u0432\u044b\u043f\u043e\u043b\u043d\u0435\u043d\u044b! \u041e\u0442\u043b\u0438\u0447\u043d\u043e!'
  }
};

const tr = (lang) => T[lang] || T.en;

// Render the localized daily-quests message body from a progression state.
function renderDaily(lang, state) {
  const s = tr(lang);
  const lines = [s.dailyTitle, '', s.dailyStreak(state), ''];
  let allDone = true;
  for (const q of state.quests) {
    const txt = (q.text && (q.text[lang] || q.text.en)) || q.id;
    if (!q.done) allDone = false;
    lines.push(`${q.done ? '\u2705' : '\u25ab\ufe0f'} ${txt} \u2014 ${q.progress}/${q.goal}  (+${q.reward} \ud83e\ude99)`);
  }
  if (allDone) { lines.push(''); lines.push(s.allDone); }
  if (!state.checkedInToday) { lines.push(''); lines.push(s.checkinHint(state.nextReward)); }
  return lines.join('\n');
}

function dailyKeyboard(lang, state) {
  if (state.checkedInToday) return undefined;
  return { inline_keyboard: [[{ text: tr(lang).checkinBtn(state.nextReward), callback_data: 'daily_checkin' }]] };
}

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
        { text: label, url: `{{https://t.me/${BOT_USERNAME}}}/${APP_SHORT_NAME}` }
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
      { text: tr(lang).play, url: `{{https://t.me/${BOT_USERNAME}}}/${APP_SHORT_NAME}` }
    ]]
  };
}

// Language picker keyboard.
function langKeyboard() {
  return {
    inline_keyboard: [[
      { text: "\ud83c\uddfa\ud83c\uddff O'zbek", callback_data: 'lang_uz' },
      { text: '\ud83c\uddec\ud83c\udde7 English', callback_data: 'lang_en' },
      { text: '\ud83c\uddf7\ud83c\uddfa \u0420\u0443\u0441\u0441\u043a\u0438\u0439', callback_data: 'lang_ru' }
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
      text: '\ud83c\udf10 Tilni tanlang / Choose language / \u0412\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u044f\u0437\u044b\u043a:',
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
    const p = getProfileSummary(from.id);
    await call(token, 'sendMessage', {
      chat_id: chatId,
      text: p ? s.statsFull(p) : s.noStats,
      parse_mode: 'Markdown',
      reply_markup: playKeyboard(lang, webAppUrl)
    });
    return;
  }

  if (text.startsWith('/daily')) {
    const state = getDailyState(from.id);
    if (!state) {
      await call(token, 'sendMessage', { chat_id: chatId, text: s.noStats });
      return;
    }
    await call(token, 'sendMessage', {
      chat_id: chatId,
      text: renderDaily(lang, state),
      parse_mode: 'Markdown',
      reply_markup: dailyKeyboard(lang, state)
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

  // Daily streak check-in (once per day; idempotent).
  if (data === 'daily_checkin') {
    const lang = getUserLang(from.id);
    const s = tr(lang);
    const res = dailyCheckin(from.id);
    if (!res.ok) {
      await call(token, 'answerCallbackQuery', { callback_query_id: cb.id, text: s.noStats });
      return;
    }
    const toast = res.alreadyChecked ? s.alreadyChecked : s.checkinDone(res.reward, res.streak);
    await call(token, 'answerCallbackQuery', { callback_query_id: cb.id, text: toast, show_alert: false });
    // Refresh the daily message in place (button disappears once claimed).
    const state = getDailyState(from.id);
    await call(token, 'editMessageText', {
      chat_id: chatId,
      message_id: cb.message.message_id,
      text: renderDaily(lang, state),
      parse_mode: 'Markdown',
      reply_markup: dailyKeyboard(lang, state)
    });
    return;
  }

  // Unknown callback \u2014 just acknowledge
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
    console.warn('[bot] 409 Conflict \u2014 another instance is polling this token. Retrying in 10s.');
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
      { command: 'stats', description: 'Profile & rating' },
      { command: 'daily', description: 'Daily quests & streak' },
      { command: 'language', description: 'Change language' }
    ]
  });
}

export async function startBot() {
  const token = process.env.BOT_TOKEN;
  const webAppUrl = process.env.WEBAPP_URL || '';

  if (!token || token.startsWith('YOUR_TELEGRAM_BOT_TOKEN')) {
    console.log('[bot] BOT_TOKEN not set \u2014 Telegram bot disabled (Mini App still works).');
    return;
  }

  const me = await call(token, 'getMe');
  if (!me || !me.ok) {
    console.error('[bot] Invalid BOT_TOKEN \u2014 bot not started.');
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
// a Buffer. `mime` selects how it's labelled ('video/mp4' or 'video/webm').
// Returns { ok, error }.
export async function sendVideoToUser(userId, buffer, filename = 'replay.mp4', caption = '', mime = 'video/mp4') {
  if (!activeToken) return { ok: false, error: 'Bot is not running' };
  if (!userId || !buffer || !buffer.length) return { ok: false, error: 'Missing userId or video' };

  try {
    const form = new FormData();
    form.append('chat_id', String(userId));
    if (caption) form.append('caption', caption);
    const blob = new Blob([buffer], { type: mime });
    form.append('video', blob, filename);
    form.append('supports_streaming', 'true');

    const res = await fetch(API(activeToken, 'sendVideo'), { method: 'POST', body: form });
    const data = await res.json().catch(() => null);
    if (data && data.ok) return { ok: true };

    // Some clients prefer the file as a document; retry as a document fallback.
    const form2 = new FormData();
    form2.append('chat_id', String(userId));
    if (caption) form2.append('caption', caption);
    form2.append('document', new Blob([buffer], { type: mime }), filename);
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
