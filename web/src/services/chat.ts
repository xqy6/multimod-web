import type { ChatMember, ChatMessage, ChatRoom } from "@shared";

import { apiRequest, eventSourceUrl, shouldUseLocalBackend } from "@/lib/api";

export type { ChatMember, ChatMessage, ChatRoom };

const ROOMS_KEY = "multimod-demo-rooms";
const MEMBERS_KEY = "multimod-demo-members";
const TYPING_KEY = "multimod-demo-typing";

function lastReadKey(userId: string) {
  return `multimod-demo-last-read-${userId}`;
}

function readLastRead(userId: string): Record<string, string> {
  try {
    const raw = localStorage.getItem(lastReadKey(userId));
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function writeLastRead(userId: string, value: Record<string, string>) {
  localStorage.setItem(lastReadKey(userId), JSON.stringify(value));
}

function read<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function write<T>(key: string, value: T[]) {
  localStorage.setItem(key, JSON.stringify(value));
}

function messagesKey(roomId: string) {
  return `multimod-demo-messages-${roomId}`;
}

function demoDisplayName(userId: string): string {
  if (userId === "demo-user") return "演示用户";
  try {
    const raw = localStorage.getItem("multimod-demo-profile");
    return raw
      ? ((JSON.parse(raw) as { display_name?: string }).display_name ?? userId)
      : userId;
  } catch {
    return userId;
  }
}

function broadcast(roomId: string) {
  window.dispatchEvent(
    new CustomEvent("multimod-chat-change", { detail: { roomId } }),
  );
  if (typeof BroadcastChannel !== "undefined") {
    try {
      const channel = new BroadcastChannel("multimod-chat");
      channel.postMessage({ roomId });
      channel.close();
    } catch {
      // ignore broadcast failures
    }
  }
}

function broadcastTyping(roomId: string) {
  window.dispatchEvent(
    new CustomEvent("multimod-chat-typing", { detail: { roomId } }),
  );
  if (typeof BroadcastChannel !== "undefined") {
    try {
      const channel = new BroadcastChannel("multimod-chat-typing");
      channel.postMessage({ roomId });
      channel.close();
    } catch {
      // ignore broadcast failures
    }
  }
}

function subscribeSse<T>(
  roomId: string,
  event: string,
  callback: (payload: T) => void,
): () => void {
  if (typeof EventSource === "undefined") return () => undefined;
  const source = new EventSource(eventSourceUrl(`/api/rooms/${roomId}/events`));
  source.addEventListener(event, (eventObject) => {
    try {
      callback(JSON.parse((eventObject as MessageEvent).data) as T);
    } catch {
      // ignore malformed event payloads
    }
  });
  return () => source.close();
}

export function setTyping(roomId: string, userId: string, displayName: string) {
  if (!shouldUseLocalBackend()) {
    void apiRequest(`/api/rooms/${roomId}/typing`, {
      method: "POST",
      body: { typing: true },
    }).catch(() => undefined);
    return;
  }
  const all = read<{
    room_id: string;
    user_id: string;
    display_name: string;
    updated_at: string;
  }>(TYPING_KEY);
  const next = all.filter((item) => item.room_id !== roomId);
  next.push({
    room_id: roomId,
    user_id: userId,
    display_name: displayName,
    updated_at: new Date().toISOString(),
  });
  write(TYPING_KEY, next);
  broadcastTyping(roomId);
}

export function subscribeTyping(
  roomId: string,
  callback: (users: ChatMember[]) => void,
): () => void {
  if (!shouldUseLocalBackend()) {
    return subscribeSse<ChatMember[]>(roomId, "typing", callback);
  }
  const emit = () => {
    const all = read<{
      room_id: string;
      user_id: string;
      display_name: string;
      updated_at: string;
    }>(TYPING_KEY);
    const users = all
      .filter(
        (item) =>
          item.room_id === roomId &&
          Date.now() - new Date(item.updated_at).getTime() < 3000,
      )
      .map((item) => ({
        room_id: roomId,
        user_id: item.user_id,
        display_name: item.display_name,
        role: "member" as const,
        joined_at: item.updated_at,
      }));
    callback(users);
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key === TYPING_KEY) emit();
  };
  const onCustom = (event: Event) => {
    const detail = (event as CustomEvent<{ roomId: string }>).detail;
    if (detail.roomId === roomId) emit();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener("multimod-chat-typing", onCustom);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("multimod-chat-typing", onCustom);
  };
}

export async function listRooms(): Promise<{
  data: ChatRoom[];
  error: string | null;
}> {
  if (shouldUseLocalBackend()) {
    const members = read<ChatMember>(MEMBERS_KEY);
    const rooms = read<ChatRoom>(ROOMS_KEY).map((room) => ({
      ...room,
      member_count: members.filter((member) => member.room_id === room.id)
        .length,
    }));
    return { data: rooms, error: null };
  }
  try {
    const { data } = await apiRequest<{ data: ChatRoom[] }>("/api/rooms");
    return { data, error: null };
  } catch (error) {
    return { data: [], error: (error as Error).message };
  }
}

export async function createRoom(
  name: string,
  userId: string,
): Promise<{ data: ChatRoom | null; error: string | null }> {
  if (shouldUseLocalBackend()) {
    const room: ChatRoom = {
      id: crypto.randomUUID(),
      name,
      slug: null,
      created_by: userId,
      created_at: new Date().toISOString(),
      member_count: 1,
    };
    const rooms = read<ChatRoom>(ROOMS_KEY);
    rooms.unshift(room);
    write(ROOMS_KEY, rooms);
    const members = read<ChatMember>(MEMBERS_KEY);
    members.push({
      room_id: room.id,
      user_id: userId,
      role: "admin",
      joined_at: room.created_at,
    });
    write(MEMBERS_KEY, members);
    broadcast(room.id);
    return { data: room, error: null };
  }
  try {
    const { data } = await apiRequest<{ data: ChatRoom }>("/api/rooms", {
      method: "POST",
      body: { name },
    });
    return { data, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

export async function joinRoom(
  roomId: string,
  userId: string,
): Promise<{ error: string | null }> {
  if (shouldUseLocalBackend()) {
    const members = read<ChatMember>(MEMBERS_KEY);
    if (
      !members.some(
        (member) => member.room_id === roomId && member.user_id === userId,
      )
    ) {
      members.push({
        room_id: roomId,
        user_id: userId,
        role: "member",
        joined_at: new Date().toISOString(),
      });
      write(MEMBERS_KEY, members);
    }
    broadcast(roomId);
    return { error: null };
  }
  try {
    await apiRequest(`/api/rooms/${roomId}/join`, { method: "POST" });
    return { error: null };
  } catch (error) {
    return { error: (error as Error).message };
  }
}

export async function leaveRoom(
  roomId: string,
  userId: string,
): Promise<{ error: string | null }> {
  if (shouldUseLocalBackend()) {
    write(
      MEMBERS_KEY,
      read<ChatMember>(MEMBERS_KEY).filter(
        (member) => !(member.room_id === roomId && member.user_id === userId),
      ),
    );
    broadcast(roomId);
    return { error: null };
  }
  try {
    await apiRequest(`/api/rooms/${roomId}/leave`, { method: "POST" });
    return { error: null };
  } catch (error) {
    return { error: (error as Error).message };
  }
}

export async function listMembers(
  roomId: string,
): Promise<{ data: ChatMember[]; error: string | null }> {
  if (shouldUseLocalBackend()) {
    const members = read<ChatMember>(MEMBERS_KEY)
      .filter((member) => member.room_id === roomId)
      .map((member) => ({
        ...member,
        display_name: demoDisplayName(member.user_id),
      }));
    return { data: members, error: null };
  }
  try {
    const { data } = await apiRequest<{ data: ChatMember[] }>(
      `/api/rooms/${roomId}/members`,
    );
    return { data, error: null };
  } catch (error) {
    return { data: [], error: (error as Error).message };
  }
}

export async function listMessages(
  roomId: string,
  before?: string,
): Promise<{ data: ChatMessage[]; error: string | null }> {
  if (shouldUseLocalBackend()) {
    return {
      data: read<ChatMessage>(messagesKey(roomId)),
      error: null,
    };
  }
  try {
    const query = before ? `?before=${encodeURIComponent(before)}` : "";
    const { data } = await apiRequest<{ data: ChatMessage[] }>(
      `/api/rooms/${roomId}/messages${query}`,
    );
    return { data, error: null };
  } catch (error) {
    return { data: [], error: (error as Error).message };
  }
}

async function listAllMessages(roomId: string): Promise<ChatMessage[]> {
  const all: ChatMessage[] = [];
  let before: string | undefined;
  for (let guard = 0; guard < 50; guard += 1) {
    const result = await listMessages(roomId, before);
    if (result.error) throw new Error(result.error);
    const page = result.data ?? [];
    all.unshift(...page);
    if (page.length < 200) break;
    before = all[0]?.created_at;
  }
  return all;
}

export async function searchMessages(
  roomId: string,
  query: string,
): Promise<{ data: ChatMessage[]; error: string | null }> {
  const term = query.trim().toLowerCase();
  if (!term) return { data: [], error: null };
  if (shouldUseLocalBackend()) {
    const all = read<ChatMessage>(messagesKey(roomId));
    const matches = all
      .filter(
        (message) =>
          message.body.toLowerCase().includes(term) ||
          (message.display_name ?? "").toLowerCase().includes(term),
      )
      .slice(-50);
    return { data: matches, error: null };
  }
  try {
    const { data } = await apiRequest<{ data: ChatMessage[] }>(
      `/api/rooms/${roomId}/search?q=${encodeURIComponent(query.trim())}`,
    );
    return { data, error: null };
  } catch {
    try {
      const all = await listAllMessages(roomId);
      const matches = all
        .filter(
          (message) =>
            message.body.toLowerCase().includes(term) ||
            (message.display_name ?? "").toLowerCase().includes(term),
        )
        .slice(-50);
      return { data: matches, error: null };
    } catch (fallbackError) {
      return { data: [], error: (fallbackError as Error).message };
    }
  }
}

export async function getMessageContext(
  roomId: string,
  messageId: string,
): Promise<{
  target: ChatMessage | null;
  before: ChatMessage[];
  after: ChatMessage[];
  error: string | null;
}> {
  if (shouldUseLocalBackend()) {
    const all = read<ChatMessage>(messagesKey(roomId));
    const index = all.findIndex((message) => message.id === messageId);
    if (index < 0) return { target: null, before: [], after: [], error: null };
    return {
      target: all[index],
      before: all.slice(Math.max(0, index - 40), index),
      after: all.slice(index + 1, index + 21),
      error: null,
    };
  }
  try {
    const data = await apiRequest<{
      target: ChatMessage;
      before: ChatMessage[];
      after: ChatMessage[];
    }>(`/api/rooms/${roomId}/messages/${messageId}/context`);
    return { ...data, error: null };
  } catch {
    try {
      const all = await listAllMessages(roomId);
      const index = all.findIndex((message) => message.id === messageId);
      if (index < 0)
        return { target: null, before: [], after: [], error: null };
      return {
        target: all[index],
        before: all.slice(Math.max(0, index - 40), index),
        after: all.slice(index + 1, index + 21),
        error: null,
      };
    } catch (fallbackError) {
      return {
        target: null,
        before: [],
        after: [],
        error: (fallbackError as Error).message,
      };
    }
  }
}

export async function deleteMessages(
  roomId: string,
  userId: string,
  messageIds: string[],
): Promise<{ deleted: number; error: string | null }> {
  if (shouldUseLocalBackend()) {
    const ownIds = new Set(messageIds);
    const messages = read<ChatMessage>(messagesKey(roomId));
    const next = messages.filter(
      (message) => !(ownIds.has(message.id) && message.user_id === userId),
    );
    write(messagesKey(roomId), next);
    broadcast(roomId);
    return {
      deleted: messages.length - next.length,
      error: null,
    };
  }
  try {
    const data = await apiRequest<{ deleted: number }>(
      `/api/rooms/${roomId}/messages/delete`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageIds }),
      },
    );
    return { deleted: data.deleted, error: null };
  } catch {
    try {
      let deleted = 0;
      for (const messageId of messageIds) {
        const result = await deleteMessage(roomId, messageId);
        if (!result.error) deleted += 1;
      }
      return { deleted, error: null };
    } catch (fallbackError) {
      return { deleted: 0, error: (fallbackError as Error).message };
    }
  }
}

export async function clearMyMessages(
  roomId: string,
  userId: string,
): Promise<{ deleted: number; error: string | null }> {
  if (shouldUseLocalBackend()) {
    const messages = read<ChatMessage>(messagesKey(roomId));
    const next = messages.filter((message) => message.user_id !== userId);
    write(messagesKey(roomId), next);
    broadcast(roomId);
    return { deleted: messages.length - next.length, error: null };
  }
  try {
    const data = await apiRequest<{ deleted: number }>(
      `/api/rooms/${roomId}/messages/clear`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      },
    );
    return { deleted: data.deleted, error: null };
  } catch {
    try {
      const all = await listAllMessages(roomId);
      const ownMessages = all.filter(
        (message) => String(message.user_id) === String(userId),
      );
      let deleted = 0;
      for (const message of ownMessages) {
        const result = await deleteMessage(roomId, message.id);
        if (!result.error) deleted += 1;
      }
      return { deleted, error: null };
    } catch (fallbackError) {
      return { deleted: 0, error: (fallbackError as Error).message };
    }
  }
}

