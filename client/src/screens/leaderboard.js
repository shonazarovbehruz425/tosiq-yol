import { t } from '../core/i18n.js';
import { socket } from '../core/websocket.js';
import { haptic } from '../core/telegram.js';

// Convert an ISO-2 country code (e.g. "UZ") into its flag emoji.
function flagFromCode(code) {
  if (!code || code.length !== 2) return '';
  const A = 0x1f1e6;
  const up = code.toUpperCase();
  return String.fromCodePoint(A + (up.charCodeAt(0) - 65), A + (up.charCodeAt(1) - 65));
}

// Trophy / medal SVG used for the top-3 podium and ranking badges.
function medalSvg(cls) {
  return `
    <svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="9" r="6"/>
      <path d="M9 14.5 7.5 22 12 19l4.5 3L15 14.5"/>
      <path d="M12 6.5l.9 1.8 2 .3-1.45 1.4.35 2L12 11l-1.8.95.35-2L9.1 8.6l2-.3z" fill="currentColor" stroke="none"/>
    </svg>`;
}

export class LeaderboardScreen {
  constructor(router, params) {
    this.router = router;
    this.params = params;
    this.board = null;       // { top, me, total }
    this.loaded = false;
    this.onBoard = this.onBoard.bind(this);
  }

  render() {
    return `
      <div class="screen screen-enter lb-screen">
        <div class="menu-header" style="margin-top: 18px;">
          <div class="lb-logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
              <path d="M8 21h8M12 17v4"/>
              <path d="M7 4h10v5a5 5 0 0 1-10 0z"/>
              <path d="M7 5H4v2a3 3 0 0 0 3 3M17 5h3v2a3 3 0 0 1-3 3"/>
            </svg>
          </div>
          <h2 class="menu-title">${t('leaderboardTitle')}</h2>
          <p class="menu-slogan">${t('leaderboardSubtitle')}</p>
        </div>

        <div id="lb-body" class="lb-body">
          ${this.renderBody()}
        </div>

        <button class="btn btn-secondary" id="back-btn" style="margin-top: 16px;">
          ${t('back')}
        </button>
      </div>
    `;
  }

  renderBody() {
    if (!this.loaded) {
      return `<div class="lb-loading"><div class="loader"></div><span>${t('loadingBoard')}</span></div>`;
    }

    const top = (this.board && this.board.top) || [];
    if (top.length === 0) {
      return `<div class="lb-empty">${t('leaderboardEmpty')}</div>`;
    }

    const podium = top.slice(0, 3);
    const rest = top.slice(3);

    return `
      ${this.renderPodium(podium)}
      <div class="lb-list">
        ${rest.map(p => this.renderRow(p)).join('')}
      </div>
      ${this.renderMe()}
    `;
  }

  renderPodium(podium) {
    // Order visually: 2nd, 1st, 3rd
    const order = [podium[1], podium[0], podium[2]].filter(Boolean);
    return `
      <div class="lb-podium">
        ${order.map(p => {
          const place = p.rank;
          const flag = flagFromCode(p.country_code);
          return `
            <div class="podium-col place-${place}">
              <div class="podium-avatar">
                <span class="podium-initial">${this.initial(p.name)}</span>
                <span class="podium-badge">${place}</span>
              </div>
              <div class="podium-name">${this.esc(p.name)}</div>
              <div class="podium-rating">${p.rating}</div>
              <div class="podium-stand">
                ${medalSvg('podium-medal')}
              </div>
              ${flag ? `<span class="podium-flag">${flag}</span>` : ''}
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  renderRow(p) {
    const flag = flagFromCode(p.country_code);
    return `
      <div class="lb-row">
        <span class="lb-rank">${p.rank}</span>
        <span class="lb-avatar">${this.initial(p.name)}</span>
        <span class="lb-name">
          ${this.esc(p.name)}
          ${flag ? `<span class="lb-flag">${flag}</span>` : ''}
        </span>
        <span class="lb-wins">${p.wins} ${t('wins')}</span>
        <span class="lb-rating">${p.rating}</span>
      </div>
    `;
  }

  renderMe() {
    const me = this.board && this.board.me;
    const top = (this.board && this.board.top) || [];
    // If the user is already shown in the visible list, no need to repeat.
    const inList = me && top.some(p => String(p.id) === String(me.id));
    if (!me) {
      return `<div class="lb-me lb-me-empty">${t('noRanking')}</div>`;
    }
    if (inList) return '';
    const flag = flagFromCode(me.country_code);
    return `
      <div class="lb-me">
        <span class="lb-me-label">${t('yourRank')}</span>
        <div class="lb-row lb-row-me">
          <span class="lb-rank">${me.rank}</span>
          <span class="lb-avatar">${this.initial(me.name)}</span>
          <span class="lb-name">${this.esc(me.name)} ${flag ? `<span class="lb-flag">${flag}</span>` : ''}</span>
          <span class="lb-wins">${me.wins} ${t('wins')}</span>
          <span class="lb-rating">${me.rating}</span>
        </div>
      </div>
    `;
  }

  initial(name) {
    const n = (name || '?').trim();
    return this.esc(n.charAt(0).toUpperCase() || '?');
  }

  esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
    ));
  }

  afterRender() {
    socket.on('leaderboard', this.onBoard);
    socket.connect();
    // Ask for the board (auth happens on connect; resend shortly after in case
    // the socket wasn't authenticated yet).
    socket.send('get_leaderboard');
    this._retry = setTimeout(() => socket.send('get_leaderboard'), 800);

    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        haptic.impact('light');
        this.router.back();
      });
    }
  }

  onBoard(data) {
    this.board = data || { top: [], me: null, total: 0 };
    this.loaded = true;
    const body = document.getElementById('lb-body');
    if (body) body.innerHTML = this.renderBody();
  }

  destroy() {
    socket.off('leaderboard', this.onBoard);
    if (this._retry) { clearTimeout(this._retry); this._retry = null; }
  }
}

export default LeaderboardScreen;
