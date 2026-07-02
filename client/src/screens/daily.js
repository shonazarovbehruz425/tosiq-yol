import { haptic, getInitData } from '../core/telegram.js';
import { getLanguage } from '../core/i18n.js';
import { Toast } from '../components/toast.js';

// Clean SVG coin (replaces the plain coin emoji that renders as a dull moon on
// some devices).
const COIN = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" style="display:inline-block;vertical-align:-2px;margin:0 1px;"><circle cx="12" cy="12" r="9.5" fill="#f7c948" stroke="#c98a15" stroke-width="1.6"/><circle cx="12" cy="12" r="6" fill="none" stroke="#e6ad2e" stroke-width="1.3"/><circle cx="9" cy="9" r="1.6" fill="#fff3c4"/></svg>';

// Localized strings for the daily screen. Other languages fall back to English.
const STR = {
  uz: {
    title: 'Kunlik mukofot', subtitle: "Har kuni kir \u2014 streak va tanga yig'",
    streakLabel: 'Streak', daysWord: 'kun', bestWord: 'Rekord',
    checkinBtn: 'Bugun kirish +{r}', checkedBtn: 'Bugun olindi \u2713',
    questsTitle: 'Bugungi topshiriqlar', doneWord: 'Bajarildi', backBtn: 'Orqaga',
    loadingWord: 'Yuklanmoqda\u2026', notReg: "Avval Telegram botda /start bosing",
    checkOk: '{s}-kun streak! +{r} \u{1FA99}', already: 'Bugun allaqachon olindingiz',
    errWord: 'Xatolik. Qayta urinib ko\u2018ring.'
  },
  en: {
    title: 'Daily rewards', subtitle: 'Check in daily \u2014 build a streak & earn coins',
    streakLabel: 'Streak', daysWord: 'days', bestWord: 'Best',
    checkinBtn: 'Check in +{r}', checkedBtn: 'Claimed today \u2713',
    questsTitle: "Today's quests", doneWord: 'Done', backBtn: 'Back',
    loadingWord: 'Loading\u2026', notReg: 'Open the Telegram bot and press /start first',
    checkOk: '{s}-day streak! +{r} \u{1FA99}', already: 'Already checked in today',
    errWord: 'Something went wrong. Try again.'
  },
  ru: {
    title: '\u0415\u0436\u0435\u0434\u043d\u0435\u0432\u043d\u044b\u0435 \u043d\u0430\u0433\u0440\u0430\u0434\u044b', subtitle: '\u0417\u0430\u0445\u043e\u0434\u0438\u0442\u0435 \u043a\u0430\u0436\u0434\u044b\u0439 \u0434\u0435\u043d\u044c \u2014 \u043a\u043e\u043f\u0438\u0442\u0435 \u0441\u0435\u0440\u0438\u044e \u0438 \u043c\u043e\u043d\u0435\u0442\u044b',
    streakLabel: '\u0421\u0435\u0440\u0438\u044f', daysWord: '\u0434\u043d.', bestWord: '\u0420\u0435\u043a\u043e\u0440\u0434',
    checkinBtn: '\u041e\u0442\u043c\u0435\u0442\u0438\u0442\u044c\u0441\u044f +{r}', checkedBtn: '\u041f\u043e\u043b\u0443\u0447\u0435\u043d\u043e \u0441\u0435\u0433\u043e\u0434\u043d\u044f \u2713',
    questsTitle: '\u0417\u0430\u0434\u0430\u043d\u0438\u044f \u0434\u043d\u044f', doneWord: '\u0413\u043e\u0442\u043e\u0432\u043e', backBtn: '\u041d\u0430\u0437\u0430\u0434',
    loadingWord: '\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430\u2026', notReg: '\u0421\u043d\u0430\u0447\u0430\u043b\u0430 \u043e\u0442\u043a\u0440\u043e\u0439\u0442\u0435 \u0431\u043e\u0442\u0430 \u0432 Telegram \u0438 \u043d\u0430\u0436\u043c\u0438\u0442\u0435 /start',
    checkOk: '\u0421\u0435\u0440\u0438\u044f {s} \u0434\u043d.! +{r} \u{1FA99}', already: '\u0412\u044b \u0443\u0436\u0435 \u043e\u0442\u043c\u0435\u0442\u0438\u043b\u0438\u0441\u044c \u0441\u0435\u0433\u043e\u0434\u043d\u044f',
    errWord: '\u041e\u0448\u0438\u0431\u043a\u0430. \u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0441\u043d\u043e\u0432\u0430.'
  }
};

