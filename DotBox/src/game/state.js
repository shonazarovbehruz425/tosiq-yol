/** Create a fresh mutable game object. */
export function createGame(size = 4, mode = 'local', diff = 'easy') {
  return {
    size, mode, diff,
    hL:    Array.from({ length: size + 1 }, () => Array(size).fill(0)),
    vL:    Array.from({ length: size },     () => Array(size + 1).fill(0)),
    boxes: Array.from({ length: size },     () => Array(size).fill(0)),
    scores:   [0, 0],
    cur:      1,       // active player: 1 or 2
    over:     false,
    history:  [],      // array of snapshots for undo
    aiOn:     false,
    moveCount:0,
  };
}

/** Shallow-copy state for undo history. */
export function snapGame(g) {
  return {
    hL:     g.hL.map(r => [...r]),
    vL:     g.vL.map(r => [...r]),
    boxes:  g.boxes.map(r => [...r]),
    scores: [...g.scores],
    cur:    g.cur,
  };
}
