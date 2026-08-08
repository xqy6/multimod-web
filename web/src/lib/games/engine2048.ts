export type Direction2048 = "up" | "down" | "left" | "right";
export type Grid2048 = number[][];

export const GRID_SIZE = 4;

export function createGrid(): Grid2048 {
  return Array.from({ length: GRID_SIZE }, () =>
    Array<number>(GRID_SIZE).fill(0),
  );
}

function slide(line: number[]): {
  line: number[];
  score: number;
  moved: boolean;
} {
  const values = line.filter((value) => value !== 0);
  const merged: number[] = [];
  let score = 0;
  for (let index = 0; index < values.length; index += 1) {
    if (index + 1 < values.length && values[index] === values[index + 1]) {
      merged.push(values[index] * 2);
      score += values[index] * 2;
      index += 1;
    } else {
      merged.push(values[index]);
    }
  }
  while (merged.length < GRID_SIZE) merged.push(0);
  const moved = !line.every((value, index) => value === merged[index]);
  return { line: merged, score, moved };
}

export function move2048(
  grid: Grid2048,
  direction: Direction2048,
): { grid: Grid2048; score: number; moved: boolean } {
  const next = createGrid();
  let score = 0;
  let moved = false;

  for (let index = 0; index < GRID_SIZE; index += 1) {
    let line: number[];
    if (direction === "left") {
      line = grid[index];
    } else if (direction === "right") {
      line = [...grid[index]].reverse();
    } else if (direction === "up") {
      line = grid.map((row) => row[index]);
    } else {
      line = grid.map((row) => row[index]).reverse();
    }

    const result = slide(line);
    score += result.score;
    moved = moved || result.moved;

    if (direction === "left") {
      next[index] = result.line;
    } else if (direction === "right") {
      next[index] = [...result.line].reverse();
    } else if (direction === "up") {
      result.line.forEach((value, rowIndex) => {
        next[rowIndex][index] = value;
      });
    } else {
      result.line.forEach((value, rowIndex) => {
        next[GRID_SIZE - 1 - rowIndex][index] = value;
      });
    }
  }

  return { grid: next, score, moved };
}

export function addRandomTile(
  grid: Grid2048,
  random: () => number = Math.random,
): Grid2048 {
  const empty: [number, number][] = [];
  grid.forEach((row, rowIndex) => {
    row.forEach((value, columnIndex) => {
      if (value === 0) empty.push([rowIndex, columnIndex]);
    });
  });
  if (empty.length === 0) return grid;
  const [row, column] = empty[Math.floor(random() * empty.length)];
  const next = grid.map((row) => [...row]);
  next[row][column] = random() < 0.9 ? 2 : 4;
  return next;
}

export function isGameOver2048(grid: Grid2048): boolean {
  const hasEmpty = grid.some((row) => row.some((value) => value === 0));
  if (hasEmpty) return false;
  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let column = 0; column < GRID_SIZE; column += 1) {
      if (
        (column + 1 < GRID_SIZE &&
          grid[row][column] === grid[row][column + 1]) ||
        (row + 1 < GRID_SIZE && grid[row][column] === grid[row + 1][column])
      ) {
        return false;
      }
    }
  }
  return true;
}

export function hasWon2048(grid: Grid2048): boolean {
  return grid.some((row) => row.some((value) => value >= 2048));
}
