import { Trophy } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Game2048 } from "@/components/games/Game2048";
import { SnakeGame } from "@/components/games/SnakeGame";
import { TetrisGame } from "@/components/games/TetrisGame";
import {
  getBestScore,
  getLeaderboard,
  submitScore,
  type GameId,
  type ScoreEntry,
} from "@/services/scores";
import { useAuthStore } from "@/stores/auth";

const games: { id: GameId; label: string; hint: string }[] = [
  { id: "2048", label: "2048", hint: "方向键或 WASD 移动" },
  { id: "snake", label: "贪吃蛇", hint: "方向键控制，空格暂停" },
  { id: "tetris", label: "俄罗斯方块", hint: "←→移动，↑旋转，空格硬降" },
];

export default function GamesPage() {
  const user = useAuthStore((state) => state.user);
  const [activeGame, setActiveGame] = useState<GameId>("2048");
  const [best, setBest] = useState(0);
  const [leaderboard, setLeaderboard] = useState<ScoreEntry[]>([]);
  const [reloadKey, setReloadKey] = useState(0);

  const loadScores = useCallback(async () => {
    const userId = user?.id ?? "demo-user";
    const [bestResult, leaderboardResult] = await Promise.all([
      getBestScore(activeGame, userId),
      getLeaderboard(activeGame),
    ]);
    setBest(bestResult.score);
    if (!leaderboardResult.error) {
      setLeaderboard(leaderboardResult.data);
    }
  }, [activeGame, user?.id]);

  useEffect(() => {
    void loadScores();
  }, [loadScores, reloadKey]);

  const handleGameOver = useCallback(
    async (score: number) => {
      await submitScore(
        activeGame,
        user?.id ?? "demo-user",
        score,
        user?.display_name ?? "你",
      );
      setReloadKey((current) => current + 1);
    },
    [activeGame, user?.display_name, user?.id],
  );

  return (
    <div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mint-300">
          休闲小游戏中心
        </p>
        <h1 className="mt-3 text-3xl font-bold sm:text-4xl">选择一款游戏</h1>
        <p className="mt-3 text-sm leading-6 text-mist-400">
          键盘和移动端触控都支持，分数会自动写入排行榜。
        </p>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="rounded-panel border border-white/10 bg-white/[0.03] p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="grid w-full grid-cols-3 gap-1 rounded-full bg-white/5 p-1 ring-1 ring-white/10 sm:w-auto">
              {games.map((game) => (
                <button
                  key={game.id}
                  type="button"
                  onClick={() => setActiveGame(game.id)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    activeGame === game.id
                      ? "bg-mint-300 text-ink-950"
                      : "text-mist-400 hover:text-mist-100"
                  }`}
                >
                  {game.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-mist-500">
              {games.find((game) => game.id === activeGame)?.hint}
            </p>
          </div>

          <div className="mt-6">
            {activeGame === "2048" ? (
              <Game2048 best={best} onGameOver={handleGameOver} />
            ) : activeGame === "snake" ? (
              <SnakeGame best={best} onGameOver={handleGameOver} />
            ) : (
              <TetrisGame onGameOver={handleGameOver} />
            )}
          </div>
        </section>

        <aside className="rounded-panel border border-white/10 bg-white/[0.03] p-6">
          <div className="flex items-center gap-2 text-mint-300">
            <Trophy className="h-4 w-4" aria-hidden="true" />
            <h2 className="text-base font-bold">排行榜</h2>
          </div>
          {leaderboard.length === 0 ? (
            <p className="mt-6 text-sm leading-6 text-mist-400">
              还没有记录，玩一局成为第一名吧。
            </p>
          ) : (
            <ol className="mt-5 space-y-2">
              {leaderboard.map((entry, index) => (
                <li
                  key={entry.id}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3"
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      index === 0
                        ? "bg-amber-300/20 text-amber-300"
                        : "bg-white/5 text-mist-300"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-mist-200">
                    {entry.display_name ||
                      (entry.user_id === user?.id ? "你" : "玩家")}
                  </span>
                  <span className="text-sm font-bold text-mint-300">
                    {entry.score}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </aside>
      </div>
    </div>
  );
}
