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
            <span style="font-size: 48px;">🤖</span>
          </div>
          <h2 class="menu-title">${t('botTitle')}</h2>
          <p class="menu-slogan">${t('botSubtitle')}</p>
        </div>

        <div class="difficulty-selector" style="margin-top: 10px;">
          <div class="diff-card easy-card" data-diff="easy">
            <div class="diff-icon">🟢</div>
            <div class="diff-info">
              <span class="diff-name" style="color: var(--accent-green);">${t('easy')}</span>
              <span class="diff-desc">${t('easyDesc')}</span>
            </div>
          </div>

          <div class="diff-card normal-card" data-diff="normal">
            <div class="diff-icon">🟡</div>
            <div class="diff-info">
              <span class="diff-name" style="color: var(--accent-yellow);">${t('normal')}</span>
              <span class="diff-desc">${t('normalDesc')}</span>
            </div>
          </div>

          <div class="diff-card hard-card" data-diff="hard">
            <div class="diff-icon">🔴</div>
            <div class="diff-info">
              <span class="diff-name" style="color: var(--accent-red);">${t('hard')}</span>
              <span class="diff-desc">${t('hardDesc')}</span>
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
