// Authoritative server-side Dots & Boxes engine.
//
// This mirrors the client logic in DotBox/src/game/state.js and
// DotBox/src/game/logic.js *exactly* so the server can validate every online
// move instead of blindly relaying it. Keeping the rules identical guarantees
// the server and both honest clients stay perfectly in sync: any move an
// honest client makes will always pass validation here, while out-of-turn,
// duplicate, or out-of-bounds moves from a tampered client are rejected.
//
// Board representation (size = number of boxes per side, default 4):
//   hL: (size+1) rows x size cols   — horizontal lines
//   vL: size rows x (size+1) cols   — vertical lines
//   boxes: size x size              — owner of each box (0 = none, 1 or 2)
//   cur: active player (1 or 2); completing a box grants another turn.

/** Create a fresh authoritative game object for an online room. */
export function createDotboxGame(size = 4) {
  const s = Number(size) || 4;
  return {
    size: s,
    hL: Array.from({ length: s + 1 }, () => Array(s).fill(0)),
    vL: Array.from({ length: s }, () => Array(s + 1).fill(0)),
    boxes: Array.from({ length: s }, () => Array(s).fill(0)),
    scores: [0, 0],
    cur: 1,
    over: false,
    moveCount: 0,
  };
}

function adjBoxes(type, row, col) {
  return type === "h"
    ? [
        [row - 1, col],
        [row, col],
      ]
    : [
        [row, col - 1],
        [row, col],
      ];
}

function boxFull(br, bc, hL, vL) {
  return !!(hL[br][bc] && hL[br + 1][bc] && vL[br][bc] && vL[br][bc + 1]);
}

// Bounds check for a line of the given type. Coordinates must be integers that
// land inside the correct grid dimensions for horizontal vs vertical lines.
function inBounds(g, type, row, col) {
  if (!Number.isInteger(row) || !Number.isInteger(col)) return false;
  if (type === "h") return row >= 0 && row <= g.size && col >= 0 && col < g.size;
  if (type === "v") return row >= 0 && row < g.size && col >= 0 && col <= g.size;
  return false;
}

/**
 * Attempt to apply a move made by `side` (1 or 2).
 * Returns { ok, reason?, done?, over? }.
 *   ok=false with a reason when the move is illegal (rejected, not applied).
 *   ok=true otherwise, with `done` = boxes completed and `over` = game ended.
 */
export function applyDotboxMove(g, side, type, row, col) {
  if (!g) return { ok: false, reason: "no_game" };
  if (g.over) return { ok: false, reason: "over" };
  if (side !== 1 && side !== 2) return { ok: false, reason: "bad_side" };
  if (side !== g.cur) return { ok: false, reason: "not_your_turn" };
  if (type !== "h" && type !== "v") return { ok: false, reason: "bad_type" };
  if (!inBounds(g, type, row, col)) return { ok: false, reason: "out_of_bounds" };
  if (type === "h" && g.hL[row][col]) return { ok: false, reason: "taken" };
  if (type === "v" && g.vL[row][col]) return { ok: false, reason: "taken" };

  if (type === "h") g.hL[row][col] = g.cur;
  else g.vL[row][col] = g.cur;

  let done = 0;
  for (const [br, bc] of adjBoxes(type, row, col)) {
    if (
      br >= 0 &&
      br < g.size &&
      bc >= 0 &&
      bc < g.size &&
      boxFull(br, bc, g.hL, g.vL) &&
      g.boxes[br][bc] === 0
    ) {
      g.boxes[br][bc] = g.cur;
      g.scores[g.cur - 1]++;
      done++;
    }
  }

  g.moveCount++;
  if (g.scores[0] + g.scores[1] >= g.size * g.size) {
    g.over = true;
    return { ok: true, done, over: true };
  }
  // Completing at least one box grants another turn; otherwise pass to opponent.
  if (done === 0) g.cur = g.cur === 1 ? 2 : 1;
  return { ok: true, done, over: false };
}
