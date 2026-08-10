export const RAFT_VIEW_WIDTH = 960;
export const RAFT_VIEW_HEIGHT = 540;
export const WATER_Y = 452;

const GRAVITY = 0.55;
const MOVE_SPEED = 4.2;
const JUMP_VELOCITY = -13.4;
const RAFT_MAX_HP = 3;

export type MushroomRaftTheme =
  | "river"
  | "swamp"
  | "cave"
  | "waterfall"
  | "fortress"
  | "boss"
  | "rainbow";

export interface MushroomRaftWorld {
  index: number;
  name: string;
  theme: MushroomRaftTheme;
  worldWidth: number;
  finishX: number;
}

export const MUSHROOM_RAFT_WORLDS: MushroomRaftWorld[] = [
  {
    index: 0,
    name: "翠绿溪流关",
    theme: "river",
    worldWidth: 6500,
    finishX: 6035,
  },
  {
    index: 1,
    name: "沼泽迷雾关",
    theme: "swamp",
    worldWidth: 6500,
    finishX: 6035,
  },
  {
    index: 2,
    name: "地下溶洞暗河关",
    theme: "cave",
    worldWidth: 6500,
    finishX: 6035,
  },
  {
    index: 3,
    name: "瀑布峡谷关",
    theme: "waterfall",
    worldWidth: 6500,
    finishX: 6035,
  },
  {
    index: 4,
    name: "库巴水上要塞",
    theme: "fortress",
    worldWidth: 6500,
    finishX: 6035,
  },
  {
    index: 5,
    name: "库巴的巨船 BOSS 关",
    theme: "boss",
    worldWidth: 6500,
    finishX: 6035,
  },
  {
    index: 6,
    name: "彩虹漂流隐藏关",
    theme: "rainbow",
    worldWidth: 6500,
    finishX: 6035,
  },
];

export type MushroomRaftInput = {
  left: boolean;
  right: boolean;
  down: boolean;
  jump: boolean;
  dash: boolean;
  shoot: boolean;
};

const IDLE_INPUT: MushroomRaftInput = {
  left: false,
  right: false,
  down: false,
  jump: false,
  dash: false,
  shoot: false,
};

export type GameStatus = "playing" | "won" | "gameover";
export type PlayerPower = "small" | "big" | "flower";
export type PlatformKind =
  | "ground"
  | "platform"
  | "brick"
  | "question"
  | "hidden"
  | "pipe";
export type EnemyKind = "goomba" | "bubble" | "hermit" | "koopa" | "ghost";
export type ItemKind =
  | "coin"
  | "mushroom"
  | "flower"
  | "leaf"
  | "plank"
  | "oneup"
  | "celebration"
  | "star"
  | "toad"
  | "raftMushroom";
export type ProjectileKind = "water" | "shell" | "fireball";
export type HazardKind = "rock" | "whirlpool" | "cannon" | "flame" | "spike";

export interface Hazard {
  id: string;
  kind: HazardKind;
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  active: boolean;
  timer: number;
}

export interface BossState {
  x: number;
  y: number;
  w: number;
  h: number;
  hp: number;
  maxHp: number;
  vx: number;
  alive: boolean;
  timer: number;
  charging: boolean;
  phase: 1 | 2;
  summonTimer: number;
  floodTimer: number;
  flooding: boolean;
  invincible: number;
}

export interface Platform {
  id: string;
  kind: PlatformKind;
  x: number;
  y: number;
  w: number;
  h: number;
  used?: boolean;
  sinking?: boolean;
  baseY?: number;
  sinkOffset?: number;
  breaksOnDoubleJump?: boolean;
  jumpCount?: number;
  broken?: boolean;
}

export interface Enemy {
  id: string;
  kind: EnemyKind;
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  alive: boolean;
  timer: number;
  shellTimer: number;
  homeX: number;
}

export interface Item {
  id: string;
  kind: ItemKind;
  x: number;
  y: number;
  w: number;
  h: number;
  taken: boolean;
  bob: number;
  falling?: boolean;
  vy?: number;
}

export interface Raft {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  hp: number;
  maxHp: number;
  speed: number;
  bob: number;
  shieldTimer: number;
  large?: boolean;
}

export interface Projectile {
  id: string;
  kind: ProjectileKind;
  x: number;
  y: number;
  vx: number;
  alive: boolean;
}

export interface Player {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  onGround: boolean;
  onRaftId: string | null;
  power: PlayerPower;
  canShoot: boolean;
  canGlide: boolean;
  invincible: number;
  dashTimer: number;
  shootCooldown: number;
  starTimer: number;
  waterAmmo: number;
  doubleJumpUsed: boolean;
  fragilePlatformId: string | null;
  wasJumpHeld: boolean;
  lives: number;
  dead: boolean;
}

export interface MushroomRaftState {
  status: GameStatus;
  levelIndex: number;
  levelName: string;
  theme: MushroomRaftTheme;
  finishX: number;
  worldWidth: number;
  worldHeight: number;
  player: Player;
  player2: Player | null;
  platforms: Platform[];
  enemies: Enemy[];
  items: Item[];
  rafts: Raft[];
  projectiles: Projectile[];
  hazards: Hazard[];
  boss: BossState | null;
  score: number;
  coins: number;
  celebration: number;
  time: number;
  checkpoint: number;
  mode: "land" | "raft";
  current: "calm" | "fast";
  drownTimer: number;
  raftSpawnTimer: number;
  dropTimer: number;
  message: string;
  messageTimer: number;
  camera: { x: number; y: number };
}

let nextId = 1;

