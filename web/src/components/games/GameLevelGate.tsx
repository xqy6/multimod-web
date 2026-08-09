import { Gamepad2, Play } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/Button";

export interface GameLevelOption {
  label: string;
  hint: string;
}

export function GameLevelGate({
  title,
  description,
  levels,
  children,
}: {
  title: string;
  description: string;
  levels: GameLevelOption[];
  children: (level: number) => ReactNode;
}) {
  const [level, setLevel] = useState(1);
  const [started, setStarted] = useState(false);

  if (started) return children(level);

  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center rounded-panel border border-white/10 bg-white/[0.03] px-6 py-10 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-mint-300/15 text-mint-300 ring-1 ring-mint-300/20">
        <Gamepad2 className="h-7 w-7" aria-hidden="true" />
      </div>
      <h2 className="mt-5 text-2xl font-bold text-mist-100">{title}</h2>
      <p className="mt-3 max-w-md text-sm leading-6 text-mist-400">
        {description}
      </p>

      <div className="mt-6 grid w-full max-w-sm grid-cols-3 gap-2">
        {levels.map((option, index) => {
          const value = index + 1;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setLevel(value)}
              className={`rounded-xl border px-3 py-3 text-sm transition-colors ${
                level === value
                  ? "border-mint-300/40 bg-mint-300/10 text-mint-200"
                  : "border-white/10 bg-white/[0.03] text-mist-400 hover:bg-white/[0.07]"
              }`}
            >
              <span className="block font-bold">{option.label}</span>
              <span className="mt-1 block text-xs opacity-70">
                {option.hint}
              </span>
            </button>
          );
        })}
      </div>

      <Button className="mt-6" onClick={() => setStarted(true)}>
        <Play className="h-4 w-4" aria-hidden="true" />
        开始第 {level} 关
      </Button>
    </div>
  );
}
