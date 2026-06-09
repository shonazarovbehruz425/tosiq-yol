import { uz } from '../i18n/uz.js';
import { en } from '../i18n/en.js';
import { ru } from '../i18n/ru.js';
import { es } from '../i18n/es.js';
import { zh } from '../i18n/zh.js';
import { hi } from '../i18n/hi.js';
import { ar } from '../i18n/ar.js';
import { fr } from '../i18n/fr.js';
import { pt } from '../i18n/pt.js';
import { de } from '../i18n/de.js';

const languages = { uz, en, ru, es, zh, hi, ar, fr, pt, de };

// Display metadata for the language picker (top world languages + Uzbek)
export const LANGUAGES = [
  { code: 'uz', name: "O'zbek", flag: '🇺🇿' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' }
];

// Right-to-left languages
const RTL_LANGS = ['ar'];

let currentLang = localStorage.getItem('app_lang') || 'uz';

if (!languages[currentLang]) {
  currentLang = 'uz';
}

function applyDirection(lang) {
  const dir = RTL_LANGS.includes(lang) ? 'rtl' : 'ltr';
  document.documentElement.setAttribute('dir', dir);
  document.documentElement.setAttribute('lang', lang);
}

// Apply direction on initial load
applyDirection(currentLang);

export function getLanguage() {
  return currentLang;
}

export function getLanguageName(code) {
  const entry = LANGUAGES.find(l => l.code === code);
  return entry ? entry.name : code;
}

export function setLanguage(lang) {
  if (languages[lang] && lang !== currentLang) {
    currentLang = lang;
    localStorage.setItem('app_lang', lang);
    applyDirection(lang);
    document.dispatchEvent(new CustomEvent('language-changed', { detail: { lang } }));
  }
}

export function t(key, params = {}) {
  const dictionary = languages[currentLang] || languages['uz'];
  let text = dictionary[key] || languages['en'][key] || languages['uz'][key] || key;

  Object.entries(params).forEach(([paramKey, value]) => {
    text = text.replace(`{${paramKey}}`, value);
  });

  return text;
}
