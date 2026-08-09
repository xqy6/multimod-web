import { Trophy } from "lucide-react";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { Button } from "@/components/ui/Button";
import { Game2048 } from "@/components/games/Game2048";
import { GameLevelGate } from "@/components/games/GameLevelGate";
import { GameStartGate } from "@/components/games/GameStartGate";
import { MemoryGame } from "@/components/games/MemoryGame";
import { MinesweeperGame } from "@/components/games/MinesweeperGame";
import { SnakeGame } from "@/components/games/SnakeGame";
import { TetrisGame } from "@/components/games/TetrisGame";
import { WhackAMoleGame } from "@/components/games/WhackAMoleGame";
import {
  getBestScore,
  getLeaderboard,
  submitScore,
  type GameId,
  type ScoreEntry,
} from "@/services/scores";
import { useAuthStore } from "@/stores/auth";

const MushroomRaftGame = lazy(() =>
  import("@/components/games/MushroomRaftGame").then((module) => ({
    default: module.MushroomRaftGame,
  })),
);

const games: { id: GameId; label: string; hint: string }[] = [
  {
    id: "mushroom-raft",
    label: "蘑菇漂流",
    hint: "单人/1P：WASD+W/J/K；2P：方向键+↑/1/2；管道：S/↓",
  },
  {
    id: "minesweeper",
    label: "扫雷",
    hint: "左键翻开，右键插旗",
  },
  {
    id: "memory",
    label: "记忆翻牌",
    hint: "翻牌配对，步数越少越好",
  },
  {
    id: "whack-mole",
    label: "打地鼠",
    hint: "30 秒，点地鼠加分，点炸弹扣分",
  },
  { id: "2048", label: "2048", hint: "方向键或 WASD 移动" },
  { id: "snake", label: "贪吃蛇", hint: "方向键控制，空格暂停" },
  { id: "tetris", label: "俄罗斯方块", hint: "←→移动，↑旋转，空格硬降" },
];

const levelOptions: Record<string, { label: string; hint: string }[]> = {
  minesweeper: [
    { label: "第 1 关", hint: "9x9 · 10 雷" },
    { label: "第 2 关", hint: "12x12 · 22 雷" },
    { label: "第 3 关", hint: "16x16 · 45 雷" },
  ],
  memory: [
    { label: "第 1 关", hint: "8 对" },
    { label: "第 2 关", hint: "12 对" },
    { label: "第 3 关", hint: "18 对" },
  ],
  "whack-mole": [
    { label: "第 1 关", hint: "30 秒 · 普通" },
    { label: "第 2 关", hint: "20 秒 · 更快" },
    { label: "第 3 关", hint: "15 秒 · 极速" },
  ],
  "2048": [
    { label: "第 1 关", hint: "2 个初始数字" },
    { label: "第 2 关", hint: "3 个初始数字" },
    { label: "第 3 关", hint: "4 个初始数字" },
  ],
  snake: [
    { label: "第 1 关", hint: "20x20 · 慢速" },
    { label: "第 2 关", hint: "16x16 · 中速" },
    { label: "第 3 关", hint: "12x12 · 高速" },
  ],
  tetris: [
    { label: "第 1 关", hint: "普通下落" },
    { label: "第 2 关", hint: "更快下落" },
    { label: "第 3 关", hint: "极速下落" },
  ],
};

export default function GamesPage() {
  const user = useAuthStore((state) => state.user);
  const [activeGame, setActiveGame] = useState<GameId>("mushroom-raft");
  const [best, setBest] = useState(0);
  const [leaderboard, setLeaderboard] = useState<ScoreEntry[]>([]);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const loadScores = useCallback(async () => {
    const userId = user?.id ?? "demo-user";
    setLeaderboardError(null);
    const [bestResult, leaderboardResult] = await Promise.all([
      getBestScore(activeGame, userId),
      getLeaderboard(activeGame),
    ]);
    setBest(bestResult.score);
    if (leaderboardResult.error) {
      setLeaderboardError(leaderboardResult.error);
      setLeaderboard([]);
    } else {
      setLeaderboardError(null);
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

  const renderGame = () => {
    const meta = games.find((game) => game.id === activeGame);
    const gate = (node: ReactNode) => (
      <GameStartGate
        key={activeGame}
        title={meta?.label ?? "小游戏"}
        description={meta?.hint ?? ""}
      >
        {node}
      </GameStartGate>
    );
    const levelGate = (
      render: (level: number) => ReactNode,
      levels: { label: string; hint: string }[],
    ) => (
      <GameLevelGate
        key={activeGame}
        title={meta?.label ?? "小游戏"}
        description={meta?.hint ?? ""}
        levels={levels}
      >
        {render}
      </GameLevelGate>
    );
    switch (activeGame) {
      case "mushroom-raft":
        return gate(
          <Suspense
            fallback={
              <div className="py-20 text-center text-sm text-mist-400">
                加载中...
              </div>
            }
          >
            <MushroomRaftGame onGameOver={handleGameOver} />
          </Suspense>,
        );
      case "minesweeper":
        return levelGate(
          (level) => (
            <MinesweeperGame
              key={level}
              level={level}
              onGameOver={handleGameOver}
            />
          ),
          levelOptions.minesweeper,
        );
      case "memory":
        return levelGate(
          (level) => (
            <MemoryGame key={level} level={level} onGameOver={handleGameOver} />
          ),
          levelOptions.memory,
        );
      case "whack-mole":
        return levelGate(
          (level) => (
            <WhackAMoleGame
              key={level}
              level={level}
              onGameOver={handleGameOver}
            />
          ),
          levelOptions["whack-mole"],
        );
      case "2048":
        return levelGate(
          (level) => (
            <Game2048
              key={level}
              best={best}
              level={level}
              onGameOver={handleGameOver}
            />
          ),
          levelOptions["2048"],
        );
      case "snake":
        return levelGate(
          (level) => (
            <SnakeGame
              key={level}
              best={best}
              level={level}
              onGameOver={handleGameOver}
            />
          ),
          levelOptions.snake,
        );
      case "tetris":
        return levelGate(
          (level) => (
            <TetrisGame key={level} level={level} onGameOver={handleGameOver} />
          ),
          levelOptions.tetris,
        );
      default:
        return levelGate(
          (level) => (
            <Game2048
              key={level}
              best={best}
              level={level}
              onGameOver={handleGameOver}
            />
          ),
          levelOptions["2048"],
        );
    }
  };

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
        <p className="mt-2 text-xs text-mist-500">
          全部游戏本地运行，PWA 首次加载后断网也能玩。
        </p>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="rounded-panel border border-white/10 bg-white/[0.03] p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="grid w-full grid-cols-2 gap-1 rounded-2xl bg-white/5 p-1 ring-1 ring-white/10 sm:grid-cols-4">
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
            {renderGame()}
          </div>
        </section>

        <aside className="rounded-panel border border-white/10 bg-white/[0.03] p-6">
          <div className="flex items-center gap-2 text-mint-300">
            <Trophy className="h-4 w-4" aria-hidden="true" />
            <h2 className="text-base font-bold">排行榜</h2>
          </div>
          {leaderboardError ? (
            <div className="mt-6">
              <p className="text-sm leading-6 text-red-200">
                排行榜加载失败：{leaderboardError}
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-3"
                onClick={() => setReloadKey((current) => current + 1)}
              >
                重试
              </Button>
            </div>
          ) : leaderboard.length === 0 ? (
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
