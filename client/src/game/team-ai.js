// Lightweight AI for 2v2 Team mode. Greedy 1-ply evaluation:
//  - advance toward own goal, and
//  - occasionally place a wall to slow the leading enemy.
// Kept simple/fast since 4 pawns on an 11x11 board make deep search costly.

export class TeamAI {
  constructor(player) {
    this.player = player;
  }

  getMove(engine) {
    const me = this.player;
    const myTeam = engine.team(me);

    // Candidate pawn moves.
    const pawnMoves = engine.getValidMoves(me).map(m => ({ type: 'move', r: m.r, c: m.c }));

    // Evaluate each pawn move by how much it shortens my path.
    let best = null;
    let bestScore = -Infinity;
    for (const mv of pawnMoves) {
      const sim = engine.clone();
      if (!sim.movePawn(mv.r, mv.c, me)) continue;
      const score = this.evaluate(sim, myTeam);
      if (score > bestScore) { bestScore = score; best = mv; }
    }

    // Sometimes try a blocking wall against the most advanced enemy.
    const teamWalls = engine.teamWallsLeft[myTeam];
    if (teamWalls > 0 && Math.random() < 0.35) {
      const wallMove = this.bestWall(engine, myTeam);
      if (wallMove) {
        const sim = engine.clone();
        if (sim.placeWall(wallMove.r, wallMove.c, wallMove.wallType, me)) {
          const score = this.evaluate(sim, myTeam) + 5; // small bias to disrupt
          if (score > bestScore) { bestScore = score; best = wallMove; }
        }
      }
    }

    return best || pawnMoves[0] || null;
  }

  // Higher is better for `myTeam`: our closest pawn near goal, enemies far.
  evaluate(engine, myTeam) {
    let myBest = 999, enemyBest = 999;
    for (const p of [0, 1, 2, 3]) {
      const d = engine.shortestPath(p);
      if (engine.team(p) === myTeam) myBest = Math.min(myBest, d);
      else enemyBest = Math.min(enemyBest, d);
    }
    if (myBest === 0) return 10000;
    if (enemyBest === 0) return -10000;
    return (enemyBest - myBest) * 10 - myBest;
  }

  // Find a wall that most increases the leading enemy's path.
  bestWall(engine, myTeam) {
    // Identify the most advanced enemy.
    let target = -1, targetDist = 999;
    for (const p of [0, 1, 2, 3]) {
      if (engine.team(p) === myTeam) continue;
      const d = engine.shortestPath(p);
      if (d < targetDist) { targetDist = d; target = p; }
    }
    if (target === -1) return null;

    const baseline = engine.shortestPath(target);
    const pos = engine.pawnPos[target];
    let best = null, bestGain = 0;

    // Only probe wall slots near the target pawn (keeps it fast).
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const r = pos.r + dr, c = pos.c + dc;
        for (const type of ['H', 'V']) {
          if (!engine.isValidWall(r, c, type)) continue;
          const sim = engine.clone();
          sim.walls.push({ r, c, type, team: myTeam });
          const after = sim.shortestPath(target);
          const gain = after - baseline;
          if (gain > bestGain) { bestGain = gain; best = { type: 'wall', r, c, wallType: type }; }
        }
      }
    }
    return bestGain > 0 ? best : null;
  }
}

export default TeamAI;
