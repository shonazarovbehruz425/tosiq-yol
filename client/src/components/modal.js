import { haptic } from '../core/telegram.js';

export class Modal {
  static activeModal = null;

  static show({
    title,
    message,
    icon = '❓',
    confirmText = 'OK',
    cancelText = null,
    onConfirm = null,
    onCancel = null,
    barrierDismissible = true
  }) {
    // Close existing modal if any
    this.close();

    haptic.impact('medium');

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'app-modal';

    const card = document.createElement('div');
    card.className = 'modal-card';
    
    let actionsHtml = '';
    if (cancelText) {
      actionsHtml = `
        <div class="modal-actions">
          <button class="btn btn-secondary" id="modal-cancel-btn">${cancelText}</button>
          <button class="btn btn-primary" id="modal-confirm-btn">${confirmText}</button>
        </div>
      `;
    } else {
      actionsHtml = `
        <div class="modal-actions">
          <button class="btn btn-primary" id="modal-confirm-btn" style="width: 100%">${confirmText}</button>
        </div>
      `;
    }

    card.innerHTML = `
      <div class="modal-icon">${icon}</div>
      <h3 class="modal-title">${title}</h3>
      <p class="modal-desc">${message}</p>
      ${actionsHtml}
    `;

    overlay.appendChild(card);
    document.body.appendChild(overlay);
    this.activeModal = overlay;

    // Button event listeners
    const confirmBtn = card.querySelector('#modal-confirm-btn');
    confirmBtn.addEventListener('click', () => {
      haptic.selection();
      this.close();
      if (typeof onConfirm === 'function') onConfirm();
    });

    if (cancelText) {
      const cancelBtn = card.querySelector('#modal-cancel-btn');
      cancelBtn.addEventListener('click', () => {
        haptic.selection();
        this.close();
        if (typeof onCancel === 'function') onCancel();
      });
    }

    // Dismiss on clicking overlay background
    if (barrierDismissible) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          this.close();
          if (typeof onCancel === 'function') onCancel();
        }
      });
    }
  }

  static close() {
    if (this.activeModal) {
      const modal = this.activeModal;
      this.activeModal = null;
      
      modal.classList.add('modal-fade-out'); // Can add fade-out anim
      modal.remove();
    }
  }
}
