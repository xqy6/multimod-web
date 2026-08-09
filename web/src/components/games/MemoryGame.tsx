import { RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import {
  createMemoryGame,
  flipMemoryCard,
  resolveMemoryTurn,
  type MemoryState,
} from "@/lib/games/memory";

const CARD_FACES = ["🍄", "⭐", "🌊", "🍀", "🎈", "🐚", "🍎", "🌈"];

const EXTRA_FACES = Array.from({ length: 10 }, (_, index) =>
  String.fromCodePoint(0x1f334 + index),
);

function cardFace(value: number) {
  return value < 8
    ? CARD_FACES[value]
    : EXTRA_FACES[value - 8];
}

export function MemoryGame({
  level = 1,
  onGameOver,
}: {
  level?: number;
  onGameOver: (score: number) => void;
}) {
  const pairs = [8, 12, 18][Math.min(level, 3) - 1] ?? 8;
  const gridCols = [4, 6, 6][Math.min(level, 3) - 1] ?? 4;
  const [state, setState] = useState<MemoryState>(() =>
    createMemoryGame(pairs),
  );
  const stateRef = useRef(state);
  const [pending, setPending] = useState(false);
  const submittedRef = useRef(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(
    () => () => {
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    },
    [],
  );

  useEffect(() => {
    if (state.status !== "won" || submittedRef.current) return;
    submittedRef.current = true;
    onGameOver(Math.max(100, 800 - state.moves * 15));
  }, [onGameOver, state.moves, state.status]);

  const reset = () => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    const next = createMemoryGame(pairs);
    stateRef.current = next;
    setState(next);
    setPending(false);
    submittedRef.current = false;
  };

  const handleFlip = (index: number) => {
    if (pending) return;
    const current = stateRef.current;
    flipMemoryCard(current, index);
    setState({ ...current });
    if (current.secondIndex === null) return;

    setPending(true);
    timeoutRef.current = window.setTimeout(() => {
      resolveMemoryTurn(current);
      setState({ ...current });
      setPending(false);
      timeoutRef.current = null;
    }, 800);
  };

  return (
    <div className="flex flex-col items-center">
      <div className="flex w-full items-center justify-between gap-4">
        <div>
          <p className="text-xs text-mist-400">记忆翻牌 · 8 对</p>
          <p className="mt-1 text-sm text-mist-500">
            翻出相同图案配对，步数越少得分越高
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-mist-400">步数</p>
            <p className="text-xl font-bold text-mint-300">{state.moves}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={reset}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            重开
          </Button>
        </div>
      </div>

      <div
        className="mt-5 grid w-full max-w-[440px] gap-2"
        style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}
      >
        {state.cards.map((card, index) => (
          <button
            key={card.id}
            type="button"
            onClick={() => handleFlip(index)}
            disabled={pending || card.matched || card.flipped}
            className={`flex aspect-square min-w-0 items-center justify-center rounded-card border text-3xl transition-all sm:text-4xl ${
              card.matched
                ? "border-emerald-300/30 bg-emerald-300/10"
                : card.flipped
                  ? "border-white/15 bg-white/10"
                  : "border-white/10 bg-white/[0.04] hover:bg-white/10"
            }`}
            aria-label={`卡片 ${index + 1}${card.flipped ? " 已翻开" : ""}`}
          >
            {card.flipped || card.matched ? (
              <span aria-hidden="true">{cardFace(card.value)}</span>
            ) : null}
          </button>
        ))}
      </div>

      {state.status === "won" ? (
        <p className="mt-5 rounded-xl bg-emerald-300/10 px-5 py-3 text-sm text-emerald-200 ring-1 ring-emerald-300/20">
          全部配对完成，通关！
        </p>
      ) : null}
    </div>
  );
}
