import { describe, expect, it } from "vitest";

import {
  createWhackAMole,
  stepWhackAMole,
  whackMole,
} from "./whackAMole";

describe("whack-a-mole engine", () => {
  it("scores points for moles and loses points for bombs", () => {
    const state = createWhackAMole(30);
    const mole = state.holes[0];
    mole.active = true;
    mole.kind = "mole";
    whackMole(state, 0);
    expect(state.score).toBe(10);

    const bomb = state.holes[1];
    bomb.active = true;
    bomb.kind = "bomb";
    whackMole(state, 1);
    expect(state.score).toBe(5);
  });

  it("finishes when the timer runs out", () => {
    const state = createWhackAMole(1);
    stepWhackAMole(state, 1.1);
    expect(state.status).toBe("done");
    expect(state.timeLeft).toBe(0);
  });
});
