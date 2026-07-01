// Small in-chat admin panel for editing the bot's outgoing messages.
// Only the whitelisted Telegram user IDs can open it. Edited messages are
// stored WITH their entities (so premium emoji & formatting survive) inside
// db.data.botMessages, which is backed up to the Telegram channel and restored
// on boot (see server/db/telegram-store.js).
import { db } from '../db/database.js';

// Only these Telegram user IDs may open the panel.
export const ADMIN_IDS = new Set([7046087449, 8012901047]);
export function isAdmin(id) { return ADMIN_IDS.has(Number(id)); }

// The messages an admin can customise. `perLang` messages have a separate
// version per interface language (uz/en/ru); the rest share a single version.
export const EDITABLE = [
  { key: 'startPrompt', perLang: false, label: '/start \u2014 til tanlash xabari' },
  { key: 'welcome',     perLang: true,  label: 'Xush kelibsiz (til tanlangach)' },
  { key: 'letsPlay',    perLang: true,  label: '/play javobi' },
  { key: 'help',        perLang: true,  label: '/help javobi' },
  { key: 'nudge',       perLang: true,  label: 'Oddiy javob (nudge)' }
];

// adminId -> { key, lang } while an admin is composing a replacement message.
const pending = new Map();

// ----- storage helpers (db.data.botMessages) -----
export function msgOverride(key, lang) {
  const bm = db.data && db.data.botMessages;
  if (!bm || !bm[key]) return null;
  const rec = bm[key][lang];
  return rec && rec.text ? rec : null;
}

function setOverride(key, lang, text, entities) {
  if (!db.data.botMessages) db.data.botMessages = {};
  if (!db.data.botMessages[key]) db.data.botMessages[key] = {};
  db.data.botMessages[key][lang] = { text, entities: entities || [] };
  db.save();
}

function resetOverride(key, lang) {
  const bm = db.data && db.data.botMessages;
  if (bm && bm[key] && bm[key][lang]) { delete bm[key][lang]; db.save(); }
}

function stateLabel(key, lang) {
  return msgOverride(key, lang) ? '\u2705 maxsus' : '\u2699\ufe0f standart';
}

// ----- panel text & keyboards -----
function panelText() {
  return '\ud83d\udee0\ufe0f *Admin panel*\n\nBot foydalanuvchilarga yuboradigan xabarlarni shu yerdan tahrirlaysiz. Premium emoji va formatlash saqlanadi.\n\nQaysi xabarni o\'zgartiramiz?';
}

function panelKeyboard() {
  const rows = EDITABLE.map((e, i) => [{ text: e.label, callback_data: `adm_k:${i}` }]);
  rows.push([{ text: '\u274c Yopish', callback_data: 'adm_close' }]);
  return { inline_keyboard: rows };
}

function subText(idx) {
  const e = EDITABLE[idx];
  if (e.perLang) {
    return `\u270f\ufe0f *${e.label}*\n\nTilni tanlang, so\u2018ng yangi matn yuboring:\n\n\ud83c\uddfa\ud83c\uddff UZ \u2014 ${stateLabel(e.key, 'uz')}\n\ud83c\uddec\ud83c\udde7 EN \u2014 ${stateLabel(e.key, 'en')}\n\ud83c\uddf7\ud83c\uddfa RU \u2014 ${stateLabel(e.key, 'ru')}\n\n\u270f\ufe0f = tahrirlash  \u2022  \u267b\ufe0f = standartga qaytarish`;
  }
  return `\u270f\ufe0f *${e.label}*\n\nHolat: ${stateLabel(e.key, 'all')}\n\n\u270f\ufe0f = tahrirlash  \u2022  \u267b\ufe0f = standartga qaytarish`;
}

function subKeyboard(idx) {
  const e = EDITABLE[idx];
  if (e.perLang) {
    return { inline_keyboard: [
      [{ text: '\u270f\ufe0f UZ', callback_data: `adm_e:${idx}:uz` }, { text: '\u270f\ufe0f EN', callback_data: `adm_e:${idx}:en` }, { text: '\u270f\ufe0f RU', callback_data: `adm_e:${idx}:ru` }],
      [{ text: '\u267b\ufe0f UZ', callback_data: `adm_r:${idx}:uz` }, { text: '\u267b\ufe0f EN', callback_data: `adm_r:${idx}:en` }, { text: '\u267b\ufe0f RU', callback_data: `adm_r:${idx}:ru` }],
      [{ text: '\u2b05\ufe0f Orqaga', callback_data: 'adm_home' }]
    ] };
  }
  return { inline_keyboard: [
    [{ text: '\u270f\ufe0f Tahrirlash', callback_data: `adm_e:${idx}:all` }],
    [{ text: '\u267b\ufe0f Tiklash', callback_data: `adm_r:${idx}:all` }],
    [{ text: '\u2b05\ufe0f Orqaga', callback_data: 'adm_home' }]
  ] };
}

