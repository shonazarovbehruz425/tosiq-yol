// AI Engine for Quoridor (Easy, Normal, Hard)

// Opening book: strong first moves for 9x9 board (player index 0 = Red, goes first)
const OPENING_BOOK_9 = {
  '0': [
    { type: 'move', r: 7, c: 4 },
    { type: 'move', r: 7, c: 3 },
    { type: 'move', r: 7, c: 5 },
  ],
  '1': [
    { type: 'move', r: 1, c: 4 },
    { type: 'move', r: 1, c: 3 },
    { type: 'move', r: 1, c: 5 },
  ]
};

const OPENING_BOOK_7 = {
  '0': [
    { type: 'move', r: 5, c: 3 },
    { type: 'move', r: 5, c: 2 },
    { type: 'move', r: 5, c: 4 },
  ],
  '1': [
    { type: 'move', r: 1, c: 3 },
    { type: 'move', r: 1, c: 2 },
    { type: 'move', r: 1, c: 4 },
  ]
};

export class QuoridorAI {
  constructor(playerIndex) {
    this.playerIndex = playerIndex; // 0 = Red, 1 = Blue
    this.oppIndex = 1 - playerIndex;
    this.adaptivePatterns = [];
    this.avoidMoves = new Set();
  }

  setAdaptivePatterns(patterns) {
    this.adaptivePatterns = patterns || [];
    this.avoidMoves = new Set();
    for (const p of this.adaptivePatterns) {
      if (p.keyMoves && p.keyMoves.length > 0) {
        for (const km of p.keyMoves) {
          this.avoidMoves.add(`${km.r},${km.c},${km.wallType}`);
        }
      }
    }
  }

  // Get next best move depending on difficulty
  getMove(engine, difficulty = 'normal') {
    // Check opening book for first 2 moves
    if (engine.moveHistory.length < 2) {
      const book = engine.boardSize === 9 ? OPENING_BOOK_9 : OPENING_BOOK_7;
      const moves = book[String(this.playerIndex)];
      if (moves) {
        const validMoves = moves.filter(m => {
          if (m.type === 'move') {
            return engine.getValidMoves(this.playerIndex).some(v => v.r === m.r && v.c === m.c);
          }
          return false;
        });
        if (validMoves.length > 0) {
          return validMoves[Math.floor(Math.random() * validMoves.length)];
        }
      }
    }

    if (difficulty === 'easy') {
      return this.getRandomMove(engine);
    } else if (difficulty === 'normal') {
      return this.getBestMoveDepth1(engine);
    } else if (difficulty === 'hard') {
      // Hard: iterative-deepening to depth 3 with the SMART evaluation, so it
      // already reads the opponent's plan instead of just racing. No weakening
      // random shuffle — it plays its best move every time.
      return this.getBestMoveTimed(engine, { maxDepth: 3, timeMs: 1200, advanced: true });
    } else if (difficulty === 'master') {
      // Master: a full ply deeper than Hard (depth 4) — sees wall combinations.
      return this.getBestMoveTimed(engine, { maxDepth: 4, timeMs: 2500, advanced: true });
    } else if (difficulty === 'grandmaster') {
      // Grandmaster: depth 5 search — plans several moves ahead, near-optimal.
      return this.getBestMoveTimed(engine, { maxDepth: 5, timeMs: 4500, advanced: true });
    }
    // Fallback
    return this.getBestMoveMinimax(engine, 2);
  }

  // ---- Iterative deepening with a time budget --------------------------------
  // Searches progressively deeper (2,3,4,...) until the time budget runs out,
  // always keeping the best move from the last fully-completed depth. Combined
  // with move ordering this lets the bot play much deeper, hence much stronger.
  getBestMoveTimed(engine, { maxDepth, timeMs, advanced }) {
    this.advancedEval = advanced;
    this.deadline = Date.now() + timeMs;
    this.aborted = false;

    // Guaranteed-valid fallback so we never return null.
    let bestMove = this.getBestMoveDepth1(engine);

    for (let depth = 2; depth <= maxDepth; depth++) {
      const result = this.searchRoot(engine, depth);
      if (this.aborted) break;        // ran out of time mid-search → discard
      if (result) bestMove = result;  // completed this depth → adopt it
    }
    return bestMove;
  }

