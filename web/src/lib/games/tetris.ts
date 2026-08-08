export type Cell = string | null;
export type TetrisBoard = Cell[][];

export const TETRIS_WIDTH = 10;
export const TETRIS_HEIGHT = 20;

interface PieceDefinition {
  shape: number[][];
  color: string;
}

const PIECES: PieceDefinition[] = [
  { shape: [[1, 1, 1, 1]], color: "#52e5c4" },
  { shape: [[1, 1], [1, 1]], color: "#ffd36b" },
  { shape: [[0, 1, 0], [1, 1, 1]], color: "#8ed0ff" },
  { shape: [[0, 1, 1], [1, 1, 0]], color: "#ff9ad5" },
  { shape: [[1, 1, 0], [0, 1, 1]], color: "#a8e6b0" },
  { shape: [[1, 0, 0], [1, 1, 1]], color: "#f0b06a" },
  { shape: [[0, 0, 1], [1, 1, 1]], color: "#e0d068" },
];

export interface TetrisPiece {
  shape: number[][];
  color: string;
  x: number;
  y: number;
}

export interface TetrisState {
  board: TetrisBoard;
  piece: TetrisPiece;
  score: number;
  lines: number;
  gameOver: boolean;
}

function createEmptyBoard(): TetrisBoard {
  return Array.from({ length: TETRIS_HEIGHT }, () =>
    Array<Cell>(TETRIS_WIDTH).fill(null),
  );
}

function spawnPiece(board: TetrisBoard): TetrisState["piece"] | null {
  const definition =
    PIECES[Math.floor(Math.random() * PIECES.length)];
  const piece: TetrisPiece = {
    shape: definition.shape,
    color: definition.color,
    x: Math.floor((TETRIS_WIDTH - definition.shape[0].length) / 2),
    y: 0,
  };
  return collides(board, piece) ? null : piece;
}

export function createTetris(): TetrisState {
  const board = createEmptyBoard();
  const piece = spawnPiece(board);
  return {
    board,
    piece: piece ?? {
      shape: [[1]],
      color: "#52e5c4",
      x: 4,
      y: 0,
    },
    score: 0,
    lines: 0,
    gameOver: piece === null,
  };
}

export function collides(
  board: TetrisBoard,
  piece: TetrisPiece,
): boolean {
  for (let row = 0; row < piece.shape.length; row += 1) {
    for (let column = 0; column < piece.shape[row].length; column += 1) {
      if (piece.shape[row][column] === 0) continue;
      const x = piece.x + column;
      const y = piece.y + row;
      if (
        x < 0 ||
        x >= TETRIS_WIDTH ||
        y >= TETRIS_HEIGHT ||
        (y >= 0 && board[y][x] !== null)
      ) {
        return true;
      }
    }
  }
  return false;
}

function rotateMatrix(matrix: number[][]): number[][] {
  return matrix[0].map((_, index) =>
    matrix.map((row) => row[index]).reverse(),
  );
}

export function rotateTetris(state: TetrisState): TetrisState {
  const shape = rotateMatrix(state.piece.shape);
  const piece = { ...state.piece, shape };
  if (collides(state.board, piece)) return state;
  return { ...state, piece };
}

export function moveTetris(
  state: TetrisState,
  dx: number,
): TetrisState {
  const piece = { ...state.piece, x: state.piece.x + dx };
  if (collides(state.board, piece)) return state;
  return { ...state, piece };
}

function mergePiece(
  board: TetrisBoard,
  piece: TetrisPiece,
): TetrisBoard {
  const next = board.map((row) => [...row]);
  piece.shape.forEach((row, rowIndex) => {
    row.forEach((value, columnIndex) => {
      if (value === 0) return;
      const y = piece.y + rowIndex;
      const x = piece.x + columnIndex;
      if (y >= 0 && y < TETRIS_HEIGHT && x >= 0 && x < TETRIS_WIDTH) {
        next[y][x] = piece.color;
      }
    });
  });
  return next;
}

function clearLines(board: TetrisBoard): {
  board: TetrisBoard;
  lines: number;
} {
  const remaining = board.filter((row) =>
    row.some((cell) => cell === null),
  );
  const cleared = TETRIS_HEIGHT - remaining.length;
  while (remaining.length < TETRIS_HEIGHT) {
    remaining.unshift(Array<Cell>(TETRIS_WIDTH).fill(null));
  }
  return { board: remaining, lines: cleared };
}

export function stepTetris(state: TetrisState): TetrisState {
  if (state.gameOver) return state;
  const piece = { ...state.piece, y: state.piece.y + 1 };
  if (collides(state.board, piece)) {
    const board = mergePiece(state.board, state.piece);
    const cleared = clearLines(board);
    const nextPiece = spawnPiece(cleared.board);
    return {
      board: cleared.board,
      piece:
        nextPiece ??
        ({
          shape: [[1]],
          color: "#52e5c4",
          x: 4,
          y: 0,
        } as TetrisPiece),
      score: state.score + cleared.lines * cleared.lines * 100,
      lines: state.lines + cleared.lines,
      gameOver: nextPiece === null,
    };
  }
  return { ...state, piece };
}

export function dropTetris(state: TetrisState): TetrisState {
  if (state.gameOver) return state;
  let piece = state.piece;
  while (!collides(state.board, { ...piece, y: piece.y + 1 })) {
    piece = { ...piece, y: piece.y + 1 };
  }
  return stepTetris({ ...state, piece });
}
