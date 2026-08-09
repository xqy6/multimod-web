import {
  MessageSquare,
  Plus,
  RefreshCw,
  Send,
  Wifi,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { shouldUseLocalBackend } from "@/lib/api";
import {
  checkLanServer,
  createLanRoom,
  detectLocalIp,
  getLanAddresses,
  getLanNickname,
  getLanServerUrl,
  isLanOrigin,
  isLanServerUrl,
  listLanMessages,
  listLanRooms,
  sendLanMessage,
  setLanNickname,
  setLanServerUrl,
  subscribeLanMessages,
  type LanMessage,
  type LanRoom,
} from "@/services/lanChat";

export default function LanChatPage() {
  const [serverUrl, setServerUrl] = useState(getLanServerUrl());
  const [nickname, setNickname] = useState(getLanNickname());
  const [base, setBase] = useState("");
  const [connected, setConnected] = useState(false);
  const [rooms, setRooms] = useState<LanRoom[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<LanMessage[]>([]);
  const [roomName, setRoomName] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lanAddresses, setLanAddresses] = useState<string[]>([]);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);

  const activeRoom = rooms.find((room) => room.id === activeRoomId);

  const loadRooms = useCallback(async (targetBase: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await listLanRooms(targetBase);
      setRooms(result.data ?? []);
      if ((result.data ?? []).length > 0) {
        setActiveRoomId((current) => current ?? result.data[0].id);
      }
    } catch (loadError) {
      setError((loadError as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLanAddresses = useCallback(async (targetBase: string) => {
    try {
      const result = await getLanAddresses(targetBase);
      setLanAddresses(result.addresses ?? []);
    } catch (addressError) {
      setError((addressError as Error).message);
    }
  }, []);

  const handleGetLanAddresses = useCallback(async () => {
    setError(null);
    const localAddresses = await detectLocalIp();
    if (localAddresses.length > 0) {
      setLanAddresses(localAddresses);
      return;
    }
    const targetBase =
      base ||
      (isLanOrigin() ? window.location.origin : getLanServerUrl());
    if (!targetBase) {
      setError(
        "在线网站无法自动获取本机 IP，请用 start-lan.bat 打印的 http://IP:4100 地址打开页面",
      );
      return;
    }
    await fetchLanAddresses(targetBase);
  }, [base, fetchLanAddresses]);

  const connectTo = useCallback(async (targetUrl: string) => {
    const url = targetUrl.trim().replace(/\/+$/, "");
    if (!url) {
      setError("请输入局域网服务地址");
      return;
    }
    if (!isLanServerUrl(url)) {
      setError("请填写本机局域网地址，例如 http://192.168.1.100:4100");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await checkLanServer(url);
      setBase(url);
      setLanServerUrl(url);
      setConnected(true);
      await loadRooms(url);
      await fetchLanAddresses(url);
    } catch (connectError) {
      setError((connectError as Error).message);
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }, [fetchLanAddresses, loadRooms]);

  const connect = () => {
    void connectTo(serverUrl);
  };

  useEffect(() => {
    const saved = getLanServerUrl();
    if (saved && (shouldUseLocalBackend() || isLanOrigin())) {
      void connectTo(saved);
    }
  }, [connectTo]);

  const loadMessages = useCallback(async (roomId: string, targetBase: string) => {
    try {
      const result = await listLanMessages(targetBase, roomId);
      setMessages(result.data ?? []);
    } catch (messageError) {
      setError((messageError as Error).message);
    }
  }, []);

  useEffect(() => {
    if (!activeRoomId || !base) return;
    void loadMessages(activeRoomId, base);
  }, [activeRoomId, base, loadMessages]);

  useEffect(() => {
    if (!activeRoomId || !base) return;
    const unsubscribe = subscribeLanMessages(base, activeRoomId, (message) => {
      setMessages((current) =>
        current.some((item) => item.id === message.id)
          ? current
          : [...current, message],
      );
    });
    return unsubscribe;
  }, [activeRoomId, base]);

  useEffect(() => {
    if (!activeRoomId || !base) return;
    const interval = window.setInterval(() => {
      void listLanMessages(base, activeRoomId)
        .then((result) => {
          const incoming = result.data ?? [];
          setMessages((current) => {
            const merged = [...current];
            for (const message of incoming) {
              if (!merged.some((item) => item.id === message.id)) {
                merged.push(message);
              }
            }
            return merged.sort((a, b) =>
              a.created_at.localeCompare(b.created_at),
            );
          });
        })
        .catch(() => undefined);
    }, 3000);
    return () => window.clearInterval(interval);
  }, [activeRoomId, base]);

  useEffect(() => {
    const container = messagesScrollRef.current;
    if (
      container &&
      container.scrollHeight - container.scrollTop - container.clientHeight <
        120
    ) {
      container.scrollTop = container.scrollHeight;
      messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, activeRoomId]);

  const handleCreateRoom = async (event: FormEvent) => {
    event.preventDefault();
    const name = roomName.trim();
    if (!name || !base) return;
    try {
      const result = await createLanRoom(base, name);
      setRoomName("");
      setRooms((current) => [result.data, ...current]);
      setActiveRoomId(result.data.id);
    } catch (createError) {
      setError((createError as Error).message);
    }
  };

  const handleSend = async (event: FormEvent) => {
    event.preventDefault();
    const text = body.trim();
    const name = nickname.trim();
    if (!activeRoomId || !base || !text || !name) return;
    try {
      const result = await sendLanMessage(base, activeRoomId, name, text);
      setMessages((current) => [...current, result.data]);
      setBody("");
      setRooms((current) =>
        current.map((room) =>
          room.id === activeRoomId
            ? { ...room, message_count: room.message_count + 1 }
            : room,
        ),
      );
    } catch (sendError) {
      setError((sendError as Error).message);
    }
  };

  return (
    <div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mint-300">
          局域网聊天
        </p>
        <h1 className="mt-3 text-3xl font-bold sm:text-4xl">同一 Wi-Fi 实时聊天</h1>
        <p className="mt-3 text-sm leading-6 text-mist-400">
          连接电脑上运行的本地服务后，同一局域网内的设备可以实时收发消息。
        </p>
      </div>

      {error ? (
        <p className="mt-6 rounded-xl bg-red-400/10 px-4 py-3 text-sm text-red-200 ring-1 ring-red-400/20">
          {error}
        </p>
      ) : null}

      <section className="mt-8 rounded-panel border border-white/10 bg-white/[0.03] p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_240px_auto]">
          <Input
            value={serverUrl}
            onChange={(event) => setServerUrl(event.target.value)}
            placeholder="http://192.168.1.100:4100"
            aria-label="局域网服务地址"
          />
          <Input
            value={nickname}
            onChange={(event) => {
              setNickname(event.target.value);
              setLanNickname(event.target.value);
            }}
            placeholder="你的昵称"
            aria-label="聊天昵称"
          />
          <Button
            onClick={() => void connect()}
            disabled={loading}
            aria-label="连接局域网服务"
          >
            <Wifi className="h-4 w-4" aria-hidden="true" />
            连接
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void handleGetLanAddresses()}
          >
            <Wifi className="h-4 w-4" aria-hidden="true" />
            获取局域网地址
          </Button>
          {lanAddresses.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {lanAddresses.map((address) => {
                const port = base ? new URL(base).port || "4100" : "4100";
                return (
                  <span
                    key={address}
                    className="rounded-full bg-mint-300/10 px-3 py-1.5 text-xs font-semibold text-mint-200 ring-1 ring-mint-300/20"
                  >
                    http://{address}:{port}
                  </span>
                );
              })}
            </div>
          ) : null}
        </div>
        <p className="mt-3 text-xs leading-5 text-mist-500">
          获取不到地址时，请用 start-lan.bat 终端打印的 http://IP:4100 地址打开页面。
        </p>
      </section>

      {connected ? (
        <div className="mt-8 grid min-h-[520px] gap-6 lg:grid-cols-[300px_1fr]">
          <aside className="rounded-panel border border-white/10 bg-white/[0.03] p-4">
            <form onSubmit={handleCreateRoom} className="flex gap-2">
              <Input
                value={roomName}
                onChange={(event) => setRoomName(event.target.value)}
                placeholder="新房间名"
                aria-label="新房间名"
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
                <p className="text-sm text-mist-400">还没有房间，先创建一个。</p>
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
                    <MessageSquare
                      className="h-4 w-4 shrink-0 text-mint-300"
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">
                        {room.name}
                      </span>
                      <span className="mt-1 block text-xs text-mist-500">
                        {room.message_count} 条消息
                      </span>
                    </span>
                  </button>
                ))
              )}
            </div>
          </aside>

          <section className="flex h-[520px] min-h-[420px] max-h-[70vh] flex-col overflow-hidden rounded-panel border border-white/10 bg-ink-900/50">
            {activeRoom ? (
              <>
                <header className="flex items-center justify-between border-b border-white/10 p-4">
                  <div>
                    <h2 className="text-lg font-bold">{activeRoom.name}</h2>
                    <p className="mt-1 text-xs text-mist-500">
                      昵称：{nickname || "未设置"}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void loadRooms(base)}
                    aria-label="刷新房间"
                  >
                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                    刷新
                  </Button>
                </header>

                <div
                  ref={messagesScrollRef}
                  className="flex min-h-0 flex-1 touch-pan-y flex-col overflow-y-auto overscroll-contain p-4"
                >
                  {messages.length === 0 ? (
                    <div className="flex flex-1 items-center justify-center text-sm text-mist-500">
                      还没有消息，说点什么吧。
                    </div>
                  ) : (
                    messages.map((message) => {
                      const own = message.nickname === nickname;
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
                              {message.nickname}
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
                    aria-label="局域网聊天消息"
                  />
                  <Button type="submit" disabled={!body.trim() || !nickname.trim()}>
                    <Send className="h-4 w-4" aria-hidden="true" />
                    发送
                  </Button>
                </form>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center p-8 text-center">
                <div>
                  <MessageSquare
                    className="mx-auto h-8 w-8 text-mint-300"
                    aria-hidden="true"
                  />
                  <h2 className="mt-4 text-lg font-bold">选择或创建房间</h2>
                </div>
              </div>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
