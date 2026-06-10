// Convert an ISO 3166-1 alpha-2 country code (e.g. "UZ") into a flag emoji.
// Each letter maps to a regional indicator symbol.
function codeToFlag(code) {
  if (!code || code.length !== 2) return '🌐';
  const A = 0x1f1e6;
  const up = code.toUpperCase();
  return String.fromCodePoint(A + (up.charCodeAt(0) - 65)) +
         String.fromCodePoint(A + (up.charCodeAt(1) - 65));
}

// Resolve a display { flag, name } for a user.
// Prefers the real IP-derived country; falls back to "unknown".
export function country(user) {
  const code = user && user.country_code;
  const name = (user && user.country_name) || '';
  if (code) {
    return { flag: codeToFlag(code), name: name || code };
  }
  return { flag: '🌐', name: '—' };
}