  searchRoot(engine, depth) {
    // The root always sees the FULL candidate set (every sensible wall) so the
    // bot never overlooks a key move. Deeper nodes prune walls tightly.
    this.tightSearch = false;
    const candidates = this.orderCandidates(engine, this.generateCandidates(engine));
    this.tightSearch = depth >= 3;

    let bestScore = -Infinity;
    let bestMove = null;
    let alpha = -Infinity;
    const beta = Infinity;

    for (const move of candidates) {
      if (this.timeUp()) { this.aborted = true; return bestMove; }
      const sim = engine.clone();
      const success = move.type === 'move'
        ? sim.movePawn(move.r, move.c, this.playerIndex)
        : sim.placeWall(move.r, move.c, move.wallType, this.playerIndex);
      if (!success) continue;

      const score = this.minimax(sim, depth - 1, alpha, beta, false);
      if (this.aborted) return bestMove;
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
      alpha = Math.max(alpha, score);
    }
    return bestMove;
  }

  timeUp() {
    return this.deadline && Date.now() > this.deadline;
  }

  // Cheap move ordering to maximise alpha-beta pruning: advance the pawn toward
  // the goal first, then walls. Better ordering = far fewer nodes searched.
  orderCandidates(engine, candidates) {
    const myTurn = engine.currentPlayer === this.playerIndex;
    const player = myTurn ? this.playerIndex : this.oppIndex;
    const goal = engine.goalRow(player);
    return candidates
      .map(m => {
        let priority;
        if (m.type === 'move') {
          priority = 1000 - Math.abs(m.r - goal) * 10;
        } else if (m.onOppPath) {
          priority = 500;
        } else {
          priority = 0;
        }
        if (m.avoided) priority = -100;
        return { m, priority };
      })
      .sort((a, b) => b.priority - a.priority)
      .map(x => x.m);
  }

  // BFS to find shortest path length
  getShortestPathLength(engine, player) {
    const start = engine.pawnPos[player];
    const targetRow = engine.goalRow(player);
    
    const visited = Array.from({ length: engine.boardSize }, () => Array(engine.boardSize).fill(false));
    // store nodes as { r, c, dist }
    const queue = [{ r: start.r, c: start.c, dist: 0 }];
    visited[start.r][start.c] = true;

    const dirs = [
      { dr: -1, dc: 0 },
      { dr: 1, dc: 0 },
      { dr: 0, dc: -1 },
      { dr: 0, dc: 1 }
    ];

    let head = 0;
    while (head < queue.length) {
      const current = queue[head++];
      
      if (current.r === targetRow) {
        return current.dist;
      }

      for (const d of dirs) {
        const nr = current.r + d.dr;
        const nc = current.c + d.dc;

        if (nr >= 0 && nr < engine.boardSize && nc >= 0 && nc < engine.boardSize) {
          if (!visited[nr][nc]) {
            if (!engine.isWallBlocking(current.r, current.c, nr, nc)) {
              visited[nr][nc] = true;
              queue.push({ r: nr, c: nc, dist: current.dist + 1 });
            }
          }
        }
      }
    }

    return 999; // Unreachable
  }

  // Helper to extract the actual shortest path cells (for wall placing heuristics)
  getShortestPath(engine, player) {
    const start = engine.pawnPos[player];
    const targetRow = engine.goalRow(player);
    
    const visited = Array.from({ length: engine.boardSize }, () => Array(engine.boardSize).fill(false));
    const parentMap = {}; // key: 'r,c' -> 'pr,pc'
    const queue = [start];
    visited[start.r][start.c] = true;

    const dirs = [
      { dr: -1, dc: 0 },
      { dr: 1, dc: 0 },
      { dr: 0, dc: -1 },
      { dr: 0, dc: 1 }
    ];

    let head = 0;
    let foundNode = null;

    while (head < queue.length) {
      const current = queue[head++];
      
      if (current.r === targetRow) {
        foundNode = current;
        break;
      }

      for (const d of dirs) {
        const nr = current.r + d.dr;
        const nc = current.c + d.dc;

        if (nr >= 0 && nr < engine.boardSize && nc >= 0 && nc < engine.boardSize) {
          if (!visited[nr][nc]) {
            if (!engine.isWallBlocking(current.r, current.c, nr, nc)) {
              visited[nr][nc] = true;
              parentMap[`${nr},${nc}`] = current;
              queue.push({ r: nr, c: nc });
            }
          }
        }
      }
    }

    if (!foundNode) return [];

    const path = [];
    let curr = foundNode;
    while (curr) {
      path.push(curr);
      curr = parentMap[`${curr.r},${curr.c}`];
    }
    return path.reverse();
  }

