export interface MemoryCard {
  id: number;
  value: number;
  matched: boolean;
  flipped: boolean;
}

export interface MemoryState {
  cards: MemoryCard[];
  firstIndex: number | null;
  secondIndex: number | null;
  moves: number;
  pairs: number;
  status: "playing" | "won";
}

export function createMemoryGame(pairs = 8): MemoryState {
  const values: number[] = [];
  for (let value = 0; value < pairs; value += 1) {
    values.push(value, value);
  }
  for (let i = values.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
  return {
    cards: values.map((value, index) => ({
      id: index,
      value,
      matched: false,
      flipped: false,
    })),
    firstIndex: null,
    secondIndex: null,
    moves: 0,
    pairs: 0,
    status: "playing",
  };
}

export function flipMemoryCard(state: MemoryState, index: number) {
  if (state.status !== "playing" || state.secondIndex !== null) return;
  const card = state.cards[index];
  if (!card || card.flipped || card.matched) return;

  card.flipped = true;
  if (state.firstIndex === null) {
    state.firstIndex = index;
  } else if (index !== state.firstIndex) {
    state.secondIndex = index;
    state.moves += 1;
  }
}

export function resolveMemoryTurn(state: MemoryState) {
  const first =
    state.firstIndex === null ? null : state.cards[state.firstIndex];
  const second =
    state.secondIndex === null ? null : state.cards[state.secondIndex];
  if (!first || !second) {
    state.firstIndex = null;
    state.secondIndex = null;
    return;
  }

  if (first.value === second.value) {
    first.matched = true;
    second.matched = true;
    state.pairs += 1;
    if (state.pairs === state.cards.length / 2) {
      state.status = "won";
    }
  } else {
    first.flipped = false;
    second.flipped = false;
  }
  state.firstIndex = null;
  state.secondIndex = null;
}
