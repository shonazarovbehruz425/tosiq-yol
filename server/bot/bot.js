// Lightweight Telegram bot using the HTTP Bot API via long polling.
// No extra dependencies — uses Node's built-in fetch.
//
// Responsibilities:
//   - Respond to /start, /play, /stats, /help
//   - Save the user into the database when they /start
//   - Show a "Play" button that opens the Mini App
import { db } from '../db/database.js';

const API = (token, method) => `https://api.telegram.org/bot${token}/${method}`;

let offset = 0;
let running = false;

async function call(token, method, payload) {
  try {
    const res = await fetch(API(token, method), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await res.json();
  } catch (err) {
    console.error(`[bot] ${method} failed:`, err.message);
    return null;
  }
}

function playKeyboard(webAppUrl) {
  // If we have a Mini App URL, use a web_app button; otherwise a plain reply.
  if (webAppUrl) {
    return {
      inline_keyboard: [[
        { text: '🎮 Play', web_app: { url: webAppUrl } }
      ]]
    };
  }
  return undefined;
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

  if (text.startsWith('/start')) {
    const name = from.first_name || 'there';
    await call(token, 'sendMessage', {
      chat_id: chatId,
      text: `👋 Hi ${name}!\n\nWelcome to *Wrong Way* — a Quoridor-style strategy game.\nBlock your rival with barricades and race your pawn to the other side.\n\nTap *Play* to start! 🎮`,
      parse_mode: 'Markdown',
      reply_markup: playKeyboard(webAppUrl)
    });
    return;
  }

  if (text.startsWith('/play')) {
    await call(token, 'sendMessage', {
      chat_id: chatId,
      text: "Let's play! 🎮",
      reply_markup: playKeyboard(webAppUrl)
    });
    return;
  }

  if (text.startsWith('/stats')) {
    const u = db.getUser(from.id);
    if (u) {
      await call(token, 'sendMessage', {
        chat_id: chatId,
        text: `📊 *Your stats*\n\n🏆 Wins: ${u.wins}\n💔 Losses: ${u.losses}\n🤝 Draws: ${u.draws}\n⭐ Rating: ${u.rating}`,
        parse_mode: 'Markdown'
      });
    } else {
      await call(token, 'sendMessage', { chat_id: chatId, text: 'No stats yet. Play a game first!' });
    }
    return;
  }

  if (text.startsWith('/help')) {
    await call(token, 'sendMessage', {
      chat_id: chatId,
      text: '*Wrong Way* commands:\n/start — open the game\n/play — quick play\n/stats — your stats',
      parse_mode: 'Markdown',
      reply_markup: playKeyboard(webAppUrl)
    });
    return;
  }

  // Default: gently nudge to play
  await call(token, 'sendMessage', {
    chat_id: chatId,
    text: 'Tap Play to start the game 🎮',
    reply_markup: playKeyboard(webAppUrl)
  });
}

async function poll(token, webAppUrl) {
  if (!running) return;
  const res = await call(token, 'getUpdates', { offset, timeout: 30, allowed_updates: ['message'] });
  if (res && res.ok && Array.isArray(res.result)) {
    for (const update of res.result) {
      offset = update.update_id + 1;
      if (update.message) {
        await handleMessage(token, update.message, webAppUrl);
      }
    }
  }
  // Loop
  if (running) setImmediate(() => poll(token, webAppUrl));
}

// Set the persistent menu button (the button next to the message input).
async function setupMenuButton(token, webAppUrl) {
  if (!webAppUrl) return;
  await call(token, 'setChatMenuButton', {
    menu_button: { type: 'web_app', text: 'Play', web_app: { url: webAppUrl } }
  });
  await call(token, 'setMyCommands', {
    commands: [
      { command: 'start', description: 'Open the game' },
      { command: 'play', description: 'Quick play' },
      { command: 'stats', description: 'Your stats' }
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

  // Verify token and clear any webhook (polling requires no webhook)
  const me = await call(token, 'getMe');
  if (!me || !me.ok) {
    console.error('[bot] Invalid BOT_TOKEN — bot not started.');
    return;
  }
  await call(token, 'deleteWebhook', { drop_pending_updates: false });
  await setupMenuButton(token, webAppUrl);

  running = true;
  console.log(`[bot] Started as @${me.result.username}. Polling for updates...`);
  poll(token, webAppUrl);
}

export function stopBot() {
  running = false;
}
