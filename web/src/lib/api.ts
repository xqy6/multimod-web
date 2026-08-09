import { serverApiUrl } from "@/lib/config";
import { reportError } from "@/lib/reportError";

export { serverApiUrl };

export const isServerBackend =
  import.meta.env.MODE !== "test" && Boolean(serverApiUrl);

export function isOfflineMode(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

export function shouldUseLocalBackend(): boolean {
  return !isServerBackend || isOfflineMode();
}

const TOKEN_KEY = "multimod-server-token";
const USER_KEY = "multimod-server-user";

export function getServerToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getStoredUser<T>(): T | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function setServerSession(token: string, user: unknown) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new CustomEvent("multimod-server-auth"));
}

export function clearServerSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.dispatchEvent(new CustomEvent("multimod-server-auth"));
}

interface ApiOptions {
  method?: string;
  body?: unknown;
  headers?: HeadersInit;
}

export async function apiRequest<T>(
  path: string,
  options: ApiOptions = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  const token = getServerToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let body: BodyInit | null = null;
  if (options.body instanceof FormData) {
    body = options.body;
  } else if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(options.body);
  }

  let response: Response;
  try {
    response = await fetch(`${serverApiUrl}${path}`, {
      method: options.method ?? "GET",
      headers,
      body,
    });
  } catch (error) {
    reportError(error, "api.fetch", { endpoint: path });
    throw new Error(`无法连接后端服务：${serverApiUrl}`, { cause: error });
  }

  const text = await response.text();
  let payload: T & { error?: string };
  try {
    payload = text
      ? (JSON.parse(text) as T & { error?: string })
      : ({} as unknown as T & { error?: string });
  } catch {
    payload = text as T & { error?: string };
  }
  if (!response.ok) {
    const message = payload?.error ?? `请求失败：${response.status}`;
    reportError(new Error(message), "api.error", { endpoint: path });
    throw new Error(message);
  }
  return payload;
}

export function eventSourceUrl(path: string): string {
  const token = getServerToken() ?? "";
  const separator = path.includes("?") ? "&" : "?";
  return `${serverApiUrl}${path}${separator}token=${encodeURIComponent(token)}`;
}
