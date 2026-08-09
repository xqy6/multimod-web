import { Bomb, Flag, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import {
  createMinesweeper,
  revealMineCell,
  toggleMineFlag,
  type MinesweeperState,
} from "@/lib/games/minesweeper";

const NUMBER_COLORS = [
  "",
  "#5cc8ff",
  "#7ddf6a",
  "#ff7b72",
  "#b392f0",
  "#ffb86c",
  "#79c0ff",
  "#f0f0f0",
  "#ffab70",
];

export function MinesweeperGame({
  level = 1,
  onGameOver,
}: {
  level?: number;
  onGameOver: (score: number) => void;
}) {
  const configs = [
    { rows: 9, cols: 9, mines: 10 },
    { rows: 12, cols: 12, mines: 22 },
    { rows: 16, cols: 16, mines: 45 },
  ];
  const config = configs[Math.min(level, 3) - 1] ?? configs[0];
  const [state, setState] = useState<MinesweeperState>(() =>
    createMinesweeper(config.rows, config.cols, config.mines),
  );
  const [elapsed, setElapsed] = useState(0);
  const submittedRef = useRef(false);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setElapsed((current) => current + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (state.status === "playing" || submittedRef.current) return;
    submittedRef.current = true;
    const score =
      state.status === "won"
        ? Math.max(100, 1200 - elapsed * 10)
        : Math.max(0, 200 - elapsed * 5);
    onGameOver(score);
  }, [elapsed, onGameOver, state.status]);

  const reset = () => {
    setState(createMinesweeper(config.rows, config.cols, config.mines));
    setElapsed(0);
    submittedRef.current = false;
  };

  return (
    <div className="flex flex-col items-center">
      <div className="flex w-full items-center justify-between gap-4">
        <div>
          <p className="text-xs text-mist-400">扫雷 · 9x9 · 10 雷</p>
          <p className="mt-1 text-sm text-mist-500">
            左键翻开，右键插旗，全部安全格翻开即获胜
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-mist-400">用时</p>
            <p className="text-xl font-bold text-mint-300">{elapsed}s</p>
          </div>
          <Button variant="ghost" size="sm" onClick={reset}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            重开
          </Button>
        </div>
      </div>

      <div
        className="mt-5 grid w-full max-w-[520px] gap-1"
        style={{ gridTemplateColumns: `repeat(${state.cols}, minmax(0, 1fr))` }}
      >
        {state.board.map((row, rowIndex) =>
          row.map((cell, colIndex) => {
            const revealed = cell.revealed;
            const showMine = revealed && cell.mine;
            return (
              <button
                key={`${rowIndex}-${colIndex}`}
                type="button"
                onClick={() => {
                  revealMineCell(state, rowIndex, colIndex);
                  setState({ ...state });
                }}
                onContextMenu={(event) => {
                  event.preventDefault();
                  toggleMineFlag(state, rowIndex, colIndex);
                  setState({ ...state });
                }}
                className={`flex aspect-square min-w-0 items-center justify-center rounded-md text-sm font-bold transition-colors sm:text-base ${
                  revealed
                    ? "bg-white/[0.06] text-mist-100"
                    : "bg-white/10 text-mist-300 ring-1 ring-white/10 hover:bg-white/20"
                }`}
                aria-label={`${rowIndex + 1} 行 ${colIndex + 1} 列${
                  cell.flagged ? " 已插旗" : ""
                }`}
              >
                {showMine ? (
                  <Bomb className="h-5 w-5 text-red-300" aria-hidden="true" />
                ) : cell.flagged ? (
                  <Flag className="h-5 w-5 text-amber-300" aria-hidden="true" />
                ) : revealed && cell.adjacent > 0 ? (
                  <span style={{ color: NUMBER_COLORS[cell.adjacent] }}>
                    {cell.adjacent}
                  </span>
                ) : null}
              </button>
            );
          }),
        )}
      </div>

      {state.status === "won" ? (
        <p className="mt-5 rounded-xl bg-emerald-300/10 px-5 py-3 text-sm text-emerald-200 ring-1 ring-emerald-300/20">
          全部安全格已翻开，通关！
        </p>
      ) : state.status === "lost" ? (
        <p className="mt-5 rounded-xl bg-red-300/10 px-5 py-3 text-sm text-red-200 ring-1 ring-red-300/20">
          踩到蘑菇雷了，再来一次。
        </p>
      ) : null}
    </div>
  );
}
