import {
  apiRequest,
  clearServerSession,
  getServerToken,
  getStoredUser,
  setServerSession,
  shouldUseLocalBackend,
} from "@/lib/api";

export interface AppUser {
  id: string;
  email: string;
  display_name: string;
  role?: "user" | "admin";
  isAdmin?: boolean;
  isDemo: boolean;
}

export interface AuthResult {
  user: AppUser | null;
  error: string | null;
}

export interface ServerSession {
  user: AppUser | null;
}

export function toAppUser(user: AppUser): AppUser {
  return {
    id: String(user.id),
    email: String(user.email ?? ""),
    display_name: String(user.display_name ?? user.email?.split("@")[0] ?? "用户"),
    role: user.role === "admin" ? "admin" : "user",
    isAdmin: user.isAdmin === true || user.role === "admin",
    isDemo: false,
  };
}

export async function getSession(): Promise<{
  session: ServerSession | null;
  error: string | null;
}> {
  if (shouldUseLocalBackend()) return { session: null, error: null };
  if (!getServerToken()) return { session: null, error: null };
  try {
    const { user } = await apiRequest<{ user: AppUser }>("/api/auth/me");
    return { session: { user: toAppUser(user) }, error: null };
  } catch {
    clearServerSession();
    return { session: null, error: "登录已失效" };
  }
}

export function onAuthStateChange(
  callback: (session: ServerSession | null) => void,
) {
  if (typeof window === "undefined") {
    return { unsubscribe: () => undefined };
  }
  const emit = () => {
    const user = getStoredUser<AppUser>();
    callback(user ? { user: toAppUser(user) } : null);
  };
  window.addEventListener("multimod-server-auth", emit);
  window.addEventListener("storage", emit);
  return {
    unsubscribe: () => {
      window.removeEventListener("multimod-server-auth", emit);
      window.removeEventListener("storage", emit);
    },
  };
}

export async function signInWithPassword(
  email: string,
  password: string,
): Promise<AuthResult> {
  if (shouldUseLocalBackend()) {
    return { user: null, error: "当前离线，请使用离线浏览" };
  }
  try {
    const result = await apiRequest<{ user: AppUser; token: string }>(
      "/api/auth/login",
      {
        method: "POST",
        body: { email, password },
      },
    );
    const user = toAppUser(result.user);
    setServerSession(result.token, user);
    return { user, error: null };
  } catch (error) {
    return { user: null, error: (error as Error).message };
  }
}

export async function signUp(
  email: string,
  password: string,
  displayName: string,
): Promise<AuthResult> {
  if (shouldUseLocalBackend()) {
    return { user: null, error: "当前离线，请使用离线浏览" };
  }
  try {
    const result = await apiRequest<{ user: AppUser; token: string }>(
      "/api/auth/register",
      {
        method: "POST",
        body: { email, password, displayName },
      },
    );
    const user = toAppUser(result.user);
    setServerSession(result.token, user);
    return { user, error: null };
  } catch (error) {
    return { user: null, error: (error as Error).message };
  }
}

export async function signInWithMagicLink(
  _email: string,
): Promise<{ error: string | null }> {
  if (shouldUseLocalBackend()) {
    return { error: "当前离线，请使用离线浏览" };
  }
  return { error: "当前版本请使用密码登录或注册" };
}

export async function signOut(): Promise<void> {
  if (shouldUseLocalBackend()) {
    clearServerSession();
    return;
  }
  try {
    await apiRequest("/api/auth/logout", { method: "POST" });
  } catch {
    // ignore network failures while clearing local session
  }
  clearServerSession();
}
