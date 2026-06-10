// Map Telegram language_code -> a representative country flag emoji + label.
// language_code isn't a country, but it's the best signal Telegram gives us.
const LANG_COUNTRY = {
  uz: { flag: '🇺🇿', name: 'Uzbekistan' },
  en: { flag: '🇬🇧', name: 'English' },
  ru: { flag: '🇷🇺', name: 'Russia' },
  es: { flag: '🇪🇸', name: 'Spain' },
  zh: { flag: '🇨🇳', name: 'China' },
  hi: { flag: '🇮🇳', name: 'India' },
  ar: { flag: '🇸🇦', name: 'Arabic' },
  fr: { flag: '🇫🇷', name: 'France' },
  pt: { flag: '🇵🇹', name: 'Portugal' },
  de: { flag: '🇩🇪', name: 'Germany' },
  tr: { flag: '🇹🇷', name: 'Turkey' },
  fa: { flag: '🇮🇷', name: 'Iran' },
  kk: { flag: '🇰🇿', name: 'Kazakhstan' },
  ky: { flag: '🇰🇬', name: 'Kyrgyzstan' },
  tg: { flag: '🇹🇯', name: 'Tajikistan' },
  uk: { flag: '🇺🇦', name: 'Ukraine' },
  ja: { flag: '🇯🇵', name: 'Japan' },
  ko: { flag: '🇰🇷', name: 'Korea' },
  it: { flag: '🇮🇹', name: 'Italy' }
};

export function country(code) {
  if (!code) return { flag: '🌐', name: '—' };
  const key = String(code).toLowerCase().split('-')[0];
  return LANG_COUNTRY[key] || { flag: '🌐', name: code };
}
