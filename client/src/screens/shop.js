import { t } from '../core/i18n.js';
import { socket } from '../core/websocket.js';
import { haptic } from '../core/telegram.js';
import { Toast } from '../components/toast.js';
import { shopSkins, crestSvg, getSkin } from '../game/skins.js';
import { coinSvg, CURRENCY } from '../game/currency.js';

export class ShopScreen {
  constructor(router, params) {
    this.router = router;
    this.params = params || {};
    this.state = null; // { coins, owned, equipped }
    this.loaded = false;
    this._bound = false;

    this.onShopState = this.onShopState.bind(this);
    this.onShopResult = this.onShopResult.bind(this);
  }

  render() {
    return `
      <div class="screen screen-enter">
        <div class="shop-top">
          <div class="shop-head">
            <div class="shop-logo">
              <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M6 2 3 6v14a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V6l-3-4z"/>
                <path d="M3 6h18M16 10a4 4 0 0 1-8 0"/>
              </svg>
            </div>
            <div>
              <h2 class="online-title">${t('shopTitle')}</h2>
              <p class="online-sub">${t('shopSubtitle')}</p>
            </div>
          </div>
          <div class="coin-badge" id="coin-badge">
            ${coinSvg(20)}
            <span id="coin-amount">—</span>
            <span class="coin-code">${CURRENCY.code}</span>
          </div>
        </div>

        <div id="shop-body" class="shop-body">
          ${this.renderBody()}
        </div>

        <button class="btn btn-secondary" id="back-btn" style="margin-top: 14px;">
          ${t('back')}
        </button>
      </div>
    `;
  }

  renderBody() {
    if (!this.loaded) {
      return `<div class="fr-empty"><div class="loader"></div></div>`;
    }
    const owned = this.state.owned || [];
    const equipped = this.state.equipped || '';
    return `
      <div class="shop-grid">
        ${shopSkins().map(s => this.skinCard(s, owned, equipped)).join('')}
      </div>
    `;
  }

  skinCard(s, owned, equipped) {
    const isOwned = owned.includes(s.id);
    const isEquipped = equipped === s.id;
    let action;
    if (isEquipped) {
      action = `<button class="shop-btn shop-unequip" data-unequip="1">✓ ${t('equipped')}</button>`;
    } else if (isOwned) {
      action = `<button class="shop-btn shop-equip" data-equip="${s.id}">${t('equip')}</button>`;
    } else {
      action = `<button class="shop-btn shop-buy" data-buy="${s.id}" data-price="${s.price}">
        ${coinSvg(15)} ${s.price}
      </button>`;
    }
    return `
      <div class="shop-card ${isEquipped ? 'equipped' : ''}">
        <div class="shop-crest">${crestSvg(s.id, 56)}</div>
        <div class="shop-name">${s.name}</div>
        ${action}
      </div>
    `;
  }

  afterRender() {
    if (!this._bound) {
      socket.on('shop_state', this.onShopState);
      socket.on('shop_result', this.onShopResult);
      this._bound = true;
      socket.connect();
      socket.send('get_shop');
      this._retry = setTimeout(() => socket.send('get_shop'), 800);
    }

    const backBtn = document.getElementById('back-btn');
    if (backBtn) backBtn.addEventListener('click', () => { haptic.impact('light'); this.router.back(); });

    this.bindCards();
  }

  bindCards() {
    document.querySelectorAll('[data-buy]').forEach(btn => {
      btn.addEventListener('click', () => {
        haptic.impact('medium');
        socket.send('buy_skin', { skinId: btn.dataset.buy, price: parseInt(btn.dataset.price) });
      });
    });
    document.querySelectorAll('[data-equip]').forEach(btn => {
      btn.addEventListener('click', () => {
        haptic.impact('medium');
        socket.send('equip_skin', { skinId: btn.dataset.equip });
      });
    });
    document.querySelectorAll('[data-unequip]').forEach(btn => {
      btn.addEventListener('click', () => {
        haptic.impact('light');
        // Empty skinId tells the server to unequip (back to default pawn).
        socket.send('equip_skin', { skinId: '' });
      });
    });
  }

  refreshBody() {
    const body = document.getElementById('shop-body');
    if (body) body.innerHTML = this.renderBody();
    const amt = document.getElementById('coin-amount');
    if (amt) amt.textContent = this.state ? this.state.coins : 0;
    this.bindCards();
  }

  onShopState(data) {
    this.state = data || { coins: 0, owned: [], equipped: '' };
    this.loaded = true;
    this.refreshBody();
  }

  onShopResult(res) {
    if (!res) return;
    if (res.action === 'buy') {
      if (res.ok) { haptic.notification('success'); Toast.success(t('buySuccess')); }
      else if (res.error === 'insufficient') { haptic.notification('error'); Toast.warning(t('notEnoughCoins')); }
      else if (res.error === 'not_registered') Toast.warning(t('shopNotRegistered'));
    } else if (res.action === 'equip') {
      if (res.ok) {
        haptic.notification('success');
        Toast.success(res.equipped ? t('equipSuccess') : t('unequipSuccess'));
      }
    }
    // Update local state from the server response, then re-render.
    if (typeof res.coins === 'number') this.state.coins = res.coins;
    if (Array.isArray(res.owned)) this.state.owned = res.owned;
    if (res.action === 'equip' && res.ok) this.state.equipped = res.equipped || '';
    this.refreshBody();
  }

  destroy() {
    socket.off('shop_state', this.onShopState);
    socket.off('shop_result', this.onShopResult);
    if (this._retry) { clearTimeout(this._retry); this._retry = null; }
  }
}

export default ShopScreen;
