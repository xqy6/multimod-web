import { Gamepad2, Play } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/Button";

export function GameStartGate({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  const [started, setStarted] = useState(false);

  if (started) return children;

  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center rounded-panel border border-white/10 bg-white/[0.03] px-6 py-10 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-mint-300/15 text-mint-300 ring-1 ring-mint-300/20">
        <Gamepad2 className="h-7 w-7" aria-hidden="true" />
      </div>
      <h2 className="mt-5 text-2xl font-bold text-mist-100">{title}</h2>
      <p className="mt-3 max-w-md text-sm leading-6 text-mist-400">
        {description}
      </p>
      <p className="mt-4 text-xs text-mist-500">本地运行，断网也能玩</p>
      <Button className="mt-6" onClick={() => setStarted(true)}>
        <Play className="h-4 w-4" aria-hidden="true" />
        开始游戏
      </Button>
    </div>
  );
}
