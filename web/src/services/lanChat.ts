export interface LanRoom {
  id: string;
  name: string;
  message_count: number;
  created_at: string;
}

export interface LanMessage {
  id: string;
  room_id: string;
  nickname: string;
  body: string;
  created_at: string;
}

const SERVER_KEY = "multimod-lan-server";
const NICKNAME_KEY = "multimod-lan-nickname";

function defaultServerUrl() {
  if (
    typeof window !== "undefined" &&
    window.location.protocol === "http:" &&
    !window.location.hostname.includes("pages.dev")
  ) {
    return window.location.origin;
  }
  return "";
}

export function isLanOrigin(): boolean {
  return (
    typeof window !== "undefined" &&
    window.location.protocol === "http:" &&
    !window.location.hostname.includes("pages.dev")
  );
}

export function isLanServerUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:") return false;
    return (
      parsed.hostname === "localhost" ||
      /^(\d{1,3}\.){3}\d{1,3}$/.test(parsed.hostname) ||
      parsed.hostname.endsWith(".local")
    );
  } catch {
    return false;
  }
}

export function detectLocalIp(): Promise<string[]> {
  return new Promise((resolve) => {
    const addresses = new Set<string>();
    let pc: RTCPeerConnection | null = null;
    const finish = () => {
      try {
        pc?.close();
      } catch {
        // ignore close errors
      }
      resolve([...addresses]);
    };
    try {
      pc = new RTCPeerConnection({ iceServers: [] });
      pc.createDataChannel("ip-probe");
      pc.onicecandidate = (event) => {
        if (!event.candidate) {
          finish();
          return;
        }
        const match = /([0-9]{1,3}(?:\.[0-9]{1,3}){3})/.exec(
          event.candidate.candidate,
        );
        if (match) addresses.add(match[1]);
      };
      void pc.createOffer().then((offer) => pc?.setLocalDescription(offer));
      window.setTimeout(finish, 3000);
    } catch {
      finish();
    }
  });
}

export function getLanServerUrl(): string {
  return localStorage.getItem(SERVER_KEY) ?? defaultServerUrl();
}

export function setLanServerUrl(url: string) {
  localStorage.setItem(SERVER_KEY, url.trim().replace(/\/+$/, ""));
}

export function getLanNickname(): string {
  return localStorage.getItem(NICKNAME_KEY) ?? "";
}

export function setLanNickname(nickname: string) {
  localStorage.setItem(NICKNAME_KEY, nickname.trim());
}

async function request<T>(base: string, path: string, init?: RequestInit) {
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, init);
  } catch {
    throw new Error(`无法连接局域网服务：${base}`);
  }
  const text = await response.text();
  let body: T & { error?: string };
  try {
    body = text
      ? (JSON.parse(text) as T & { error?: string })
      : ({} as unknown as T & { error?: string });
  } catch {
    body = text as T & { error?: string };
  }
  if (!response.ok) {
    if (response.status === 405) {
      throw new Error("请求失败 405：请确认连接的是局域网服务，不是线上网站");
    }
    throw new Error(body?.error ?? `请求失败：${response.status}`);
  }
  return body;
}

export function checkLanServer(base: string) {
  return request<{ ok: boolean }>(base, "/lan/health");
}

export function getLanAddresses(base: string) {
  return request<{ addresses: string[]; isFallback?: boolean }>(
    base,
    "/lan/ip",
  );
}

export function listLanRooms(base: string) {
  return request<{ data: LanRoom[] }>(base, "/lan/rooms");
}

export function createLanRoom(base: string, name: string) {
  return request<{ data: LanRoom }>(base, "/lan/rooms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
}

export function listLanMessages(base: string, roomId: string) {
  return request<{ data: LanMessage[] }>(
    base,
    `/lan/rooms/${roomId}/messages`,
  );
}

export function sendLanMessage(
  base: string,
  roomId: string,
  nickname: string,
  body: string,
) {
  return request<{ data: LanMessage }>(
    base,
    `/lan/rooms/${roomId}/messages`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname, body }),
    },
  );
}

export function subscribeLanMessages(
  base: string,
  roomId: string,
  callback: (message: LanMessage) => void,
): () => void {
  if (typeof EventSource === "undefined") return () => undefined;
  const source = new EventSource(`${base}/lan/rooms/${roomId}/events`);
  source.addEventListener("message", (eventObject) => {
    try {
      callback(JSON.parse((eventObject as MessageEvent).data) as LanMessage);
    } catch {
      // ignore malformed payloads
    }
  });
  return () => source.close();
}
