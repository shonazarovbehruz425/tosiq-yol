// Small in-chat admin panel for replacing the bot's outgoing messages.
// Only the whitelisted Telegram user IDs can open it.
//
// How premium emoji works here:
//   A regular bot CANNOT type custom/premium emoji into a normal sendMessage.
//   So instead we COPY a message that already contains them. The admin either
//   sends the decorated message straight to the bot, or pastes a link to a
//   channel post. We store a reference (chat + message id) and re-deliver it to
//   users with copyMessage \u2014 which reproduces the content WITHOUT any
//   \u201cforwarded from\u201d header (the source name stays hidden) and keeps the
//   premium emoji intact.
//
// Alongside the copy reference we also keep light metadata (source type, the
// link, a text snippet, saved time) purely so the panel can show the admin what
// is currently set.
//
// Overrides live in db.data.botMessages, backed up to the Telegram channel and
// restored on boot (see server/db/telegram-store.js).
import { db } from '../db/database.js';

// Only these Telegram user IDs may open the panel.
export const ADMIN_IDS = new Set([7046087449, 8012901047]);
export function isAdmin(id) { return ADMIN_IDS.has(Number(id)); }

// The messages an admin can replace. One override per message (no per-language
// split \u2014 kept intentionally simple).
export const EDITABLE = [
  { key: 'startPrompt', label: '/start \u2014 til tanlash xabari' },
  { key: 'welcome',     label: 'Xush kelibsiz (til tanlangach)' },
  { key: 'letsPlay',    label: '/play javobi' },
  { key: 'help',        label: '/help javobi' },
  { key: 'nudge',       label: 'Oddiy javob (nudge)' }
];

// adminId -> key  (while an admin is composing a replacement)
const pending = new Map();

// ---------- storage helpers (db.data.botMessages) ----------
function getOverride(key) {
  const bm = db.data && db.data.botMessages;
  const rec = bm && bm[key];
  return rec && rec.mode === 'copy' ? rec : null;
}

function setCopyOverride(key, fromChatId, messageId, meta = {}) {
  if (!db.data.botMessages) db.data.botMessages = {};
  db.data.botMessages[key] = {
    mode: 'copy',
    fromChatId,
    messageId,
    source: meta.source || 'direct', // 'direct' | 'link'
    link: meta.link || '',
    preview: meta.preview || '',
    savedAt: Date.now()
  };
  db.save();
}

function resetOverride(key) {
  const bm = db.data && db.data.botMessages;
  if (bm && bm[key]) { delete bm[key]; db.save(); }
}

function isCustom(key) { return !!getOverride(key); }
function stateIcon(key) { return isCustom(key) ? '\u2705' : '\u2699\ufe0f'; }
function stateLabel(key) { return isCustom(key) ? '\u2705 maxsus (ko\u02bbchirma)' : '\u2699\ufe0f standart'; }

function fmtDate(ts) {
  try {
    return new Date(ts).toLocaleString('en-GB', { timeZone: 'Asia/Tashkent', hour12: false });
  } catch (e) {
    return new Date(ts).toISOString();
  }
}

// ---------- public delivery helper (used by bot.js) ----------
// If an override exists for `key`, deliver it via copyMessage (premium emoji
// preserved, source name hidden) and return true. Otherwise return false so the
// caller can send its built-in default.
export async function sendOverride(call, token, chatId, key, keyboard) {
  const o = getOverride(key);
  if (!o) return false;
  const payload = { chat_id: chatId, from_chat_id: o.fromChatId, message_id: o.messageId };
  if (keyboard) payload.reply_markup = keyboard;
  const r = await call(token, 'copyMessage', payload);
  return !!(r && r.ok);
}

// ---------- link parsing ----------
// Accepts https://t.me/<username>/<id>, https://t.me/c/<internal>/<id>, and
// topic links (.../<thread>/<id>) \u2014 the last number is the message id.
function parseMessageLink(text) {
  const m = String(text).match(/t\.me\/([^\s]+)/i);
  if (!m) return null;
  const path = m[1].split('?')[0].replace(/\/+$/, '');
  const parts = path.split('/').filter(Boolean);
  if (parts.length < 2) return null;
  const messageId = parseInt(parts[parts.length - 1], 10);
  if (!Number.isFinite(messageId)) return null;
  if (parts[0] === 'c') {
    const internal = parts[1];
    if (!/^\d+$/.test(internal)) return null;
    return { fromChatId: Number('-100' + internal), messageId };
  }
  return { fromChatId: '@' + parts[0], messageId };
}

function extractLinkStr(text) {
  const m = String(text).match(/https?:\/\/t\.me\/\S+/i) || String(text).match(/t\.me\/\S+/i);
  return m ? m[0] : '';
}

