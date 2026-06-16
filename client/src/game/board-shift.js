// Compute and apply a square board size in PX (no CSS aspect-ratio, which old
// desktop Telegram WebViews don't support). Sizes to fit the available width
// and the height left after the panels/controls. Returns a cleanup function.
export function sizeBoard(container) {
  if (!container) return () => {};
  const apply = () => {
    const host = container.parentElement || document.body;
    const cs = getComputedStyle(host);
    const padX = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
    const availW = (host.clientWidth || window.innerWidth) - padX;
    const root = document.documentElement;
    const appH = parseFloat(getComputedStyle(root).getPropertyValue('--app-height')) ||
                 window.innerHeight || 600;
    const availH = appH - 250;
    const size = Math.max(180, Math.floor(Math.min(availW, availH)));
    container.style.setProperty('--board-size', `${size}px`);
  };
  apply();
  const onResize = () => apply();
  window.addEventListener('resize', onResize);
  return () => window.removeEventListener('resize', onResize);
}
