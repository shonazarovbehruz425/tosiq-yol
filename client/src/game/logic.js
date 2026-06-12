// Quoridor Game Engine Logic

export class QuoridorEngine {
  constructor(boardSize = 9, wallsCount = 10, mode = 'duel') {
    this.boardSize = boardSize; // 7 or 9
    this.wallsCount = wallsCount; // Initial walls per player
    this.mode = mode; // 'duel' or 'race'

    const mid = Math.floor(boardSize / 2);

    if (mode === 'race') {
      // Race: both pawns start at the BOTTOM (opposite columns) and both race UP to row 0.
      const leftCol = Math.max(0, mid - 2);
      const rightCol = Math.min(boardSize - 1, mid + 2);
      this.pawnPos = [
        { r: boardSize - 1, c: leftCol },  // Red
        { r: boardSize - 1, c: rightCol }  // Blue
      ];
    } else {
      // Duel (classic): opposite sides.
      this.pawnPos = [
        { r: boardSize - 1, c: mid }, // Red starting position (bottom)
        { r: 0, c: mid }              // Blue starting position (top)
      ];
    }
    
    this.playerWallsLeft = [wallsCount, wallsCount];
    
    // Walls representation:
    // array of { r, c, type } where r, c are from 0 to boardSize-2, type is 'H' or 'V'
    this.walls = [];
    
    this.currentPlayer = 0; // 0 or 1
    this.winner = -1; // -1, 0, or 1
    this.moveHistory = []; // list of moves for replay
  }

  // Goal row for a player given the current mode.
  // Duel: Red(0) -> row 0, Blue(1) -> last row.
  // Race: both players -> row 0 (top).
  goalRow(playerIndex) {
    if (this.mode === 'race') return 0;
    return playerIndex === 0 ? 0 : this.boardSize - 1;
  }

  // Clone engine state for AI simulation
  clone() {
    const copy = new QuoridorEngine(this.boardSize, this.wallsCount, this.mode);
    copy.pawnPos = [ { ...this.pawnPos[0] }, { ...this.pawnPos[1] } ];
    copy.playerWallsLeft = [ ...this.playerWallsLeft ];
    copy.walls = this.walls.map(w => ({ ...w }));
    copy.currentPlayer = this.currentPlayer;
    copy.winner = this.winner;
    copy.moveHistory = [ ...this.moveHistory ];
    return copy;
  }

  // Get valid pawn moves for playerIndex
  getValidMoves(playerIndex) {
    if (this.winner !== -1) return [];

    const myPos = this.pawnPos[playerIndex];
    const oppPos = this.pawnPos[1 - playerIndex];
    const moves = [];

    // Directions: Up, Down, Left, Right
    const dirs = [
      { dr: -1, dc: 0 }, // Up
      { dr: 1, dc: 0 },  // Down
      { dr: 0, dc: -1 }, // Left
      { dr: 0, dc: 1 }   // Right
    ];

    dirs.forEach(d => {
      const nr = myPos.r + d.dr;
      const nc = myPos.c + d.dc;

      // 1. Check if off board
      if (nr < 0 || nr >= this.boardSize || nc < 0 || nc >= this.boardSize) return;

      // 2. Check if there is a wall between myPos and (nr, nc)
      if (this.isWallBlocking(myPos.r, myPos.c, nr, nc)) return;

      // 3. Check if opponent is in the target cell (nr, nc)
      if (oppPos.r === nr && oppPos.c === nc) {
        // Jump logic
        const jumpR = nr + d.dr;
        const jumpC = nc + d.dc;

        const isJumpOffBoard = jumpR < 0 || jumpR >= this.boardSize || jumpC < 0 || jumpC >= this.boardSize;
        const isJumpBlocked = isJumpOffBoard || this.isWallBlocking(nr, nc, jumpR, jumpC);

        if (!isJumpBlocked) {
          // Can jump straight
          moves.push({ r: jumpR, c: jumpC });
        } else {
          // Cannot jump straight, try diagonal jumps (standard Quoridor rules)
          // Look left and right of the direction vector 'd'
          const diagonals = [];
          if (d.dr !== 0) { // Moving vertically, check chap/o'ng (dc = -1, dc = 1)
            diagonals.push({ dr: 0, dc: -1 });
            diagonals.push({ dr: 0, dc: 1 });
          } else { // Moving horizontally, check tepa/past (dr = -1, dr = 1)
            diagonals.push({ dr: -1, dc: 0 });
            diagonals.push({ dr: 1, dc: 0 });
          }

          diagonals.forEach(diag => {
            const diagR = oppPos.r + diag.dr;
            const diagC = oppPos.c + diag.dc;

            if (diagR >= 0 && diagR < this.boardSize && diagC >= 0 && diagC < this.boardSize) {
              if (!this.isWallBlocking(oppPos.r, oppPos.c, diagR, diagC)) {
                moves.push({ r: diagR, c: diagC });
              }
            }
          });
        }
      } else {
        // Simple move
        moves.push({ r: nr, c: nc });
      }
    });

    return moves;
  }