export async function sendMessage(
  roomId: string,
  userId: string,
  body: string,
): Promise<{ data: ChatMessage | null; error: string | null }> {
  if (shouldUseLocalBackend()) {
    const message: ChatMessage = {
      id: crypto.randomUUID(),
      room_id: roomId,
      user_id: userId,
      body,
      display_name: demoDisplayName(userId),
      created_at: new Date().toISOString(),
    };
    const messages = read<ChatMessage>(messagesKey(roomId));
    messages.push(message);
    write(messagesKey(roomId), messages);
    broadcast(roomId);
    return { data: message, error: null };
  }
  try {
    const { data } = await apiRequest<{ data: ChatMessage }>(
      `/api/rooms/${roomId}/messages`,
      { method: "POST", body: { body } },
    );
    return { data, error: null };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

export async function deleteMessage(
  roomId: string,
  messageId: string,
): Promise<{ error: string | null }> {
  if (shouldUseLocalBackend()) {
    const messages = read<ChatMessage>(messagesKey(roomId));
    write(
      messagesKey(roomId),
      messages.filter((message) => message.id !== messageId),
    );
    broadcast(roomId);
    return { error: null };
  }
  try {
    await apiRequest(`/api/messages/${messageId}`, { method: "DELETE" });
    return { error: null };
  } catch (error) {
    return { error: (error as Error).message };
  }
}

export function subscribeChatMessages(
  roomId: string,
  callback: (message?: ChatMessage) => void,
): () => void {
  if (!shouldUseLocalBackend()) {
    const unsubscribeMessage = subscribeSse<ChatMessage>(
      roomId,
      "message",
      callback,
    );
    const unsubscribeMember = subscribeSse<unknown>(roomId, "member", () =>
      callback(),
    );
    const unsubscribeRead = subscribeSse<unknown>(roomId, "read", () =>
      callback(),
    );
    const unsubscribeDelete = subscribeSse<unknown>(roomId, "delete", () =>
      callback(),
    );
    return () => {
      unsubscribeMessage();
      unsubscribeMember();
      unsubscribeRead();
      unsubscribeDelete();
    };
  }
  const onStorage = (event: StorageEvent) => {
    if (event.key === messagesKey(roomId)) callback();
  };
  const onCustom = (event: Event) => {
    const detail = (event as CustomEvent<{ roomId: string }>).detail;
    if (detail.roomId === roomId) callback();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener("multimod-chat-change", onCustom);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("multimod-chat-change", onCustom);
  };
}

export function subscribePresence(
  roomId: string,
  _userId: string,
  _displayName: string,
  onChange: (members: ChatMember[]) => void,
): () => void {
  if (!shouldUseLocalBackend()) {
    return subscribeSse<ChatMember[]>(roomId, "presence", onChange);
  }
  onChange([
    {
      room_id: roomId,
      user_id: _userId,
      display_name: _displayName,
      role: "member",
      joined_at: new Date().toISOString(),
    },
  ]);
  return () => undefined;
}

export async function markRoomRead(roomId: string, userId: string) {
  if (shouldUseLocalBackend()) {
    const lastRead = readLastRead(userId);
    lastRead[roomId] = new Date().toISOString();
    writeLastRead(userId, lastRead);
    return;
  }
  await apiRequest(`/api/rooms/${roomId}/read`, { method: "POST" });
}

export async function getUnreadCounts(
  userId: string,
): Promise<Record<string, number>> {
  if (shouldUseLocalBackend()) {
    const lastRead = readLastRead(userId);
    const rooms = read<ChatRoom>(ROOMS_KEY);
    const counts: Record<string, number> = {};
    for (const room of rooms) {
      const messages = read<ChatMessage>(messagesKey(room.id));
      const since = lastRead[room.id];
      counts[room.id] = since
        ? messages.filter((message) => message.created_at > since).length
        : messages.length;
    }
    return counts;
  }
  try {
    const { data } = await apiRequest<{ data: Record<string, number> }>(
      "/api/unread",
    );
    return data;
  } catch {
    return {};
  }
}
