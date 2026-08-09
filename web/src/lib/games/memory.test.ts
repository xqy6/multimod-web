import { describe, expect, it } from "vitest";

import {
  createMemoryGame,
  flipMemoryCard,
  resolveMemoryTurn,
} from "./memory";

describe("memory engine", () => {
  it("wins when every pair is matched", () => {
    const state = createMemoryGame(1);
    const first = state.cards.findIndex((card) => card.value === 0);
    const second = state.cards.findIndex(
      (card, index) => card.value === 0 && index !== first,
    );
    flipMemoryCard(state, first);
    flipMemoryCard(state, second);
    resolveMemoryTurn(state);
    expect(state.status).toBe("won");
    expect(state.pairs).toBe(1);
  });

  it("flips mismatched cards back", () => {
    const state = createMemoryGame(2);
    const first = state.cards.findIndex((card) => card.value === 0);
    const second = state.cards.findIndex((card) => card.value === 1);
    flipMemoryCard(state, first);
    flipMemoryCard(state, second);
    resolveMemoryTurn(state);
    expect(state.cards[first].flipped).toBe(false);
    expect(state.cards[second].flipped).toBe(false);
    expect(state.moves).toBe(1);
  });
});