  // Fog of War: the cells a player MAY try to step into (all orthogonal
  // neighbours + the opponent's cell for a possible jump), ignoring walls.
  // Each entry is tagged with whether a wall actually blocks that step, so the
  // UI can offer "blind" moves and the caller can detect a bump.
  getBlindMoves(playerIndex) {
    if (this.winner !== -1) return [];
    const me = this.pawnPos[playerIndex];
    const opp = this.pawnPos[1 - playerIndex];
    const dirs = [
      { dr: -1, dc: 0 }, { dr: 1, dc: 0 },
      { dr: 0, dc: -1 }, { dr: 0, dc: 1 }
    ];
    const out = [];
    for (const d of dirs) {
      const nr = me.r + d.dr;
      const nc = me.c + d.dc;
      if (nr < 0 || nr >= this.boardSize || nc < 0 || nc >= this.boardSize) continue;
      const blocked = this.isWallBlocking(me.r, me.c, nr, nc);
      // Stepping onto the opponent isn't a normal move; skip (jump is rare).
      if (opp.r === nr && opp.c === nc) continue;
      out.push({ r: nr, c: nc, blocked });
    }
    return out;
  }

  // Apply a Fog-of-War blind move attempt. If a wall blocks it, the move fails
  // (turn is forfeited) and we report the bump so the wall can be revealed.
  // Returns { moved, bumped, wall } .
  tryBlindMove(r, c, playerIndex) {
    if (this.winner !== -1) return { moved: false, bumped: false };
    if (this.currentPlayer !== playerIndex) return { moved: false, bumped: false };
    const me = this.pawnPos[playerIndex];
    const isNeighbour = Math.abs(me.r - r) + Math.abs(me.c - c) === 1;
    if (!isNeighbour) return { moved: false, bumped: false };

    if (this.isWallBlocking(me.r, me.c, r, c)) {
      // Bumped into a hidden wall — forfeit the turn, reveal the wall.
      this.moveHistory.push({ player: playerIndex, type: 'bump', r, c });
      this.currentPlayer = 1 - this.currentPlayer;
      return { moved: false, bumped: true };
    }

    // Clear move
    this.pawnPos[playerIndex] = { r, c };
    this.moveHistory.push({ player: playerIndex, type: 'move', r, c });
    this.checkWinner();
    this.currentPlayer = 1 - this.currentPlayer;
    return { moved: true, bumped: false };
  }

