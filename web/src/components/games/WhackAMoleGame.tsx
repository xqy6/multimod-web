import { RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import {
  createWhackAMole,
  stepWhackAMole,
  whackMole,
  type WhackAMoleState,
} from "@/lib/games/whackAMole";

export function WhackAMoleGame({
  level = 1,
  onGameOver,
}: {
  level?: number;
  onGameOver: (score: number) => void;
}) {
  const duration = [30, 20, 15][Math.min(level, 3) - 1] ?? 30;
  const speed = [1, 1.4, 1.9][Math.min(level, 3) - 1] ?? 1;
  const [state, setState] = useState<WhackAMoleState>(() =>
    createWhackAMole(duration, speed),
  );
  const stateRef = useRef(state);
  const submittedRef = useRef(false);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const current = stateRef.current;
      if (current.status === "done") return;
      stepWhackAMole(current, 0.1);
      setState({ ...current });
    }, 100);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (state.status !== "done" || submittedRef.current) return;
    submittedRef.current = true;
    onGameOver(state.score);
  }, [onGameOver, state.score, state.status]);

  const reset = () => {
    const next = createWhackAMole(duration, speed);
    stateRef.current = next;
    setState(next);
    submittedRef.current = false;
  };

  return (
    <div className="flex flex-col items-center">
      <div className="flex w-full items-center justify-between gap-4">
        <div>
          <p className="text-xs text-mist-400">打地鼠 · 30 秒</p>
          <p className="mt-1 text-sm text-mist-500">
            点到地鼠 +10，点到炸弹 -5，别手滑
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-mist-400">剩余</p>
            <p className="text-xl font-bold text-mint-300">
              {Math.ceil(state.timeLeft)}s
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={reset}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            重开
          </Button>
        </div>
      </div>

      <div className="mt-5 w-full max-w-[420px]">
        <div className="grid grid-cols-3 gap-3">
          {state.holes.map((hole, index) => (
            <button
              key={hole.id}
              type="button"
              onClick={() => {
                whackMole(stateRef.current, index);
                setState({ ...stateRef.current });
              }}
              className="relative flex aspect-square items-end justify-center overflow-hidden rounded-full border border-white/10 bg-gradient-to-b from-[#1b241c] to-[#0c120e] p-2"
              aria-label={`洞口 ${index + 1}`}
            >
              <span className="absolute bottom-3 h-2 w-4/5 rounded-[50%] bg-black/40 blur-sm" />
              <span
                className={`relative flex h-16 w-16 items-center justify-center rounded-full text-4xl transition-transform ${
                  hole.active ? "translate-y-0 scale-100" : "translate-y-10 scale-75 opacity-0"
                }`}
              >
                {hole.kind === "mole" ? "🐹" : "💣"}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-center gap-6 text-sm text-mist-300">
          <span>
            得分 <b className="text-mint-300">{state.score}</b>
          </span>
          <span>
            命中 <b className="text-emerald-300">{state.hits}</b>
          </span>
          <span>
            失误 <b className="text-red-300">{state.misses}</b>
          </span>
        </div>
      </div>

      {state.status === "done" ? (
        <p className="mt-5 rounded-xl bg-emerald-300/10 px-5 py-3 text-sm text-emerald-200 ring-1 ring-emerald-300/20">
          时间到，本局得分 {state.score}
        </p>
      ) : null}
    </div>
  );
}
