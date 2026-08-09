export type MinesweeperStatus = "playing" | "won" | "lost";

export interface MineCell {
  mine: boolean;
  revealed: boolean;
  flagged: boolean;
  adjacent: number;
}

export interface MinesweeperState {
  rows: number;
  cols: number;
  mines: number;
  board: MineCell[][];
  status: MinesweeperStatus;
  revealedCount: number;
}

function countAdjacent(
  board: MineCell[][],
  row: number,
  col: number,
): number {
  let count = 0;
  for (let y = Math.max(0, row - 1); y <= Math.min(board.length - 1, row + 1); y += 1) {
    for (
      let x = Math.max(0, col - 1);
      x <= Math.min(board[0].length - 1, col + 1);
      x += 1
    ) {
      if (board[y][x].mine) count += 1;
    }
  }
  return count;
}

export function createMinesweeper(
  rows = 9,
  cols = 9,
  mines = 10,
  minePositions?: Array<[number, number]>,
): MinesweeperState {
  const board: MineCell[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      mine: false,
      revealed: false,
      flagged: false,
      adjacent: 0,
    })),
  );

  const positions = minePositions ?? [];
  if (!minePositions) {
    const all: Array<[number, number]> = [];
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        all.push([row, col]);
      }
    }
    for (let i = all.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [all[i], all[j]] = [all[j], all[i]];
    }
    positions.push(...all.slice(0, mines));
  }

  for (const [row, col] of positions) {
    board[row][col].mine = true;
  }
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      board[row][col].adjacent = countAdjacent(board, row, col);
    }
  }

  return {
    rows,
    cols,
    mines,
    board,
    status: "playing",
    revealedCount: 0,
  };
}

export function toggleMineFlag(
  state: MinesweeperState,
  row: number,
  col: number,
) {
  const cell = state.board[row][col];
  if (cell.revealed || state.status !== "playing") return;
  cell.flagged = !cell.flagged;
}

export function revealMineCell(
  state: MinesweeperState,
  row: number,
  col: number,
) {
  if (state.status !== "playing") return;
  const cell = state.board[row][col];
  if (cell.revealed || cell.flagged) return;

  if (cell.mine) {
    cell.revealed = true;
    state.status = "lost";
    for (const line of state.board) {
      for (const entry of line) {
        if (entry.mine) entry.revealed = true;
      }
    }
    return;
  }

  const stack: Array<[number, number]> = [[row, col]];
  while (stack.length > 0) {
    const [currentRow, currentCol] = stack.pop() as [number, number];
    const current = state.board[currentRow][currentCol];
    if (current.revealed || current.flagged || current.mine) continue;
    current.revealed = true;
    state.revealedCount += 1;
    if (current.adjacent === 0) {
      for (
        let y = Math.max(0, currentRow - 1);
        y <= Math.min(state.rows - 1, currentRow + 1);
        y += 1
      ) {
        for (
          let x = Math.max(0, currentCol - 1);
          x <= Math.min(state.cols - 1, currentCol + 1);
          x += 1
        ) {
          if (y === currentRow && x === currentCol) continue;
          stack.push([y, x]);
        }
      }
    }
  }

  if (state.revealedCount === state.rows * state.cols - state.mines) {
    state.status = "won";
  }
}
