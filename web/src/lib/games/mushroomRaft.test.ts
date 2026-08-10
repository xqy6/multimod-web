import { describe, expect, it } from "vitest";

import {
  createMushroomRaftGame,
  MUSHROOM_RAFT_WORLDS,
  stepMushroomRaftGame,
  type MushroomRaftInput,
} from "./mushroomRaft";

const idle: MushroomRaftInput = {
  left: false,
  right: false,
  down: false,
  jump: false,
  dash: false,
  shoot: false,
};

describe("mushroom raft engine", () => {
  it("starts a fresh run with three lives and no score", () => {
    const state = createMushroomRaftGame();
    expect(state.status).toBe("playing");
    expect(state.score).toBe(0);
    expect(state.player.lives).toBe(3);
    expect(state.celebration).toBe(0);
  });

  it("creates six distinct worlds with increasing difficulty", () => {
    const boss = createMushroomRaftGame(5);
    expect(boss.levelIndex).toBe(5);
    expect(boss.levelName).toContain("BOSS");
    expect(boss.enemies.length).toBeGreaterThanOrEqual(10);
  });

  it("gives every world a different terrain layout", () => {
    const first = createMushroomRaftGame(0);
    const swamp = createMushroomRaftGame(1);
    const cave = createMushroomRaftGame(2);
    const firstLayout = first.platforms.map((entry) => `${entry.x}:${entry.y}`);
    const swampLayout = swamp.platforms.map(
      (entry) => `${entry.x}:${entry.y}`,
    );
    const caveLayout = cave.platforms.map((entry) => `${entry.x}:${entry.y}`);
    expect(swampLayout).not.toEqual(firstLayout);
    expect(caveLayout).not.toEqual(firstLayout);
    expect(caveLayout).not.toEqual(swampLayout);
  });

  it("clamps invalid level indexes", () => {
    expect(createMushroomRaftGame(99).levelIndex).toBe(6);
    expect(createMushroomRaftGame(-3).levelIndex).toBe(0);
  });

  it("includes hazards and a boss in later worlds", () => {
    const cave = createMushroomRaftGame(3);
    expect(cave.hazards.some((hazard) => hazard.kind === "rock")).toBe(true);
    const bossLevel = createMushroomRaftGame(5);
    expect(bossLevel.boss?.alive).toBe(true);
  });

  it("places more falling rocks in the waterfall world", () => {
    const waterfall = createMushroomRaftGame(3);
    expect(
      waterfall.hazards.filter((hazard) => hazard.kind === "rock").length,
    ).toBeGreaterThanOrEqual(5);
  });

  it("gives every raft three hit points", () => {
    for (let level = 0; level < MUSHROOM_RAFT_WORLDS.length; level += 1) {
      const state = createMushroomRaftGame(level);
      for (const raft of state.rafts) {
        expect(raft.maxHp).toBe(3);
        expect(raft.hp).toBe(3);
      }
    }
  });

  it("floods the deck intermittently in phase two", () => {
    const state = createMushroomRaftGame(5);
    const boss = state.boss;
    if (!boss) return;
    boss.phase = 2;
    boss.flooding = false;
    boss.floodTimer = 1;

    stepMushroomRaftGame(state, idle, 1 / 60);
    expect(boss.flooding).toBe(true);
  });

  it("flooding only hurts players inside the water", () => {
    const state = createMushroomRaftGame(5);
    const boss = state.boss;
    if (!boss) return;
    boss.phase = 2;
    boss.flooding = true;
    state.player.lives = 2;
    state.player.invincible = 0;
    state.player.x = 5300;
    state.player.y = 380;
    state.player.vy = 0;

    stepMushroomRaftGame(state, idle, 1 / 60);
    expect(state.player.lives).toBe(2);

    state.player.lives = 2;
    state.player.invincible = 0;
    state.player.y = 440;
    stepMushroomRaftGame(state, idle, 1 / 60);
    expect(state.player.lives).toBe(1);
  });

  it("enters phase two after phase one hp reaches zero and restores hp", () => {
    const state = createMushroomRaftGame(5);
    const boss = state.boss;
    if (!boss) return;
    boss.hp = 0;

    stepMushroomRaftGame(state, idle, 1 / 60);

    expect(boss.phase).toBe(2);
    expect(boss.alive).toBe(true);
    expect(boss.hp).toBe(boss.maxHp);
    expect(boss.x).toBe(5200);
  });

  it("lets water bullets damage the boss", () => {
    const state = createMushroomRaftGame(5);
    const boss = state.boss;
    if (!boss) return;
    const hp = boss.hp;
    state.projectiles.push({
      id: "test-water-boss",
      kind: "water",
      x: boss.x + 50,
      y: boss.y + 30,
      vx: 0,
      alive: true,
    });

    stepMushroomRaftGame(state, idle, 1 / 60);
    expect(boss.hp).toBe(hp - 1);
    expect(boss.invincible).toBeGreaterThan(0);
  });

  it("makes the player and raft bigger with the drift mushroom", () => {
    const state = createMushroomRaftGame(0);
    const raft = state.rafts[0];
    state.player.x = raft.x + 20;
    state.player.onRaftId = raft.id;
    state.player.y = raft.y - state.player.h;
    state.player.onGround = true;
    state.items.push({
      id: "test-raft-mushroom",
      kind: "raftMushroom",
      x: state.player.x,
      y: raft.y - 34 + 4,
      w: 30,
      h: 34,
      taken: false,
      bob: 0,
    });

    stepMushroomRaftGame(state, idle, 1 / 60);
    expect(state.player.power).toBe("big");
    expect(raft.large).toBe(true);
    expect(raft.shieldTimer).toBeGreaterThan(0);
  });

  it("does not consume the drift mushroom without a raft", () => {
    const state = createMushroomRaftGame(0);
    state.items.push({
      id: "test-raft-mushroom-no-raft",
      kind: "raftMushroom",
      x: state.player.x,
      y: state.player.y,
      w: 30,
      h: 34,
      taken: false,
      bob: 0,
    });

    stepMushroomRaftGame(state, idle, 1 / 60);
    const item = state.items.find(
      (entry) => entry.id === "test-raft-mushroom-no-raft",
    );
    expect(item?.taken).toBe(false);
    expect(state.player.power).toBe("small");
  });

  it("drops a random item every thirty seconds", () => {
    const state = createMushroomRaftGame(0);
    expect(state.dropTimer).toBe(1800);
  });

  it("keeps the boss in phase two after a checkpoint respawn", () => {
    const state = createMushroomRaftGame(5);
    const boss = state.boss;
    if (!boss) return;
    boss.phase = 2;
    boss.hp = 5;
    state.player.lives = 2;
    state.player.y = 500;
    state.player.onRaftId = null;

    for (let i = 0; i < 50; i += 1) {
      stepMushroomRaftGame(state, idle, 1 / 60);
    }
    expect(boss.phase).toBe(2);
    expect(boss.hp).toBe(5);
  });

  it("drops falling items onto platforms instead of under the ground", () => {
    const state = createMushroomRaftGame(0);
    state.items.push({
      id: "test-drop-flower",
      kind: "flower",
      x: 60,
      y: 405,
      w: 30,
      h: 32,
      taken: false,
      bob: 0,
      falling: true,
      vy: 2,
    });

    stepMushroomRaftGame(state, idle, 1 / 60);
    const dropped = state.items[state.items.length - 1];
    expect(dropped.falling).toBe(false);
    expect(dropped.y).toBeLessThan(410);
    expect(dropped.y).toBeGreaterThan(360);
  });

  it("includes the rainbow hidden world", () => {
    const rainbow = createMushroomRaftGame(6);
    expect(rainbow.theme).toBe("rainbow");
    expect(rainbow.levelName).toContain("彩虹");
  });

  it("creates a second player in duo mode", () => {
    const state = createMushroomRaftGame(0, true);
    expect(state.player2).not.toBeNull();
    expect(state.player2?.x).toBe(90);
  });

  it("moves the second player with its own input", () => {
    const state = createMushroomRaftGame(0, true);
    stepMushroomRaftGame(
      state,
      idle,
      1 / 60,
      { ...idle, right: true },
    );
    expect(state.player2?.x).toBeGreaterThan(90);
  });

  it("collects star power and toad rescue rewards", () => {
    const state = createMushroomRaftGame(0);
    const star = state.items.find((entry) => entry.kind === "star");
    const toad = state.items.find((entry) => entry.kind === "toad");
    expect(star).toBeDefined();
    expect(toad).toBeDefined();
    if (!star || !toad) return;

    for (const enemy of state.enemies) enemy.alive = false;
    state.player.x = star.x;
    state.player.y = star.y;
    stepMushroomRaftGame(state, idle, 1 / 60);
    expect(state.player.starTimer).toBeGreaterThan(0);

    const lives = state.player.lives;
    state.player.x = toad.x;
    state.player.y = toad.y;
    stepMushroomRaftGame(state, idle, 1 / 60);
    expect(state.player.lives).toBe(lives + 1);
  });

  it("collects coins from pipes", () => {
    const state = createMushroomRaftGame(0);
    const pipe = state.platforms.find((entry) => entry.kind === "pipe");
    expect(pipe).toBeDefined();
    if (!pipe) return;

    state.player.x = pipe.x + 4;
    state.player.y = pipe.y + 10;
    stepMushroomRaftGame(state, { ...idle, down: true }, 1 / 60);
    expect(state.coins).toBeGreaterThanOrEqual(20);
  });

  it("extinguishes flame hazards with water bullets", () => {
    const state = createMushroomRaftGame(4);
    const flame = state.hazards.find((entry) => entry.kind === "flame");
    expect(flame).toBeDefined();
    if (!flame) return;
    flame.active = true;
    state.projectiles.push({
      id: "test-water",
      kind: "water",
      x: flame.x + 10,
      y: flame.y + 10,
      vx: 0,
      alive: true,
    });

    stepMushroomRaftGame(state, idle, 1 / 60);
    expect(flame.active).toBe(false);
  });

  it("keeps the other player alive after one player runs out of lives", () => {
    const state = createMushroomRaftGame(0, true);
    const firstEnemy = state.enemies[0];
    const secondEnemy = state.enemies.find(
      (enemy) => enemy.kind === "goomba" && enemy !== firstEnemy,
    );
    const player2 = state.player2;
    if (!player2 || !firstEnemy || !secondEnemy) return;

    player2.lives = 1;
    player2.x = firstEnemy.x + 5;
    player2.y = firstEnemy.y - 6;
    stepMushroomRaftGame(state, idle, 1 / 60);
    expect(player2.dead).toBe(true);
    expect(state.status).toBe("playing");

    state.player.lives = 1;
    state.player.x = secondEnemy.x + 5;
    state.player.y = secondEnemy.y - 6;
    stepMushroomRaftGame(state, idle, 1 / 60);
    expect(state.status).toBe("gameover");
  });

  it("damages rafts with spikes", () => {
    const state = createMushroomRaftGame(0);
    const spike = state.hazards.find((entry) => entry.kind === "spike");
    const raft = state.rafts[0];
    expect(spike).toBeDefined();
    if (!spike || !raft) return;
    raft.hp = 2;
    raft.x = spike.x - 10;
    raft.y = spike.y - raft.h + 4;
    state.player.onRaftId = raft.id;
    state.player.y = raft.y - state.player.h;

    stepMushroomRaftGame(state, idle, 1 / 60);
    expect(raft.hp).toBeLessThan(2);
    expect(raft.shieldTimer).toBeGreaterThan(0);
    expect(state.player.invincible).toBeGreaterThan(0);
    expect(spike.active).toBe(false);
  });

  it("keeps bubbles in water by turning around at ground", () => {
    const state = createMushroomRaftGame(0);
    const bubble = state.enemies.find((entry) => entry.kind === "bubble");
    const ground = state.platforms.find(
      (entry) => entry.kind === "ground" && entry.x > 500,
    );
    if (!bubble || !ground) return;
    bubble.x = ground.x - bubble.w + 1;
    bubble.y = 420;
    bubble.vx = 1;

    stepMushroomRaftGame(state, idle, 1 / 60);
    expect(bubble.vx).toBeLessThan(0);
  });

  it("loses a life and returns to checkpoint when the raft is destroyed", () => {
    const state = createMushroomRaftGame(0);
    const spike = state.hazards.find((entry) => entry.kind === "spike");
    const raft = state.rafts[0];
    if (!spike || !raft) return;

    state.player.lives = 2;
    state.player.onRaftId = raft.id;
    raft.hp = 1;
    raft.x = spike.x - 10;
    raft.y = spike.y - raft.h + 4;

    stepMushroomRaftGame(state, idle, 1 / 60);
    expect(state.player.lives).toBe(1);
    expect(state.player.x).toBeCloseTo(20, 0);
    expect(state.status).toBe("playing");
    expect(state.raftSpawnTimer).toBeLessThanOrEqual(600);
  });

  it("moves the boss into phase two after phase one health is depleted", () => {
    const state = createMushroomRaftGame(5);
    const boss = state.boss;
    if (!boss) return;
    boss.hp = 1;
    state.player.x = boss.x + boss.w - 30;
    state.player.y = boss.y - state.player.h + 1;
    state.player.vy = 6;

    stepMushroomRaftGame(state, idle, 1 / 60);
    expect(boss.phase).toBe(2);
    expect(boss.hp).toBe(boss.maxHp);
    expect(boss.x).toBe(5200);
    expect(boss.invincible).toBeGreaterThan(0);
  });

  it("bounces safely when stomping the boss off the tail", () => {
    const state = createMushroomRaftGame(5);
    const boss = state.boss;
    if (!boss) return;
    const hp = boss.hp;
    state.player.lives = 2;
    state.player.x = boss.x + 20;
    state.player.y = boss.y - state.player.h + 1;
    state.player.vy = 6;

    stepMushroomRaftGame(state, idle, 1 / 60);
    expect(state.player.lives).toBe(2);
    expect(state.player.vy).toBeLessThan(0);
    expect(boss.hp).toBe(hp);
  });

  it("hurts the player when stomping the boss head in phase two", () => {
    const state = createMushroomRaftGame(5);
    const boss = state.boss;
    if (!boss) return;
    boss.phase = 2;
    state.player.lives = 2;
    state.player.x = boss.x + 20;
    state.player.y = boss.y - state.player.h + 1;
    state.player.vy = 6;

    stepMushroomRaftGame(state, idle, 1 / 60);
    expect(state.player.lives).toBe(1);
  });

  it("keeps rafts still until a player boards them", () => {
    const state = createMushroomRaftGame(0);
    const raft = state.rafts[0];
    const startX = raft.x;
    stepMushroomRaftGame(state, idle, 1 / 60);
    expect(raft.x).toBe(startX);

    state.player.onRaftId = raft.id;
    state.player.y = raft.y - state.player.h;
    stepMushroomRaftGame(state, idle, 1 / 60);
    expect(raft.x).toBeGreaterThan(startX);
  });

  it("performs a double jump with the leaf", () => {
    const state = createMushroomRaftGame(0);
    state.player.canGlide = true;
    state.player.vy = 10;
    state.player.doubleJumpUsed = false;
    stepMushroomRaftGame(state, { ...idle, jump: true }, 1 / 60);
    expect(state.player.vy).toBeLessThan(0);
    expect(state.player.doubleJumpUsed).toBe(true);
  });

  it("only grants the leaf in worlds one and six", () => {
    for (let level = 0; level < MUSHROOM_RAFT_WORLDS.length; level += 1) {
      const hasLeaf = createMushroomRaftGame(level).items.some(
        (item) => item.kind === "leaf",
      );
      expect(hasLeaf).toBe(level === 0 || level === 5);
    }
  });

  it("does not allow a third jump", () => {
    const state = createMushroomRaftGame(0);
    state.player.canGlide = true;
    state.player.vy = 10;
    state.player.doubleJumpUsed = true;
    stepMushroomRaftGame(state, { ...idle, jump: true }, 1 / 60);
    expect(state.player.vy).toBeGreaterThan(0);
  });

  it("sinks swamp platforms while a player stands on them", () => {
    const state = createMushroomRaftGame(1);
    const sinking = state.platforms.find((entry) => entry.sinking);
    expect(sinking).toBeDefined();
    if (!sinking) return;
    state.player.x = sinking.x + 10;
    state.player.y = sinking.y - state.player.h + 1;
    state.player.onGround = true;

    stepMushroomRaftGame(state, idle, 1 / 60);
    expect(sinking.sinkOffset ?? 0).toBeGreaterThan(0);
  });

  it("breaks swamp platforms after the second jump", () => {
    const state = createMushroomRaftGame(1);
    const fragile = state.platforms.find(
      (entry) => entry.breaksOnDoubleJump,
    );
    expect(fragile).toBeDefined();
    if (!fragile) return;
    state.player.canGlide = true;
    state.player.fragilePlatformId = fragile.id;
    state.player.doubleJumpUsed = false;
    state.player.vy = 6;

    stepMushroomRaftGame(state, { ...idle, jump: true }, 1 / 60);
    expect(fragile.broken).toBe(true);
  });

  it("resets the section after respawning at a checkpoint", () => {
    const state = createMushroomRaftGame(0);
    const spike = state.hazards.find((entry) => entry.kind === "spike");
    const raft = state.rafts[0];
    const item = state.items.find((entry) => entry.kind === "mushroom");
    if (!spike || !raft || !item) return;
    item.taken = true;
    state.player.lives = 2;
    state.player.onRaftId = raft.id;
    state.player.y = raft.y - state.player.h;
    raft.hp = 1;
    raft.x = spike.x - 10;
    raft.y = spike.y - raft.h + 4;

    stepMushroomRaftGame(state, idle, 1 / 60);
    expect(state.player.lives).toBe(1);
    expect(state.enemies[0].alive).toBe(true);
    expect(item.taken).toBe(false);
  });

  it("keeps the player in place with invincibility after an enemy hit", () => {
    const state = createMushroomRaftGame(0);
    const enemy = state.enemies[0];
    if (!enemy) return;
    state.player.lives = 2;
    state.player.x = enemy.x + 5;
    state.player.y = enemy.y - 6;

    stepMushroomRaftGame(state, idle, 1 / 60);
    expect(state.player.lives).toBe(1);
    expect(state.player.invincible).toBeGreaterThan(0);
    expect(state.player.x).not.toBe(20);
  });

  it("stomping an enemy rewards points", () => {
    const state = createMushroomRaftGame();
    const enemy = state.enemies[0];
    state.player.x = enemy.x + 5;
    state.player.y = enemy.y - state.player.h + 1;
    state.player.vy = 6;

    stepMushroomRaftGame(state, idle, 1 / 60);

    expect(enemy.alive).toBe(false);
    expect(state.score).toBeGreaterThanOrEqual(100);
  });

  it("collects celebration mushrooms", () => {
    const state = createMushroomRaftGame();
    const item = state.items.find((entry) => entry.kind === "celebration");
    expect(item).toBeDefined();
    if (!item) return;

    state.player.x = item.x;
    state.player.y = item.y;
    stepMushroomRaftGame(state, idle, 1 / 60);

    expect(item.taken).toBe(true);
    expect(state.celebration).toBe(1);
    expect(state.score).toBe(500);
  });

  it("bounces a bubble enemy off a raft without destroying it", () => {
    const state = createMushroomRaftGame();
    const raft = state.rafts[1];
    const bubble = state.enemies.find((entry) => entry.kind === "bubble");
    raft.hp = 1;
    if (!bubble) return;
    bubble.x = raft.x + 20;
    bubble.y = raft.y - 10;
    const vxBefore = bubble.vx;

    stepMushroomRaftGame(state, idle, 1 / 60);

    expect(state.rafts.some((entry) => entry.id === raft.id)).toBe(true);
    expect(bubble.alive).toBe(true);
    expect(Math.sign(bubble.vx)).not.toBe(Math.sign(vxBefore));
  });

  it("lets a gliding player bounce and double-jump after popping a bubble", () => {
    const state = createMushroomRaftGame();
    const bubble = state.enemies.find((entry) => entry.kind === "bubble");
    if (!bubble) return;
    state.player.canGlide = true;
    state.player.doubleJumpUsed = true;
    state.player.x = bubble.x;
    state.player.y = bubble.y - state.player.h + 4;
    state.player.vy = 6;

    stepMushroomRaftGame(state, idle, 1 / 60);

    expect(bubble.alive).toBe(false);
    expect(state.player.doubleJumpUsed).toBe(false);
    expect(state.player.vy).toBeLessThan(0);
  });

  it("wins the run at the celebration flag", () => {
    const state = createMushroomRaftGame();
    state.player.x = 6100;

    stepMushroomRaftGame(state, idle, 1 / 60);

    expect(state.status).toBe("won");
    expect(state.score).toBeGreaterThanOrEqual(1000);
  });

  it("fires water bullets from the start", () => {
    const state = createMushroomRaftGame();

    stepMushroomRaftGame(
      state,
      { ...idle, shoot: true },
      1 / 60,
    );

    expect(state.player.canShoot).toBe(true);
    expect(state.projectiles.length).toBe(1);
    expect(state.projectiles[0].kind).toBe("water");
    expect(state.player.waterAmmo).toBe(4);
  });

  it("grants a land dash burst", () => {
    const state = createMushroomRaftGame();

    stepMushroomRaftGame(
      state,
      { ...idle, right: true, dash: true },
      1 / 60,
    );

    expect(state.player.dashTimer).toBeGreaterThan(0);
    expect(state.player.invincible).toBeGreaterThan(0);
    expect(Math.abs(state.player.vx)).toBeCloseTo(16, 0);
  });
});
