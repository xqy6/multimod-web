import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseEnabled =
  import.meta.env.MODE !== "test" &&
  Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient<Database> | null =
  supabaseEnabled
    ? createClient<Database>(supabaseUrl!, supabaseAnonKey!)
    : null;

export const isSupabaseConfigured = supabase !== null;

if (!isSupabaseConfigured && typeof window !== "undefined") {
  console.warn(
    "Supabase 未配置：请在 .env.local 中填写 VITE_SUPABASE_URL 与 VITE_SUPABASE_ANON_KEY。",
  );
}