// In production the Mini App is served from the same origin as the API. In
// local Vite dev (port 5173) the API runs on :3000.
function apiBase() {
  try {
    if (location.port === '5173') return `${location.protocol}//${location.hostname}:3000`;
  } catch (e) { /* ignore */ }
  return '';
}

export class DailyScreen {
  constructor(router, params) {
    this.router = router;
    this.params = params;
    this.state = null;
    this.loaded = false;
    this.checking = false;
    this.notRegistered = false;
    this.lang = getLanguage();
  }

  s(key, params = {}) {
    const dict = STR[this.lang] || STR.en;
    let text = dict[key] || STR.en[key] || key;
    Object.entries(params).forEach(([k, v]) => { text = text.replace(`{${k}}`, v); });
    return text;
  }

  questText(q) {
    if (q && q.text && typeof q.text === 'object') {
      return q.text[this.lang] || q.text.en || q.text.uz || '';
    }
    return q && q.text ? String(q.text) : '';
  }

  render() {
    return `
      <div class="screen screen-enter">
        <div class="menu-header" style="margin-top: 18px;">
          <div class="logo-container" style="font-size: 34px; line-height: 1;">\u{1F381}</div>
          <h2 class="menu-title">${this.s('title')}</h2>
          <p class="menu-slogan">${this.s('subtitle')}</p>
        </div>

        <div id="daily-body" style="margin-top: 8px;">
          ${this.renderBody()}
        </div>

        <button class="btn btn-secondary" id="daily-back-btn" style="margin-top: 16px;">
          ${this.s('backBtn')}
        </button>
      </div>
    `;
  }

  renderBody() {
    if (!this.loaded) {
      return `<div style="text-align:center;padding:40px 0;color:#94a3b8;">${this.s('loadingWord')}</div>`;
    }
    if (this.notRegistered) {
      return `<div style="text-align:center;padding:32px 16px;color:#fca5a5;font-weight:600;line-height:1.5;">${this.s('notReg')}</div>`;
    }
    const st = this.state || {};
    const streak = st.streak || 0;
    const best = st.bestStreak || 0;
    const checked = !!st.checkedInToday;
    const nextReward = st.nextReward || 0;
    const quests = Array.isArray(st.quests) ? st.quests : [];

    const btn = checked
      ? `<button class="btn" id="checkin-btn" disabled style="opacity:.55;cursor:default;background:#334155;">${this.s('checkedBtn')}</button>`
      : `<button class="btn daily-cta" id="checkin-btn" style="background:linear-gradient(135deg,#fbbf24 0%,#f97316 100%);box-shadow:0 8px 24px rgba(245,158,11,.5);color:#fff;font-weight:800;letter-spacing:.2px;">${this.s('checkinBtn', { r: nextReward })} ${COIN}</button>`;

    return `
      <div style="background:linear-gradient(135deg,rgba(124,58,237,.22),rgba(34,211,238,.14));border:1px solid rgba(124,58,237,.35);border-radius:18px;padding:18px;text-align:center;">
        <div style="font-size:40px;line-height:1;">\u{1F525}</div>
        <div style="font-size:34px;font-weight:800;color:#f1f5f9;margin-top:4px;line-height:1;">${streak}</div>
        <div style="color:#94a3b8;font-size:13px;margin-top:4px;">${this.s('streakLabel')} \u00b7 ${streak} ${this.s('daysWord')}</div>
        <div style="color:#64748b;font-size:12px;margin-top:2px;">${this.s('bestWord')}: ${best} ${this.s('daysWord')}</div>
        <div style="margin-top:14px;">${btn}</div>
      </div>

      <div style="margin-top:18px;">
        <h3 style="color:#e2e8f0;font-size:15px;font-weight:700;margin:0 0 10px;">${this.s('questsTitle')}</h3>
        <div style="display:flex;flex-direction:column;gap:10px;">
          ${quests.map(q => this.renderQuest(q)).join('')}
        </div>
      </div>
    `;
  }