// ---------- panel text & keyboards ----------
function panelText() {
  return '\ud83d\udee0\ufe0f *Admin panel*\n\n' +
    'Bot yuboradigan xabarlarni shu yerdan almashtirasiz.\n\n' +
    '\ud83d\udca1 *Premium emoji uchun:*\n' +
    '1) Kerakli xabarni premium emoji bilan bezab yozing.\n' +
    '2) \u201c\u270f\ufe0f O\u02bbzgartirish\u201d ni bosgach, o\u02bbsha bezalgan xabarni menga yuboring (yoki kanaldagi post *linkini*).\n' +
    '3) Men uni nom ko\u02bbrsatmasdan foydalanuvchilarga ko\u02bbchiraman \u2014 emojilar saqlanadi.\n\n' +
    'Qaysi xabarni o\u02bbzgartiramiz?';
}

function panelKeyboard() {
  const rows = EDITABLE.map((e, i) => [{ text: `${stateIcon(e.key)} ${e.label}`, callback_data: `adm_k:${i}` }]);
  rows.push([{ text: '\u274c Yopish', callback_data: 'adm_close' }]);
  return { inline_keyboard: rows };
}

function subText(idx) {
  const e = EDITABLE[idx];
  const o = getOverride(e.key);
  let out = `\u270f\ufe0f *${e.label}*\n\nHolat: ${stateLabel(e.key)}`;

  if (o) {
    out += '\n';
    if (o.source === 'link') {
      out += '\n\ud83d\udd17 *Manba:* kanal posti (link orqali)';
      if (o.link) out += `\n\`${o.link}\``;
    } else {
      out += '\n\ud83d\udcdd *Manba:* to\u02bbg\u02bbridan-to\u02bbg\u02bbri yuborilgan xabar';
      if (o.preview) out += `\n\n\u201c${o.preview}\u201d`;
    }
    if (o.savedAt) out += `\n\n\ud83d\udd52 Saqlangan: ${fmtDate(o.savedAt)}`;
    out += '\n\n\ud83d\udc41 Aniq ko\u02bbrinishini ko\u02bbrish uchun \u201cKo\u02bbrish\u201d ni bosing.';
  } else {
    out += '\n\nHozircha standart (o\u02bbrnatilgan) matn ishlatilmoqda.';
  }

  out += '\n\u2014\u2014\u2014\n\u201c\u270f\ufe0f O\u02bbzgartirish\u201d: premium-emojili xabar yoki t.me link yuboring.';
  return out;
}

function subKeyboard(idx) {
  const e = EDITABLE[idx];
  const rows = [[{ text: '\u270f\ufe0f O\u02bbzgartirish', callback_data: `adm_e:${idx}` }]];
  if (isCustom(e.key)) {
    rows.push([{ text: '\ud83d\udc41 Ko\u02bbrish (namuna)', callback_data: `adm_p:${idx}` }]);
    rows.push([{ text: '\u267b\ufe0f Standartga qaytarish', callback_data: `adm_r:${idx}` }]);
  } else {
    rows.push([{ text: '\u267b\ufe0f Standartga qaytarish', callback_data: `adm_r:${idx}` }]);
  }
  rows.push([{ text: '\u2b05\ufe0f Orqaga', callback_data: 'adm_home' }]);
  return { inline_keyboard: rows };
}

// ---------- open panel (from /behruz) ----------
export async function openAdminPanel(call, token, chatId) {
  await call(token, 'sendMessage', { chat_id: chatId, text: panelText(), parse_mode: 'Markdown', reply_markup: panelKeyboard() });
}

