import type { ProjectStatus } from "@shared";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

interface TableDefinition<Row, Insert, Update> {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
}

type SimpleTable<Row> = TableDefinition<Row, Partial<Row>, Partial<Row>>;

export interface Database {
  public: {
    Tables: {
      profiles: SimpleTable<{
        id: string;
        email: string | null;
        display_name: string | null;
        avatar_url: string | null;
        created_at: string;
      }>;
      projects: SimpleTable<{
        id: string;
        owner_id: string;
        title: string;
        vibe_prompt: string;
        style_params: Record<string, unknown> | null;
        modules: string[];
        status: ProjectStatus;
        created_at: string;
        updated_at: string;
      }>;
      assets: SimpleTable<{
        id: string;
        project_id: string;
        owner_id: string;
        kind: "image" | "text";
        name: string;
        storage_path: string | null;
        content: string | null;
        created_at: string;
      }>;
      rooms: SimpleTable<{
        id: string;
        name: string;
        slug: string | null;
        is_public: boolean;
        created_by: string;
        created_at: string;
      }>;
      room_members: SimpleTable<{
        room_id: string;
        user_id: string;
        role: "member" | "admin";
        joined_at: string;
        last_read_at: string | null;
      }>;
      messages: SimpleTable<{
        id: string;
        room_id: string;
        user_id: string;
        body: string;
        created_at: string;
      }>;
      generated_sites: SimpleTable<{
        id: string;
        project_id: string;
        owner_id: string;
        version: number;
        package_url: string | null;
        deploy_url: string | null;
        created_at: string;
      }>;
      scores: SimpleTable<{
        id: string;
        game_id: string;
        user_id: string;
        score: number;
        created_at: string;
      }>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
