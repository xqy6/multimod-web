import { describe, expect, it } from "vitest";

import { changeSnakeDirection, createSnake, stepSnake } from "./snake";

describe("snake engine", () => {
  it("moves forward and keeps direction", () => {
    const state = createSnake(8, 8);
    const next = stepSnake(state);
    expect(next.snake[0].x).toBe(state.snake[0].x + 1);
    expect(next.direction).toBe("right");
  });

  it("ignores reversing direction", () => {
    const state = createSnake(8, 8);
    const next = changeSnakeDirection(state, "left");
    expect(next.nextDirection).toBe("right");
  });

  it("ends game at the wall", () => {
    const state = {
      ...createSnake(8, 8),
      snake: [{ x: 7, y: 4 }],
      direction: "right" as const,
      nextDirection: "right" as const,
      food: { x: 0, y: 0 },
    };
    expect(stepSnake(state).gameOver).toBe(true);
  });
});
