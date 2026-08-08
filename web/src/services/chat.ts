import { supabase } from "@/lib/supabase";

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
}

export interface ChatMessage {
  id: string;
  room_id: string;
  user_id: string;
  body: string;
  display_name?: string;
  created_at: string;
}

const ROOMS_KEY = "multimod-demo-rooms";
const MEMBERS_KEY = "multimod-demo-members";
const TYPING_KEY = "multimod-demo-typing";

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
    return raw ? (JSON.parse(raw) as { display_name?: string }).display_name ?? userId : userId;
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

export function setTyping(
  roomId: string,
  userId: string,
  displayName: string,
) {
  if (supabase) return;
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
  if (supabase) return () => undefined;
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
  if (!supabase) {
    const members = read<ChatMember>(MEMBERS_KEY);
    const rooms = read<ChatRoom>(ROOMS_KEY).map((room) => ({
      ...room,
      member_count: members.filter((member) => member.room_id === room.id)
        .length,
    }));
    return { data: rooms, error: null };
  }
  const { data, error } = await supabase
    .from("rooms")
    .select("id, name, slug, created_by, created_at, room_members(count)")
    .order("created_at", { ascending: false });
  const rows = (data as Array<Record<string, unknown>> | null) ?? [];
  const rooms: ChatRoom[] = rows.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    slug: row.slug === null ? null : String(row.slug),
    created_by: String(row.created_by),
    created_at: String(row.created_at),
    member_count: Number(
      (row.room_members as Array<{ count: number }> | undefined)?.[0]?.count ??
        0,
    ),
  }));
  return { data: rooms, error: error?.message ?? null };
}

export async function createRoom(
  name: string,
  userId: string,
): Promise<{ data: ChatRoom | null; error: string | null }> {
  if (!supabase) {
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
  const { data: roomData, error: roomError } = await supabase
    .from("rooms")
    .insert({ name, created_by: userId })
    .select()
    .single();
  if (roomError || !roomData) {
    return { data: null, error: roomError?.message ?? "创建房间失败" };
  }
  await supabase.from("room_members").insert({
    room_id: roomData.id,
    user_id: userId,
    role: "admin",
  });
  return {
    data: roomData as ChatRoom,
    error: null,
  };
}

export async function joinRoom(
  roomId: string,
  userId: string,
): Promise<{ error: string | null }> {
  if (!supabase) {
    const members = read<ChatMember>(MEMBERS_KEY);
    if (!members.some((member) => member.room_id === roomId && member.user_id === userId)) {
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
  const { error } = await supabase.from("room_members").upsert(
    {
      room_id: roomId,
      user_id: userId,
      role: "member",
    },
    { onConflict: "room_id,user_id" },
  );
  return { error: error?.message ?? null };
}

export async function leaveRoom(
  roomId: string,
  userId: string,
): Promise<{ error: string | null }> {
  if (!supabase) {
    write(
      MEMBERS_KEY,
      read<ChatMember>(MEMBERS_KEY).filter(
        (member) =>
          !(member.room_id === roomId && member.user_id === userId),
      ),
    );
    broadcast(roomId);
    return { error: null };
  }
  const { error } = await supabase
    .from("room_members")
    .delete()
    .eq("room_id", roomId)
    .eq("user_id", userId);
  return { error: error?.message ?? null };
}

export async function listMembers(
  roomId: string,
): Promise<{ data: ChatMember[]; error: string | null }> {
  if (!supabase) {
    const members = read<ChatMember>(MEMBERS_KEY)
      .filter((member) => member.room_id === roomId)
      .map((member) => ({
        ...member,
        display_name: demoDisplayName(member.user_id),
      }));
    return { data: members, error: null };
  }
  const { data, error } = await supabase
    .from("room_members")
    .select("room_id, user_id, role, joined_at, profiles(display_name)")
    .eq("room_id", roomId);
  const rows = (data as Array<Record<string, unknown>> | null) ?? [];
  const members: ChatMember[] = rows.map((row) => ({
    room_id: String(row.room_id),
    user_id: String(row.user_id),
    role: row.role === "admin" ? "admin" : "member",
    joined_at: String(row.joined_at),
    display_name: String(
      (row.profiles as { display_name?: string } | null)?.display_name ?? "",
    ),
  }));
  return { data: members, error: error?.message ?? null };
}

export async function listMessages(
  roomId: string,
): Promise<{ data: ChatMessage[]; error: string | null }> {
  if (!supabase) {
    return {
      data: read<ChatMessage>(messagesKey(roomId)),
      error: null,
    };
  }
  const { data, error } = await supabase
    .from("messages")
    .select("id, room_id, user_id, body, created_at, profiles(display_name)")
    .eq("room_id", roomId)
    .order("created_at", { ascending: true })
    .limit(200);
  const rows = (data as Array<Record<string, unknown>> | null) ?? [];
  const messages: ChatMessage[] = rows.map((row) => ({
    id: String(row.id),
    room_id: String(row.room_id),
    user_id: String(row.user_id),
    body: String(row.body),
    created_at: String(row.created_at),
    display_name: String(
      (row.profiles as { display_name?: string } | null)?.display_name ?? "",
    ),
  }));
  return { data: messages, error: error?.message ?? null };
}

export async function sendMessage(
  roomId: string,
  userId: string,
  body: string,
): Promise<{ data: ChatMessage | null; error: string | null }> {
  if (!supabase) {
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
  const { data, error } = await supabase
    .from("messages")
    .insert({ room_id: roomId, user_id: userId, body })
    .select()
    .single();
  return { data: data as ChatMessage | null, error: error?.message ?? null };
}

export async function deleteMessage(
  roomId: string,
  messageId: string,
): Promise<{ error: string | null }> {
  if (!supabase) {
    const messages = read<ChatMessage>(messagesKey(roomId));
    write(
      messagesKey(roomId),
      messages.filter((message) => message.id !== messageId),
    );
    broadcast(roomId);
    return { error: null };
  }
  const { error } = await supabase
    .from("messages")
    .delete()
    .eq("id", messageId);
  return { error: error?.message ?? null };
}

export function subscribeChatMessages(
  roomId: string,
  callback: (message?: ChatMessage) => void,
): () => void {
  if (!supabase) {
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

  const client = supabase;
  const channel = client
    .channel(`messages:${roomId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `room_id=eq.${roomId}`,
      },
      (payload) => {
        callback(payload.new as ChatMessage);
      },
    )
    .subscribe();
  return () => {
    void client.removeChannel(channel);
  };
}

export function subscribePresence(
  roomId: string,
  userId: string,
  displayName: string,
  onChange: (members: ChatMember[]) => void,
): () => void {
  if (!supabase) {
    onChange([
      {
        room_id: roomId,
        user_id: userId,
        display_name: displayName,
        role: "member",
        joined_at: new Date().toISOString(),
      },
    ]);
    return () => undefined;
  }
  const client = supabase;
  const channel = client.channel(`presence:${roomId}`);
  const readState = () => {
    const state = channel.presenceState() as Record<
      string,
      Array<{ user_id: string; display_name?: string }>
    >;
    const members = Object.values(state).flatMap((list) =>
      list.map((item) => ({
        room_id: roomId,
        user_id: item.user_id,
        display_name: item.display_name,
        role: "member" as const,
        joined_at: new Date().toISOString(),
      })),
    );
    onChange(members);
  };
  channel
    .on("presence", { event: "sync" }, readState)
    .subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({ user_id: userId, display_name: displayName });
      }
    });
  return () => {
    void client.removeChannel(channel);
  };
}
