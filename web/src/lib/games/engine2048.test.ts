import { describe, expect, it } from "vitest";

import {
  addRandomTile,
  createGrid,
  isGameOver2048,
  move2048,
} from "./engine2048";

describe("2048 engine", () => {
  it("merges two equal tiles to the left", () => {
    const result = move2048(
      [
        [2, 2, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ],
      "left",
    );
    expect(result.grid[0]).toEqual([4, 0, 0, 0]);
    expect(result.score).toBe(4);
  });

  it("adds a tile into the first empty cell with a fixed random", () => {
    const next = addRandomTile(createGrid(), () => 0);
    expect(next[0][0]).toBe(2);
  });

  it("detects a full board with no moves", () => {
    const grid = [
      [2, 4, 8, 16],
      [32, 64, 128, 256],
      [512, 1024, 2, 4],
      [8, 16, 32, 64],
    ];
    expect(isGameOver2048(grid)).toBe(true);
  });
});
