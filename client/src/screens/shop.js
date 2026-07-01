import { t } from '../core/i18n.js';
import { socket } from '../core/websocket.js';
import { haptic } from '../core/telegram.js';
import { Toast } from '../components/toast.js';
import { shopSkins, crestSvg, getSkin, SHOP_CATEGORIES } from '../game/skins.js';
import { coinSvg, CURRENCY } from '../game/currency.js';

// Inline styles for the category tab pills (avoids touching the global CSS).
const CAT_BASE = 'flex:0 0 auto;padding:9px 15px;border-radius:14px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);color:#cbd5e1;font-weight:700;font-size:13px;white-space:nowrap;cursor:pointer;transition:all .15s;';
const CAT_ACTIVE = 'background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;border-color:transparent;box-shadow:0 4px 14px rgba(124,58,237,.4);';

export class ShopScreen {
  constructor(router, params) {
    this.router = router;
    this.params = params || {};
    this.state = null; // { coins, owned, equipped }
    this.loaded = false;
    this._bound = false;
    this.category = 'football';

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

        <div id="shop-cats" class="shop-cats" style="display:flex;gap:8px;overflow-x:auto;padding:2px 2px 12px;margin:0 -2px;">
          ${this.renderCats()}
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

  renderCats() {
    return SHOP_CATEGORIES.map(c =>
      `<button class="shop-cat" data-cat="${c.id}" style="${CAT_BASE}${c.id === this.category ? CAT_ACTIVE : ''}">${c.icon} ${c.label}</button>`
    ).join('');
  }

  renderBody() {
    if (!this.loaded) {
      return `<div class="fr-empty"><div class="loader"></div></div>`;
    }
    const owned = this.state.owned || [];
    const equipped = this.state.equipped || '';
    const cat = this.category || 'football';
    const list = shopSkins().filter(s => (s.category || 'football') === cat);
    if (!list.length) {
      return `<div class="fr-empty" style="opacity:.55;padding:28px;text-align:center;">—</div>`;
    }
    return `
      <div class="shop-grid">
        ${list.map(s => this.skinCard(s, owned, equipped)).join('')}
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

    this.bindCats();
    this.bindCards();
  }

  bindCats() {
    document.querySelectorAll('[data-cat]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.category === btn.dataset.cat) return;
        haptic.impact('light');
        this.category = btn.dataset.cat;
        const cats = document.getElementById('shop-cats');
        if (cats) cats.innerHTML = this.renderCats();
        this.bindCats();
        this.refreshBody();
      });
    });
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
