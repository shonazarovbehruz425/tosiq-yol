// 4-player "2v2 Team" Quoridor engine (server copy).
// Players 0,1,2,3. Team 0 = {0,2} (bottom→top, goal row 0).
// Team 1 = {1,3} (top→bottom, goal row N-1). Shared wall pool per team.
// A team wins as soon as ANY member reaches its goal row.

export class TeamQuoridor {
  constructor(boardSize = 11, wallsPerTeam = 10) {
    this.boardSize = boardSize;
    this.wallsPerTeam = wallsPerTeam;

    const N = boardSize;
    const cols = [Math.floor(N * 0.25), Math.floor(N * 0.75)];
    this.pawnPos = [
      { r: N - 1, c: cols[0] }, // p0 team0
      { r: 0,     c: cols[0] }, // p1 team1
      { r: N - 1, c: cols[1] }, // p2 team0
      { r: 0,     c: cols[1] }  // p3 team1
    ];
    this.teamWallsLeft = [wallsPerTeam, wallsPerTeam];
    this.walls = [];
    this.currentPlayer = 0;
    this.winner = -1;
    this.moveHistory = [];
  }

  team(p) { return p % 2; }
  goalRow(p) { return this.team(p) === 0 ? 0 : this.boardSize - 1; }

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

  pawnAt(r, c) { return this.pawnPos.findIndex(p => p.r === r && p.c === c); }

  getValidMoves(player) {
    if (this.winner !== -1) return [];
    const me = this.pawnPos[player];
    const moves = [];
    const dirs = [{ dr: -1, dc: 0 }, { dr: 1, dc: 0 }, { dr: 0, dc: -1 }, { dr: 0, dc: 1 }];
    for (const d of dirs) {
      const nr = me.r + d.dr, nc = me.c + d.dc;
      if (nr < 0 || nr >= this.boardSize || nc < 0 || nc >= this.boardSize) continue;
      if (this.isWallBlocking(me.r, me.c, nr, nc)) continue;
      const occ = this.pawnAt(nr, nc);
      if (occ === -1) { moves.push({ r: nr, c: nc }); continue; }
      const jr = nr + d.dr, jc = nc + d.dc;
      const jumpOff = jr < 0 || jr >= this.boardSize || jc < 0 || jc >= this.boardSize;
      if (!jumpOff && !this.isWallBlocking(nr, nc, jr, jc) && this.pawnAt(jr, jc) === -1) {
        moves.push({ r: jr, c: jc });
      } else {
        const diags = d.dr !== 0
          ? [{ dr: 0, dc: -1 }, { dr: 0, dc: 1 }]
          : [{ dr: -1, dc: 0 }, { dr: 1, dc: 0 }];
        for (const dg of diags) {
          const drr = nr + dg.dr, dcc = nc + dg.dc;
          if (drr < 0 || drr >= this.boardSize || dcc < 0 || dcc >= this.boardSize) continue;
          if (!this.isWallBlocking(nr, nc, drr, dcc) && this.pawnAt(drr, dcc) === -1) {
            moves.push({ r: drr, c: dcc });
          }
        }
      }
    }
    return moves;
  }

  isValidWall(r, c, type) {
    const N = this.boardSize;
    if (r < 0 || r >= N - 1 || c < 0 || c >= N - 1) return false;
    for (const w of this.walls) {
      if (w.r === r && w.c === c) return false;
      if (type === 'H' && w.type === 'H' && w.r === r && Math.abs(w.c - c) < 2) return false;
      if (type === 'V' && w.type === 'V' && w.c === c && Math.abs(w.r - r) < 2) return false;
    }
    this.walls.push({ r, c, type });
    const ok = [0, 1, 2, 3].every(p => this.hasPathToGoal(p));
    this.walls.pop();
    return ok;
  }

  placeWall(r, c, type, player) {
    if (this.winner !== -1) return false;
    if (this.currentPlayer !== player) return false;
    const tm = this.team(player);
    if (this.teamWallsLeft[tm] <= 0) return false;
    if (!this.isValidWall(r, c, type)) return false;
    this.walls.push({ r, c, type, team: tm, player });
    this.teamWallsLeft[tm]--;
    this.moveHistory.push({ player, type: 'wall', r, c, wallType: type });
    this.checkWinner();
    if (this.winner === -1) this.currentPlayer = (this.currentPlayer + 1) % 4;
    return true;
  }

  movePawn(r, c, player) {
    if (this.winner !== -1) return false;
    if (this.currentPlayer !== player) return false;
    const valid = this.getValidMoves(player);
    if (!valid.some(m => m.r === r && m.c === c)) return false;
    this.pawnPos[player] = { r, c };
    this.moveHistory.push({ player, type: 'move', r, c });
    this.checkWinner();
    if (this.winner === -1) this.currentPlayer = (this.currentPlayer + 1) % 4;
    return true;
  }

  hasPathToGoal(player) {
    const start = this.pawnPos[player];
    const target = this.goalRow(player);
    const N = this.boardSize;
    const visited = Array.from({ length: N }, () => Array(N).fill(false));
    const queue = [start];
    visited[start.r][start.c] = true;
    const dirs = [{ dr: -1, dc: 0 }, { dr: 1, dc: 0 }, { dr: 0, dc: -1 }, { dr: 0, dc: 1 }];
    let head = 0;
    while (head < queue.length) {
      const cur = queue[head++];
      if (cur.r === target) return true;
      for (const d of dirs) {
        const nr = cur.r + d.dr, nc = cur.c + d.dc;
        if (nr >= 0 && nr < N && nc >= 0 && nc < N && !visited[nr][nc] &&
            !this.isWallBlocking(cur.r, cur.c, nr, nc)) {
          visited[nr][nc] = true;
          queue.push({ r: nr, c: nc });
        }
      }
    }
    return false;
  }

  checkWinner() {
    for (const p of [0, 1, 2, 3]) {
      if (this.pawnPos[p].r === this.goalRow(p)) { this.winner = this.team(p); return; }
    }
  }
}

export default TeamQuoridor;