  // Easy mode: Random legal moves
  getRandomMove(engine) {
    const pawnMoves = engine.getValidMoves(this.playerIndex);
    const moves = pawnMoves.map(m => ({ type: 'move', r: m.r, c: m.c }));

    if (engine.playerWallsLeft[this.playerIndex] > 0) {
      // Scan for a few random wall placements
      const size = engine.boardSize - 1;
      for (let i = 0; i < 20; i++) {
        const r = Math.floor(Math.random() * size);
        const c = Math.floor(Math.random() * size);
        const type = Math.random() > 0.5 ? 'H' : 'V';
        if (engine.isValidWall(r, c, type)) {
          moves.push({ type: 'wall', r, c, wallType: type });
          // Limit search to not overload
          if (moves.length > pawnMoves.length + 5) break;
        }
      }
    }

    // Pick one at random
    return moves[Math.floor(Math.random() * moves.length)];
  }

  // Normal mode: Evaluate all possible moves at Depth 1
  getBestMoveDepth1(engine) {
    const candidates = this.generateCandidates(engine);
    let bestScore = -9999;
    let bestMove = null;

    candidates.forEach(move => {
      const sim = engine.clone();
      let success = false;
      if (move.type === 'move') {
        success = sim.movePawn(move.r, move.c, this.playerIndex);
      } else {
        success = sim.placeWall(move.r, move.c, move.wallType, this.playerIndex);
      }

      if (success) {
        const score = this.evaluateState(sim);
        if (score > bestScore) {
          bestScore = score;
          bestMove = move;
        }
      }
    });

    return bestMove || this.getRandomMove(engine);
  }

  // Hard mode: Minimax with Alpha-Beta. `advanced` enables the deeper heuristic.
  getBestMoveMinimax(engine, depth, advanced = false) {
    this.advancedEval = advanced;
    this.deadline = null;   // no time budget for the fixed-depth path
    this.aborted = false;
    // The ROOT always evaluates the full candidate set (all sensible walls) so
    // the bot never overlooks a strong move. Tight pruning is only applied
    // deeper in the recursion to keep the branching factor manageable.
    this.tightSearch = false;
    const candidates = this.generateCandidates(engine);
    // Deep searches (depth >= 3) prune the inner wall candidate set aggressively.
    this.tightSearch = depth >= 3;
    let bestScore = -Infinity;
    let bestMove = null;

    // Shuffle candidates slightly to add variety to bot play.
    // Stronger bots (advanced) shuffle less to play more sharply.
    if (!advanced) {
      candidates.sort(() => Math.random() - 0.5);
    }

    candidates.forEach(move => {
      const sim = engine.clone();
      let success = false;
      if (move.type === 'move') {
        success = sim.movePawn(move.r, move.c, this.playerIndex);
      } else {
        success = sim.placeWall(move.r, move.c, move.wallType, this.playerIndex);
      }

      if (success) {
        // Opponent's turn next in Minimax
        const score = this.minimax(sim, depth - 1, -Infinity, Infinity, false);
        if (score > bestScore) {
          bestScore = score;
          bestMove = move;
        }
      }
    });

    return bestMove || this.getBestMoveDepth1(engine);
  }