  // Check if a wall blocks movement from (r1, c1) to (r2, c2)
  isWallBlocking(r1, c1, r2, c2) {
    // Determine connection: vertical or horizontal movement
    if (r1 === r2) {
      // Horizontal movement: check vertical wall in between
      const col = Math.min(c1, c2);
      // Movement is between col and col+1. 
      // Vertical wall at (wRow, col) blocks this movement if wRow is r1 or r1-1
      return this.walls.some(w => w.type === 'V' && w.c === col && (w.r === r1 || w.r === r1 - 1));
    } else if (c1 === c2) {
      // Vertical movement: check horizontal wall in between
      const row = Math.min(r1, r2);
      // Movement is between row and row+1.
      // Horizontal wall at (row, wCol) blocks if wCol is c1 or c1-1
      return this.walls.some(w => w.type === 'H' && w.r === row && (w.c === c1 || w.c === c1 - 1));
    }
    return true; // Diagonal moves are handled by jump rules
  }

  // Check if wall parameters are valid and it does not block paths completely
  isValidWall(r, c, type) {
    // 1. Off-boundaries for wall placement (wall fits in boardSize - 1 grid gaps)
    if (r < 0 || r >= this.boardSize - 1 || c < 0 || c >= this.boardSize - 1) return false;

    // 2. Overlap checks
    for (const w of this.walls) {
      if (w.r === r && w.c === c) {
        return false; // Cross/same point overlap
      }
      if (type === 'H' && w.type === 'H' && w.r === r && Math.abs(w.c - c) < 2) {
        return false; // Overlap on horizontal wall span
      }
      if (type === 'V' && w.type === 'V' && w.c === c && Math.abs(w.r - r) < 2) {
        return false; // Overlap on vertical wall span
      }
    }

    // 3. Path blockage check (simulate wall placement, run BFS, restore wall)
    this.walls.push({ r, c, type });
    const pathsExist = this.hasPathToGoal(0) && this.hasPathToGoal(1);
    this.walls.pop(); // Remove simulated wall

    return pathsExist;
  }

  // Place wall
  placeWall(r, c, type, playerIndex) {
    if (this.winner !== -1) return false;
    if (this.currentPlayer !== playerIndex) return false;
    if (this.playerWallsLeft[playerIndex] <= 0) return false;
    if (!this.isValidWall(r, c, type)) return false;

    this.walls.push({ r, c, type, player: playerIndex });
    this.playerWallsLeft[playerIndex]--;
    
    this.moveHistory.push({
      player: playerIndex,
      type: 'wall',
      r,
      c,
      wallType: type
    });

    this.checkWinner();
    this.currentPlayer = 1 - this.currentPlayer;
    return true;
  }

  // Move pawn
  movePawn(r, c, playerIndex) {
    if (this.winner !== -1) return false;
    if (this.currentPlayer !== playerIndex) return false;

    const validMoves = this.getValidMoves(playerIndex);
    const isValid = validMoves.some(m => m.r === r && m.c === c);

    if (!isValid) return false;

    this.pawnPos[playerIndex] = { r, c };

    this.moveHistory.push({
      player: playerIndex,
      type: 'move',
      r,
      c
    });

    this.checkWinner();
    this.currentPlayer = 1 - this.currentPlayer;
    return true;
  }

  // BFS check to verify if playerIndex has a path to their target row
  hasPathToGoal(playerIndex) {
    const start = this.pawnPos[playerIndex];
    const targetRow = this.goalRow(playerIndex);
    
    // Visited matrix
    const visited = Array.from({ length: this.boardSize }, () => Array(this.boardSize).fill(false));
    const queue = [start];
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
        return true; // Path exists!
      }

      for (const d of dirs) {
        const nr = current.r + d.dr;
        const nc = current.c + d.dc;

        if (nr >= 0 && nr < this.boardSize && nc >= 0 && nc < this.boardSize) {
          if (!visited[nr][nc]) {
            if (!this.isWallBlocking(current.r, current.c, nr, nc)) {
              visited[nr][nc] = true;
              queue.push({ r: nr, c: nc });
            }
          }
        }
      }
    }

    return false; // Trapped!
  }

  // Check winner
  checkWinner() {
    if (this.pawnPos[0].r === this.goalRow(0)) {
      this.winner = 0;
    } else if (this.pawnPos[1].r === this.goalRow(1)) {
      this.winner = 1;
    }
  }
}