function uid(prefix: string) {
  const value = `${prefix}-${nextId}`;
  nextId += 1;
  return value;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function overlaps(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number,
) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function ground(x: number, w: number): Platform {
  return { id: uid("p"), kind: "ground", x, y: 410, w, h: 130 };
}

function platform(x: number, y: number, w: number): Platform {
  return {
    id: uid("p"),
    kind: "platform",
    x,
    y,
    w,
    h: 22,
    baseY: y,
    sinkOffset: 0,
  };
}

function block(kind: "brick" | "question" | "hidden", x: number): Platform {
  return { id: uid("p"), kind, x, y: 300, w: 42, h: 42 };
}

function makePlatforms(levelIndex: number): Platform[] {
  if (levelIndex === 1) {
    const platforms = [
      ground(0, 260),
      block("question", 320),
      platform(320, 400, 120),
      platform(500, 380, 120),
      ground(700, 200),
      block("hidden", 1200),
      platform(960, 400, 140),
      platform(1160, 360, 140),
      ground(1360, 240),
      block("question", 1400),
      platform(1660, 400, 160),
      platform(1880, 360, 160),
      ground(2100, 260),
      block("hidden", 2150),
      platform(2420, 400, 160),
      platform(2640, 360, 160),
      ground(2860, 240),
      block("question", 2900),
      platform(3160, 400, 180),
      platform(3400, 350, 180),
      ground(3640, 260),
      block("hidden", 3700),
      platform(3960, 400, 180),
      platform(4200, 360, 180),
      ground(4440, 260),
      block("question", 4500),
      platform(4760, 400, 200),
      platform(5020, 350, 200),
      ground(5280, 320),
      block("hidden", 5350),
      platform(5660, 400, 160),
      ground(5880, 180),
    ];
    for (const entry of platforms) {
      if (entry.kind === "platform") {
        entry.sinking = true;
        if (entry.x % 600 < 200) {
          entry.breaksOnDoubleJump = true;
          entry.jumpCount = 0;
        }
      }
    }
    return platforms;
  }
  if (levelIndex === 2) {
    return [
      ground(0, 700),
      block("hidden", 300),
      platform(780, 340, 160),
      platform(1000, 260, 160),
      ground(1240, 520),
      block("question", 1400),
      platform(1800, 300, 160),
      platform(2040, 220, 160),
      ground(2280, 560),
      block("hidden", 2500),
      platform(2900, 320, 180),
      platform(3140, 240, 180),
      ground(3380, 500),
      block("question", 3600),
      platform(4000, 360, 180),
      platform(4240, 280, 180),
      ground(4480, 520),
      block("hidden", 4700),
      platform(5100, 320, 180),
      platform(5340, 240, 180),
      ground(5580, 480),
      block("question", 5900),
    ];
  }
  if (levelIndex === 3) {
    return [
      ground(0, 600),
      block("question", 300),
      platform(700, 300, 200),
      ground(1000, 560),
      block("hidden", 1300),
      platform(1700, 260, 220),
      ground(2000, 520),
      block("question", 2400),
      platform(2700, 300, 220),
      ground(3000, 500),
      block("hidden", 3400),
      platform(3700, 260, 220),
      ground(4000, 520),
      block("question", 4400),
      platform(4700, 300, 220),
      ground(5000, 520),
      block("hidden", 5400),
      platform(5700, 280, 200),
      ground(5900, 160),
    ];
  }
  if (levelIndex === 4) {
    return [
      ground(0, 700),
      block("brick", 300),
      platform(760, 340, 120),
      ground(920, 700),
      block("question", 1100),
      platform(1680, 320, 120),
      ground(1840, 700),
      block("hidden", 2100),
      platform(2600, 340, 120),
      ground(2760, 700),
      block("question", 3000),
      platform(3520, 320, 120),
      ground(3680, 700),
      block("hidden", 3900),
      platform(4440, 340, 120),
      ground(4600, 700),
      block("question", 4900),
      platform(5360, 320, 120),
      ground(5520, 540),
      block("hidden", 5800),
    ];
  }
  if (levelIndex === 5) {
    return [
      ground(0, 600),
      block("brick", 300),
      platform(700, 360, 160),
      ground(1000, 520),
      block("question", 1200),
      platform(1700, 340, 180),
      ground(2100, 520),
      block("hidden", 2400),
      platform(2800, 360, 180),
      platform(3400, 340, 180),
      block("question", 3500),
      platform(3900, 340, 180),
      ground(4300, 1760),
      block("brick", 5200),
      { id: uid("p"), kind: "pipe", x: 5300, y: 330, w: 44, h: 80 },
      block("question", 5600),
      block("hidden", 5900),
    ];
  }
  if (levelIndex === 6) {
    return [
      ground(0, 500),
      platform(600, 360, 140),
      ground(900, 480),
      block("question", 1100),
      platform(1500, 340, 150),
      ground(1800, 480),
      block("hidden", 2100),
      platform(2400, 320, 150),
      ground(2700, 480),
      block("question", 3000),
      platform(3300, 340, 150),
      ground(3600, 480),
      block("hidden", 3900),
      platform(4200, 320, 150),
      ground(4500, 480),
      block("question", 4800),
      platform(5100, 340, 150),
      ground(5400, 660),
      block("hidden", 5700),
      block("question", 5900),
    ];
  }
  return [
    ground(0, 700),
    block("question", 340),
    platform(760, 360, 140),
    ground(1900, 600),
    block("hidden", 1200),
    platform(2000, 320, 150),
    { id: uid("p"), kind: "pipe", x: 2100, y: 330, w: 44, h: 80 },
    ground(3700, 600),
    block("question", 2450),
    platform(3800, 320, 150),
    block("hidden", 2750),
    ground(5400, 660),
    block("question", 3850),
    platform(5500, 320, 150),
    block("hidden", 4750),
    block("question", 5900),
  ];
}

function makeEnemy(
  kind: EnemyKind,
  x: number,
  homeX = x,
  y?: number,
): Enemy {
  const defaultY =
    kind === "goomba"
      ? 378
        : kind === "bubble"
          ? 420
          : kind === "ghost"
            ? 400
        : kind === "koopa"
          ? 330
          : 376;
  return {
    id: uid("e"),
    kind,
    x,
    y: y ?? defaultY,
    w: kind === "hermit" ? 42 : kind === "ghost" ? 36 : kind === "goomba" ? 32 : 34,
    h: kind === "ghost" ? 40 : 34,
    vx:
      kind === "bubble"
        ? 0.4
        : kind === "goomba"
          ? -0.7
          : kind === "ghost"
            ? 0.3
          : kind === "koopa"
            ? 0.8
            : 0,
    vy: 0,
    alive: true,
    timer: kind === "bubble" ? 10 : 0,
    shellTimer: kind === "hermit" ? 150 : 0,
    homeX,
  };
}

function makeEnemies(levelIndex: number): Enemy[] {
  if (levelIndex === 1) {
    return [
      makeEnemy("goomba", 100),
      makeEnemy("bubble", 500),
      makeEnemy("bubble", 1000),
      makeEnemy("goomba", 750),
      makeEnemy("hermit", 1400),
      makeEnemy("bubble", 1200),
      makeEnemy("bubble", 1750),
      makeEnemy("goomba", 2200),
      makeEnemy("bubble", 2700),
      makeEnemy("goomba", 2950),
      makeEnemy("hermit", 3700),
      makeEnemy("koopa", 3900),
      makeEnemy("bubble", 4200),
      makeEnemy("goomba", 4500),
      makeEnemy("bubble", 4900),
      makeEnemy("bubble", 5200),
      makeEnemy("goomba", 5400),
      makeEnemy("hermit", 5950),
    ];
  }
  if (levelIndex === 2) {
    return [
      makeEnemy("goomba", 300),
      makeEnemy("bubble", 900),
      makeEnemy("goomba", 1300),
      makeEnemy("bubble", 1800),
      makeEnemy("ghost", 1600),
      makeEnemy("hermit", 2400),
      makeEnemy("goomba", 2900),
      makeEnemy("bubble", 3200),
      makeEnemy("goomba", 3500),
      makeEnemy("hermit", 3900),
      makeEnemy("bubble", 4200),
      makeEnemy("ghost", 3400),
      makeEnemy("goomba", 4600),
      makeEnemy("koopa", 5100),
      makeEnemy("goomba", 5700),
      makeEnemy("hermit", 5900),
    ];
  }
  if (levelIndex === 3) {
    return [
      makeEnemy("goomba", 300),
      makeEnemy("bubble", 750),
      makeEnemy("goomba", 1100),
      makeEnemy("bubble", 1700),
      makeEnemy("goomba", 2100),
      makeEnemy("hermit", 2400),
      makeEnemy("goomba", 3100),
      makeEnemy("bubble", 3600),
      makeEnemy("goomba", 4100),
      makeEnemy("hermit", 4300),
      makeEnemy("koopa", 5400),
      makeEnemy("goomba", 5100),
      makeEnemy("bubble", 5600),
      makeEnemy("goomba", 5950),
    ];
  }
  if (levelIndex === 4) {
    return [
      makeEnemy("goomba", 300),
      makeEnemy("bubble", 800),
      makeEnemy("goomba", 1000),
      makeEnemy("bubble", 1700),
      makeEnemy("goomba", 2000),
      makeEnemy("hermit", 2300),
      makeEnemy("goomba", 2900),
      makeEnemy("bubble", 3500),
      makeEnemy("goomba", 3800),
      makeEnemy("hermit", 4100),
      makeEnemy("goomba", 4800),
      makeEnemy("koopa", 5100),
      makeEnemy("bubble", 5400),
      makeEnemy("goomba", 5700),
      makeEnemy("hermit", 5900),
    ];
  }
  if (levelIndex === 5) {
    return [
      makeEnemy("goomba", 300),
      makeEnemy("bubble", 800),
      makeEnemy("goomba", 1100),
      makeEnemy("bubble", 1800),
      makeEnemy("goomba", 2200),
      makeEnemy("hermit", 2500),
      makeEnemy("bubble", 2900),
      makeEnemy("bubble", 3500),
      makeEnemy("koopa", 3600),
      makeEnemy("bubble", 4000),
      makeEnemy("goomba", 4500),
      makeEnemy("hermit", 5000),
      makeEnemy("goomba", 5700),
    ];
  }
  if (levelIndex === 6) {
    return [
      makeEnemy("goomba", 250),
      makeEnemy("bubble", 650),
      makeEnemy("goomba", 950),
      makeEnemy("bubble", 1500),
      makeEnemy("goomba", 1900),
      makeEnemy("hermit", 2200),
      makeEnemy("goomba", 2800),
      makeEnemy("bubble", 3300),
      makeEnemy("goomba", 3700),
      makeEnemy("hermit", 4000),
      makeEnemy("goomba", 4600),
      makeEnemy("koopa", 5100),
      makeEnemy("goomba", 5500),
      makeEnemy("hermit", 5900),
    ];
  }
  return [
    makeEnemy("goomba", 300),
    makeEnemy("bubble", 850),
    makeEnemy("bubble", 1000),
    makeEnemy("bubble", 1500),
    makeEnemy("bubble", 1700),
    makeEnemy("goomba", 2000),
    makeEnemy("hermit", 2100),
    makeEnemy("bubble", 2600),
    makeEnemy("bubble", 2900),
    makeEnemy("goomba", 3900),
    makeEnemy("bubble", 4600),
    makeEnemy("bubble", 4800),
    makeEnemy("bubble", 5200),
    makeEnemy("goomba", 5600),
    makeEnemy("hermit", 5700),
  ];
}

function item(kind: ItemKind, x: number, y: number): Item {
  return {
    id: uid("i"),
    kind,
    x,
    y,
    w: kind === "plank" ? 34 : 30,
    h:
      kind === "plank"
        ? 14
        : kind === "leaf"
          ? 30
          : kind === "raftMushroom"
            ? 34
            : 32,
    taken: false,
    bob: Math.floor(x) % 8,
  };
}

function makeItems(levelIndex: number): Item[] {
  if (levelIndex === 1) {
    return [
      item("celebration", 100, 378),
      item("oneup", 350, 368),
      item("plank", 750, 378),
      item("celebration", 1400, 378),
      item("flower", 2200, 378),
      item("celebration", 2900, 378),
      item("mushroom", 3700, 378),
      item("star", 4500, 378),
      item("toad", 5400, 378),
    ];
  }
  if (levelIndex === 2) {
    return [
      item("celebration", 300, 378),
      item("oneup", 800, 308),
      item("plank", 1300, 378),
      item("celebration", 1800, 268),
      item("flower", 2900, 288),
      item("celebration", 3500, 378),
      item("mushroom", 4000, 328),
      item("star", 4600, 378),
      item("toad", 5700, 378),
    ];
  }
  if (levelIndex === 3) {
    return [
      item("celebration", 300, 378),
      item("oneup", 700, 268),
      item("plank", 1100, 378),
      item("celebration", 1700, 228),
      item("flower", 2700, 268),
      item("celebration", 3100, 378),
      item("mushroom", 3700, 228),
      item("star", 4100, 378),
      item("toad", 5100, 378),
    ];
  }
  if (levelIndex === 4) {
    return [
      item("celebration", 300, 378),
      item("oneup", 760, 308),
      item("plank", 1000, 378),
      item("celebration", 1680, 288),
      item("flower", 2600, 308),
      item("celebration", 2800, 378),
      item("mushroom", 3520, 288),
      item("star", 3800, 378),
      item("toad", 4600, 378),
    ];
  }
  if (levelIndex === 5) {
    return [
      item("celebration", 300, 378),
      item("oneup", 700, 328),
      item("plank", 1100, 378),
      item("celebration", 1700, 308),
      item("leaf", 2200, 378),
      item("flower", 3400, 308),
      item("celebration", 4500, 378),
      item("mushroom", 4700, 378),
      item("star", 4600, 378),
      item("toad", 5700, 378),
    ];
  }
  if (levelIndex === 6) {
    return [
      item("celebration", 200, 378),
      item("oneup", 600, 328),
      item("plank", 950, 378),
      item("celebration", 1500, 308),
      item("flower", 2400, 288),
      item("celebration", 2800, 378),
      item("mushroom", 3300, 308),
      item("star", 3700, 378),
      item("toad", 4600, 378),
    ];
  }
  return [
    item("celebration", 420, 378),
    item("oneup", 800, 328),
    item("plank", 2100, 378),
    item("celebration", 3900, 378),
    item("leaf", 5500, 288),
    item("flower", 4100, 378),
    item("celebration", 5700, 378),
    item("mushroom", 2000, 378),
    item("star", 5600, 378),
    item("toad", 5800, 378),
  ];
}

function makeRafts(levelIndex: number): Raft[] {
  if (levelIndex === 0) {
    return [850, 1300, 1700, 2700, 4700].map((x, index) => ({
      id: uid("r"),
      x,
      y: 430,
      w: 110,
      h: 22,
      hp: RAFT_MAX_HP,
      maxHp: RAFT_MAX_HP,
      speed: 1 + index * 0.12,
      bob: index,
      shieldTimer: 0,
    }));
  }
  const grounds = makePlatforms(levelIndex)
    .filter((entry) => entry.kind === "ground")
    .sort((a, b) => a.x - b.x);
  const positions: number[] = [];
  for (let i = 0; i < grounds.length - 1; i += 1) {
    const start = grounds[i].x + grounds[i].w;
    const gap = grounds[i + 1].x - start;
    if (gap > 180) {
      positions.push(start + gap * 0.35);
    }
    if (gap > 700) {
      positions.push(start + gap * 0.7);
    }
  }
  const difficulty = Math.min(levelIndex, 5);
  return positions.slice(0, 5).map((x, index) => ({
    id: uid("r"),
    x,
    y: 430,
    w: 110,
    h: 22,
    hp: RAFT_MAX_HP,
    maxHp: RAFT_MAX_HP,
    speed: 1 + index * 0.12 + difficulty * 0.14,
    bob: index,
    shieldTimer: 0,
  }));
}

function makeHazards(levelIndex: number): Hazard[] {
  if (levelIndex === 6) {
    return [
      {
        id: uid("h"),
        kind: "whirlpool",
        x: 2600,
        y: WATER_Y + 8,
        w: 70,
        h: 42,
        vx: 0,
        vy: 0,
        active: true,
        timer: 0,
      },
    ];
  }

  const hazards: Hazard[] = [];
  if (levelIndex >= 1) {
    hazards.push(
      {
        id: uid("h"),
        kind: "whirlpool",
        x: 2100,
        y: WATER_Y + 8,
        w: 72,
        h: 44,
        vx: 0,
        vy: 0,
        active: true,
        timer: 0,
      },
      {
        id: uid("h"),
        kind: "whirlpool",
        x: 4320,
        y: WATER_Y + 8,
        w: 72,
        h: 44,
        vx: 0,
        vy: 0,
        active: true,
        timer: 0,
      },
    );
  }
  if (levelIndex >= 2) {
    hazards.push({
      id: uid("h"),
      kind: "whirlpool",
      x: 3320,
      y: WATER_Y + 8,
      w: 80,
      h: 48,
      vx: 0,
      vy: 0,
      active: true,
      timer: 0,
    });
  }
  if (levelIndex >= 3) {
    hazards.push(
      {
        id: uid("h"),
        kind: "rock",
        x: 3400,
        y: 60,
        w: 26,
        h: 26,
        vx: 0,
        vy: 0,
        active: false,
        timer: 150,
      },
      {
        id: uid("h"),
        kind: "rock",
        x: 4100,
        y: 70,
        w: 26,
        h: 26,
        vx: 0,
        vy: 0,
        active: false,
        timer: 220,
      },
      {
        id: uid("h"),
        kind: "rock",
        x: 5100,
        y: 60,
        w: 26,
        h: 26,
        vx: 0,
        vy: 0,
        active: false,
        timer: 300,
      },
      {
        id: uid("h"),
        kind: "rock",
        x: 1900,
        y: 60,
        w: 26,
        h: 26,
        vx: 0,
        vy: 0,
        active: false,
        timer: 120,
      },
      {
        id: uid("h"),
        kind: "rock",
        x: 4700,
        y: 70,
        w: 26,
        h: 26,
        vx: 0,
        vy: 0,
        active: false,
        timer: 260,
      },
    );
  }
  if (levelIndex >= 4) {
    hazards.push(
      {
        id: uid("h"),
        kind: "cannon",
        x: 4400,
        y: 330,
        w: 38,
        h: 30,
        vx: 0,
        vy: 0,
        active: true,
        timer: 80,
      },
      {
        id: uid("h"),
        kind: "flame",
        x: 2900,
        y: 360,
        w: 70,
        h: 24,
        vx: 0,
        vy: 0,
        active: true,
        timer: 0,
      },
    );
  }
  if (levelIndex <= 3) {
    const spikeRafts = [makeRafts(levelIndex)[1], makeRafts(levelIndex)[3]]
      .filter((raft): raft is Raft => Boolean(raft));
    for (const raft of spikeRafts) {
      hazards.push({
        id: uid("h"),
        kind: "spike",
        x: raft.x + raft.w + 24,
        y: raft.y + 8,
        w: 44,
        h: 16,
        vx: 0,
        vy: 0,
        active: true,
        timer: 0,
      });
    }
  }
  return hazards;
}

function makeBoss(): BossState {
  return {
    x: 3000,
    y: 330,
    w: 180,
    h: 90,
    hp: 10,
    maxHp: 10,
    vx: 1.2,
    alive: true,
    timer: 60,
    charging: false,
    phase: 1,
    summonTimer: 160,
    floodTimer: 240,
    flooding: false,
    invincible: 0,
  };
}

function makePlayer(x: number, y: number): Player {
  return {
    x,
    y,
    w: 28,
    h: 36,
    vx: 0,
    vy: 0,
    facing: 1,
    onGround: false,
    onRaftId: null,
    power: "small",
    canShoot: true,
    canGlide: false,
    invincible: 0,
    dashTimer: 0,
    shootCooldown: 0,
    starTimer: 0,
    waterAmmo: 5,
    doubleJumpUsed: false,
    fragilePlatformId: null,
    wasJumpHeld: false,
    lives: 3,
    dead: false,
  };
}

export function createMushroomRaftGame(
  levelIndex = 0,
  duo = false,
): MushroomRaftState {
  const world =
    MUSHROOM_RAFT_WORLDS[
      clamp(levelIndex, 0, MUSHROOM_RAFT_WORLDS.length - 1)
    ];
  return {
    status: "playing",
    levelIndex: world.index,
    levelName: world.name,
    theme: world.theme,
    finishX: world.finishX,
    worldWidth: world.worldWidth,
    worldHeight: 540,
    player: makePlayer(40, 300),
    player2: duo ? makePlayer(90, 300) : null,
    platforms: makePlatforms(world.index),
    enemies: makeEnemies(world.index),
    items: makeItems(world.index),
    rafts: makeRafts(world.index),
    projectiles: [],
    hazards: makeHazards(world.index),
    boss: world.index === 5 ? makeBoss() : null,
    score: 0,
    coins: 0,
    celebration: 0,
    time: 0,
    checkpoint: 0,
    mode: "land",
    current: "calm",
    drownTimer: 0,
    raftSpawnTimer: 600,
    dropTimer: 1800,
    message: "向右冒险，收集 3 个庆典蘑菇！",
    messageTimer: 180,
    camera: { x: 0, y: 0 },
  };
}

function setMessage(state: MushroomRaftState, message: string) {
  state.message = message;
  state.messageTimer = 180;
}

function solidPlatforms(state: MushroomRaftState) {
  return state.platforms.filter(
    (platform) =>
      (platform.kind !== "hidden" || platform.used) &&
      platform.kind !== "pipe" &&
      !platform.broken,
  );
}

function activePlayers(state: MushroomRaftState): Player[] {
  const players = state.player2
    ? [state.player, state.player2]
    : [state.player];
  return players.filter((player) => !player.dead);
}

function collideHorizontal(state: MushroomRaftState, player: Player) {
  for (const platform of solidPlatforms(state)) {
    if (
      overlaps(
        player.x,
        player.y,
        player.w,
        player.h,
        platform.x,
        platform.y,
        platform.w,
        platform.h,
      )
    ) {
      if (player.vx > 0) {
        player.x = platform.x - player.w;
      } else if (player.vx < 0) {
        player.x = platform.x + platform.w;
      }
      player.vx = 0;
    }
  }
}

function activateBlock(
  state: MushroomRaftState,
  platform: Platform,
  fromBelow: boolean,
) {
  if (platform.kind === "hidden") {
    if (!platform.used) {
      platform.used = true;
      state.items.push({
        id: uid("i"),
        kind: "coin",
        x: platform.x + 4,
        y: platform.y - 36,
        w: 26,
        h: 26,
        taken: false,
        bob: 0,
      });
      state.score += 10;
      setMessage(state, "隐藏金币！");
    }
    return;
  }

  if (platform.kind === "question" && !platform.used) {
    platform.used = true;
    const kind: ItemKind = platform.x >= 5800 ? "flower" : "coin";
    state.items.push({
      id: uid("i"),
      kind,
      x: platform.x + 4,
      y: platform.y - 36,
      w: 30,
      h: 32,
      taken: false,
      bob: 0,
    });
    if (fromBelow) {
      state.score += 10;
    }
  }
}

function collideVertical(state: MushroomRaftState, player: Player, k: number) {
  const previousBottom = player.y + player.h;
  player.y += player.vy * k;
  player.onGround = false;

  for (const platform of solidPlatforms(state)) {
    if (
      !overlaps(
        player.x,
        player.y,
        player.w,
        player.h,
        platform.x,
        platform.y,
        platform.w,
        platform.h,
      )
    ) {
      continue;
    }

    if (player.vy > 0 && previousBottom <= platform.y + 10) {
      player.y = platform.y - player.h;
      player.vy = 0;
      player.onGround = true;
      player.doubleJumpUsed = false;
      player.fragilePlatformId = platform.breaksOnDoubleJump
        ? platform.id
        : null;
    } else if (player.vy < 0) {
      player.y = platform.y + platform.h;
      player.vy = 0;
      activateBlock(state, platform, true);
    }
  }

  for (const platform of state.platforms) {
    if (platform.kind !== "hidden" || platform.used) continue;
    if (
      player.vy < 0 &&
      overlaps(
        player.x,
        player.y,
        player.w,
        player.h,
        platform.x,
        platform.y,
        platform.w,
        platform.h,
      )
    ) {
      player.y = platform.y + platform.h;
      player.vy = 0;
      activateBlock(state, platform, true);
    }
  }
}

function landOnRafts(state: MushroomRaftState, player: Player) {
  for (const raft of state.rafts) {
    if (
      player.vy >= 0 &&
      player.y + player.h >= raft.y &&
      player.y + player.h <= raft.y + 14 &&
      overlaps(
        player.x,
        player.y,
        player.w,
        player.h,
        raft.x,
        raft.y,
        raft.w,
        raft.h,
      )
    ) {
      player.y = raft.y - player.h;
      player.vy = 0;
      player.onGround = true;
      player.onRaftId = raft.id;
      player.doubleJumpUsed = false;
      player.fragilePlatformId = null;
      state.drownTimer = 0;
      state.mode = "raft";
    }
  }
}

function collectItems(state: MushroomRaftState, player: Player) {
  for (const item of state.items) {
    if (
      item.taken ||
      !overlaps(
        player.x,
        player.y,
        player.w,
        player.h,
        item.x,
        item.y,
        item.w,
        item.h,
      )
    ) {
      continue;
    }

    item.taken = true;
    if (item.kind === "coin") {
      state.coins += 1;
      state.score += 10;
    } else if (item.kind === "celebration") {
      state.celebration += 1;
      state.score += 500;
      setMessage(state, `庆典蘑菇 ${state.celebration}/3！`);
    } else if (item.kind === "mushroom") {
      player.power = player.power === "small" ? "big" : player.power;
      state.score += 200;
      setMessage(state, "漂流蘑菇，变大！");
      } else if (item.kind === "flower") {
        player.power = "flower";
        player.canShoot = true;
        player.waterAmmo = 5;
        state.score += 200;
      setMessage(state, "水花火力强化，按 X 发射水弹！");
    } else if (item.kind === "leaf") {
      player.canGlide = true;
      state.score += 200;
      setMessage(state, "滑翔叶子：长按跳跃键滑翔！");
    } else if (item.kind === "plank") {
      const raft = state.rafts.find((entry) => entry.id === player.onRaftId);
      if (raft) {
        raft.hp = Math.min(raft.maxHp, raft.hp + 1);
        setMessage(state, "木板修复小船！");
      } else {
        state.score += 100;
        setMessage(state, "先上船再用木板修复！");
      }
      } else if (item.kind === "star") {
        player.starTimer = 420;
        state.score += 300;
        setMessage(state, "星星无敌！撞飞敌人！");
      } else if (item.kind === "raftMushroom") {
        const raft =
          state.rafts.find((entry) => entry.id === player.onRaftId) ??
          state.rafts.find((entry) =>
            overlaps(
              player.x,
              player.y,
              player.w,
              player.h,
              entry.x,
              entry.y,
              entry.w,
              entry.h,
            ),
          );
        if (
          !raft ||
          !overlaps(
            item.x,
            item.y,
            item.w,
            item.h,
            raft.x,
            raft.y,
            raft.w,
            raft.h,
          )
        ) {
          item.taken = false;
          continue;
        }
        player.power = "big";
        if (!raft.large) raft.w += 24;
        raft.large = true;
        raft.shieldTimer = 180;
        state.score += 250;
        setMessage(state, "漂流蘑菇！角色和小船变大，抗一次撞击！");
      } else if (item.kind === "toad") {
        player.lives += 1;
        state.score += 300;
        setMessage(state, "救出奇诺比奥！获得 1UP！");
      } else if (item.kind === "oneup") {
      player.lives += 1;
      state.score += 200;
      setMessage(state, "1UP！额外生命 +1");
    }
  }
}

function resetSectionOnRespawn(state: MushroomRaftState) {
  for (const player of [state.player, ...(state.player2 ? [state.player2] : [])]) {
    player.onRaftId = null;
    player.fragilePlatformId = null;
  }
  state.enemies = makeEnemies(state.levelIndex);
  state.rafts = makeRafts(state.levelIndex);
  state.hazards = makeHazards(state.levelIndex);
  state.projectiles = [];
  for (const item of state.items) {
    if (item.kind !== "celebration") item.taken = false;
  }
  for (const platform of state.platforms) {
    if (platform.kind === "pipe") platform.used = false;
    if (platform.broken) platform.broken = false;
    if (platform.breaksOnDoubleJump) platform.jumpCount = 0;
    if (platform.sinking && platform.baseY !== undefined) {
      platform.sinkOffset = 0;
      platform.y = platform.baseY;
    }
  }
}

function damagePlayer(
  state: MushroomRaftState,
  player: Player,
  respawnAtCheckpoint = true,
) {
  if (player.invincible > 0 || player.starTimer > 0) return;
  if (state.boss?.alive && state.boss.phase === 2) {
    respawnAtCheckpoint = true;
  }

  if (
    state.boss?.alive &&
    state.boss.phase === 2 &&
    (player.power === "flower" || player.power === "big")
  ) {
    player.power = "small";
  }

  if (
    (player.power === "flower" || player.power === "big") &&
    (!state.boss?.alive || state.boss.phase !== 2)
  ) {
    player.power = "small";
    player.invincible = 180;
    setMessage(state, "受到伤害，蘑菇变小了");
    return;
  }

  player.lives -= 1;
  if (player.lives <= 0) {
    const other = state.player2 === player ? state.player : state.player2;
    if (state.player2 && other && other.lives > 0 && !other.dead) {
      player.dead = true;
      resetSectionOnRespawn(state);
      player.onRaftId = null;
      setMessage(state, "一名角色倒下了，另一人继续冒险！");
      return;
    }
    state.status = "gameover";
    setMessage(state, "蘑菇漂流失败…");
    return;
  }

  if (!respawnAtCheckpoint) {
    player.onRaftId = null;
    player.invincible = 180;
    player.vy = -6;
    state.drownTimer = 0;
    setMessage(state, `受击闪避！还剩 ${player.lives} 条命`);
    return;
  }

  player.onRaftId = null;
  player.x = state.checkpoint + 20;
  player.y = 180;
  player.vx = 0;
  player.vy = 0;
  player.invincible = 180;
  resetSectionOnRespawn(state);
  state.drownTimer = 0;
  setMessage(state, `回到存档点，还剩 ${player.lives} 条命`);
}

function stompEnemy(
  state: MushroomRaftState,
  enemy: Enemy,
  player: Player,
) {
  enemy.alive = false;
  player.vy = -9.5;
  state.score += 100;
  if (enemy.kind === "bubble" && player.canGlide) {
    player.doubleJumpUsed = false;
    setMessage(state, "滑翔弹开水泡怪，还能再跳一次！");
  }
}

function updateEnemies(state: MushroomRaftState, k: number) {
  const players = activePlayers(state);

  for (const enemy of state.enemies) {
    if (!enemy.alive) continue;
    enemy.timer += k;

    if (
      state.levelIndex === 5 &&
      (enemy.kind === "goomba" || enemy.kind === "koopa")
    ) {
      const raft = state.rafts.find(
        (entry) => Math.abs(entry.x - enemy.x) < 90,
      );
      if (raft) {
        enemy.x = raft.x + 30;
        enemy.y = raft.y - enemy.h;
      }
    }

    if (enemy.kind === "goomba") {
      enemy.x += enemy.vx * k;
      if (enemy.x < enemy.homeX - 70 || enemy.x + enemy.w > enemy.homeX + 70) {
        enemy.vx *= -1;
      }
    } else if (enemy.kind === "bubble") {
      const nextX = enemy.x + enemy.vx * k;
      enemy.y = WATER_Y - enemy.h + Math.sin(enemy.timer / 16) * 8;
      const blocked = state.platforms.find(
        (platform) =>
          platform.kind === "ground" &&
          nextX + enemy.w > platform.x &&
          nextX < platform.x + platform.w &&
          WATER_Y > platform.y &&
          WATER_Y < platform.y + platform.h,
      );
      if (blocked) {
        enemy.vx = -enemy.vx;
        enemy.x =
          enemy.vx < 0
            ? blocked.x - enemy.w - 1
            : blocked.x + blocked.w + 1;
      } else {
        enemy.x = nextX;
      }
      if (
        enemy.x > state.worldWidth + 120 ||
        enemy.x < state.camera.x - 160
      ) {
        enemy.x = state.camera.x + RAFT_VIEW_WIDTH + 80;
      }
    } else if (enemy.kind === "hermit") {
      enemy.shellTimer -= k;
      const target = players.reduce((best, current) =>
        Math.abs(current.x - enemy.x) < Math.abs(best.x - enemy.x)
          ? current
          : best,
      );
      if (
        enemy.shellTimer <= 0 &&
        Math.abs(enemy.x - target.x) < 620 &&
        state.status === "playing"
      ) {
        state.projectiles.push({
          id: uid("s"),
          kind: "shell",
          x: enemy.x + enemy.w / 2,
          y: enemy.y + 8,
          vx: target.x > enemy.x ? 4.6 : -4.6,
          alive: true,
        });
        enemy.shellTimer = 150;
      }
    } else if (enemy.kind === "koopa") {
      enemy.x += enemy.vx * k;
      if (enemy.x < enemy.homeX - 80 || enemy.x + enemy.w > enemy.homeX + 80) {
        enemy.vx *= -1;
      }
      enemy.y = 330 + Math.sin(enemy.timer / 18) * 14;
    } else if (enemy.kind === "ghost") {
      enemy.x += enemy.vx * k;
      if (enemy.x < enemy.homeX - 100 || enemy.x + enemy.w > enemy.homeX + 100) {
        enemy.vx *= -1;
      }
      enemy.y = 400 + Math.sin(enemy.timer / 14) * 12;
      const center = enemy.x + enemy.w / 2;
      for (const raft of state.rafts) {
        const hasRider = activePlayers(state).some(
          (player) => player.onRaftId === raft.id,
        );
        if (!hasRider) continue;
        const raftCenter = raft.x + raft.w / 2;
        if (Math.abs(raftCenter - center) < 180) {
          raft.x += (center - raftCenter) * 0.02 * k;
        }
      }
      for (const player of players) {
        const playerCenter = player.x + player.w / 2;
        if (Math.abs(playerCenter - center) < 160) {
          player.x += (center - playerCenter) * 0.02 * k;
        }
      }
    }

    for (const player of players) {
      if (
        overlaps(
          player.x,
          player.y,
          player.w,
          player.h,
          enemy.x,
          enemy.y,
          enemy.w,
          enemy.h,
        )
      ) {
        if (player.starTimer > 0) {
          enemy.alive = false;
          state.score += 100;
          break;
        }
        if (player.vy > 0 && player.y + player.h - enemy.y < 18) {
          stompEnemy(state, enemy, player);
        } else if (enemy.kind === "bubble" || enemy.kind === "ghost") {
          player.vy = -9;
          player.vx = player.x < enemy.x ? -5 : 5;
          player.invincible = Math.max(player.invincible, 40);
          if (enemy.kind === "bubble") {
            enemy.alive = false;
            if (player.canGlide) {
              player.doubleJumpUsed = false;
              setMessage(state, "滑翔弹开水泡怪，还能再跳一次！");
            }
          }
        } else {
          damagePlayer(state, player, false);
        }
      }
    }

    for (const raft of state.rafts) {
      if (
        overlaps(
          raft.x,
          raft.y,
          raft.w,
          raft.h,
          enemy.x,
          enemy.y,
          enemy.w,
          enemy.h,
        )
      ) {
        if (enemy.kind === "bubble") {
          enemy.vx = -enemy.vx;
          enemy.x =
            enemy.vx < 0
              ? raft.x - enemy.w - 40
              : raft.x + raft.w + 40;
        } else {
          raft.hp -= 1;
          enemy.alive = false;
          setMessage(state, "小船受损！");
        }
      }
    }
  }
}

function updateProjectiles(state: MushroomRaftState, k: number) {
  const players = activePlayers(state);

  for (const projectile of state.projectiles) {
    if (!projectile.alive) continue;
    projectile.x += projectile.vx * k;

    if (projectile.kind === "water") {
      for (const enemy of state.enemies) {
        if (
          enemy.alive &&
          overlaps(
            projectile.x,
            projectile.y,
            10,
            10,
            enemy.x,
            enemy.y,
            enemy.w,
            enemy.h,
          )
        ) {
          enemy.alive = false;
          projectile.alive = false;
          state.score += 100;
          break;
        }
      }
      if (
        state.boss?.alive &&
        state.boss.invincible <= 0 &&
        overlaps(
          projectile.x,
          projectile.y,
          10,
          10,
          state.boss.x,
          state.boss.y,
          state.boss.w,
          state.boss.h,
        )
      ) {
        state.boss.hp -= 1;
        state.boss.invincible = 120;
        projectile.alive = false;
        state.score += 100;
        setMessage(state, "水弹击中库巴！");
      }
      for (const hazard of state.hazards) {
        if (
          hazard.kind === "flame" &&
          hazard.active &&
          overlaps(
            projectile.x,
            projectile.y,
            10,
            10,
            hazard.x,
            hazard.y,
            hazard.w,
            hazard.h,
          )
        ) {
          hazard.active = false;
          hazard.timer = 240;
          projectile.alive = false;
          state.score += 20;
          setMessage(state, "水花浇灭火焰机关！");
          break;
        }
      }
    } else {
      for (const player of players) {
        if (
          player.invincible <= 0 &&
          player.starTimer <= 0 &&
          overlaps(
            projectile.x,
            projectile.y,
            12,
            12,
            player.x,
            player.y,
            player.w,
            player.h,
          )
        ) {
          damagePlayer(state, player, false);
          projectile.alive = false;
        }
      }
      for (const raft of state.rafts) {
        if (
          overlaps(
            projectile.x,
            projectile.y,
            12,
            12,
            raft.x,
            raft.y,
            raft.w,
            raft.h,
          )
        ) {
          raft.hp -= 1;
          projectile.alive = false;
          setMessage(state, "贝壳击中小船！");
        }
      }
    }

    if (projectile.x < -50 || projectile.x > state.worldWidth + 50) {
      projectile.alive = false;
    }
  }

  state.projectiles = state.projectiles.filter((entry) => entry.alive);
}

function updateRafts(state: MushroomRaftState, k: number) {
  const alive = activePlayers(state);
  const currentX =
    alive.length === 0
      ? state.player.x
      : alive.reduce((sum, player) => sum + player.x, 0) / alive.length;
  const inFast =
    currentX > state.worldWidth * 0.42 &&
    currentX < state.worldWidth * 0.72;
  state.current = inFast ? "fast" : "calm";
  const currentBonus = inFast ? 1.5 : 0;
  for (const raft of state.rafts) {
    const hasRider = activePlayers(state).some(
      (player) => player.onRaftId === raft.id,
    );
    if (hasRider) {
      raft.x += (raft.speed + currentBonus) * k;
    }
    raft.bob += 0.08 * k;
    raft.shieldTimer = Math.max(0, raft.shieldTimer - k);
    const blocked = state.platforms.find(
      (platform) =>
        platform.kind !== "hidden" &&
        overlaps(
          raft.x,
          raft.y,
          raft.w,
          raft.h,
          platform.x,
          platform.y,
          platform.w,
          platform.h,
        ),
    );
    if (hasRider && blocked) {
      raft.x = blocked.x - raft.w;
      raft.speed = 0;
    }
  }

  for (const raft of state.rafts) {
    if (raft.hp <= 0) {
      state.raftSpawnTimer = 600;
      setMessage(state, "小船损毁，10 秒后补充新船");
      for (const player of activePlayers(state)) {
        if (player.onRaftId === raft.id) {
          player.onRaftId = null;
          player.invincible = 0;
          player.starTimer = 0;
          damagePlayer(state, player);
        }
      }
    }
  }
  state.rafts = state.rafts.filter(
    (raft) => raft.hp > 0 && raft.x <= state.worldWidth + 180,
  );

  state.raftSpawnTimer -= k;
  if (state.raftSpawnTimer <= 0 && state.rafts.length < 4) {
    state.rafts.push({
      id: uid("r"),
      x: state.camera.x + RAFT_VIEW_WIDTH + 80,
      y: WATER_Y - 22,
      w: 110,
      h: 22,
      hp: RAFT_MAX_HP,
      maxHp: RAFT_MAX_HP,
      speed: 1.2,
      bob: 0,
      shieldTimer: 0,
    });
    state.raftSpawnTimer = 320;
  }

  for (const player of activePlayers(state)) {
    const raft = state.rafts.find((entry) => entry.id === player.onRaftId);
    if (raft) {
      player.x += raft.speed * k;
      player.x = clamp(player.x, raft.x + 2, raft.x + raft.w - player.w - 2);
      if (player === state.player) state.mode = "raft";
    } else if (player.onRaftId) {
      player.onRaftId = null;
      if (player === state.player) state.mode = "land";
    }
  }
}

function updateHazards(state: MushroomRaftState, k: number) {
  const players = activePlayers(state);

  for (const hazard of state.hazards) {
    hazard.timer -= k;

    if (hazard.kind === "rock") {
      if (!hazard.active && hazard.timer <= 0) {
        hazard.active = true;
        hazard.vy = 8;
      }
      if (hazard.active) {
        hazard.y += hazard.vy * k;
        if (hazard.y > 540) {
          hazard.active = false;
          hazard.vy = 0;
          hazard.y = 60 + (hazard.x % 40);
          hazard.timer = 120 + (hazard.x % 90);
        }
      }
      for (const player of players) {
        if (
          hazard.active &&
          player.invincible <= 0 &&
          player.starTimer <= 0 &&
          overlaps(
            hazard.x,
            hazard.y,
            hazard.w,
            hazard.h,
            player.x,
            player.y,
            player.w,
            player.h,
          )
        ) {
          damagePlayer(state, player, false);
          hazard.active = false;
          hazard.timer = 150;
        }
      }
      for (const raft of state.rafts) {
        if (
          hazard.active &&
          overlaps(
            hazard.x,
            hazard.y,
            hazard.w,
            hazard.h,
            raft.x,
            raft.y,
            raft.w,
            raft.h,
          )
        ) {
          raft.hp -= 1;
          hazard.active = false;
          hazard.timer = 150;
          setMessage(state, "落石击中小船！");
        }
      }
    } else if (hazard.kind === "whirlpool") {
      const center = hazard.x + hazard.w / 2;
      for (const raft of state.rafts) {
        const hasRider = activePlayers(state).some(
          (player) => player.onRaftId === raft.id,
        );
        if (!hasRider) continue;
        const raftCenter = raft.x + raft.w / 2;
        if (Math.abs(raftCenter - center) < 160) {
          raft.x += (center - raftCenter) * 0.012 * k;
        }
      }
      for (const player of players) {
        if (Math.abs(player.x + player.w / 2 - center) < 140) {
          player.x += (center - (player.x + player.w / 2)) * 0.012 * k;
        }
      }
    } else if (hazard.kind === "cannon") {
      if (hazard.timer <= 0) {
        const target = players.reduce((best, current) =>
          Math.abs(current.x - hazard.x) < Math.abs(best.x - hazard.x)
            ? current
            : best,
        );
        state.projectiles.push({
          id: uid("f"),
          kind: "fireball",
          x: hazard.x + hazard.w / 2,
          y: hazard.y + 10,
          vx: target.x > hazard.x ? 5.5 : -5.5,
          alive: true,
        });
        hazard.timer = 120;
      }
    } else if (hazard.kind === "flame") {
      if (!hazard.active && hazard.timer <= 0) {
        hazard.active = true;
        hazard.timer = 0;
      }
      for (const player of players) {
        if (
          hazard.active &&
          overlaps(
            hazard.x,
            hazard.y,
            hazard.w,
            hazard.h,
            player.x,
            player.y,
            player.w,
            player.h,
          )
        ) {
          damagePlayer(state, player, false);
        }
      }
    } else if (hazard.kind === "spike") {
      let raftHit = false;
      for (const raft of state.rafts) {
        const hasRider = activePlayers(state).some(
          (player) => player.onRaftId === raft.id,
        );
        if (
          hasRider &&
          raft.shieldTimer <= 0 &&
          overlaps(
            hazard.x,
            hazard.y,
            hazard.w,
            hazard.h,
            raft.x,
            raft.y,
            raft.w,
            raft.h,
          )
        ) {
          raft.hp -= 1;
          raft.shieldTimer = 180;
          hazard.active = false;
          raftHit = true;
          for (const player of activePlayers(state)) {
            if (player.onRaftId === raft.id) {
              player.invincible = Math.max(player.invincible, 180);
            }
          }
          setMessage(state, "小船撞到尖刺！船和人短暂无敌");
          break;
        }
      }
      if (!raftHit) {
        for (const player of players) {
          if (
            overlaps(
              hazard.x,
              hazard.y,
              hazard.w,
              hazard.h,
              player.x,
              player.y,
              player.w,
              player.h,
            )
          ) {
            damagePlayer(state, player, false);
          }
        }
      }
    }
  }
}

function updateBoss(state: MushroomRaftState, k: number) {
  const boss = state.boss;
  const players = activePlayers(state);
  const player = state.player;
  if (!boss || !boss.alive) return;

  boss.timer -= k;
  boss.invincible = Math.max(0, boss.invincible - k);
  boss.x += boss.vx * k;
  const minX = boss.phase === 1 ? 2600 : 5200;
  const maxX = boss.phase === 1 ? 4200 : 6000;
  if (boss.x < minX || boss.x > maxX) {
    boss.vx *= -1;
  }

  boss.summonTimer -= k;
  if (boss.timer <= 0) {
    const target = players.reduce((best, current) =>
      Math.abs(current.x - boss.x) < Math.abs(best.x - boss.x)
        ? current
        : best,
    );
    boss.charging = !boss.charging;
    const chargeSpeed = boss.phase === 1 ? 2.6 : 3.4;
    boss.vx = boss.charging
      ? target.x > boss.x
        ? chargeSpeed
        : -chargeSpeed
      : boss.phase === 1
        ? 1.2
        : 1.6;
    state.projectiles.push({
      id: uid("b"),
      kind: "fireball",
      x: boss.x + boss.w / 2,
      y: boss.y + 20,
      vx: target.x > boss.x ? (boss.phase === 1 ? 5.2 : 6.2) : (boss.phase === 1 ? -5.2 : -6.2),
      alive: true,
    });
    if (boss.phase === 2) {
      state.projectiles.push({
        id: uid("b2"),
        kind: "fireball",
        x: boss.x + 30,
        y: boss.y + 40,
        vx: target.x > boss.x ? 5.4 : -5.4,
        alive: true,
      });
    }
    boss.timer = boss.phase === 2
      ? boss.charging
        ? 35
        : 60
      : boss.charging
        ? 55
        : 85;
  }

  if (boss.phase === 1 && boss.summonTimer <= 0) {
    state.enemies.push(
      makeEnemy("bubble", boss.x - 140, boss.x - 140, 420),
      makeEnemy("bubble", boss.x + 120, boss.x + 120, 420),
    );
    boss.summonTimer = 170;
  }

  if (boss.phase === 2) {
    boss.floodTimer -= k;
    if (boss.floodTimer <= 0) {
      boss.flooding = !boss.flooding;
      boss.floodTimer = boss.flooding ? 60 : 300;
      if (boss.flooding) {
        setMessage(state, "甲板进水！跳到高处躲避！");
      }
    }
    if (boss.flooding) {
      for (const player of players) {
        if (
          player.y + player.h > WATER_Y &&
          player.y + player.h < RAFT_VIEW_HEIGHT
        ) {
          damagePlayer(state, player, false);
        }
      }
    }
  }

  if (
    !player.dead &&
    overlaps(
      boss.x,
      boss.y,
      boss.w,
      boss.h,
      state.player.x,
      state.player.y,
      state.player.w,
      state.player.h,
    )
  ) {
    const stompingTop =
      player.vy >= 0 &&
      player.y < boss.y + 30 &&
      player.y + player.h > boss.y;
    if (
      stompingTop &&
      player.x + player.w / 2 > boss.x + boss.w * 0.5 &&
      boss.invincible <= 0
    ) {
      boss.hp -= 1;
      boss.invincible = 180;
      player.vy = -10.5;
      state.score += 200;
      setMessage(state, `库巴被踩中了！HP ${Math.max(0, boss.hp)}/${boss.maxHp}`);
    } else if (
      boss.phase === 1 &&
      stompingTop
    ) {
      player.vy = -8;
      player.y = boss.y - player.h - 1;
    } else {
      damagePlayer(state, player, false);
    }
  }

  if (state.player2) {
    const player2 = state.player2;
    if (
      !player2.dead &&
      overlaps(
        boss.x,
        boss.y,
        boss.w,
        boss.h,
        player2.x,
        player2.y,
        player2.w,
        player2.h,
      )
    ) {
      const stompingTop =
        player2.vy >= 0 &&
        player2.y < boss.y + 30 &&
        player2.y + player2.h > boss.y;
      if (
        stompingTop &&
        player2.x + player2.w / 2 > boss.x + boss.w * 0.5 &&
        boss.invincible <= 0
      ) {
        boss.hp -= 1;
        boss.invincible = 180;
        player2.vy = -10.5;
        state.score += 200;
        setMessage(
          state,
          `路易吉踩中库巴！HP ${Math.max(0, boss.hp)}/${boss.maxHp}`,
        );
      } else if (
        boss.phase === 1 &&
        stompingTop
      ) {
        player2.vy = -8;
        player2.y = boss.y - player2.h - 1;
      } else {
        damagePlayer(state, player2, false);
      }
    }
  }

  for (const raft of state.rafts) {
    if (
      overlaps(
        boss.x,
        boss.y,
        boss.w,
        boss.h,
        raft.x,
        raft.y,
        raft.w,
        raft.h,
      )
    ) {
      raft.x += boss.vx * k * 0.5;
    }
  }

  maybeAdvanceBossPhase(state);

  if (boss.hp <= 0) {
    boss.alive = false;
    setMessage(state, "库巴的巨船被击败了！冲向终点！");
  }
}

function maybeAdvanceBossPhase(state: MushroomRaftState) {
  const boss = state.boss;
  if (!boss || !boss.alive) return;
  if (boss.phase === 1 && boss.hp <= 0) {
    boss.phase = 2;
    boss.x = 5200;
    boss.y = 330;
    boss.hp = boss.maxHp;
    boss.vx = 1.6;
    boss.summonTimer = 120;
    boss.vx *= 1.4;
    setMessage(state, "库巴的巨船被击沉，他跳上甲板！第二阶段！");
  }
}

function updateSinkingPlatforms(state: MushroomRaftState, k: number) {
  for (const platform of state.platforms) {
    if (!platform.sinking || platform.baseY === undefined) continue;
    const occupied = activePlayers(state).some(
      (player) =>
        player.onGround &&
        player.y + player.h >= platform.y &&
        player.y + player.h <= platform.y + 14 &&
        overlaps(
          player.x,
          player.y,
          player.w,
          player.h,
          platform.x,
          platform.y,
          platform.w,
          platform.h,
        ),
    );
    const offset = platform.sinkOffset ?? 0;
    platform.sinkOffset = occupied
      ? Math.min(22, offset + 0.25 * k)
      : Math.max(0, offset - 0.2 * k);
    platform.y = platform.baseY + (platform.sinkOffset ?? 0);
  }
}

function updatePlayerEntity(
  state: MushroomRaftState,
  player: Player,
  input: MushroomRaftInput,
  k: number,
) {
  if (player.dead) return;

  const direction = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  if (direction !== 0) player.facing = direction as 1 | -1;
  const targetSpeed = direction * MOVE_SPEED;
  player.vx += (targetSpeed - player.vx) * Math.min(0.35 * k, 1);

  if (input.jump && !player.wasJumpHeld) {
    if (player.onGround || player.onRaftId) {
      const fragile = state.platforms.find(
        (platform) =>
          platform.breaksOnDoubleJump &&
          platform.jumpCount !== undefined &&
          overlaps(
            player.x,
            player.y,
            player.w,
            player.h,
            platform.x,
            platform.y,
            platform.w,
            platform.h,
          ),
      );
      if (fragile) {
        fragile.jumpCount = (fragile.jumpCount ?? 0) + 1;
        if ((fragile.jumpCount ?? 0) >= 2) {
          fragile.broken = true;
          setMessage(state, "浮台跳两次后消失了！");
        }
      }
      player.vy = JUMP_VELOCITY;
      player.onGround = false;
      player.onRaftId = null;
      player.doubleJumpUsed = false;
      state.mode = "land";
    } else if (player.canGlide && !player.doubleJumpUsed) {
      const fragile = state.platforms.find(
        (platform) =>
          platform.id === player.fragilePlatformId &&
          platform.breaksOnDoubleJump &&
          !platform.broken,
      );
      if (fragile) {
        fragile.broken = true;
        setMessage(state, "浮台第二跳后消失了！");
      }
      player.fragilePlatformId = null;
      player.vy = JUMP_VELOCITY * 0.92;
      player.doubleJumpUsed = true;
      state.mode = "land";
    }
  }
  player.wasJumpHeld = input.jump;

  if (input.dash && player.dashTimer <= 0) {
    const raft = state.rafts.find((entry) => entry.id === player.onRaftId);
    if (raft) {
      player.dashTimer = 45;
      player.invincible = Math.max(player.invincible, 45);
      raft.speed = Math.max(raft.speed, 4.8);
    } else {
      player.dashTimer = 28;
      player.invincible = Math.max(player.invincible, 28);
      player.vx = player.facing * 16;
    }
  }
  player.dashTimer = Math.max(0, player.dashTimer - k);
  player.invincible = Math.max(0, player.invincible - k);
  player.starTimer = Math.max(0, player.starTimer - k);
  player.shootCooldown = Math.max(0, player.shootCooldown - k);

  player.x += player.vx * k;
  collideHorizontal(state, player);
  player.x = clamp(player.x, 0, state.worldWidth - player.w);

  player.vy += GRAVITY * k;
  player.vy = Math.min(player.vy, 16);

  collideVertical(state, player, k);
  landOnRafts(state, player);

  if (player.y > state.worldHeight + 80) {
    damagePlayer(state, player);
    return;
  }

  if (player.y + player.h > WATER_Y + 10 && !player.onRaftId) {
    state.drownTimer += k;
    if (state.drownTimer > 42) {
      damagePlayer(state, player);
      state.drownTimer = 0;
    }
  } else {
    state.drownTimer = 0;
  }

  if (
    input.shoot &&
    player.canShoot &&
    player.waterAmmo > 0 &&
    player.shootCooldown <= 0
  ) {
    state.projectiles.push({
      id: uid("w"),
      kind: "water",
      x: player.facing === 1 ? player.x + player.w : player.x - 10,
      y: player.y + player.h * 0.45,
      vx: player.facing * 9,
      alive: true,
    });
    player.waterAmmo -= 1;
    player.shootCooldown = 16;
  }
}

function collectPipes(
  state: MushroomRaftState,
  down1: boolean,
  down2: boolean,
) {
  for (const platform of state.platforms) {
    if (platform.kind !== "pipe" || platform.used) continue;
    for (const player of activePlayers(state)) {
      const pressingDown = player === state.player ? down1 : down2;
      if (
        pressingDown &&
        overlaps(
          platform.x,
          platform.y,
          platform.w,
          platform.h,
          player.x,
          player.y,
          player.w,
          player.h,
        )
      ) {
        platform.used = true;
        state.coins += 20;
        state.score += 200;
        player.x += 180;
        player.invincible = 60;
        setMessage(state, "进入管道！+20 金币，向前传送");
        break;
      }
    }
  }
}

function updateDrops(state: MushroomRaftState, k: number) {
  state.dropTimer -= k;
  if (state.dropTimer <= 0) {
    const roll = Math.random();
    const kind: ItemKind =
      state.levelIndex === 5
        ? roll < 0.6
          ? "flower"
          : roll < 0.8
            ? "star"
            : "raftMushroom"
        : roll < 0.4
          ? "flower"
        : roll < 0.7
          ? "star"
          : "raftMushroom";
    let dropX = state.camera.x + 120 + Math.random() * 700;
    if (kind === "raftMushroom") {
      for (let attempt = 0; attempt < 20; attempt += 1) {
        if (
          !state.platforms.some(
            (platform) =>
              platform.kind === "ground" &&
              dropX > platform.x &&
              dropX < platform.x + platform.w,
          )
        ) {
          break;
        }
        dropX = state.camera.x + 120 + Math.random() * 700;
      }
    }
    state.items.push({
      id: uid("i"),
      kind,
      x: dropX,
      y: kind === "flower" ? 50 : WATER_Y - 50,
      w: 30,
      h: 32,
      taken: false,
      bob: 0,
      falling: kind === "flower",
      vy: kind === "flower" ? 0 : undefined,
    });
    state.dropTimer = 1800;
  }

  for (const item of state.items) {
    if (item.taken || !item.falling || item.vy === undefined) continue;
    item.vy = Math.min(2.5, item.vy + 0.04 * k);
    item.y += item.vy * k;
    let landed = false;
    for (const platform of solidPlatforms(state)) {
      if (
        item.x + item.w > platform.x &&
        item.x < platform.x + platform.w &&
        item.y + item.h >= platform.y &&
        item.y < platform.y
      ) {
        item.y = platform.y - item.h;
        item.falling = false;
        landed = true;
        break;
      }
    }
    if (!landed && item.y + item.h >= WATER_Y - 32) {
      item.y = WATER_Y - 60;
      item.falling = false;
    }
  }
}

function updateCheckpoint(state: MushroomRaftState) {
  const furthest = activePlayers(state).reduce(
    (best, player) => Math.max(best, player.x),
    0,
  );
  const mid = Math.floor(state.worldWidth * 0.42);
  if (furthest > mid && state.checkpoint < mid) {
    state.checkpoint = mid;
    setMessage(state, "存档点更新：漂流河段！");
  } else if (
    furthest > Math.floor(state.worldWidth * 0.72) &&
    state.checkpoint < Math.floor(state.worldWidth * 0.72)
  ) {
    state.checkpoint = Math.floor(state.worldWidth * 0.72);
    setMessage(state, "存档点更新：激流峡谷！");
  }
}

export function stepMushroomRaftGame(
  state: MushroomRaftState,
  input: MushroomRaftInput,
  dt: number,
  input2?: MushroomRaftInput,
) {
  if (state.status !== "playing") return state;

  const k = clamp(dt * 60, 0.1, 2);
  state.time += dt;
  state.messageTimer = Math.max(0, state.messageTimer - k);

  updateSinkingPlatforms(state, k);
  updatePlayerEntity(state, state.player, input, k);
  if (state.player2) {
    updatePlayerEntity(state, state.player2, input2 ?? IDLE_INPUT, k);
  }
  updateHazards(state, k);
  updateBoss(state, k);
  updateEnemies(state, k);
  updateProjectiles(state, k);
  updateRafts(state, k);
  updateDrops(state, k);
  for (const player of activePlayers(state)) {
    collectItems(state, player);
  }
  collectPipes(state, input.down, input2?.down ?? false);
  updateCheckpoint(state);

  const alivePlayers = activePlayers(state);
  const focusX =
    alivePlayers.length === 0
      ? state.player.x
      : alivePlayers.reduce((sum, entry) => sum + entry.x, 0) /
        alivePlayers.length;
  state.camera.x = clamp(
    focusX + state.player.w / 2 - RAFT_VIEW_WIDTH / 2,
    0,
    state.worldWidth - RAFT_VIEW_WIDTH,
  );

  if (
    state.player.x >= state.finishX &&
    (!state.boss || !state.boss.alive)
  ) {
    state.status = "won";
    const timeBonus = Math.max(0, 600 - Math.floor(state.time));
    state.score += 1000 + timeBonus;
    setMessage(state, "庆典蘑菇收集完成，恭喜通关！");
  }

  return state;
}
