// Smooth, self-styled toast with crisp SVG icons (no plain emoji stickers).
// API is unchanged: Toast.success / error / warning / info / show.

const COIN_EMOJI = /\u{1FA99}/gu; // coin emoji \u2014 replaced by a clean SVG coin

const COIN_SVG =
  '<svg class="tw-coin" viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">' +
  '<circle cx="12" cy="12" r="9.5" fill="#f7c948" stroke="#c98a15" stroke-width="1.6"/>' +
  '<circle cx="12" cy="12" r="6" fill="none" stroke="#e6ad2e" stroke-width="1.3"/>' +
  '<circle cx="9" cy="9" r="1.6" fill="#fff3c4"/></svg>';

const ICONS = {
  success:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12.4l2.6 2.6L15.6 9"/></svg>',
  error:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M15 9l-6 6M9 9l6 6"/></svg>',
  warning:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4.2l8.6 14.8H3.4z"/><line x1="12" y1="10" x2="12" y2="14"/><circle cx="12" cy="16.8" r="1.1" fill="currentColor" stroke="none"/></svg>',
  info:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><line x1="12" y1="11" x2="12" y2="16.5"/><circle cx="12" cy="7.8" r="1.1" fill="currentColor" stroke="none"/></svg>'
};

const ICON_COLOR = {
  success: '#34d399',
  error: '#f87171',
  warning: '#fbbf24',
  info: '#60a5fa'
};

const STYLE_ID = 'tw-toast-styles';

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = `
.tw-toast-container{position:absolute;top:calc(14px + var(--safe-top, 0px));left:0;right:0;display:flex;flex-direction:column;align-items:center;gap:8px;z-index:4000;pointer-events:none;padding:0 16px;box-sizing:border-box;}
.tw-toast{pointer-events:auto;max-width:100%;display:flex;align-items:center;gap:10px;padding:11px 15px;border-radius:14px;font-family:var(--font-sans, sans-serif);font-size:14px;font-weight:600;color:#f8fafc;background:rgba(17,24,39,.92);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.10);box-shadow:0 10px 30px rgba(0,0,0,.45);transform:translateY(-16px) scale(.96);opacity:0;animation:twToastIn .42s cubic-bezier(.22,1.2,.36,1) forwards;}
.tw-toast .tw-ic{width:22px;height:22px;flex:0 0 22px;display:flex;align-items:center;justify-content:center;}
.tw-toast .tw-ic svg{width:22px;height:22px;display:block;}
.tw-toast .tw-msg{line-height:1.35;}
.tw-toast .tw-coin{vertical-align:-3px;margin:0 1px;}
.tw-toast.tw-success{border-color:rgba(52,211,153,.45);box-shadow:0 10px 30px rgba(16,185,129,.28);}
.tw-toast.tw-error{border-color:rgba(248,113,113,.45);box-shadow:0 10px 30px rgba(239,68,68,.28);}
.tw-toast.tw-warning{border-color:rgba(251,191,36,.45);box-shadow:0 10px 30px rgba(245,158,11,.25);}
.tw-toast-out{animation:twToastOut .3s ease forwards!important;}
@keyframes twToastIn{0%{transform:translateY(-16px) scale(.96);opacity:0}60%{transform:translateY(2px) scale(1.01);opacity:1}100%{transform:translateY(0) scale(1);opacity:1}}
@keyframes twToastOut{to{transform:translateY(-12px) scale(.97);opacity:0}}
@media (prefers-reduced-motion: reduce){.tw-toast{animation:none;opacity:1;transform:none}.tw-toast-out{animation:none!important;opacity:0}}
`;
  document.head.appendChild(el);
}

export class Toast {
  static show(message, type = 'info', duration = 3000) {
    ensureStyles();

    const mount = document.getElementById('app') || document.body;
    let container = mount.querySelector(':scope > .tw-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'tw-toast-container';
      mount.appendChild(container);
    }

    const kind = ICONS[type] ? type : 'info';
    const toast = document.createElement('div');
    toast.className = `tw-toast tw-${kind}`;

    const msgHtml = String(message == null ? '' : message).replace(COIN_EMOJI, COIN_SVG);

    toast.innerHTML =
      `<span class="tw-ic" style="color:${ICON_COLOR[kind]}">${ICONS[kind]}</span>` +
      `<span class="tw-msg">${msgHtml}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('tw-toast-out');
      const done = () => {
        toast.remove();
        if (container && container.children.length === 0) container.remove();
      };
      toast.addEventListener('animationend', done, { once: true });
      // Fallback in case animationend doesn't fire.
      setTimeout(done, 400);
    }, duration);
  }

  static success(message, duration) { this.show(message, 'success', duration); }
  static error(message, duration) { this.show(message, 'error', duration); }
  static warning(message, duration) { this.show(message, 'warning', duration); }
  static info(message, duration) { this.show(message, 'info', duration); }
}
