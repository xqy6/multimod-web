import { RotateCcw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import {
  addRandomTile,
  createGrid,
  hasWon2048,
  isGameOver2048,
  move2048,
  type Direction2048,
  type Grid2048,
} from "@/lib/games/engine2048";

function tileColor(value: number): string {
  const colors: Record<number, string> = {
    0: "rgba(255,255,255,0.04)",
    2: "rgba(158,228,197,0.18)",
    4: "rgba(158,228,197,0.30)",
    8: "rgba(142,138,203,0.30)",
    16: "rgba(142,138,203,0.45)",
    32: "rgba(238,189,152,0.40)",
    64: "rgba(238,189,152,0.60)",
    128: "rgba(242,210,155,0.50)",
    256: "rgba(242,210,155,0.70)",
    512: "rgba(255,154,213,0.45)",
    1024: "rgba(255,154,213,0.65)",
    2048: "rgba(82,229,196,0.55)",
  };
  return colors[value] ?? "rgba(255,255,255,0.12)";
}

export function Game2048({
  best,
  level = 1,
  onGameOver,
}: {
  best: number;
  level?: number;
  onGameOver: (score: number) => void;
}) {
  const createLevelGrid = () => {
    let next = createGrid();
    for (let i = 0; i < level + 1; i += 1) next = addRandomTile(next);
    return next;
  };
  const [grid, setGrid] = useState<Grid2048>(createLevelGrid);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);

  const move = useCallback(
    (direction: Direction2048) => {
      if (gameOver) return;
      const result = move2048(grid, direction);
      if (!result.moved) return;
      const next = addRandomTile(result.grid);
      setGrid(next);
      setScore((current) => current + result.score);
      if (hasWon2048(next)) setWon(true);
      if (isGameOver2048(next)) setGameOver(true);
    },
    [gameOver, grid],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const map: Record<string, Direction2048> = {
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
        move(direction);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [move]);

  useEffect(() => {
    if (gameOver) onGameOver(score);
  }, [gameOver, onGameOver, score]);

  const reset = () => {
    setGrid(createLevelGrid());
    setScore(0);
    setGameOver(false);
    setWon(false);
  };

  return (
    <div className="flex flex-col items-center">
      <div className="flex w-full items-center justify-between gap-4">
        <div>
          <p className="text-xs text-mist-400">当前分数</p>
          <p className="text-3xl font-bold text-mist-100">{score}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-mist-400">最佳</p>
          <p className="text-3xl font-bold text-mint-300">
            {Math.max(best, score)}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={reset}>
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          重开
        </Button>
      </div>

      <div
        className="mt-5 grid w-full max-w-[420px] gap-2 rounded-card border border-white/10 bg-ink-900/60 p-3"
        style={{ gridTemplateColumns: "repeat(4, 1fr)" }}
      >
        {grid.flat().map((value, index) => (
          <div
            key={index}
            className="flex aspect-square items-center justify-center rounded-xl text-2xl font-bold text-mist-100"
            style={{ backgroundColor: tileColor(value) }}
          >
            {value !== 0 ? value : ""}
          </div>
        ))}
      </div>

      {won || gameOver ? (
        <p className="mt-5 rounded-xl bg-white/5 px-5 py-3 text-sm text-mist-200 ring-1 ring-white/10">
          {won ? "达成 2048！" : "游戏结束"} · 本局得分 {score}
        </p>
      ) : null}

      <div className="mt-6 grid grid-cols-3 gap-2 sm:hidden">
        <span />
        <Button size="sm" variant="ghost" onClick={() => move("up")}>
          ↑
        </Button>
        <span />
        <Button size="sm" variant="ghost" onClick={() => move("left")}>
          ←
        </Button>
        <Button size="sm" variant="ghost" onClick={() => move("down")}>
          ↓
        </Button>
        <Button size="sm" variant="ghost" onClick={() => move("right")}>
          →
        </Button>
      </div>
    </div>
  );
}
