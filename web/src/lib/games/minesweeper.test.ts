import { describe, expect, it } from "vitest";

import {
  createMinesweeper,
  revealMineCell,
  toggleMineFlag,
} from "./minesweeper";

describe("minesweeper engine", () => {
  it("reveals empty cells and wins when all safe cells are open", () => {
    const state = createMinesweeper(3, 3, 1, [[0, 0]]);
    revealMineCell(state, 2, 2);
    expect(state.status).toBe("won");
    expect(state.revealedCount).toBe(8);
  });

  it("loses when a mine is revealed", () => {
    const state = createMinesweeper(3, 3, 1, [[0, 0]]);
    revealMineCell(state, 0, 0);
    expect(state.status).toBe("lost");
    expect(state.board[0][0].revealed).toBe(true);
  });

  it("keeps flagged cells safe", () => {
    const state = createMinesweeper(3, 3, 1, [[0, 0]]);
    toggleMineFlag(state, 0, 0);
    revealMineCell(state, 0, 0);
    expect(state.status).toBe("playing");
    expect(state.board[0][0].flagged).toBe(true);
  });
});
