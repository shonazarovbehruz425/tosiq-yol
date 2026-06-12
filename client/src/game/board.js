import { haptic } from '../core/telegram.js';

export class BoardRenderer {
  constructor(containerElement, engine, callbacks = {}) {
    this.container = containerElement;
    this.engine = engine;
    this.onMovePawn = callbacks.onMovePawn || (() => {});
    this.onPlaceWall = callbacks.onPlaceWall || (() => {});
    
    this.selectedWallType = 'H'; // 'H' or 'V'
    this.previewWall = null;

    // Drag-and-drop state
    this.dragging = false;
    this.dragType = null;
    this.dragGhost = null;
    this.dragTargetSlot = null; // { r, c, valid }
    this._dragMove = null;
    this._dragUp = null;
    this.canDragWall = callbacks.canDragWall || (() => true);
    
    this.cellElements = {}; // key: 'r,c' -> div
    this.pawnElements = [null, null];
    
    this.initBoard();
  }

  setWallType(type) {
    this.selectedWallType = type;
    this.clearWallPreviews();
  }

  // Initialize DOM grid structure
  initBoard() {
    this.container.innerHTML = '';
    
    const boardDiv = document.createElement('div');
    boardDiv.className = 'board';
    
    const N = this.engine.boardSize;
    const gridDim = N * 2 - 1; // 17 for 9x9, 13 for 7x7

    // Wall gaps are thinner on bigger boards so the cells stay large enough to
    // tap comfortably (11x11 / 13x13 otherwise get tiny cells).
    if (N >= 13) boardDiv.classList.add('gap-xs');
    else if (N >= 11) boardDiv.classList.add('gap-sm');

    // Set up grid rows & columns dynamically
    const gridStyles = [];
    for (let i = 0; i < N; i++) {
      gridStyles.push('1fr');
      if (i < N - 1) gridStyles.push('var(--wall-gap, 10px)'); // responsive wall gap
    }
    
    boardDiv.style.gridTemplateColumns = gridStyles.join(' ');
    boardDiv.style.gridTemplateRows = gridStyles.join(' ');
    
    this.cellElements = {};
    
    // 1. Render Cells
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.style.gridRow = `${r * 2 + 1}`;
        cell.style.gridColumn = `${c * 2 + 1}`;
        cell.dataset.r = r;
        cell.dataset.c = c;
        
        // Add goal line colors (mode-aware)
        if (this.engine.mode === 'race') {
          // Race: both race UP. Top row = shared finish line, bottom = start.
          if (r === 0) {
            const indicator = document.createElement('div');
            indicator.className = 'goal-line-finish';
            cell.appendChild(indicator);
          }
          if (r === N - 1) {
            const indicator = document.createElement('div');
            indicator.className = 'goal-line-start';
            cell.appendChild(indicator);
          }
        } else {
          // Duel: Red goal at top (row 0), Blue goal at bottom.
          if (r === 0) {
            const indicator = document.createElement('div');
            indicator.className = 'goal-line-red';
            cell.appendChild(indicator);
          }
          if (r === N - 1) {
            const indicator = document.createElement('div');
            indicator.className = 'goal-line-blue';
            cell.appendChild(indicator);
          }
        }

        cell.addEventListener('click', () => {
          if (cell.classList.contains('valid-move')) {
            this.onMovePawn(r, c);
          }
        });

        boardDiv.appendChild(cell);
        this.cellElements[`${r},${c}`] = cell;
      }
    }

    // 2. Render invisible wall slots in gaps.
    // Placement is done via drag-and-drop from the tray, so these are passive
    // markers only (no hover/click preview that could get "stuck" on touch).
    for (let r = 0; r < N - 1; r++) {
      for (let c = 0; c < N - 1; c++) {
        // Horizontal slot
        const hHandler = document.createElement('div');
        hHandler.className = 'wall-slot';
        hHandler.style.gridRow = `${r * 2 + 2}`;
        hHandler.style.gridColumn = `${c * 2 + 1} / span 3`;

        // Vertical slot
        const vHandler = document.createElement('div');
        vHandler.className = 'wall-slot';
        vHandler.style.gridRow = `${r * 2 + 1} / span 3`;
        vHandler.style.gridColumn = `${c * 2 + 2}`;

        boardDiv.appendChild(hHandler);
        boardDiv.appendChild(vHandler);
      }
    }

    this.container.appendChild(boardDiv);
    this.boardDiv = boardDiv;
    
    // Draw initial positions
    this.updatePawns();
    this.updateValidMoves();
  }

  // Draw pawns on board
  updatePawns() {
    // Clear old pawns
    this.pawnElements.forEach(p => p?.remove());
    
    const colors = ['red', 'blue'];
    for (let i = 0; i < 2; i++) {
      const pos = this.engine.pawnPos[i];
      const cell = this.cellElements[`${pos.r},${pos.c}`];
      if (cell) {
        const pawn = document.createElement('div');
        pawn.className = `pawn pawn-${colors[i]}`;
        // Equipped team crest (if any) for this side.
        const skinId = this.pawnSkins && this.pawnSkins[i];
        if (skinId && this._crestSvg) {
          pawn.classList.add('pawn-skinned');
          pawn.innerHTML = this._crestSvg(skinId, 999); // size via CSS (100%)
        }
        cell.appendChild(pawn);
        this.pawnElements[i] = pawn;
      }
    }
  }

  // Draw valid moves for current player (if it's their turn)
  updateValidMoves(isMyTurn = true) {
    // Clear old moves
    Object.values(this.cellElements).forEach(cell => cell.classList.remove('valid-move'));

    if (!isMyTurn || this.engine.winner !== -1) return;

    // Fog of War: offer "blind" moves (all neighbours, walls hidden) so the
    // player must explore and may bump into hidden walls.
    if (this.fogMode) {
      const moves = this.engine.getBlindMoves(this.engine.currentPlayer);
      moves.forEach(m => {
        const cell = this.cellElements[`${m.r},${m.c}`];
        if (cell) cell.classList.add('valid-move');
      });
      return;
    }

    const moves = this.engine.getValidMoves(this.engine.currentPlayer);
    moves.forEach(m => {
      const cell = this.cellElements[`${m.r},${m.c}`];
      if (cell) {
        cell.classList.add('valid-move');
      }
    });
  }

  // Draw placed walls
  drawWalls() {
    // Remove all existing permanent walls
    const boardDiv = this.container.querySelector('.board');
    boardDiv.querySelectorAll('.wall:not(.wall-preview)').forEach(w => w.remove());

    this.engine.walls.forEach(w => {
      const wallEl = document.createElement('div');
      const ownerColor = w.player === 0 ? 'red' : 'blue'; // Engine stores who placed it
      wallEl.className = `wall wall-${ownerColor || 'red'}`;
      // Remember which wall this element represents (used by Fog of War).
      wallEl._wall = w;

      if (w.type === 'H') {
        wallEl.style.gridRow = `${w.r * 2 + 2}`;
        wallEl.style.gridColumn = `${w.c * 2 + 1} / span 3`;
      } else {
        wallEl.style.gridRow = `${w.r * 2 + 1} / span 3`;
        wallEl.style.gridColumn = `${w.c * 2 + 2}`;
      }
      
      boardDiv.appendChild(wallEl);
    });

    // Re-apply any active fog filter so newly drawn walls respect visibility.
    if (this._wallVisibility) this.setWallVisibility(this._wallVisibility);
  }

  // Fog of War: hide walls for which `predicate(wall)` returns false.
  // Pass null to clear the filter and show everything.
  setWallVisibility(predicate) {
    this._wallVisibility = predicate || null;
    const boardDiv = this.container.querySelector('.board');
    if (!boardDiv) return;
    boardDiv.querySelectorAll('.wall:not(.wall-preview)').forEach(el => {
      if (!predicate || !el._wall) { el.classList.remove('wall-hidden'); return; }
      el.classList.toggle('wall-hidden', !predicate(el._wall));
    });
  }

  // Chaos: draw power-up tiles (teleport / ghost / hammer) on their cells.
  drawPowerups() {
    const boardDiv = this.container.querySelector('.board');
    if (!boardDiv) return;
    boardDiv.querySelectorAll('.powerup').forEach(el => el.remove());

    const icons = {
      teleport: '<path d="M12 2v6m0 8v6M4 8l4 4-4 4M20 8l-4 4 4 4"/>',
      ghost: '<path d="M5 21V9a7 7 0 0 1 14 0v12l-2-2-2 2-2-2-2 2-2-2-2 2z"/><circle cx="9.5" cy="10" r="1" fill="currentColor" stroke="none"/><circle cx="14.5" cy="10" r="1" fill="currentColor" stroke="none"/>',
      hammer: '<path d="M14 7l5 5M3 21l9-9M14.5 5.5l4 4 2-2-4-4z"/>'
    };

    Object.entries(this.engine.powerups || {}).forEach(([key, type]) => {
      const cell = this.cellElements[key];
      if (!cell) return;
      const el = document.createElement('div');
      el.className = `powerup powerup-${type}`;
      el.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icons[type] || ''}</svg>`;
      cell.appendChild(el);
    });
  }

  // Hover wall preview (legacy mouse hover) — kept minimal; drag uses renderPreviewAt
  clearWallPreviews() {
    if (this.previewWall) {
      this.previewWall.remove();
      this.previewWall = null;
    }
  }

  // ===== Drag & Drop wall placement =====

  // Start dragging a wall of a given type from a tray chip.
  // `startEvent` is a pointerdown event from the tray chip element.
  startWallDrag(type, startEvent, sourceEl = null) {
    if (!this.canDragWall()) return;
    if (this.engine.winner !== -1) return;

    startEvent.preventDefault();

    this.dragging = true;
    this.dragType = type;
    this.selectedWallType = type;
    this.dragTargetSlot = null;
    this.dragSourceEl = sourceEl;
    if (sourceEl) sourceEl.classList.add('wall-chip-dragging');

    haptic.impact('light');

    // Create a floating ghost that follows the finger/cursor
    const ghost = document.createElement('div');
    const activeColor = this.engine.currentPlayer === 0 ? 'red' : 'blue';
    ghost.className = `wall-drag-ghost wall-${activeColor} ${type === 'H' ? 'ghost-h' : 'ghost-v'}`;
    document.body.appendChild(ghost);
    this.dragGhost = ghost;

    this.moveGhost(startEvent.clientX, startEvent.clientY);

    this._dragMove = (e) => this.onDragMove(e);
    this._dragUp = (e) => this.onDragEnd(e);

    window.addEventListener('pointermove', this._dragMove, { passive: false });
    window.addEventListener('pointerup', this._dragUp);
    window.addEventListener('pointercancel', this._dragUp);
  }

  moveGhost(x, y) {
    if (this.dragGhost) {
      this.dragGhost.style.left = `${x}px`;
      this.dragGhost.style.top = `${y}px`;
    }
  }

  onDragMove(e) {
    if (!this.dragging) return;
    e.preventDefault();

    // Offset the snap point ABOVE the finger so the wall isn't hidden under it.
    const offsetY = this.fingerOffsetY();

    // Float the ghost above the finger too, so it matches the snap preview.
    this.moveGhost(e.clientX, e.clientY - offsetY);

    const slot = this.findNearestSlot(e.clientX, e.clientY - offsetY, this.dragType);

    // Haptic tick when the snapped target changes
    const prev = this.dragTargetSlot;
    if (slot && (!prev || prev.r !== slot.r || prev.c !== slot.c)) {
      haptic.selection();
    }
    this.dragTargetSlot = slot;

    // When snapped onto a slot, fade the finger ghost so the snapped preview stands out
    if (this.dragGhost) {
      this.dragGhost.style.opacity = slot ? '0.35' : '0.85';
    }

    this.clearWallPreviews();
    if (slot) {
      this.renderPreviewAt(slot.r, slot.c, this.dragType, slot.valid);
    }
  }

  // Vertical lift (px) applied to the pointer when locating the target slot,
  // so the placed wall appears clearly above the finger instead of under it.
  fingerOffsetY() {
    const cell = this.cellElements['0,0'];
    if (cell) {
      const h = cell.getBoundingClientRect().height;
      // Lift by ~1.6 cells, but never less than a comfortable fingertip height.
      if (h > 0) return Math.max(h * 1.6, 64);
    }
    return 64; // sensible fallback
  }

  onDragEnd() {
    if (!this.dragging) return;

    const slot = this.dragTargetSlot;

    // Clean up listeners and visuals
    window.removeEventListener('pointermove', this._dragMove);
    window.removeEventListener('pointerup', this._dragUp);
    window.removeEventListener('pointercancel', this._dragUp);
    this._dragMove = null;
    this._dragUp = null;

    if (this.dragGhost) {
      this.dragGhost.remove();
      this.dragGhost = null;
    }
    this.clearWallPreviews();

    if (this.dragSourceEl) {
      this.dragSourceEl.classList.remove('wall-chip-dragging');
      this.dragSourceEl = null;
    }

    const type = this.dragType;
    this.dragging = false;
    this.dragType = null;
    this.dragTargetSlot = null;

    // Drop onto a valid slot -> place wall
    if (slot && slot.valid) {
      this.onPlaceWall(slot.r, slot.c, type);
    } else if (slot) {
      // Dropped on an invalid slot
      haptic.notification('warning');
    }
  }

  // Convert a screen point to the nearest wall slot (r, c) for a given type.
  // Uses the real cell geometry (accounting for the gaps between cells) so the
  // snapped position matches what the player sees under their finger.
  findNearestSlot(clientX, clientY, type) {
    const N = this.engine.boardSize;
    if (!this.boardDiv) return null;

    const rect = this.boardDiv.getBoundingClientRect();
    const margin = 60;
    if (clientX < rect.left - margin || clientX > rect.right + margin ||
        clientY < rect.top - margin || clientY > rect.bottom + margin) {
      return null;
    }

    // Build the center coordinates of each cell row/column from real DOM rects.
    const colCenters = [];
    const rowCenters = [];
    for (let i = 0; i < N; i++) {
      const colCell = this.cellElements[`0,${i}`];
      const rowCell = this.cellElements[`${i},0`];
      if (colCell) {
        const cr = colCell.getBoundingClientRect();
        colCenters[i] = cr.left + cr.width / 2;
      }
      if (rowCell) {
        const rr = rowCell.getBoundingClientRect();
        rowCenters[i] = rr.top + rr.height / 2;
      }
    }

    // Fallback if rects are unavailable (e.g. not laid out yet)
    if (colCenters.some(v => v == null) || rowCenters.some(v => v == null) ||
        colCenters[0] === colCenters[N - 1]) {
      const fx = ((clientX - rect.left) / rect.width) * N;
      const fy = ((clientY - rect.top) / rect.height) * N;
      let r, c;
      if (type === 'H') { r = Math.round(fy) - 1; c = Math.floor(fx); }
      else { c = Math.round(fx) - 1; r = Math.floor(fy); }
      r = Math.max(0, Math.min(N - 2, r));
      c = Math.max(0, Math.min(N - 2, c));
      return { r, c, valid: this.engine.isValidWall(r, c, type) };
    }

    // The boundary line between index i and i+1 is the midpoint of their centers.
    const nearestBoundary = (centers, pos) => {
      let best = 0;
      let bestDist = Infinity;
      for (let i = 0; i < N - 1; i++) {
        const mid = (centers[i] + centers[i + 1]) / 2;
        const d = Math.abs(pos - mid);
        if (d < bestDist) { bestDist = d; best = i; }
      }
      return best; // gap index 0..N-2
    };
    // The 2-cell span anchor: which pair (i, i+1) the pos sits closest to.
    const nearestSpanStart = (centers, pos) => {
      let best = 0;
      let bestDist = Infinity;
      for (let i = 0; i < N - 1; i++) {
        const spanCenter = (centers[i] + centers[i + 1]) / 2;
        const d = Math.abs(pos - spanCenter);
        if (d < bestDist) { bestDist = d; best = i; }
      }
      return best; // 0..N-2
    };

    let r, c;
    if (type === 'H') {
      // Horizontal wall: lies on the row boundary, spans two columns
      r = nearestBoundary(rowCenters, clientY);
      c = nearestSpanStart(colCenters, clientX);
    } else {
      // Vertical wall: lies on the column boundary, spans two rows
      c = nearestBoundary(colCenters, clientX);
      r = nearestSpanStart(rowCenters, clientY);
    }

    r = Math.max(0, Math.min(N - 2, r));
    c = Math.max(0, Math.min(N - 2, c));

    const valid = this.engine.isValidWall(r, c, type);
    return { r, c, valid };
  }

  // Render a (possibly invalid) preview wall at a slot.
  renderPreviewAt(r, c, type, isValid) {
    const boardDiv = this.boardDiv;
    if (!boardDiv) return;

    const preview = document.createElement('div');
    const activeColor = this.engine.currentPlayer === 0 ? 'red' : 'blue';
    preview.className = `wall wall-preview wall-${activeColor} ${isValid ? '' : 'wall-invalid'}`;

    if (type === 'H') {
      preview.style.gridRow = `${r * 2 + 2}`;
      preview.style.gridColumn = `${c * 2 + 1} / span 3`;
    } else {
      preview.style.gridRow = `${r * 2 + 1} / span 3`;
      preview.style.gridColumn = `${c * 2 + 2}`;
    }

    boardDiv.appendChild(preview);
    this.previewWall = preview;
  }

  destroy() {
    if (this._dragMove) window.removeEventListener('pointermove', this._dragMove);
    if (this._dragUp) {
      window.removeEventListener('pointerup', this._dragUp);
      window.removeEventListener('pointercancel', this._dragUp);
    }
    if (this.dragGhost) this.dragGhost.remove();
  }
}
