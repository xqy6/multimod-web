export interface MoleHole {
  id: number;
  active: boolean;
  kind: "mole" | "bomb";
  timer: number;
}

export interface WhackAMoleState {
  holes: MoleHole[];
  score: number;
  hits: number;
  misses: number;
  timeLeft: number;
  duration: number;
  speed: number;
  spawnTimer: number;
  status: "playing" | "done";
}

export function createWhackAMole(duration = 30, speed = 1): WhackAMoleState {
  return {
    holes: Array.from({ length: 9 }, (_, id) => ({
      id,
      active: false,
      kind: "mole",
      timer: 0,
    })),
    score: 0,
    hits: 0,
    misses: 0,
    timeLeft: duration,
    duration,
    speed,
    spawnTimer: 0.8 / speed,
    status: "playing",
  };
}

export function stepWhackAMole(state: WhackAMoleState, dt: number) {
  if (state.status !== "playing") return;

  state.timeLeft -= dt;
  state.spawnTimer -= dt;
  if (state.timeLeft <= 0) {
    state.timeLeft = 0;
    state.status = "done";
    for (const hole of state.holes) {
      hole.active = false;
    }
    return;
  }

  if (state.spawnTimer <= 0) {
    const hole = state.holes[Math.floor(Math.random() * state.holes.length)];
    hole.active = true;
    hole.kind = Math.random() < 0.78 ? "mole" : "bomb";
    hole.timer = (1 + Math.random() * 0.9) / state.speed;
    state.spawnTimer = (0.55 + Math.random() * 0.75) / state.speed;
  }

  for (const hole of state.holes) {
    if (!hole.active) continue;
    hole.timer -= dt;
    if (hole.timer <= 0) {
      hole.active = false;
    }
  }
}

export function whackMole(state: WhackAMoleState, index: number) {
  if (state.status !== "playing") return;
  const hole = state.holes[index];
  if (!hole || !hole.active) return;
  hole.active = false;
  if (hole.kind === "mole") {
    state.score += 10;
    state.hits += 1;
  } else {
    state.score = Math.max(0, state.score - 5);
    state.misses += 1;
  }
}
