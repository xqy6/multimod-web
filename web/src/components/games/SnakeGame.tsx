import { Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import {
  changeSnakeDirection,
  createSnake,
  stepSnake,
  type SnakeDirection,
  type SnakeState,
} from "@/lib/games/snake";

const CELL_SIZE = 22;

export function SnakeGame({
  best,
  onGameOver,
}: {
  best: number;
  onGameOver: (score: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<SnakeState>(() => createSnake());
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setState((current) => (paused ? current : stepSnake(current)));
    }, 120);
    return () => window.clearInterval(timer);
  }, [paused]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const map: Record<string, SnakeDirection> = {
        ArrowUp: "up",
        ArrowDown: "down",
        ArrowLeft: "left",
        ArrowRight: "right",
        w: "up",
        s: "down",
        a: "left",
        d: "right",
        W: "up",
        S: "down",
        A: "left",
        D: "right",
      };
      const direction = map[event.key];
      if (direction) {
        event.preventDefault();
        setState((current) => changeSnakeDirection(current, direction));
      } else if (event.key === " ") {
        event.preventDefault();
        setPaused((current) => !current);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#0c0e14";
    context.fillRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < state.height; y += 1) {
      for (let x = 0; x < state.width; x += 1) {
        context.fillStyle = "rgba(255,255,255,0.025)";
        context.fillRect(
          x * CELL_SIZE,
          y * CELL_SIZE,
          CELL_SIZE - 1,
          CELL_SIZE - 1,
        );
      }
    }

    context.fillStyle = "#ff9ad5";
    context.beginPath();
    context.arc(
      state.food.x * CELL_SIZE + CELL_SIZE / 2,
      state.food.y * CELL_SIZE + CELL_SIZE / 2,
      CELL_SIZE / 3,
      0,
      Math.PI * 2,
    );
    context.fill();

    state.snake.forEach((point, index) => {
      context.fillStyle = index === 0 ? "#9ee4c5" : "#6fcba4";
      context.fillRect(
        point.x * CELL_SIZE,
        point.y * CELL_SIZE,
        CELL_SIZE - 1,
        CELL_SIZE - 1,
      );
    });
  }, [state]);

  useEffect(() => {
    if (state.gameOver) onGameOver(state.score);
  }, [onGameOver, state.gameOver, state.score]);

  const reset = () => {
    setState(createSnake());
    setPaused(false);
  };

  return (
    <div className="flex flex-col items-center">
      <div className="flex w-full items-center justify-between gap-4">
        <div>
          <p className="text-xs text-mist-400">当前分数</p>
          <p className="text-3xl font-bold text-mist-100">{state.score}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-mist-400">最佳</p>
          <p className="text-3xl font-bold text-mint-300">
            {Math.max(best, state.score)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPaused((current) => !current)}
            aria-label={paused ? "继续" : "暂停"}
          >
            {paused ? (
              <Play className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Pause className="h-4 w-4" aria-hidden="true" />
            )}
          </Button>
          <Button variant="ghost" size="sm" onClick={reset}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            重开
          </Button>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={state.width * CELL_SIZE}
        height={state.height * CELL_SIZE}
        className="mt-5 w-full max-w-[440px] rounded-card border border-white/10"
      />

      {state.gameOver ? (
        <p className="mt-5 rounded-xl bg-white/5 px-5 py-3 text-sm text-mist-200 ring-1 ring-white/10">
          游戏结束 · 本局得分 {state.score}
        </p>
      ) : null}

      <div className="mt-6 grid grid-cols-3 gap-2 sm:hidden">
        <span />
        <Button
          size="sm"
          variant="ghost"
          onClick={() =>
            setState((current) => changeSnakeDirection(current, "up"))
          }
        >
          ↑
        </Button>
        <span />
        <Button
          size="sm"
          variant="ghost"
          onClick={() =>
            setState((current) => changeSnakeDirection(current, "left"))
          }
        >
          ←
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() =>
            setState((current) => changeSnakeDirection(current, "down"))
          }
        >
          ↓
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() =>
            setState((current) => changeSnakeDirection(current, "right"))
          }
        >
          →
        </Button>
      </div>
    </div>
  );
}
