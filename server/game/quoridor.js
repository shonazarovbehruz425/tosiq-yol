// Server-side Quoridor Game Engine

export class QuoridorEngine {
  constructor(boardSize = 9, wallsCount = 10, mode = 'duel') {
    this.boardSize = boardSize;
    this.wallsCount = wallsCount;
    this.mode = mode; // 'duel' or 'race'

    const mid = Math.floor(boardSize / 2);

    if (mode === 'race') {
      // Race: both pawns start at the bottom (opposite columns), both race to row 0.
      const leftCol = Math.max(0, mid - 2);
      const rightCol = Math.min(boardSize - 1, mid + 2);
      this.pawnPos = [
        { r: boardSize - 1, c: leftCol },
        { r: boardSize - 1, c: rightCol }
      ];
    } else {
      this.pawnPos = [
        { r: boardSize - 1, c: mid },
        { r: 0, c: mid }
      ];
    }
    
    this.playerWallsLeft = [wallsCount, wallsCount];
    this.walls = [];
    
    this.currentPlayer = 0;
    this.winner = -1;
    this.moveHistory = [];
  }

  // Goal row for a player given the current mode.
  goalRow(playerIndex) {
    if (this.mode === 'race') return 0;
    return playerIndex === 0 ? 0 : this.boardSize - 1;
  }

  getValidMoves(playerIndex) {
    if (this.winner !== -1) return [];

    const myPos = this.pawnPos[playerIndex];
    const oppPos = this.pawnPos[1 - playerIndex];
    const moves = [];

    const dirs = [
      { dr: -1, dc: 0 },
      { dr: 1, dc: 0 },
      { dr: 0, dc: -1 },
      { dr: 0, dc: 1 }
    ];

    dirs.forEach(d => {
      const nr = myPos.r + d.dr;
      const nc = myPos.c + d.dc;

      if (nr < 0 || nr >= this.boardSize || nc < 0 || nc >= this.boardSize) return;

      if (this.isWallBlocking(myPos.r, myPos.c, nr, nc)) return;

      if (oppPos.r === nr && oppPos.c === nc) {
        const jumpR = nr + d.dr;
        const jumpC = nc + d.dc;

        const isJumpOffBoard = jumpR < 0 || jumpR >= this.boardSize || jumpC < 0 || jumpC >= this.boardSize;
        const isJumpBlocked = isJumpOffBoard || this.isWallBlocking(nr, nc, jumpR, jumpC);

        if (!isJumpBlocked) {
          moves.push({ r: jumpR, c: jumpC });
        } else {
          const diagonals = [];
          if (d.dr !== 0) {
            diagonals.push({ dr: 0, dc: -1 });
            diagonals.push({ dr: 0, dc: 1 });
          } else {
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
        moves.push({ r: nr, c: nc });
      }
    });

    return moves;
  }

  isWallBlocking(r1, c1, r2, c2) {
    if (r1 === r2) {
      const col = Math.min(c1, c2);
      return this.walls.some(w => w.type === 'V' && w.c === col && (w.r === r1 || w.r === r1 - 1));
    } else if (c1 === c2) {
      const row = Math.min(r1, r2);
      return this.walls.some(w => w.type === 'H' && w.r === row && (w.c === c1 || w.c === c1 - 1));
    }
    return true;
  }

  isValidWall(r, c, type) {
    if (r < 0 || r >= this.boardSize - 1 || c < 0 || c >= this.boardSize - 1) return false;

    for (const w of this.walls) {
      if (w.r === r && w.c === c) return false;
      if (type === 'H' && w.type === 'H' && w.r === r && Math.abs(w.c - c) < 2) return false;
      if (type === 'V' && w.type === 'V' && w.c === c && Math.abs(w.r - r) < 2) return false;
    }

    this.walls.push({ r, c, type });
    const pathsExist = this.hasPathToGoal(0) && this.hasPathToGoal(1);
    this.walls.pop();

    return pathsExist;
  }

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

  hasPathToGoal(playerIndex) {
    const start = this.pawnPos[playerIndex];
    const targetRow = this.goalRow(playerIndex);
    
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
        return true;
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

    return false;
  }

  checkWinner() {
    if (this.pawnPos[0].r === this.goalRow(0)) {
      this.winner = 0;
    } else if (this.pawnPos[1].r === this.goalRow(1)) {
      this.winner = 1;
    }
  }
}
export default QuoridorEngine;