// ---------- handle adm_* callbacks ----------
export async function handleAdminCallback(call, token, cb) {
  const data = cb.data || '';
  if (!data.startsWith('adm_')) return false;
  const from = cb.from || {};
  const chatId = cb.message && cb.message.chat && cb.message.chat.id;
  const msgId = cb.message && cb.message.message_id;

  if (!isAdmin(from.id)) {
    await call(token, 'answerCallbackQuery', { callback_query_id: cb.id, text: '\u26d4\ufe0f' });
    return true;
  }

  if (data === 'adm_close') {
    await call(token, 'answerCallbackQuery', { callback_query_id: cb.id });
    await call(token, 'deleteMessage', { chat_id: chatId, message_id: msgId });
    return true;
  }

  if (data === 'adm_home') {
    await call(token, 'answerCallbackQuery', { callback_query_id: cb.id });
    await call(token, 'editMessageText', { chat_id: chatId, message_id: msgId, text: panelText(), parse_mode: 'Markdown', reply_markup: panelKeyboard() });
    return true;
  }

  if (data.startsWith('adm_k:')) {
    const idx = parseInt(data.slice(6), 10);
    await call(token, 'answerCallbackQuery', { callback_query_id: cb.id });
    if (EDITABLE[idx]) {
      await call(token, 'editMessageText', { chat_id: chatId, message_id: msgId, text: subText(idx), parse_mode: 'Markdown', reply_markup: subKeyboard(idx) });
    }
    return true;
  }

  // Live preview: copy the currently-stored message into the admin's chat.
  if (data.startsWith('adm_p:')) {
    const idx = parseInt(data.slice(6), 10);
    const e = EDITABLE[idx];
    await call(token, 'answerCallbackQuery', { callback_query_id: cb.id, text: '\ud83d\udc41 Namuna yuborildi' });
    if (e) {
      const ok = await sendOverride(call, token, chatId, e.key, null);
      if (!ok) {
        await call(token, 'sendMessage', { chat_id: chatId, text: '\u26a0\ufe0f Namunani ko\u02bbrsatib bo\u02bblmadi (asl xabar o\u02bbchirilgan yoki bot kanalda emas). Qaytadan o\u02bbrnating.' });
      }
    }
    return true;
  }

  if (data.startsWith('adm_e:')) {
    const idx = parseInt(data.slice(6), 10);
    const e = EDITABLE[idx];
    if (e) {
      pending.set(Number(from.id), e.key);
      await call(token, 'answerCallbackQuery', { callback_query_id: cb.id, text: '\u270d\ufe0f Xabar kutilmoqda' });
      await call(token, 'editMessageText', {
        chat_id: chatId, message_id: msgId, parse_mode: 'Markdown',
        text: `\u270d\ufe0f *${e.label}*\n\nEndi menga:\n\u2022 premium-emojili *xabarni* yuboring, yoki\n\u2022 kanaldagi post *linkini* (t.me/...) yuboring.\n\nBekor qilish: /bekor`
      });
    } else {
      await call(token, 'answerCallbackQuery', { callback_query_id: cb.id });
    }
    return true;
  }

  if (data.startsWith('adm_r:')) {
    const idx = parseInt(data.slice(6), 10);
    const e = EDITABLE[idx];
    if (e) {
      resetOverride(e.key);
      await call(token, 'answerCallbackQuery', { callback_query_id: cb.id, text: '\u267b\ufe0f Standartga qaytarildi' });
      await call(token, 'editMessageText', { chat_id: chatId, message_id: msgId, text: subText(idx), parse_mode: 'Markdown', reply_markup: subKeyboard(idx) });
    } else {
      await call(token, 'answerCallbackQuery', { callback_query_id: cb.id });
    }
    return true;
  }

  await call(token, 'answerCallbackQuery', { callback_query_id: cb.id });
  return true;
}

// ---------- capture the admin's next message as the new content ----------
// Returns true if the message was consumed (bot.js should stop processing it).
export async function tryCaptureEdit(call, token, msg) {
  const from = msg.from || {};
  const key = pending.get(Number(from.id));
  if (!key) return false;

  const chatId = msg.chat && msg.chat.id;
  const text = (msg.text || '').trim();

  // Cancel.
  if (text === '/bekor' || text === '/cancel') {
    pending.delete(Number(from.id));
    await call(token, 'sendMessage', { chat_id: chatId, text: '\u274c Bekor qilindi.' });
    return true;
  }

  // Any OTHER slash command (that isn't a link) cancels and runs normally.
  const looksLikeLink = /t\.me\//i.test(text);
  if (text.startsWith('/') && !looksLikeLink) {
    pending.delete(Number(from.id));
    return false;
  }

  // Work out what to copy: a channel post link, or the admin's own message.
  const link = parseMessageLink(text);
  const fromChatId = link ? link.fromChatId : chatId;
  const messageId = link ? link.messageId : msg.message_id;

  // Verify we can actually copy it \u2014 this doubles as the preview.
  const test = await call(token, 'copyMessage', { chat_id: chatId, from_chat_id: fromChatId, message_id: messageId });
  if (!test || !test.ok) {
    const hint = link
      ? '\u26a0\ufe0f Bu postni ko\u02bbchira olmadim. Bot o\u02bbsha kanalda a\u02bbzo/admin ekanini tekshiring va linkni qayta yuboring.'
      : '\u26a0\ufe0f Bu xabarni ko\u02bbchira olmadim. Iltimos, matnli xabar yoki kanal post linkini yuboring.';
    await call(token, 'sendMessage', { chat_id: chatId, text: hint });
    return true; // stay in pending so the admin can retry
  }

  // Build display metadata (does not affect delivery \u2014 only the panel view).
  let meta;
  if (link) {
    meta = { source: 'link', link: extractLinkStr(text) || text };
  } else {
    const raw = msg.text || msg.caption || '';
    const preview = raw.length > 160 ? raw.slice(0, 160) + '\u2026' : raw;
    meta = { source: 'direct', preview };
  }

  setCopyOverride(key, fromChatId, messageId, meta);
  pending.delete(Number(from.id));

  const item = EDITABLE.find(e => e.key === key);
  await call(token, 'sendMessage', {
    chat_id: chatId,
    text: `\u2705 Saqlandi \u2014 ${item ? item.label : key}.\n\u2b06\ufe0f Yuqoridagi ko\u02bbchirma \u2014 foydalanuvchilar aynan shuni ko\u02bbradi (nom ko\u02bbrsatilmaydi).`
  });
  return true;
}
