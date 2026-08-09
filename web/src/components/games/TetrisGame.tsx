import { Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import {
  createTetris,
  dropTetris,
  moveTetris,
  rotateTetris,
  stepTetris,
  TETRIS_HEIGHT,
  TETRIS_WIDTH,
  type TetrisState,
} from "@/lib/games/tetris";

const CELL_SIZE = 26;

export function TetrisGame({
  level = 1,
  onGameOver,
}: {
  level?: number;
  onGameOver: (score: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const speed = [600, 400, 250][Math.min(level, 3) - 1] ?? 600;
  const [state, setState] = useState<TetrisState>(() => createTetris());
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setState((current) => (paused ? current : stepTetris(current)));
    }, speed);
    return () => window.clearInterval(timer);
  }, [paused, speed]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setState((current) => moveTetris(current, -1));
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        setState((current) => moveTetris(current, 1));
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        setState((current) => stepTetris(current));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setState((current) => rotateTetris(current));
      } else if (event.key === " ") {
        event.preventDefault();
        setState((current) => dropTetris(current));
      } else if (event.key === "p" || event.key === "P") {
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
    context.fillStyle = "#0c0e14";
    context.fillRect(0, 0, canvas.width, canvas.height);

    state.board.forEach((row, y) => {
      row.forEach((cell, x) => {
        context.fillStyle = cell ?? "rgba(255,255,255,0.025)";
        context.fillRect(
          x * CELL_SIZE,
          y * CELL_SIZE,
          CELL_SIZE - 1,
          CELL_SIZE - 1,
        );
      });
    });

    state.piece.shape.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value === 0) return;
        context.fillStyle = state.piece.color;
        context.fillRect(
          (state.piece.x + x) * CELL_SIZE,
          (state.piece.y + y) * CELL_SIZE,
          CELL_SIZE - 1,
          CELL_SIZE - 1,
        );
      });
    });
  }, [state]);

  useEffect(() => {
    if (state.gameOver) onGameOver(state.score);
  }, [onGameOver, state.gameOver, state.score]);

  const reset = () => {
    setState(createTetris());
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
          <p className="text-xs text-mist-400">消除行</p>
          <p className="text-3xl font-bold text-mint-300">{state.lines}</p>
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
        width={TETRIS_WIDTH * CELL_SIZE}
        height={TETRIS_HEIGHT * CELL_SIZE}
        className="mt-5 rounded-card border border-white/10"
        style={{ maxHeight: 520 }}
      />

      {state.gameOver ? (
        <p className="mt-5 rounded-xl bg-white/5 px-5 py-3 text-sm text-mist-200 ring-1 ring-white/10">
          游戏结束 · 本局得分 {state.score}
        </p>
      ) : null}

      <div className="mt-6 grid grid-cols-3 gap-2 sm:hidden">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setState((current) => moveTetris(current, -1))}
        >
          ←
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setState((current) => rotateTetris(current))}
        >
          ↻
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setState((current) => moveTetris(current, 1))}
        >
          →
        </Button>
        <span />
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setState((current) => stepTetris(current))}
        >
          ↓
        </Button>
        <span />
      </div>
    </div>
  );
}