// Open the panel (called from /behruz). `call` is bot.js's Telegram API caller.
export async function openAdminPanel(call, token, chatId) {
  await call(token, 'sendMessage', { chat_id: chatId, text: panelText(), parse_mode: 'Markdown', reply_markup: panelKeyboard() });
}

// Handle any adm_* callback. Returns true if it consumed the callback.
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

  if (data.startsWith('adm_e:')) {
    const parts = data.split(':');
    const idx = parseInt(parts[1], 10);
    const lang = parts[2] || 'all';
    const e = EDITABLE[idx];
    if (e) {
      pending.set(Number(from.id), { key: e.key, lang });
      await call(token, 'answerCallbackQuery', { callback_query_id: cb.id, text: '\u270d\ufe0f Yangi matn kutilmoqda' });
      const tag = lang !== 'all' ? ` [${lang.toUpperCase()}]` : '';
      await call(token, 'editMessageText', {
        chat_id: chatId, message_id: msgId, parse_mode: 'Markdown',
        text: `\u270d\ufe0f *${e.label}*${tag}\n\nEndi menga yangi xabar matnini yuboring. Premium emoji, qalin/kursiv \u2014 barchasi saqlanadi.\n\nBekor qilish uchun /bekor deb yozing.`
      });
    } else {
      await call(token, 'answerCallbackQuery', { callback_query_id: cb.id });
    }
    return true;
  }

  if (data.startsWith('adm_r:')) {
    const parts = data.split(':');
    const idx = parseInt(parts[1], 10);
    const lang = parts[2] || 'all';
    const e = EDITABLE[idx];
    if (e) {
      resetOverride(e.key, lang);
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

// If the admin is mid-edit, capture their next text message as the new content.
// Returns true if the message was consumed (bot.js should stop processing it).
export async function tryCaptureEdit(call, token, msg) {
  const from = msg.from || {};
  const p = pending.get(Number(from.id));
  if (!p) return false;

  const chatId = msg.chat && msg.chat.id;
  const text = (msg.text || '').trim();

  if (text === '/bekor' || text === '/cancel') {
    pending.delete(Number(from.id));
    await call(token, 'sendMessage', { chat_id: chatId, text: '\u274c Tahrirlash bekor qilindi.' });
    return true;
  }

  // Switching to another command cancels the edit and lets it run normally.
  if (text.startsWith('/')) {
    pending.delete(Number(from.id));
    return false;
  }

  if (!msg.text) {
    await call(token, 'sendMessage', { chat_id: chatId, text: '\u26a0\ufe0f Iltimos, matn ko\u2018rinishidagi xabar yuboring (rasm/stiker emas).' });
    return true;
  }

  setOverride(p.key, p.lang, msg.text, msg.entities || []);
  pending.delete(Number(from.id));

  const item = EDITABLE.find(e => e.key === p.key);
  const tag = p.lang !== 'all' ? ` [${p.lang.toUpperCase()}]` : '';
  await call(token, 'sendMessage', { chat_id: chatId, text: `\u2705 Saqlandi \u2014 ${item ? item.label : p.key}${tag}\n\nQuyida foydalanuvchi ko\u2018radigan ko\u2018rinishi:` });

  const preview = { chat_id: chatId, text: msg.text, disable_web_page_preview: true };
  if (msg.entities && msg.entities.length) preview.entities = msg.entities;
  const r = await call(token, 'sendMessage', preview);
  if ((!r || !r.ok) && preview.entities) {
    await call(token, 'sendMessage', { chat_id: chatId, text: msg.text, disable_web_page_preview: true });
    await call(token, 'sendMessage', { chat_id: chatId, text: '\u26a0\ufe0f Eslatma: ba\u2019zi premium emojilar botdan yuborilganda oddiy ko\u2018rinishga o\u2018tishi mumkin (Telegram cheklovi).' });
  }
  return true;
}
