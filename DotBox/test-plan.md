# DotBox React build — Test Plan

Target: `http://localhost:4173/` (vite **preview of the rebuilt `dist`** — exactly what ships via `client/scripts/copy-dotbox.js`).

## What changed (PR #1)
- Added missing `src/audio/sounds.js` and `src/ws/client.js` (build was failing → app never loaded).
- `GameScreen.jsx`: `require(...)` → top-level `import` for `playReaction` (reaction sounds).
- `GameBoard.jsx`: renamed local `onMove` → `onPointerMove` (it shadowed the move-submit prop, so drawn lines never registered).

## Code paths informing the plan
- Menu entry: `src/screens/MenuScreen.jsx` (size/mode pills, "Do'st"/"Bot" options).
- Move submit on drag end: `src/components/GameBoard.jsx:158-176` `onEnd` calls the **prop** `onMove('h'|'v', r, c)`; drag starts on a dot, needs move >9px then release ≥0.36·CELL.
- Reaction buttons: `src/screens/GameScreen.jsx:62-69` call `playReaction(key)`.
- Box completion + score: `src/game/logic.js:27-37` increments `scores`, keeps turn on box completion.
- Result screen: shown when `g.over` after `scores[0]+scores[1] >= size*size` (`App.jsx:100-105`).

## Tests (primary flow = bot game on smallest board so a full game is quick)

### T1 — App loads (proves build is fixed)
- Action: open `http://localhost:4173/`.
- PASS: DotBox menu renders (title + size/mode pills visible), no blank screen.
- FAIL: blank page / console module-resolution error.

### T2 — Start a local 2-player ("Do'st") game on 3×3
- Action: pick the smallest grid + "Do'st" (local) so I control both turns.
- PASS: Game screen shows scoreboard (both 0), turn bar "Sizning navbatingiz", dotted grid.

### T3 — Draw a line by dragging (proves onMove shadow fix)
- Action: drag from one dot to an adjacent dot.
- PASS: a solid colored line appears between those two dots AND the active-player pip/turn switches (cur 1→2). This is the key adversarial check: if the `onMove` shadow bug were present, the drag would NOT register — no line, no turn change.
- FAIL: no line drawn / turn does not change.

### T4 — Complete a box → score increments and turn stays
- Action: draw the 4th side of a box.
- PASS: box fills with player color, that player's score goes 0→1, and it remains the SAME player's turn (per logic.js rule).
- FAIL: score stays 0 or turn flips despite completing a box.

### T5 — Reaction button plays without error (proves require→import fix)
- Action: click a reaction emoji button (e.g. 🔥).
- PASS: no JS error in console (the old `require()` would throw `require is not defined`, caught silently but proving sound never fired). I will confirm `playReaction`/`unlockAudio` exist on the loaded bundle and that clicking throws no error.
- NOTE: audio output itself isn't audible in headless capture; verify via no-error + function presence.

### T6 — Undo (regression)
- Action: click "Bekor".
- PASS: last line removed, score/turn revert.

### T7 — Finish game → Result screen (regression)
- Action: complete all boxes on the 3×3.
- PASS: Result screen appears with final scores and a play-again/menu option.

## Not tested (documented constraint)
- **Online mode**: requires Telegram `initData` + authenticated WebSocket (`ws/client.js` → server `/ws` auth). No Telegram context locally → cannot match a real opponent. Will mark **untested** and note it relies on the new `ws/client.js` which is exercised only by online play.
