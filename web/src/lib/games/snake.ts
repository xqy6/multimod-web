export interface Point {
  x: number;
  y: number;
}

export type SnakeDirection = "up" | "down" | "left" | "right";

export interface SnakeState {
  width: number;
  height: number;
  snake: Point[];
  direction: SnakeDirection;
  nextDirection: SnakeDirection;
  food: Point;
  score: number;
  gameOver: boolean;
}

function spawnFood(
  width: number,
  height: number,
  snake: Point[],
): Point {
  const occupied = new Set(snake.map((point) => `${point.x},${point.y}`));
  const empty: Point[] = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!occupied.has(`${x},${y}`)) empty.push({ x, y });
    }
  }
  return empty[Math.floor(Math.random() * empty.length)] ?? { x: 0, y: 0 };
}

export function createSnake(
  width = 20,
  height = 20,
): SnakeState {
  const snake = [
    { x: Math.floor(width / 2), y: Math.floor(height / 2) },
    { x: Math.floor(width / 2) - 1, y: Math.floor(height / 2) },
    { x: Math.floor(width / 2) - 2, y: Math.floor(height / 2) },
  ];
  return {
    width,
    height,
    snake,
    direction: "right",
    nextDirection: "right",
    food: spawnFood(width, height, snake),
    score: 0,
    gameOver: false,
  };
}

export function changeSnakeDirection(
  state: SnakeState,
  direction: SnakeDirection,
): SnakeState {
  const opposites: Record<SnakeDirection, SnakeDirection> = {
    up: "down",
    down: "up",
    left: "right",
    right: "left",
  };
  if (opposites[direction] === state.direction) return state;
  return { ...state, nextDirection: direction };
}

export function stepSnake(state: SnakeState): SnakeState {
  if (state.gameOver) return state;
  const direction = state.nextDirection;
  const head = state.snake[0];
  const nextHead =
    direction === "up"
      ? { x: head.x, y: head.y - 1 }
      : direction === "down"
        ? { x: head.x, y: head.y + 1 }
        : direction === "left"
          ? { x: head.x - 1, y: head.y }
          : { x: head.x + 1, y: head.y };

  if (
    nextHead.x < 0 ||
    nextHead.y < 0 ||
    nextHead.x >= state.width ||
    nextHead.y >= state.height
  ) {
    return { ...state, gameOver: true };
  }

  const willEat =
    nextHead.x === state.food.x && nextHead.y === state.food.y;
  const bodyToCheck = willEat ? state.snake : state.snake.slice(0, -1);
  if (
    bodyToCheck.some((point) => point.x === nextHead.x && point.y === nextHead.y)
  ) {
    return { ...state, gameOver: true };
  }

  const snake = [nextHead, ...state.snake];
  if (!willEat) snake.pop();
  return {
    ...state,
    snake,
    direction,
    score: willEat ? state.score + 1 : state.score,
    food: willEat
      ? spawnFood(state.width, state.height, snake)
      : state.food,
  };
}
