import { adjBoxes, boxFull } from './logic.js';

function allMoves(s) {
  const mv = [];
  for (let r = 0; r <= s.size; r++) for (let c = 0; c < s.size; c++) if (!s.hL[r][c]) mv.push({ t:'h',r,c });
  for (let r = 0; r < s.size; r++) for (let c = 0; c <= s.size; c++) if (!s.vL[r][c]) mv.push({ t:'v',r,c });
  return mv;
}

function simMove(s, mv) {
  const ns = {
    size: s.size,
    hL:   s.hL.map(r => [...r]),
    vL:   s.vL.map(r => [...r]),
    boxes:s.boxes.map(r => [...r]),
    scores:[...s.scores], cur:s.cur,
  };
  if (mv.t === 'h') ns.hL[mv.r][mv.c] = ns.cur;
  else              ns.vL[mv.r][mv.c] = ns.cur;
  let done = 0;
  for (const [br, bc] of adjBoxes(mv.t, mv.r, mv.c)) {
    if (br >= 0 && br < ns.size && bc >= 0 && bc < ns.size
        && boxFull(br, bc, ns.hL, ns.vL) && ns.boxes[br][bc] === 0) {
      ns.boxes[br][bc] = ns.cur; ns.scores[ns.cur - 1]++; done++;
    }
  }
  if (done === 0) ns.cur = ns.cur === 1 ? 2 : 1;
  return { ns, done };
}

function sideCount(br, bc, s) {
  return (s.hL[br][bc]?1:0)+(s.hL[br+1][bc]?1:0)+(s.vL[br][bc]?1:0)+(s.vL[br][bc+1]?1:0);
}

export function pickAI(G) {
  const st = {
    size: G.size,
    hL:   G.hL.map(r => [...r]),
    vL:   G.vL.map(r => [...r]),
    boxes:G.boxes.map(r => [...r]),
    scores:[...G.scores], cur:G.cur,
  };
  const mvs = allMoves(st);
  if (!mvs.length) return null;
  if (G.diff === 'easy') return mvs[Math.random() * mvs.length | 0];

  const comp = mvs.filter(m => simMove(st, m).done > 0);
  if (comp.length) return comp[Math.random() * comp.length | 0];
  if (G.diff === 'medium') return mvs[Math.random() * mvs.length | 0];

  // Hard: avoid leaving 3-sided boxes
  const safe = mvs.filter(m => {
    const { ns } = simMove(st, m);
    for (const [br, bc] of adjBoxes(m.t, m.r, m.c)) {
      if (br >= 0 && br < ns.size && bc >= 0 && bc < ns.size
          && sideCount(br, bc, ns) === 3 && ns.boxes[br][bc] === 0) return false;
    }
    return true;
  });
  const pool = safe.length ? safe : mvs;
  return pool[Math.random() * pool.length | 0];
}