  minimax(engine, depth, alpha, beta, isMaximizing) {
    // Check terminal state
    if (engine.winner === this.playerIndex) return 1000 + depth; // Win quicker is better
    if (engine.winner === this.oppIndex) return -1000 - depth; // Lose slower is better
    if (depth === 0) {
      return this.evaluateState(engine);
    }

    // Time-budget abort: bail out of the deep search if we've run out of time.
    if (this.timeUp()) { this.aborted = true; return this.evaluateState(engine); }

    const candidates = this.orderCandidates(engine, this.generateCandidates(engine));
    
    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const move of candidates) {
        const sim = engine.clone();
        const success = move.type === 'move' 
          ? sim.movePawn(move.r, move.c, this.playerIndex) 
          : sim.placeWall(move.r, move.c, move.wallType, this.playerIndex);
        
        if (!success) continue;

        const evaluation = this.minimax(sim, depth - 1, alpha, beta, false);
        if (this.aborted) return maxEval === -Infinity ? evaluation : maxEval;
        maxEval = Math.max(maxEval, evaluation);
        alpha = Math.max(alpha, evaluation);
        if (beta <= alpha) break; // Pruning
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const move of candidates) {
        const sim = engine.clone();
        const success = move.type === 'move'
          ? sim.movePawn(move.r, move.c, this.oppIndex)
          : sim.placeWall(move.r, move.c, move.wallType, this.oppIndex);
          
        if (!success) continue;

        const evaluation = this.minimax(sim, depth - 1, alpha, beta, true);
        if (this.aborted) return minEval === Infinity ? evaluation : minEval;
        minEval = Math.min(minEval, evaluation);
        beta = Math.min(beta, evaluation);
        if (beta <= alpha) break; // Pruning
      }
      return minEval;
    }
  }

  // Generate intelligent candidate moves (critical to keep search space small)
  generateCandidates(engine) {
    const myTurn = engine.currentPlayer === this.playerIndex;
    const player = myTurn ? this.playerIndex : this.oppIndex;
    const opp = 1 - player;

    const candidates = [];
    
    // 1. Always consider all legal pawn moves (high priority)
    const pawnMoves = engine.getValidMoves(player);
    pawnMoves.forEach(m => {
      candidates.push({ type: 'move', r: m.r, c: m.c });
    });

    // 2. Consider wall placements only if walls are available
    if (engine.playerWallsLeft[player] > 0) {
      // HEURISTIC: Only place walls adjacent to the shortest paths of both players
      // Evaluating all 128 locations is too slow. Only look at gaps that block their paths!
      const myPath = this.getShortestPath(engine, player);
      const oppPath = this.getShortestPath(engine, opp);
      
      const pathSet = new Set();
      // Cells on the opponent's path → walls here are the impactful blocking moves.
      const oppPathSet = new Set();
      oppPath.forEach(cell => oppPathSet.add(`${cell.r},${cell.c}`));
      
      // Add path cells
      myPath.forEach(cell => pathSet.add(`${cell.r},${cell.c}`));
      oppPath.forEach(cell => pathSet.add(`${cell.r},${cell.c}`));

      // In tight (deep) search we ONLY look at walls on the players' shortest
      // paths to keep the branching factor manageable. Shallow searches also
      // scan the cells surrounding both pawns for more thorough wall play.
      if (!this.tightSearch) {
        const myPos = engine.pawnPos[player];
        const oppPos = engine.pawnPos[opp];

        for (let r = -2; r <= 2; r++) {
          for (let c = -2; c <= 2; c++) {
            const nr = myPos.r + r;
            const nc = myPos.c + c;
            if (nr >= 0 && nr < engine.boardSize - 1 && nc >= 0 && nc < engine.boardSize - 1) {
              pathSet.add(`${nr},${nc}`);
            }
            const onr = oppPos.r + r;
            const onc = oppPos.c + c;
            if (onr >= 0 && onr < engine.boardSize - 1 && onc >= 0 && onc < engine.boardSize - 1) {
              pathSet.add(`${onr},${onc}`);
            }
          }
        }
      }

      // Convert set to coordinates and check horizontal/vertical options
      const size = engine.boardSize - 1;
      pathSet.forEach(key => {
        const [r, c] = key.split(',').map(Number);
        if (r >= 0 && r < size && c >= 0 && c < size) {
          const onOppPath = oppPathSet.has(key);
          // In tight (deep) search, only keep the FORCING walls — those that sit
          // on the opponent's shortest path. Everything else explodes the tree.
          if (this.tightSearch && !onOppPath) return;
          if (engine.isValidWall(r, c, 'H')) {
            const avoided = this.avoidMoves.has(`${r},${c},H`);
            candidates.push({ type: 'wall', r, c, wallType: 'H', onOppPath, avoided });
          }
          if (engine.isValidWall(r, c, 'V')) {
            const avoided = this.avoidMoves.has(`${r},${c},V`);
            candidates.push({ type: 'wall', r, c, wallType: 'V', onOppPath, avoided });
          }
        }
      });
    }

    return candidates;
  }

  // Evaluation function for static board state (heuristic)
  evaluateState(engine) {
    const myPathLen = this.getShortestPathLength(engine, this.playerIndex);
    const oppPathLen = this.getShortestPathLength(engine, this.oppIndex);

    // Win/loss states
    if (myPathLen === 0) return 9999;
    if (oppPathLen === 0) return -9999;

    // Base heuristic:
    const pathScore = (oppPathLen - myPathLen) * 100;
    const wallScore = (engine.playerWallsLeft[this.playerIndex] - engine.playerWallsLeft[this.oppIndex]) * 15;

    const myRow = engine.pawnPos[this.playerIndex].r;
    const goal = engine.goalRow(this.playerIndex);
    const progressScore = (engine.boardSize - 1 - Math.abs(myRow - goal)) * 5;

    let score = pathScore + wallScore + progressScore;

    // Advanced heuristic (Master/Grandmaster): reward tempo, value walls
    // dynamically, prefer central control, and play sharper around the goals.
    if (this.advancedEval) {
      const diff = oppPathLen - myPathLen;

      // Tempo: amplify the race difference, with a turn-to-move bonus.
      score += diff * 35;
      const sideToMove = engine.currentPlayer === this.playerIndex ? 1 : -1;
      score += sideToMove * 6;

      // Wall advantage matters more when paths are close (tight games),
      // and is nearly worthless once the race is clearly decided.
      const wallDelta = engine.playerWallsLeft[this.playerIndex] - engine.playerWallsLeft[this.oppIndex];
      if (Math.abs(diff) <= 2) score += wallDelta * 22;
      else score += wallDelta * 8;

      // Hoarding caution: keep at least a couple of walls for defence early on.
      if (engine.playerWallsLeft[this.playerIndex] === 0 && diff <= 1) score -= 25;

      // Central column control (more mobility / jump options).
      const mid = Math.floor(engine.boardSize / 2);
      const myCol = engine.pawnPos[this.playerIndex].c;
      score += (mid - Math.abs(myCol - mid)) * 4;

      // Endgame sharpness: react strongly when either pawn is near its goal.
      if (oppPathLen <= 3) score -= (4 - oppPathLen) * 45;
      if (myPathLen <= 3) score += (4 - myPathLen) * 45;

      // Wall synergy — bonus for walls that work together (adjacent/nearby)
      const myWalls = engine.walls.filter(w => w.player === this.playerIndex);
      if (myWalls.length >= 2) {
        for (let i = 0; i < myWalls.length; i++) {
          for (let j = i + 1; j < myWalls.length; j++) {
            const w1 = myWalls[i], w2 = myWalls[j];
            const dist = Math.abs(w1.r - w2.r) + Math.abs(w1.c - w2.c);
            if (dist <= 2 && w1.type === w2.type) score += 8;
          }
        }
      }

      // Opponent wall count danger — if opponent has many walls left in endgame, be cautious
      if (engine.playerWallsLeft[this.oppIndex] >= 4 && myPathLen <= 4) {
        score -= 15;
      }

      // Pawn proximity pressure — if pawns are close, aggressive wall play is better
      const pawnDist = Math.abs(engine.pawnPos[this.playerIndex].r - engine.pawnPos[this.oppIndex].r) +
                       Math.abs(engine.pawnPos[this.playerIndex].c - engine.pawnPos[this.oppIndex].c);
      if (pawnDist <= 3) {
        const myWallsCount = myWalls.length;
        const oppWallsCount = engine.walls.filter(w => w.player === this.oppIndex).length;
        if (myWallsCount > oppWallsCount) score += 12;
      }
    }

    return score;
  }
}
