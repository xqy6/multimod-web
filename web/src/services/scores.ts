import type { ScoreEntry } from "@shared";

import { supabase } from "@/lib/supabase";

export type GameId = "2048" | "snake" | "tetris";

export type { ScoreEntry };

const DEMO_KEY = "multimod-demo-scores";

function readDemoScores(): Record<GameId, ScoreEntry[]> {
  try {
    const raw = localStorage.getItem(DEMO_KEY);
    return raw
      ? (JSON.parse(raw) as Record<GameId, ScoreEntry[]>)
      : { "2048": [], snake: [], tetris: [] };
  } catch {
    return { "2048": [], snake: [], tetris: [] };
  }
}

function writeDemoScores(scores: Record<GameId, ScoreEntry[]>) {
  localStorage.setItem(DEMO_KEY, JSON.stringify(scores));
}

export async function submitScore(
  gameId: GameId,
  userId: string,
  score: number,
  displayName?: string,
): Promise<{ error: string | null }> {
  if (!supabase) {
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
  const { error } = await supabase.from("scores").insert({
    game_id: gameId,
    user_id: userId,
    score,
  });
  return { error: error?.message ?? null };
}

export async function getBestScore(
  gameId: GameId,
  userId: string,
): Promise<{ score: number; error: string | null }> {
  if (!supabase) {
    const entry = readDemoScores()
      [gameId].filter((item) => item.user_id === userId)
      .sort((a, b) => b.score - a.score)[0];
    return { score: entry?.score ?? 0, error: null };
  }
  const { data, error } = await supabase
    .from("scores")
    .select("score")
    .eq("game_id", gameId)
    .eq("user_id", userId)
    .order("score", { ascending: false })
    .limit(1)
    .maybeSingle();
  return {
    score: data?.score ?? 0,
    error: error?.message ?? null,
  };
}

export async function getLeaderboard(
  gameId: GameId,
): Promise<{ data: ScoreEntry[]; error: string | null }> {
  if (!supabase) {
    return { data: readDemoScores()[gameId], error: null };
  }
  const { data, error } = await supabase
    .from("scores")
    .select("id, game_id, user_id, score, created_at, profiles(display_name)")
    .eq("game_id", gameId)
    .order("score", { ascending: false })
    .limit(20);
  const rows = (data as Array<Record<string, unknown>> | null) ?? [];
  const entries: ScoreEntry[] = rows.map((row) => ({
    id: String(row.id),
    game_id: gameId,
    user_id: String(row.user_id),
    score: Number(row.score),
    created_at: String(row.created_at),
    display_name: String(
      (row.profiles as { display_name?: string } | null)?.display_name ?? "",
    ),
  }));
  return { data: entries, error: error?.message ?? null };
}
