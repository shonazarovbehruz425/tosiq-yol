import { snapGame } from './state.js';

export function adjBoxes(type, row, col) {
  return type === 'h'
    ? [[row - 1, col], [row, col]]
    : [[row, col - 1], [row, col]];
}

export function boxFull(br, bc, hL, vL) {
  return !!(hL[br][bc] && hL[br + 1][bc] && vL[br][bc] && vL[br][bc + 1]);
}

/**
 * Mutate G: place a line.
 * Returns { ok, done } — ok=false if the cell is already taken.
 */
export function makeMove(G, type, row, col) {
  if (G.over || G.aiOn) return { ok: false, done: 0 };
  if (type === 'h' && G.hL[row][col]) return { ok: false, done: 0 };
  if (type === 'v' && G.vL[row][col]) return { ok: false, done: 0 };

  G.history.push(snapGame(G));

  if (type === 'h') G.hL[row][col] = G.cur;
  else              G.vL[row][col] = G.cur;

  let done = 0;
  for (const [br, bc] of adjBoxes(type, row, col)) {
    if (br >= 0 && br < G.size && bc >= 0 && bc < G.size
        && boxFull(br, bc, G.hL, G.vL) && G.boxes[br][bc] === 0) {
      G.boxes[br][bc] = G.cur;
      G.scores[G.cur - 1]++;
      done++;
    }
  }
  G.moveCount++;
  if (G.scores[0] + G.scores[1] >= G.size * G.size) { G.over = true; return { ok: true, done }; }
  if (done === 0) G.cur = G.cur === 1 ? 2 : 1;
  return { ok: true, done };
}

/**
 * Apply an opponent's move (bypasses turn/aiOn guards).
 * Used for online play when the server relays the opponent's action.
 */
export function applyOpponentMove(G, type, row, col) {
  if (G.over) return { ok: false, done: 0 };
  if (type === 'h' && G.hL[row][col]) return { ok: false, done: 0 };
  if (type === 'v' && G.vL[row][col]) return { ok: false, done: 0 };

  G.history.push(snapGame(G));

  if (type === 'h') G.hL[row][col] = G.cur;
  else              G.vL[row][col] = G.cur;

  let done = 0;
  for (const [br, bc] of adjBoxes(type, row, col)) {
    if (br >= 0 && br < G.size && bc >= 0 && bc < G.size
        && boxFull(br, bc, G.hL, G.vL) && G.boxes[br][bc] === 0) {
      G.boxes[br][bc] = G.cur;
      G.scores[G.cur - 1]++;
      done++;
    }
  }
  G.moveCount++;
  if (G.scores[0] + G.scores[1] >= G.size * G.size) { G.over = true; return { ok: true, done }; }
  if (done === 0) G.cur = G.cur === 1 ? 2 : 1;
  return { ok: true, done };
}

/** Undo the last `count` moves. */
export function undoMove(G, count = 1) {
  if (!G.history.length || G.aiOn) return;
  const actual = Math.min(count, G.history.length);
  for (let i = 0; i < actual; i++) {
    const s = G.history.pop();
    G.hL = s.hL; G.vL = s.vL; G.boxes = s.boxes;
    G.scores = s.scores; G.cur = s.cur;
  }
  G.over = false;
}
