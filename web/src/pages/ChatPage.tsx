import {
  LogIn,
  LogOut,
  MessageSquare,
  Plus,
  Send,
  Users,
} from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { isSupabaseConfigured } from "@/lib/supabase";
import {
  createRoom,
  joinRoom,
  leaveRoom,
  listMembers,
  listMessages,
  listRooms,
  sendMessage,
  subscribeChatMessages,
  subscribePresence,
  type ChatMember,
  type ChatMessage,
  type ChatRoom,
} from "@/services/chat";
import { useAuthStore } from "@/stores/auth";

export default function ChatPage() {
  const user = useAuthStore((state) => state.user);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [roomName, setRoomName] = useState("");
  const [members, setMembers] = useState<ChatMember[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [onlineMembers, setOnlineMembers] = useState<ChatMember[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);

  const userId = user?.id ?? "demo-user";
  const displayName = user?.display_name ?? "演示用户";
  const activeRoom = rooms.find((room) => room.id === activeRoomId);
  const isMember = members.some((member) => member.user_id === userId);

  useEffect(() => {
    let cancelled = false;
    void listRooms().then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (result.error) {
        setError(result.error);
      } else {
        setRooms(result.data);
        if (result.data.length > 0 && !activeRoomId) {
          setActiveRoomId(result.data[0].id);
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, [activeRoomId]);

  useEffect(() => {
    if (!activeRoomId) return;
    let cancelled = false;

    void Promise.all([
      joinRoom(activeRoomId, userId),
      listMembers(activeRoomId),
      listMessages(activeRoomId),
    ]).then(([joinResult, memberResult, messageResult]) => {
      if (cancelled) return;
      if (joinResult.error) setError(joinResult.error);
      if (!memberResult.error) setMembers(memberResult.data);
      if (!messageResult.error) setMessages(messageResult.data);
    });

    const unsubscribeMessages = subscribeChatMessages(
      activeRoomId,
      (message) => {
        if (message) {
          setMessages((current) => [...current, message]);
        } else {
          void listMessages(activeRoomId).then((result) => {
            if (!result.error) setMessages(result.data);
          });
        }
      },
    );
    const unsubscribePresence = subscribePresence(
      activeRoomId,
      userId,
      displayName,
      setOnlineMembers,
    );

    return () => {
      cancelled = true;
      unsubscribeMessages();
      unsubscribePresence();
    };
  }, [activeRoomId, displayName, userId]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const refreshRooms = async () => {
    const result = await listRooms();
    if (!result.error) setRooms(result.data);
  };

  const handleCreateRoom = async (event: FormEvent) => {
    event.preventDefault();
    const name = roomName.trim();
    if (!name) return;
    const result = await createRoom(name, userId);
    if (result.error) {
      setError(result.error);
      return;
    }
    setRoomName("");
    if (result.data) {
      setActiveRoomId(result.data.id);
      await refreshRooms();
    }
  };

  const handleSend = async (event: FormEvent) => {
    event.preventDefault();
    const text = body.trim();
    if (!activeRoomId || !text) return;
    const result = await sendMessage(activeRoomId, userId, text);
    if (result.error) {
      setError(result.error);
      return;
    }
    setBody("");
  };

  const handleLeave = async () => {
    if (!activeRoomId) return;
    const result = await leaveRoom(activeRoomId, userId);
    if (result.error) {
      setError(result.error);
      return;
    }
    setActiveRoomId(null);
    await refreshRooms();
  };

  const handleJoin = async () => {
    if (!activeRoomId) return;
    await joinRoom(activeRoomId, userId);
    await refreshRooms();
    const memberResult = await listMembers(activeRoomId);
    if (!memberResult.error) setMembers(memberResult.data);
  };

  return (
    <div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mint-300">
          实时在线聊天室
        </p>
        <h1 className="mt-3 text-3xl font-bold sm:text-4xl">聊天室</h1>
        <p className="mt-3 text-sm leading-6 text-mist-400">
          多房间实时消息与在线状态；未配置 Supabase 时使用本地演示模式。
        </p>
      </div>

      {error ? (
        <p className="mt-6 rounded-xl bg-red-400/10 px-4 py-3 text-sm text-red-200 ring-1 ring-red-400/20">
          {error}
        </p>
      ) : null}

      <div className="mt-8 grid min-h-[560px] gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="rounded-panel border border-white/10 bg-white/[0.03] p-4">
          <form onSubmit={handleCreateRoom} className="flex gap-2">
            <Input
              value={roomName}
              onChange={(event) => setRoomName(event.target.value)}
              placeholder="新房间名称"
              aria-label="新房间名称"
            />
            <Button
              type="submit"
              disabled={!roomName.trim()}
              aria-label="创建房间"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
            </Button>
          </form>

          <div className="mt-5 space-y-2">
            {loading ? (
              <p className="text-sm text-mist-400">加载中…</p>
            ) : rooms.length === 0 ? (
              <p className="text-sm leading-6 text-mist-400">
                还没有房间，创建一个开始聊天。
              </p>
            ) : (
              rooms.map((room) => (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => setActiveRoomId(room.id)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                    room.id === activeRoomId
                      ? "border-mint-300/40 bg-mint-300/10"
                      : "border-white/10 bg-white/[0.02] hover:border-white/20"
                  }`}
                >
                  <MessageSquare className="h-4 w-4 shrink-0 text-mint-300" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-mist-100">
                      {room.name}
                    </span>
                    <span className="mt-1 flex items-center gap-1 text-xs text-mist-500">
                      <Users className="h-3 w-3" aria-hidden="true" />
                      {room.member_count ?? 0} 位成员
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        </aside>

        <section className="flex min-h-[560px] flex-col overflow-hidden rounded-panel border border-white/10 bg-ink-900/50">
          {activeRoom ? (
            <>
              <header className="flex flex-col gap-3 border-b border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-mist-100">
                    {activeRoom.name}
                  </h2>
                  <p className="mt-1 text-xs text-mist-500">
                    {isSupabaseConfigured
                      ? `${onlineMembers.length} 人在线`
                      : `${members.length} 位成员（本地演示）`}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {isMember ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void handleLeave()}
                    >
                      <LogOut className="h-4 w-4" aria-hidden="true" />
                      离开
                    </Button>
                  ) : (
                    <Button
                      variant="soft"
                      size="sm"
                      onClick={() => void handleJoin()}
                    >
                      <LogIn className="h-4 w-4" aria-hidden="true" />
                      加入
                    </Button>
                  )}
                </div>
              </header>

              <div className="flex flex-1 flex-col overflow-y-auto p-4">
                {messages.length === 0 ? (
                  <div className="flex flex-1 items-center justify-center text-sm text-mist-500">
                    还没有消息，说点什么吧。
                  </div>
                ) : (
                  messages.map((message) => {
                    const own = message.user_id === userId;
                    return (
                      <div
                        key={message.id}
                        className={`mb-3 flex ${
                          own ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[78%] rounded-2xl px-4 py-3 ${
                            own
                              ? "bg-mint-300 text-ink-950"
                              : "bg-white/5 text-mist-100 ring-1 ring-white/10"
                          }`}
                        >
                          <p className="text-xs font-semibold opacity-70">
                            {message.display_name ||
                              (own ? "你" : "用户")}
                          </p>
                          <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6">
                            {message.body}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messageEndRef} />
              </div>

              <form
                onSubmit={handleSend}
                className="flex gap-2 border-t border-white/10 p-4"
              >
                <Input
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  placeholder="输入消息，Enter 发送"
                  aria-label="聊天消息"
                />
                <Button type="submit" disabled={!body.trim()}>
                  <Send className="h-4 w-4" aria-hidden="true" />
                  发送
                </Button>
              </form>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-8 text-center">
              <div>
                <MessageSquare className="mx-auto h-8 w-8 text-mint-300" aria-hidden="true" />
                <h2 className="mt-4 text-lg font-bold text-mist-100">
                  选择或创建一个房间
                </h2>
                <p className="mt-2 text-sm leading-6 text-mist-400">
                  左侧输入房间名称即可开始。
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
