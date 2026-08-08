import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";

export interface AppUser {
  id: string;
  email: string;
  display_name: string;
  isDemo: boolean;
}

export interface AuthResult {
  user: AppUser | null;
  error: string | null;
}

function toAppUser(session: Session | null): AppUser | null {
  if (!session?.user) return null;
  const meta = session.user.user_metadata ?? {};
  return {
    id: session.user.id,
    email: session.user.email ?? "",
    display_name:
      typeof meta.display_name === "string"
        ? meta.display_name
        : (session.user.email?.split("@")[0] ?? "用户"),
    isDemo: false,
  };
}

export async function getSession(): Promise<{
  session: Session | null;
  error: string | null;
}> {
  if (!supabase) return { session: null, error: "Supabase 未配置" };
  const { data, error } = await supabase.auth.getSession();
  return { session: data.session, error: error?.message ?? null };
}

export function onAuthStateChange(callback: (session: Session | null) => void) {
  if (!supabase) return { unsubscribe: () => undefined };
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
  return data.subscription;
}

export async function signInWithPassword(
  email: string,
  password: string,
): Promise<AuthResult> {
  if (!supabase) return { user: null, error: "Supabase 未配置" };
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return {
    user: toAppUser(data.session),
    error: error?.message ?? null,
  };
}

export async function signUp(
  email: string,
  password: string,
  displayName: string,
): Promise<AuthResult> {
  if (!supabase) return { user: null, error: "Supabase 未配置" };
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  });
  return {
    user: toAppUser(data.session),
    error: error?.message ?? null,
  };
}

export async function signInWithMagicLink(
  email: string,
): Promise<{ error: string | null }> {
  if (!supabase) return { error: "Supabase 未配置" };
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  return { error: error?.message ?? null };
}

export async function signOut(): Promise<void> {
  await supabase?.auth.signOut();
}

export { toAppUser };
