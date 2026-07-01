// client/src/core/leagues.js
// ────────────────────────────────────────────────────────────────────────────
// Client mirror of the server league tiers (server/game/progression.js).
// A player's league is derived purely from their Elo rating (starts at 1000).
// Kept in sync with the server thresholds & emojis. Names are localized for
// the primary UI languages (uz/en/ru); other languages fall back to English.
// ────────────────────────────────────────────────────────────────────────────
import { getLanguage } from './i18n.js';

export const LEAGUES = [
  { key: 'bronze',      emoji: '\u{1F949}', min: 0,    max: 999,      color: '#cd7f32', names: { uz: 'Bronza',      en: 'Bronze',      ru: '\u0411\u0440\u043e\u043d\u0437\u0430' } },
  { key: 'silver',      emoji: '\u{1F948}', min: 1000, max: 1199,     color: '#9ca3af', names: { uz: 'Kumush',      en: 'Silver',      ru: '\u0421\u0435\u0440\u0435\u0431\u0440\u043e' } },
  { key: 'gold',        emoji: '\u{1F947}', min: 1200, max: 1399,     color: '#fbbf24', names: { uz: 'Oltin',       en: 'Gold',        ru: '\u0417\u043e\u043b\u043e\u0442\u043e' } },
  { key: 'platinum',    emoji: '\u{1F48E}', min: 1400, max: 1599,     color: '#22d3ee', names: { uz: 'Platina',     en: 'Platinum',    ru: '\u041f\u043b\u0430\u0442\u0438\u043d\u0430' } },
  { key: 'diamond',     emoji: '\u{1F5A4}', min: 1600, max: 1799,     color: '#60a5fa', names: { uz: 'Olmos',       en: 'Diamond',     ru: '\u0410\u043b\u043c\u0430\u0437' } },
  { key: 'master',      emoji: '\u{1F525}', min: 1800, max: 1999,     color: '#f472b6', names: { uz: 'Master',      en: 'Master',      ru: '\u041c\u0430\u0441\u0442\u0435\u0440' } },
  { key: 'grandmaster', emoji: '\u{1F451}', min: 2000, max: Infinity, color: '#a78bfa', names: { uz: 'Grandmaster', en: 'Grandmaster', ru: '\u0413\u0440\u0430\u043d\u0434\u043c\u0430\u0441\u0442\u0435\u0440' } }
];

// Resolve league info for a rating. Localized name follows the current app lang.
export function getLeague(rating) {
  const r = (typeof rating === 'number' && isFinite(rating)) ? rating : 1000;
  const tier = LEAGUES.find(l => r >= l.min && r <= l.max) || LEAGUES[0];
  const lang = getLanguage();
  const name = tier.names[lang] || tier.names.en;
  return { key: tier.key, emoji: tier.emoji, color: tier.color, name, min: tier.min, max: tier.max };
}

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// Render a small inline league chip (emoji, optionally the league name).
export function leagueBadge(rating, opts = {}) {
  const showName = !!opts.showName;
  const lg = getLeague(rating);
  const r = (typeof rating === 'number' && isFinite(rating)) ? rating : '';
  const title = escapeHtml(lg.name) + (r !== '' ? ' \u00b7 ' + r : '');
  const label = showName ? ' ' + escapeHtml(lg.name) : '';
  return `<span class="league-badge" title="${title}" style="display:inline-flex;align-items:center;gap:3px;padding:1px 6px;border-radius:999px;font-size:10px;font-weight:700;line-height:1.6;background:${lg.color}22;color:${lg.color};border:1px solid ${lg.color}55;vertical-align:middle;">${lg.emoji}${label}</span>`;
}

export default { LEAGUES, getLeague, leagueBadge };
