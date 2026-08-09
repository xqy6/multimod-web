import type { ScoreEntry } from "@shared";

import { apiRequest, shouldUseLocalBackend } from "@/lib/api";

export type GameId =
  | "2048"
  | "snake"
  | "tetris"
  | "mushroom-raft"
  | "minesweeper"
  | "memory"
  | "whack-mole";

export type { ScoreEntry };

const DEMO_KEY = "multimod-demo-scores";

function readDemoScores(): Record<GameId, ScoreEntry[]> {
  try {
    const raw = localStorage.getItem(DEMO_KEY);
    return raw
      ? (JSON.parse(raw) as Record<GameId, ScoreEntry[]>)
      : {
          "2048": [],
          snake: [],
          tetris: [],
          "mushroom-raft": [],
          minesweeper: [],
          memory: [],
          "whack-mole": [],
        };
  } catch {
    return {
      "2048": [],
      snake: [],
      tetris: [],
      "mushroom-raft": [],
      minesweeper: [],
      memory: [],
      "whack-mole": [],
    };
  }
}

function writeDemoScores(scores: Record<GameId, ScoreEntry[]>) {
  localStorage.setItem(DEMO_KEY, JSON.stringify(scores));
}

function dedupeScores(entries: ScoreEntry[]): ScoreEntry[] {
  const bestByUser = new Map<string, ScoreEntry>();
  for (const entry of entries) {
    const current = bestByUser.get(entry.user_id);
    if (!current || entry.score > current.score) {
      bestByUser.set(entry.user_id, entry);
    }
  }
  return [...bestByUser.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);
}

export async function submitScore(
  gameId: GameId,
  userId: string,
  score: number,
  displayName?: string,
): Promise<{ error: string | null }> {
  if (shouldUseLocalBackend()) {
    const all = readDemoScores();
    all[gameId].push({
      id: crypto.randomUUID(),
      game_id: gameId,
      user_id: userId,
      score,
      created_at: new Date().toISOString(),
      display_name: displayName,
    });
    all[gameId].sort((a, b) => b.score - a.score);
    all[gameId] = all[gameId].slice(0, 20);
    writeDemoScores(all);
    return { error: null };
  }
  try {
    await apiRequest("/api/scores", {
      method: "POST",
      body: { game_id: gameId, score },
    });
    return { error: null };
  } catch (error) {
    return { error: (error as Error).message };
  }
}

export async function getBestScore(
  gameId: GameId,
  userId: string,
): Promise<{ score: number; error: string | null }> {
  if (shouldUseLocalBackend()) {
    const entry = readDemoScores()
      [gameId].filter((item) => item.user_id === userId)
      .sort((a, b) => b.score - a.score)[0];
    return { score: entry?.score ?? 0, error: null };
  }
  try {
    const { score } = await apiRequest<{ score: number }>(
      `/api/scores/best?game_id=${gameId}`,
    );
    return { score, error: null };
  } catch (error) {
    return { score: 0, error: (error as Error).message };
  }
}

export async function getLeaderboard(
  gameId: GameId,
): Promise<{ data: ScoreEntry[]; error: string | null }> {
  if (shouldUseLocalBackend()) {
    return { data: dedupeScores(readDemoScores()[gameId]), error: null };
  }
  try {
    const { data } = await apiRequest<{ data: ScoreEntry[] }>(
      `/api/scores/leaderboard?game_id=${gameId}`,
    );
    return { data: dedupeScores(data), error: null };
  } catch (error) {
    return { data: [], error: (error as Error).message };
  }
}
