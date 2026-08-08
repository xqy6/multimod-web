export type ThemeDensity = "compact" | "comfortable" | "airy";
export type ThemeMotion = "subtle" | "medium" | "high";

export interface ThemeConfig {
  name: string;
  background: string;
  surface: string;
  text: string;
  muted: string;
  primary: string;
  secondary: string;
  accent: string;
  radius: number;
  density: ThemeDensity;
  motion: ThemeMotion;
  font: string;
}

export type ProjectStatus =
  | "draft"
  | "generating"
  | "preview"
  | "exported";

export interface Project {
  id: string;
  title: string;
  vibe_prompt: string;
  modules: string[];
  style_params: Record<string, unknown> | null;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

export interface ChatRoom {
  id: string;
  name: string;
  slug: string | null;
  created_by: string;
  created_at: string;
  member_count?: number;
}

export interface ChatMember {
  room_id: string;
  user_id: string;
  display_name?: string;
  role: "member" | "admin";
  joined_at: string;
  typing?: boolean;
}

export interface ChatMessage {
  id: string;
  room_id: string;
  user_id: string;
  body: string;
  display_name?: string;
  created_at: string;
}

export interface Asset {
  id: string;
  project_id: string;
  owner_id: string;
  kind: "image" | "text";
  name: string;
  storage_path: string | null;
  content: string | null;
  dataUrl?: string;
  created_at: string;
}

export interface ScoreEntry {
  id: string;
  game_id: string;
  user_id: string;
  score: number;
  created_at: string;
  display_name?: string;
}
