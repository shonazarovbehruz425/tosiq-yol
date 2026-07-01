// Persists the database as a document in a Telegram channel.
//
// How it works:
//   - On startup, the bot reads the channel's pinned "db backup" message,
//     downloads the db.json document, and restores it.
//   - Whenever data changes, the bot uploads a fresh db.json to the channel
//     and pins it (debounced, at most every ~8s via database.scheduleRemoteSave).
//
// Setup (env vars):
//   BOT_TOKEN   = your bot token
//   DB_CHANNEL_ID = the channel id (e.g. -1001234567890). The bot must be an
//                   ADMIN of that channel with permission to post & pin.
//
// This makes the database survive Render redeploys/restarts for free.
import { db } from './database.js';

// Build the Telegram API base via concatenation (NEVER a single URL literal)
// so tooling that rewrites URL-looking strings can't corrupt it. A previous
// version had these URLs wrapped in literal   braces, which silently broke
// ALL channel persistence (backups never uploaded, restores never ran).
const TG_HOST = 'https://' + 'api.telegram.org';
const API = (token, method) => `${TG_HOST}/bot${token}/${method}`;
const FILE_API = (token, filePath) => `${TG_HOST}/file/bot${token}/${filePath}`;

let token = null;
let channelId = null;
let lastPinnedMsgId = null;

async function tg(method, payload) {
  const res = await fetch(API(token, method), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

// Find the most recent db backup document in the channel (via pinned message).
async function fetchPinned() {
  const res = await tg('getChat', { chat_id: channelId });
  if (res && res.ok && res.result && res.result.pinned_message) {
    return res.result.pinned_message;
  }
  return null;
}

async function downloadFile(fileId) {
  const f = await tg('getFile', { file_id: fileId });
  if (!f || !f.ok) return null;
  const filePath = f.result.file_path;
  const url = FILE_API(token, filePath);
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.text();
}

// Restore database from the channel's pinned db.json (if present).
export async function restoreFromChannel() {
  try {
    const pinned = await fetchPinned();
    const doc = pinned && pinned.document;
    if (doc && /db.*\.json$/i.test(doc.file_name || '')) {
      const text = await downloadFile(doc.file_id);
      if (text) {
        const parsed = JSON.parse(text);
        db.replaceData(parsed);
        // Re-attach the bot self-training patterns. replaceData only keeps
        // users/games, but the AI's learning is stored alongside them and MUST
        // survive redeploys too \u2014 this is what stops the AI 'forgetting'.
        if (parsed && parsed.botPatterns) {
          db.data.botPatterns = parsed.botPatterns;
        }
        // Re-attach admin-edited bot messages (custom /start, welcome, etc.).
        // Same reason as botPatterns: replaceData drops unknown top-level keys,
        // so the admin's message customisations must be restored explicitly.
        if (parsed && parsed.botMessages) {
          db.data.botMessages = parsed.botMessages;
        }
        lastPinnedMsgId = pinned.message_id;
        return true;
      }
    }
    console.log('[tg-store] No existing backup found in channel \u2014 starting fresh.');
  } catch (err) {
    console.warn('[tg-store] restore failed:', err.message);
  }
  return false;
}

// Upload the current db.json to the channel and pin it.
async function uploadToChannel(serialized) {
  try {
    // multipart/form-data upload of the JSON as a document
    const form = new FormData();
    form.append('chat_id', String(channelId));
    form.append('caption', `\u{1F5C4} DB backup \u00B7 ${new Date().toISOString()}`);
    form.append('disable_notification', 'true');
    const blob = new Blob([serialized], { type: 'application/json' });
    form.append('document', blob, 'db.json');

    const res = await fetch(API(token, 'sendDocument'), { method: 'POST', body: form });
    const data = await res.json();
    if (!data.ok) {
      console.warn('[tg-store] upload failed:', data.description);
      return;
    }

    const msgId = data.result.message_id;
    // Pin the new backup so we can find it on next boot
    await tg('pinChatMessage', { chat_id: channelId, message_id: msgId, disable_notification: true });

    // Clean up the previous backup message to avoid clutter
    if (lastPinnedMsgId && lastPinnedMsgId !== msgId) {
      await tg('deleteMessage', { chat_id: channelId, message_id: lastPinnedMsgId }).catch(() => {});
    }
    lastPinnedMsgId = msgId;
  } catch (err) {
    console.warn('[tg-store] upload error:', err.message);
  }
}

// Initialize the Telegram channel store. Call after the DB is constructed.
export async function initTelegramStore() {
  token = process.env.BOT_TOKEN;
  channelId = process.env.DB_CHANNEL_ID;

  if (!token || token.startsWith('YOUR_TELEGRAM_BOT_TOKEN') || !channelId) {
    console.log('[tg-store] Disabled (set BOT_TOKEN and DB_CHANNEL_ID to enable channel persistence).');
    return;
  }

  console.log(`[tg-store] Enabled. Restoring database from channel ${channelId}...`);
  await restoreFromChannel();

  // Wire the persistence hook so future saves upload to the channel
  db.onPersist = (serialized) => uploadToChannel(serialized);
}