  renderQuest(q) {
    const goal = q.goal || 1;
    const progress = Math.min(q.progress || 0, goal);
    const pct = Math.round((progress / goal) * 100);
    const done = !!q.done;
    return `
      <div style="background:#1e293b;border:1px solid ${done ? 'rgba(34,197,94,.45)' : 'rgba(51,65,85,.6)'};border-radius:14px;padding:12px 14px;">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
          <span style="color:#f1f5f9;font-size:13px;font-weight:600;">${done ? '\u2705 ' : ''}${this.esc(this.questText(q))}</span>
          <span style="color:#fbbf24;font-size:12px;font-weight:700;white-space:nowrap;display:inline-flex;align-items:center;gap:2px;">+${q.reward} ${COIN}</span>
        </div>
        <div style="margin-top:8px;height:7px;background:#0f172a;border-radius:99px;overflow:hidden;">
          <div style="height:100%;width:${pct}%;background:${done ? '#22c55e' : 'linear-gradient(90deg,#7c3aed,#22d3ee)'};border-radius:99px;transition:width .3s;"></div>
        </div>
        <div style="margin-top:4px;color:#64748b;font-size:11px;text-align:right;">${done ? this.s('doneWord') : `${progress}/${goal}`}</div>
      </div>
    `;
  }

  esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  async afterRender() {
    const backBtn = document.getElementById('daily-back-btn');
    if (backBtn) backBtn.addEventListener('click', () => { haptic.impact('light'); this.router.back(); });
    this.bindCheckin();
    await this.load();
  }

  bindCheckin() {
    const btn = document.getElementById('checkin-btn');
    if (btn && !btn.disabled) {
      btn.addEventListener('click', () => this.doCheckin());
    }
  }

  async load() {
    try {
      const res = await fetch(`${apiBase()}/api/daily`, {
        headers: { 'Authorization': `Bearer ${getInitData()}` }
      });
      if (res.status === 403 || res.status === 404) {
        this.notRegistered = true;
      } else if (res.ok) {
        this.state = await res.json();
        this.notRegistered = false;
      }
    } catch (e) {
      // network error \u2014 keep whatever we have, show generic UI
    }
    this.loaded = true;
    this.refresh();
  }

  refresh() {
    const body = document.getElementById('daily-body');
    if (body) body.innerHTML = this.renderBody();
    this.bindCheckin();
  }

  async doCheckin() {
    if (this.checking) return;
    this.checking = true;
    haptic.impact('medium');
    const btn = document.getElementById('checkin-btn');
    if (btn) { btn.disabled = true; btn.style.opacity = '.55'; }
    try {
      const res = await fetch(`${apiBase()}/api/daily/checkin`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getInitData()}`, 'Content-Type': 'application/json' }
      });
      if (!res.ok) {
        if (res.status === 403 || res.status === 404) Toast.info(this.s('notReg'));
        else Toast.info(this.s('errWord'));
        return;
      }
      const data = await res.json();
      if (data.alreadyChecked) {
        Toast.info(this.s('already'));
      } else {
        haptic.notification('success');
        Toast.success(this.s('checkOk', { s: data.streak, r: data.reward }));
      }
      await this.load();
    } catch (e) {
      Toast.info(this.s('errWord'));
    } finally {
      this.checking = false;
    }
  }

  destroy() {}
}

export default DailyScreen;
