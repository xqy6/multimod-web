import { describe, expect, it } from "vitest";

import {
  createMushroomRaftGame,
  stepMushroomRaftGame,
  type MushroomRaftInput,
} from "./mushroomRaft";

const IDLE: MushroomRaftInput = {
  left: false,
  right: false,
  jump: false,
  down: false,
  dash: false,
  shoot: false,
};

describe("deep mushroom raft checks", () => {
  it("has three deck platforms in phase two area", () => {
    const state = createMushroomRaftGame(5);
    const deckPlatforms = state.platforms.filter(
      (platform) =>
        platform.kind === "platform" &&
        platform.x > 4300 &&
        platform.y < 400,
    );
    expect(deckPlatforms.length).toBeGreaterThanOrEqual(3);
  });

  it("boss summons minions and a raft in phase one", () => {
    const state = createMushroomRaftGame(5);
    const boss = state.boss;
    if (!boss) throw new Error("no boss");
    boss.summonTimer = 0;
    const enemiesBefore = state.enemies.length;
    const raftsBefore = state.rafts.length;

    stepMushroomRaftGame(state, IDLE, 1 / 60);

    expect(state.enemies.length).toBeGreaterThan(enemiesBefore);
    expect(state.rafts.length).toBeGreaterThan(raftsBefore);
  });

  it("player can board the summoned boss raft", () => {
    const state = createMushroomRaftGame(5);
    const boss = state.boss;
    if (!boss) throw new Error("no boss");
    boss.summonTimer = 0;
    for (let i = 0; i < 10; i += 1) {
      stepMushroomRaftGame(state, IDLE, 1 / 60);
    }
    const summoned = state.rafts.find(
      (raft) => raft.speed === 1.4 && raft.x > 2500,
    );
    expect(summoned).toBeDefined();
    if (!summoned) return;
    const minion = state.enemies.find((entry) => entry.raftId === summoned.id);
    state.enemies = minion ? [minion] : [];
    state.hazards = [];
    state.projectiles = [];
    const player = state.player;
    player.x = summoned.x + 20;
    player.y = summoned.y - player.h - 10;
    player.vy = 4;
    player.onRaftId = null;

    for (let i = 0; i < 20; i += 1) {
      stepMushroomRaftGame(state, IDLE, 1 / 60);
    }

    expect(player.onRaftId).toBe(summoned.id);
  });

  it("stops summoning when too many minions are alive", () => {
    const state = createMushroomRaftGame(5);
    const boss = state.boss;
    if (!boss) throw new Error("no boss");
    boss.summonTimer = 0;
    while (state.enemies.filter((entry) => entry.alive).length < 14) {
      state.enemies.push({
        id: `fill-${state.enemies.length}`,
        kind: "goomba",
        x: 200,
        y: 400,
        w: 30,
        h: 30,
        vx: 0,
        vy: 0,
        alive: true,
        timer: 0,
        shellTimer: 0,
        homeX: 200,
      });
    }
    const countBefore = state.enemies.length;

    stepMushroomRaftGame(state, IDLE, 1 / 60);

    expect(state.enemies.length).toBe(countBefore);
  });

  it("boss keeps firing fireballs without a cap", () => {
    const state = createMushroomRaftGame(5);
    const boss = state.boss;
    if (!boss) throw new Error("no boss");
    boss.timer = 0;
    boss.phase = 2;
    for (let i = 0; i < 6; i += 1) {
      state.projectiles.push({
        id: `fire-${i}`,
        kind: "fireball",
        x: 100,
        y: 100,
        vx: 1,
        alive: true,
      });
    }
    const before = state.projectiles.length;

    stepMushroomRaftGame(state, IDLE, 1 / 60);

    expect(state.projectiles.length).toBeGreaterThan(before);
  });

  it("does not drown while invincible, then drowns after", () => {
    const state = createMushroomRaftGame();
    state.player.lives = 2;
    state.player.invincible = 180;
    state.player.x = 500;
    state.player.y = 520;
    state.player.onRaftId = null;

    for (let i = 0; i < 120; i += 1) {
      stepMushroomRaftGame(state, IDLE, 1 / 60);
    }
    expect(state.player.lives).toBe(2);

    state.player.invincible = 0;
    for (let i = 0; i < 90; i += 1) {
      stepMushroomRaftGame(state, IDLE, 1 / 60);
    }
    expect(state.player.lives).toBe(1);
  });

  it("defeats the boss at zero hp in phase two", () => {
    const state = createMushroomRaftGame(5);
    const boss = state.boss;
    if (!boss) throw new Error("no boss");
    boss.phase = 2;
    boss.hp = 1;
    boss.invincible = 0;

    const player = state.player;
    player.x = boss.x + boss.w * 0.8;
    player.y = boss.y - player.h - 4;
    player.vy = 6;

    stepMushroomRaftGame(state, IDLE, 1 / 60);

    expect(boss.alive).toBe(false);
  });

  it("duo players track drowning independently", () => {
    const state = createMushroomRaftGame(0, true);
    const p1 = state.player;
    const p2 = state.player2;
    if (!p2) throw new Error("no player2");
    p1.lives = 2;
    p1.invincible = 0;
    p2.lives = 2;
    p2.invincible = 0;
    p1.x = 40;
    p1.y = 300;
    p2.x = 500;
    p2.y = 520;
    p2.onRaftId = null;
    state.enemies = [];
    state.projectiles = [];
    state.rafts = [];

    for (let i = 0; i < 90; i += 1) {
      stepMushroomRaftGame(state, IDLE, 1 / 60);
    }

    expect(p1.lives).toBe(2);
    expect(p2.lives).toBe(1);
  });

  it("removes fireballs that fly off screen", () => {
    const state = createMushroomRaftGame(5);
    state.projectiles.push({
      id: "far-fireball",
      kind: "fireball",
      x: 99999,
      y: 100,
      vx: 1,
      alive: true,
    });

    stepMushroomRaftGame(state, IDLE, 1 / 60);

    expect(
      state.projectiles.some((entry) => entry.id === "far-fireball"),
    ).toBe(false);
  });

  it("summoned goombas spawn above the ground", () => {
    const state = createMushroomRaftGame(5);
    const boss = state.boss;
    if (!boss) throw new Error("no boss");
    boss.summonTimer = 0;
    boss.x = 2500;

    stepMushroomRaftGame(state, IDLE, 1 / 60);

    for (const goomba of state.enemies.filter(
      (entry) => entry.kind === "goomba",
    )) {
      const ground = state.platforms.find(
        (platform) =>
          platform.kind === "ground" &&
          goomba.x + goomba.w > platform.x &&
          goomba.x < platform.x + platform.w,
      );
      if (ground) {
        expect(goomba.y + goomba.h).toBeLessThanOrEqual(ground.y + 2);
      }
    }
  });

  it("finish only counts after the boss is defeated", () => {
    const state = createMushroomRaftGame(5);
    const boss = state.boss;
    if (!boss) throw new Error("no boss");
    state.player.x = state.finishX;

    stepMushroomRaftGame(state, IDLE, 1 / 60);
    expect(state.status).toBe("playing");

    boss.alive = false;
    stepMushroomRaftGame(state, IDLE, 1 / 60);
    expect(state.status).toBe("won");
  });
});
