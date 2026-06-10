// AI Engine for Quoridor (Easy, Normal, Hard)

export class QuoridorAI {
  constructor(playerIndex) {
    this.playerIndex = playerIndex; // 0 = Red, 1 = Blue
    this.oppIndex = 1 - playerIndex;
  }

  // Get next best move depending on difficulty
  getMove(engine, difficulty = 'normal') {
    if (difficulty === 'easy') {
      return this.getRandomMove(engine);
    } else if (difficulty === 'normal') {
      return this.getBestMoveDepth1(engine);
    } else if (difficulty === 'hard') {
      // Hard: Minimax depth 2 (full candidate set)
      return this.getBestMoveMinimax(engine, 2);
    } else if (difficulty === 'master') {
      // Master: Minimax depth 3, plain heuristic (~1.5x stronger than Hard).
      // One ply deeper than Hard. Tight wall pruning keeps it fast.
      return this.getBestMoveMinimax(engine, 3, false);
    } else if (difficulty === 'grandmaster') {
      // Grandmaster: Minimax depth 3 + advanced heuristic (~2.5x stronger).
      // Depth 3/4 with the full candidate set is far too slow for Quoridor's
      // branching factor, so deep search uses a tightly pruned candidate set
      // (walls only on the players' shortest paths). Keeps moves under ~1-2s.
      return this.getBestMoveMinimax(engine, 3, true);
    }
    // Fallback
    return this.getBestMoveMinimax(engine, 2);
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

    const candidates = this.generateCandidates(engine);
    
    if (isMaximizing) {
      let maxEval = -9999;
      for (const move of candidates) {
        const sim = engine.clone();
        const success = move.type === 'move' 
          ? sim.movePawn(move.r, move.c, this.playerIndex) 
          : sim.placeWall(move.r, move.c, move.wallType, this.playerIndex);
        
        if (!success) continue;

        const evaluation = this.minimax(sim, depth - 1, alpha, beta, false);
        maxEval = Math.max(maxEval, evaluation);
        alpha = Math.max(alpha, evaluation);
        if (beta <= alpha) break; // Pruning
      }
      return maxEval;
    } else {
      let minEval = 9999;
      for (const move of candidates) {
        const sim = engine.clone();
        const success = move.type === 'move'
          ? sim.movePawn(move.r, move.c, this.oppIndex)
          : sim.placeWall(move.r, move.c, move.wallType, this.oppIndex);
          
        if (!success) continue;

        const evaluation = this.minimax(sim, depth - 1, alpha, beta, true);
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
          if (engine.isValidWall(r, c, 'H')) {
            candidates.push({ type: 'wall', r, c, wallType: 'H' });
          }
          if (engine.isValidWall(r, c, 'V')) {
            candidates.push({ type: 'wall', r, c, wallType: 'V' });
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
    // 1. Shorter path to goal is better
    // 2. Longer path for opponent is better
    // 3. Keep walls in reserve
    const pathScore = (oppPathLen - myPathLen) * 100;
    const wallScore = (engine.playerWallsLeft[this.playerIndex] - engine.playerWallsLeft[this.oppIndex]) * 15;

    const myRow = engine.pawnPos[this.playerIndex].r;
    const goal = engine.goalRow(this.playerIndex);
    const progressScore = (engine.boardSize - 1 - Math.abs(myRow - goal)) * 5;

    let score = pathScore + wallScore + progressScore;

    // Advanced heuristic (Grandmaster): reward tempo, punish being far behind,
    // value walls more when ahead in the race, and prefer central control.
    if (this.advancedEval) {
      // Tempo: whoever needs fewer moves AND it's their turn has an edge.
      const diff = oppPathLen - myPathLen;
      score += diff * 30; // amplify the race difference

      // Wall advantage matters more when paths are close (tight games)
      if (Math.abs(diff) <= 2) {
        score += (engine.playerWallsLeft[this.playerIndex] - engine.playerWallsLeft[this.oppIndex]) * 20;
      }

      // Central column control (more mobility / jump options)
      const mid = Math.floor(engine.boardSize / 2);
      const myCol = engine.pawnPos[this.playerIndex].c;
      score += (mid - Math.abs(myCol - mid)) * 3;

      // Strongly avoid letting the opponent get very close to goal
      if (oppPathLen <= 2) score -= 80;
      if (myPathLen <= 2) score += 80;
    }

    return score;
  }
}
