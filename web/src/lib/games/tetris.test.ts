import { describe, expect, it } from "vitest";

import { createTetris, moveTetris, rotateTetris, stepTetris } from "./tetris";

describe("tetris engine", () => {
  it("creates a playable state", () => {
    const state = createTetris();
    expect(state.board).toHaveLength(20);
    expect(state.board[0]).toHaveLength(10);
    expect(state.gameOver).toBe(false);
  });

  it("rotates and moves the piece", () => {
    const state = createTetris();
    const rotated = rotateTetris(state);
    const moved = moveTetris(rotated, 1);
    expect(moved.piece.x).toBe(rotated.piece.x + 1);
  });

  it("advances the piece downward", () => {
    const state = createTetris();
    const next = stepTetris(state);
    expect(next.piece.y).toBe(state.piece.y + 1);
  });
});
