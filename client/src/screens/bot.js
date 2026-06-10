import { t } from '../core/i18n.js';
import { haptic } from '../core/telegram.js';

export class BotScreen {
  constructor(router, params) {
    this.router = router;
    this.params = params;
  }

  render() {
    return `
      <div class="screen screen-enter">
        <div class="menu-header" style="margin-top: 20px;">
          <div class="logo-container" style="background: linear-gradient(135deg, #10b981, #059669); transform: none; box-shadow: 0 8px 25px rgba(16, 185, 129, 0.3);">
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width: 46px; height: 46px;">
              <rect x="5" y="8" width="14" height="11" rx="3"/>
              <path d="M12 8V4"/>
              <circle cx="12" cy="3" r="1.2"/>
              <circle cx="9.5" cy="13" r="1.4" fill="#fff" stroke="none"/>
              <circle cx="14.5" cy="13" r="1.4" fill="#fff" stroke="none"/>
              <path d="M2 13v3M22 13v3"/>
            </svg>
          </div>
          <h2 class="menu-title">${t('botTitle')}</h2>
          <p class="menu-slogan">${t('botSubtitle')}</p>
        </div>

        <div class="difficulty-selector" style="margin-top: 10px;">
          <div class="diff-card easy-card" data-diff="easy">
            <div class="diff-badge badge-easy">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
            </div>
            <div class="diff-info">
              <span class="diff-name" style="color: var(--accent-green);">${t('easy')}</span>
              <span class="diff-desc">${t('easyDesc')}</span>
            </div>
            <div class="diff-level">
              <span class="lvl on green"></span><span class="lvl"></span><span class="lvl"></span>
            </div>
          </div>

          <div class="diff-card normal-card" data-diff="normal">
            <div class="diff-badge badge-normal">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" fill="currentColor" stroke="none"/>
              </svg>
            </div>
            <div class="diff-info">
              <span class="diff-name" style="color: var(--accent-yellow);">${t('normal')}</span>
              <span class="diff-desc">${t('normalDesc')}</span>
            </div>
            <div class="diff-level">
              <span class="lvl on yellow"></span><span class="lvl on yellow"></span><span class="lvl"></span>
            </div>
          </div>

          <div class="diff-card hard-card" data-diff="hard">
            <div class="diff-badge badge-hard">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2l2.4 5 5.6.8-4 4 1 5.6-5-2.7-5 2.7 1-5.6-4-4 5.6-.8z" fill="currentColor" stroke="none"/>
              </svg>
            </div>
            <div class="diff-info">
              <span class="diff-name" style="color: var(--accent-red);">${t('hard')}</span>
              <span class="diff-desc">${t('hardDesc')}</span>
            </div>
            <div class="diff-level">
              <span class="lvl on red"></span><span class="lvl on red"></span><span class="lvl on red"></span>
            </div>
          </div>
        </div>

        <button class="btn btn-secondary" id="back-btn" style="margin-top: auto;">
          ${t('back')}
        </button>
      </div>
    `;
  }

  afterRender() {
    const cards = document.querySelectorAll('.diff-card');
    cards.forEach(card => {
      card.addEventListener('click', () => {
        const difficulty = card.dataset.diff;
        haptic.impact('medium');

        // Start a bot game directly with the standard ruleset
        this.router.navigate('game', {
          vs: 'bot',
          difficulty,
          mode: 'duel',
          boardSize: 9,
          totalTime: 300,
          blitzTime: 0,
          wallsCount: 10
        });
      });
    });

    const backBtn = document.getElementById('back-btn');
    backBtn.addEventListener('click', () => {
      haptic.impact('light');
      this.router.back();
    });
  }

  destroy() {}
}
export default BotScreen;
